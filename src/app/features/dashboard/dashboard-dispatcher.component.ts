import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { AuthStore } from '../../core/state/auth.store';
import { environment } from '../../../environments/environment';
import {
  AnioLectivoResponseDto,
  GradoResponseDto,
  NivelCodigo,
  NivelResponseDto,
  PeriodoResponseDto,
  SeccionResponseDto
} from '../../core/models/academico.model';
import { compararGradosPorSecuenciaInstitucional } from '../../core/utils/ordenamiento-grados';
import { UiPaginacionComponent, paginarRegistros } from '../../shared/ui/ui-paginacion.component';

export interface ResumenDashboard {
  anio: number;
  totalEstudiantes: number | null;
  asistenciaHoy: number | null;
  recaudacionMes: number | null;
  alumnosRiesgo: number | null;
}

export type NivelLogroConsolidado = 'AD' | 'A' | 'B' | 'C' | 'SIN_EVALUACION';

export interface EstudianteIndicadorItem {
  matriculaId: number;
  nombreCompleto: string;
  grado: string;
  nivelLogro: NivelLogroConsolidado;
}

export interface SeccionCupoItem {
  seccionId: number;
  nivel: string;
  gradoId: number;
  grado: string;
  seccion: string;
  aula: string;
  matriculados: number;
  cupoMaximo: number;
  vacantesDisponibles: number;
}

export interface IndicadoresDireccionDto {
  anio?: number;
  periodoNombre?: string;
  desempeno: {
    AD: number;
    A: number;
    B: number;
    C: number;
  };
  cobertura: {
    evaluados: number;
    matriculados: number;
    sinEvaluacion: number;
    porcentajeCobertura: number;
  };
  asistencia: {
    porcentajePeriodo: number | null;
    variacionPeriodoAnterior: number | null;
    tieneCortePrevio: boolean;
    presentes: number;
    tardanzas: number;
    inasistencias: number;
    faltasJustificadas: number;
    faltasInjustificadas: number;
  };
  seccionesCupos: SeccionCupoItem[];
  estudiantesDetalle: EstudianteIndicadorItem[];
}

interface IndicadoresBackend {
  desempeno: {
    destacados: number;
    logroEsperado: number;
    enProceso: number;
    requierenAcompanamiento: number;
    estudiantes: Array<{
      matriculaId: number;
      estudianteNombre: string;
      gradoSeccion: string;
      nivelLogro: NivelLogroConsolidado;
    }>;
  };
  cobertura: IndicadoresDireccionDto['cobertura'];
  asistenciaCupos: Omit<IndicadoresDireccionDto['asistencia'],
    'porcentajePeriodo' | 'tieneCortePrevio'> & {
    porcentajeAsistencia: number | null;
    secciones: Array<Pick<SeccionCupoItem,
      'seccionId' | 'nivel' | 'matriculados' | 'cupoMaximo' | 'vacantesDisponibles'> & {
      gradoNombre: string;
      seccionNombre: string;
    }>;
  };
}

export interface SegmentoDonaCneb {
  codigo: 'AD' | 'A' | 'B' | 'C';
  etiqueta: string;
  descripcion: string;
  cantidad: number;
  porcentaje: number;
  color: string;
  badgeClass: string;
  strokeDasharray: string;
  strokeDashoffset: number;
}

@Component({
  selector: 'app-dashboard-dispatcher',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatButtonModule, MatCardModule, UiPaginacionComponent],
  template: `
    <div class="min-w-0 space-y-6 text-ui-text sm:space-y-7">
      <!-- Cabecera ejecutiva diferenciada por rol -->
      <section class="school-dashboard-welcome relative isolate overflow-hidden rounded-2xl border border-ui-border bg-ui-surface px-5 py-5 shadow-2xs sm:px-7 sm:py-6" aria-labelledby="welcome-title">
        <div class="relative z-10 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div class="min-w-0 max-w-3xl">
            <div class="mb-2.5 flex flex-wrap items-center gap-2.5">
              <span class="inline-flex items-center gap-2 rounded-full border border-ui-divider bg-ui-surface-soft px-3 py-1 text-xs font-bold uppercase tracking-[.08em] text-ui-action">
                <span class="h-2 w-2 rounded-full bg-ui-action" aria-hidden="true"></span>
                Año académico {{ anio() ?? '—' }} · {{ etiquetaRolPrincipal() }}
              </span>
              @if (esDireccion() || esAdministrador() || esSecretaria()) {
                <span class="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                  <span class="h-1.5 w-1.5 rounded-full bg-emerald-600" aria-hidden="true"></span>
                  Datos sincronizados
                </span>
              }
            </div>
            <h1 id="welcome-title" class="m-0 font-display text-2xl font-semibold leading-tight tracking-[-.02em] text-ui-text sm:text-3xl">
              Panel Ejecutivo · {{ (store.user()?.nombreCompleto || store.user()?.username || 'Equipo').split(' ')[0] }}
            </h1>
            <p class="mt-1.5 mb-0 max-w-2xl text-sm leading-relaxed text-ui-muted">
              {{ subtituloRolPrincipal() }}
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2.5 shrink-0">
            @if (esDireccion() || esSecretaria()) {
              <a routerLink="/admin/refuerzos" class="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-ui-border bg-ui-surface-soft px-3.5 text-sm font-semibold text-ui-text no-underline transition hover:border-ui-action hover:text-ui-action">
                <span>Refuerzo académico</span>
              </a>
              <a mat-flat-button routerLink="/admin/matriculas" class="!flex !h-10 !min-h-10 !w-full !min-w-0 !max-w-full !shrink-0 !items-center !justify-center !gap-2 !rounded-lg !bg-ui-action !px-4 !text-ui-action-text !text-sm !font-semibold !leading-none !shadow-none !whitespace-nowrap focus-visible:!outline-2 focus-visible:!outline-offset-2 focus-visible:!outline-ui-focus sm:!w-max sm:!min-w-max">
                <span class="inline-flex items-center gap-2">
                  <svg class="!size-[18px] !shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 5v14m-7-7h14"/></svg>
                  <span>Nueva matrícula</span>
                </span>
              </a>
            }
            @if (esAdministrador()) {
              <a routerLink="/admin/solicitudes-cambio" class="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-ui-action px-4 text-sm font-semibold text-ui-action-text no-underline">
                <span>Atender solicitudes CH-xxx</span>
              </a>
            }
          </div>
        </div>
      </section>

      <!-- ========================================================= -->
      <!-- RESUMEN INSTITUCIONAL CLAVE (KPIS EJECUTIVOS)             -->
      <!-- ========================================================= -->
      @if (esDireccion() || esAdministrador() || esSecretaria()) {
      <section aria-labelledby="resumen-title" [attr.aria-busy]="loading()">
        <div class="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p class="m-0 text-xs font-bold uppercase tracking-[.12em] text-ui-action">Indicadores clave de gestión</p>
            <h2 id="resumen-title" class="mt-0.5 mb-0 font-display text-lg font-semibold text-ui-text">Resumen institucional</h2>
          </div>
          <span class="hidden text-xs text-ui-muted sm:inline-flex items-center gap-1.5">
            Corte institucional en tiempo real
          </span>
        </div>

        @if (loading()) {
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" role="status" aria-label="Cargando indicadores institucionales">
            @for (skeleton of [1, 2, 3, 4]; track skeleton) {
              <div class="min-h-[176px] animate-pulse rounded-xl border border-ui-border bg-ui-surface-soft" aria-hidden="true"></div>
            }
          </div>
        } @else {
          <div class="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <!-- KPI 1: Matrícula y Capacidad -->
            <article class="flex h-full min-h-[176px] min-w-0 flex-col justify-between rounded-xl border border-ui-border border-l-4 border-l-ui-action bg-ui-surface p-4.5 shadow-2xs transition hover:border-ui-action/60 hover:shadow-sm sm:p-5">
              <div>
                <div class="flex items-center justify-between gap-2">
                  <span class="text-xs font-bold uppercase tracking-[.1em] text-ui-muted">Matrícula</span>
                  <span class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 text-ui-action">
                    <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4" stroke-width="1.8"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  </span>
                </div>
                <div class="mt-2.5 flex items-baseline justify-between gap-2">
                  <p class="m-0 font-display text-3xl font-bold leading-none tracking-tight text-ui-text tabular-nums">
                    {{ totalEstudiantes() !== null ? totalEstudiantes() : '—' }}
                  </p>
                  @if (porcentajeOcupacionCupos() !== null) {
                    <span class="rounded-md bg-ui-surface-soft px-2 py-0.5 font-mono text-xs font-semibold text-ui-muted">
                      {{ porcentajeOcupacionCupos() }}% ocupación
                    </span>
                  }
                </div>
                <p class="mt-1.5 mb-0 text-sm leading-snug text-ui-muted">
                  Estudiantes registrados{{ totalVacantesDisponibles() > 0 ? (' · ' + totalVacantesDisponibles() + ' vac. libres') : '' }}
                </p>
                @if (porcentajeOcupacionCupos() !== null) {
                  <div class="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
                    <div class="h-full rounded-full bg-ui-action transition-all" [style.width.%]="porcentajeOcupacionCupos()"></div>
                  </div>
                }
              </div>
              <div class="mt-3.5 flex items-center justify-between gap-2 border-t border-ui-divider pt-2.5">
                <span class="inline-flex items-center rounded-full border border-ui-divider bg-ui-surface-soft px-2.5 py-0.5 text-xs font-semibold text-ui-action">Padrón {{ anio() ?? '—' }}</span>
                <a routerLink="/admin/matriculas" class="text-xs font-semibold text-ui-action no-underline hover:underline">Ver padrón →</a>
              </div>
            </article>

            <!-- KPI 2: Acompañamiento y Refuerzo -->
            <article
              class="flex h-full min-h-[176px] min-w-0 flex-col justify-between rounded-xl border border-ui-border border-l-4 bg-ui-surface p-4.5 shadow-2xs transition hover:border-ui-action/60 hover:shadow-sm sm:p-5"
              [class.border-l-amber-500]="alumnosEnRiesgo() !== null && alumnosEnRiesgo()! > 0"
              [class.border-l-emerald-600]="alumnosEnRiesgo() === 0"
              [class.border-l-slate-300]="alumnosEnRiesgo() === null">
              <div>
                <div class="flex items-center justify-between gap-2">
                  <span class="text-xs font-bold uppercase tracking-[.1em] text-ui-muted">Acompañamiento</span>
                  <span
                    class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border"
                    [class.border-amber-200]="alumnosEnRiesgo() !== null && alumnosEnRiesgo()! > 0"
                    [class.bg-amber-50]="alumnosEnRiesgo() !== null && alumnosEnRiesgo()! > 0"
                    [class.text-amber-700]="alumnosEnRiesgo() !== null && alumnosEnRiesgo()! > 0"
                    [class.border-ui-divider]="alumnosEnRiesgo() === null || alumnosEnRiesgo() === 0"
                    [class.bg-ui-surface-soft]="alumnosEnRiesgo() === null || alumnosEnRiesgo() === 0"
                    [class.text-ui-muted]="alumnosEnRiesgo() === null || alumnosEnRiesgo() === 0">
                    @if (alumnosEnRiesgo() !== null && alumnosEnRiesgo()! > 0) {
                      <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 9v4m0 4h.01M10.3 3.9 2.8 17a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3l-7.5-13.1a2 2 0 0 0-3.4 0Z"/></svg>
                    } @else {
                      <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M4 19h16M7 15l3-4 3 2 5-7"/></svg>
                    }
                  </span>
                </div>
                <div class="mt-2.5 flex items-baseline justify-between gap-2">
                  <p class="m-0 font-display text-3xl font-bold leading-none tracking-tight text-ui-text tabular-nums">
                    {{ alumnosEnRiesgo() !== null ? alumnosEnRiesgo() : '—' }}
                  </p>
                  @if (porcentajeRiesgoPadron() !== null) {
                    <span class="rounded-md bg-amber-50 px-2 py-0.5 font-mono text-xs font-semibold text-amber-800">
                      {{ porcentajeRiesgoPadron() }}% del total
                    </span>
                  }
                </div>
                <p class="mt-1.5 mb-0 text-sm leading-snug text-ui-muted">
                  {{ alumnosEnRiesgo() !== null ? (alumnosEnRiesgo()! > 0 ? 'Estudiantes que requieren refuerzo' : 'No hay estudiantes que requieran refuerzo') : 'Pendiente de evaluación CNEB' }}
                </p>
                @if (porcentajeRiesgoPadron() !== null) {
                  <div class="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
                    <div class="h-full rounded-full bg-amber-500 transition-all" [style.width.%]="porcentajeRiesgoPadron()"></div>
                  </div>
                }
              </div>
              <div class="mt-3.5 flex items-center justify-between gap-2 border-t border-ui-divider pt-2.5">
                @if (alumnosEnRiesgo() === null) {
                  <span class="inline-flex items-center rounded-full border border-ui-divider bg-ui-surface-soft px-2.5 py-0.5 text-xs font-semibold text-ui-muted">Sin datos</span>
                } @else if (alumnosEnRiesgo()! > 0) {
                  <span class="inline-flex items-center rounded-full border border-ui-warning-border bg-ui-warning-bg px-2.5 py-0.5 text-xs font-semibold text-ui-warning-text">Requiere atención</span>
                } @else {
                  <span class="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">Sin casos</span>
                }
                <a routerLink="/admin/refuerzos" class="text-xs font-semibold text-ui-action no-underline hover:underline">Refuerzos →</a>
              </div>
            </article>

            <!-- KPI 3: Asistencia Hoy + Periodo -->
            <article class="flex h-full min-h-[176px] min-w-0 flex-col justify-between rounded-xl border border-ui-border border-l-4 border-l-sky-600 bg-ui-surface p-4.5 shadow-2xs transition hover:border-ui-action/60 hover:shadow-sm sm:p-5">
              <div>
                <div class="flex items-center justify-between gap-2">
                  <span class="text-xs font-bold uppercase tracking-[.1em] text-ui-muted">Asistencia</span>
                  <span class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-sky-200 bg-sky-50 text-sky-700">
                    <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke-width="1.8"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 7v5l3 2"/></svg>
                  </span>
                </div>
                <div class="mt-2.5 flex items-baseline justify-between gap-2">
                  <p class="m-0 font-display text-3xl font-bold leading-none tracking-tight text-ui-text tabular-nums">
                    {{ asistenciaHoy() !== null ? (asistenciaHoy() + '%') : '—' }}
                  </p>
                  @if (indicadores().asistencia.porcentajePeriodo !== null) {
                    <span class="rounded-md bg-sky-50 px-2 py-0.5 font-mono text-xs font-semibold text-sky-800">
                      Periodo: {{ indicadores().asistencia.porcentajePeriodo }}%
                    </span>
                  }
                </div>
                <p class="mt-1.5 mb-0 text-sm leading-snug text-ui-muted">Asistencia registrada hoy</p>
                @if ((indicadores().asistencia.porcentajePeriodo ?? asistenciaHoy()) !== null) {
                  <div class="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
                    <div class="h-full rounded-full bg-sky-600 transition-all" [style.width.%]="indicadores().asistencia.porcentajePeriodo ?? asistenciaHoy() ?? 0"></div>
                  </div>
                }
              </div>
              <div class="mt-3.5 flex items-center justify-between gap-2 border-t border-ui-divider pt-2.5">
                <span class="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-800">Corte diario</span>
                <a routerLink="/admin/asistencia" class="text-xs font-semibold text-ui-action no-underline hover:underline">Control diario →</a>
              </div>
            </article>

            <!-- KPI 4: Tesorería -->
            <article class="flex h-full min-h-[176px] min-w-0 flex-col justify-between rounded-xl border border-ui-border border-l-4 border-l-emerald-600 bg-ui-surface p-4.5 shadow-2xs transition hover:border-ui-action/60 hover:shadow-sm sm:p-5">
              <div>
                <div class="flex items-center justify-between gap-2">
                  <span class="text-xs font-bold uppercase tracking-[.1em] text-ui-muted">Tesorería</span>
                  <span class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700">
                    <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 3v18m6-15H9.5a3.5 3.5 0 1 0 0 7h5a3.5 3.5 0 1 1 0 7H6"/></svg>
                  </span>
                </div>
                <div class="mt-2.5 flex items-baseline justify-between gap-2">
                  <p class="m-0 font-display text-3xl font-bold leading-none tracking-tight text-ui-text tabular-nums">
                    {{ recaudacionMes() !== null ? ('S/ ' + (recaudacionMes() | number:'1.2-2')) : '—' }}
                  </p>
                </div>
                <p class="mt-1.5 mb-0 text-sm leading-snug text-ui-muted">Recaudación acumulada del mes</p>
                <div class="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
                  <div class="h-full rounded-full bg-emerald-600 transition-all" [style.width.%]="(recaudacionMes() ?? 0) > 0 ? 100 : 12"></div>
                </div>
              </div>
              <div class="mt-3.5 flex items-center justify-between gap-2 border-t border-ui-divider pt-2.5">
                <span class="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">Mes vigente</span>
                <a routerLink="/admin/tesoreria" class="text-xs font-semibold text-ui-action no-underline hover:underline">Ver caja →</a>
              </div>
            </article>
          </div>
        }
      </section>

      }

      <!-- ========================================================= -->
      <!-- HITO 2: INICIOS OPERATIVOS DIFERENCIADOS POR ROL          -->
      <!-- ========================================================= -->

      <!-- 1. DIRECCIÓN: Bandeja ejecutiva compacta de decisiones pendientes -->
      @if (esDireccion()) {
        <section aria-labelledby="decisiones-direccion-title" class="space-y-3">
          <div class="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p class="m-0 text-xs font-bold uppercase tracking-[.12em] text-ui-action">Prioridad de gestión</p>
              <h2 id="decisiones-direccion-title" class="mt-0.5 mb-0 font-display text-lg font-semibold text-ui-text">Decisiones pendientes de Dirección</h2>
            </div>
            <span class="text-xs text-ui-muted">Aprobaciones de admisión, suplencias y trazabilidad administrativa</span>
          </div>

          <div class="grid grid-cols-1 gap-3.5 md:grid-cols-3">
            <a routerLink="/admin/solicitudes-matricula" class="group flex flex-col justify-between rounded-xl border border-ui-border border-l-4 border-l-ui-action bg-ui-surface px-4 py-4 text-ui-text no-underline shadow-2xs transition hover:border-ui-action hover:shadow-sm">
              <div>
                <div class="flex items-center justify-between gap-2">
                  <span class="text-xs font-bold uppercase tracking-[.1em] text-ui-action">Admisión</span>
                  <span class="rounded-full bg-ui-surface-soft px-2.5 py-0.5 font-mono text-xs font-bold text-ui-text">
                    {{ solicitudesPendientesCount() !== null ? (solicitudesPendientesCount() + ' por revisar') : 'Bandeja activa' }}
                  </span>
                </div>
                <h3 class="mt-2 mb-0 text-base font-bold text-ui-text group-hover:text-ui-action transition-colors">Solicitudes de matrícula por revisar</h3>
                <p class="mt-1 mb-0 text-xs leading-5 text-ui-muted">Documentos adjuntos, excepciones de edad y asignación de sección.</p>
              </div>
              <span class="mt-3 inline-flex items-center justify-between border-t border-ui-divider pt-2.5 text-xs font-semibold text-ui-action">
                Ir a solicitudes de matrícula <span aria-hidden="true" class="transition-transform group-hover:translate-x-1">→</span>
              </span>
            </a>

            <a routerLink="/admin/aprobacion-suplencias" class="group flex flex-col justify-between rounded-xl border border-ui-border border-l-4 border-l-amber-500 bg-ui-surface px-4 py-4 text-ui-text no-underline shadow-2xs transition hover:border-ui-action hover:shadow-sm">
              <div>
                <div class="flex items-center justify-between gap-2">
                  <span class="text-xs font-bold uppercase tracking-[.1em] text-amber-800">Autorización familiar</span>
                  <span class="rounded-full bg-amber-50 px-2.5 py-0.5 font-mono text-xs font-bold text-amber-900">
                    {{ suplenciasPendientesCount() !== null ? (suplenciasPendientesCount() + ' pendientes') : 'En bandeja' }}
                  </span>
                </div>
                <h3 class="mt-2 mb-0 text-base font-bold text-ui-text group-hover:text-ui-action transition-colors">Suplencias pendientes</h3>
                <p class="mt-1 mb-0 text-xs leading-5 text-ui-muted">Autorizaciones temporales de recojo escolar pendientes de decisión.</p>
              </div>
              <span class="mt-3 inline-flex items-center justify-between border-t border-ui-divider pt-2.5 text-xs font-semibold text-ui-action">
                Revisar suplencias <span aria-hidden="true" class="transition-transform group-hover:translate-x-1">→</span>
              </span>
            </a>

            <a routerLink="/admin/solicitudes-cambio" class="group flex flex-col justify-between rounded-xl border border-ui-border border-l-4 border-l-slate-400 bg-ui-surface px-4 py-4 text-ui-text no-underline shadow-2xs transition hover:border-ui-action hover:shadow-sm">
              <div>
                <div class="flex items-center justify-between gap-2">
                  <span class="text-xs font-bold uppercase tracking-[.1em] text-ui-muted">Trazabilidad</span>
                  <span class="rounded-full bg-ui-surface-soft px-2.5 py-0.5 font-mono text-xs font-bold text-ui-text">CH-xxx</span>
                </div>
                <h3 class="mt-2 mb-0 text-base font-bold text-ui-text group-hover:text-ui-action transition-colors">Mis solicitudes de cambio</h3>
                <p class="mt-1 mb-0 text-xs leading-5 text-ui-muted">Seguimiento a requerimientos formales enviados al Administrador.</p>
              </div>
              <span class="mt-3 inline-flex items-center justify-between border-t border-ui-divider pt-2.5 text-xs font-semibold text-ui-action">
                Abrir solicitudes de cambio <span aria-hidden="true" class="transition-transform group-hover:translate-x-1">→</span>
              </span>
            </a>
          </div>
        </section>
      }

      <!-- 2. ADMINISTRADOR: Inicio operativo con Solicitudes de cambio (CH-xxx), Auditoría y Usuarios -->
      @if (esAdministrador()) {
        <section aria-labelledby="inicio-admin-title" class="space-y-4">
          <div class="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p class="m-0 text-[11px] font-semibold uppercase tracking-[.14em] text-ui-action">Gobierno y control técnico</p>
              <h2 id="inicio-admin-title" class="mt-1 font-display text-xl font-semibold text-ui-text">Operación del Administrador</h2>
            </div>
            <span class="text-xs text-ui-muted">Control de solicitudes CH-xxx, bitácora de auditoría y cuentas</span>
          </div>

          <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
            <a routerLink="/admin/solicitudes-cambio" class="group flex flex-col justify-between rounded-xl border border-ui-border border-l-4 border-l-ui-action bg-ui-surface p-5 text-ui-text no-underline shadow-2xs transition hover:border-ui-action">
              <div>
                <span class="text-[11px] font-bold uppercase tracking-[.12em] text-ui-action">Bandeja CH-xxx</span>
                <h3 class="mt-2 text-base font-bold text-ui-text">Solicitudes de cambio (CH-xxx)</h3>
                <p class="mt-1 text-xs leading-5 text-ui-muted">Atiende pedidos de Dirección con código de referencia, estado y observación de cierre.</p>
              </div>
              <span class="mt-4 inline-flex items-center justify-between pt-3 text-xs font-semibold text-ui-action">
                Gestionar solicitudes CH-xxx <span aria-hidden="true">→</span>
              </span>
            </a>

            <a routerLink="/admin/auditoria" class="group flex flex-col justify-between rounded-xl border border-ui-border bg-ui-surface p-5 text-ui-text no-underline shadow-2xs transition hover:border-ui-action">
              <div>
                <span class="text-[11px] font-bold uppercase tracking-[.12em] text-ui-muted">Trazabilidad institucional</span>
                <h3 class="mt-2 text-base font-bold text-ui-text">Acciones del sistema (Auditoría)</h3>
                <p class="mt-1 text-xs leading-5 text-ui-muted">Consulta eventos en lenguaje administrativo claro con detalle técnico bajo demanda.</p>
              </div>
              <span class="mt-4 inline-flex items-center justify-between pt-3 text-xs font-semibold text-ui-action">
                Ver acciones del sistema <span aria-hidden="true">→</span>
              </span>
            </a>

            <a routerLink="/admin/usuarios" class="group flex flex-col justify-between rounded-xl border border-ui-border bg-ui-surface p-5 text-ui-text no-underline shadow-2xs transition hover:border-ui-action">
              <div>
                <span class="text-[11px] font-bold uppercase tracking-[.12em] text-ui-muted">Cuentas y accesos</span>
                <h3 class="mt-2 text-base font-bold text-ui-text">Usuarios institucionales</h3>
                <p class="mt-1 text-xs leading-5 text-ui-muted">Administra cuentas activas, roles asignados, legajos de personal y credenciales.</p>
              </div>
              <span class="mt-4 inline-flex items-center justify-between pt-3 text-xs font-semibold text-ui-action">
                Administrar usuarios <span aria-hidden="true">→</span>
              </span>
            </a>
          </div>
        </section>
      }

      <!-- 3. SECRETARÍA: Cola de admisión, matrícula presencial y resumen de caja -->
      @if (esSecretaria() && !esDireccion()) {
        <section aria-labelledby="inicio-secretaria-title" class="space-y-4">
          <div class="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p class="m-0 text-[11px] font-semibold uppercase tracking-[.14em] text-ui-action">Mesa operativa de Secretaría</p>
              <h2 id="inicio-secretaria-title" class="mt-1 font-display text-xl font-semibold text-ui-text">Admisión, Matrículas y Caja</h2>
            </div>
            <span class="text-xs text-ui-muted">Flujo diario de atención a familias y recaudación</span>
          </div>

          <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
            <a routerLink="/admin/solicitudes-matricula" class="group flex flex-col justify-between rounded-xl border border-ui-border border-l-4 border-l-ui-action bg-ui-surface p-5 text-ui-text no-underline shadow-2xs transition hover:border-ui-action">
              <div>
                <div class="flex items-center justify-between gap-2">
                  <span class="text-[11px] font-bold uppercase tracking-[.12em] text-ui-action">Cola de admisión</span>
                  <span class="rounded-full bg-ui-surface-soft px-2.5 py-0.5 font-mono text-xs font-bold text-ui-text">
                    {{ solicitudesPendientesCount() !== null ? (solicitudesPendientesCount() + ' trámites') : 'Solicitudes' }}
                  </span>
                </div>
                <h3 class="mt-2 text-base font-bold text-ui-text">Solicitudes de matrícula</h3>
                <p class="mt-1 text-xs leading-5 text-ui-muted">Verifica partida, DNI y recibo de servicios antes de habilitar el pago o asignar aula.</p>
              </div>
              <span class="mt-4 inline-flex items-center justify-between pt-3 text-xs font-semibold text-ui-action">
                Atender cola de admisión <span aria-hidden="true">→</span>
              </span>
            </a>

            <a routerLink="/admin/matriculas" class="group flex flex-col justify-between rounded-xl border border-ui-border bg-ui-surface p-5 text-ui-text no-underline shadow-2xs transition hover:border-ui-action">
              <div>
                <span class="text-[11px] font-bold uppercase tracking-[.12em] text-ui-muted">Atención en ventanilla</span>
                <h3 class="mt-2 text-base font-bold text-ui-text">Matrícula presencial y padrón</h3>
                <p class="mt-1 text-xs leading-5 text-ui-muted">Registra estudiantes, vincula apoderados y completa la matrícula presencial por pasos.</p>
              </div>
              <span class="mt-4 inline-flex items-center justify-between pt-3 text-xs font-semibold text-ui-action">
                Abrir módulo de matrículas <span aria-hidden="true">→</span>
              </span>
            </a>

            <a routerLink="/admin/tesoreria" class="group flex flex-col justify-between rounded-xl border border-ui-border bg-ui-surface p-5 text-ui-text no-underline shadow-2xs transition hover:border-ui-action">
              <div>
                <div class="flex items-center justify-between gap-2">
                  <span class="text-[11px] font-bold uppercase tracking-[.12em] text-emerald-700">Caja y Tesorería</span>
                  <span class="font-mono text-xs font-bold text-emerald-800">
                    {{ recaudacionMes() !== null ? ('S/ ' + (recaudacionMes() | number:'1.2-2')) : 'Caja activa' }}
                  </span>
                </div>
                <h3 class="mt-2 text-base font-bold text-ui-text">Resumen de caja y cobros</h3>
                <p class="mt-1 text-xs leading-5 text-ui-muted">Consulta obligaciones por cobrar, registra cobros del día y emite comprobantes.</p>
              </div>
              <span class="mt-4 inline-flex items-center justify-between pt-3 text-xs font-semibold text-ui-action">
                Ir a Tesorería y Caja <span aria-hidden="true">→</span>
              </span>
            </a>
          </div>
        </section>
      }

      <!-- 4. DOCENTE / AUXILIAR / TUTOR / APODERADO: Inicio enfocado en su tarea principal -->
      @if (esDocente() && !esDireccion() && !esSecretaria()) {
        <section aria-labelledby="inicio-docente-title" class="space-y-4">
          <div>
            <p class="m-0 text-[11px] font-semibold uppercase tracking-[.14em] text-ui-action">Jornada pedagógica</p>
            <h2 id="inicio-docente-title" class="mt-1 font-display text-xl font-semibold text-ui-text">Tus clases y evaluaciones</h2>
          </div>
          <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
            <a routerLink="/admin/calificaciones" class="group flex flex-col justify-between rounded-xl border border-ui-border border-l-4 border-l-ui-action bg-ui-surface p-5 text-ui-text no-underline">
              <div>
                <span class="text-[11px] font-bold uppercase tracking-[.12em] text-ui-action">Tarea principal</span>
                <h3 class="mt-2 text-base font-bold">Calificaciones CNEB</h3>
                <p class="mt-1 text-xs text-ui-muted">Registra niveles de logro (AD, A, B, C) y conclusiones descriptivas por competencia.</p>
              </div>
              <span class="mt-4 text-xs font-semibold text-ui-action">Registrar evaluaciones →</span>
            </a>
            <a routerLink="/admin/horarios" class="group flex flex-col justify-between rounded-xl border border-ui-border bg-ui-surface p-5 text-ui-text no-underline">
              <div>
                <span class="text-[11px] font-bold uppercase tracking-[.12em] text-ui-muted">Agenda semanal</span>
                <h3 class="mt-2 text-base font-bold">Mis clases y horarios</h3>
                <p class="mt-1 text-xs text-ui-muted">Revisa bloques horarios, aulas asignadas y programación de refuerzo escolar.</p>
              </div>
              <span class="mt-4 text-xs font-semibold text-ui-action">Ver horario →</span>
            </a>
            <a routerLink="/admin/asistencia" class="group flex flex-col justify-between rounded-xl border border-ui-border bg-ui-surface p-5 text-ui-text no-underline">
              <div>
                <span class="text-[11px] font-bold uppercase tracking-[.12em] text-ui-muted">Control en aula</span>
                <h3 class="mt-2 text-base font-bold">Asistencia de mis secciones</h3>
                <p class="mt-1 text-xs text-ui-muted">Pasa lista en tus secciones asignadas y verifica el registro del día.</p>
              </div>
              <span class="mt-4 text-xs font-semibold text-ui-action">Tomar asistencia →</span>
            </a>
          </div>
        </section>
      }

      @if (esAuxiliar() && !esDireccion() && !esSecretaria()) {
        <section aria-labelledby="inicio-auxiliar-title" class="space-y-4">
          <div>
            <p class="m-0 text-[11px] font-semibold uppercase tracking-[.14em] text-ui-action">Control diario de convivencia y asistencia</p>
            <h2 id="inicio-auxiliar-title" class="mt-1 font-display text-xl font-semibold text-ui-text">Pase de lista y observaciones de hoy</h2>
          </div>
          <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
            <a routerLink="/admin/asistencia" class="group flex flex-col justify-between rounded-xl border border-ui-border border-l-4 border-l-ui-action bg-ui-surface p-5 text-ui-text no-underline">
              <div>
                <span class="text-[11px] font-bold uppercase tracking-[.12em] text-ui-action">Tarea principal</span>
                <h3 class="mt-2 text-base font-bold">Pase de lista y asistencia de hoy</h3>
                <p class="mt-1 text-xs text-ui-muted">Registra asistencia diaria, tardanzas, justificaciones y conciliación biométrica.</p>
              </div>
              <span class="mt-4 text-xs font-semibold text-ui-action">Ir al pase de lista →</span>
            </a>
            <a routerLink="/admin/observaciones-conductuales" class="group flex flex-col justify-between rounded-xl border border-ui-border bg-ui-surface p-5 text-ui-text no-underline">
              <div>
                <span class="text-[11px] font-bold uppercase tracking-[.12em] text-ui-muted">Seguimiento</span>
                <h3 class="mt-2 text-base font-bold">Observaciones de hoy</h3>
                <p class="mt-1 text-xs text-ui-muted">Registra observaciones conductuales e incidencias del turno escolar.</p>
              </div>
              <span class="mt-4 text-xs font-semibold text-ui-action">Registrar observación →</span>
            </a>
            <a routerLink="/admin/tesoreria" class="group flex flex-col justify-between rounded-xl border border-ui-divider bg-ui-surface-soft p-5 text-ui-text no-underline">
              <div>
                <span class="text-[11px] font-bold uppercase tracking-[.12em] text-ui-muted">Acceso secundario</span>
                <h3 class="mt-2 text-base font-bold">Cobros extraordinarios en caja</h3>
                <p class="mt-1 text-xs text-ui-muted">Genera y registra cobros de certificados o actividades autorizadas.</p>
              </div>
              <span class="mt-4 text-xs font-semibold text-ui-action">Abrir cobros extraordinarios →</span>
            </a>
          </div>
        </section>
      }

      @if (esTutor() && !esDireccion() && !esSecretaria()) {
        <section aria-labelledby="inicio-tutor-title" class="space-y-4">
          <div>
            <p class="m-0 text-[11px] font-semibold uppercase tracking-[.14em] text-ui-action">Acompañamiento tutorial</p>
            <h2 id="inicio-tutor-title" class="mt-1 font-display text-xl font-semibold text-ui-text">Tu sección y seguimientos</h2>
          </div>
          <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
            <a routerLink="/admin/tutoria" class="group flex flex-col justify-between rounded-xl border border-ui-border border-l-4 border-l-ui-action bg-ui-surface p-5 text-ui-text no-underline">
              <div>
                <span class="text-[11px] font-bold uppercase tracking-[.12em] text-ui-action">Tarea principal</span>
                <h3 class="mt-2 text-base font-bold">Mi sección y seguimiento</h3>
                <p class="mt-1 text-xs text-ui-muted">Monitorea alertas de asistencia, rendimiento e incidencias de tu tutoría.</p>
              </div>
              <span class="mt-4 text-xs font-semibold text-ui-action">Abrir tutoría →</span>
            </a>
            <a routerLink="/admin/convivencia" class="group flex flex-col justify-between rounded-xl border border-ui-border bg-ui-surface p-5 text-ui-text no-underline">
              <div>
                <span class="text-[11px] font-bold uppercase tracking-[.12em] text-ui-muted">Convivencia escolar</span>
                <h3 class="mt-2 text-base font-bold">Citaciones e incidencias</h3>
                <p class="mt-1 text-xs text-ui-muted">Revisa acuerdos y citaciones con apoderados de tu sección.</p>
              </div>
              <span class="mt-4 text-xs font-semibold text-ui-action">Ver convivencia →</span>
            </a>
            <a routerLink="/admin/asistencia" class="group flex flex-col justify-between rounded-xl border border-ui-border bg-ui-surface p-5 text-ui-text no-underline">
              <div>
                <span class="text-[11px] font-bold uppercase tracking-[.12em] text-ui-muted">Control diario</span>
                <h3 class="mt-2 text-base font-bold">Asistencia de la sección</h3>
                <p class="mt-1 text-xs text-ui-muted">Verifica inasistencias reiteradas y justificaciones médicas.</p>
              </div>
              <span class="mt-4 text-xs font-semibold text-ui-action">Consultar asistencia →</span>
            </a>
          </div>
        </section>
      }

      @if (esApoderado() && !esDireccion() && !esSecretaria()) {
        <section aria-labelledby="inicio-familia-title" class="space-y-4">
          <div>
            <p class="m-0 text-[11px] font-semibold uppercase tracking-[.14em] text-ui-action">Resumen familiar</p>
            <h2 id="inicio-familia-title" class="mt-1 font-display text-xl font-semibold text-ui-text">Estudiante seleccionado, asistencia, comunicados y pagos</h2>
          </div>
          <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
            <a routerLink="/admin/portal-apoderado" class="group flex flex-col justify-between rounded-xl border border-ui-border border-l-4 border-l-ui-action bg-ui-surface p-5 text-ui-text no-underline">
              <div>
                <span class="text-[11px] font-bold uppercase tracking-[.12em] text-ui-action">Estudiante y asistencia</span>
                <h3 class="mt-2 text-base font-bold">Portal familiar y libreta</h3>
                <p class="mt-1 text-xs text-ui-muted">Cambia de estudiante, consulta su asistencia del año y descarga la libreta CNEB.</p>
              </div>
              <span class="mt-4 text-xs font-semibold text-ui-action">Abrir portal familiar →</span>
            </a>
            <a routerLink="/admin/comunicados" class="group flex flex-col justify-between rounded-xl border border-ui-border bg-ui-surface p-5 text-ui-text no-underline">
              <div>
                <span class="text-[11px] font-bold uppercase tracking-[.12em] text-ui-muted">Circular escolar</span>
                <h3 class="mt-2 text-base font-bold">Comunicados y acuses</h3>
                <p class="mt-1 text-xs text-ui-muted">Lee avisos oficiales de la institución y confirma la recepción de circulares.</p>
              </div>
              <span class="mt-4 text-xs font-semibold text-ui-action">Ver comunicados →</span>
            </a>
            <a routerLink="/admin/tesoreria" class="group flex flex-col justify-between rounded-xl border border-ui-border bg-ui-surface p-5 text-ui-text no-underline">
              <div>
                <span class="text-[11px] font-bold uppercase tracking-[.12em] text-ui-muted">Próximo pago</span>
                <h3 class="mt-2 text-base font-bold">Estado de cuenta y pagos</h3>
                <p class="mt-1 text-xs text-ui-muted">Revisa tu próximo vencimiento de pensión o matrícula y paga en línea.</p>
              </div>
              <span class="mt-4 text-xs font-semibold text-ui-action">Ver próximo pago →</span>
            </a>
          </div>
        </section>
      }

      <!-- ========================================================= -->
      <!-- ANALÍTICA ACADÉMICA Y OPERATIVA (INDICADORES DIRECCIÓN)   -->
      <!-- ========================================================= -->
      @if (esDireccion() || esAdministrador()) {
        <section aria-labelledby="indicadores-direccion-title" class="space-y-6 rounded-2xl border border-ui-border bg-ui-surface p-5 shadow-2xs sm:p-6">
          <div class="flex flex-col justify-between gap-4 border-b border-ui-divider pb-4 lg:flex-row lg:items-end">
            <div>
              <p class="m-0 text-xs font-bold uppercase tracking-[.12em] text-ui-action">Analítica pedagógica y operativa</p>
              <h2 id="indicadores-direccion-title" class="mt-0.5 mb-0 font-display text-xl font-semibold text-ui-text sm:text-2xl">Indicadores para Dirección</h2>
              <p class="mt-1 mb-0 text-sm text-ui-muted">Desempeño académico CNEB consolidado, cobertura de evaluación, permanencia y ocupación por sección.</p>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <button
                type="button"
                id="btn-alternar-vista-tabular"
                (click)="alternarVistaTabular()"
                [attr.aria-pressed]="vistaTabular()"
                class="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-ui-border bg-ui-surface-soft px-3.5 py-2 text-xs font-semibold text-ui-text transition hover:border-ui-action cursor-pointer"
              >
                <span>{{ vistaTabular() ? 'Ver gráficos y tarjetas' : 'Vista tabular accesible' }}</span>
              </button>
              <button
                type="button"
                (click)="cargarIndicadoresDireccion()"
                class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-ui-action px-4 py-2 text-xs font-semibold text-ui-action-text cursor-pointer"
              >
                ↻ Actualizar corte
              </button>
            </div>
          </div>

          <!-- Filtros comunes -->
          <div class="grid grid-cols-1 gap-3 rounded-xl border border-ui-divider bg-ui-surface-soft p-4 sm:grid-cols-2 lg:grid-cols-5" aria-label="Filtros comunes de indicadores">
            <label class="grid gap-1 text-xs font-semibold text-ui-muted">
              Año lectivo
              <select
                aria-label="Filtro año lectivo"
                [(ngModel)]="anioFiltroId"
                (ngModelChange)="alCambiarAnioFiltro()"
                class="min-h-11 rounded-lg border border-ui-control-border bg-ui-surface px-3 py-2 text-sm text-ui-text"
              >
                @for (a of aniosDisponibles(); track a.id) {
                  <option [ngValue]="a.id">{{ a.anio }}{{ a.abierto ? ' (Activo)' : '' }}</option>
                }
              </select>
            </label>

            <label class="grid gap-1 text-xs font-semibold text-ui-muted">
              Periodo
              <select
                aria-label="Filtro periodo académico"
                [(ngModel)]="periodoFiltroId"
                (ngModelChange)="cargarIndicadoresDireccion()"
                class="min-h-11 rounded-lg border border-ui-control-border bg-ui-surface px-3 py-2 text-sm text-ui-text"
              >
                <option [ngValue]="0">Todos los periodos</option>
                @for (p of periodosDisponibles(); track p.id) {
                  <option [ngValue]="p.id">{{ p.nombre }}</option>
                }
              </select>
            </label>

            <label class="grid gap-1 text-xs font-semibold text-ui-muted">
              Nivel
              <select
                aria-label="Filtro nivel educativo"
                [(ngModel)]="nivelFiltro"
                (ngModelChange)="alCambiarNivelFiltro()"
                class="min-h-11 rounded-lg border border-ui-control-border bg-ui-surface px-3 py-2 text-sm text-ui-text"
              >
                <option value="TODOS">Todos</option>
                <option value="INICIAL">INICIAL</option>
                <option value="PRIMARIA">PRIMARIA</option>
                <option value="SECUNDARIA">SECUNDARIA</option>
              </select>
            </label>

            <label class="grid gap-1 text-xs font-semibold text-ui-muted">
              Grado
              <select
                aria-label="Filtro grado escolar"
                [(ngModel)]="gradoFiltroId"
                (ngModelChange)="alCambiarGradoFiltro()"
                class="min-h-11 rounded-lg border border-ui-control-border bg-ui-surface px-3 py-2 text-sm text-ui-text"
              >
                <option [ngValue]="0">Todos los grados</option>
                @for (g of gradosFiltrados(); track g.id) {
                  <option [ngValue]="g.id">{{ g.nombre }}</option>
                }
              </select>
            </label>

            <label class="grid gap-1 text-xs font-semibold text-ui-muted">
              Sección
              <select
                aria-label="Filtro sección"
                [(ngModel)]="seccionFiltroId"
                (ngModelChange)="cargarIndicadoresDireccion()"
                class="min-h-11 rounded-lg border border-ui-control-border bg-ui-surface px-3 py-2 text-sm text-ui-text"
              >
                <option [ngValue]="0">Todas las secciones</option>
                @for (s of seccionesFiltradas(); track s.id) {
                  <option [ngValue]="s.id">Sección {{ s.letra }}</option>
                }
              </select>
            </label>
          </div>

          @if (indicadoresEstado() === 'cargando') {
            <p role="status" class="py-3 text-sm text-ui-muted">Cargando indicadores…</p>
          } @else if (indicadoresEstado() === 'error') {
            <p role="alert" class="py-3 text-sm text-ui-error">No se pudieron consultar los indicadores. Selecciona Actualizar corte para reintentar.</p>
          } @else {
          <!-- Bloque 1: Dona de desempeño académico CNEB + Cobertura de evaluación -->
          <div class="grid grid-cols-1 gap-6 xl:grid-cols-12">
            <!-- Dona de desempeño académico (7 cols) -->
            <article class="rounded-xl border border-ui-divider bg-ui-surface p-5 xl:col-span-7" aria-labelledby="dona-desempeno-titulo">
              <div class="flex flex-wrap items-start justify-between gap-2 border-b border-ui-divider pb-3">
                <div>
                  <span class="text-[11px] font-bold uppercase tracking-[.12em] text-ui-action">Distribución CNEB consolidada</span>
                  <h3 id="dona-desempeno-titulo" class="mt-0.5 text-lg font-semibold text-ui-text">Desempeño académico por nivel de logro</h3>
                </div>
                <span class="rounded-full bg-ui-surface-soft px-3 py-1 text-xs font-semibold text-ui-muted">
                  Evaluados: {{ totalEvaluados() }}
                </span>
              </div>

              <!-- Definición metodológica publicada junto a la gráfica -->
              <p class="mt-3 rounded-lg border border-ui-divider bg-ui-surface-soft px-3.5 py-2.5 text-xs leading-5 text-ui-muted" id="definicion-dona-cneb">
                <strong class="text-ui-text">Definición del indicador:</strong> Cada estudiante se contabiliza una única vez por corte según su nivel de logro consolidado.
              </p>

              @if (!vistaTabular()) {
                <div class="mt-5 grid grid-cols-1 items-center gap-6 md:grid-cols-12">
                  <!-- SVG Dona accesible con total evaluado al centro -->
                  <div class="flex flex-col items-center justify-center md:col-span-5">
                    <div class="relative flex h-56 w-56 items-center justify-center">
                      <svg
                        viewBox="0 0 120 120"
                        class="h-52 w-52 -rotate-90 transform"
                        role="img"
                        aria-labelledby="dona-desempeno-titulo definicion-dona-cneb"
                      >
                        <title>Distribución de estudiantes evaluados por nivel de logro CNEB</title>
                        <circle cx="60" cy="60" r="44" fill="transparent" stroke="#e2e8f0" stroke-width="13"></circle>
                        @for (seg of segmentosDona(); track seg.codigo) {
                          @if (seg.cantidad > 0) {
                            <circle
                              cx="60"
                              cy="60"
                              r="44"
                              fill="transparent"
                              [attr.stroke]="seg.color"
                              stroke-width="13"
                              [attr.stroke-dasharray]="seg.strokeDasharray"
                              [attr.stroke-dashoffset]="seg.strokeDashoffset"
                            ></circle>
                          }
                        }
                      </svg>
                      <div class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-7 text-center">
                        <span class="font-display text-3xl font-bold leading-none text-ui-text" data-testid="dona-total-evaluado">{{ totalEvaluados() }}</span>
                        <span class="dona-total-label mt-1.5 font-semibold uppercase text-ui-muted">Total evaluado</span>
                      </div>
                    </div>
                  </div>

                  <!-- Leyenda con cantidad, porcentaje, barra proporcional y botón para filtrar listado -->
                  <div class="space-y-2.5 md:col-span-7" role="list" aria-label="Leyenda de niveles de logro CNEB">
                    @for (seg of segmentosDona(); track seg.codigo) {
                      <div
                        role="listitem"
                        class="rounded-xl border border-ui-divider bg-ui-surface-soft px-3.5 py-2.5 transition"
                        [class.ring-2]="grupoSeleccionado() === seg.codigo"
                        [class.ring-ui-action]="grupoSeleccionado() === seg.codigo"
                      >
                        <div class="flex flex-wrap items-center justify-between gap-2">
                          <div class="flex items-center gap-2.5 min-w-0">
                            <span class="h-3.5 w-3.5 shrink-0 rounded-full" [style.background-color]="seg.color" aria-hidden="true"></span>
                            <div class="min-w-0">
                              <p class="m-0 text-xs font-bold text-ui-text">{{ seg.etiqueta }} ({{ seg.codigo }})</p>
                              <p class="m-0 text-xs text-ui-muted">{{ seg.descripcion }}</p>
                            </div>
                          </div>
                          <div class="flex items-center gap-3">
                            <span class="font-mono text-xs font-bold text-ui-text tabular-nums">
                              {{ seg.cantidad }} ({{ seg.porcentaje | number:'1.0-1' }}%)
                            </span>
                            <button
                              type="button"
                              (click)="seleccionarGrupoDesempeno(seg.codigo)"
                              class="min-h-9 rounded-lg border border-ui-border bg-ui-surface px-2.5 py-1 text-xs font-semibold text-ui-action hover:bg-ui-surface-soft cursor-pointer"
                              [attr.aria-label]="'Ver estudiantes de ' + seg.etiqueta"
                            >
                              {{ grupoSeleccionado() === seg.codigo ? 'Ocultar lista' : 'Ver estudiantes' }}
                            </button>
                          </div>
                        </div>
                        <div class="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200/80" aria-hidden="true">
                          <div class="h-full rounded-full transition-all" [style.background-color]="seg.color" [style.width.%]="seg.porcentaje"></div>
                        </div>
                      </div>
                    }
                  </div>
                </div>
              } @else {
                <!-- Vista tabular accesible del desempeño -->
                <div class="mt-4 overflow-x-auto">
                  <table class="w-full border-collapse text-left text-xs" aria-label="Tabla accesible de desempeño académico CNEB">
                    <thead>
                      <tr class="border-b border-ui-divider bg-ui-surface-soft text-[11px] uppercase text-ui-muted">
                        <th class="p-2.5">Categoría CNEB</th>
                        <th class="p-2.5">Nivel</th>
                        <th class="p-2.5 text-right">Cantidad</th>
                        <th class="p-2.5 text-right">Porcentaje</th>
                        <th class="p-2.5 text-right">Detalle</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-ui-divider">
                      @for (seg of segmentosDona(); track seg.codigo) {
                        <tr>
                          <td class="p-2.5 font-semibold text-ui-text">{{ seg.etiqueta }}</td>
                          <td class="p-2.5 font-mono font-bold">{{ seg.codigo }}</td>
                          <td class="p-2.5 text-right font-mono">{{ seg.cantidad }}</td>
                          <td class="p-2.5 text-right font-mono">{{ seg.porcentaje | number:'1.0-1' }}%</td>
                          <td class="p-2.5 text-right">
                            <button type="button" (click)="seleccionarGrupoDesempeno(seg.codigo)" class="rounded border border-ui-border px-2 py-1 text-[11px] font-semibold text-ui-action">
                              Ver estudiantes
                            </button>
                          </td>
                        </tr>
                      }
                      <tr class="bg-ui-surface-soft font-bold">
                        <td class="p-2.5" colspan="2">Total de estudiantes evaluados</td>
                        <td class="p-2.5 text-right font-mono">{{ totalEvaluados() }}</td>
                        <td class="p-2.5 text-right font-mono">{{ totalEvaluados() > 0 ? '100%' : '0%' }}</td>
                        <td class="p-2.5"></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              }

              <!-- Listado filtrado de estudiantes del grupo seleccionado -->
              @if (grupoSeleccionado()) {
                <div class="mt-5 rounded-xl border border-ui-action/40 bg-ui-surface-soft p-4" role="region" aria-label="Listado filtrado de estudiantes por grupo CNEB">
                  <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span class="text-[11px] font-bold uppercase tracking-wider text-ui-action">Listado filtrado</span>
                      <h4 class="m-0 text-sm font-bold text-ui-text">
                        Estudiantes en grupo {{ etiquetaGrupoSeleccionado() }} ({{ estudiantesGrupoFiltrado().length }})
                      </h4>
                    </div>
                    <button
                      type="button"
                      (click)="grupoSeleccionado.set(null)"
                      class="min-h-9 rounded-lg border border-ui-border bg-ui-surface px-3 py-1 text-xs font-semibold text-ui-text cursor-pointer"
                    >
                      Cerrar listado
                    </button>
                  </div>
                  @if (estudiantesGrupoFiltrado().length) {
                    <div class="overflow-hidden rounded-lg border border-ui-divider bg-ui-surface">
                      <div class="overflow-x-auto">
                        <table class="w-full text-left text-xs">
                          <thead class="bg-ui-surface-soft text-[11px] uppercase text-ui-muted">
                            <tr>
                              <th class="p-2.5">Estudiante</th>
                              <th class="p-2.5">Grado y sección</th>
                              <th class="p-2.5">Nivel consolidado</th>
                            </tr>
                          </thead>
                          <tbody class="divide-y divide-ui-divider">
                            @for (est of estudiantesGrupoPaginados(); track est.matriculaId) {
                              <tr>
                                <td class="p-2.5 font-semibold text-ui-text">{{ est.nombreCompleto }}</td>
                                <td class="p-2.5">{{ est.grado }}</td>
                                <td class="p-2.5 font-mono font-bold">{{ est.nivelLogro === 'SIN_EVALUACION' ? 'Sin evaluación' : est.nivelLogro }}</td>
                              </tr>
                            }
                          </tbody>
                        </table>
                      </div>
                      <ui-paginacion
                        [totalRegistros]="estudiantesGrupoFiltrado().length"
                        [paginaActual]="grupoPaginaActual()"
                        [tamanoPagina]="10"
                        etiqueta="estudiantes"
                        ariaLabel="Paginación de estudiantes por desempeño"
                        (cambioPagina)="grupoPaginaActual.set($event)"
                      />
                    </div>
                  } @else {
                    <p class="m-0 text-xs text-ui-muted">No hay estudiantes registrados en esta categoría para el filtro seleccionado.</p>
                  }
                </div>
              }
            </article>

            <!-- Cobertura de evaluación + Asistencia del periodo (5 cols) -->
            <div class="space-y-6 xl:col-span-5">
              <!-- Cobertura de evaluación -->
              <article class="rounded-xl border border-ui-divider bg-ui-surface p-5" aria-labelledby="cobertura-evaluacion-titulo">
                <div class="flex items-start justify-between gap-2">
                  <div>
                    <span class="text-[11px] font-bold uppercase tracking-[.12em] text-ui-action">Avance de registro CNEB</span>
                    <h3 id="cobertura-evaluacion-titulo" class="mt-0.5 text-lg font-semibold text-ui-text">Cobertura de evaluación</h3>
                  </div>
                  <span class="rounded-full bg-ui-surface-soft px-3 py-1 font-mono text-xs font-bold text-ui-text">
                    {{ coberturaPorcentaje() | number:'1.0-1' }}%
                  </span>
                </div>

                <p class="mt-2 text-xs text-ui-muted">
                  Estudiantes evaluados sobre matriculados del alcance seleccionado:
                  <strong class="text-ui-text">{{ totalEvaluados() }} de {{ totalMatriculadosAlcance() }} matriculados</strong>.
                </p>

                <!-- Barra de cobertura -->
                <div class="mt-3 h-3 w-full overflow-hidden rounded-full bg-slate-200" role="progressbar" [attr.aria-valuenow]="coberturaPorcentaje()" aria-valuemin="0" aria-valuemax="100" aria-label="Porcentaje de cobertura de evaluación">
                  <div class="h-full bg-ui-action transition-all" [style.width.%]="coberturaPorcentaje()"></div>
                </div>

                <!-- Grupo separado: Estudiantes sin evaluación -->
                <div class="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300/80 bg-amber-50/70 p-3.5">
                  <div>
                    <span class="text-[11px] font-bold uppercase tracking-wider text-amber-900">Grupo separado fuera de la dona</span>
                    <p class="m-0 mt-0.5 text-sm font-bold text-amber-950">
                      Estudiantes sin evaluación: {{ sinEvaluacionCount() }}
                    </p>
                    <p class="m-0 text-xs text-amber-900">Pendientes de cierre de calificaciones en el corte consultado.</p>
                  </div>
                  <button
                    type="button"
                    (click)="seleccionarGrupoDesempeno('SIN_EVALUACION')"
                    class="min-h-9 rounded-lg border border-amber-400 bg-white px-3 py-1.5 text-xs font-semibold text-amber-950 cursor-pointer"
                  >
                    {{ grupoSeleccionado() === 'SIN_EVALUACION' ? 'Ocultar' : 'Ver sin evaluación' }}
                  </button>
                </div>
              </article>

              <!-- Asistencia del periodo -->
              <article class="rounded-xl border border-ui-divider bg-ui-surface p-5" aria-labelledby="asistencia-periodo-titulo">
                <div class="flex items-start justify-between gap-2">
                  <div>
                    <span class="text-[11px] font-bold uppercase tracking-[.12em] text-ui-action">Seguimiento de permanencia</span>
                    <h3 id="asistencia-periodo-titulo" class="mt-0.5 text-lg font-semibold text-ui-text">Asistencia del periodo</h3>
                  </div>
                  <span class="font-display text-2xl font-bold text-ui-text">
                    {{ indicadores().asistencia.porcentajePeriodo !== null ? (indicadores().asistencia.porcentajePeriodo + '%') : '—' }}
                  </span>
                </div>

                <div class="mt-2 text-xs text-ui-muted">
                  @if (indicadores().asistencia.tieneCortePrevio && indicadores().asistencia.variacionPeriodoAnterior !== null) {
                    <span>
                      Variación frente al periodo comparable:
                      <strong [class.text-emerald-700]="indicadores().asistencia.variacionPeriodoAnterior! >= 0" [class.text-rose-700]="indicadores().asistencia.variacionPeriodoAnterior! < 0">
                        {{ indicadores().asistencia.variacionPeriodoAnterior! >= 0 ? '+' : '' }}{{ indicadores().asistencia.variacionPeriodoAnterior }} pp
                      </strong>
                    </span>
                  } @else {
                    <span class="inline-flex items-center gap-1.5 rounded-md bg-ui-surface-soft px-2.5 py-1 font-medium text-ui-muted">
                      ⓘ Sin corte previo comparable para el filtro seleccionado
                    </span>
                  }
                </div>

                <div class="mt-3">
                  @if (asistenciaProporciones().total > 0) {
                    <div class="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-200" aria-label="Distribución proporcional de asistencia">
                      <div class="h-full bg-emerald-600 transition-all" [style.width.%]="asistenciaProporciones().p" title="Presentes"></div>
                      <div class="h-full bg-amber-500 transition-all" [style.width.%]="asistenciaProporciones().t" title="Tardanzas"></div>
                      <div class="h-full bg-rose-600 transition-all" [style.width.%]="asistenciaProporciones().i" title="Inasistencias"></div>
                    </div>
                  }
                </div>

                <div class="mt-3 grid grid-cols-3 gap-2.5 text-center">
                  <div class="rounded-lg border border-ui-divider bg-ui-surface-soft p-2.5">
                    <span class="block text-[11px] font-semibold uppercase text-ui-muted">Presentes</span>
                    <strong class="mt-1 block font-mono text-base text-emerald-700">{{ indicadores().asistencia.presentes }}</strong>
                  </div>
                  <div class="rounded-lg border border-ui-divider bg-ui-surface-soft p-2.5">
                    <span class="block text-[11px] font-semibold uppercase text-ui-muted">Tardanzas</span>
                    <strong class="mt-1 block font-mono text-base text-amber-800">{{ indicadores().asistencia.tardanzas }}</strong>
                  </div>
                  <div class="rounded-lg border border-ui-divider bg-ui-surface-soft p-2.5">
                    <span class="block text-[11px] font-semibold uppercase text-ui-muted">Inasistencias</span>
                    <strong class="mt-1 block font-mono text-base text-rose-700">{{ indicadores().asistencia.inasistencias }}</strong>
                    <small class="block text-[10px] text-ui-muted">
                      {{ indicadores().asistencia.faltasJustificadas }} just. / {{ indicadores().asistencia.faltasInjustificadas }} injust.
                    </small>
                  </div>
                </div>
              </article>
            </div>
          </div>

          <!-- Bloque 2: Matrícula y vacantes disponibles por sección (tope 30 por aula) -->
          <article class="rounded-xl border border-ui-divider bg-ui-surface p-5" aria-labelledby="cupos-seccion-titulo">
            <div class="mb-4 flex flex-wrap items-end justify-between gap-2">
              <div>
                <span class="text-[11px] font-bold uppercase tracking-[.12em] text-ui-action">Capacidad instalada · Tope institucional de 30 por aula</span>
                <h3 id="cupos-seccion-titulo" class="mt-0.5 text-lg font-semibold text-ui-text">Matrícula y vacantes disponibles por sección</h3>
              </div>
              <span class="text-xs font-semibold text-ui-muted">
                Total matriculados en alcance: {{ totalMatriculadosAlcanceCupos() }} · Vacantes libres: {{ totalVacantesDisponibles() }}
              </span>
            </div>

            <!-- Filtros directos de nivel, grado y sección para la tabla de capacidad -->
            <div class="mb-4 grid grid-cols-1 gap-3 rounded-xl border border-ui-divider bg-ui-surface-soft p-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Filtros de matrícula y vacantes disponibles por sección">
              <label class="grid gap-1 text-xs font-semibold text-ui-muted">
                Nivel
                <select
                  aria-label="Filtro de nivel para cupos"
                  [ngModel]="cuposFiltroNivel()"
                  (ngModelChange)="alCambiarNivelCupos($event)"
                  class="min-h-10 rounded-lg border border-ui-control-border bg-ui-surface px-3 py-1.5 text-xs text-ui-text font-medium"
                >
                  <option value="TODOS">Todos los niveles</option>
                  <option value="INICIAL">Inicial</option>
                  <option value="PRIMARIA">Primaria</option>
                  <option value="SECUNDARIA">Secundaria</option>
                </select>
              </label>

              <label class="grid gap-1 text-xs font-semibold text-ui-muted">
                Grado
                <select
                  aria-label="Filtro de grado para cupos"
                  [ngModel]="cuposFiltroGradoId()"
                  (ngModelChange)="alCambiarGradoCupos($event)"
                  class="min-h-10 rounded-lg border border-ui-control-border bg-ui-surface px-3 py-1.5 text-xs text-ui-text font-medium"
                >
                  <option [ngValue]="0">Todos los grados</option>
                  @for (g of gradosCuposOrdenados(); track g.id) {
                    <option [ngValue]="g.id">{{ g.nombre }}</option>
                  }
                </select>
              </label>

              <label class="grid gap-1 text-xs font-semibold text-ui-muted">
                Sección
                <select
                  aria-label="Filtro de sección para cupos"
                  [ngModel]="cuposFiltroSeccion()"
                  (ngModelChange)="alCambiarSeccionCupos($event)"
                  class="min-h-10 rounded-lg border border-ui-control-border bg-ui-surface px-3 py-1.5 text-xs text-ui-text font-medium"
                >
                  <option value="TODAS">Todas las secciones</option>
                  <option value="A">Sección A</option>
                  <option value="B">Sección B</option>
                  <option value="C">Sección C</option>
                </select>
              </label>

              <div class="flex items-end">
                @if (cuposFiltroNivel() !== 'TODOS' || cuposFiltroGradoId() !== 0 || cuposFiltroSeccion() !== 'TODAS') {
                  <button
                    type="button"
                    (click)="limpiarFiltrosCupos()"
                    class="min-h-10 w-full rounded-lg border border-ui-divider bg-ui-surface px-3 py-1.5 text-xs font-semibold text-ui-muted hover:text-ui-text hover:bg-ui-surface-soft transition-colors cursor-pointer"
                  >
                    Restablecer filtros
                  </button>
                }
              </div>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full min-w-[640px] border-collapse text-left text-xs" aria-label="Matrícula y vacantes disponibles por sección">
                <thead>
                  <tr class="border-b border-ui-divider bg-ui-surface-soft text-[11px] uppercase text-ui-muted">
                    <th class="p-3">Nivel</th>
                    <th class="p-3">Grado</th>
                    <th class="p-3">Sección</th>
                    <th class="p-3">Aula</th>
                    <th class="p-3 text-right">Matriculados</th>
                    <th class="p-3 text-right">Tope por aula</th>
                    <th class="p-3 text-right">Vacantes disponibles</th>
                    <th class="p-3">Ocupación</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-ui-divider">
                  @for (fila of seccionesCuposPaginadas(); track fila.seccionId) {
                    <tr>
                      <td class="p-3 font-medium">{{ fila.nivel }}</td>
                      <td class="p-3 font-semibold text-ui-text">{{ fila.grado }}</td>
                      <td class="p-3 font-mono font-bold">Sección {{ fila.seccion }}</td>
                      <td class="p-3 text-ui-muted">{{ fila.aula }}</td>
                      <td class="p-3 text-right font-mono font-semibold">{{ fila.matriculados }}</td>
                      <td class="p-3 text-right font-mono">{{ fila.cupoMaximo }}</td>
                      <td class="p-3 text-right font-mono font-bold" [class.text-emerald-700]="fila.vacantesDisponibles > 0" [class.text-rose-700]="fila.vacantesDisponibles === 0">
                        {{ fila.vacantesDisponibles }}
                      </td>
                      <td class="p-3">
                        <div class="flex items-center gap-2.5">
                          <div class="hidden h-1.5 w-16 overflow-hidden rounded-full bg-slate-200 sm:block" aria-hidden="true">
                            <div
                              class="h-full rounded-full transition-all"
                              [class.bg-emerald-600]="fila.vacantesDisponibles > 0"
                              [class.bg-rose-600]="fila.vacantesDisponibles === 0"
                              [style.width.%]="ocupacionFilaPorcentaje(fila)">
                            </div>
                          </div>
                          <span class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold"
                            [class.bg-emerald-50]="fila.vacantesDisponibles > 0"
                            [class.text-emerald-800]="fila.vacantesDisponibles > 0"
                            [class.bg-rose-50]="fila.vacantesDisponibles === 0"
                            [class.text-rose-800]="fila.vacantesDisponibles === 0">
                            {{ fila.vacantesDisponibles > 0 ? (fila.vacantesDisponibles + ' vacantes libres') : 'Aula completa (30/30)' }}
                          </span>
                        </div>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="8" class="p-6 text-center text-ui-muted">
                        No hay secciones registradas para el filtro seleccionado.
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <ui-paginacion
              [totalRegistros]="seccionesCuposFiltradas().length"
              [paginaActual]="cuposPaginaActual()"
              [tamanoPagina]="cuposTamanoPagina()"
              etiqueta="secciones"
              ariaLabel="Paginación de cupos y vacantes"
              (cambioPagina)="cambiarCuposPagina($event)"
            />
          </article>
          }
        </section>
      }

      <!-- ========================================================= -->
      <!-- ACCESOS RÁPIDOS DE CONTINUIDAD                            -->
      <!-- ========================================================= -->
      @if (esDireccion() || esAdministrador() || esSecretaria()) {
      <section aria-labelledby="modulos-title">
        <div class="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p class="m-0 text-xs font-bold uppercase tracking-[.12em] text-ui-action">Accesos rápidos</p>
            <h2 id="modulos-title" class="mt-0.5 mb-0 font-display text-lg font-semibold text-ui-text">Continúa con tu trabajo</h2>
          </div>
          <span class="text-xs text-ui-muted">Módulos operativos frecuentes</span>
        </div>
        <div class="grid grid-cols-1 items-stretch gap-4 md:grid-cols-3">
          <a routerLink="/admin/matriculas" class="group flex h-full min-h-[172px] flex-col justify-between rounded-xl border border-ui-border border-t-4 border-t-ui-action bg-ui-surface p-5 text-left text-ui-text no-underline shadow-2xs transition-all hover:-translate-y-0.5 hover:border-ui-action hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-focus">
            <div>
              <div class="flex items-center justify-between gap-3">
                <span class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-ui-action">
                  <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4" stroke-width="1.8"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </span>
                <span class="rounded-full border border-ui-divider bg-ui-surface-soft px-2.5 py-0.5 text-xs font-semibold text-ui-muted">Admisión y legajos</span>
              </div>
              <h3 class="mt-3.5 mb-0 text-base font-bold text-ui-text transition-colors group-hover:text-ui-action">Matrículas y estudiantes</h3>
              <p class="mt-1 mb-0 text-sm leading-relaxed text-ui-muted">Expedientes, solicitudes y fichas únicas.</p>
            </div>
            <span class="mt-4 flex w-full items-center justify-between border-t border-ui-divider pt-3 text-sm font-semibold text-ui-action">
              <span>Abrir módulo</span>
              <span aria-hidden="true" class="inline-flex h-7 w-7 items-center justify-center rounded-full bg-ui-surface-soft text-ui-action transition-all group-hover:translate-x-0.5 group-hover:bg-ui-action group-hover:text-ui-action-text">→</span>
            </span>
          </a>
          @if (esDireccion() || esAdministrador()) {
          <a routerLink="/admin/calificaciones" class="group flex h-full min-h-[172px] flex-col justify-between rounded-xl border border-ui-border border-t-4 border-t-amber-500 bg-ui-surface p-5 text-left text-ui-text no-underline shadow-2xs transition-all hover:-translate-y-0.5 hover:border-ui-action hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-focus">
            <div>
              <div class="flex items-center justify-between gap-3">
                <span class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 text-amber-700">
                  <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-6 9 2 2 4-4"/></svg>
                </span>
                <span class="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800">Registro CNEB</span>
              </div>
              <h3 class="mt-3.5 mb-0 text-base font-bold text-ui-text transition-colors group-hover:text-ui-action">Calificaciones CNEB</h3>
              <p class="mt-1 mb-0 text-sm leading-relaxed text-ui-muted">Registro y consulta del progreso académico.</p>
            </div>
            <span class="mt-4 flex w-full items-center justify-between border-t border-ui-divider pt-3 text-sm font-semibold text-ui-action">
              <span>Abrir módulo</span>
              <span aria-hidden="true" class="inline-flex h-7 w-7 items-center justify-center rounded-full bg-ui-surface-soft text-ui-action transition-all group-hover:translate-x-0.5 group-hover:bg-ui-action group-hover:text-ui-action-text">→</span>
            </span>
          </a>
          }
          <a routerLink="/admin/asistencia" class="group flex h-full min-h-[172px] flex-col justify-between rounded-xl border border-ui-border border-t-4 border-t-emerald-600 bg-ui-surface p-5 text-left text-ui-text no-underline shadow-2xs transition-all hover:-translate-y-0.5 hover:border-ui-action hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-focus">
            <div>
              <div class="flex items-center justify-between gap-3">
                <span class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700">
                  <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke-width="1.8"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 7v5l3 2"/></svg>
                </span>
                <span class="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">Control diario</span>
              </div>
              <h3 class="mt-3.5 mb-0 text-base font-bold text-ui-text transition-colors group-hover:text-ui-action">Asistencia y biometría</h3>
              <p class="mt-1 mb-0 text-sm leading-relaxed text-ui-muted">Control diario e importación de marcas.</p>
            </div>
            <span class="mt-4 flex w-full items-center justify-between border-t border-ui-divider pt-3 text-sm font-semibold text-ui-action">
              <span>Abrir módulo</span>
              <span aria-hidden="true" class="inline-flex h-7 w-7 items-center justify-center rounded-full bg-ui-surface-soft text-ui-action transition-all group-hover:translate-x-0.5 group-hover:bg-ui-action group-hover:text-ui-action-text">→</span>
            </span>
          </a>
        </div>
      </section>
      }
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

  // Contadores de decisiones pendientes (Hito 2)
  readonly solicitudesPendientesCount = signal<number | null>(null);
  readonly suplenciasPendientesCount = signal<number | null>(null);

  // Filtros comunes de Indicadores de Dirección (Hito 4)
  readonly vistaTabular = signal(false);
  readonly grupoSeleccionado = signal<NivelLogroConsolidado | null>(null);
  readonly aniosDisponibles = signal<AnioLectivoResponseDto[]>([]);
  readonly periodosDisponibles = signal<PeriodoResponseDto[]>([]);
  readonly gradosCatalogo = signal<Array<GradoResponseDto & { nivelCodigo: NivelCodigo }>>([]);
  readonly seccionesCatalogo = signal<SeccionResponseDto[]>([]);

  anioFiltroId = 0;
  periodoFiltroId = 0;
  nivelFiltro: 'TODOS' | NivelCodigo = 'TODOS';
  gradoFiltroId = 0;
  seccionFiltroId = 0;

  // Filtros reactivos para la tabla inferior de matrícula y vacantes por sección
  readonly cuposFiltroNivel = signal<string>('TODOS');
  readonly cuposFiltroGradoId = signal<number>(0);
  readonly cuposFiltroSeccion = signal<string>('TODAS');

  readonly indicadoresEstado = signal<'cargando' | 'listo' | 'error'>('cargando');
  private consultaIndicadores = 0;
  private consultaCatalogos = 0;
  readonly indicadores = signal<IndicadoresDireccionDto>({
    desempeno: { AD: 0, A: 0, B: 0, C: 0 },
    cobertura: { evaluados: 0, matriculados: 0, sinEvaluacion: 0, porcentajeCobertura: 0 },
    asistencia: {
      porcentajePeriodo: null,
      variacionPeriodoAnterior: null,
      tieneCortePrevio: false,
      presentes: 0,
      tardanzas: 0,
      inasistencias: 0,
      faltasJustificadas: 0,
      faltasInjustificadas: 0
    },
    seccionesCupos: [],
    estudiantesDetalle: []
  });

  // Roles activos
  readonly esDireccion = computed(() => this.tieneRol('DIRECCION'));
  readonly esAdministrador = computed(() => this.tieneRol('ADMINISTRADOR'));
  readonly esSecretaria = computed(() => this.tieneRol('SECRETARIA'));
  readonly esDocente = computed(() => this.tieneRol('DOCENTE'));
  readonly esAuxiliar = computed(() => this.tieneRol('AUXILIAR'));
  readonly esTutor = computed(() => this.tieneRol('TUTOR'));
  readonly esApoderado = computed(() => this.tieneRol('APODERADO'));

  gradosFiltrados() {
    const grados = this.gradosCatalogo();
    const filtrados = this.nivelFiltro === 'TODOS' ? grados : grados.filter(g => g.nivelCodigo === this.nivelFiltro);
    return [...filtrados].sort((a, b) => compararGradosPorSecuenciaInstitucional(a.nombre, b.nombre));
  }

  seccionesFiltradas() {
    const grados = new Set(this.gradosFiltrados().map(g => g.id));
    return this.seccionesCatalogo().filter(s =>
      s.letra !== 'D'
      && (this.nivelFiltro === 'TODOS' || grados.has(s.gradoId))
      && (!this.gradoFiltroId || s.gradoId === Number(this.gradoFiltroId)));
  }

  alCambiarNivelCupos(nivel: string): void {
    this.cuposFiltroNivel.set(nivel);
    this.cuposFiltroGradoId.set(0);
    this.cuposPaginaActual.set(1);
  }

  alCambiarGradoCupos(gradoId: number): void {
    this.cuposFiltroGradoId.set(Number(gradoId));
    this.cuposPaginaActual.set(1);
  }

  alCambiarSeccionCupos(seccion: string): void {
    this.cuposFiltroSeccion.set(seccion);
    this.cuposPaginaActual.set(1);
  }

  limpiarFiltrosCupos(): void {
    this.cuposFiltroNivel.set('TODOS');
    this.cuposFiltroGradoId.set(0);
    this.cuposFiltroSeccion.set('TODAS');
    this.cuposPaginaActual.set(1);
  }

  readonly gradosCuposOrdenados = computed(() => {
    const nivel = this.cuposFiltroNivel();
    const todos = this.gradosCatalogo();
    const filtrados = nivel === 'TODOS'
      ? todos
      : todos.filter(g => g.nivelCodigo === nivel);
    return [...filtrados].sort((a, b) => compararGradosPorSecuenciaInstitucional(a.nombre, b.nombre));
  });

  readonly totalEvaluados = computed(() => this.indicadores().cobertura.evaluados);
  readonly totalMatriculadosAlcance = computed(() => this.indicadores().cobertura.matriculados);
  readonly sinEvaluacionCount = computed(() => this.indicadores().cobertura.sinEvaluacion);
  readonly coberturaPorcentaje = computed(() => this.indicadores().cobertura.porcentajeCobertura);

  readonly segmentosDona = computed<SegmentoDonaCneb[]>(() => {
    const d = this.indicadores().desempeno;
    const total = this.totalEvaluados();
    const circunferencia = 2 * Math.PI * 44; // r = 44
    const definiciones: Array<{ codigo: 'AD' | 'A' | 'B' | 'C'; etiqueta: string; descripcion: string; cantidad: number; color: string; badgeClass: string }> = [
      { codigo: 'AD', etiqueta: 'Estudiantes destacados', descripcion: 'Logro destacado consolidado', cantidad: d.AD || 0, color: '#059669', badgeClass: 'bg-emerald-100 text-emerald-900' },
      { codigo: 'A', etiqueta: 'Con logro esperado', descripcion: 'Logro esperado consolidado', cantidad: d.A || 0, color: '#2563eb', badgeClass: 'bg-blue-100 text-blue-900' },
      { codigo: 'B', etiqueta: 'En proceso', descripcion: 'En proceso de alcanzar el nivel', cantidad: d.B || 0, color: '#d97706', badgeClass: 'bg-amber-100 text-amber-900' },
      { codigo: 'C', etiqueta: 'Requieren acompañamiento', descripcion: 'En inicio · requiere refuerzo', cantidad: d.C || 0, color: '#dc2626', badgeClass: 'bg-rose-100 text-rose-900' }
    ];

    let acumulado = 0;
    return definiciones.map(item => {
      const proporcion = total > 0 ? item.cantidad / total : 0;
      const longitud = proporcion * circunferencia;
      const offset = -acumulado;
      acumulado += longitud;
      return {
        ...item,
        porcentaje: proporcion * 100,
        strokeDasharray: `${longitud.toFixed(2)} ${(circunferencia - longitud).toFixed(2)}`,
        strokeDashoffset: Number(offset.toFixed(2))
      };
    });
  });

  readonly grupoPaginaActual = signal<number>(1);

  readonly estudiantesGrupoFiltrado = computed(() => {
    const grupo = this.grupoSeleccionado();
    if (!grupo) return [];
    return this.indicadores().estudiantesDetalle.filter(e => e.nivelLogro === grupo);
  });

  readonly estudiantesGrupoPaginados = computed(() =>
    paginarRegistros(this.estudiantesGrupoFiltrado(), this.grupoPaginaActual(), 10)
  );

  readonly seccionesCuposFiltradas = computed(() => {
    const nivel = this.cuposFiltroNivel();
    const gradoId = this.cuposFiltroGradoId();
    const seccion = this.cuposFiltroSeccion();
    const catalogoGrados = this.gradosCatalogo();
    const gradoBuscado = gradoId > 0 ? catalogoGrados.find(g => g.id === gradoId) : null;
    const nombreGradoBuscado = gradoBuscado ? gradoBuscado.nombre.toLowerCase().trim() : '';

    let lista = this.indicadores().seccionesCupos.filter(f => f.seccion !== 'D');

    if (nivel !== 'TODOS') {
      lista = lista.filter(f => {
        const nivelFila = (f.nivel || '').toUpperCase().trim();
        const nivelFiltro = nivel.toUpperCase().trim();
        return nivelFila === nivelFiltro || nivelFila.includes(nivelFiltro);
      });
    }

    if (gradoId > 0) {
      lista = lista.filter(f => {
        if (f.gradoId && f.gradoId === gradoId) return true;
        if (nombreGradoBuscado && f.grado) {
          const gradoFila = f.grado.toLowerCase().trim();
          return gradoFila === nombreGradoBuscado || gradoFila.includes(nombreGradoBuscado);
        }
        return false;
      });
    }

    if (seccion !== 'TODAS') {
      lista = lista.filter(f => {
        const secFila = (f.seccion || '').toUpperCase().trim();
        const secFiltro = seccion.toUpperCase().trim();
        return secFila === secFiltro || secFila.endsWith(` ${secFiltro}`) || secFila === `SECCIÓN ${secFiltro}`;
      });
    }

    return [...lista].sort((a, b) => {
      const cmp = compararGradosPorSecuenciaInstitucional(a.grado, b.grado);
      if (cmp !== 0) return cmp;
      return a.seccion.localeCompare(b.seccion);
    });
  });

  readonly totalMatriculadosAlcanceCupos = computed(() =>
    this.seccionesCuposFiltradas().reduce((sum, s) => sum + s.matriculados, 0)
  );

  readonly totalVacantesDisponibles = computed(() =>
    this.seccionesCuposFiltradas().reduce((sum, s) => sum + s.vacantesDisponibles, 0)
  );

  readonly porcentajeOcupacionCupos = computed<number | null>(() => {
    const lista = this.seccionesCuposFiltradas();
    const capacidad = lista.reduce((sum, s) => sum + s.cupoMaximo, 0);
    if (capacidad <= 0) return null;
    const ocupados = lista.reduce((sum, s) => sum + s.matriculados, 0);
    return Math.min(100, Math.round((ocupados * 100) / capacidad));
  });

  readonly porcentajeRiesgoPadron = computed<number | null>(() => {
    const riesgo = this.alumnosEnRiesgo();
    const total = this.totalEstudiantes();
    if (riesgo === null || total === null || total <= 0) return null;
    return Math.min(100, Math.round((riesgo * 100) / total));
  });

  readonly asistenciaProporciones = computed(() => {
    const a = this.indicadores().asistencia;
    const total = (a.presentes || 0) + (a.tardanzas || 0) + (a.inasistencias || 0);
    if (total <= 0) return { p: 0, t: 0, i: 0, total: 0 };
    const p = Number((((a.presentes || 0) * 100) / total).toFixed(1));
    const t = Number((((a.tardanzas || 0) * 100) / total).toFixed(1));
    const i = Math.max(0, Number((100 - p - t).toFixed(1)));
    return { p, t, i, total };
  });

  ocupacionFilaPorcentaje(fila: SeccionCupoItem): number {
    if (!fila.cupoMaximo || fila.cupoMaximo <= 0) return 0;
    return Math.min(100, Math.round((fila.matriculados * 100) / fila.cupoMaximo));
  }

  readonly cuposPaginaActual = signal<number>(1);
  readonly cuposTamanoPagina = signal<number>(10);
  readonly seccionesCuposPaginadas = computed(() =>
    paginarRegistros(this.seccionesCuposFiltradas(), this.cuposPaginaActual(), this.cuposTamanoPagina())
  );

  cambiarCuposPagina(nuevaPagina: number): void {
    this.cuposPaginaActual.set(nuevaPagina);
  }

  ngOnInit(): void {
    if (this.esDireccion() || this.esSecretaria() || this.esAdministrador()) this.cargarDatosReales();
    if (this.esDireccion() || this.esSecretaria()) {
      this.cargarBandejasOperativas();
    }
    if (this.esDireccion() || this.esAdministrador()) {
      this.inicializarCatalogosIndicadores();
    }
  }

  private tieneRol(rol: string): boolean {
    const s = this.store as unknown as { hasRole?: (r: string) => boolean; hasAnyRole?: (rs: string[]) => boolean };
    if (typeof s.hasRole === 'function') return s.hasRole(rol);
    if (typeof s.hasAnyRole === 'function') return s.hasAnyRole([rol]);
    return false;
  }

  etiquetaRolPrincipal(): string {
    if (this.esDireccion()) return 'Dirección General';
    if (this.esAdministrador()) return 'Administración del Sistema';
    if (this.esSecretaria()) return 'Secretaría Académica';
    if (this.esDocente()) return 'Docente de Aula';
    if (this.esAuxiliar()) return 'Auxiliar de Educación';
    if (this.esTutor()) return 'Tutoría y Convivencia';
    if (this.esApoderado()) return 'Portal Familiar';
    return 'Comunidad Educativa';
  }

  subtituloRolPrincipal(): string {
    if (this.esDireccion()) {
      return 'Resumen institucional: prioriza las decisiones pendientes de admisión y suplencias, y analiza los indicadores académicos e institucionales.';
    }
    if (this.esAdministrador()) {
      return 'Gestiona las solicitudes de cambio (CH-xxx), supervisa las acciones del sistema en auditoría y administra las cuentas de usuarios.';
    }
    if (this.esSecretaria()) {
      return 'Atiende la cola de solicitudes de admisión, registra matrículas presenciales y administra los cobros del día en caja.';
    }
    if (this.esDocente()) {
      return 'Accede directamente a tus clases asignadas, registro de calificaciones CNEB y control de asistencia por sección.';
    }
    if (this.esAuxiliar()) {
      return 'Realiza el pase de lista del turno, registra observaciones de convivencia de hoy y gestiona cobros extraordinarios.';
    }
    if (this.esTutor()) {
      return 'Acompaña el progreso integral de tu sección, revisando alertas de asistencia, conducta y rendimiento.';
    }
    if (this.esApoderado()) {
      return 'Consulta el resumen de asistencia, comunicados escolares y próximo pago del estudiante seleccionado.';
    }
    return 'Este es el resumen de actividad de tu comunidad escolar. Los indicadores se actualizan desde el sistema institucional.';
  }

  alternarVistaTabular(): void {
    this.vistaTabular.update(actual => !actual);
  }

  seleccionarGrupoDesempeno(grupo: NivelLogroConsolidado): void {
    this.grupoPaginaActual.set(1);
    this.grupoSeleccionado.update(actual => (actual === grupo ? null : grupo));
  }

  etiquetaGrupoSeleccionado(): string {
    const g = this.grupoSeleccionado();
    if (g === 'AD') return 'Estudiantes destacados (AD)';
    if (g === 'A') return 'Con logro esperado (A)';
    if (g === 'B') return 'En proceso (B)';
    if (g === 'C') return 'Requieren acompañamiento (C)';
    if (g === 'SIN_EVALUACION') return 'Sin evaluación registrada';
    return '';
  }

  cargarDatosReales(): void {
    this.http.get<ResumenDashboard>(`${environment.apiUrl}/dashboard/resumen`).subscribe({
      next: res => {
        this.anio.set(res?.anio ?? new Date().getFullYear());
        this.totalEstudiantes.set(res?.totalEstudiantes ?? null);
        this.asistenciaHoy.set(res?.asistenciaHoy ?? null);
        this.recaudacionMes.set(res?.recaudacionMes ?? null);
        this.alumnosEnRiesgo.set(res?.alumnosRiesgo ?? null);
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

  private cargarBandejasOperativas(): void {
    this.http.get<Array<{ estado?: string }>>(`${environment.apiUrl}/matricula-publica/admin/solicitudes`).pipe(
      catchError(() => of(null))
    ).subscribe(solicitudes => {
      if (Array.isArray(solicitudes)) {
        const pendientes = solicitudes.filter(s => s.estado !== 'MATRICULADA' && s.estado !== 'RECHAZADA').length;
        this.solicitudesPendientesCount.set(pendientes);
      }
    });

    if (this.esDireccion()) {
      this.http.get<Array<{ estado?: string }>>(`${environment.apiUrl}/suplencias/pendientes`).pipe(
        catchError(() => of(null))
      ).subscribe(suplencias => {
        if (Array.isArray(suplencias)) {
          const pendientes = suplencias.filter(s => s.estado === 'PENDIENTE_APROBACION').length;
          this.suplenciasPendientesCount.set(pendientes);
        }
      });
    }
  }

  private inicializarCatalogosIndicadores(): void {
    this.cargarIndicadoresDireccion();
    this.http.get<AnioLectivoResponseDto[]>(`${environment.apiUrl}/academico/anios`).pipe(
      catchError(() => of([] as AnioLectivoResponseDto[]))
    ).subscribe(anios => {
      const lista = Array.isArray(anios) ? anios : [];
      this.aniosDisponibles.set(lista);
      const anioActual = new Date().getFullYear();
      const activo = lista.find(a => a.abierto && a.anio === anioActual) ?? lista.find(a => a.abierto) ?? lista[0];
      if (activo) {
        this.anioFiltroId = activo.id;
      }
      this.cargarGradosCatalogo();
      this.alCambiarAnioFiltro();
    });
  }

  private cargarGradosCatalogo(): void {
    this.http.get<NivelResponseDto[]>(environment.apiUrl + '/academico/niveles').pipe(
      switchMap(niveles => niveles.length ? forkJoin(niveles.map(nivel =>
        this.http.get<GradoResponseDto[]>(environment.apiUrl + '/academico/grados', { params: { nivelId: nivel.id } }).pipe(
          map(grados => grados.map(grado => ({ ...grado, nivelCodigo: nivel.codigo })))
        )
      )) : of([])),
      catchError(() => of([]))
    ).subscribe(grupos => {
      this.gradosCatalogo.set(grupos.flat());
      this.enriquecerSeccionesCupos();
    });
  }

  private enriquecerSeccionesCupos(): void {
    const secciones = new Map(this.seccionesCatalogo().map(seccion => [seccion.id, seccion]));
    const grados = this.gradosCatalogo();
    const ind = this.indicadores();
    if (!ind?.seccionesCupos?.length) return;
    const actualizadas = ind.seccionesCupos.map(sc => {
      const gradoCatalogo = grados.find(g => g.nombre.toLowerCase().trim() === sc.grado.toLowerCase().trim());
      const gradoId = sc.gradoId || secciones.get(sc.seccionId)?.gradoId || gradoCatalogo?.id || 0;
      const aula = sc.aula === '—' ? (secciones.get(sc.seccionId)?.aulaFisica || '—') : sc.aula;
      return { ...sc, gradoId, aula };
    });
    this.indicadores.update(prev => ({ ...prev, seccionesCupos: actualizadas }));
  }

  alCambiarAnioFiltro(): void {
    const consulta = ++this.consultaCatalogos;
    this.periodoFiltroId = 0;
    this.seccionFiltroId = 0;
    this.periodosDisponibles.set([]);
    this.seccionesCatalogo.set([]);
    this.cargarIndicadoresDireccion();
    if (!this.anioFiltroId) return;
    forkJoin({
      periodos: this.http.get<PeriodoResponseDto[]>(`${environment.apiUrl}/academico/periodos`, { params: { anioId: this.anioFiltroId } }).pipe(catchError(() => of([]))),
      secciones: this.http.get<SeccionResponseDto[]>(`${environment.apiUrl}/academico/secciones`, { params: { anioId: this.anioFiltroId } }).pipe(catchError(() => of([])))
    }).subscribe(({ periodos, secciones }) => {
      if (consulta !== this.consultaCatalogos) return;
      const listaPeriodos = Array.isArray(periodos) ? periodos : [];
      const listaSecciones = Array.isArray(secciones) ? secciones : [];
      this.periodosDisponibles.set(listaPeriodos);
      this.seccionesCatalogo.set(listaSecciones);
      this.enriquecerSeccionesCupos();
    });
  }

  alCambiarNivelFiltro(): void {
    this.gradoFiltroId = 0;
    this.seccionFiltroId = 0;
    this.cargarIndicadoresDireccion();
  }

  alCambiarGradoFiltro(): void {
    this.seccionFiltroId = 0;
    this.cargarIndicadoresDireccion();
  }

  cargarIndicadoresDireccion(): void {
    const consulta = ++this.consultaIndicadores;
    this.indicadoresEstado.set('cargando');
    let params = new HttpParams();
    if (this.anioFiltroId) params = params.set('anioLectivoId', String(this.anioFiltroId));
    if (this.periodoFiltroId) params = params.set('periodoId', String(this.periodoFiltroId));
    if (this.nivelFiltro !== 'TODOS') params = params.set('nivel', this.nivelFiltro);
    if (this.gradoFiltroId) params = params.set('gradoId', String(this.gradoFiltroId));
    if (this.seccionFiltroId) params = params.set('seccionId', String(this.seccionFiltroId));

    this.http.get<IndicadoresBackend>(environment.apiUrl + '/dashboard/indicadores', { params }).subscribe({
      next: respuesta => {
        if (consulta !== this.consultaIndicadores) return;
        if (!respuesta?.desempeno || !respuesta.cobertura || !respuesta.asistenciaCupos) {
          this.indicadoresEstado.set('error');
          return;
        }
        this.indicadores.set(this.normalizarIndicadoresBackend(respuesta));
        this.indicadoresEstado.set('listo');
      },
      error: () => {
        if (consulta === this.consultaIndicadores) this.indicadoresEstado.set('error');
      }
    });
  }

  private normalizarIndicadoresBackend(raw: IndicadoresBackend): IndicadoresDireccionDto {
    const d = raw.desempeno;
    const a = raw.asistenciaCupos;
    const secciones = new Map(this.seccionesCatalogo().map(seccion => [seccion.id, seccion]));
    const grados = this.gradosCatalogo();
    return {
      desempeno: { AD: d.destacados, A: d.logroEsperado, B: d.enProceso, C: d.requierenAcompanamiento },
      cobertura: raw.cobertura,
      asistencia: {
        porcentajePeriodo: a.porcentajeAsistencia,
        variacionPeriodoAnterior: a.variacionPeriodoAnterior,
        tieneCortePrevio: a.variacionPeriodoAnterior !== null,
        presentes: a.presentes,
        tardanzas: a.tardanzas,
        inasistencias: a.inasistencias,
        faltasJustificadas: a.faltasJustificadas,
        faltasInjustificadas: a.faltasInjustificadas
      },
      seccionesCupos: a.secciones.map(seccion => {
        const gradoCatalogo = grados.find(g => g.nombre.toLowerCase().trim() === seccion.gradoNombre.toLowerCase().trim());
        const gradoId = secciones.get(seccion.seccionId)?.gradoId ?? gradoCatalogo?.id ?? 0;
        return {
          seccionId: seccion.seccionId,
          nivel: seccion.nivel,
          gradoId,
          grado: seccion.gradoNombre,
          seccion: seccion.seccionNombre,
          aula: secciones.get(seccion.seccionId)?.aulaFisica || '—',
          matriculados: seccion.matriculados,
          cupoMaximo: seccion.cupoMaximo,
          vacantesDisponibles: seccion.vacantesDisponibles
        };
      }),
      estudiantesDetalle: d.estudiantes.map(estudiante => ({
        matriculaId: estudiante.matriculaId,
        nombreCompleto: estudiante.estudianteNombre,
        grado: estudiante.gradoSeccion,
        nivelLogro: estudiante.nivelLogro
      }))
    };
  }
}
