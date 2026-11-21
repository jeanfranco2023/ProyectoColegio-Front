import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { UiPaginacionComponent, clampPagina, paginarRegistros } from './ui-paginacion.component';

describe('UiPaginacionComponent', () => {
  it('pagina listas de 10 en 10 y ajusta índices fuera de rango', () => {
    const items = Array.from({ length: 25 }, (_, i) => i + 1);
    expect(paginarRegistros(items, 1, 10)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(paginarRegistros(items, 3, 10)).toEqual([21, 22, 23, 24, 25]);
    expect(paginarRegistros(items, 99, 10)).toEqual([21, 22, 23, 24, 25]);
    expect(clampPagina(0, 25, 10)).toBe(1);
    expect(clampPagina(10, 25, 10)).toBe(3);
  });

  it('oculta los controles cuando no hay registros', async () => {
    await TestBed.configureTestingModule({ imports: [UiPaginacionComponent] }).compileComponents();
    const fixture = TestBed.createComponent(UiPaginacionComponent);
    fixture.componentRef.setInput('totalRegistros', 0);
    fixture.componentRef.setInput('paginaActual', 1);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('nav')).toBeNull();
  });

  it('muestra ventana con elipsis cuando supera 7 páginas y emite la página seleccionada', async () => {
    await TestBed.configureTestingModule({ imports: [UiPaginacionComponent] }).compileComponents();
    const fixture = TestBed.createComponent(UiPaginacionComponent);
    const comp = fixture.componentInstance;
    fixture.componentRef.setInput('totalRegistros', 120);
    fixture.componentRef.setInput('paginaActual', 6);
    fixture.componentRef.setInput('tamanoPagina', 10);
    fixture.componentRef.setInput('etiqueta', 'estudiantes');
    fixture.detectChanges();

    const spy = vi.spyOn(comp.cambioPagina, 'emit');
    expect(comp.totalPaginas()).toBe(12);
    expect(comp.tokens()).toContain('ellipsis-left');
    expect(comp.tokens()).toContain('ellipsis-right');

    const botones = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    const siguiente = botones.find(b => b.textContent?.includes('Siguiente'));
    siguiente?.click();
    expect(spy).toHaveBeenCalledWith(7);
  });
});
