import { Injectable, computed, signal } from '@angular/core';

/**
 * Coordina el indicador visual de transición entre paneles y la carga de consultas HTTP.
 */
@Injectable({ providedIn: 'root' })
export class LoadingIndicatorService {
  readonly navegando = signal(false);
  readonly peticionesActivas = signal(0);
  readonly moduloDestino = signal('Módulo institucional');
  readonly mostrarPanelCarga = signal(false);
  private readonly pildoraHabilitada = signal(false);

  readonly mostrarPildoraCarga = computed(
    () => !this.mostrarPanelCarga() && this.peticionesActivas() > 0 && this.pildoraHabilitada()
  );

  readonly activo = computed(
    () => this.navegando() || this.peticionesActivas() > 0 || this.mostrarPanelCarga()
  );

  private inicioNavegacionMs = 0;
  private timerCierrePanel: ReturnType<typeof setTimeout> | null = null;
  private timerSeguridad: ReturnType<typeof setTimeout> | null = null;
  private timerPildora: ReturnType<typeof setTimeout> | null = null;

  iniciarNavegacion(etiquetaModulo?: string): void {
    this.limpiarTimers();
    this.inicioNavegacionMs = Date.now();
    this.moduloDestino.set(etiquetaModulo?.trim() || 'Módulo institucional');
    this.navegando.set(true);
    this.mostrarPanelCarga.set(true);
    this.timerSeguridad = setTimeout(() => this.forzarCierre(), 7000);
  }

  finalizarNavegacion(): void {
    this.navegando.set(false);
    this.evaluarCierrePanel();
  }

  incrementarPeticion(): void {
    const siguiente = this.peticionesActivas() + 1;
    this.peticionesActivas.set(siguiente);
    if (siguiente === 1 && !this.mostrarPanelCarga()) {
      if (this.timerPildora) clearTimeout(this.timerPildora);
      this.timerPildora = setTimeout(() => {
        if (this.peticionesActivas() > 0 && !this.mostrarPanelCarga()) {
          this.pildoraHabilitada.set(true);
        }
      }, 320);
    }
  }

  decrementarPeticion(): void {
    const siguiente = Math.max(0, this.peticionesActivas() - 1);
    this.peticionesActivas.set(siguiente);
    if (siguiente === 0) {
      if (this.timerPildora) {
        clearTimeout(this.timerPildora);
        this.timerPildora = null;
      }
      this.pildoraHabilitada.set(false);
    }
    this.evaluarCierrePanel();
  }

  private evaluarCierrePanel(): void {
    if (this.navegando() || this.peticionesActivas() > 0 || !this.mostrarPanelCarga()) {
      return;
    }
    const transcurrido = Date.now() - this.inicioNavegacionMs;
    const restante = Math.max(0, 260 - transcurrido);
    if (this.timerCierrePanel) clearTimeout(this.timerCierrePanel);
    this.timerCierrePanel = setTimeout(() => {
      if (!this.navegando() && this.peticionesActivas() === 0) {
        this.mostrarPanelCarga.set(false);
        this.limpiarSeguridad();
      }
    }, restante);
  }

  private forzarCierre(): void {
    this.navegando.set(false);
    this.mostrarPanelCarga.set(false);
    this.pildoraHabilitada.set(false);
    this.limpiarTimers();
  }

  private limpiarSeguridad(): void {
    if (this.timerSeguridad) {
      clearTimeout(this.timerSeguridad);
      this.timerSeguridad = null;
    }
  }

  private limpiarTimers(): void {
    if (this.timerCierrePanel) {
      clearTimeout(this.timerCierrePanel);
      this.timerCierrePanel = null;
    }
    if (this.timerPildora) {
      clearTimeout(this.timerPildora);
      this.timerPildora = null;
    }
    this.limpiarSeguridad();
  }
}
