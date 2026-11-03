import { CommonModule } from '@angular/common';
import { A11yModule } from '@angular/cdk/a11y';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StatusBadgeComponent } from '../../shared/ui/status-badge.component';
import { UiDatePePipe } from '../../shared/ui/ui-date-pe.pipe';
import { AuthStore } from '../../core/state/auth.store';
import { AcademicoService } from '../../core/services/academico.service';
import { MatriculaPublicaService } from '../../core/services/matricula-publica.service';
import {
  DocumentoSolicitudDto,
  SolicitudMatriculaPublicaAdminDto,
  TipoDocumentoSolicitud
} from '../../core/models/matricula-publica.model';
import { SeccionResponseDto } from '../../core/models/academico.model';

@Component({
  selector: 'app-solicitudes-matricula',
  standalone: true,
  imports: [CommonModule, FormsModule, A11yModule, StatusBadgeComponent, UiDatePePipe],
  templateUrl: './solicitudes-matricula.component.html',
})
export class SolicitudesMatriculaComponent implements OnInit {
  private readonly api = inject(MatriculaPublicaService);
  private readonly academico = inject(AcademicoService);
  readonly store = inject(AuthStore);
  readonly solicitudes = signal<SolicitudMatriculaPublicaAdminDto[]>([]);
  readonly cargando = signal(false);
  readonly error = signal('');
  readonly aviso = signal('');
  readonly seleccion = signal<SolicitudMatriculaPublicaAdminDto | null>(null);
  readonly documento = signal<TipoDocumentoSolicitud>('PARTIDA_NACIMIENTO');
  readonly observacion = signal('');
  readonly confirmandoRechazo = signal(false);
  readonly autorizandoEdad = signal(false);
  readonly asignandoSeccion = signal(false);
  readonly motivoEdad = signal('');
  readonly seccionesAsignables = signal<SeccionResponseDto[]>([]);
  readonly seccionAsignarId = signal<number | null>(null);
  readonly guardando = signal(false);
  readonly urlsDocumentos = signal<Record<string, string>>({});

  ngOnInit(): void { this.cargar(); }

  cargar(): void {
    this.cargando.set(true);
    this.api.listarAdmin().subscribe({
      next: values => { this.solicitudes.set(values); this.cargando.set(false); },
      error: err => { this.error.set(err?.error?.message || 'No se pudieron cargar las solicitudes.'); this.cargando.set(false); }
    });
  }

  abrirObservacion(solicitud: SolicitudMatriculaPublicaAdminDto): void {
    this.seleccion.set(solicitud);
    const doc = solicitud.documentos.find(d => d.estado !== 'VALIDADO');
    this.documento.set(doc?.tipo ?? 'PARTIDA_NACIMIENTO');
    this.observacion.set(doc?.observacion ?? '');
    this.confirmandoRechazo.set(false);
    this.autorizandoEdad.set(false);
    this.asignandoSeccion.set(false);
    this.error.set('');
  }

  abrirRechazo(solicitud: SolicitudMatriculaPublicaAdminDto): void {
    this.seleccion.set(solicitud);
    this.confirmandoRechazo.set(true);
    this.autorizandoEdad.set(false);
    this.asignandoSeccion.set(false);
    this.error.set('');
  }

  abrirAutorizacionEdad(solicitud: SolicitudMatriculaPublicaAdminDto): void {
    this.seleccion.set(solicitud);
    this.confirmandoRechazo.set(false);
    this.autorizandoEdad.set(true);
    this.asignandoSeccion.set(false);
    this.motivoEdad.set('');
    this.error.set('');
  }

  abrirAsignacionSeccion(solicitud: SolicitudMatriculaPublicaAdminDto): void {
    this.seleccion.set(solicitud);
    this.confirmandoRechazo.set(false);
    this.autorizandoEdad.set(false);
    this.asignandoSeccion.set(true);
    this.seccionAsignarId.set(null);
    this.seccionesAsignables.set([]);
    this.error.set('');
    this.guardando.set(true);
    this.academico.listarSecciones(solicitud.anioLectivoId).subscribe({
      next: secciones => {
        const opciones = secciones.filter(seccion =>
          seccion.gradoId === solicitud.gradoId && seccion.cupoMaximo > seccion.vacantesOcupadas
        );
        this.seccionesAsignables.set(opciones);
        this.seccionAsignarId.set(opciones[0]?.id ?? null);
        if (!opciones.length) this.error.set('No hay secciones con vacantes para el grado y año de esta solicitud.');
        this.guardando.set(false);
      },
      error: err => {
        this.error.set(err?.error?.message || 'No se pudieron cargar las secciones disponibles.');
        this.guardando.set(false);
      }
    });
  }

  cerrarModal(): void {
    this.seleccion.set(null);
    this.confirmandoRechazo.set(false);
    this.autorizandoEdad.set(false);
    this.asignandoSeccion.set(false);
  }

  documentosValidados(solicitud: SolicitudMatriculaPublicaAdminDto): boolean {
    return solicitud.documentos.length === 3 && solicitud.documentos.every(documento => documento.estado === 'VALIDADO');
  }

  autorizarEdad(): void {
    const item = this.seleccion();
    const motivo = this.motivoEdad().trim();
    if (!item || motivo.length < 10 || motivo.length > 500) {
      this.error.set('La justificación debe tener entre 10 y 500 caracteres.');
      return;
    }
    this.guardando.set(true);
    this.api.autorizarExcepcionEdadAdmin(item.id, motivo).subscribe({
      next: updated => {
        this.solicitudes.update(current => current.map(s => s.id === updated.id ? updated : s));
        this.aviso.set('La excepción de edad fue autorizada. La familia podrá continuar cuando actualice su solicitud.');
        this.guardando.set(false);
        this.cerrarModal();
      },
      error: err => { this.error.set(err?.error?.message || 'No se pudo autorizar la excepción de edad.'); this.guardando.set(false); }
    });
  }

  asignarSeccion(): void {
    const item = this.seleccion();
    const seccionId = this.seccionAsignarId();
    if (!item || !seccionId) { this.error.set('Selecciona una sección disponible.'); return; }
    this.guardando.set(true);
    this.api.asignarSeccionAdmin(item.id, seccionId).subscribe({
      next: updated => {
        this.solicitudes.update(current => current.map(s => s.id === updated.id ? updated : s));
        this.aviso.set('La sección quedó asignada a la matrícula pagada.');
        this.guardando.set(false);
        this.cerrarModal();
      },
      error: err => { this.error.set(err?.error?.message || 'No se pudo asignar la sección.'); this.guardando.set(false); }
    });
  }

  verDocumento(solicitud: SolicitudMatriculaPublicaAdminDto, doc: DocumentoSolicitudDto): void {
    this.api.documentoAdminUrl(solicitud.id, doc.tipo).subscribe({
      next: response => {
        if (response.versionId !== doc.versionId) { this.error.set('El archivo cambió. Actualiza las solicitudes.'); return; }
        this.urlsDocumentos.update(urls => ({ ...urls, [solicitud.id + ':' + doc.tipo]: response.url }));
      },
      error: err => this.error.set(err?.error?.message || 'No se pudo obtener el acceso temporal al archivo.')
    });
  }

  guardarObservacion(): void {
    const item = this.seleccion();
    if (!item || !this.observacion().trim()) { this.error.set('Escribe una observación para la familia.'); return; }
    this.guardando.set(true);
    this.api.observarAdmin(item.id, this.documento(), this.observacion().trim()).subscribe({
      next: updated => {
        this.solicitudes.update(current => current.map(s => s.id === updated.id ? updated : s));
        this.aviso.set('Se solicitó la corrección del documento. El apoderado podrá cargarlo nuevamente con su código privado.');
        this.guardando.set(false);
        this.cerrarModal();
      },
      error: err => { this.error.set(err?.error?.message || 'No se pudo registrar la observación.'); this.guardando.set(false); }
    });
  }

  rechazar(): void {
    const item = this.seleccion();
    if (!item) return;
    this.guardando.set(true);
    this.api.rechazarAdmin(item.id).subscribe({
      next: () => {
        this.solicitudes.update(current => current.map(s => s.id === item.id ? { ...s, estado: 'RECHAZADA' } : s));
        this.aviso.set('La solicitud se cerró y se liberó cualquier vacante reservada.');
        this.guardando.set(false);
        this.cerrarModal();
      },
      error: err => { this.error.set(err?.error?.message || 'No se pudo cerrar la solicitud.'); this.guardando.set(false); }
    });
  }

  etiquetaDocumento(tipo: TipoDocumentoSolicitud): string {
    return tipo === 'PARTIDA_NACIMIENTO' ? 'Partida de nacimiento'
      : tipo === 'DNI_C4' ? 'DNI o C4' : 'Recibo de luz o agua';
  }

  firmaLabel(estado: DocumentoSolicitudDto['estadoFirma']): string {
    const labels: Record<string, string> = { VALIDA: 'Verificada', INVALIDA: 'Inválida', NO_APLICA: 'No aplica o sin firma verificable', NO_VERIFICABLE: 'Verificación pendiente', ERROR_SERVICIO: 'Error de verificación' };
    return estado ? labels[estado] : 'Pendiente';
  }

  estadoLabel(estado: SolicitudMatriculaPublicaAdminDto['estado']): string {
    const labels: Record<SolicitudMatriculaPublicaAdminDto['estado'], string> = {
      DOCUMENTOS_PENDIENTES: 'Documentos pendientes', DOCUMENTOS_OBSERVADOS: 'Corrección solicitada',
      DOCUMENTOS_EN_VALIDACION: 'En verificación automática',
      DOCUMENTOS_VALIDADOS: 'Documentos validados', PAGO_PENDIENTE: 'Pago pendiente',
      AUTORIZACION_EDAD_PENDIENTE: 'Autorización de edad pendiente',
      PAGO_CONFIRMADO_PENDIENTE_ASIGNACION: 'Pago confirmado · sección pendiente',
      MATRICULADA: 'Matriculada', RECHAZADA: 'Rechazada'
    };
    return labels[estado];
  }

  documentoPendiente(solicitud: SolicitudMatriculaPublicaAdminDto): DocumentoSolicitudDto | undefined {
    return solicitud.documentos.find(d => d.estado === 'OBSERVADO')
      ?? solicitud.documentos.find(d => d.estado === 'PENDIENTE');
  }
}
