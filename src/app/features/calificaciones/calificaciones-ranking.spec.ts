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
});
