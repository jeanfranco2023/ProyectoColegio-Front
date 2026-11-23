import { afterEach, describe, expect, it, vi } from 'vitest';
import { LoadingIndicatorService } from './loading-indicator.service';

describe('LoadingIndicatorService', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('muestra el panel de carga durante navegación y lo oculta suavemente al finalizar', () => {
    vi.useFakeTimers();
    const service = new LoadingIndicatorService();

    service.iniciarNavegacion('Matrículas');
    expect(service.mostrarPanelCarga()).toBe(true);
    expect(service.moduloDestino()).toBe('Matrículas');
    expect(service.activo()).toBe(true);

    service.incrementarPeticion();
    service.finalizarNavegacion();
    // Mientras haya petición GET activa en curso, mantiene el panel
    expect(service.mostrarPanelCarga()).toBe(true);

    service.decrementarPeticion();
    vi.advanceTimersByTime(300);
    expect(service.mostrarPanelCarga()).toBe(false);
    expect(service.activo()).toBe(false);
  });
});
