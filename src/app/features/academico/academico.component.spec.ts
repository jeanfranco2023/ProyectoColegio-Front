import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AcademicoComponent, AulaItem } from './academico.component';
import { AcademicoService } from '../../core/services/academico.service';
import { AuthStore } from '../../core/state/auth.store';
import { AulaResponseDto } from '../../core/models/academico.model';

describe('AcademicoComponent', () => {
  let mockAcademicoService: any;
  let mockAuthStore: any;

  const mockAulas: AulaResponseDto[] = [
    { id: 1, codigo: 'INI-1-A', nombre: 'Aula - Inicial 3 años - Sección A', ubicacion: 'Pabellón Inicial', capacidad: 30, activa: true },
    { id: 2, codigo: 'PRI-1-B', nombre: 'Aula - 1° de Primaria - Sección B', ubicacion: 'Pabellón Primaria', capacidad: 30, activa: true },
    { id: 3, codigo: 'SEC-5-A', nombre: 'Aula - 5° de Secundaria - Sección A', ubicacion: 'Pabellón Secundaria', capacidad: 30, activa: false },
  ];

  beforeEach(async () => {
    mockAcademicoService = {
      listarAulas: vi.fn(() => of(mockAulas)),
      listarNiveles: vi.fn(() => of([
        { id: 1, codigo: 'INICIAL', nombre: 'Inicial' },
        { id: 2, codigo: 'PRIMARIA', nombre: 'Primaria' },
        { id: 3, codigo: 'SECUNDARIA', nombre: 'Secundaria' },
      ])),
      listarGrados: vi.fn(() => of([])),
      listarAnios: vi.fn(() => of([{ id: 1, anio: 2026, abierto: true }])),
      listarSecciones: vi.fn(() => of([])),
      actualizarAula: vi.fn((id: number, payload: any) => of({ id, codigo: 'INI-1-A', ...payload, activa: true })),
      cambiarEstadoAula: vi.fn((id: number, activa: boolean) => of({ id, codigo: 'INI-1-A', nombre: '', ubicacion: '', capacidad: 30, activa }))
    };

    mockAuthStore = {
      hasRole: vi.fn((role: string) => role === 'DIRECCION' || role === 'ADMINISTRADOR')
    };

    await TestBed.configureTestingModule({
      imports: [AcademicoComponent],
      providers: [
        { provide: AcademicoService, useValue: mockAcademicoService },
        { provide: AuthStore, useValue: mockAuthStore }
      ]
    }).compileComponents();
  });

  it('inicializa y mapea correctamente grado, sección y estado para las aulas', () => {
    const fixture = TestBed.createComponent(AcademicoComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    const filas = comp.todasAulasFilas();
    expect(filas.length).toBe(3);
    expect(filas[0].grado).toBe('Inicial 3 años');
    expect(filas[0].seccion).toBe('A');
    expect(filas[1].grado).toBe('1° de Primaria');
    expect(filas[1].seccion).toBe('B');
    expect(filas[2].grado).toBe('5° de Secundaria');
    expect(filas[2].seccion).toBe('A');
  });

  it('aplica filtros de nivel, grado y sección correctamente', () => {
    const fixture = TestBed.createComponent(AcademicoComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    // Filtro por nivel SECUNDARIA
    comp.onNivelChange('SECUNDARIA');
    fixture.detectChanges();
    expect(comp.aulasFiltradas().length).toBe(1);
    expect(comp.aulasFiltradas()[0].codigo).toBe('SEC-5-A');

    // Filtro por sección B
    comp.onNivelChange('TODOS');
    comp.onSeccionChange('B');
    fixture.detectChanges();
    expect(comp.aulasFiltradas().length).toBe(1);
    expect(comp.aulasFiltradas()[0].codigo).toBe('PRI-1-B');
  });

  it('paginación fija a 10 registros por página', () => {
    const fixture = TestBed.createComponent(AcademicoComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    expect(comp.tamanoPagina()).toBe(10);
    expect(comp.totalPaginas()).toBe(1);
    expect(comp.aulasPaginadas().length).toBe(3);
  });
});
