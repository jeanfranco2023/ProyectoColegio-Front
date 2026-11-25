import { FormatoEntradaDirective } from '../../shared/ui/formato-entrada.directive';
import {
  esNombreValido,
  esDniValido,
  esCelularValido,
  esEmailValido,
  esDireccionValida
} from '../../core/utils/validaciones';
import { CommonModule } from '@angular/common';
import { A11yModule } from '@angular/cdk/a11y';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize, firstValueFrom, Subscription } from 'rxjs';
import { edadAlCorteMatricula, fechaActualEnPeru, fechaNacimientoValida } from '../../core/utils/fecha-nacimiento';
import { guardarFotoEstudiante, obtenerFotoEstudiante } from '../../core/utils/avatar.util';
import { MatriculaPublicaService } from '../../core/services/matricula-publica.service';
import { environment } from '../../../environments/environment';
import { UiCalendarComponent } from '../../shared/ui/ui-calendar.component';
import { PagoSimuladoEvent, SimuladorCheckoutComponent } from '../../shared/ui/simulador-checkout.component';
import { crearCasoMatriculaDemo, crearPdfMatriculaDemo, fotoMatriculaDemo } from './matricula-demo.util';
import {
  CatalogoMatriculaPublicaDto,
  CrearSolicitudMatriculaPublicaDto,
  DocumentoSolicitudDto,
  EstadoSolicitudMatriculaPublica,
  ModalidadIngreso,
  PagoMatriculaPublicaDto,
  SeccionMatriculaPublicaDto,
  SolicitudMatriculaPublicaDto,
  TipoDocumentoSolicitud
} from '../../core/models/matricula-publica.model';

type ModalEtapa = 'documentos' | 'validacion' | 'pago' | 'exito' | null;
type VistaMatricula = 'inicio' | 'propuesta' | 'niveles' | 'admision' | 'preguntas';

@Component({
  selector: 'app-matricula-publica',
  standalone: true,
  imports: [FormatoEntradaDirective, CommonModule, FormsModule, RouterLink, A11yModule, UiCalendarComponent, SimuladorCheckoutComponent],
  templateUrl: './matricula-publica.component.html',
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
  readonly solicitudConflictiva = signal(false);
  readonly reenviandoToken = signal(false);
  readonly mensajeReenvioToken = signal('');
  readonly documentoEnProceso = signal<TipoDocumentoSolicitud | null>(null);
  readonly numeroDocumentoRevision = signal(0);
  readonly avanceRevision = signal(0);
  readonly totalRevision = signal(0);
  readonly error = signal('');
  readonly estadoPago = signal('');
  readonly enlacePago = signal('');
  readonly montoPago = signal(1);
  readonly anioId = signal<number | null>(null);
  readonly gradoId = signal<number | null>(null);
  readonly mensajeDni = signal('');
  readonly fotoEstudianteBase64 = signal<string | null>(null);
  readonly fotoEstudianteArchivo = signal<File | null>(null);
  readonly modoPruebaDisponible = signal(false);
  private secuenciaCasoDemo = 1;
  private dniCasoDemoActual: { estudiante: string; apoderado: string } | null = null;

  get fechaNacimientoMaxima(): string {
    return fechaActualEnPeru();
  }

  get fechaNacimientoMinima(): string {
    const anio = Number(fechaActualEnPeru().slice(0, 4));
    return `${anio - 20}-01-01`;
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
  parentesco: CrearSolicitudMatriculaPublicaDto['parentesco'] = 'MADRE';
  modalidadIngreso: ModalidadIngreso = 'REGULAR';
  colegioProcedencia = '';
  consentimientoGemini = false;

  archivos: Record<TipoDocumentoSolicitud, File | null> = {
    PARTIDA_NACIMIENTO: null,
    DNI_C4: null,
    RECIBO_SERVICIO: null,
    CERTIFICADO_ESTUDIOS: null
  };

  get documentTypes(): TipoDocumentoSolicitud[] {
    const modalidadActual = this.solicitud()?.modalidadIngreso ?? this.modalidadIngreso;
    return modalidadActual === 'TRASLADO'
      ? ['PARTIDA_NACIMIENTO', 'DNI_C4', 'RECIBO_SERVICIO', 'CERTIFICADO_ESTUDIOS']
      : ['PARTIDA_NACIMIENTO', 'DNI_C4', 'RECIBO_SERVICIO'];
  }

  get seccionesDisponibles() {
    const year = this.anioId();
    return this.catalogo().secciones.filter(s => s.anioLectivoId === year);
  }

  get gradosDisponibles(): SeccionMatriculaPublicaDto[] {
    const grados = new Map<number, SeccionMatriculaPublicaDto>();
    for (const seccion of this.seccionesDisponibles) {
      const existente = grados.get(seccion.gradoId);
      if (existente) existente.vacantesDisponibles += seccion.vacantesDisponibles;
      else grados.set(seccion.gradoId, { ...seccion });
    }
    const nivelPeso = (nivel: string): number => {
      const n = (nivel || '').toUpperCase();
      if (n.includes('INICIAL')) return 100;
      if (n.includes('PRIMARIA')) return 200;
      if (n.includes('SECUNDARIA')) return 300;
      return 400;
    };
    const extraerNumero = (gradoNombre: string, nivel: string, edadMinima?: number): number => {
      const g = (gradoNombre || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

      // Detección semántica por palabras clave
      if (g.includes('tres') || g.includes('3 an')) return 3;
      if (g.includes('cuatro') || g.includes('4 an')) return 4;
      if (g.includes('cinco') || g.includes('5 an')) return 5;

      if (g.includes('primer') || g.includes('1er') || g.includes('1ro') || g.includes('1°')) return 1;
      if (g.includes('segund') || g.includes('2do') || g.includes('2°')) return 2;
      if (g.includes('tercer') || g.includes('3er') || g.includes('3ro') || g.includes('3°')) return 3;
      if (g.includes('cuart') || g.includes('4to') || g.includes('4°')) return 4;
      if (g.includes('quint') || g.includes('5to') || g.includes('5°')) return 5;
      if (g.includes('sext') || g.includes('6to') || g.includes('6°')) return 6;

      if (typeof edadMinima === 'number' && edadMinima > 0) return edadMinima;

      const match = g.match(/\d+/);
      if (match) return parseInt(match[0], 10);

      return 0;
    };
    return [...grados.values()].sort((a, b) => {
      const pesoA = nivelPeso(a.nivel);
      const pesoB = nivelPeso(b.nivel);
      if (pesoA !== pesoB) return pesoA - pesoB;
      const numA = extraerNumero(a.grado, a.nivel, a.edadMinimaAlCorte);
      const numB = extraerNumero(b.grado, b.nivel, b.edadMinimaAlCorte);
      if (numA !== numB) return numA - numB;
      return a.grado.localeCompare(b.grado, 'es', { numeric: true });
    });
  }

  get requiereAutorizacionEdad(): boolean {
    return this.advertenciaEdad.includes('fuera del rango ordinario');
  }

  get advertenciaEdad(): string {
    if (!this.nacimientoEstudiante || !this.gradoId()) return '';
    const seccion = this.seccionesDisponibles.find(s => s.gradoId === this.gradoId());
    const anio = this.catalogo().anios.find(a => a.id === this.anioId());
    if (!seccion || !anio) return 'Selecciona una sección disponible del año lectivo.';
    if (!Number.isInteger(seccion.edadMinimaAlCorte) || !Number.isInteger(seccion.edadMaximaAlCorte)
      || seccion.edadMinimaAlCorte > seccion.edadMaximaAlCorte) {
      return 'No se pudo comprobar el rango de edad. Vuelve a cargar la página antes de continuar.';
    }
    const edad = edadAlCorteMatricula(this.nacimientoEstudiante, anio.anio);
    if (edad === null) return 'Ingresa una fecha de nacimiento válida.';
    if (edad >= seccion.edadMinimaAlCorte && edad <= seccion.edadMaximaAlCorte) return '';
    return `La edad al 31 de marzo de ${anio.anio} está fuera del rango ordinario (${seccion.edadMinimaAlCorte}–${seccion.edadMaximaAlCorte}). Puedes presentar la solicitud; Dirección evaluará la excepción después de validar los documentos.`;
  }

  get errorEdad(): string {
    if (!this.nacimientoEstudiante || !this.gradoId()) return '';
    const section = this.seccionesDisponibles.find(s => s.gradoId === this.gradoId());
    if (!section || !Number.isInteger(section.edadMinimaAlCorte)
      || !Number.isInteger(section.edadMaximaAlCorte)
      || section.edadMinimaAlCorte > section.edadMaximaAlCorte) {
      return 'No se pudo comprobar el rango de edad. Vuelve a cargar la página antes de continuar.';
    }
    const anio = this.catalogo().anios.find(a => a.id === this.anioId())?.anio;
    if (!anio) return 'No se pudo comprobar el año lectivo. Vuelve a cargar la página antes de continuar.';
    const edad = edadAlCorteMatricula(this.nacimientoEstudiante, anio);
    if (edad === null) return 'Ingresa una fecha de nacimiento válida.';
    const minPermitida = Math.max(2, section.edadMinimaAlCorte - 1);
    const maxPermitida = Math.min(20, section.edadMaximaAlCorte + 1);
    if (edad < minPermitida || edad > maxPermitida) {
      return `La edad al 31 de marzo de ${anio} (${edad} años) no corresponde a ${section.grado || 'este grado'} (rango permitido: ${section.edadMinimaAlCorte}–${section.edadMaximaAlCorte} años).`;
    }
    return '';
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
    if (environment.matriculaDemo) {
      this.api.modoPresentacion().subscribe({
        next: respuesta => this.modoPruebaDisponible.set(respuesta.activo),
        error: () => this.modoPruebaDisponible.set(false)
      });
    }
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

  navegarASeccion(event: Event, sectionId: string): void {
    event.preventDefault();
    const navigation = this.vista() === 'inicio'
      ? this.router.navigate([], { relativeTo: this.route, fragment: sectionId })
      : this.router.navigate(['/matricula', 'inicio'], { fragment: sectionId });

    void navigation.then(() => {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const target = document.getElementById(sectionId);
        if (!target) return;
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      }));
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

  seleccionarFotoEstudiante(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0] ?? null;
    if (!archivo) return;
    if (archivo.size === 0 || archivo.size > 5 * 1024 * 1024 || !archivo.type.startsWith('image/')) {
      this.error.set('La fotografía debe ser una imagen válida (JPG, PNG o WebP) de hasta 5 MB.');
      input.value = '';
      return;
    }
    this.error.set('');
    this.fotoEstudianteArchivo.set(archivo);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      this.fotoEstudianteBase64.set(base64);
      const dni = this.documentoEstudiante.trim();
      if (dni) {
        guardarFotoEstudiante(dni, base64);
      }
    };
    reader.readAsDataURL(archivo);
  }

  consultarDni(tipo: 'estudiante' | 'apoderado'): void {
    const dni = tipo === 'estudiante' ? this.documentoEstudiante : this.documentoApoderado;
    const codigo = Number(dni);
    const rangoSintetico =
      tipo === 'estudiante' ? codigo >= 99_000_001 && codigo <= 99_999_999
        : codigo >= 98_000_001 && codigo <= 98_999_999;
    if (rangoSintetico || (this.dniCasoDemoActual
      && dni === this.dniCasoDemoActual[tipo === 'estudiante' ? 'estudiante' : 'apoderado'])) {
      this.mensajeDni.set('Este es un identificador sintético; no se consulta en RENIEC.');
      return;
    }
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
          this.documentoEstudiante = identidad.numeroDocumento || identidad.dni || dni;
          this.nombresEstudiante = identidad.nombres ?? '';
          this.apellidoPaternoEstudiante = identidad.apellidoPaterno ?? '';
          this.apellidoMaternoEstudiante = identidad.apellidoMaterno ?? '';
          const fotoPrevia = typeof window !== 'undefined' ? localStorage.getItem(`shuji_foto_estudiante_${this.documentoEstudiante}`) : null;
          if (fotoPrevia && !this.fotoEstudianteBase64()) {
            this.fotoEstudianteBase64.set(fotoPrevia);
          }
        } else {
          this.documentoApoderado = identidad.numeroDocumento || identidad.dni || dni;
          this.nombresApoderado = identidad.nombres ?? '';
          this.apellidoPaternoApoderado = identidad.apellidoPaterno ?? '';
          this.apellidoMaternoApoderado = identidad.apellidoMaterno ?? '';
        }
        this.mensajeDni.set('Nombres y apellidos consultados. Contrástalos con el documento adjunto.');
      },
      error: error => this.mensajeDni.set(this.mensajeError(error, 'No fue posible consultar este DNI; verifica el número o inténtalo luego.'))
    });
  }

  cargarCasoMatriculaPrueba(): void {
    if (!this.modoPruebaDisponible()) return;
    const anio = this.catalogo().anios.find(a => a.id === this.anioId() && a.abierto)
      ?? this.catalogo().anios.find(a => a.abierto);
    if (!anio) {
      this.error.set('No hay un año lectivo abierto para generar el caso de prueba.');
      return;
    }
    const secciones = this.catalogo().secciones.filter(s => s.anioLectivoId === anio.id && s.vacantesDisponibles > 0);
    const seccion = secciones.find(s => s.gradoId === this.gradoId()) ?? secciones[0];
    if (!seccion) {
      this.error.set('No hay grados con vacantes disponibles para generar el caso de prueba.');
      return;
    }

    const caso = crearCasoMatriculaDemo(this.secuenciaCasoDemo++);
    const edad = Math.max(3, Math.min(17, seccion.edadMinimaAlCorte || 5));
    this.anioId.set(anio.id);
    this.gradoId.set(seccion.gradoId);
    this.documentoEstudiante = caso.dniEstudiante;
    this.nombresEstudiante = caso.nombresEstudiante;
    this.apellidoPaternoEstudiante = caso.apellidoPaternoEstudiante;
    this.apellidoMaternoEstudiante = caso.apellidoMaternoEstudiante;
    this.nacimientoEstudiante = `${String(anio.anio - edad - 1).padStart(4, '0')}-04-15`;
    this.generoEstudiante = caso.generoEstudiante;
    this.documentoApoderado = caso.dniApoderado;
    this.nombresApoderado = caso.nombresApoderado;
    this.apellidoPaternoApoderado = caso.apellidoPaternoApoderado;
    this.apellidoMaternoApoderado = caso.apellidoMaternoApoderado;
    this.parentesco = caso.parentesco;
    this.celularApoderado = caso.celularApoderado;
    this.emailApoderado = caso.emailApoderado;
    this.direccionApoderado = caso.direccionApoderado;
    this.colegioProcedencia = this.modalidadIngreso === 'TRASLADO' ? 'Institución de Prueba Los Robles' : '';
    this.consentimientoGemini = false;
    this.dniCasoDemoActual = { estudiante: caso.dniEstudiante, apoderado: caso.dniApoderado };
    this.archivos = {
      DNI_C4: crearPdfMatriculaDemo('DNI_C4', caso, seccion.grado),
      PARTIDA_NACIMIENTO: crearPdfMatriculaDemo('PARTIDA_NACIMIENTO', caso, seccion.grado),
      RECIBO_SERVICIO: crearPdfMatriculaDemo('RECIBO_SERVICIO', caso, seccion.grado),
      CERTIFICADO_ESTUDIOS: crearPdfMatriculaDemo('CERTIFICADO_ESTUDIOS', caso, seccion.grado)
    };
    this.fotoEstudianteArchivo.set(null);
    this.fotoEstudianteBase64.set(fotoMatriculaDemo());
    this.mensajeDni.set(`Caso ficticio ${caso.numeroCaso}; los identificadores no se consultarán en RENIEC.`);
    this.error.set('');
  }

  reenviarEnlaceSeguimiento(): void {
    const dni = this.documentoEstudiante.trim();
    const anioId = this.anioId();
    if (!dni || !anioId) {
      this.error.set('Por favor ingresa el DNI del estudiante y selecciona el año lectivo.');
      return;
    }
    this.reenviandoToken.set(true);
    this.mensajeReenvioToken.set('');
    this.api.reenviarToken(dni, anioId).pipe(
      finalize(() => this.reenviandoToken.set(false))
    ).subscribe({
      next: resp => this.mensajeReenvioToken.set(resp.mensaje || 'Si existe una solicitud para esos datos, se mostrarán las opciones disponibles para continuar.'),
      error: err => this.error.set(this.mensajeError(err, 'No se pudo reenviar el enlace. Por favor verifica los datos o contacta a Secretaría.'))
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
    this.archivos = { PARTIDA_NACIMIENTO: null, DNI_C4: null, RECIBO_SERVICIO: null, CERTIFICADO_ESTUDIOS: null };
    this.fotoEstudianteBase64.set(null);
    this.fotoEstudianteArchivo.set(null);
    this.modalidadIngreso = 'REGULAR';
    this.colegioProcedencia = '';
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
    this.parentesco = 'MADRE';
    this.consentimientoGemini = false;
    this.gradoId.set(null);
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
          gradoId: this.gradoId()!,
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
          emailApoderado: this.emailApoderado.trim(),
          direccionApoderado: this.direccionApoderado.trim(),
          parentesco: this.parentesco,
          consentimientoGemini: true,
          modalidadIngreso: this.modalidadIngreso,
          colegioProcedencia: this.modalidadIngreso === 'TRASLADO' ? this.colegioProcedencia.trim() : undefined
        };
        solicitud = await firstValueFrom(this.api.crear(payload));
        this.guardarCredencial(solicitud);
        this.solicitud.set(solicitud);
      }

      if (this.fotoEstudianteBase64() && this.documentoEstudiante.trim()) {
        guardarFotoEstudiante(this.documentoEstudiante.trim(), this.fotoEstudianteBase64()!);
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
        this.archivos = { PARTIDA_NACIMIENTO: null, DNI_C4: null, RECIBO_SERVICIO: null, CERTIFICADO_ESTUDIOS: null };
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

  async regenerarEnlacePago(): Promise<void> {
    await this.continuarAlPago();
  }

  async simularPagoOnline(evento: PagoSimuladoEvent): Promise<void> {
    const solicitud = this.solicitud();
    const token = this.leerToken();
    if (!solicitud || !token || this.procesando()) return;
    this.procesando.set(true);
    this.error.set('');
    this.estadoPago.set('Procesando pago digital en sandbox…');
    try {
      const actualizada = await firstValueFrom(
        this.api.simularPago(solicitud.id, token, evento.metodoPago, evento.referenciaOperacion)
      );
      this.solicitud.set(actualizada);
      if (actualizada.estado === 'MATRICULADA') {
        this.mostrarExito(actualizada);
      } else if (!this.reflejarPagoConfirmadoPendienteAsignacion(actualizada)) {
        this.estadoPago.set('Pago registrado en sandbox. Actualizando estado…');
      }
    } catch (error: unknown) {
      this.error.set(this.mensajeError(error, 'No se pudo procesar el pago digital.'));
      this.estadoPago.set('Intenta nuevamente con otro medio de pago.');
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
      else if (!this.reflejarPagoConfirmadoPendienteAsignacion(actualizada)) {
        this.estadoPago.set('Aún no recibimos confirmación del pago. Espera un momento y vuelve a consultar.');
      }
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
      case 'CERTIFICADO_ESTUDIOS': return 'Certificado de estudios o libreta de notas';
    }
  }

  estadoDocumento(tipo: TipoDocumentoSolicitud): DocumentoSolicitudDto | undefined {
    return this.solicitud()?.documentos.find(d => d.tipo === tipo);
  }

  documentosAprobados(): boolean {
    const documentos = this.solicitud()?.documentos ?? [];
    return documentos.length === this.documentTypes.length && this.documentTypes.every(tipo => {
      const doc = documentos.find(d => d.tipo === tipo);
      if (!doc || doc.estado !== 'VALIDADO') return false;
      const evidenciaPresentacion =
        doc.detalleFirma === 'No se verifica firma digital en el modo de presentación.'
        && typeof doc.observacion === 'string'
        && (doc.observacion.startsWith('Modo presentación: identidad coincide')
          || doc.observacion.startsWith('Modo presentación: archivo recibido'));
      if (evidenciaPresentacion) return true;
      if (doc.iaValida !== true) return false;
      if (tipo === 'RECIBO_SERVICIO') return true;
      if (doc.dniApiCoincide !== true) return false;
      return (doc.estadoFirma === 'VALIDA' || doc.estadoFirma === 'NO_APLICA')
        && (tipo !== 'PARTIDA_NACIMIENTO' || doc.vinculoParentalCoincide === true);
    });
  }

  puedeContinuarAlPago(): boolean {
    return this.solicitud()?.estado === 'DOCUMENTOS_VALIDADOS' && this.documentosAprobados();
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
      AUTORIZACION_EDAD_PENDIENTE: 'Pendiente de autorización por edad',
      PAGO_CONFIRMADO_PENDIENTE_ASIGNACION: 'Pago confirmado · sección pendiente',
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
    if (!this.anioId() || !this.gradoId()) return this.error.set('Selecciona el año lectivo y el grado.'), false;
    const required = [this.documentoEstudiante, this.nombresEstudiante, this.apellidoPaternoEstudiante,
      this.apellidoMaternoEstudiante, this.nacimientoEstudiante, this.documentoApoderado,
      this.nombresApoderado, this.apellidoPaternoApoderado, this.apellidoMaternoApoderado,
      this.celularApoderado, this.direccionApoderado];
    if (required.some(value => !value.trim())) return this.error.set('Completa todos los campos obligatorios.'), false;
    if (!fechaNacimientoValida(this.nacimientoEstudiante)) {
      return this.error.set('La fecha de nacimiento debe ser válida y anterior al día de hoy.'), false;
    }
    if (this.errorEdad) return this.error.set(this.errorEdad), false;
    if (this.advertenciaEdad && !this.requiereAutorizacionEdad) return this.error.set(this.advertenciaEdad), false;
    if ([this.nombresEstudiante, this.apellidoPaternoEstudiante, this.apellidoMaternoEstudiante,
      this.nombresApoderado, this.apellidoPaternoApoderado, this.apellidoMaternoApoderado]
      .some(value => value.trim().length > 30)
      || this.emailApoderado.trim().length > 100 || this.direccionApoderado.trim().length > 150) {
      return this.error.set('Revisa la longitud de los nombres (máx. 30), correo (100) o dirección (150 caracteres).'), false;
    }
    if (!esNombreValido(this.nombresEstudiante)
        || !esNombreValido(this.apellidoPaternoEstudiante)
        || !esNombreValido(this.apellidoMaternoEstudiante)) {
      return this.error.set('Los nombres y apellidos del estudiante solo deben contener letras y espacios (sin números ni caracteres especiales).'), false;
    }
    if (!esNombreValido(this.nombresApoderado)
        || !esNombreValido(this.apellidoPaternoApoderado)
        || !esNombreValido(this.apellidoMaternoApoderado)) {
      return this.error.set('Los nombres y apellidos del apoderado solo deben contener letras y espacios (sin números ni caracteres especiales).'), false;
    }
    if (!esDniValido(this.documentoEstudiante) || !esDniValido(this.documentoApoderado)) {
      return this.error.set('Los DNI deben tener exactamente 8 dígitos numéricos.'), false;
    }
    if (!esCelularValido(this.celularApoderado)) {
      return this.error.set('Verifica el celular (exactamente 9 dígitos numéricos).'), false;
    }
    if (!esDireccionValida(this.direccionApoderado)) {
      return this.error.set('La dirección no permite caracteres especiales extraños (solo letras, números y signos estándar como #, ., -).'), false;
    }
    if (!this.emailApoderado.trim()) {
      return this.error.set('Ingresa el correo electrónico del padre o apoderado para recibir el seguimiento.'), false;
    }
    if (!esEmailValido(this.emailApoderado)) {
      return this.error.set('Ingresa un correo electrónico válido (ej. apoderado@gmail.com).'), false;
    }
    if (this.parentesco !== 'PADRE' && this.parentesco !== 'MADRE') {
      return this.error.set('Por ahora la solicitud admite únicamente al padre o a la madre.'), false;
    }
    if (this.modalidadIngreso === 'TRASLADO' && this.colegioProcedencia.trim().length < 3) {
      return this.error.set('En solicitudes por traslado indica el colegio o institución de procedencia.'), false;
    }
    if (!this.consentimientoGemini) return this.error.set('Autoriza el procesamiento de documentos para continuar.'), false;
    if (this.documentTypes.some(type => !this.archivos[type])) {
      return this.error.set(this.modalidadIngreso === 'TRASLADO'
        ? 'Adjunta los cuatro documentos requeridos, incluido el certificado de estudios o libreta de notas.'
        : 'Adjunta los tres documentos requeridos.'), false;
    }
    if (!this.fotoEstudianteBase64()) return this.error.set('Adjunta la fotografía del estudiante (rostro / tamaño carné).'), false;
    return true;
  }

  private restaurarSolicitud(): void {
    const tokenQuery = this.route.snapshot.queryParamMap.get('token');
    if (tokenQuery) {
      this.api.consultarPorToken(tokenQuery.trim()).subscribe({
        next: solicitud => {
          this.guardarCredencial(solicitud);
          this.solicitud.set(solicitud);
          this.abrirEtapaActualizada(solicitud);
        },
        error: () => {
          this.error.set('El enlace de seguimiento ha vencido o no es válido.');
        }
      });
      return;
    }
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
        else if (solicitud.estado === 'PAGO_CONFIRMADO_PENDIENTE_ASIGNACION') {
          this.modal.set('pago');
          this.reflejarPagoConfirmadoPendienteAsignacion(solicitud);
        }
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
      case 'PAGO_CONFIRMADO_PENDIENTE_ASIGNACION':
        this.modal.set('pago');
        this.reflejarPagoConfirmadoPendienteAsignacion(solicitud);
        return;
      case 'AUTORIZACION_EDAD_PENDIENTE':
        this.modal.set(this.documentosAprobados() ? 'validacion' : 'documentos');
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
          if (this.reflejarPagoConfirmadoPendienteAsignacion(solicitud)) return;
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

  private reflejarPagoConfirmadoPendienteAsignacion(solicitud: SolicitudMatriculaPublicaDto): boolean {
    if (solicitud.estado !== 'PAGO_CONFIRMADO_PENDIENTE_ASIGNACION') return false;
    this.detenerSeguimientoPago();
    this.enlacePago.set('');
    this.estadoPago.set('Pago confirmado. La institución asignará la sección y actualizará el estado de la matrícula.');
    return true;
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
    if (
      !solicitud ||
      (solicitud.estado !== 'MATRICULADA' && solicitud.estado !== 'PAGO_CONFIRMADO_PENDIENTE_ASIGNACION')
    ) return;

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
        enlace.download = tipo === 'comprobante'
          ? `comprobante-matricula-${solicitud.matriculaId}.pdf`
          : `ficha-matricula-${solicitud.matriculaId}.html`;
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
