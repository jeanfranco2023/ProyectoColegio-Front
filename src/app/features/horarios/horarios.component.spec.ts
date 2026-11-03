import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { AcademicoService } from '../../core/services/academico.service';
import { HorarioService } from '../../core/services/horario.service';
import { AuthStore } from '../../core/state/auth.store';
import { HorariosComponent } from './horarios.component';

describe('Cambio de grado de la malla', () => {
  it('consulta el grado y los cursos del nivel seleccionado después de cambiar el filtro', () => {
    const horario = { obtenerPorGrado: vi.fn(() => of([])) };
    const academico = { listarAreas: vi.fn((nivel: number) => of([
      { id: nivel * 10, nombre: nivel === 1 ? 'Psicomotricidad' : 'Matemática' }
    ])) };
    TestBed.configureTestingModule({ providers: [
      { provide: HorarioService, useValue: horario },
      { provide: AcademicoService, useValue: academico },
      { provide: AuthStore, useValue: { hasRole: () => true } }
    ] });
    const component = TestBed.runInInjectionContext(() => new HorariosComponent());
    component.opcionesDireccion.set([
      { clave: '2/3', anioLectivoId: 2, anio: 2027, nivelId: 1, nivel: 'Inicial', gradoId: 3, grado: '5 años' },
      { clave: '2/4', anioLectivoId: 2, anio: 2027, nivelId: 2, nivel: 'Primaria', gradoId: 4, grado: '1°' }
    ]);
    component.seleccionarGrado('2/3');
    expect(component.gradoActual()?.gradoId).toBe(3);
    component.seleccionarGrado('2/4');
    expect(component.gradoActual()?.gradoId).toBe(4);
    expect(academico.listarAreas).toHaveBeenLastCalledWith(2);
    expect(horario.obtenerPorGrado).toHaveBeenLastCalledWith(4, 2);
    expect(component.areasDelGrado()[0].nombre).toBe('Matemática');
    component.seleccionarGrado('');
    expect(component.gradoActual()).toBeNull();
    expect(component.horarios()).toEqual([]);
  });
});
