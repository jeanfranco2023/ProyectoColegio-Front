import { CommonModule } from '@angular/common';
import { A11yModule } from '@angular/cdk/a11y';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StatusBadgeComponent } from '../../shared/ui/status-badge.component';
import { UiDatePePipe } from '../../shared/ui/ui-date-pe.pipe';
import { AuthStore } from '../../core/state/auth.store';
import { AcademicoService } from '../../core/services/academico.service';
import { MatriculaPublicaService } from '../../core/services/matricula-publica.service';
import {
  DocumentoSolicitudDto,
  EstadoSolicitudMatriculaPublica,
  SolicitudMatriculaPublicaAdminDto,
  TipoDocumentoSolicitud
} from '../../core/models/matricula-publica.model';
import { AnioLectivoResponseDto, GradoResponseDto, NivelResponseDto, SeccionResponseDto } from '../../core/models/academico.model';
import { compararGradosPorSecuenciaInstitucional } from '../../core/utils/ordenamiento-grados';

const MOTIVOS_OBSERVACION_POR_TIPO: Record<TipoDocumentoSolicitud, readonly string[]> = {
  PARTIDA_NACIMIENTO: [
    'Documento ilegible o recortado; por favor volver a adjuntar nítido y completo.',
    'Los nombres o apellidos del estudiante no coinciden con el registro ingresado.',
    'Falta sello o verificación legible de RENIEC / Municipalidad en la partida.'
  ],
  DNI_C4: [
    'DNI o C4 vencido o ilegible; por favor adjuntar copia vigente por ambas caras.',
    'El número de DNI del archivo no coincide con los datos de la solicitud.',
    'Adjuntar también el DNI vigente del apoderado junto al documento del estudiante.'
  ],
  RECIBO_SERVICIO: [
    'Recibo con antigüedad mayor a 3 meses; adjuntar comprobante reciente de luz o agua.',
    'No se distingue la dirección domiciliaria o titular del servicio en el archivo.',
    'Adjuntar página completa donde figure dirección y fecha de emisión legible.'
  ],
  CERTIFICADO_ESTUDIOS: [
    'El certificado o libreta de notas adjunto está incompleto o ilegible; volver a cargar completo.',
    'El grado o situación final aprobada del año anterior no acredita el grado solicitado.',
    'Falta firma, sello o código de verificación del colegio de procedencia / SIAGIE.'
  ]
};

const MOTIVOS_AUTORIZACION_EDAD: readonly string[] = [
  'Aprobado por Dirección General conforme a la normativa excepcional MINEDU y vacante disponible.',
  'Autorizado por cumplimiento próximo al corte cronológico según evaluación de Dirección Académica.',
  'Excepción validada por continuidad o traslado documentado de nivel educativo equivalente.'
];

const ESTADOS_ORDEN_SOLICITUD: readonly EstadoSolicitudMatriculaPublica[] = [
  'DOCUMENTOS_PENDIENTES',
  'DOCUMENTOS_EN_VALIDACION',
  'DOCUMENTOS_OBSERVADOS',
  'DOCUMENTOS_VALIDADOS',
  'AUTORIZACION_EDAD_PENDIENTE',
  'PAGO_PENDIENTE',
  'PAGO_CONFIRMADO_PENDIENTE_ASIGNACION',
  'MATRICULADA',
  'RECHAZADA'
];

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
  readonly nivelAsignarId = signal<number | null>(null);
  readonly aniosCatalogo = signal<AnioLectivoResponseDto[]>([]);
  readonly nivelesCatalogo = signal<NivelResponseDto[]>([]);
  readonly gradosCatalogo = signal<GradoResponseDto[]>([]);
  readonly guardando = signal(false);
  readonly urlsDocumentos = signal<Record<string, string>>({});
  readonly filtroEstado = signal('');
  readonly filtroModalidad = signal('');
  readonly filtroGradoId = signal<number | null>(null);
  readonly busqueda = signal('');
  readonly motivosAutorizacionEdad = MOTIVOS_AUTORIZACION_EDAD;

  readonly solicitudesFiltradas = computed(() => {
    const estado = this.filtroEstado().trim();
    const modalidad = this.filtroModalidad().trim();
    const gradoId = this.filtroGradoId();
    const q = this.busqueda().trim().toLowerCase();

    return this.solicitudes().filter(item => {
      if (estado && item.estado !== estado) return false;
      if (modalidad && item.modalidadIngreso !== modalidad) return false;
      if (gradoId !== null && item.gradoId !== gradoId) return false;
      if (q) {
        const texto = `${item.nombreEstudiante} ${item.documentoEstudiante} ${item.nombreApoderado} ${item.colegioProcedencia ?? ''}`.toLowerCase();
        if (!texto.includes(q)) return false;
      }
      return true;
    });
  });

  readonly conteoPorEstado = computed(() => {
    const conteo = new Map<EstadoSolicitudMatriculaPublica, number>();
    for (const s of this.solicitudes()) {
      conteo.set(s.estado, (conteo.get(s.estado) ?? 0) + 1);
    }
    return ESTADOS_ORDEN_SOLICITUD.map(estado => ({
      estado,
      etiqueta: this.estadoLabel(estado),
      cantidad: conteo.get(estado) ?? 0
    }));
  });

  readonly motivosDocumentoActual = computed(
    () => MOTIVOS_OBSERVACION_POR_TIPO[this.documento()] ?? []
  );

  ngOnInit(): void {
    this.cargarCatalogosAcademicos();
    this.cargar();
  }

  private cargarCatalogosAcademicos(): void {
    this.academico.listarAnios?.().subscribe({
      next: anios => { if (Array.isArray(anios)) this.aniosCatalogo.set(anios); },
      error: () => {}
    });
    this.academico.listarNiveles?.().subscribe({
      next: niveles => {
        if (!Array.isArray(niveles)) return;
        this.nivelesCatalogo.set(niveles);
        niveles.forEach(n => {
          this.academico.listarGrados?.(n.id).subscribe({
            next: grados => {
              if (!Array.isArray(grados)) return;
              this.gradosCatalogo.update(prev => {
                const ids = new Set(prev.map(g => g.id));
                const nuevos = grados.filter(g => !ids.has(g.id));
                return [...prev, ...nuevos].sort((a, b) => compararGradosPorSecuenciaInstitucional(a.nombre, b.nombre));
              });
            },
            error: () => {}
          });
        });
      },
      error: () => {}
    });
  }

  nombreAnio(anioLectivoId: number): string {
    const encontrado = this.aniosCatalogo().find(a => a.id === anioLectivoId);
    return encontrado ? String(encontrado.anio) : String(anioLectivoId);
  }

  nivelDeGrado(gradoId: number): NivelResponseDto | undefined {
    const grado = this.gradosCatalogo().find(g => g.id === gradoId);
    if (!grado) return undefined;
    return this.nivelesCatalogo().find(n => n.id === grado.nivelId);
  }

  nombreGrado(gradoId: number): string {
    return this.gradosCatalogo().find(g => g.id === gradoId)?.nombre ?? `Grado #${gradoId}`;
  }

  nombreNivelGrado(gradoId: number): string {
    const nivel = this.nivelDeGrado(gradoId)?.nombre;
    const grado = this.nombreGrado(gradoId);
    return nivel ? `${nivel} · ${grado}` : grado;
  }

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

  aplicarFiltroEstadoRapido(estado: EstadoSolicitudMatriculaPublica | ''): void {
    if (!estado) {
      this.filtroEstado.set('');
    } else {
      this.filtroEstado.set(this.filtroEstado() === estado ? '' : estado);
    }
  }

  limpiarFiltros(): void {
    this.filtroEstado.set('');
    this.filtroModalidad.set('');
    this.filtroGradoId.set(null);
    this.busqueda.set('');
  }

  abrirObservacionDocumento(solicitud: SolicitudMatriculaPublicaAdminDto, tipo: TipoDocumentoSolicitud): void {
    this.seleccion.set(solicitud);
    this.documento.set(tipo);
    const doc = solicitud.documentos.find(d => d.tipo === tipo);
    this.observacion.set(doc?.observacion ?? '');
    this.confirmandoRechazo.set(false);
    this.autorizandoEdad.set(false);
    this.asignandoSeccion.set(false);
    this.error.set('');
  }

  aplicarMotivoObservacion(evento: Event): void {
    const valor = this.extraerValorSelect(evento);
    if (valor) this.observacion.set(valor);
  }

  aplicarMotivoEdad(evento: Event): void {
    const valor = this.extraerValorSelect(evento);
    if (valor) this.motivoEdad.set(valor);
  }

  private extraerValorSelect(evento: Event): string {
    const select = evento.target as HTMLSelectElement | null;
    const valor = select?.value?.trim() ?? '';
    if (select) select.value = '';
    return valor;
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
    this.nivelAsignarId.set(this.nivelDeGrado(solicitud.gradoId)?.id ?? null);
    this.seccionAsignarId.set(null);
    this.seccionesAsignables.set([]);
    this.error.set('');
    this.guardando.set(true);
    this.academico.listarSecciones(solicitud.anioLectivoId).subscribe({
      next: secciones => {
        const opciones = secciones
          .filter(seccion =>
            seccion.gradoId === solicitud.gradoId && seccion.letra !== 'D' && seccion.cupoMaximo > seccion.vacantesOcupadas
          )
          .sort((a, b) => a.letra.localeCompare(b.letra));
        if (!this.nivelAsignarId() && opciones[0]?.nivelId) {
          this.nivelAsignarId.set(opciones[0].nivelId);
        }
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
    return solicitud.documentos.length >= (solicitud.modalidadIngreso === 'TRASLADO' ? 4 : 3) && solicitud.documentos.every(documento => documento.estado === 'VALIDADO');
  }

  autorizarEdad(): void {
    const item = this.seleccion();
    const motivo = this.motivoEdad().trim();
    if (!item || motivo.length < 10 || motivo.length > 500) {
      this.error.set('La justificación debe tener entre 10 y 500 caracteres.');
      return;
    }
    this.guardando.set(true);
    this.api.autorizarExcepcionEdad(item.id, motivo).subscribe({
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
    this.api.asignarSeccion(item.id, seccionId).subscribe({
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

  darVistoBueno(solicitud: SolicitudMatriculaPublicaAdminDto): void {
    if (this.guardando()) return;
    this.guardando.set(true);
    this.error.set('');
    this.api.darVistoBuenoAdmin(solicitud.id).subscribe({
      next: updated => {
        this.solicitudes.update(current => current.map(s => s.id === updated.id ? updated : s));
        this.aviso.set('Se otorgó el visto bueno a la solicitud. Se notificó al apoderado con el enlace directo actualizado.');
        this.guardando.set(false);
      },
      error: err => {
        this.error.set(err?.error?.message || 'No se pudo otorgar el visto bueno a la solicitud.');
        this.guardando.set(false);
      }
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
      : tipo === 'DNI_C4' ? 'DNI o C4' : tipo === 'CERTIFICADO_ESTUDIOS' ? 'Certificado de estudios / Libreta' : 'Recibo de luz o agua';
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
