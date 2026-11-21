import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AcademicoService } from '../../core/services/academico.service';
import { HorarioService } from '../../core/services/horario.service';
import {
  RefuerzoService,
  SesionRefuerzoDto,
  TableroRefuerzoDto
} from '../../core/services/refuerzo.service';
import { AuthStore } from '../../core/state/auth.store';
import { RefuerzosComponent } from './refuerzos.component';

describe('sesiones de refuerzo por contexto', () => {
  let componente: RefuerzosComponent;
  let peticiones: Subject<SesionRefuerzoDto[]>[];

  beforeEach(() => {
    peticiones = [];
    TestBed.configureTestingModule({
      providers: [
        { provide: AcademicoService, useValue: {} },
        { provide: HorarioService, useValue: {} },
        {
          provide: RefuerzoService,
          useValue: {
            listarSesiones: () => {
              const respuesta = new Subject<SesionRefuerzoDto[]>();
              peticiones.push(respuesta);
              return respuesta;
            }
          }
        }
      ]
    });
    componente = TestBed.runInInjectionContext(() => new RefuerzosComponent());
    componente.asignaciones.set([
      { id: 1, anioLectivoId: 2, nivelId: 1, seccionId: 3, areaCurricularId: 4, docenteUsuarioId: 5 },
      { id: 2, anioLectivoId: 2, nivelId: 1, seccionId: 3, areaCurricularId: 6, docenteUsuarioId: 7 }
    ]);
    componente.asignacionId = 1;
    componente.periodoId = 1;
  });

  afterEach(() => TestBed.resetTestingModule());

  const sesion = (id: number, area: number, docente: number): SesionRefuerzoDto => ({
    id,
    anioLectivoId: 2,
    periodoAcademicoId: 1,
    areaCurricularId: area,
    docenteUsuarioId: docente,
    tema: 'Cantidades',
    fechaProgramada: '2026-10-26',
    horaInicio: '15:00',
    horaFin: '16:00',
    aulaAsignada: 'A101'
  });

  it('muestra solo sesiones del área y docente seleccionados', () => {
    componente.cargar();
    peticiones[0].next([sesion(1, 4, 5), sesion(2, 6, 7)]);
    expect(componente.sesiones().map(s => s.id)).toEqual([1]);
  });

  it('una consulta anterior no reemplaza la selección actual', () => {
    componente.cargar();
    componente.asignacionId = 2;
    componente.cargar();
    peticiones[1].next([sesion(2, 6, 7)]);
    peticiones[0].next([sesion(1, 4, 5)]);
    expect(componente.sesiones().map(s => s.id)).toEqual([2]);
  });
});

describe('tablero integral de refuerzo académico', () => {
  afterEach(() => TestBed.resetTestingModule());

  const tableroEjemplo: TableroRefuerzoDto = {
    anioLectivoId: 1,
    periodoId: 4,
    totalSesiones: 2,
    totalInscripciones: 4,
    pendientesAsistencia: 1,
    asistieron: 2,
    faltaron: 1,
    justificados: 0,
    estudiantesUnicosEnRefuerzo: 4,
    evaluacionesRiesgoTotal: 2,
    evaluacionesSinDerivar: 1,
    sesiones: [
      {
        id: 10,
        anioLectivoId: 1,
        periodoAcademicoId: 4,
        periodoNombre: 'IV Bimestre',
        areaCurricularId: 11,
        areaNombre: 'Matemática',
        docenteUsuarioId: 63,
        docenteNombre: 'Alfredo Robles Pizarro',
        tema: 'Ecuaciones cuadráticas',
        fechaProgramada: '2026-11-10',
        horaInicio: '15:00',
        horaFin: '16:00',
        aulaAsignada: 'SEC-5-A',
        seccionId: 101,
        nivelNombre: 'Secundaria',
        gradoNombre: '5to',
        seccionLetra: 'A',
        gradoSeccion: '5to Secundaria · A',
        totalInscritos: 4,
        pendientes: 1,
        asistieron: 2,
        faltaron: 1,
        justificados: 0,
        casosC: 2,
        casosB: 2,
        estadoSesion: 'PENDIENTE_ASISTENCIA'
      }
    ],
    riesgos: [
      {
        calificacionId: 901,
        matriculaId: 501,
        estudianteId: 701,
        nombreEstudiante: 'Lucía Paredes Quispe',
        dniEstudiante: '71234567',
        anioLectivoId: 1,
        periodoAcademicoId: 4,
        periodoNombre: 'IV Bimestre',
        seccionId: 101,
        nivelNombre: 'Secundaria',
        gradoNombre: '5to',
        seccionLetra: 'A',
        gradoSeccion: '5to Secundaria · A',
        areaCurricularId: 11,
        areaNombre: 'Matemática',
        docenteUsuarioId: 63,
        docenteNombre: 'Alfredo Robles Pizarro',
        competenciaId: 1,
        competenciaNombre: 'Resuelve problemas de regularidad',
        calificacionCualitativa: 'C',
        conclusionDescriptiva: 'Requiere práctica guiada',
        derivado: false,
        sesionRefuerzoId: null,
        sesionTema: null,
        estadoAsistencia: null
      }
    ]
  };

  it('selecciona periodo vigente, carga KPIs, permite filtrar y prellenar sesión desde estudiante en riesgo', () => {
    let periodoConsultado: number | undefined;
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthStore, useValue: { hasRole: (rol: string) => rol === 'DIRECCION' } },
        {
          provide: HorarioService,
          useValue: {
            catalogo: () =>
              of([
                {
                  asignacionId: 55,
                  anioLectivoId: 1,
                  anio: 2026,
                  seccionId: 101,
                  nivelId: 3,
                  gradoId: 5,
                  nivel: 'Secundaria',
                  grado: '5to',
                  letra: 'A',
                  areaId: 11,
                  areaNombre: 'Matemática',
                  docenteUsuarioId: 63,
                  docenteNombre: 'Alfredo Robles Pizarro',
                  aulaCodigo: 'SEC-5-A'
                }
              ])
          }
        },
        {
          provide: AcademicoService,
          useValue: {
            listarAnios: () =>
              of([{ id: 1, anio: 2026, fechaInicio: '2026-03-01', fechaFin: '2026-12-31', abierto: true }]),
            listarPeriodos: () =>
              of([
                {
                  id: 1,
                  anioLectivoId: 1,
                  numeroPeriodo: 1,
                  nombre: 'I Bimestre',
                  fechaInicio: '2026-03-01',
                  fechaFin: '2026-05-08',
                  cerrado: true
                },
                {
                  id: 4,
                  anioLectivoId: 1,
                  numeroPeriodo: 4,
                  nombre: 'IV Bimestre',
                  fechaInicio: '2026-10-19',
                  fechaFin: '2099-12-31',
                  cerrado: false
                }
              ]),
            listarAsignaciones: () => of([]),
            listarAulas: () => of([{ id: 1, codigo: 'SEC-5-A', nombre: 'Aula 5A', ubicacion: 'P2', capacidad: 30, activa: true }])
          }
        },
        {
          provide: RefuerzoService,
          useValue: {
            tablero: (_anio?: number, periodo?: number) => {
              periodoConsultado = periodo;
              return of(tableroEjemplo);
            }
          }
        }
      ]
    });

    const componente = TestBed.runInInjectionContext(() => new RefuerzosComponent());
    componente.ngOnInit();

    expect(periodoConsultado).toBe(4);
    expect(componente.puedeRegistrarAsistencia()).toBe(true);
    expect(componente.kpis().sesiones).toBe(1);
    expect(componente.kpis().riesgosSinDerivar).toBe(1);
    expect(componente.opcionesDocente()).toEqual(['Alfredo Robles Pizarro']);

    componente.setBusqueda('71234567');
    expect(componente.riesgosFiltrados().length).toBe(1);
    expect(componente.sesionesFiltradas().length).toBe(0);

    componente.limpiarFiltros();
    componente.prepararSesionDesdeRiesgo(tableroEjemplo.riesgos[0]);
    expect(componente.mostrarFormulario()).toBe(true);
    expect(componente.asignacionId).toBe(55);
    expect(componente.aula).toBe('SEC-5-A');
    expect(componente.tema).toContain('Matemática');
  });
});
