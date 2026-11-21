import { A11yModule } from '@angular/cdk/a11y';
import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';
import { HijoPortalDto, PortalFamiliarService } from '../../core/services/portal-familiar.service';
import { MatriculaPublicaService } from '../../core/services/matricula-publica.service';
import { CrearSuplencia, SuplenciaDto, SuplenciaService } from '../../core/services/suplencia.service';
import { AuthStore } from '../../core/state/auth.store';
import { fechaActualEnPeru } from '../../core/utils/fecha-nacimiento';
import { FormatoEntradaDirective } from '../../shared/ui/formato-entrada.directive';
import { StatusBadgeComponent } from '../../shared/ui/status-badge.component';
import { UiCalendarComponent } from '../../shared/ui/ui-calendar.component';
import { UiDatePePipe } from '../../shared/ui/ui-date-pe.pipe';
import { Stage9State, Stage9SubstituteDraft } from './stage9.contract';
import { vistaSuplencia } from './suplencia-view';
import { SuplenteApoderadoComponent } from './suplente-apoderado.component';

@Component({
  selector: 'app-suplente-apoderado-page',
  standalone: true,
  imports: [
    CommonModule,
    A11yModule,
    FormatoEntradaDirective,
    FormsModule,
    RouterLink,
    SuplenteApoderadoComponent,
    StatusBadgeComponent,
    UiCalendarComponent,
    UiDatePePipe
  ],
  template: `
  @if (apoderado()) {
    <section class="mx-auto w-full max-w-[1360px] px-4 pt-4 pb-2 sm:px-6 sm:pt-6 font-sans text-ui-text space-y-5" aria-labelledby="suplencia-page-titulo">
      <header class="border-t-[3px] border-t-ui-gold pt-3">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="m-0 text-[11px] leading-[1.4] tracking-[.08em] font-bold text-ui-muted uppercase">
              Seguridad y recojo escolar · Autorización familiar
            </p>
            <h1 id="suplencia-page-titulo" class="m-0 mt-1 font-display text-[26px] sm:text-[28px] leading-[1.25] font-bold text-[#14213d] tracking-[-.025em]">
              Designación de suplente autorizado
            </h1>
            <p class="m-0 mt-1 text-[13px] leading-[1.5] text-slate-600 max-w-3xl">
              Acredita formalmente a un adulto responsable para recoger al estudiante durante el periodo indicado. La autorización no reemplaza la tutela legal y entra en vigor tras su validación por Dirección.
            </p>
          </div>
          <a routerLink="/admin/portal-apoderado" class="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-[#173B67] no-underline hover:bg-slate-50 shadow-2xs">
            ← Volver al Portal familiar
          </a>
        </div>
      </header>

      <!-- Tarjetas ejecutivas resumen -->
      <section class="grid grid-cols-1 sm:grid-cols-3 gap-3" aria-label="Resumen de autorizaciones de recojo">
        <article class="rounded-2xl border border-slate-200 border-t-4 border-t-emerald-600 bg-white p-4 shadow-2xs">
          <span class="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Autorizaciones activas</span>
          <strong class="mt-1 block text-2xl font-extrabold text-[#14213d] tabular-nums">{{ activasCount() }}</strong>
          <span class="mt-0.5 block text-xs text-emerald-700 font-medium">Habilitadas para control de puerta</span>
        </article>
        <article class="rounded-2xl border border-slate-200 border-t-4 border-t-amber-500 bg-white p-4 shadow-2xs">
          <span class="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Pendientes de evaluación</span>
          <strong class="mt-1 block text-2xl font-extrabold text-[#14213d] tabular-nums">{{ pendientesCount() }}</strong>
          <span class="mt-0.5 block text-xs text-amber-700 font-medium">En revisión por Dirección</span>
        </article>
        <article class="rounded-2xl border border-slate-200 border-t-4 border-t-[#173B67] bg-white p-4 shadow-2xs">
          <span class="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Historial total registrado</span>
          <strong class="mt-1 block text-2xl font-extrabold text-[#14213d] tabular-nums">{{ solicitudes().length }}</strong>
          <span class="mt-0.5 block text-xs text-slate-500">Solicitudes emitidas por tu cuenta</span>
        </article>
      </section>

      @if (mensaje()) {
        <div
          role="status"
          class="flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm font-semibold"
          [class.border-emerald-200]="!mensajeEsError()"
          [class.bg-emerald-50]="!mensajeEsError()"
          [class.text-emerald-900]="!mensajeEsError()"
          [class.border-rose-200]="mensajeEsError()"
          [class.bg-rose-50]="mensajeEsError()"
          [class.text-rose-900]="mensajeEsError()"
        >
          <span>{{ mensaje() }}</span>
          <button type="button" (click)="mensaje.set('')" class="border-0 bg-transparent text-lg leading-none font-bold text-current cursor-pointer" aria-label="Ocultar aviso">×</button>
        </div>
      }

      <!-- Formulario institucional estructurado en 2 bloques -->
      <form
        class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[var(--ui-card-shadow)]"
        (ngSubmit)="solicitar()"
        aria-label="Solicitar suplencia temporal"
      >
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-[#f8fafc] px-5 py-4">
          <div>
            <p class="m-0 text-[11px] font-bold uppercase tracking-wider text-[#173B67]">Formulario de acreditación</p>
            <h2 class="m-0 mt-0.5 font-display text-lg font-bold text-[#14213d]">Registrar nueva autorización temporal</h2>
          </div>
          <span class="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
            Protocolo de Seguridad Escolar
          </span>
        </div>

        <div class="p-5 sm:p-6 space-y-5">
          <!-- Bloque 1: Estudiante y vigencia -->
          <div class="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-4">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <h3 class="m-0 text-sm font-bold text-[#14213d]">1. Estudiante y periodo de vigencia</h3>
              <span class="rounded-full bg-white border border-slate-200 px-2.5 py-0.5 text-xs font-semibold text-[#173B67] tabular-nums">
                Duración: {{ duracionDias() }} día{{ duracionDias() === 1 ? '' : 's' }}
              </span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label class="md:col-span-2 grid gap-1.5 text-xs font-semibold text-slate-700">
                Estudiante matriculado *
                <select
                  name="estudiante"
                  [(ngModel)]="draft.estudianteId"
                  class="min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-[#14213d] focus:border-[#173B67] focus:outline-none"
                  required
                >
                  <option [ngValue]="0">Selecciona al estudiante</option>
                  @for (h of hijosUnicos(); track h.estudianteId) {
                    <option [ngValue]="h.estudianteId">
                      {{ h.nombres }} {{ h.apellidoPaterno }} {{ h.apellidoMaterno }} · {{ h.grado }} {{ h.seccion }}
                    </option>
                  }
                </select>
              </label>

              <div class="md:col-span-2 flex flex-wrap items-center gap-2">
                <span class="text-xs font-semibold text-slate-600 mr-1">Vigencia rápida (1 clic):</span>
                @for (preset of presetsVigencia; track preset.dias) {
                  <button
                    type="button"
                    (click)="aplicarVigenciaRapida(preset.dias)"
                    class="min-h-9 rounded-lg border px-3 py-1 text-xs font-bold transition cursor-pointer"
                    [class.border-[#173B67]]="esPresetActivo(preset.dias)"
                    [class.bg-[#173B67]]="esPresetActivo(preset.dias)"
                    [class.text-white]="esPresetActivo(preset.dias)"
                    [class.border-slate-300]="!esPresetActivo(preset.dias)"
                    [class.bg-white]="!esPresetActivo(preset.dias)"
                    [class.text-slate-700]="!esPresetActivo(preset.dias)"
                  >
                    {{ preset.label }}
                  </button>
                }
              </div>

              <label class="grid gap-1.5 text-xs font-semibold text-slate-700">
                Fecha de inicio *
                <app-ui-calendar name="inicio" [(ngModel)]="draft.fechaInicio" (ngModelChange)="sincronizarRangoFechas()" [min]="hoy" [required]="true" aria-label="Fecha de inicio"></app-ui-calendar>
              </label>

              <label class="grid gap-1.5 text-xs font-semibold text-slate-700">
                Fecha de término *
                <app-ui-calendar name="fin" [(ngModel)]="draft.fechaFin" [min]="draft.fechaInicio || hoy" [required]="true" aria-label="Fecha de fin"></app-ui-calendar>
              </label>
            </div>
          </div>

          <!-- Bloque 2: Identidad y vínculo -->
          <div class="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-4">
            <h3 class="m-0 text-sm font-bold text-[#14213d]">2. Identidad y parentesco del adulto autorizado</h3>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
                <label class="grid min-w-0 gap-1.5 text-xs font-semibold text-slate-700">
                  DNI del suplente *
                  <input
                    appFormatoEntrada="dni"
                    class="min-h-11 min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-mono text-[#14213d] focus:border-[#173B67] focus:outline-none"
                    name="dni"
                    [(ngModel)]="draft.numeroDocumento"
                    pattern="[0-9]{8}"
                    maxlength="8"
                    inputmode="numeric"
                    placeholder="8 dígitos"
                    required
                  />
                </label>
                <button
                  class="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[#173B67]/30 bg-white px-3 text-xs font-bold text-[#173B67] transition hover:bg-slate-100 disabled:opacity-50 cursor-pointer"
                  type="button"
                  (click)="consultarDniSuplente()"
                  [disabled]="consultandoDni()"
                >
                  {{ consultandoDni() ? 'Consultando…' : 'Consultar DNI' }}
                </button>
              </div>

              <label class="grid gap-1.5 text-xs font-semibold text-slate-700">
                Parentesco / vínculo *
                <select
                  name="parentesco"
                  [(ngModel)]="draft.parentesco"
                  class="min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-[#14213d] focus:border-[#173B67] focus:outline-none"
                  required
                >
                  <option value="">Selecciona parentesco</option>
                  @for (p of parentescosComunes; track p) {
                    <option [value]="p">{{ p }}</option>
                  }
                  @if (draft.parentesco && !parentescosComunes.includes(draft.parentesco)) {
                    <option [value]="draft.parentesco">{{ draft.parentesco }}</option>
                  }
                </select>
              </label>

              <label class="grid gap-1.5 text-xs font-semibold text-slate-700">
                Celular de contacto (9 dígitos) *
                <input
                  appFormatoEntrada="celular"
                  class="min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-mono text-[#14213d] focus:border-[#173B67] focus:outline-none"
                  name="celular"
                  [(ngModel)]="draft.celular"
                  maxlength="9"
                  pattern="9[0-9]{8}"
                  inputmode="tel"
                  placeholder="9XXXXXXXX"
                  required
                />
              </label>

              @if (mensajeDni()) {
                <p class="md:col-span-3 m-0 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-900" role="status" aria-live="polite">
                  {{ mensajeDni() }}
                </p>
              }

              <label class="grid gap-1.5 text-xs font-semibold text-slate-700">
                Nombres *
                <input
                  appFormatoEntrada="nombre"
                  class="min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-[#14213d] focus:border-[#173B67] focus:outline-none"
                  name="nombres"
                  [(ngModel)]="draft.nombres"
                  maxlength="30"
                  placeholder="Nombres del adulto"
                  required
                />
              </label>

              <label class="grid gap-1.5 text-xs font-semibold text-slate-700">
                Apellido paterno *
                <input
                  appFormatoEntrada="nombre"
                  class="min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-[#14213d] focus:border-[#173B67] focus:outline-none"
                  name="paterno"
                  [(ngModel)]="draft.apellidoPaterno"
                  maxlength="30"
                  placeholder="Apellido paterno"
                  required
                />
              </label>

              <label class="grid gap-1.5 text-xs font-semibold text-slate-700">
                Apellido materno *
                <input
                  appFormatoEntrada="nombre"
                  class="min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-[#14213d] focus:border-[#173B67] focus:outline-none"
                  name="materno"
                  [(ngModel)]="draft.apellidoMaterno"
                  maxlength="30"
                  placeholder="Apellido materno"
                  required
                />
              </label>
            </div>
          </div>

          <div class="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
            <p class="m-0 text-xs text-slate-500">
              Dirección evaluará la autorización y notificará su conformidad en el historial inferior.
            </p>
            <div class="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                (click)="limpiarFormulario()"
                class="min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Limpiar
              </button>
              <button
                class="min-h-11 rounded-xl bg-[#173B67] hover:bg-[#1e4b82] px-5 py-2 text-sm font-bold text-white shadow-xs transition disabled:opacity-50 cursor-pointer"
                type="submit"
                [disabled]="ocupado() || !hijosUnicos().length"
              >
                {{ ocupado() ? 'Registrando solicitud…' : 'Registrar autorización' }}
              </button>
            </div>
          </div>
        </div>
      </form>
    </section>

    <app-suplente-apoderado-screen
      [hideHeader]="true"
      [showForm]="false"
      [state]="estado()"
      [requests]="solicitudesVista()"
      [errorMessage]="mensaje()"
      [draft]="draftReutilizable()"
      [dniLookupBusy]="consultandoDni()"
      [dniLookupMessage]="mensajeDni()"
      (draftChange)="draftReutilizable.set($event)"
      (dniLookupRequested)="consultarDniReutilizable($event)"
      (detailsRequested)="verDetalle($event)"
      (retry)="cargar()"
    />

    <!-- Modal formal centrado para detalle de suplencia -->
    @if (detalle(); as s) {
      <div
        class="fixed inset-0 z-[2200] flex items-center justify-center bg-[#0c192b]/60 p-3 sm:p-5 backdrop-blur-[2px]"
        (click)="detalle.set(null)"
        (keydown.escape)="detalle.set(null)"
      >
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-suplencia-detalle-titulo"
          cdkTrapFocus
          (click)="$event.stopPropagation()"
          class="flex max-h-[88dvh] w-full max-w-[580px] flex-col overflow-hidden rounded-2xl border border-slate-300 bg-white p-0 shadow-[0_28px_90px_rgb(12_25_43_/_38%)]"
        >
          <header class="shrink-0 flex items-start justify-between gap-4 border-b border-slate-200 border-t-4 border-t-[#173B67] bg-white px-5 py-4">
            <div class="min-w-0">
              <p class="m-0 text-[11px] font-bold uppercase tracking-wider text-slate-500">Ficha de autorización de recojo</p>
              <h3 id="modal-suplencia-detalle-titulo" class="m-0 mt-1 text-lg font-extrabold text-[#14213d]">
                {{ s.nombres }} {{ s.apellidoPaterno }} {{ s.apellidoMaterno }}
              </h3>
            </div>
            <button
              type="button"
              (click)="detalle.set(null)"
              aria-label="Cerrar ficha de suplencia"
              class="h-10 w-10 shrink-0 rounded-xl border border-slate-200 bg-slate-50 text-base font-bold text-slate-700 hover:bg-slate-200 cursor-pointer"
            >
              ✕
            </button>
          </header>

          <div class="min-h-0 flex-1 overflow-y-auto p-5 space-y-4 bg-white">
            <div class="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <span class="text-xs font-bold uppercase tracking-wider text-slate-500">Estado actual</span>
              <ui-status-badge [label]="s.estado.replaceAll('_', ' ')" [tone]="toneDetalle(s.estado)" />
            </div>

            <dl class="m-0 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div class="rounded-xl border border-slate-200 p-3">
                <dt class="text-[11px] font-bold uppercase tracking-wider text-slate-500">Estudiante</dt>
                <dd class="m-0 mt-1 font-semibold text-[#14213d]">{{ nombreEstudiante(s.estudianteId) }}</dd>
              </div>
              <div class="rounded-xl border border-slate-200 p-3">
                <dt class="text-[11px] font-bold uppercase tracking-wider text-slate-500">DNI del suplente</dt>
                <dd class="m-0 mt-1 font-mono font-semibold text-[#14213d]">{{ s.numeroDocumento }}</dd>
              </div>
              <div class="rounded-xl border border-slate-200 p-3">
                <dt class="text-[11px] font-bold uppercase tracking-wider text-slate-500">Parentesco</dt>
                <dd class="m-0 mt-1 font-semibold text-[#14213d]">{{ s.parentesco || 'Familiar autorizado' }}</dd>
              </div>
              <div class="rounded-xl border border-slate-200 p-3">
                <dt class="text-[11px] font-bold uppercase tracking-wider text-slate-500">Celular de contacto</dt>
                <dd class="m-0 mt-1 font-mono font-semibold text-[#14213d]">{{ s.celular }}</dd>
              </div>
              <div class="sm:col-span-2 rounded-xl border border-slate-200 p-3">
                <dt class="text-[11px] font-bold uppercase tracking-wider text-slate-500">Periodo de vigencia autorizado</dt>
                <dd class="m-0 mt-1 font-semibold text-[#14213d]">
                  {{ s.fechaInicio | uiDatePe }} al {{ s.fechaFin | uiDatePe }}
                </dd>
              </div>
            </dl>

            <div class="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5">
              <span class="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Observación / Resolución de Dirección</span>
              <p class="m-0 mt-1 text-sm text-slate-700 leading-relaxed">
                {{ s.motivoResolucion || 'Pendiente de revisión o sin observaciones adicionales registradas.' }}
              </p>
            </div>
          </div>

          <footer class="shrink-0 flex justify-end border-t border-slate-200 bg-slate-50 px-5 py-3.5">
            <button
              type="button"
              (click)="detalle.set(null)"
              class="min-h-10 rounded-xl bg-[#173B67] px-4 py-2 text-sm font-bold text-white hover:bg-[#1e4b82] cursor-pointer"
            >
              Cerrar ficha
            </button>
          </footer>
        </section>
      </div>
    }
  } @else {
    <section class="mx-auto max-w-2xl p-6">
      <div class="rounded-2xl border border-slate-200 bg-white p-6 space-y-3 shadow-xs">
        <p class="m-0 text-sm text-slate-700">La solicitud debe registrarla el apoderado titular desde su cuenta.</p>
        <a class="inline-flex min-h-11 items-center rounded-xl border border-[#173B67]/30 bg-[#173B67] px-4 py-2 text-sm font-bold text-white no-underline hover:bg-[#1e4b82]" routerLink="/admin/aprobacion-suplencias">
          Ir a gestión de suplentes
        </a>
      </div>
    </section>
  }
`
})
export class SuplenteApoderadoPageComponent implements OnInit {
  private readonly portal = inject(PortalFamiliarService);
  private readonly servicio = inject(SuplenciaService);
  private readonly matriculaPublica = inject(MatriculaPublicaService);
  private readonly store = inject(AuthStore);
  readonly parentescosComunes = [
    'Abuelo(a)',
    'Tío(a)',
    'Hermano(a) mayor de edad',
    'Primo(a) mayor de edad',
    'Apoderado alterno / Familiar responsable',
    'Tutor familiar autorizado'
  ];
  readonly presetsVigencia = [
    { label: 'Solo hoy', dias: 0 },
    { label: '3 días', dias: 2 },
    { label: '1 semana', dias: 6 },
    { label: '15 días', dias: 14 },
    { label: '1 mes', dias: 29 }
  ];
  readonly hijos = signal<HijoPortalDto[]>([]);
  readonly solicitudes = signal<SuplenciaDto[]>([]);
  readonly detalle = signal<SuplenciaDto | null>(null);
  readonly estado = signal<Stage9State>('loading');
  readonly mensaje = signal('');
  readonly mensajeEsError = signal(false);
  readonly mensajeDni = signal('');
  readonly consultandoDni = signal(false);
  readonly draftReutilizable = signal<Stage9SubstituteDraft>({
    studentId: null,
    fullName: '',
    dni: '',
    relationship: '',
    phone: '',
    startDate: '',
    endDate: ''
  });
  readonly ocupado = signal(false);
  readonly hoy = fechaActualEnPeru();
  readonly hijosUnicos = computed(() => Array.from(new Map(this.hijos().map(h => [h.estudianteId, h])).values()));
  readonly solicitudesVista = computed(() => this.solicitudes().map(s => vistaSuplencia(s, this.hijos())));
  readonly activasCount = computed(() => this.solicitudes().filter(s => s.estado === 'ACTIVO').length);
  readonly pendientesCount = computed(() => this.solicitudes().filter(s => s.estado === 'PENDIENTE_APROBACION').length);
  draft: CrearSuplencia = {
    estudianteId: 0,
    numeroDocumento: '',
    nombres: '',
    apellidoPaterno: '',
    apellidoMaterno: '',
    parentesco: '',
    celular: '',
    fechaInicio: this.hoy,
    fechaFin: this.hoy
  };

  apoderado() { return this.store.hasRole('APODERADO'); }

  ngOnInit() {
    if (this.apoderado()) this.cargar();
  }

  cargar() {
    this.estado.set('loading');
    forkJoin({ hijos: this.portal.hijosPropios(), solicitudes: this.servicio.misSolicitudes() }).subscribe({
      next: d => {
        this.hijos.set(d.hijos);
        this.solicitudes.set(d.solicitudes);
        if (!this.draft.estudianteId && this.hijosUnicos().length === 1) {
          this.draft.estudianteId = this.hijosUnicos()[0].estudianteId;
        }
        this.estado.set(d.solicitudes.length ? 'normal' : 'empty');
      },
      error: e => {
        this.estado.set('error');
        this.mensajeEsError.set(true);
        this.mensaje.set(e?.error?.message ?? 'No se pudieron cargar las solicitudes.');
      }
    });
  }

  aplicarVigenciaRapida(dias: number): void {
    this.draft.fechaInicio = this.hoy;
    this.draft.fechaFin = this.sumarDiasPeru(this.hoy, dias);
  }

  sincronizarRangoFechas(): void {
    if (this.draft.fechaInicio && (!this.draft.fechaFin || this.draft.fechaFin < this.draft.fechaInicio)) {
      this.draft.fechaFin = this.draft.fechaInicio;
    }
  }

  esPresetActivo(dias: number): boolean {
    return this.draft.fechaInicio === this.hoy && this.draft.fechaFin === this.sumarDiasPeru(this.hoy, dias);
  }

  duracionDias(): number {
    if (!this.draft.fechaInicio || !this.draft.fechaFin || this.draft.fechaFin < this.draft.fechaInicio) return 0;
    const [y1, m1, d1] = this.draft.fechaInicio.split('-').map(Number);
    const [y2, m2, d2] = this.draft.fechaFin.split('-').map(Number);
    const diff = Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
    return Math.max(1, diff + 1);
  }

  private sumarDiasPeru(baseIso: string, dias: number): string {
    const [y, m, d] = baseIso.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d + dias)).toISOString().slice(0, 10);
  }

  limpiarFormulario(): void {
    const unicoEstudiante = this.hijosUnicos().length === 1 ? this.hijosUnicos()[0].estudianteId : 0;
    this.draft = {
      estudianteId: unicoEstudiante,
      numeroDocumento: '',
      nombres: '',
      apellidoPaterno: '',
      apellidoMaterno: '',
      parentesco: '',
      celular: '',
      fechaInicio: this.hoy,
      fechaFin: this.hoy
    };
    this.mensajeDni.set('');
    this.mensaje.set('');
  }

  nombreEstudiante(estudianteId: number): string {
    const h = this.hijos().find(item => item.estudianteId === estudianteId);
    return h ? `${h.nombres} ${h.apellidoPaterno} ${h.apellidoMaterno}`.trim() : `Estudiante #${estudianteId}`;
  }

  toneDetalle(estado: SuplenciaDto['estado']): 'success' | 'warning' | 'error' | 'info' {
    return estado === 'ACTIVO' ? 'success' : estado === 'VENCIDO' || estado === 'RECHAZADO' || estado === 'REVOCADO' ? 'error' : 'warning';
  }

  consultarDniSuplente() {
    const dni = this.draft.numeroDocumento.trim();
    if (!/^\d{8}$/.test(dni)) {
      this.mensajeDni.set('Ingresa un DNI de 8 dígitos.');
      return;
    }
    this.mensajeDni.set('');
    this.consultandoDni.set(true);
    this.matriculaPublica.consultarDni(dni).pipe(finalize(() => this.consultandoDni.set(false))).subscribe({
      next: identidad => {
        if (this.draft.numeroDocumento.trim() !== dni) return;
        this.draft.nombres = identidad.nombres ?? '';
        this.draft.apellidoPaterno = identidad.apellidoPaterno ?? '';
        this.draft.apellidoMaterno = identidad.apellidoMaterno ?? '';
        this.mensajeDni.set('Nombres y apellidos validados en RENIEC. Verifica los datos con el suplente.');
      },
      error: error => this.mensajeDni.set(error?.error?.message ?? 'No fue posible consultar este DNI; verifica el número o inténtalo luego.')
    });
  }

  consultarDniReutilizable(dni: string) {
    if (!/^\d{8}$/.test(dni)) {
      this.mensajeDni.set('Ingresa un DNI de 8 dígitos.');
      return;
    }
    this.mensajeDni.set('');
    this.consultandoDni.set(true);
    this.matriculaPublica.consultarDni(dni).pipe(finalize(() => this.consultandoDni.set(false))).subscribe({
      next: identidad => {
        if (this.draftReutilizable().dni !== dni) return;
        this.draftReutilizable.update(draft => ({
          ...draft,
          fullName: `${identidad.nombres} ${identidad.apellidoPaterno} ${identidad.apellidoMaterno}`.trim()
        }));
        this.mensajeDni.set('Nombre consultado. Verifica los datos con el suplente.');
      },
      error: error => this.mensajeDni.set(error?.error?.message ?? 'No fue posible consultar este DNI; verifica el número o inténtalo luego.')
    });
  }

  solicitar() {
    if (this.ocupado() || !this.hijosUnicos().some(h => h.estudianteId === Number(this.draft.estudianteId))) {
      this.mensajeEsError.set(true);
      this.mensaje.set('Selecciona al estudiante matriculado antes de registrar la autorización.');
      return;
    }
    if (
      !/^\d{8}$/.test(this.draft.numeroDocumento) ||
      !/^9\d{8}$/.test(this.draft.celular) ||
      !this.draft.nombres.trim() ||
      !this.draft.apellidoPaterno.trim() ||
      !this.draft.apellidoMaterno.trim() ||
      !this.draft.parentesco.trim() ||
      this.draft.fechaInicio < this.hoy ||
      this.draft.fechaFin < this.draft.fechaInicio
    ) {
      this.mensajeEsError.set(true);
      this.mensaje.set('Revisa el DNI (8 dígitos), nombres, parentesco, celular (9 dígitos) y el rango de fechas.');
      return;
    }
    this.ocupado.set(true);
    this.mensajeEsError.set(false);
    this.servicio.solicitar({ ...this.draft, estudianteId: Number(this.draft.estudianteId) }).subscribe({
      next: () => {
        this.ocupado.set(false);
        this.limpiarFormulario();
        this.mensajeEsError.set(false);
        this.mensaje.set('Autorización registrada correctamente. Queda en evaluación institucional por Dirección.');
        this.cargar();
      },
      error: e => {
        this.ocupado.set(false);
        this.mensajeEsError.set(true);
        this.mensaje.set(e?.error?.message ?? 'No se pudo registrar la solicitud.');
      }
    });
  }

  verDetalle(id: number) {
    this.detalle.set(this.solicitudes().find(s => s.id === id) ?? null);
  }
}
