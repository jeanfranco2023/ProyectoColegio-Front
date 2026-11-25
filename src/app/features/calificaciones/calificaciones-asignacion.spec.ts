import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, Subject } from 'rxjs';
import { afterEach, expect, it } from 'vitest';
import { FilaCalificacionResponseDto } from '../../core/models/evaluacion.model';
import { AcademicoService } from '../../core/services/academico.service';
import { EvaluacionService } from '../../core/services/evaluacion.service';
import { HorarioService } from '../../core/services/horario.service';
import { AuthStore } from '../../core/state/auth.store';
import { CalificacionesComponent } from './calificaciones.component';

afterEach(() => TestBed.resetTestingModule());

it('abre la asignación enlazada, muestra sus 30 alumnos y descarta respuestas de la sección anterior', () => {
  const asignaciones = [53, 54, 55].map(seccionId => ({
    id: seccionId, docenteUsuarioId: 9, seccionId, anioLectivoId: 1, nivelId: 3, areaCurricularId: 23
  }));
  const matrices = new Map(asignaciones.map(({ id }) => [id, new Subject<FilaCalificacionResponseDto[]>()]));
  TestBed.configureTestingModule({providers: [
    {provide: ActivatedRoute, useValue: {snapshot: {queryParamMap: convertToParamMap({asignacion: '54'})}}},
    {provide: AcademicoService, useValue: {
      listarAsignaciones: () => of(asignaciones),
      listarAreas: () => of([{id: 23, nombre: 'Matemática'}]),
      listarCompetencias: () => of([{id: 1}]),
      listarPeriodos: () => of([{id: 1}])
    }},
    {provide: EvaluacionService, useValue: {
      listarMatriz: (id: number) => matrices.get(id)!,
      listarCalificaciones: () => of([])
    }},
    {provide: HorarioService, useValue: {catalogo: () => of([])}},
    {provide: AuthStore, useValue: {hasRole: (rol: string) => rol === 'DOCENTE'}}
  ]});

  const componente = TestBed.runInInjectionContext(() => new CalificacionesComponent());
  componente.ngOnInit();
  expect(componente.asignacionId).toBe(54);

  const completarMatriz = (seccion: number) => {
    const matriz = matrices.get(seccion)!;
    matriz.next(Array.from({length: 30}, (_, i) => ({
      matriculaId: seccion * 100 + i,
      nombreEstudiante: `Alumno ${i + 1} de la sección ${seccion}`,
      competenciaId: 1,
      calificacionCualitativa: null,
      conclusionDescriptiva: null,
      requiereRefuerzo: false
    })));
    matriz.complete();
  };

  componente.asignacionId = 55;
  componente.cambiarAsignacion();
  completarMatriz(55);
  completarMatriz(54);
  expect(componente.alumnos()).toHaveLength(30);
  expect(componente.alumnos().every(alumno => Math.floor(alumno.matriculaId / 100) === 55)).toBe(true);
});

it('separa y filtra en cascada los selectores Año, Periodo, Grado, Sección y Competencia', () => {
  const asignaciones = [
    { id: 101, docenteUsuarioId: 9, seccionId: 11, anioLectivoId: 1, nivelId: 2, areaCurricularId: 20 },
    { id: 102, docenteUsuarioId: 9, seccionId: 12, anioLectivoId: 1, nivelId: 2, areaCurricularId: 21 },
    { id: 201, docenteUsuarioId: 9, seccionId: 21, anioLectivoId: 2, nivelId: 3, areaCurricularId: 30 }
  ];
  const catalogo = [
    {
      asignacionId: 101, anioLectivoId: 1, anio: 2026, seccionId: 11, nivelId: 2, gradoId: 4,
      nivel: 'Primaria', grado: '4° Primaria', letra: 'A', areaId: 20, areaNombre: 'Matemática',
      docenteUsuarioId: 9, docenteNombre: 'Docente Demo', aulaCodigo: 'P-401'
    },
    {
      asignacionId: 102, anioLectivoId: 1, anio: 2026, seccionId: 12, nivelId: 2, gradoId: 5,
      nivel: 'Primaria', grado: '5° Primaria', letra: 'B', areaId: 21, areaNombre: 'Comunicación',
      docenteUsuarioId: 9, docenteNombre: 'Docente Demo', aulaCodigo: 'P-502'
    },
    {
      asignacionId: 201, anioLectivoId: 2, anio: 2027, seccionId: 21, nivelId: 3, gradoId: 7,
      nivel: 'Secundaria', grado: '1° Secundaria', letra: 'A', areaId: 30, areaNombre: 'Ciencia y Tecnología',
      docenteUsuarioId: 9, docenteNombre: 'Docente Demo', aulaCodigo: 'S-101'
    }
  ];

  TestBed.configureTestingModule({
    providers: [
      { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({}) } } },
      {
        provide: AcademicoService,
        useValue: {
          listarAsignaciones: () => of(asignaciones),
          listarAreas: () => of([{ id: 20, nombre: 'Matemática' }, { id: 21, nombre: 'Comunicación' }, { id: 30, nombre: 'Ciencia y Tecnología' }]),
          listarCompetencias: (areaId: number) => of([{ id: areaId * 10, areaId, numeroOrden: 1, nombre: `Comp ${areaId}`, descripcion: '' }]),
          listarPeriodos: (anioId: number) => of([{ id: anioId * 100, anioLectivoId: anioId, numeroPeriodo: 1, nombre: `I Bimestre ${anioId === 1 ? '2026' : '2027'}`, fechaInicio: '2026-03-01', fechaFin: '2026-05-15', cerrado: false }])
        }
      },
      {
        provide: EvaluacionService,
        useValue: {
          listarMatriz: () => of([]),
          listarCalificaciones: () => of([])
        }
      },
      { provide: HorarioService, useValue: { catalogo: () => of(catalogo) } },
      { provide: AuthStore, useValue: { hasRole: (rol: string) => rol === 'DOCENTE' } }
    ]
  });

  const componente = TestBed.runInInjectionContext(() => new CalificacionesComponent());
  componente.ngOnInit();

  expect(componente.anioFiltroId()).toBe(1);
  expect(componente.gradoFiltroKey()).toBe('2:4');
  expect(componente.asignacionId).toBe(101);
  expect(componente.aniosDisponibles().map(a => a.label)).toEqual(['2027', '2026']);
  expect(componente.gradosDisponibles().map(g => g.key)).toEqual(['2:4', '2:5']);
  expect(componente.seccionesDisponibles().map(s => s.id)).toEqual([101]);

  componente.seleccionarGrado('2:5');
  expect(componente.gradoFiltroKey()).toBe('2:5');
  expect(componente.seccionesDisponibles().map(s => s.id)).toEqual([102]);
  expect(componente.asignacionId).toBe(102);
  expect(componente.competenciaId).toBe(210);

  componente.seleccionarAnio(2);
  expect(componente.anioFiltroId()).toBe(2);
  expect(componente.gradosDisponibles().map(g => g.key)).toEqual(['3:7']);
  expect(componente.gradoFiltroKey()).toBe('3:7');
  expect(componente.seccionesDisponibles().map(s => s.id)).toEqual([201]);
  expect(componente.asignacionId).toBe(201);
  expect(componente.periodoId).toBe(200);
  expect(componente.competenciaId).toBe(300);
});
