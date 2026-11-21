import { describe, it, expect } from 'vitest';
import { UiCalendarComponent } from './ui-calendar.component';

describe('UiCalendarComponent - Selector rápido de Año y Mes', () => {
  it('alterna a la vista de año y mes al invocar toggleViewMode', () => {
    const component = new UiCalendarComponent();
    expect(component.viewMode).toBe('days');

    component.toggleViewMode();
    expect(component.viewMode).toBe('year-month');

    component.toggleViewMode();
    expect(component.viewMode).toBe('days');
  });

  it('permite seleccionar un año histórico y respeta el rango de meses', () => {
    const component = new UiCalendarComponent();
    component.min = '2000-01-01';
    component.max = '2026-08-01';
    component.toggleViewMode();

    expect(component.availableYears).toContain(2005);
    expect(component.availableYears).not.toContain(2027);
    expect(component.isMonthOutsideBounds(2026, 8)).toBe(true);
    component.selectYear(2005);
    expect(component.selectedYear).toBe(2005);
  });

  it('acepta una fecha escrita, rechaza un día imposible y respeta los fines de semana', () => {
    const component = new UiCalendarComponent();
    component.disableWeekends = true;
    const campo = document.createElement('input');
    const editar = (valor: string) => {
      campo.value = valor;
      component.editManual({ target: campo } as unknown as Event);
      component.commitManual();
    };
    editar('09112026');
    expect(component.value).toBe('2026-11-09');
    expect(campo.value).toBe('09/11/2026');
    editar('31/02/2026');
    expect(component.value).toBe('');
    expect(component.manualError).toBe('Revisa la fecha.');
    editar('07/11/2026');
    expect(component.value).toBe('');
    expect(component.manualError).toBe('Elige un día de lunes a viernes.');
  });

  it('al seleccionar un mes actualiza la fecha visible y regresa a la vista de días', () => {
    const component = new UiCalendarComponent();
    component.toggleViewMode();
    component.selectYear(2010);
    component.selectMonth(2); // Marzo (índice 2)

    expect(component.selectedMonth).toBe(2);
    expect(component.viewMode).toBe('days');
    expect(component.monthLabel.toLowerCase()).toContain('2010');
  });
});
