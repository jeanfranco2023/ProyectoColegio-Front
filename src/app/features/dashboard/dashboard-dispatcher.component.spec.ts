import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DashboardDispatcherComponent } from './dashboard-dispatcher.component';
import { AuthStore } from '../../core/state/auth.store';
import { AcademicoService } from '../../core/services/academico.service';
import { MatriculaService } from '../../core/services/matricula.service';
import { MatriculaPublicaService } from '../../core/services/matricula-publica.service';
import { SuplenciaService } from '../../core/services/suplencia.service';
import { TesoreriaService } from '../../core/services/tesoreria.service';
import { PortalFamiliarService } from '../../core/services/portal-familiar.service';
import { of } from 'rxjs';

function configurarDashboard(roles: string[]) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideHttpClient(),
      provideHttpClientTesting(),
      {
        provide: AuthStore,
        useValue: {
          user: () => ({ id: 1, username: 'usuario_qa', nombreCompleto: 'Usuario QA', roles }),
          hasRole: (r: string) => roles.includes(r),
          hasAnyRole: (rs: string[]) => rs.some(r => roles.includes(r))
        }
      },
      {
        provide: AcademicoService,
        useValue: {
          listarAnios: vi.fn(() => of([{ id: 1, anio: 2026, abierto: true, fechaInicio: '2026-03-01', fechaFin: '2026-12-31' }])),
          listarPeriodos: vi.fn(() => of([{ id: 10, anioLectivoId: 1, numeroPeriodo: 1, nombre: 'I Bimestre', cerrado: false }])),
          listarNiveles: vi.fn(() => of([{ id: 2, codigo: 'PRIMARIA', nombre: 'Primaria' }])),
          listarGradosPorNivel: vi.fn(() => of([{ id: 101, nivelId: 2, numeroGrado: 1, nombre: '1° Primaria' }])),
          listarSecciones: vi.fn(() => of([{ id: 201, anioLectivoId: 1, gradoId: 101, nivelId: 2, letra: 'A', cupoMaximo: 30, vacantesOcupadas: 24 }]))
        }
      },
      {
        provide: MatriculaService,
        useValue: {
          listarEstudiantes: vi.fn(() => of([])),
          listarPorSeccion: vi.fn(() => of([]))
        }
      },
      {
        provide: MatriculaPublicaService,
        useValue: {
          listarAdmin: vi.fn(() => of([
            { id: 1, estado: 'DOCUMENTOS_PENDIENTES', requiereAutorizacionEdad: false },
            { id: 2, estado: 'AUTORIZACION_EDAD_PENDIENTE', requiereAutorizacionEdad: true }
          ]))
        }
      },
      {
        provide: SuplenciaService,
        useValue: {
          bandeja: vi.fn(() => of([{ id: 5, estado: 'PENDIENTE_APROBACION' }]))
        }
      },
      {
        provide: TesoreriaService,
        useValue: {
          listarMisObligaciones: vi.fn(() => of([]))
        }
      },
      {
        provide: PortalFamiliarService,
        useValue: {
          hijos: vi.fn(() => of([]))
        }
      }
    ]
  });
  const http = TestBed.inject(HttpTestingController);
  const component = TestBed.runInInjectionContext(() => new DashboardDispatcherComponent());
  return { component, http };
}

afterEach(() => TestBed.resetTestingModule());

describe('DashboardDispatcherComponent (Hito 2 y Hito 4)', () => {
  it('prioriza decisiones pendientes e indicadores institucionales para DIRECCION', () => {
    const { component, http } = configurarDashboard(['DIRECCION']);
    component.ngOnInit();

    const reqResumen = http.match(r => r.url.endsWith('/dashboard/resumen'));
    for (const r of reqResumen) {
      r.flush({ anio: 2026, totalEstudiantes: 120, asistenciaHoy: 94.5, recaudacionMes: 15800, alumnosRiesgo: 4 });
    }
    const reqSolicitudes = http.match(r => r.url.includes('/matricula-publica/admin/solicitudes'));
    for (const r of reqSolicitudes) {
      r.flush([
        { id: 1, estado: 'DOCUMENTOS_PENDIENTES', requiereAutorizacionEdad: false },
        { id: 2, estado: 'AUTORIZACION_EDAD_PENDIENTE', requiereAutorizacionEdad: true }
      ]);
    }
    const reqSuplencias = http.match(r => r.url.includes('/suplencias/pendientes'));
    for (const r of reqSuplencias) {
      r.flush([{ id: 5, estado: 'PENDIENTE_APROBACION' }]);
    }
    const reqInd = http.match(r => r.url.includes('/dashboard/indicadores'));
    for (const r of reqInd) {
      r.flush({
        desempeno: {
          destacados: 18, logroEsperado: 62, enProceso: 15, requierenAcompanamiento: 5,
          estudiantes: [
            { matriculaId: 501, estudianteNombre: 'Lucía Paredes', gradoSeccion: '1° Primaria A', nivelLogro: 'AD' },
            { matriculaId: 502, estudianteNombre: 'Mateo Quispe', gradoSeccion: '1° Primaria A', nivelLogro: 'C' }
          ]
        },
        cobertura: { evaluados: 100, matriculados: 120, sinEvaluacion: 20, porcentajeCobertura: 83.3 },
        asistenciaCupos: {
          porcentajeAsistencia: 94.5,
          variacionPeriodoAnterior: 1.8,
          presentes: 100,
          tardanzas: 14,
          inasistencias: 9,
          faltasJustificadas: 6,
          faltasInjustificadas: 3,
          secciones: [
            { seccionId: 201, nivel: 'PRIMARIA', gradoNombre: '1° Primaria', seccionNombre: 'A', matriculados: 24, cupoMaximo: 30, vacantesDisponibles: 5 }
          ]
        }
      });
    }

    expect(component.esDireccion()).toBe(true);
    expect(component.solicitudesPendientesCount()).toBe(2);
    expect(component.suplenciasPendientesCount()).toBe(1);
    expect(component.totalEvaluados()).toBe(100);
    expect(component.sinEvaluacionCount()).toBe(20);
    expect(component.alumnosEnRiesgo()).toBe(4);
    expect(component.indicadores().asistencia.porcentajePeriodo).toBe(94.5);
    expect(component.totalVacantesDisponibles()).toBe(5);

    // Alternar vista tabular accesible y filtrar grupo CNEB
    expect(component.vistaTabular()).toBe(false);
    component.alternarVistaTabular();
    expect(component.vistaTabular()).toBe(true);

    component.seleccionarGrupoDesempeno('AD');
    expect(component.estudiantesGrupoFiltrado().length).toBe(1);
    expect(component.estudiantesGrupoFiltrado()[0].nombreCompleto).toBe('Lucía Paredes');
  });

  it('envía el año del corte y muestra un error sin inventar cifras', () => {
    const { component, http } = configurarDashboard(['DIRECCION']);
    component.anioFiltroId = 12;
    component.cargarIndicadoresDireccion();
    const req = http.expectOne(r => r.url.endsWith('/dashboard/indicadores'));
    expect(req.request.params.get('anioLectivoId')).toBe('12');
    req.flush(null, { status: 503, statusText: 'No disponible' });
    expect(component.indicadoresEstado()).toBe('error');
    expect(component.totalEvaluados()).toBe(0);
  });

  it('habilita vista operativa de ADMINISTRADOR con accesos a CH-xxx, auditoría y usuarios', () => {
    const { component } = configurarDashboard(['ADMINISTRADOR']);
    expect(component.esAdministrador()).toBe(true);
    expect(component.etiquetaRolPrincipal()).toBe('Administración del Sistema');
  });

  it('aplica filtros de nivel, grado y sección reactivamente sobre la tabla de cupos', () => {
    const { component } = configurarDashboard(['ADMINISTRADOR']);
    component.indicadores.set({
      desempeno: { AD: 0, A: 0, B: 0, C: 0 },
      cobertura: { evaluados: 0, matriculados: 0, sinEvaluacion: 0, porcentajeCobertura: 0 },
      asistencia: {
        porcentajePeriodo: null, variacionPeriodoAnterior: null, tieneCortePrevio: false,
        presentes: 0, tardanzas: 0, inasistencias: 0, faltasJustificadas: 0, faltasInjustificadas: 0
      },
      seccionesCupos: [
        { seccionId: 1, nivel: 'INICIAL', gradoId: 1, grado: 'Inicial 5 años', seccion: 'A', aula: 'I-1', matriculados: 25, cupoMaximo: 30, vacantesDisponibles: 5 },
        { seccionId: 2, nivel: 'PRIMARIA', gradoId: 4, grado: '6° de Primaria', seccion: 'A', aula: 'P-1', matriculados: 28, cupoMaximo: 30, vacantesDisponibles: 2 },
        { seccionId: 3, nivel: 'SECUNDARIA', gradoId: 10, grado: '5° de Secundaria', seccion: 'A', aula: 'S-1', matriculados: 30, cupoMaximo: 30, vacantesDisponibles: 0 },
        { seccionId: 4, nivel: 'SECUNDARIA', gradoId: 10, grado: '5° de Secundaria', seccion: 'B', aula: 'S-2', matriculados: 30, cupoMaximo: 30, vacantesDisponibles: 0 },
        { seccionId: 5, nivel: 'SECUNDARIA', gradoId: 10, grado: '5° de Secundaria', seccion: 'D', aula: 'S-3', matriculados: 0, cupoMaximo: 30, vacantesDisponibles: 30 }
      ],
      estudiantesDetalle: []
    });

    // 1. Por defecto excluye D y muestra las demás
    expect(component.seccionesCuposFiltradas().length).toBe(4);
    expect(component.seccionesCuposFiltradas().some(s => s.seccion === 'D')).toBe(false);

    // 2. Filtrar por Nivel SECUNDARIA
    component.alCambiarNivelCupos('SECUNDARIA');
    expect(component.seccionesCuposFiltradas().length).toBe(2);
    expect(component.seccionesCuposFiltradas().every(s => s.nivel === 'SECUNDARIA')).toBe(true);

    // 3. Filtrar por Sección B
    component.alCambiarSeccionCupos('B');
    expect(component.seccionesCuposFiltradas().length).toBe(1);
    expect(component.seccionesCuposFiltradas()[0].seccion).toBe('B');

    // 4. Restablecer filtros
    component.limpiarFiltrosCupos();
    expect(component.seccionesCuposFiltradas().length).toBe(4);
  });

  it('calcula métricas ejecutivas de ocupación, riesgo sobre padrón y proporciones de asistencia', () => {
    const { component } = configurarDashboard(['DIRECCION']);
    component.totalEstudiantes.set(100);
    component.alumnosEnRiesgo.set(25);
    component.indicadores.set({
      desempeno: { AD: 10, A: 50, B: 20, C: 20 },
      cobertura: { evaluados: 100, matriculados: 100, sinEvaluacion: 0, porcentajeCobertura: 100 },
      asistencia: {
        porcentajePeriodo: 85, variacionPeriodoAnterior: null, tieneCortePrevio: false,
        presentes: 85, tardanzas: 10, inasistencias: 5, faltasJustificadas: 2, faltasInjustificadas: 3
      },
      seccionesCupos: [
        { seccionId: 1, nivel: 'SECUNDARIA', gradoId: 10, grado: '5° de Secundaria', seccion: 'A', aula: 'S-1', matriculados: 30, cupoMaximo: 30, vacantesDisponibles: 0 },
        { seccionId: 2, nivel: 'SECUNDARIA', gradoId: 10, grado: '5° de Secundaria', seccion: 'B', aula: 'S-2', matriculados: 15, cupoMaximo: 30, vacantesDisponibles: 15 }
      ],
      estudiantesDetalle: []
    });

    expect(component.porcentajeRiesgoPadron()).toBe(25);
    expect(component.porcentajeOcupacionCupos()).toBe(75);
    expect(component.asistenciaProporciones()).toEqual({ p: 85, t: 10, i: 5, total: 100 });
    expect(component.ocupacionFilaPorcentaje(component.seccionesCuposFiltradas()[0])).toBe(100);
    expect(component.ocupacionFilaPorcentaje(component.seccionesCuposFiltradas()[1])).toBe(50);
  });

  it('filtra en el modal de desempeño, abre la ficha visual del estudiante (drill-down) y regresa a la lista', () => {
    const { component, http } = configurarDashboard(['DIRECCION']);
    component.indicadores.set({
      desempeno: { AD: 1, A: 1, B: 0, C: 0 },
      cobertura: { evaluados: 2, matriculados: 2, sinEvaluacion: 0, porcentajeCobertura: 100 },
      asistencia: {
        porcentajePeriodo: 95, variacionPeriodoAnterior: null, tieneCortePrevio: false,
        presentes: 2, tardanzas: 0, inasistencias: 0, faltasJustificadas: 0, faltasInjustificadas: 0
      },
      seccionesCupos: [],
      estudiantesDetalle: [
        { matriculaId: 501, nombreCompleto: 'Lucía Paredes Flores', grado: '5° de Secundaria A', nivelLogro: 'AD' },
        { matriculaId: 502, nombreCompleto: 'Carlos Mendoza Vega', grado: '4° de Secundaria B', nivelLogro: 'AD' }
      ]
    });

    component.seleccionarGrupoDesempeno('AD');
    expect(component.grupoSeleccionado()).toBe('AD');
    expect(component.estudiantesGrupoModalFiltrados().length).toBe(2);

    component.alBuscarEnModal('lucía');
    expect(component.estudiantesGrupoModalFiltrados().length).toBe(1);
    const lucia = component.estudiantesGrupoModalFiltrados()[0];

    component.abrirDetalleEstudianteModal(lucia);
    expect(component.estudianteModalSeleccionado()?.matriculaId).toBe(501);
    expect(component.cargandoDetalleEstudiante()).toBe(true);

    const reqFicha = http.expectOne(r => r.url.endsWith('/matriculas/501'));
    reqFicha.flush({
      matricula: { id: 501, anioLectivoId: 1, estudianteId: 10, seccionId: 37, fechaMatricula: '2026-03-01', estadoMatricula: 'MATRICULADO', estadoPagoMatricula: 'PAGADO', modalidadIngreso: 'REGULAR' },
      estudiante: { id: 10, numeroDocumento: '85000001', nombres: 'Lucía', apellidoPaterno: 'Paredes', apellidoMaterno: 'Flores', genero: 'F', fechaNacimiento: '2010-05-10' },
      apoderados: [{ apoderado: { id: 4, numeroDocumento: '40000001', nombres: 'Ana', apellidoPaterno: 'Flores', apellidoMaterno: 'Ruiz', celular: '999111222' }, parentesco: 'MADRE', esResponsableEconomico: true }],
      estadoPagoMatricula: 'PAGADO'
    });

    const reqLibreta = http.expectOne(r => r.url.endsWith('/evaluacion/libreta/501'));
    reqLibreta.flush({
      matriculaId: 501,
      calificaciones: [
        { id: 1, matriculaId: 501, anioLectivoId: 1, seccionId: 37, periodoAcademicoId: 1, calificacionCualitativa: 'AD', conclusionDescriptiva: 'Logro destacado sostenido', requiereRefuerzo: false },
        { id: 2, matriculaId: 501, anioLectivoId: 1, seccionId: 37, periodoAcademicoId: 1, calificacionCualitativa: 'A', conclusionDescriptiva: 'Cumple competencias', requiereRefuerzo: false }
      ]
    });

    expect(component.cargandoDetalleEstudiante()).toBe(false);
    expect(component.fichaEstudianteModal()?.estudiante.numeroDocumento).toBe('85000001');
    expect(component.apoderadoPrincipalModal()?.apoderado.nombres).toBe('Ana');
    expect(component.resumenCalificacionesModal()).toEqual({ AD: 1, A: 1, B: 0, C: 0, refuerzo: 0 });
    expect(component.conclusionesDestacadasModal().length).toBe(2);

    component.volverAListaDesempeno();
    expect(component.estudianteModalSeleccionado()).toBeNull();
    expect(component.grupoSeleccionado()).toBe('AD');

    component.cerrarModalDesempeno();
    expect(component.grupoSeleccionado()).toBeNull();
  });

  it('selecciona automáticamente el bimestre pendiente y filtra las notas del modal sin mezclar bimestres concluidos', () => {
    const { component, http } = configurarDashboard(['DIRECCION']);
    component.periodosDisponibles.set([
      { id: 1, anioLectivoId: 1, numeroPeriodo: 1, nombre: 'I Bimestre', fechaInicio: '2026-03-01', fechaFin: '2026-05-08', cerrado: false },
      { id: 4, anioLectivoId: 1, numeroPeriodo: 4, nombre: 'IV Bimestre', fechaInicio: '2026-10-19', fechaFin: '2099-12-31', cerrado: false }
    ]);

    expect(component.periodoVigenteId()).toBe(4);
    expect(component.esPeriodoConcluido(component.periodosDisponibles()[0])).toBe(true);
    expect(component.esPeriodoConcluido(component.periodosDisponibles()[1])).toBe(false);

    component.periodoFiltroId = 4;
    expect(component.esPeriodoActualAplicableRefuerzo()).toBe(true);

    component.abrirDetalleEstudianteModal({
      matriculaId: 501,
      nombreCompleto: 'Lucía Paredes Flores',
      grado: '5° de Secundaria A',
      nivelLogro: 'AD'
    });
    http.expectOne(r => r.url.endsWith('/matriculas/501')).flush(null);
    http.expectOne(r => r.url.endsWith('/evaluacion/libreta/501')).flush({
      matriculaId: 501,
      calificaciones: [
        { id: 1, matriculaId: 501, anioLectivoId: 1, seccionId: 37, periodoAcademicoId: 1, calificacionCualitativa: 'C', conclusionDescriptiva: 'Nota previa en inicio', requiereRefuerzo: true },
        { id: 2, matriculaId: 501, anioLectivoId: 1, seccionId: 37, periodoAcademicoId: 4, calificacionCualitativa: 'AD', conclusionDescriptiva: 'Superado en IV Bimestre', requiereRefuerzo: false }
      ]
    });

    expect(component.resumenCalificacionesModal()).toEqual({ AD: 1, A: 0, B: 0, C: 0, refuerzo: 0 });
    expect(component.conclusionesDestacadasModal().map(c => c.conclusionDescriptiva)).toEqual(['Superado en IV Bimestre']);

    component.periodoFiltroId = 1;
    expect(component.esPeriodoActualAplicableRefuerzo()).toBe(false);
    expect(component.resumenCalificacionesModal()).toEqual({ AD: 0, A: 0, B: 0, C: 1, refuerzo: 1 });
  });

  it('abre el modal apilado de detalles de notas sin cerrar la ficha y permite cambiar entre bimestres y cursos', () => {
    const { component, http } = configurarDashboard(['DIRECCION']);
    component.periodosDisponibles.set([
      { id: 1, anioLectivoId: 1, numeroPeriodo: 1, nombre: 'I Bimestre', fechaInicio: '2026-03-01', fechaFin: '2026-05-08', cerrado: false },
      { id: 4, anioLectivoId: 1, numeroPeriodo: 4, nombre: 'IV Bimestre', fechaInicio: '2026-10-19', fechaFin: '2099-12-31', cerrado: false }
    ]);
    component.periodoFiltroId = 4;
    component.grupoSeleccionado.set('AD');
    component.abrirDetalleEstudianteModal({
      matriculaId: 501,
      nombreCompleto: 'Lucía Paredes Flores',
      grado: '5° de Secundaria A',
      nivelLogro: 'AD'
    });
    http.expectOne(r => r.url.endsWith('/matriculas/501')).flush(null);
    http.expectOne(r => r.url.endsWith('/evaluacion/libreta/501')).flush({
      matriculaId: 501,
      calificaciones: [
        { id: 1, matriculaId: 501, anioLectivoId: 1, seccionId: 37, periodoAcademicoId: 1, areaCurricularId: 21, competenciaId: 54, calificacionCualitativa: 'B', conclusionDescriptiva: 'Oralidad en progreso', requiereRefuerzo: true },
        { id: 2, matriculaId: 501, anioLectivoId: 1, seccionId: 37, periodoAcademicoId: 25, areaCurricularId: 25, competenciaId: 66, calificacionCualitativa: 'AD', conclusionDescriptiva: 'Dominio numérico', requiereRefuerzo: false }
      ].map(item => (item.id === 2 ? { ...item, periodoAcademicoId: 4 } : item))
    });

    component.abrirModalDetalleNotas();
    expect(component.mostrarModalDetalleNotas()).toBe(true);
    expect(component.estudianteModalSeleccionado()?.matriculaId).toBe(501);
    expect(component.bimestreDetalleNotasId()).toBe(4);
    expect(component.cursosDetalleNotasModal().map(c => c.areaNombre)).toEqual(['Matemática']);

    component.seleccionarBimestreDetalleNotas(1);
    expect(component.bimestreDetalleNotasId()).toBe(1);
    expect(component.cursosDetalleNotasModal().map(c => c.areaNombre)).toEqual(['Comunicación']);

    component.cerrarModalDetalleNotas();
    expect(component.mostrarModalDetalleNotas()).toBe(false);
    expect(component.estudianteModalSeleccionado()?.matriculaId).toBe(501);
  });
});
