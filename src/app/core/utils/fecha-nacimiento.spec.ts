import { describe, expect, it } from 'vitest';
import { edadAlCorteMatricula, fechaActualEnPeru, fechaNacimientoValida } from './fecha-nacimiento';

describe('validación de fecha de nacimiento', () => {
  const antesDelCorteDeMedianocheEnLima = new Date('2026-10-20T04:30:00.000Z');

  it('usa la fecha de Perú aunque UTC ya haya cambiado de día', () => {
    expect(fechaActualEnPeru(antesDelCorteDeMedianocheEnLima)).toBe('2026-10-19');
    expect(fechaNacimientoValida('2026-10-19', antesDelCorteDeMedianocheEnLima)).toBe(false);
    expect(fechaNacimientoValida('2026-10-18', antesDelCorteDeMedianocheEnLima)).toBe(true);
  });

  it('rechaza hoy, fechas futuras y fechas imposibles', () => {
    expect(fechaNacimientoValida('2026-10-19', antesDelCorteDeMedianocheEnLima)).toBe(false);
    expect(fechaNacimientoValida('2026-10-20', antesDelCorteDeMedianocheEnLima)).toBe(false);
    expect(fechaNacimientoValida('2026-02-30', antesDelCorteDeMedianocheEnLima)).toBe(false);
  });

  it('calcula el corte de marzo usando el año lectivo, sin depender de la zona horaria del navegador', () => {
    expect(edadAlCorteMatricula('2020-03-31', 2026)).toBe(6);
    expect(edadAlCorteMatricula('2020-04-01', 2026)).toBe(5);
    expect(edadAlCorteMatricula('2020-04-01', 2027)).toBe(6);
    expect(edadAlCorteMatricula('2026-02-30', 2026)).toBeNull();
    expect(edadAlCorteMatricula('invalida', 2026)).toBeNull();
  });
});
