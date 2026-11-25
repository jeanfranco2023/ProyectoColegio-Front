import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { AcademicoService } from '../../core/services/academico.service';
import { HorarioService } from '../../core/services/horario.service';
import { AuthStore } from '../../core/state/auth.store';
import { AsignacionDocenteComponent } from './asignacion-docente.component';

describe('AsignacionDocenteComponent', () => {
  it('mantiene independientes las asignaciones por año lectivo y permite cambiar el docente', () => {
    const catalogoInicial = [
      {
        asignacionId: 10,
        anioLectivoId: 1,
        anio: 2026,
        nivelId: 2,
        nivel: 'Primaria',
        gradoId: 4,
        grado: '1° Primaria',
        seccionId: 100,
        letra: 'A',
        aulaCodigo: 'P101',
        areaId: 30,
        areaNombre: 'Matemática',
        docenteUsuarioId: 50,
        docenteNombre: 'Docente 2026'
      },
      {
        asignacionId: 20,
        anioLectivoId: 2,
        anio: 2027,
        nivelId: 2,
        nivel: 'Primaria',
        gradoId: 4,
        grado: '1° Primaria',
        seccionId: 200,
        letra: 'A',
        aulaCodigo: 'P101',
        areaId: 30,
        areaNombre: 'Matemática',
        docenteUsuarioId: 60,
        docenteNombre: 'Docente 2027'
      }
    ];

    const academico = {
      listarAnios: vi.fn(() => of([
        { id: 1, anio: 2026, abierto: true, fechaInicio: '2026-03-01', fechaFin: '2026-12-20' },
        { id: 2, anio: 2027, abierto: true, fechaInicio: '2027-03-01', fechaFin: '2027-12-20' }
      ])),
      listarNiveles: vi.fn(() => of([{ id: 2, codigo: 'PRIMARIA', nombre: 'Primaria' }])),
      listarGrados: vi.fn(() => of([{ id: 4, nivelId: 2, numeroGrado: 1, nombre: '1° Primaria' }])),
      listarSecciones: vi.fn((anioId: number) => of([
        { id: anioId === 1 ? 100 : 200, anioLectivoId: anioId, gradoId: 4, nivelId: 2, letra: 'A', cupoMaximo: 30, vacantesOcupadas: 10 }
      ])),
      listarAreas: vi.fn(() => of([{ id: 30, nombre: 'Matemática' }])),
      listarDocentes: vi.fn(() => of([
        { id: 50, username: 'doc2026', nombreCompleto: 'Docente 2026' },
        { id: 70, username: 'docNuevo', nombreCompleto: 'Nuevo Docente' }
      ])),
      reasignarDocente: vi.fn(() => of({
        id: 10, docenteUsuarioId: 70, seccionId: 100, anioLectivoId: 1, nivelId: 2, areaCurricularId: 30
      }))
    };
    const horariosService = {
      catalogo: vi.fn(() => of(catalogoInicial)),
      bloques: vi.fn(() => of([])),
      horariosPorSeccion: vi.fn(() => of({ horarios: [] }))
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AcademicoService, useValue: academico },
        { provide: HorarioService, useValue: horariosService },
        { provide: AuthStore, useValue: { hasAnyRole: () => true } }
      ]
    });

    const component = TestBed.runInInjectionContext(() => new AsignacionDocenteComponent());
    component.ngOnInit();

    expect(component.anioId()).toBe(1);
    expect(component.asignacionesEnSeccion().map(a => a.asignacionId)).toEqual([10]);

    component.cambiarAnio(2);
    expect(component.asignacionesEnSeccion().map(a => a.asignacionId)).toEqual([20]);

    component.cambiarAnio(1);
    component.abrirReasignacion(catalogoInicial[0]);
    component.nuevoDocenteId.set(70);
    component.confirmarReasignacion();

    expect(academico.reasignarDocente).toHaveBeenCalledWith(10, 70);
    expect(component.asignacionEditando()).toBeNull();
  });
});
