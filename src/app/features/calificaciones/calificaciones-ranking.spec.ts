import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AsignacionDocenteResponseDto } from '../../core/models/academico.model';
import { CuadroHonorResponseDto } from '../../core/models/evaluacion.model';
import { AcademicoService } from '../../core/services/academico.service';
import { EvaluacionService } from '../../core/services/evaluacion.service';
import { AuthStore } from '../../core/state/auth.store';
import { CalificacionesComponent } from './calificaciones.component';

const cuadro: CuadroHonorResponseDto = {
  anioLectivoId: 1,
  gradoId: 1,
  seccionId: 17,
  nivelNombre: 'Primaria',
  gradoNombre: '1.º',
  seccionLetra: 'A',
  disclaimer: 'Puntaje interno de referencia; no representa una escala oficial ni otorga beneficios institucionales.',
  estudiantes: [{
    puesto: 1,
    matriculaId: 900,
    nombreCompleto: 'Alumno QA',
    puntajePromedioInterno: 3.25,
    porcentajeAsistencia: 82,
    totalIncidencias: 2,
    cantAd: 1,
    cantA: 2,
    cantB: 0,
    cantC: 0,
    mencionHonor: 'Puesto 1',
    beneficioInstitucional: null
  }]
};

afterEach(() => TestBed.resetTestingModule());

describe('Ranking por sección', () => {
  it('consulta la sección seleccionada y usa puntaje, asistencia e incidencias devueltos por backend', () => {
    const evaluacion = {consultarRankingSeccion: vi.fn(() => of(cuadro))};
    TestBed.configureTestingModule({providers: [
      {provide: EvaluacionService, useValue: evaluacion},
      {provide: AcademicoService, useValue: {}},
      {provide: AuthStore, useValue: {hasRole: () => false}}
    ]});
    const component = TestBed.runInInjectionContext(() => new CalificacionesComponent());
    const asignacion: AsignacionDocenteResponseDto = {
      id: 8, docenteUsuarioId: 7, seccionId: 17, anioLectivoId: 1, nivelId: 1, areaCurricularId: 2
    };
    component.asignaciones.set([asignacion]);
    component.asignacionId = asignacion.id;

    component.abrirRanking();

    expect(evaluacion.consultarRankingSeccion).toHaveBeenCalledWith(17);
    expect(component.rankingAlumnos()[0].puntajePromedioInterno).toBe(3.25);
    expect(component.rankingAlumnos()[0].porcentajeAsistencia).toBe(82);
    expect(component.rankingAlumnos()[0].totalIncidencias).toBe(2);
    expect(component.rankingDisclaimer()).toContain('no representa una escala oficial');
    expect(component.rankingAlumnos()[0].beneficioInstitucional).toBeNull();
  });

  it('calcula condición de Alumno Destacado cuando predominan AD/A sin notas C', () => {
    const evaluacion = {
      consultarLibreta: vi.fn(() => of({
        matriculaId: 900,
        calificaciones: [
          { id: 1, matriculaId: 900, calificacionCualitativa: 'AD', competenciaId: 10, areaCurricularId: 2 },
          { id: 2, matriculaId: 900, calificacionCualitativa: 'A', competenciaId: 11, areaCurricularId: 2 },
          { id: 3, matriculaId: 900, calificacionCualitativa: 'A', competenciaId: 12, areaCurricularId: 2 }
        ]
      }))
    };
    TestBed.configureTestingModule({ providers: [
      { provide: EvaluacionService, useValue: evaluacion },
      { provide: AcademicoService, useValue: {} },
      { provide: AuthStore, useValue: { hasRole: () => true } }
    ] });
    const component = TestBed.runInInjectionContext(() => new CalificacionesComponent());
    component.alumnoMetricas.set({
      matriculaId: 900, numeroOrden: 1, estudiante: 'Alumno Destacado QA', c1: 'AD', c2: '-', c3: '-',
      conclusionDescriptiva: 'Excelente', requiereRefuerzo: false, competenciaId: 10
    });
    component.libretaCalificaciones.set([
      { id: 1, matriculaId: 900, anioLectivoId: 1, seccionId: 1, periodoAcademicoId: 1, calificacionCualitativa: 'AD', competenciaId: 10 },
      { id: 2, matriculaId: 900, anioLectivoId: 1, seccionId: 1, periodoAcademicoId: 1, calificacionCualitativa: 'A', competenciaId: 11 }
    ]);

    expect(component.esAlumnoDestacado()).toBe(true);
    expect(component.tieneProblemas()).toBe(false);
    expect(component.cantAdMetrica()).toBe(1);
    expect(component.cantAMetrica()).toBe(1);
    expect(component.cantCMetrica()).toBe(0);
  });

  it('detecta Alumno en Riesgo con dificultades cuando tiene al menos una nota C', () => {
    TestBed.configureTestingModule({ providers: [
      { provide: EvaluacionService, useValue: {} },
      { provide: AcademicoService, useValue: {} },
      { provide: AuthStore, useValue: { hasRole: () => true } }
    ] });
    const component = TestBed.runInInjectionContext(() => new CalificacionesComponent());
    component.competencias.set([{ id: 15, areaId: 5, numeroOrden: 1, nombre: 'Resuelve problemas de cantidad', descripcion: 'D1' }]);
    component.areas.set([{ id: 5, nombre: 'Matemática' }]);
    component.alumnoMetricas.set({
      matriculaId: 901, numeroOrden: 2, estudiante: 'Alumno con Dificultad QA', c1: 'C', c2: '-', c3: '-',
      conclusionDescriptiva: 'Requiere refuerzo', requiereRefuerzo: true, competenciaId: 15
    });
    component.libretaCalificaciones.set([
      { id: 4, matriculaId: 901, anioLectivoId: 1, seccionId: 1, periodoAcademicoId: 1, calificacionCualitativa: 'C', competenciaId: 15, areaCurricularId: 5 }
    ]);

    expect(component.tieneProblemas()).toBe(true);
    expect(component.esAlumnoDestacado()).toBe(false);
    expect(component.cantCMetrica()).toBe(1);
    expect(component.cursosOCompetenciasConDificultad()).toEqual(['Matemática (Resuelve problemas de cantidad)']);
  });

});