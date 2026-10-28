import { CommonModule } from '@angular/common';
import { A11yModule } from '@angular/cdk/a11y';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { finalize, firstValueFrom, Subscription } from 'rxjs';
import { edadAlCorteMatricula, fechaActualEnPeru, fechaNacimientoValida } from '../../core/utils/fecha-nacimiento';
import { MatriculaPublicaService } from '../../core/services/matricula-publica.service';
import { CommunityGalleryComponent } from '../../shared/ui/community-gallery.component';
import {
  CatalogoMatriculaPublicaDto,
  CrearSolicitudMatriculaPublicaDto,
  DocumentoSolicitudDto,
  EstadoSolicitudMatriculaPublica,
  PagoMatriculaPublicaDto,
  SolicitudMatriculaPublicaDto,
  TipoDocumentoSolicitud
} from '../../core/models/matricula-publica.model';

type ModalEtapa = 'documentos' | 'validacion' | 'pago' | 'exito' | null;
type VistaMatricula = 'inicio' | 'propuesta' | 'niveles' | 'admision' | 'preguntas';

@Component({
  selector: 'app-matricula-publica',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive, A11yModule, CommunityGalleryComponent],
  templateUrl: './matricula-publica.component.html',
  styleUrl: './matricula-publica.component.css',
  host: { class: 'block' }
})
export class MatriculaPublicaComponent implements OnInit, OnDestroy {
  private readonly api = inject(MatriculaPublicaService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private pollHandle: number | null = null;
  private vistaSubscription?: Subscription;

  readonly vista = signal<VistaMatricula>('inicio');
  readonly catalogo = signal<CatalogoMatriculaPublicaDto>({ anios: [], secciones: [] });
  readonly solicitud = signal<SolicitudMatriculaPublicaDto | null>(null);
  readonly modal = signal<ModalEtapa>(null);
  readonly cargandoCatalogo = signal(true);
  readonly procesando = signal(false);
  readonly consultandoDniEstudiante = signal(false);
  readonly consultandoDniApoderado = signal(false);
  readonly documentoEnProceso = signal<TipoDocumentoSolicitud | null>(null);
  readonly numeroDocumentoRevision = signal(0);
  readonly avanceRevision = signal(0);
  readonly totalRevision = signal(0);
  readonly error = signal('');
  readonly estadoPago = signal('');
  readonly enlacePago = signal('');
  readonly montoPago = signal(1);
  readonly anioId = signal<number | null>(null);
  readonly seccionId = signal<number | null>(null);
  readonly mensajeDni = signal('');

  get fechaNacimientoMaxima(): string {
    return fechaActualEnPeru();
  }

  nombresEstudiante = '';
  apellidoPaternoEstudiante = '';
  apellidoMaternoEstudiante = '';
  documentoEstudiante = '';
  nacimientoEstudiante = '';
  generoEstudiante: 'M' | 'F' = 'M';
  nombresApoderado = '';
  apellidoPaternoApoderado = '';
  apellidoMaternoApoderado = '';
  documentoApoderado = '';
  celularApoderado = '';
  emailApoderado = '';
  direccionApoderado = '';
  ubigeoApoderado = '';
  parentesco: CrearSolicitudMatriculaPublicaDto['parentesco'] = 'MADRE';
  consentimientoGemini = false;

  archivos: Record<TipoDocumentoSolicitud, File | null> = {
    PARTIDA_NACIMIENTO: null,
    DNI_C4: null,
    RECIBO_SERVICIO: null
  };

  readonly documentTypes: TipoDocumentoSolicitud[] = [
    'PARTIDA_NACIMIENTO', 'DNI_C4', 'RECIBO_SERVICIO'
  ];

  get seccionesDisponibles() {
    const year = this.anioId();
    return this.catalogo().secciones.filter(s => s.anioLectivoId === year);
  }

  get advertenciaEdad(): string {
    if (!this.nacimientoEstudiante || !this.seccionId()) return '';
    const seccion = this.seccionesDisponibles.find(s => s.id === this.seccionId());
    const anio = this.catalogo().anios.find(a => a.id === this.anioId());
    if (!seccion || !anio) return 'Selecciona una sección disponible del año lectivo.';
    if (!Number.isInteger(seccion.edadMinimaAlCorte) || !Number.isInteger(seccion.edadMaximaAlCorte)
      || seccion.edadMinimaAlCorte > seccion.edadMaximaAlCorte) {
      return 'No se pudo comprobar el rango de edad. Vuelve a cargar la página antes de continuar.';
    }
    const edad = edadAlCorteMatricula(this.nacimientoEstudiante, anio.anio);
    if (edad === null) return 'Ingresa una fecha de nacimiento válida.';
    if (edad >= seccion.edadMinimaAlCorte && edad <= seccion.edadMaximaAlCorte) return '';
    return `La edad al 31 de marzo de ${anio.anio} debe estar entre ${seccion.edadMinimaAlCorte} y ${seccion.edadMaximaAlCorte} años. Los casos excepcionales requieren autorización institucional.`;
  }

  ngOnInit(): void {
    this.vistaSubscription = this.route.paramMap.subscribe(params => {
      const vista = params.get('vista');
      const vistas: VistaMatricula[] = ['inicio', 'propuesta', 'niveles', 'admision', 'preguntas'];
      if (vista && vistas.includes(vista as VistaMatricula)) {
        this.vista.set(vista as VistaMatricula);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        this.vista.set('inicio');
        if (vista !== 'inicio') void this.router.navigateByUrl('/matricula/inicio', { replaceUrl: true });
      }
    });
    this.restaurarSolicitud();
    this.api.catalogo().subscribe({
      next: data => {
        this.catalogo.set(data);
        const activo = data.anios.find(a => a.abierto);
        if (activo) this.anioId.set(activo.id);
        this.cargandoCatalogo.set(false);
      },
      error: () => {
        this.cargandoCatalogo.set(false);
        this.error.set('No se pudo cargar la oferta académica. Intenta nuevamente en unos minutos.');
      }
    });
  }

  ngOnDestroy(): void {
    this.vistaSubscription?.unsubscribe();
    this.detenerSeguimientoPago();
  }

  seleccionarArchivo(tipo: TipoDocumentoSolicitud, event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0] ?? null;
    if (!archivo) return;
    if (archivo.size === 0 || archivo.size > 5 * 1024 * 1024 || archivo.type !== 'application/pdf') {
      this.archivos[tipo] = null;
      this.error.set('Los tres documentos deben ser PDF y pesar hasta 5 MB cada uno.');
      input.value = '';
      return;
    }
    this.error.set('');
    this.archivos[tipo] = archivo;
  }

  consultarDni(tipo: 'estudiante' | 'apoderado'): void {
    const dni = tipo === 'estudiante' ? this.documentoEstudiante : this.documentoApoderado;
    if (!/^\d{8}$/.test(dni)) {
      this.mensajeDni.set('Ingresa un DNI de 8 dígitos.');
      return;
    }
    const indicador = tipo === 'estudiante' ? this.consultandoDniEstudiante : this.consultandoDniApoderado;
    indicador.set(true);
    this.mensajeDni.set('');
    this.api.consultarDni(dni).pipe(finalize(() => indicador.set(false))).subscribe({
      next: identidad => {
        if (tipo === 'estudiante') {
          this.nombresEstudiante = identidad.nombres;
          this.apellidoPaternoEstudiante = identidad.apellidoPaterno;
          this.apellidoMaternoEstudiante = identidad.apellidoMaterno;
        } else {
          this.nombresApoderado = identidad.nombres;
          this.apellidoPaternoApoderado = identidad.apellidoPaterno;
          this.apellidoMaternoApoderado = identidad.apellidoMaterno;
        }
        this.mensajeDni.set('Nombres y apellidos consultados. Contrástalos con el documento adjunto.');
      },
      error: error => this.mensajeDni.set(this.mensajeError(error, 'No fue posible consultar este DNI; verifica el número o inténtalo luego.'))
    });
  }

  abrirSolicitud(): void {
    this.error.set('');
    const actual = this.solicitud();
    if (actual?.estado === 'MATRICULADA' || actual?.estado === 'RECHAZADA') {
      this.iniciarNuevaSolicitud();
      return;
    }

    const id = sessionStorage.getItem('shuji-solicitud-matricula-id');
    const token = this.leerToken();
    if (!id || !token) {
      this.modal.set(actual?.estado === 'DOCUMENTOS_VALIDADOS' ? 'validacion' : 'documentos');
      return;
    }

    this.procesando.set(true);
    this.api.consultar(id, token).pipe(finalize(() => this.procesando.set(false))).subscribe({
      next: solicitud => {
        this.solicitud.set(solicitud);
        this.abrirEtapaActualizada(solicitud);
      },
      error: error => {
        if (error?.status === 404) {
          this.limpiarCredencial();
          this.solicitud.set(null);
          this.modal.set('documentos');
          return;
        }
        this.error.set(this.mensajeError(error, 'No se pudo actualizar el estado del trámite.'));
      }
    });
  }

  iniciarNuevaSolicitud(): void {
    this.detenerSeguimientoPago();
    this.limpiarCredencial();
    this.solicitud.set(null);
    this.archivos = { PARTIDA_NACIMIENTO: null, DNI_C4: null, RECIBO_SERVICIO: null };
    this.nombresEstudiante = '';
    this.apellidoPaternoEstudiante = '';
    this.apellidoMaternoEstudiante = '';
    this.documentoEstudiante = '';
    this.nacimientoEstudiante = '';
    this.generoEstudiante = 'M';
    this.nombresApoderado = '';
    this.apellidoPaternoApoderado = '';
    this.apellidoMaternoApoderado = '';
    this.documentoApoderado = '';
    this.celularApoderado = '';
    this.emailApoderado = '';
    this.direccionApoderado = '';
    this.ubigeoApoderado = '';
    this.parentesco = 'MADRE';
    this.consentimientoGemini = false;
    this.seccionId.set(null);
    this.enlacePago.set('');
    this.estadoPago.set('');
    this.error.set('');
    this.modal.set('documentos');
  }

  async validarYEnviarDocumentos(): Promise<void> {
    this.error.set('');
    const actual = this.solicitud();
    if (!actual && !this.validarFormulario()) return;
    if (!this.consentimientoGemini && !actual) {
      this.error.set('Debes autorizar la revisión automatizada de los documentos.');
      return;
    }
    this.procesando.set(true);
    this.documentoEnProceso.set(null);
    this.numeroDocumentoRevision.set(0);
    this.avanceRevision.set(0);
    this.totalRevision.set(0);
    this.mensajeRevision.set('Preparando tu solicitud…');
    this.modal.set('validacion');
    try {
      let solicitud = actual;
      if (!solicitud) {
        const payload: CrearSolicitudMatriculaPublicaDto = {
          anioLectivoId: this.anioId()!,
          seccionId: this.seccionId()!,
          numeroDocumentoEstudiante: this.documentoEstudiante.trim(),
          nombresEstudiante: this.nombresEstudiante.trim(),
          apellidoPaternoEstudiante: this.apellidoPaternoEstudiante.trim(),
          apellidoMaternoEstudiante: this.apellidoMaternoEstudiante.trim(),
          fechaNacimientoEstudiante: this.nacimientoEstudiante,
          generoEstudiante: this.generoEstudiante,
          numeroDocumentoApoderado: this.documentoApoderado.trim(),
          nombresApoderado: this.nombresApoderado.trim(),
          apellidoPaternoApoderado: this.apellidoPaternoApoderado.trim(),
          apellidoMaternoApoderado: this.apellidoMaternoApoderado.trim(),
          celularApoderado: this.celularApoderado.trim(),
          emailApoderado: this.emailApoderado.trim() || null,
          direccionApoderado: this.direccionApoderado.trim(),
          ubigeoApoderado: this.ubigeoApoderado.trim(),
          parentesco: this.parentesco,
          consentimientoGemini: true
        };
        solicitud = await firstValueFrom(this.api.crear(payload));
        this.guardarCredencial(solicitud);
        this.solicitud.set(solicitud);
      }

      const token = this.leerToken();
      if (!token) throw new Error('La sesión de solicitud expiró; vuelve a iniciar el trámite.');
      const tiposPendientes = this.documentTypes.filter(tipo =>
        solicitud!.documentos.find(d => d.tipo === tipo)?.estado !== 'VALIDADO' && !!this.archivos[tipo]
      );
      this.totalRevision.set(tiposPendientes.length);
      this.mensajeRevision.set('Revisamos los archivos de uno en uno para evitar solicitudes simultáneas.');
      for (const [index, tipo] of tiposPendientes.entries()) {
        const estado = solicitud.documentos.find(d => d.tipo === tipo)?.estado;
        if (estado === 'VALIDADO') continue;
        const archivo = this.archivos[tipo];
        if (!archivo) continue;
        this.documentoEnProceso.set(tipo);
        this.numeroDocumentoRevision.set(index + 1);
        solicitud = await firstValueFrom(this.api.subirDocumento(solicitud.id, token, tipo, archivo));
        this.solicitud.set(solicitud);
        this.avanceRevision.update(value => value + 1);
      }
      const faltantes = this.documentTypes.filter(tipo =>
        ['PENDIENTE', 'OBSERVADO'].includes(solicitud!.documentos.find(d => d.tipo === tipo)?.estado ?? 'PENDIENTE')
      );
      if (faltantes.length > 0 && faltantes.some(tipo => !this.archivos[tipo])) {
        this.modal.set('documentos');
        this.error.set('Adjunta los documentos pendientes u observados para continuar.');
      } else {
        this.archivos = { PARTIDA_NACIMIENTO: null, DNI_C4: null, RECIBO_SERVICIO: null };
        this.mensajeRevision.set('Archivos recibidos. El pago se habilitará cuando las verificaciones automáticas estén completas.');
      }
    } catch (error: unknown) {
      this.modal.set('documentos');
      this.error.set(this.mensajeError(error, 'No se pudo validar la documentación.'));
    } finally {
      this.procesando.set(false);
      this.documentoEnProceso.set(null);
    }
  }

  readonly mensajeRevision = signal('');

  progresoRevision(): number {
    const total = this.totalRevision();
    return total ? Math.round((this.avanceRevision() / total) * 100) : 8;
  }

  async continuarAlPago(): Promise<void> {
    const solicitud = this.solicitud();
    const token = this.leerToken();
    if (!solicitud || !token) return;
    this.error.set('');
    this.procesando.set(true);
    try {
      const pago: PagoMatriculaPublicaDto = await firstValueFrom(this.api.crearPago(solicitud.id, token));
      this.enlacePago.set(pago.enlacePago);
      this.montoPago.set(pago.monto);
      this.modal.set('pago');
      this.estadoPago.set('Completa el pago y luego vuelve aquí para consultar la confirmación.');
      this.iniciarSeguimientoPago();
    } catch (error: unknown) {
      this.error.set(this.mensajeError(error, 'No se pudo preparar el pago.'));
    } finally {
      this.procesando.set(false);
    }
  }

  async actualizarEstadoPago(): Promise<void> {
    const solicitud = this.solicitud();
    const token = this.leerToken();
    if (!solicitud || !token) return;
    this.estadoPago.set('Consultando confirmación segura del pago…');
    try {
      const actualizada = await firstValueFrom(this.api.consultarPago(solicitud.id, token));
      this.solicitud.set(actualizada);
      if (actualizada.estado === 'MATRICULADA') this.mostrarExito(actualizada);
      else this.estadoPago.set('Aún no recibimos confirmación del pago. Espera un momento y vuelve a consultar.');
    } catch (error: unknown) {
      this.estadoPago.set(this.mensajeError(error, 'No se pudo consultar el estado del pago.'));
    }
  }

  async reintentarDocumento(tipo: TipoDocumentoSolicitud, event: Event): Promise<void> {
    this.seleccionarArchivo(tipo, event);
  }

  cerrarModal(): void {
    if (this.modal() !== 'pago') this.modal.set(null);
  }

  etiquetaDocumento(tipo: TipoDocumentoSolicitud): string {
    switch (tipo) {
      case 'PARTIDA_NACIMIENTO': return 'Partida de nacimiento';
      case 'DNI_C4': return 'DNI o C4 del estudiante';
      case 'RECIBO_SERVICIO': return 'Recibo de luz o agua';
    }
  }

  estadoDocumento(tipo: TipoDocumentoSolicitud): DocumentoSolicitudDto | undefined {
    return this.solicitud()?.documentos.find(d => d.tipo === tipo);
  }

  documentosAprobados(): boolean {
    const documentos = this.solicitud()?.documentos ?? [];
    return documentos.length === 3 && this.documentTypes.every(tipo => {
      const doc = documentos.find(d => d.tipo === tipo);
      if (!doc || doc.estado !== 'VALIDADO' || doc.iaValida !== true) return false;
      if (tipo === 'RECIBO_SERVICIO') return true;
      if (doc.dniApiCoincide !== true) return false;
      return tipo === 'PARTIDA_NACIMIENTO'
        ? doc.estadoFirma === 'VALIDA' && doc.vinculoParentalCoincide === true
        : doc.estadoFirma === 'VALIDA' || doc.estadoFirma === 'NO_APLICA';
    });
  }

  actualizarRevision(): void {
    const solicitud = this.solicitud();
    const token = this.leerToken();
    if (!solicitud || !token) return;
    this.procesando.set(true);
    this.api.consultar(solicitud.id, token).pipe(finalize(() => this.procesando.set(false))).subscribe({
      next: value => this.solicitud.set(value),
      error: err => this.error.set(this.mensajeError(err, 'No se pudo actualizar la revisión.'))
    });
  }

  estadoLabel(estado: EstadoSolicitudMatriculaPublica): string {
    const labels: Record<EstadoSolicitudMatriculaPublica, string> = {
      DOCUMENTOS_PENDIENTES: 'Documentos pendientes',
      DOCUMENTOS_EN_VALIDACION: 'En verificación automática',
      DOCUMENTOS_OBSERVADOS: 'Requiere correcciones',
      DOCUMENTOS_VALIDADOS: 'Documentos validados',
      PAGO_PENDIENTE: 'Pago pendiente',
      MATRICULADA: 'Matrícula confirmada',
      RECHAZADA: 'Solicitud rechazada'
    };
    return labels[estado];
  }

  descargarComprobante(): void {
    this.descargarDocumento('comprobante');
  }

  descargarFicha(): void {
    this.descargarDocumento('ficha');
  }

  private validarFormulario(): boolean {
    if (!this.anioId() || !this.seccionId()) return this.error.set('Selecciona año lectivo y sección.'), false;
    const required = [this.documentoEstudiante, this.nombresEstudiante, this.apellidoPaternoEstudiante,
      this.apellidoMaternoEstudiante, this.nacimientoEstudiante, this.documentoApoderado,
      this.nombresApoderado, this.apellidoPaternoApoderado, this.apellidoMaternoApoderado,
      this.celularApoderado, this.direccionApoderado, this.ubigeoApoderado];
    if (required.some(value => !value.trim())) return this.error.set('Completa todos los campos obligatorios.'), false;
    if (!fechaNacimientoValida(this.nacimientoEstudiante)) {
      return this.error.set('La fecha de nacimiento debe ser válida y anterior al día de hoy.'), false;
    }
    if (this.advertenciaEdad) return this.error.set(this.advertenciaEdad), false;
    if ([this.nombresEstudiante, this.apellidoPaternoEstudiante, this.apellidoMaternoEstudiante,
      this.nombresApoderado, this.apellidoPaternoApoderado, this.apellidoMaternoApoderado]
      .some(value => value.trim().length > 20)
      || this.emailApoderado.trim().length > 50 || this.direccionApoderado.trim().length > 150) {
      return this.error.set('Revisa la longitud de los nombres (20), correo (50) o dirección (150 caracteres).'), false;
    }
    if (!/^\d{8}$/.test(this.documentoEstudiante) || !/^\d{8}$/.test(this.documentoApoderado)) {
      return this.error.set('Los DNI deben tener 8 dígitos.'), false;
    }
    if (!/^9\d{8}$/.test(this.celularApoderado) || !/^\d{6}$/.test(this.ubigeoApoderado)) {
      return this.error.set('Verifica el celular (9 dígitos) y el ubigeo (6 dígitos).'), false;
    }
    if (this.emailApoderado.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.emailApoderado.trim())) {
      return this.error.set('Ingresa un correo electrónico válido o deja el campo vacío.'), false;
    }
    if (this.parentesco !== 'PADRE' && this.parentesco !== 'MADRE') {
      return this.error.set('Por ahora la solicitud admite únicamente al padre o a la madre.'), false;
    }
    if (!this.consentimientoGemini) return this.error.set('Autoriza el procesamiento de documentos para continuar.'), false;
    if (this.documentTypes.some(type => !this.archivos[type])) return this.error.set('Adjunta los tres documentos requeridos.'), false;
    return true;
  }

  private restaurarSolicitud(): void {
    const id = sessionStorage.getItem('shuji-solicitud-matricula-id');
    const token = sessionStorage.getItem('shuji-solicitud-matricula-token');
    const paymentId = this.paymentIdFromReturn();
    if (!id || !token) {
      if (paymentId) {
        this.limpiarParametrosPago();
        this.error.set('No se encontró la sesión privada de la solicitud para verificar el retorno del pago.');
      }
      return;
    }
    this.api.consultar(id, token).subscribe({
      next: solicitud => {
        this.solicitud.set(solicitud);
        if (paymentId) {
          if (solicitud.estado === 'MATRICULADA') {
            this.limpiarParametrosPago();
            this.mostrarExito(solicitud);
          } else {
            this.procesarRetornoPago(id, token, paymentId);
          }
          return;
        }
        if (solicitud.estado === 'MATRICULADA') this.mostrarExito(solicitud);
        else if (solicitud.estado === 'PAGO_PENDIENTE' && solicitud.enlacePago && this.documentosAprobados()) {
          this.enlacePago.set(solicitud.enlacePago);
          this.montoPago.set(solicitud.montoPago);
          this.modal.set('pago');
          this.iniciarSeguimientoPago();
        }
      },
      error: () => {
        this.limpiarCredencial();
        if (paymentId) {
          this.limpiarParametrosPago();
          this.error.set('No se pudo recuperar la solicitud para verificar el pago.');
        }
      }
    });
  }

  private abrirEtapaActualizada(solicitud: SolicitudMatriculaPublicaDto): void {
    switch (solicitud.estado) {
      case 'MATRICULADA':
        this.mostrarExito(solicitud);
        return;
      case 'RECHAZADA':
        this.iniciarNuevaSolicitud();
        return;
      case 'PAGO_PENDIENTE':
        if (!this.documentosAprobados()) {
          this.detenerSeguimientoPago();
          this.modal.set('documentos');
          return;
        }
        this.enlacePago.set(solicitud.enlacePago ?? '');
        this.montoPago.set(solicitud.montoPago);
        this.modal.set('pago');
        this.estadoPago.set('Completa el pago o consulta su confirmación.');
        this.iniciarSeguimientoPago();
        return;
      case 'DOCUMENTOS_VALIDADOS':
      case 'DOCUMENTOS_EN_VALIDACION':
        this.modal.set('validacion');
        return;
      default:
        this.modal.set('documentos');
    }
  }

  private paymentIdFromReturn(): string | null {
    const paymentId = this.route.snapshot.queryParamMap.get('payment_id')
      ?? this.route.snapshot.queryParamMap.get('collection_id');
    return paymentId && paymentId.toLowerCase() !== 'null' ? paymentId : null;
  }

  private procesarRetornoPago(id: string, token: string, paymentId: string): void {
    this.limpiarParametrosPago();
    this.modal.set('pago');
    if (!/^\d{1,32}$/.test(paymentId)) {
      this.estadoPago.set('Mercado Pago devolvió un identificador de pago inválido.');
      return;
    }

    this.procesando.set(true);
    this.estadoPago.set('Verificando el pago directamente con Mercado Pago…');
    this.api.confirmarPago(id, token, paymentId)
      .pipe(finalize(() => this.procesando.set(false)))
      .subscribe({
        next: solicitud => {
          this.solicitud.set(solicitud);
          if (solicitud.estado === 'MATRICULADA') {
            this.mostrarExito(solicitud);
            return;
          }
          if (solicitud.enlacePago) this.enlacePago.set(solicitud.enlacePago);
          this.estadoPago.set('El pago aún no figura aprobado. Seguiremos consultando la confirmación segura.');
          this.iniciarSeguimientoPago();
        },
        error: error => {
          this.estadoPago.set(this.mensajeError(error, 'No se pudo verificar el pago con Mercado Pago.'));
          this.iniciarSeguimientoPago();
        }
      });
  }

  private limpiarParametrosPago(): void {
    const parametrosMercadoPago = [
      'payment_id', 'collection_id', 'status', 'collection_status',
      'external_reference', 'preference_id', 'merchant_order_id'
    ];
    const queryParams = Object.fromEntries(parametrosMercadoPago.map(parametro => [parametro, null]));
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  private guardarCredencial(solicitud: SolicitudMatriculaPublicaDto): void {
    if (!solicitud.token) return;
    sessionStorage.setItem('shuji-solicitud-matricula-id', solicitud.id);
    sessionStorage.setItem('shuji-solicitud-matricula-token', solicitud.token);
  }

  private leerToken(): string | null {
    return sessionStorage.getItem('shuji-solicitud-matricula-token');
  }

  private limpiarCredencial(): void {
    sessionStorage.removeItem('shuji-solicitud-matricula-id');
    sessionStorage.removeItem('shuji-solicitud-matricula-token');
  }

  private iniciarSeguimientoPago(): void {
    this.detenerSeguimientoPago();
    this.pollHandle = window.setInterval(() => void this.actualizarEstadoPago(), 8000);
  }

  private detenerSeguimientoPago(): void {
    if (this.pollHandle !== null) window.clearInterval(this.pollHandle);
    this.pollHandle = null;
  }

  private mostrarExito(solicitud: SolicitudMatriculaPublicaDto): void {
    this.detenerSeguimientoPago();
    this.solicitud.set(solicitud);
    this.modal.set('exito');
  }

  private descargarDocumento(tipo: 'comprobante' | 'ficha'): void {
    const id = sessionStorage.getItem('shuji-solicitud-matricula-id');
    const token = this.leerToken();
    if (!id || !token) {
      this.error.set('No se encontró el acceso privado para descargar los documentos.');
      return;
    }
    const solicitud = this.solicitud();
    if (!solicitud || solicitud.estado !== 'MATRICULADA') return;

    this.error.set('');
    this.procesando.set(true);
    const descarga = tipo === 'comprobante'
      ? this.api.descargarComprobante(id, token)
      : this.api.descargarFicha(id, token);
    descarga.pipe(finalize(() => this.procesando.set(false))).subscribe({
      next: archivo => {
        const url = URL.createObjectURL(archivo);
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = `${tipo}-matricula-${solicitud.matriculaId}.html`;
        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      error: error => this.error.set(this.mensajeError(error, 'No se pudo generar el documento.'))
    });
  }

  private mensajeError(error: unknown, fallback: string): string {
    const apiError = error as { error?: { message?: string }; message?: string };
    return apiError?.error?.message || apiError?.message || fallback;
  }
}
