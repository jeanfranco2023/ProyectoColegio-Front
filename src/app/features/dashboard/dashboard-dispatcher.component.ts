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
    <div class="space-y-8 sm:space-y-10 min-w-0 text-[#172b4d] [&_:focus-visible]:outline-[3px] [&_:focus-visible]:outline-[#2864c5] [&_:focus-visible]:outline-offset-[3px]">
      <section class="relative min-w-0 overflow-hidden rounded-[28px] border-t-[3px] border-[#c49a58]/50 px-6 pt-3 pb-7 text-[#fff] bg-[radial-gradient(ellipse_at_86%_12%,rgb(80_117_173_/_24%),transparent_35%),linear-gradient(112deg,#142c4f_0%,#10213e_68%,#192e4d_100%)] shadow-[0_18px_50px_rgb(18_39_73_/_13%)] sm:px-9 sm:pb-9 xl:px-11 max-[639px]:rounded-[20px] max-[639px]:p-[22px]">
        <div class="pointer-events-none absolute -right-20 -top-32 h-96 w-96 rounded-full border border-white/[0.08]"></div>
        <div class="pointer-events-none absolute -right-4 -top-16 h-72 w-72 rounded-full border border-white/[0.08]"></div>
        <div class="pointer-events-none absolute -bottom-32 left-1/2 h-64 w-64 rounded-full bg-[#c49a58]/10 blur-3xl"></div>
        <div class="relative z-10 flex flex-col justify-between gap-7 md:flex-row md:items-end">
          <div class="max-w-2xl">
            <p class="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.07] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-blue-100">
              <span class="h-1.5 w-1.5 rounded-full bg-[#d9b16f]"></span>
              Año académico {{ anio() ?? '—' }}
            </p>
            <h1 class="text-3xl font-semibold leading-tight tracking-[-0.04em] text-[#fff] sm:text-4xl">
              Hola, {{ (store.user()?.username || 'equipo').split(' ')[0] }}
            </h1>
            <p class="mt-3 max-w-xl text-sm leading-6 text-blue-100/75">
              Este es el resumen de actividad de tu comunidad escolar. Los indicadores se actualizan desde el sistema institucional.
            </p>
          </div>
          <div class="grid grid-cols-1 gap-3 sm:flex sm:flex-wrap sm:items-center">
            @if (store.hasAnyRole(['DIRECCION', 'SECRETARIA'])) {
              <a mat-flat-button routerLink="/admin/matriculas" class="!flex !h-11 !min-h-11 !w-full !min-w-0 !max-w-full !shrink-0 !items-center !justify-center !gap-2 !rounded-xl !bg-[#d4ad70] !px-[18px] !text-[#182846] !text-sm !font-bold !leading-none !shadow-[0_10px_22px_rgb(0_0_0_/_12%)] !whitespace-nowrap sm:!w-max sm:!min-w-max [&_.mdc-button__label]:!w-max [&_.mdc-button__label]:!max-w-full [&_.mdc-button__label]:!whitespace-nowrap [&_svg]:!size-[18px] [&_svg]:!shrink-0 [&_svg]:!m-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 5v14m-7-7h14"/></svg>
                <span>Nueva matrícula</span>
              </a>
            }
          </div>
        </div>
      </section>

      <section aria-labelledby="resumen-title" [attr.aria-busy]="loading()">
        <div class="mb-4 flex items-end justify-between gap-4">
          <div>
            <p class="text-[11px] font-extrabold tracking-[0.16em] text-[#76551f] uppercase">Indicadores clave</p>
            <h2 id="resumen-title" class="mt-1 text-lg font-semibold text-slate-800">Resumen institucional</h2>
          </div>
          <span class="hidden text-[11px] text-[#59677a] sm:block">Cifras sincronizadas con la plataforma</span>
        </div>

        @if (loading()) {
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" role="status" aria-label="Cargando indicadores institucionales">
            @for (skeleton of [1, 2, 3, 4]; track skeleton) {
              <div class="min-h-[154px] overflow-hidden rounded-[20px] border border-[#e7ebf2] bg-[linear-gradient(100deg,#fff_25%,#f2f5fa_45%,#fff_65%)] [background-size:220%_100%] animate-[skeleton-shimmer_1.45s_ease-in-out_infinite]" aria-hidden="true"></div>
            }
          </div>
        } @else {
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <mat-card class="min-h-[154px] min-w-0 overflow-hidden !rounded-[20px] !border !border-[#e7ebf2] !bg-white !shadow-[0_5px_18px_rgb(23_43_77_/_4%)] transition-[transform,box-shadow] duration-[180ms] hover:-translate-y-0.5 hover:!shadow-[0_14px_32px_rgb(23_43_77_/_8%)]">
            <mat-card-content class="!p-5 sm:!p-6">
              <div class="flex items-start justify-between">
                <div class="grid size-[42px] place-items-center rounded-[14px] bg-[#eef4ff] text-[#3569bd] [&_svg]:size-5"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2m12-13a4 4 0 11-8 0 4 4 0 018 0zm6 13v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg></div>
                <span class="text-[11px] font-extrabold tracking-[0.12em] text-[#59677a]">MATRÍCULA</span>
              </div>
              <p class="mt-5 text-3xl font-semibold tracking-tight text-slate-900">{{ totalEstudiantes() !== null ? totalEstudiantes() : '—' }}</p>
              <p class="mt-1 text-xs !text-[11px] text-slate-500">Estudiantes registrados</p>
            </mat-card-content>
          </mat-card>

          <mat-card class="min-h-[154px] min-w-0 overflow-hidden !rounded-[20px] !border !border-[#e7ebf2] !bg-white !shadow-[0_5px_18px_rgb(23_43_77_/_4%)] transition-[transform,box-shadow] duration-[180ms] hover:-translate-y-0.5 hover:!shadow-[0_14px_32px_rgb(23_43_77_/_8%)]">
            <mat-card-content class="!p-5 sm:!p-6">
              <div class="flex items-start justify-between">
                <div class="grid size-[42px] place-items-center rounded-[14px] bg-[#eaf7f1] text-[#23815d] [&_svg]:size-5"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div>
                <span class="text-[11px] font-extrabold tracking-[0.12em] text-[#59677a]">HOY</span>
              </div>
              <p class="mt-5 text-3xl font-semibold tracking-tight text-slate-900">{{ asistenciaHoy() !== null ? (asistenciaHoy() + '%') : '—' }}</p>
              <p class="mt-1 text-xs !text-[11px] text-slate-500">Asistencia registrada</p>
            </mat-card-content>
          </mat-card>

          <mat-card class="min-h-[154px] min-w-0 overflow-hidden !rounded-[20px] !border !border-[#e7ebf2] !bg-white !shadow-[0_5px_18px_rgb(23_43_77_/_4%)] transition-[transform,box-shadow] duration-[180ms] hover:-translate-y-0.5 hover:!shadow-[0_14px_32px_rgb(23_43_77_/_8%)]">
            <mat-card-content class="!p-5 sm:!p-6">
              <div class="flex items-start justify-between">
                <div class="grid size-[42px] place-items-center rounded-[14px] bg-[#fbf3e7] text-[#a47737] [&_svg]:size-5"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" d="M12 8c-1.7 0-3 .9-3 2s1.3 2 3 2 3 .9 3 2-1.3 2-3 2m0-8c1.1 0 2.1.4 2.6 1M12 8V7m0 1v8m0 0v1m0-1c-1.1 0-2.1-.4-2.6-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div>
                <span class="text-[11px] font-extrabold tracking-[0.12em] text-[#59677a]">TESORERÍA</span>
              </div>
              <p class="mt-5 text-3xl font-semibold tracking-tight text-slate-900">{{ recaudacionMes() !== null ? ('S/ ' + (recaudacionMes() | number:'1.2-2')) : '—' }}</p>
              <p class="mt-1 text-xs !text-[11px] text-slate-500">Recaudación del mes</p>
            </mat-card-content>
          </mat-card>

          <mat-card class="min-h-[154px] min-w-0 overflow-hidden !rounded-[20px] !border !border-[#e7ebf2] !bg-white !shadow-[0_5px_18px_rgb(23_43_77_/_4%)] transition-[transform,box-shadow] duration-[180ms] hover:-translate-y-0.5 hover:!shadow-[0_14px_32px_rgb(23_43_77_/_8%)]">
            <mat-card-content class="!p-5 sm:!p-6">
              <div class="flex items-start justify-between">
                <div class="grid size-[42px] place-items-center rounded-[14px] bg-[#f2efff] text-[#6957b5] [&_svg]:size-5"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg></div>
                <span class="text-[11px] font-extrabold tracking-[0.12em] text-[#59677a]">ACOMPAÑAMIENTO</span>
              </div>
              <p class="mt-5 text-3xl font-semibold tracking-tight text-slate-900">{{ alumnosEnRiesgo() !== null ? alumnosEnRiesgo() : '—' }}</p>
              <p class="mt-1 text-xs !text-[11px] text-slate-500">Estudiantes que requieren refuerzo</p>
            </mat-card-content>
          </mat-card>
        </div>
        }
      </section>

      <section aria-labelledby="modulos-title">
        <div class="mb-4">
          <p class="text-[11px] font-extrabold tracking-[0.16em] text-[#76551f] uppercase">Accesos rápidos</p>
          <h2 id="modulos-title" class="mt-1 text-lg font-semibold text-slate-800">Continúa con tu trabajo</h2>
        </div>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
          <a routerLink="/admin/matriculas" class="flex min-h-[190px] flex-col items-start rounded-[20px] border border-[#e6ebf2] bg-white p-[22px] text-left no-underline shadow-[0_5px_18px_rgb(23_43_77_/_4%)] transition-[transform,border-color,box-shadow] duration-[180ms] hover:-translate-y-[3px] hover:border-[#cdd9eb] hover:shadow-[0_15px_34px_rgb(23_43_77_/_9%)] max-[639px]:min-h-[160px] group">
            <span class="grid size-11 place-items-center rounded-[15px] bg-[#eef4ff] text-[#3569bd] [&_svg]:size-[21px]"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" d="M8 5H6a2 2 0 00-2 2v13h14v-2M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5zm8 7h6m-3-3v6m-9-2h3m-3 4h6"/></svg></span>
            <span class="mt-5 block text-sm font-semibold text-slate-800">Matrículas y estudiantes</span>
            <span class="mt-2 block text-[11px] leading-5 text-slate-500">Expedientes, solicitudes y fichas únicas.</span>
            <span class="mt-auto flex w-full items-center justify-between pt-[18px] text-[11px] font-bold text-[#315fa8] [&_span]:transition-transform [&_span]:duration-[150ms] group-hover:[&_span]:translate-x-[3px]">Abrir módulo <span aria-hidden="true">→</span></span>
          </a>
          <a routerLink="/admin/calificaciones" class="flex min-h-[190px] flex-col items-start rounded-[20px] border border-[#e6ebf2] bg-white p-[22px] text-left no-underline shadow-[0_5px_18px_rgb(23_43_77_/_4%)] transition-[transform,border-color,box-shadow] duration-[180ms] hover:-translate-y-[3px] hover:border-[#cdd9eb] hover:shadow-[0_15px_34px_rgb(23_43_77_/_9%)] max-[639px]:min-h-[160px] group">
            <span class="grid size-11 place-items-center rounded-[15px] bg-[#eaf7f1] text-[#23815d] [&_svg]:size-[21px]"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" d="M8 4h8a2 2 0 012 2v15H6V6a2 2 0 012-2zm1 5h6m-6 4h6m-6 4h3"/></svg></span>
            <span class="mt-5 block text-sm font-semibold text-slate-800">Calificaciones CNEB</span>
            <span class="mt-2 block text-[11px] leading-5 text-slate-500">Registro y consulta del progreso académico.</span>
            <span class="mt-auto flex w-full items-center justify-between pt-[18px] text-[11px] font-bold text-[#315fa8] [&_span]:transition-transform [&_span]:duration-[150ms] group-hover:[&_span]:translate-x-[3px]">Abrir módulo <span aria-hidden="true">→</span></span>
          </a>
          <a routerLink="/admin/asistencia" class="flex min-h-[190px] flex-col items-start rounded-[20px] border border-[#e6ebf2] bg-white p-[22px] text-left no-underline shadow-[0_5px_18px_rgb(23_43_77_/_4%)] transition-[transform,border-color,box-shadow] duration-[180ms] hover:-translate-y-[3px] hover:border-[#cdd9eb] hover:shadow-[0_15px_34px_rgb(23_43_77_/_9%)] max-[639px]:min-h-[160px] group">
            <span class="grid size-11 place-items-center rounded-[15px] bg-[#fbf3e7] text-[#a47737] [&_svg]:size-[21px]"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke-width="1.7"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" d="M12 7v5l3 2"/></svg></span>
            <span class="mt-5 block text-sm font-semibold text-slate-800">Asistencia y biometría</span>
            <span class="mt-2 block text-[11px] leading-5 text-slate-500">Control diario e importación de marcas.</span>
            <span class="mt-auto flex w-full items-center justify-between pt-[18px] text-[11px] font-bold text-[#315fa8] [&_span]:transition-transform [&_span]:duration-[150ms] group-hover:[&_span]:translate-x-[3px]">Abrir módulo <span aria-hidden="true">→</span></span>
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
