import { CommonModule } from '@angular/common';
import { A11yModule } from '@angular/cdk/a11y';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StatusBadgeComponent } from '../../shared/ui/status-badge.component';
import { UiDatePePipe } from '../../shared/ui/ui-date-pe.pipe';
import { MatriculaPublicaService } from '../../core/services/matricula-publica.service';
import { AuthStore } from '../../core/state/auth.store';
import {
  DocumentoSolicitudDto,
  SeccionMatriculaPublicaDto,
  SolicitudMatriculaPublicaAdminDto,
  TipoDocumentoSolicitud
} from '../../core/models/matricula-publica.model';

@Component({
  selector: 'app-solicitudes-matricula',
  standalone: true,
  imports: [CommonModule, FormsModule, A11yModule, StatusBadgeComponent, UiDatePePipe],
  templateUrl: './solicitudes-matricula.component.html',
})
export class SolicitudesMatriculaComponent implements OnInit {
  private readonly api = inject(MatriculaPublicaService);
  readonly auth = inject(AuthStore);
  readonly solicitudes = signal<SolicitudMatriculaPublicaAdminDto[]>([]);
  readonly seccionesDisponibles = signal<SeccionMatriculaPublicaDto[]>([]);
  readonly seccionesSeleccionadas = signal<Record<string, number>>({});
  readonly cargando = signal(false);
  readonly error = signal('');
  readonly aviso = signal('');
  readonly seleccion = signal<SolicitudMatriculaPublicaAdminDto | null>(null);
  readonly documento = signal<TipoDocumentoSolicitud>('PARTIDA_NACIMIENTO');
  readonly observacion = signal('');
  readonly confirmandoRechazo = signal(false);
  readonly guardando = signal(false);
  readonly urlsDocumentos = signal<Record<string, string>>({});
  readonly motivosEdad = signal<Record<string, string>>({});

  ngOnInit(): void { this.cargar(); }

  cargar(): void {
    this.error.set('');
    this.urlsDocumentos.set({});
    this.cargando.set(true);
    this.api.catalogo().subscribe({
      next: catalogo => this.seccionesDisponibles.set(catalogo.secciones),
      error: () => this.seccionesDisponibles.set([])
    });
    this.api.listarAdmin().subscribe({
      next: values => { this.solicitudes.set(values); this.cargando.set(false); },
      error: err => { this.error.set(err?.error?.message || 'No se pudieron cargar las solicitudes.'); this.cargando.set(false); }
    });
  }

  seccionesDelGrado(solicitud: SolicitudMatriculaPublicaAdminDto): SeccionMatriculaPublicaDto[] {
    return this.seccionesDisponibles().filter(seccion =>
      seccion.anioLectivoId === solicitud.anioLectivoId && seccion.gradoId === solicitud.gradoId);
  }

  seleccionarSeccion(id: string, seccionId: number): void {
    this.seccionesSeleccionadas.update(actual => ({ ...actual, [id]: seccionId }));
  }

  asignarSeccion(solicitud: SolicitudMatriculaPublicaAdminDto): void {
    const seccionId = this.seccionesSeleccionadas()[solicitud.id];
    if (!seccionId) { this.error.set('Selecciona una sección disponible del grado solicitado.'); return; }
    this.guardando.set(true);
    this.api.asignarSeccion(solicitud.id, seccionId).subscribe({
      next: actualizada => {
        this.solicitudes.update(actuales => actuales.map(item => item.id === actualizada.id ? actualizada : item));
        this.aviso.set('Aula asignada. La matrícula pasó a completada y la vacante quedó actualizada.');
        this.guardando.set(false);
        this.cargarCatalogo();
      },
      error: err => {
        this.error.set(err?.error?.message || 'No se pudo asignar la sección. Actualiza la lista de vacantes.');
        this.guardando.set(false);
        this.cargarCatalogo();
      }
    });
  }

  private cargarCatalogo(): void {
    this.api.catalogo().subscribe({
      next: catalogo => this.seccionesDisponibles.set(catalogo.secciones),
      error: () => this.seccionesDisponibles.set([])
    });
  }

  abrirObservacion(solicitud: SolicitudMatriculaPublicaAdminDto): void {
    this.seleccion.set(solicitud);
    const doc = solicitud.documentos.find(d => d.estado !== 'VALIDADO');
    this.documento.set(doc?.tipo ?? 'PARTIDA_NACIMIENTO');
    this.observacion.set(doc?.observacion ?? '');
    this.confirmandoRechazo.set(false);
    this.error.set('');
  }

  abrirRechazo(solicitud: SolicitudMatriculaPublicaAdminDto): void {
    this.seleccion.set(solicitud);
    this.confirmandoRechazo.set(true);
    this.error.set('');
  }

  cerrarModal(): void { this.seleccion.set(null); this.confirmandoRechazo.set(false); }

  verDocumento(solicitud: SolicitudMatriculaPublicaAdminDto, doc: DocumentoSolicitudDto): void {
    const key = `${solicitud.id}:${doc.tipo}`;
    this.urlsDocumentos.update(urls => {
      const actualizadas = { ...urls };
      delete actualizadas[key];
      return actualizadas;
    });
    this.api.documentoAdminUrl(solicitud.id, doc.tipo).subscribe({
      next: response => {
        if (response.versionId !== doc.versionId) { this.error.set('El archivo cambió. Actualiza las solicitudes.'); return; }
        this.urlsDocumentos.update(urls => ({ ...urls, [key]: response.url }));
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

  actualizarMotivoEdad(id: string, motivo: string): void {
    this.motivosEdad.update(current => ({ ...current, [id]: motivo }));
  }

  motivoEdad(solicitudId: string): string {
    return this.motivosEdad()[solicitudId] ?? '';
  }

  autorizarExcepcionEdad(solicitud: SolicitudMatriculaPublicaAdminDto): void {
    const motivo = this.motivosEdad()[solicitud.id]?.trim() ?? '';
    if (motivo.length < 10 || motivo.length > 500) {
      this.error.set('Registra una justificación institucional de 10 a 500 caracteres.');
      return;
    }
    this.guardando.set(true);
    this.api.autorizarExcepcionEdad(solicitud.id, motivo).subscribe({
      next: updated => {
        this.solicitudes.update(current => current.map(s => s.id === updated.id ? updated : s));
        this.aviso.set('La excepción quedó autorizada por Dirección y registrada en el expediente.');
        this.motivosEdad.update(current => ({ ...current, [solicitud.id]: '' }));
        this.error.set('');
        this.guardando.set(false);
      },
      error: err => {
        this.error.set(err?.error?.message || 'No se pudo autorizar la excepción. Verifica los documentos y vuelve a intentar.');
        this.guardando.set(false);
      }
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
      AUTORIZACION_EDAD_PENDIENTE: 'Autorización de edad pendiente',
      DOCUMENTOS_VALIDADOS: 'Documentos validados', PAGO_PENDIENTE: 'Pago pendiente',
      PAGO_CONFIRMADO_PENDIENTE_ASIGNACION: 'Pagada · aula pendiente',
      MATRICULADA: 'Aula asignada · matrícula completa', RECHAZADA: 'Rechazada'
    };
    return labels[estado];
  }

  documentoPendiente(solicitud: SolicitudMatriculaPublicaAdminDto): DocumentoSolicitudDto | undefined {
    return solicitud.documentos.find(d => d.estado === 'OBSERVADO')
      ?? solicitud.documentos.find(d => d.estado === 'PENDIENTE');
  }
}
