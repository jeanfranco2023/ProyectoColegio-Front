import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { AuthStore } from '../../core/state/auth.store';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface ResumenDashboard {
  anio: number;
  totalEstudiantes: number | null;
  asistenciaHoy: number | null;
  recaudacionMes: number | null;
  alumnosEnRiesgo: number | null;
}

@Component({
  selector: 'app-dashboard-dispatcher',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, MatCardModule],
template: `
    <div class="min-w-0 space-y-8 text-ui-text sm:space-y-10">
      <section class="relative isolate overflow-hidden border border-ui-border border-l-4 border-l-ui-accent bg-ui-surface-soft px-5 py-7 sm:px-8 sm:py-9 xl:px-10" aria-labelledby="welcome-title">
        <div class="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div class="max-w-2xl">
            <p class="mb-4 inline-flex min-h-8 items-center gap-2 border-b border-ui-divider pb-2 text-[11px] font-semibold uppercase tracking-[.14em] text-ui-muted">
              <span class="h-2 w-2 rounded-full bg-ui-accent" aria-hidden="true"></span>
              Año académico {{ anio() ?? '—' }}
            </p>
            <h1 id="welcome-title" class="m-0 font-display text-3xl font-medium leading-tight tracking-[-.03em] text-ui-text sm:text-4xl">
              Hola, {{ (store.user()?.username || 'equipo').split(' ')[0] }}
            </h1>
            <p class="mt-3 max-w-xl text-sm leading-6 text-ui-muted">
              Este es el resumen de actividad de tu comunidad escolar. Los indicadores se actualizan desde el sistema institucional.
            </p>
          </div>
          @if (store.hasAnyRole(['DIRECCION', 'SECRETARIA'])) {
            <a mat-flat-button routerLink="/admin/matriculas" class="!flex !h-11 !min-h-11 !w-full !min-w-0 !max-w-full !shrink-0 !items-center !justify-center !gap-2 !rounded-md !bg-ui-accent !px-[18px] !text-ui-accent-text !text-sm !font-semibold !leading-none !shadow-none !whitespace-nowrap focus-visible:!outline-2 focus-visible:!outline-offset-2 focus-visible:!outline-ui-focus sm:!w-max sm:!min-w-max [&_.mdc-button__label]:!w-max [&_.mdc-button__label]:!max-w-full [&_.mdc-button__label]:!whitespace-nowrap [&_svg]:!size-[18px] [&_svg]:!shrink-0 [&_svg]:!m-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 5v14m-7-7h14"/></svg>
              <span>Nueva matrícula</span>
            </a>
          }
        </div>
      </section>

      <section aria-labelledby="resumen-title" [attr.aria-busy]="loading()">
        <div class="mb-4 flex items-end justify-between gap-4">
          <div>
            <p class="m-0 text-[11px] font-semibold uppercase tracking-[.14em] text-ui-accent">Indicadores clave</p>
            <h2 id="resumen-title" class="mt-1 font-display text-xl font-medium text-ui-text">Resumen institucional</h2>
          </div>
          <span class="hidden text-[11px] text-ui-muted sm:block">Cifras sincronizadas con la plataforma</span>
        </div>

        @if (loading()) {
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" role="status" aria-label="Cargando indicadores institucionales">
            @for (skeleton of [1, 2, 3, 4]; track skeleton) {
              <div class="min-h-[150px] animate-pulse border border-ui-border bg-ui-surface-soft" aria-hidden="true"></div>
            }
          </div>
        } @else {
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <article class="min-h-[174px] min-w-0 border border-ui-border bg-ui-surface p-5 shadow-sm sm:p-6" [class.border-l-4]="alumnosEnRiesgo() !== null && alumnosEnRiesgo()! > 0" [class.border-l-ui-accent]="alumnosEnRiesgo() !== null && alumnosEnRiesgo()! > 0">
              <div class="flex items-start justify-between gap-4">
                <div class="flex items-center gap-3">
                  @if (alumnosEnRiesgo() !== null && alumnosEnRiesgo()! > 0) {
                    <svg class="h-6 w-6 shrink-0 text-ui-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" d="M12 9v4m0 4h.01M10.3 3.9 2.8 17a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3l-7.5-13.1a2 2 0 0 0-3.4 0Z"/></svg>
                  } @else {
                    <svg class="h-6 w-6 shrink-0 text-ui-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" d="M4 19h16M7 15l3-4 3 2 5-7"/></svg>
                  }
                  <span class="text-[11px] font-semibold uppercase tracking-[.12em] text-ui-muted">Acompañamiento</span>
                </div>
                @if (alumnosEnRiesgo() === null) {
                  <span class="inline-flex min-h-7 items-center border border-ui-divider bg-ui-surface-soft px-2 text-[10px] font-semibold text-ui-muted whitespace-nowrap">Sin datos todavía</span>
                } @else if (alumnosEnRiesgo()! > 0) {
                  <span class="inline-flex min-h-7 items-center border border-ui-accent/40 bg-ui-accent/10 px-2 text-[10px] font-semibold text-ui-accent">Requiere atención</span>
                } @else {
                  <span class="inline-flex min-h-7 items-center border border-ui-divider bg-ui-surface-soft px-2 text-[10px] font-semibold text-ui-muted">Sin casos</span>
                }
              </div>
              <div class="mt-5 flex items-end gap-4">
                <p class="m-0 font-display text-5xl font-medium leading-none tracking-tight text-ui-text">{{ alumnosEnRiesgo() !== null ? alumnosEnRiesgo() : '—' }}</p>
                @if (alumnosEnRiesgo() !== null) {
                  <p class="mb-1 max-w-[240px] text-xs leading-5 text-ui-muted">{{ alumnosEnRiesgo()! > 0 ? 'Estudiantes que requieren refuerzo' : 'No hay estudiantes que requieran refuerzo' }}</p>
                }
              </div>
            </article>

            <article class="min-h-[174px] min-w-0 border-t-2 border-ui-action bg-ui-surface p-5 sm:p-6">
              <span class="text-[11px] font-semibold uppercase tracking-[.12em] text-ui-muted">Matrícula</span>
              <p class="mb-1 mt-5 font-display text-3xl font-medium tracking-tight text-ui-text">{{ totalEstudiantes() !== null ? totalEstudiantes() : '—' }}</p>
              <p class="m-0 text-xs text-ui-muted">Estudiantes registrados</p>
            </article>

            <article class="min-h-[174px] min-w-0 border border-ui-border bg-ui-surface p-5 sm:p-6">
              <div class="flex items-center gap-2 text-ui-muted">
                <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke-width="1.7"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" d="M12 7v5l3 2"/></svg>
                <span class="text-[11px] font-semibold uppercase tracking-[.12em]">Hoy</span>
              </div>
              <p class="mb-1 mt-5 font-display text-3xl font-medium tracking-tight text-ui-text">{{ asistenciaHoy() !== null ? (asistenciaHoy() + '%') : '—' }}</p>
              <p class="m-0 text-xs text-ui-muted">Asistencia registrada</p>
            </article>

            <article class="min-h-[174px] min-w-0 border border-ui-border bg-ui-surface p-5 sm:p-6">
              <div class="flex items-center gap-2 text-ui-muted">
                <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" d="M12 3v18m6-15H9.5a3.5 3.5 0 1 0 0 7h5a3.5 3.5 0 1 1 0 7H6"/></svg>
                <span class="text-[11px] font-semibold uppercase tracking-[.12em]">Tesorería</span>
              </div>
              <p class="mb-1 mt-5 font-display text-3xl font-medium tracking-tight text-ui-text">{{ recaudacionMes() !== null ? ('S/ ' + (recaudacionMes() | number:'1.2-2')) : '—' }}</p>
              <p class="m-0 text-xs text-ui-muted">Recaudación del mes</p>
            </article>
          </div>
        }
      </section>

      <section aria-labelledby="modulos-title">
        <div class="mb-4">
          <p class="m-0 text-[11px] font-semibold uppercase tracking-[.14em] text-ui-accent">Accesos rápidos</p>
          <h2 id="modulos-title" class="mt-1 font-display text-xl font-medium text-ui-text">Continúa con tu trabajo</h2>
        </div>
        <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
          <a routerLink="/admin/matriculas" class="group flex min-h-[156px] flex-col border border-ui-divider bg-ui-surface p-5 text-left text-ui-text no-underline transition-colors hover:border-ui-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-focus sm:p-6">
            <svg class="h-6 w-6 text-ui-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" d="M7 3.8h7l4 4V20H7a2 2 0 0 1-2-2V5.8a2 2 0 0 1 2-2Zm7 0v4h4M8 12h7M8 16h7"/></svg>
            <span class="mt-4 text-sm font-semibold">Matrículas y estudiantes</span>
            <span class="mt-2 text-[11px] leading-5 text-ui-muted">Expedientes, solicitudes y fichas únicas.</span>
            <span class="mt-auto flex w-full items-center justify-between pt-4 text-[11px] font-semibold text-ui-action">Abrir módulo <span aria-hidden="true" class="transition-transform group-hover:translate-x-1">→</span></span>
          </a>
          <a routerLink="/admin/calificaciones" class="group flex min-h-[156px] flex-col border border-ui-divider bg-ui-surface p-5 text-left text-ui-text no-underline transition-colors hover:border-ui-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-focus sm:p-6">
            <svg class="h-6 w-6 text-ui-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" d="M7 3.8h7l4 4V20H7a2 2 0 0 1-2-2V5.8a2 2 0 0 1 2-2Zm7 0v4h4M8 12h7M8 16h7"/></svg>
            <span class="mt-4 text-sm font-semibold">Calificaciones CNEB</span>
            <span class="mt-2 text-[11px] leading-5 text-ui-muted">Registro y consulta del progreso académico.</span>
            <span class="mt-auto flex w-full items-center justify-between pt-4 text-[11px] font-semibold text-ui-action">Abrir módulo <span aria-hidden="true" class="transition-transform group-hover:translate-x-1">→</span></span>
          </a>
          <a routerLink="/admin/asistencia" class="group flex min-h-[156px] flex-col border border-ui-divider bg-ui-surface p-5 text-left text-ui-text no-underline transition-colors hover:border-ui-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-focus sm:p-6">
            <svg class="h-6 w-6 text-ui-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke-width="1.7"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" d="M12 7v5l3 2"/></svg>
            <span class="mt-4 text-sm font-semibold">Asistencia y biometría</span>
            <span class="mt-2 text-[11px] leading-5 text-ui-muted">Control diario e importación de marcas.</span>
            <span class="mt-auto flex w-full items-center justify-between pt-4 text-[11px] font-semibold text-ui-action">Abrir módulo <span aria-hidden="true" class="transition-transform group-hover:translate-x-1">→</span></span>
          </a>
        </div>
      </section>
    </div>
  `
})
export class DashboardDispatcherComponent implements OnInit {
  readonly store = inject(AuthStore);
  private readonly http = inject(HttpClient);
  readonly loading = signal(true);
  readonly anio = signal<number | null>(null);
  readonly totalEstudiantes = signal<number | null>(null);
  readonly asistenciaHoy = signal<number | null>(null);
  readonly recaudacionMes = signal<number | null>(null);
  readonly alumnosEnRiesgo = signal<number | null>(null);

  ngOnInit(): void {
    this.cargarDatosReales();
  }

  cargarDatosReales(): void {
    this.http.get<ResumenDashboard>(`${environment.apiUrl}/dashboard/resumen`).subscribe({
      next: res => {
        this.anio.set(res?.anio ?? new Date().getFullYear());
        this.totalEstudiantes.set(res?.totalEstudiantes ?? null);
        this.asistenciaHoy.set(res?.asistenciaHoy ?? null);
        this.recaudacionMes.set(res?.recaudacionMes ?? null);
        this.alumnosEnRiesgo.set(res?.alumnosEnRiesgo ?? null);
        this.loading.set(false);
      },
      error: () => {
        this.anio.set(null);
        this.totalEstudiantes.set(null);
        this.asistenciaHoy.set(null);
        this.recaudacionMes.set(null);
        this.alumnosEnRiesgo.set(null);
        this.loading.set(false);
      }
    });
  }
}
