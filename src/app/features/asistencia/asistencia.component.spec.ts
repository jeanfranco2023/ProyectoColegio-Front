import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { AcademicoService } from '../../core/services/academico.service';
import { AsistenciaService } from '../../core/services/asistencia.service';
import { AuthStore } from '../../core/state/auth.store';
import { AsistenciaComponent } from './asistencia.component';

afterEach(() => TestBed.resetTestingModule());

describe('Filtros de asistencia', () => {
  it('actualiza la lista cuando cambian la búsqueda y el estado', () => {
    TestBed.configureTestingModule({ providers: [
      { provide: AsistenciaService, useValue: {} },
      { provide: AcademicoService, useValue: {} },
      { provide: AuthStore, useValue: { hasRole: vi.fn(() => false), hasAnyRole: vi.fn(() => false) } }
    ] });
    const component = TestBed.runInInjectionContext(() => new AsistenciaComponent());
    component.alumnos.set([
      { id: 1, estudiante: 'Ana QA', fecha: '2026-11-02', estado: 'PRESENTE' },
      { id: 2, estudiante: 'Benito QA', fecha: '2026-11-02', estado: 'TARDANZA' },
      { id: 3, estudiante: 'Ana del Mar QA', fecha: '2026-11-02', estado: 'TARDANZA' }
    ]);

    expect(component.alumnosFiltrados().map(alumno => alumno.id)).toEqual([1, 2, 3]);
    component.busquedaAsistencia.set('ana');
    expect(component.alumnosFiltrados().map(alumno => alumno.id)).toEqual([1, 3]);
    component.estadoFiltro.set('TARDANZA');
    expect(component.alumnosFiltrados().map(alumno => alumno.id)).toEqual([3]);
  });

  it('TUTOR carga su reporte y matrícula asignados sin pedir reporte diario ni alertas restringidas', () => {
    const asistencia = {
      obtenerMatriculasDocente: vi.fn(() => of([{matriculaId: 281, estudiante: 'Estudiante QA'}])),
      obtenerReporteDocente: vi.fn(() => of([{id: 10, matriculaId: 281, estudiante: 'Estudiante QA', fechaSesion: '2026-11-02', estado: 'PRESENTE'}])),
      obtenerReporteDiario: vi.fn(() => of({asistencias: []})),
      listarAlertasConciliacion: vi.fn(() => of([]))
    };
    const academico = {listarAnios: vi.fn(() => of([]))};
    TestBed.configureTestingModule({providers: [
      {provide: AsistenciaService, useValue: asistencia},
      {provide: AcademicoService, useValue: academico},
      {provide: AuthStore, useValue: {hasRole: (role: string) => role === 'TUTOR', hasAnyRole: (roles: string[]) => roles.includes('TUTOR')}}
    ]});
    const component = TestBed.runInInjectionContext(() => new AsistenciaComponent());

    component.ngOnInit();

    expect(asistencia.obtenerMatriculasDocente).toHaveBeenCalledOnce();
    expect(asistencia.obtenerReporteDocente).toHaveBeenCalledOnce();
    expect(asistencia.obtenerReporteDiario).not.toHaveBeenCalled();
    expect(asistencia.listarAlertasConciliacion).not.toHaveBeenCalled();
    expect(academico.listarAnios).not.toHaveBeenCalled();
    expect(component.matriculasDocente()).toEqual([{matriculaId: 281, estudiante: 'Estudiante QA'}]);
    expect(component.puedeConsultarAlertas()).toBe(false);
    expect(component.puedeRegistrar()).toBe(true);
    expect(component.puedeJustificar()).toBe(true);
    expect(component.puedeDescargarSustento()).toBe(false);
  });

  it('DIRECCION consulta reporte diario y alertas sin ver controles de conciliación', () => {
    const asistencia = {
      obtenerMatriculasDocente: vi.fn(() => of([])),
      obtenerReporteDocente: vi.fn(() => of([])),
      obtenerReporteDiario: vi.fn(() => of({asistencias: []})),
      listarAlertasConciliacion: vi.fn(() => of([]))
    };
    const academico = {listarAnios: vi.fn(() => of([]))};
    TestBed.configureTestingModule({providers: [
      {provide: AsistenciaService, useValue: asistencia},
      {provide: AcademicoService, useValue: academico},
      {provide: AuthStore, useValue: {hasRole: (role: string) => role === 'DIRECCION', hasAnyRole: (roles: string[]) => roles.includes('DIRECCION')}}
    ]});
    const component = TestBed.runInInjectionContext(() => new AsistenciaComponent());

    component.ngOnInit();

    expect(asistencia.obtenerReporteDiario).toHaveBeenCalledOnce();
    expect(asistencia.listarAlertasConciliacion).toHaveBeenCalledOnce();
    expect(asistencia.obtenerReporteDocente).not.toHaveBeenCalled();
    expect(academico.listarAnios).not.toHaveBeenCalled();
    expect(component.puedeConsultarAlertas()).toBe(true);
    expect(component.puedeGestionarBiometria()).toBe(false);
    expect(component.puedeRegistrar()).toBe(false);
    expect(component.puedeDescargarSustento()).toBe(true);
  });
});
