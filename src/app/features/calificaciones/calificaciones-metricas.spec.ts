import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CalificacionesComponent, EvaluacionAlumno } from './calificaciones.component';
import { EvaluacionService } from '../../core/services/evaluacion.service';
import { AcademicoService } from '../../core/services/academico.service';
import { MatriculaService } from '../../core/services/matricula.service';
import { AuthStore } from '../../core/state/auth.store';
import { CalificacionResponseDto } from '../../core/models/evaluacion.model';

afterEach(() => TestBed.resetTestingModule());

describe('Métricas y Desempeño Individual del Estudiante', () => {
  const setup = () => {
    const evaluacion = {
      consultarLibreta: vi.fn(() => of({ matriculaId: 100, calificaciones: [] })),
      registrarCalificaciones: vi.fn(() => of({})),
      listarMatriz: vi.fn(() => of([])),
      listarCalificaciones: vi.fn(() => of([]))
    };
    const academico = {
      listarAsignaciones: vi.fn(() => of([])),
      listarAreas: vi.fn(() => of([])),
      listarCompetencias: vi.fn(() => of([])),
      listarPeriodos: vi.fn(() => of([]))
    };
    const matricula = {
      consultarFicha: vi.fn(() => of({
        matricula: { id: 100 },
        estudiante: { id: 50, numeroDocumento: '76543210', nombres: 'Carlos', apellidoPaterno: 'Mendoza', apellidoMaterno: 'Ríos', genero: 'M' }
      }))
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: EvaluacionService, useValue: evaluacion },
        { provide: AcademicoService, useValue: academico },
        { provide: MatriculaService, useValue: matricula },
        { provide: AuthStore, useValue: { hasRole: (r: string) => r === 'DOCENTE', hasAnyRole: () => true } }
      ]
    });
    const component = TestBed.runInInjectionContext(() => new CalificacionesComponent());
    return { component, evaluacion, matricula };
  };

  it('identifica a un Alumno Destacado cuando predominan AD y A sin notas C', () => {
    const { component } = setup();
    const notasDestacadas: CalificacionResponseDto[] = [
      { id: 1, matriculaId: 100, anioLectivoId: 1, seccionId: 1, periodoAcademicoId: 1, calificacionCualitativa: 'AD', competenciaId: 10 },
      { id: 2, matriculaId: 100, anioLectivoId: 1, seccionId: 1, periodoAcademicoId: 1, calificacionCualitativa: 'A', competenciaId: 11 },
      { id: 3, matriculaId: 100, anioLectivoId: 1, seccionId: 1, periodoAcademicoId: 1, calificacionCualitativa: 'AD', competenciaId: 12 }
    ];
    component.libretaCalificaciones.set(notasDestacadas);

    expect(component.esAlumnoDestacado()).toBe(true);
    expect(component.tieneProblemas()).toBe(false);
    expect(component.cantAdMetrica()).toBe(2);
    expect(component.cantAMetrica()).toBe(1);
    expect(component.cantCMetrica()).toBe(0);
  });

  it('identifica a un Alumno en Riesgo Académico y lista sus cursos con dificultad cuando tiene nota C', () => {
    const { component } = setup();
    component.areas.set([{ id: 1, nombre: 'Matemática' }, { id: 2, nombre: 'Comunicación' }]);
    component.competencias.set([
      { id: 10, areaId: 1, numeroOrden: 1, nombre: 'Resuelve problemas de cantidad', descripcion: '' },
      { id: 11, areaId: 2, numeroOrden: 1, nombre: 'Lee diversos tipos de textos', descripcion: '' }
    ]);
    const notasConC: CalificacionResponseDto[] = [
      { id: 1, matriculaId: 100, anioLectivoId: 1, seccionId: 1, periodoAcademicoId: 1, areaCurricularId: 1, calificacionCualitativa: 'C', competenciaId: 10, requiereRefuerzo: true },
      { id: 2, matriculaId: 100, anioLectivoId: 1, seccionId: 1, periodoAcademicoId: 1, areaCurricularId: 2, calificacionCualitativa: 'A', competenciaId: 11 }
    ];
    component.libretaCalificaciones.set(notasConC);

    expect(component.tieneProblemas()).toBe(true);
    expect(component.esAlumnoDestacado()).toBe(false);
    expect(component.cantCMetrica()).toBe(1);
    expect(component.cursosOCompetenciasConDificultad().length).toBe(1);
    expect(component.cursosOCompetenciasConDificultad()[0]).toContain('Matemática');
  });

  it('consulta ficha y libreta al abrir verMetricasAlumno', () => {
    const { component, evaluacion, matricula } = setup();
    const alumno: EvaluacionAlumno = {
      matriculaId: 100,
      numeroOrden: 1,
      estudiante: 'Carlos Mendoza',
      c1: 'A',
      c2: '-',
      c3: '-',
      conclusionDescriptiva: 'Buen desempeño',
      requiereRefuerzo: false,
      competenciaId: 10
    };

    component.verMetricasAlumno(alumno);

    expect(component.alumnoMetricas()).toBe(alumno);
    expect(matricula.consultarFicha).toHaveBeenCalledWith(100);
    expect(evaluacion.consultarLibreta).toHaveBeenCalledWith(100);
    expect(component.dniAlumnoMetricas()).toBe('76543210');
  });

  it('activa cambiosPendientes al aplicarEdicion y los limpia al guardar en BD', () => {
    const { component, evaluacion } = setup();
    const alumno: EvaluacionAlumno = {
      matriculaId: 100,
      numeroOrden: 1,
      estudiante: 'Carlos Mendoza',
      c1: 'B',
      c2: '-',
      c3: '-',
      conclusionDescriptiva: '',
      requiereRefuerzo: false,
      competenciaId: 10
    };
    component.alumnos.set([alumno]);
    component.asignacionId = 1;
    component.competenciaId = 10;
    component.periodoId = 1;

    // Abrir edicion y aplicar
    component.abrirEdicion(alumno);
    component.notaEditada = 'AD';
    component.conclusionEditada = 'Excelente autonomía';
    component.aplicarEdicion();

    expect(component.cambiosPendientes()).toBe(true);
    expect(component.alumnos()[0].c1).toBe('AD');

    // Guardar en BD
    component.guardarCalificaciones();
    expect(evaluacion.registrarCalificaciones).toHaveBeenCalled();
    expect(component.guardadoExitoso()).toBe(true);
    expect(component.cambiosPendientes()).toBe(false);
  });

  it('agrupa cursos con nota C sin duplicarlos y filtra metricas por bimestre activo', () => {
    const { component } = setup();
    component.areas.set([{ id: 1, nombre: 'Matemática' }, { id: 2, nombre: 'Comunicación' }]);
    component.competenciasCatalogo.set([
      { id: 101, areaId: 1, numeroOrden: 1, nombre: 'Resuelve problemas de cantidad', descripcion: '' },
      { id: 102, areaId: 1, numeroOrden: 2, nombre: 'Resuelve problemas de forma', descripcion: '' },
      { id: 201, areaId: 2, numeroOrden: 1, nombre: 'Lee diversos tipos de textos', descripcion: '' }
    ]);
    component.periodos.set([
      { id: 1, anioLectivoId: 1, numeroPeriodo: 1, nombre: 'I Bimestre', fechaInicio: '', fechaFin: '', cerrado: false },
      { id: 2, anioLectivoId: 1, numeroPeriodo: 2, nombre: 'II Bimestre', fechaInicio: '', fechaFin: '', cerrado: false }
    ]);
    component.periodoId = 1;

    component.libretaCalificaciones.set([
      { id: 1, matriculaId: 10, anioLectivoId: 1, seccionId: 1, periodoAcademicoId: 1, areaCurricularId: 1, competenciaId: 101, calificacionCualitativa: 'C', conclusionDescriptiva: 'Requiere refuerzo' },
      { id: 2, matriculaId: 10, anioLectivoId: 1, seccionId: 1, periodoAcademicoId: 1, areaCurricularId: 1, competenciaId: 102, calificacionCualitativa: 'C', conclusionDescriptiva: 'Requiere refuerzo' },
      { id: 3, matriculaId: 10, anioLectivoId: 1, seccionId: 1, periodoAcademicoId: 2, areaCurricularId: 1, competenciaId: 101, calificacionCualitativa: 'C', conclusionDescriptiva: 'Persiste dificultad' },
      { id: 4, matriculaId: 10, anioLectivoId: 1, seccionId: 1, periodoAcademicoId: 2, areaCurricularId: 2, competenciaId: 201, calificacionCualitativa: 'A', conclusionDescriptiva: 'Logrado' }
    ]);

    expect(component.notasEstudianteMetrica().length).toBe(2);
    expect(component.cursosOCompetenciasConDificultad().length).toBe(1);
    expect(component.cursosOCompetenciasConDificultad()[0]).toContain('Matemática');
    expect(component.cursosEnRiesgoDetalle().length).toBe(1);
    expect(component.cursosEnRiesgoDetalle()[0].competencias.length).toBe(2);

    component.cambiarAlcanceMetrica('ANIO_COMPLETO');
    expect(component.notasEstudianteMetrica().length).toBe(4);
    expect(component.cursosEnRiesgoDetalle().length).toBe(1);
    expect(component.cursosEnRiesgoDetalle()[0].competencias[0].periodos).toEqual(['I Bimestre', 'II Bimestre']);
  });

  it('abre el segundo modal de detalles de notas agrupando por curso y permitiendo cambiar de bimestre sin cerrar la ficha', () => {
    const { component } = setup();
    component.areas.set([{ id: 1, nombre: 'Matemática' }, { id: 2, nombre: 'Comunicación' }]);
    component.competenciasCatalogo.set([
      { id: 101, areaId: 1, numeroOrden: 1, nombre: 'Resuelve problemas de cantidad', descripcion: '' },
      { id: 201, areaId: 2, numeroOrden: 1, nombre: 'Lee diversos tipos de textos', descripcion: '' }
    ]);
    component.periodos.set([
      { id: 1, anioLectivoId: 1, numeroPeriodo: 1, nombre: 'I Bimestre', fechaInicio: '2026-03-01', fechaFin: '2026-05-08', cerrado: false },
      { id: 4, anioLectivoId: 1, numeroPeriodo: 4, nombre: 'IV Bimestre', fechaInicio: '2026-10-19', fechaFin: '2099-12-31', cerrado: false }
    ]);
    component.periodoId = 4;
    component.alumnoMetricas.set({
      matriculaId: 10,
      numeroOrden: 1,
      estudiante: 'Lucía Paredes',
      c1: 'AD',
      c2: '-',
      c3: '-',
      conclusionDescriptiva: '',
      requiereRefuerzo: false,
      competenciaId: 101
    });
    component.libretaCalificaciones.set([
      { id: 1, matriculaId: 10, anioLectivoId: 1, seccionId: 1, periodoAcademicoId: 1, areaCurricularId: 2, competenciaId: 201, calificacionCualitativa: 'B', conclusionDescriptiva: 'Comprensión en proceso' },
      { id: 2, matriculaId: 10, anioLectivoId: 1, seccionId: 1, periodoAcademicoId: 4, areaCurricularId: 1, competenciaId: 101, calificacionCualitativa: 'AD', conclusionDescriptiva: 'Logro destacado' }
    ]);

    component.abrirDetalleNotasModal();
    expect(component.mostrarDetalleNotasModal()).toBe(true);
    expect(component.alumnoMetricas()?.matriculaId).toBe(10);
    expect(component.bimestreDetalleMetricaId()).toBe(4);
    expect(component.cursosDetalleNotasMetrica().map(c => c.areaNombre)).toEqual(['Matemática']);

    component.seleccionarBimestreDetalleMetrica(1);
    expect(component.cursosDetalleNotasMetrica().map(c => c.areaNombre)).toEqual(['Comunicación']);

    component.cerrarDetalleNotasModal();
    expect(component.mostrarDetalleNotasModal()).toBe(false);
    expect(component.alumnoMetricas()?.matriculaId).toBe(10);
  });
});
