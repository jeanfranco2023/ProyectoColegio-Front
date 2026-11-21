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
