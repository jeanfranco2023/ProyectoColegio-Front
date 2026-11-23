import { FormatoEntradaDirective } from '../../shared/ui/formato-entrada.directive';
import { A11yModule } from '@angular/cdk/a11y';
import { Component, ElementRef, inject, signal, computed, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { StatusBadgeComponent } from '../../shared/ui/status-badge.component';
import { TesoreriaService } from '../../core/services/tesoreria.service';
import { ConceptoCobroResponseDto, ConceptoExtraordinario, MatriculaParaCobro, TipoConcepto } from '../../core/models/tesoreria.model';
import { AuthStore } from '../../core/state/auth.store';
import { UiDatePePipe } from '../../shared/ui/ui-date-pe.pipe';
import { UiCalendarComponent } from '../../shared/ui/ui-calendar.component';
import { UiPaginacionComponent, paginarRegistros } from '../../shared/ui/ui-paginacion.component';
import { PagoSimuladoEvent, SimuladorCheckoutComponent } from '../../shared/ui/simulador-checkout.component';
import { fechaActualEnPeru } from '../../core/utils/fecha-nacimiento';

export type EstadoPago = 'PAGADO_TOTAL' | 'PAGADO_PARCIAL' | 'PENDIENTE' | 'VENCIDO' | 'CANCELADO_POR_TRASLADO' | 'SIN_ESTADO';

export interface ObligacionCobro {
  id: number;
  matriculaId: number;
  estudiante: string;
  concepto: string;
  tipoConcepto?: TipoConcepto;
  monto: number;
  saldoPendiente: number;
  totalPagado: number;
  fechaVencimiento: string;
  estado: EstadoPago;
}

@Component({
  selector: 'app-tesoreria',
  standalone: true,
  imports: [FormatoEntradaDirective, A11yModule, CommonModule, FormsModule, StatusBadgeComponent, UiDatePePipe, UiCalendarComponent, UiPaginacionComponent, SimuladorCheckoutComponent],
template: `
    <div class="space-y-6 grid min-w-0 gap-[22px] text-ui-text font-sans max-[600px]:gap-4">
      <!-- Header Ejecutivo Azul Noche -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-[#1E3A8A]/40 bg-gradient-to-r from-[#0A192F] via-[#0F294D] to-[#173B67] p-6 text-white shadow-md">
        <div>
          <span class="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-sky-100">
            {{ gestionaExtraordinarios() ? 'Gestión Financiera Institucional' : 'Pagos Seguros · Mercado Pago' }}
          </span>
          <h2 class="mt-2 mb-0 font-sans text-2xl sm:text-3xl font-extrabold tracking-tight text-white">Tesorería &amp; Pagos</h2>
          <p class="text-sm text-slate-200 mt-1.5 mb-0">
            @if (esSecretaria()) { Operación de caja, pagos por adelantado y pasarela digital Mercado Pago. }
            @else if (esAdministrativo()) { Consulta de obligaciones, conceptos automáticos y estados de cuenta. }
            @else if (esAuxiliar()) { Gestión de cobros extraordinarios. }
            @else { Consulta tus cuotas pendientes, descarga boletas y paga en línea o por adelantado con Mercado Pago. }
          </p>
        </div>
        @if (esSecretaria() || esAdministrativo() || gestionaExtraordinarios()) {
        <div class="flex w-full min-w-0 flex-wrap items-center gap-3 sm:w-auto">
          @if (gestionaExtraordinarios()) {
            <button
              type="button"
              id="btn-abrir-cobros-extraordinarios"
              data-testid="btn-abrir-cobros-extraordinarios"
              (click)="abrirModalExtraordinarios()"
              class="box-border inline-flex w-full min-h-[44px] min-w-0 cursor-pointer items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 font-sans text-xs font-bold leading-[1.25] text-[#0F294D] shadow-sm transition hover:bg-slate-100 sm:w-auto sm:text-sm"
            >
              <svg class="size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m6-6H6" />
              </svg>
              <span>Cobros extraordinarios</span>
              @if (extrasActivos().length > 0) {
                <span class="inline-flex min-w-[22px] items-center justify-center rounded-full bg-[#0F294D] px-2 py-0.5 text-[11px] font-bold text-white">
                  {{ extrasActivos().length }}
                </span>
              }
            </button>
          }
          @if (esSecretaria() || esAdministrativo()) {
            <button
              type="button"
              id="btn-generar-cuota-matricula"
              (click)="abrirModalCuotaMatricula()"
              class="box-border inline-flex w-full min-h-[44px] min-w-0 cursor-pointer items-center justify-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-600 px-4 py-2.5 font-sans text-xs font-bold leading-[1.25] text-white shadow-sm transition hover:bg-emerald-500 sm:w-auto sm:text-sm"
            >
              Generar cuota de matrícula
            </button>
          }
        </div>
        }
      </div>

      <!-- Vistas separadas de Tesorería (Hito 3) -->
      <nav class="flex flex-wrap items-center gap-2 border-b border-ui-divider pb-2" aria-label="Vistas de tesorería">
        <button
          type="button"
          id="tab-tesoreria-por-cobrar"
          (click)="cambiarVistaTesoreria('por-cobrar')"
          [class]="vistaActiva() === 'por-cobrar'
            ? 'rounded-xl bg-[#173B67] px-4 py-2.5 text-sm font-bold text-white shadow-xs cursor-pointer min-h-[44px]'
            : 'rounded-xl border border-ui-divider bg-ui-surface px-4 py-2.5 text-sm font-semibold text-ui-text hover:bg-ui-surface-soft cursor-pointer min-h-[44px]'"
        >
          Por cobrar
        </button>
        <button
          type="button"
          id="tab-tesoreria-caja-dia"
          (click)="cambiarVistaTesoreria('caja-dia')"
          [class]="vistaActiva() === 'caja-dia'
            ? 'rounded-xl bg-[#173B67] px-4 py-2.5 text-sm font-bold text-white shadow-xs cursor-pointer min-h-[44px]'
            : 'rounded-xl border border-ui-divider bg-ui-surface px-4 py-2.5 text-sm font-semibold text-ui-text hover:bg-ui-surface-soft cursor-pointer min-h-[44px]'"
        >
          Caja del día
        </button>
        <button
          type="button"
          id="tab-tesoreria-comprobantes"
          (click)="cambiarVistaTesoreria('comprobantes')"
          [class]="vistaActiva() === 'comprobantes'
            ? 'rounded-xl bg-[#173B67] px-4 py-2.5 text-sm font-bold text-white shadow-xs cursor-pointer min-h-[44px]'
            : 'rounded-xl border border-ui-divider bg-ui-surface px-4 py-2.5 text-sm font-semibold text-ui-text hover:bg-ui-surface-soft cursor-pointer min-h-[44px]'"
        >
          Comprobantes emitidos
        </button>
      </nav>

      <!-- Modal de Cobros Extraordinarios (Dirección / Secretaría / Auxiliar) -->
      @if (gestionaExtraordinarios() && modalExtraordinariosAbierto()) {
        <div
          class="fixed inset-0 z-[2200] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-xs sm:p-5"
          (click)="cerrarModalExtraordinarios()"
          (keydown.escape)="cerrarModalExtraordinarios()"
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-extraordinarios"
            cdkTrapFocus
            (click)="$event.stopPropagation()"
            class="shuji-modal-3d-enter flex max-h-[min(90dvh,820px)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <header class="shrink-0 flex items-start justify-between gap-4 border-b border-slate-200 bg-gradient-to-r from-[#173B67] via-[#1d4b82] to-[#245996] px-6 py-5 text-white">
              <div class="min-w-0">
                <span class="inline-flex items-center rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-sky-100">
                  Gestión de cobros adicionales
                </span>
                <h3 id="titulo-extraordinarios" class="m-0 mt-1.5 font-display text-xl font-bold text-white sm:text-2xl">
                  Cobros extraordinarios
                </h3>
                <p class="m-0 mt-1 text-xs text-slate-200 sm:text-sm">
                  Asigna un cargo del catálogo a estudiantes matriculados o administra los conceptos institucionales.
                </p>
              </div>
              <button
                type="button"
                (click)="cerrarModalExtraordinarios()"
                aria-label="Cerrar modal de cobros extraordinarios"
                class="grid size-10 shrink-0 place-items-center rounded-xl border border-white/20 bg-white/10 text-base font-bold text-white transition hover:bg-white/20 cursor-pointer"
              >
                ✕
              </button>
            </header>

            @if (esAdministrativo()) {
              <div class="shrink-0 flex flex-wrap gap-2 border-b border-slate-200 bg-slate-50 px-6 py-3" role="tablist" aria-label="Opciones de cobros extraordinarios">
                <button
                  type="button"
                  role="tab"
                  [attr.aria-selected]="tabExtraordinarios() === 'asignar'"
                  (click)="tabExtraordinarios.set('asignar')"
                  [class]="tabExtraordinarios() === 'asignar'
                    ? 'min-h-10 rounded-xl bg-[#173B67] px-4 py-2 text-xs font-bold text-white shadow-xs cursor-pointer'
                    : 'min-h-10 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer'"
                >
                  Asignar cobro a estudiantes
                </button>
                <button
                  type="button"
                  role="tab"
                  [attr.aria-selected]="tabExtraordinarios() === 'catalogo'"
                  (click)="tabExtraordinarios.set('catalogo')"
                  [class]="tabExtraordinarios() === 'catalogo'
                    ? 'min-h-10 rounded-xl bg-[#173B67] px-4 py-2 text-xs font-bold text-white shadow-xs cursor-pointer'
                    : 'min-h-10 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer'"
                >
                  Administrar conceptos y vencimientos
                </button>
              </div>
            }

            <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-slate-50/70 p-6 space-y-5">
              @if (error()) {
                <p class="m-0 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800" role="alert">
                  {{ error() }}
                </p>
              }
              @if (mensaje()) {
                <p class="m-0 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900" role="status">
                  {{ mensaje() }}
                </p>
              }

              @if (!esAdministrativo() || tabExtraordinarios() === 'asignar') {
                <form class="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:grid-cols-2" (ngSubmit)="generarExtraordinarios()">
                  <label class="grid min-w-0 gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-600">
                    Concepto *
                    <select
                      class="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 focus:border-[#173B67] focus:outline-none focus:ring-2 focus:ring-[#173B67]/15"
                      name="conceptoExtra"
                      [(ngModel)]="conceptoExtraId"
                      required
                    >
                      <option [ngValue]="null">Selecciona un concepto</option>
                      @for (concepto of extrasActivos(); track concepto.id) {
                        <option [ngValue]="concepto.id">{{ concepto.nombre }} · S/ {{ concepto.montoSugerido | number:'1.2-2' }}</option>
                      }
                    </select>
                  </label>
                  <label class="grid min-w-0 gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-600">
                    Fecha de vencimiento *
                    <input
                      class="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 focus:border-[#173B67] focus:outline-none focus:ring-2 focus:ring-[#173B67]/15"
                      type="date"
                      name="vencimientoExtra"
                      [(ngModel)]="vencimientoExtra"
                      [min]="fechaMinimaVencimiento"
                      required
                    />
                  </label>

                  <fieldset class="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:col-span-2">
                    <legend class="px-2 text-xs font-bold uppercase tracking-wider text-[#173B67]">
                      Estudiantes ({{ seleccionExtra.size }} seleccionados)
                    </legend>
                    <label class="grid min-w-0 gap-1 text-xs font-semibold text-slate-600">
                      Buscar estudiante matriculado
                      <input
                        class="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#173B67] focus:outline-none focus:ring-2 focus:ring-[#173B67]/15"
                        name="buscarExtra"
                        [(ngModel)]="buscarExtra"
                        placeholder="Escribe el nombre o apellido..."
                      />
                    </label>
                    <div class="max-h-52 space-y-1.5 overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-white p-2">
                      @for (matricula of opcionesExtra(); track matricula.id) {
                        <label
                          class="flex min-h-10 cursor-pointer items-center gap-3 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
                          [class.bg-sky-50]="seleccionExtra.has(matricula.id)"
                        >
                          <input
                            type="checkbox"
                            class="size-4 rounded border-slate-300 accent-[#173B67]"
                            [checked]="seleccionExtra.has(matricula.id)"
                            (change)="seleccionarExtra(matricula.id, $any($event.target).checked)"
                          />
                          <span class="min-w-0 flex-1 truncate">{{ matricula.estudiante }} · {{ matricula.anio }}</span>
                        </label>
                      } @empty {
                        <p class="m-0 py-4 text-center text-sm text-slate-500">No hay estudiantes que coincidan.</p>
                      }
                    </div>
                  </fieldset>

                  <div class="flex flex-wrap items-center justify-end gap-3 pt-1 sm:col-span-2">
                    <button
                      type="button"
                      (click)="cerrarModalExtraordinarios()"
                      class="min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      class="min-h-11 rounded-xl bg-[#173B67] px-5 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[#20354E] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                      [disabled]="guardandoExtra() || !conceptoExtraId || !vencimientoExtra || !seleccionExtra.size"
                    >
                      {{ guardandoExtra() ? 'Generando…' : 'Generar cobro' }}
                    </button>
                  </div>
                </form>
              } @else {
                <div class="space-y-5">
                  <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
                    <p class="m-0 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs leading-relaxed text-sky-900">
                      Al crear un nuevo concepto habilitado, el sistema generará automáticamente los cargos pendientes para todos los estudiantes matriculados del año lectivo abierto.
                    </p>
                    <form class="grid gap-4 sm:grid-cols-2" (ngSubmit)="guardarConceptoExtra()">
                      <label class="grid min-w-0 gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-600 sm:col-span-2">
                        Concepto a editar
                        <select
                          class="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 focus:border-[#173B67] focus:outline-none focus:ring-2 focus:ring-[#173B67]/15"
                          name="idConceptoEdicion"
                          [ngModel]="conceptoEditId"
                          (ngModelChange)="editarConceptoExtra($event)"
                        >
                          <option [ngValue]="null">Nuevo concepto (genera cargos automáticos)</option>
                          @for (concepto of conceptosExtra(); track concepto.id) {
                            <option [ngValue]="concepto.id">{{ concepto.nombre }}</option>
                          }
                        </select>
                      </label>
                      <label class="grid min-w-0 gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-600">
                        Nombre *
                        <input
                          class="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-[#173B67] focus:outline-none focus:ring-2 focus:ring-[#173B67]/15"
                          name="nombreExtra"
                          [(ngModel)]="conceptoEdit.nombre"
                          maxlength="50"
                          required
                        />
                      </label>
                      <label class="grid min-w-0 gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-600">
                        Tipo
                        <select
                          class="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 disabled:bg-slate-100 focus:border-[#173B67] focus:outline-none focus:ring-2 focus:ring-[#173B67]/15"
                          name="tipoExtra"
                          [(ngModel)]="conceptoEdit.tipo"
                          [disabled]="conceptoEditId !== null"
                        >
                          <option value="OTRO">Actividad u otro</option>
                          <option value="CERTIFICADO">Certificado</option>
                        </select>
                      </label>
                      <label class="grid min-w-0 gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-600">
                        Importe en soles *
                        <input
                          class="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-[#173B67] focus:outline-none focus:ring-2 focus:ring-[#173B67]/15"
                          type="number"
                          name="montoExtra"
                          [(ngModel)]="conceptoEdit.monto"
                          min="0.01"
                          max="99999999.99"
                          step="0.01"
                          required
                        />
                      </label>
                      <label class="grid min-w-0 gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-600">
                        Vencimiento sugerido (opcional)
                        <input
                          class="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-[#173B67] focus:outline-none focus:ring-2 focus:ring-[#173B67]/15"
                          type="date"
                          name="vencimientoConceptoExtra"
                          [(ngModel)]="conceptoEdit.vencimiento"
                          [min]="fechaMinimaVencimiento"
                        />
                      </label>
                      <label class="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-800 sm:col-span-2 cursor-pointer">
                        <input type="checkbox" class="size-4 accent-[#173B67]" name="activoExtra" [(ngModel)]="conceptoEdit.activo" />
                        <span>Habilitado (genera cargos a padres)</span>
                      </label>
                      <div class="flex justify-end sm:col-span-2">
                        <button
                          type="submit"
                          class="min-h-11 rounded-xl bg-[#173B67] px-5 py-2 text-sm font-bold text-white shadow-sm hover:bg-[#20354E] disabled:opacity-50 cursor-pointer"
                          [disabled]="guardandoExtra() || !conceptoEdit.nombre.trim() || !conceptoEdit.monto"
                        >
                          {{ conceptoEditId === null ? 'Guardar concepto y generar cargos' : 'Actualizar concepto' }}
                        </button>
                      </div>
                    </form>
                  </div>

                  <form class="flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs" (ngSubmit)="guardarVencimientoPension()">
                    <label class="grid min-w-[220px] flex-1 gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-600">
                      Día de vencimiento para nuevas pensiones (1–28)
                      <input
                        class="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-[#173B67] focus:outline-none focus:ring-2 focus:ring-[#173B67]/15"
                        type="number"
                        name="diaPension"
                        [(ngModel)]="diaPension"
                        min="1"
                        max="28"
                        step="1"
                        required
                      />
                    </label>
                    <button
                      type="submit"
                      class="min-h-11 rounded-xl border border-[#173B67] bg-white px-5 py-2 text-sm font-bold text-[#173B67] hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                      [disabled]="guardandoExtra() || diaPension < 1 || diaPension > 28"
                    >
                      Guardar día
                    </button>
                  </form>
                </div>
              }
            </div>
          </section>
        </div>
      }

      @if (!gestionaExtraordinarios()) {
        <div class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#bae6fd] bg-gradient-to-r from-[#f0f9ff] via-white to-[#ecfdf5] p-4 shadow-xs">
          <div class="space-y-0.5">
            <p class="m-0 text-sm font-bold text-[#14213d]">Tus pagos escolares están protegidos por Mercado Pago</p>
            <p class="m-0 text-xs text-[#475569]">
              Se muestran únicamente las obligaciones de tus estudiantes a cargo. Paga cuota por cuota o adelanta varias cuotas en un solo paso.
            </p>
          </div>
          @if (obligacionesPendientes().length > 0) {
            <button
              type="button"
              (click)="pagarTodoPorAdelantado()"
              [disabled]="pagandoId() !== null || cobrandoId() !== null || preparandoAdelanto()"
              data-testid="btn-pagar-todo-adelantado"
              class="min-h-11 rounded-xl bg-[#009EE3] hover:bg-[#007eb5] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition cursor-pointer disabled:opacity-50 whitespace-nowrap"
            >
              ⚡ Pagar todo por adelantado ({{ obligacionesPendientes().length }} · S/ {{ montoTotalPendiente() | number:'1.2-2' }})
            </button>
          }
        </div>
      }

      @if (error() && !checkoutModalAbierto() && !modalExtraordinariosAbierto()) { <p class="flex items-start gap-3 rounded-xl border px-4 py-3 font-sans text-sm leading-6 border-[#fca5a5] bg-[#fee2e2] text-[#7f1d1d]" role="alert">{{ error() }}</p> }
      @if (mensaje() && !modalExtraordinariosAbierto()) { <p class="flex items-start gap-3 rounded-xl border px-4 py-3 font-sans text-sm leading-6 border-[#86efac] bg-[#dcfce7] text-[#14532d]" role="status">{{ mensaje() }}</p> }

      <!-- Modal de Pago en Línea con Mercado Pago -->
      @if (checkoutObligacionId() !== null || checkoutObligacionesLote().length > 0) {
        <div
          class="fixed inset-0 z-[2200] flex items-center justify-center bg-[#0c192b]/60 p-3 sm:p-5 backdrop-blur-[2px]"
          (click)="cerrarModalCheckout()"
          (keydown.escape)="cerrarModalCheckout()"
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-mp-titulo"
            cdkTrapFocus
            (click)="$event.stopPropagation()"
            class="flex max-h-[min(90dvh,760px)] w-full max-w-[700px] flex-col overflow-hidden rounded-[22px] border border-[#cbd5e1] bg-white p-0 shadow-[0_28px_90px_rgb(12_25_43_/_38%)]"
          >
            <header class="shrink-0 flex items-start justify-between gap-4 border-b border-[#e2e8f0] bg-white px-5 py-4">
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="inline-flex items-center gap-1.5 rounded-full bg-[#009EE3] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white">
                    Mercado Pago · Pasarela Oficial
                  </span>
                  <span class="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                    Importe total: S/ {{ checkoutMonto() | number:'1.2-2' }}
                  </span>
                </div>
                <h3 id="modal-mp-titulo" class="m-0 mt-1.5 text-lg font-extrabold text-[#14213d] leading-snug break-words">
                  {{ checkoutTitulo() }}
                </h3>
              </div>
              <button
                type="button"
                (click)="cerrarModalCheckout()"
                aria-label="Cerrar ventana de pago"
                class="h-10 w-10 shrink-0 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] text-base font-bold text-[#334155] hover:bg-[#e2e8f0] cursor-pointer"
              >
                ✕
              </button>
            </header>
            <div class="min-h-0 flex-1 overflow-y-auto p-5 space-y-4 bg-white">
              @if (error()) {
                <p class="m-0 rounded-xl border border-[#fca5a5] bg-[#fee2e2] px-4 py-3 text-sm font-semibold text-[#7f1d1d]" role="alert">
                  {{ error() }}
                </p>
              }
              <div class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#bfdbfe] bg-[#eff6ff] px-4 py-3">
                <div class="text-xs sm:text-sm text-[#1e3a8a]">
                  <strong class="block text-sm">Verificación automática activa</strong>
                  <span>Al finalizar en Mercado Pago puedes validar el abono al instante.</span>
                </div>
                <button
                  type="button"
                  (click)="confirmarPago()"
                  [disabled]="verificandoPago()"
                  class="min-h-10 rounded-xl border border-[#1d4ed8]/30 bg-white px-3.5 py-2 text-xs sm:text-sm font-bold text-[#1e3a8a] cursor-pointer hover:bg-blue-50 disabled:opacity-50"
                >
                  {{ verificandoPago() ? 'Verificando…' : 'Verificar estado en Mercado Pago' }}
                </button>
              </div>
              <app-simulador-checkout
                [monto]="checkoutMonto()"
                [enlaceExterno]="checkoutUrl()"
                [procesando]="verificandoPago()"
                [titulo]="checkoutTitulo()"
                [resumenConceptos]="checkoutResumenItems()"
                [ocultarCabecera]="true"
                (pagoSimulado)="simularPagoOnline($event)"
              />
            </div>
          </section>
        </div>
      }
      @if (esSecretaria() || esAdministrativo()) {
        <dialog #cronogramaDialog class="box-border w-[min(680px,calc(100vw-24px))] max-w-[calc(100vw-24px)] max-h-[calc(100dvh-24px)] overflow-hidden border border-[#e4eaf3] rounded-[22px] bg-white text-[#14213d] p-0 shadow-[0_28px_90px_rgb(15_31_57_/_28%)] backdrop:bg-[rgb(12_24_43_/_46%)] backdrop:backdrop-blur-[3px] max-[639px]:w-[calc(100vw-16px)] max-[639px]:max-w-[calc(100vw-16px)] max-[639px]:max-h-[calc(100dvh-16px)] max-[639px]:rounded-[18px] !w-[min(600px,calc(100vw-24px))] !max-w-[calc(100vw-24px)] !max-h-[calc(100dvh-24px)] !overflow-hidden !rounded-[18px] !border-[#e1e8f1] !bg-white !p-0 !text-[#172b4d] font-sans !shadow-[0_24px_72px_rgb(15_31_57_/_24%)] backdrop:!bg-[rgb(15_31_57_/_48%)] backdrop:!backdrop-blur-[3px]" aria-labelledby="cronograma-dialog-title">
          <div class="flex max-h-[calc(100dvh-24px)] min-h-0 flex-col max-h-[calc(100dvh-24px)] overflow-auto bg-white"><header class="flex flex-[0_0_auto] items-center justify-between gap-4 border-b border-[#e5eaf2] px-6 py-5 [&_h3]:m-0 [&_h3]:text-[#14213d] [&_h3]:text-lg [&_h3]:leading-[27px] [&_h3]:font-[750] [&_p]:mb-0 [&_p]:mt-1 [&_p]:text-[#64748b] [&_p]:text-xs [&_p]:leading-[1.5] max-[639px]:p-4 bg-white"><div><h3 id="cronograma-dialog-title" class="!text-[#172b4d] !text-[19px] font-[750] !leading-[28.5px] tracking-[-.025em]">Generar cuota de matrícula</h3><p class="text-[#59677a]">Programa el derecho de matrícula.</p></div><button type="button" class="min-h-9 rounded-xl border border-[#e5eaf2] bg-[#f5f7fb] px-3 !font-[650] text-[#334155] !h-9 !w-auto !min-h-9 !py-0 font-sans" (click)="cerrarCronograma()" aria-label="Cerrar">✕</button></header>
            <form (ngSubmit)="guardarGeneracion()" class="flex min-h-0 flex-[1_1_auto] flex-col"><div class="min-h-0 flex-[1_1_auto] overflow-auto overscroll-contain px-6 py-5 max-[639px]:p-4 space-y-4 bg-white text-[#34445d]">
              @if (error()) { <p class="flex items-start gap-3 rounded-lg border border-transparent px-4 py-3 font-sans text-base leading-6 border-[#fca5a5] bg-[#fee2e2] text-[#7f1d1d]" role="alert">{{ error() }}</p> }
              <label class="block min-w-0 text-xs font-semibold leading-normal text-[#475569] [&_input]:mt-[6px] [&_input]:block [&_input]:w-full [&_select]:mt-[6px] [&_select]:block [&_select]:w-full [&_textarea]:mt-[6px] [&_textarea]:block [&_textarea]:w-full text-[#34445d]">Matrícula ID *<input appFormatoEntrada="entero" type="number" [(ngModel)]="matriculaId" aria-label="Matrícula ID *" name="matricula" min="1" required class="!min-h-11 !rounded-[10px] !border-[#cbd5e1] !px-[11px] !py-[9px] !text-[#172b4d] !font-sans max-[600px]:!text-sm min-w-0 !min-h-[44px] max-w-full border px-3 py-[10px] !border-[#d9e1ec] rounded-xl !bg-white !text-[#14213d] transition-colors focus:border-[#5b83d6] focus:outline-none focus:shadow-[0_0_0_3px_rgb(59_110_214_/_13%)] max-[639px]:text-base !font-[650]"></label>
              <label class="block min-w-0 text-xs font-semibold leading-normal text-[#475569] [&_input]:mt-[6px] [&_input]:block [&_input]:w-full [&_select]:mt-[6px] [&_select]:block [&_textarea]:mt-[6px] [&_textarea]:block [&_textarea]:w-full text-[#34445d]">Fecha de vencimiento *<app-ui-calendar [(ngModel)]="primerVencimiento" name="primerVencimiento" [min]="fechaMinimaVencimiento" [required]="true" aria-label="Fecha de vencimiento"></app-ui-calendar></label>
            </div><footer class="sticky bottom-0 z-[1] flex flex-[0_0_auto] flex-wrap justify-end gap-[10px] border-t border-[#e5eaf2] bg-white px-6 py-[14px] max-[639px]:px-4 max-[639px]:py-3 max-[639px]:[&>button]:flex-[1_1_auto] border-t border-[#e5eaf2] bg-white max-[600px]:!flex-col-reverse"><button type="button" class="rounded-xl border border-[#e5eaf2] bg-[#f5f7fb] px-4 font-semibold text-[#334155] box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]" (click)="cerrarCronograma()">Cancelar</button><button type="submit" [disabled]="guardando()" class="rounded-xl bg-[#2563eb] px-[18px] font-bold text-white shadow-[0_8px_18px_rgb(37_99_235_/_18%)] disabled:cursor-wait disabled:opacity-[.55] box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]">{{ guardando() ? 'Generando…' : 'Crear cuota de matrícula' }}</button></footer></form>
          </div>
        </dialog>
        }
        @if (esSecretaria() || esAdministrativo() || esAuxiliar()) {
        <dialog #cobroDialog class="box-border w-[min(680px,calc(100vw-24px))] max-w-[calc(100vw-24px)] max-h-[calc(100dvh-24px)] overflow-hidden border border-ui-divider rounded-[22px] bg-ui-surface text-ui-text p-0 shadow-dialog backdrop:bg-[rgb(12_24_43_/_46%)] backdrop:backdrop-blur-[3px] max-[639px]:w-[calc(100vw-16px)] max-[639px]:max-w-[calc(100vw-16px)] max-[639px]:max-h-[calc(100dvh-16px)] max-[639px]:rounded-[18px] !w-[min(600px,calc(100vw-24px))] !max-w-[calc(100vw-24px)] !max-h-[calc(100dvh-24px)] !overflow-hidden !rounded-[18px] !border-ui-divider !bg-ui-surface !p-0 !text-ui-text font-sans !shadow-[0_24px_72px_rgb(15_31_57_/_24%)] backdrop:!bg-[rgb(15_31_57_/_48%)] backdrop:!backdrop-blur-[3px]" aria-labelledby="cobro-dialog-title">
          @if (cobroSeleccionado(); as obligacion) {
            <div class="flex max-h-[calc(100dvh-24px)] min-h-0 flex-col max-h-[calc(100dvh-24px)] overflow-auto bg-ui-surface"><header class="flex flex-[0_0_auto] items-center justify-between gap-4 border-b border-ui-divider px-6 py-5 [&_h3]:m-0 [&_h3]:text-ui-text [&_h3]:text-lg [&_h3]:leading-[27px] [&_h3]:font-[750] [&_p]:mb-0 [&_p]:mt-1 [&_p]:text-ui-muted [&_p]:text-xs [&_p]:leading-[1.5] max-[639px]:p-4 bg-ui-surface"><div><h3 id="cobro-dialog-title" class="!text-ui-text !text-[19px] font-[750] !leading-[28.5px] tracking-[-.025em]">Confirmar cobro en caja</h3><p class="text-ui-muted">Registra efectivo recibido o una transferencia ya verificada en el banco.</p></div><button type="button" class="min-h-9 rounded-xl border border-ui-divider bg-ui-surface-soft px-3 !font-[650] text-ui-action !h-9 !w-auto !min-h-9 !py-0 font-sans" (click)="cerrarCobro()" aria-label="Cerrar">✕</button></header>
              <div class="min-h-0 flex-[1_1_auto] overflow-auto overscroll-contain px-6 py-5 max-[639px]:p-4 space-y-4 bg-ui-surface text-ui-action text-sm">
                <div class="rounded-xl border border-ui-divider bg-ui-surface-soft p-4 space-y-2" aria-label="Resumen de cobro a confirmar">
                  <div class="flex items-center justify-between gap-2 border-b border-ui-divider pb-2">
                    <span class="text-xs font-bold uppercase tracking-wider text-ui-muted">Alumno</span>
                    <strong class="text-sm text-ui-text">{{ obligacion.estudiante }} (Matrícula #{{ obligacion.matriculaId }})</strong>
                  </div>
                  <div class="flex items-center justify-between gap-2 border-b border-ui-divider pb-2">
                    <span class="text-xs font-bold uppercase tracking-wider text-ui-muted">Concepto</span>
                    <strong class="text-sm text-ui-text">#{{ obligacion.id }} · {{ obligacion.concepto }}</strong>
                  </div>
                  <div class="flex items-center justify-between gap-2">
                    <span class="text-xs font-bold uppercase tracking-wider text-ui-muted">Total a cobrar</span>
                    <strong class="text-lg font-extrabold text-ui-action">S/ {{ obligacion.saldoPendiente | number:'1.2-2' }}</strong>
                  </div>
                </div>
                <label class="grid gap-2">Medio de pago<select [(ngModel)]="metodoCaja" class="min-h-11 rounded-lg border p-2"><option value="EFECTIVO">Efectivo recibido</option><option value="TRANSFERENCIA">Transferencia bancaria verificada</option></select></label>
                @if (metodoCaja === "TRANSFERENCIA") { <label class="grid gap-2">Banco y número de operación<input [(ngModel)]="referenciaTransferencia" maxlength="80" class="min-h-11 rounded-lg border p-2" autocomplete="off" /></label><p>Confirma primero el abono en la cuenta del colegio. Una captura no acredita el pago.</p> }
                @if (error()) { <p class="flex items-start gap-3 rounded-lg border border-transparent px-4 py-3 font-sans text-base leading-6 border-ui-error-border bg-ui-error-bg text-ui-error-text" role="alert">{{ error() }}</p> }
              </div>
              <footer class="sticky bottom-0 z-[1] flex flex-[0_0_auto] flex-wrap justify-end gap-[10px] border-t border-ui-divider bg-ui-surface px-6 py-[14px] max-[639px]:px-4 max-[639px]:py-3 max-[639px]:[&>button]:flex-[1_1_auto] border-t border-ui-divider bg-ui-surface max-[600px]:!flex-col-reverse"><button type="button" class="rounded-xl border border-ui-divider bg-ui-surface-soft px-4 font-semibold text-ui-action box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]" (click)="cerrarCobro()">Cancelar</button><button id="btn-confirmar-cobro-caja" type="button" class="rounded-xl bg-ui-action px-[18px] font-bold text-ui-action-text shadow-card disabled:cursor-wait disabled:opacity-[.55] box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]" [disabled]="cobrandoId() !== null" (click)="confirmarCobro(obligacion)">{{ cobrandoId() === obligacion.id ? 'Registrando…' : 'Registrar pago verificado' }}</button></footer>
            </div>
          }
        </dialog>
      }

      <!-- Financial Summary Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 min-[901px]:!grid-cols-3 gap-5 max-[600px]:!gap-3 [&>*:last-child]:max-[900px]:col-span-full">
        <div class="grid min-w-0 gap-[8px] rounded-2xl border border-[#cce7d6] border-l-4 border-l-emerald-600 bg-white p-5 shadow-[0_5px_16px_rgb(23_43_77_/_5%)]">
          <div class="text-xs font-bold text-emerald-800 uppercase tracking-wider">Total pagado</div>
          <div class="text-3xl font-black text-emerald-700 mt-1">S/ {{ recaudacionTotal() | number:'1.2-2' }}</div>
          <p class="text-xs text-ui-muted m-0">Pagos confirmados y acreditados del periodo</p>
        </div>

        <div class="grid min-w-0 gap-[8px] rounded-2xl border border-[#f5dfb8] border-l-4 border-l-amber-500 bg-white p-5 shadow-[0_5px_16px_rgb(23_43_77_/_5%)]">
          <div class="text-xs font-bold text-amber-800 uppercase tracking-wider">Saldo pendiente por pagar</div>
          <div class="text-3xl font-black text-amber-700 mt-1">S/ {{ pendienteTotal() | number:'1.2-2' }}</div>
          <p class="text-xs text-ui-muted m-0">{{ obligacionesPendientes().length }} cuota(s) disponibles para pago</p>
        </div>

        <div class="grid min-w-0 gap-[8px] rounded-2xl border border-[#bae6fd] border-l-4 border-l-[#009EE3] bg-gradient-to-br from-white to-[#f0f9ff] p-5 shadow-[0_5px_16px_rgb(23_43_77_/_5%)]">
          <div class="text-xs font-bold text-[#0369a1] uppercase tracking-wider">Avance de pagos</div>
          <div class="text-3xl font-black text-[#173B67] mt-1">{{ porcentajePagado() }}%</div>
          <div class="h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div class="h-full rounded-full bg-[#009EE3] transition-all duration-300" [style.width.%]="porcentajePagado()"></div>
          </div>
          <p class="text-xs text-ui-muted m-0">Pasarela digital Mercado Pago · Yape · Plin · Tarjeta</p>
        </div>
      </div>

      <!-- Obligations & Invoices Table -->
      <div class="min-w-0 overflow-hidden rounded-2xl border border-ui-divider bg-ui-surface shadow-sm">
        <div class="flex items-end justify-between gap-4 border-b border-ui-divider bg-ui-surface p-[18px] max-[600px]:items-stretch max-[600px]:flex-col max-[600px]:p-4">
          <div>
            <h3 class="m-0 text-ui-text text-[16px] font-extrabold tracking-[-.025em]">
              {{ gestionaExtraordinarios() ? 'Registro de Obligaciones y Comprobantes' : 'Mis cuotas escolares y boletas' }}
            </h3>
            @if (puedeEjecutarPagos() && seleccionAdelanto().length > 0) {
              <div class="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  (click)="pagarSeleccionadasPorAdelantado()"
                  [disabled]="pagandoId() !== null || cobrandoId() !== null || preparandoAdelanto()"
                  data-testid="btn-pagar-seleccionadas"
                  class="min-h-10 rounded-xl bg-[#173B67] hover:bg-[#20354E] px-3.5 py-2 text-xs font-bold text-white shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  💳 Pagar {{ seleccionAdelanto().length }} seleccionada(s) · S/ {{ montoSeleccionAdelanto() | number:'1.2-2' }}
                </button>
                <button
                  type="button"
                  (click)="limpiarSeleccionAdelanto()"
                  class="min-h-10 rounded-xl border border-ui-divider bg-white px-3 py-2 text-xs font-semibold text-ui-muted hover:bg-ui-surface-soft cursor-pointer"
                >
                  Limpiar selección
                </button>
              </div>
            }
          </div>
          <div class="flex w-full min-w-0 flex-col flex-wrap items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center">
            @if (esAuxiliar()) {
              <label class="grid w-full min-w-0 gap-1 text-sm sm:w-auto sm:max-w-[260px]">Consultar cobros de un estudiante
                <select class="min-h-11 w-full min-w-0 max-w-full rounded-lg border p-2" [(ngModel)]="matriculaId" (ngModelChange)="cambiarMatriculaFiltro()">
                  <option [ngValue]="0">Todos los estudiantes</option>
                  @for (matricula of matriculasExtra(); track matricula.id) {
                    <option [ngValue]="matricula.id">{{ matricula.estudiante }} · {{ matricula.anio }}</option>
                  }
                </select>
              </label>
            } @else if (esAdministrativo()) {
              <div class="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto">
                @if (matriculasExtra().length > 0) {
                  <select
                    aria-label="Seleccionar estudiante matriculado"
                    class="min-h-11 w-full min-w-0 max-w-full rounded-xl border border-ui-control-border bg-ui-surface px-3 py-2 text-xs text-ui-text sm:w-auto sm:max-w-[260px]"
                    [(ngModel)]="matriculaId"
                    (ngModelChange)="cambiarMatriculaFiltro()"
                  >
                    <option [ngValue]="0">Todos los estudiantes</option>
                    @for (matricula of matriculasExtra(); track matricula.id) {
                      <option [ngValue]="matricula.id">{{ matricula.estudiante }} (#{{ matricula.id }})</option>
                    }
                  </select>
                }
                <div class="flex w-full min-w-0 items-center gap-2 sm:w-auto">
                  <label class="shrink-0 text-xs font-semibold text-ui-action" for="tes-matricula-id">Matrícula ID:</label>
                  <input id="tes-matricula-id" appFormatoEntrada="entero"
                    type="number"
                    [(ngModel)]="matriculaId" aria-label="Matrícula ID:"
                    (change)="cambiarMatriculaFiltro()"
                  class="min-w-0 flex-1 sm:w-24 sm:flex-none rounded-xl border border-ui-control-border bg-ui-surface px-3 py-[10px] text-base text-ui-text transition-colors focus:border-ui-focus focus:outline-none focus:shadow-[0_0_0_3px_var(--ui-focus)] box-border !min-h-11 !py-1 !leading-6"
                  />
                </div>
              </div>
            }
            <select
              [(ngModel)]="filtroEstado" (ngModelChange)="cambiarFiltroEstado()" aria-label="Estado del pago"
              class="w-full min-w-0 max-w-full rounded-xl border border-ui-control-border bg-ui-surface px-3 py-[6px] text-base text-ui-text transition-colors focus:border-ui-focus focus:outline-none focus:shadow-[0_0_0_3px_var(--ui-focus)] sm:w-auto !min-h-11"
            >
              <option value="TODOS">Todos los Estados</option>
              <option value="PAGADO_TOTAL">Pagado</option>
              <option value="PAGADO_PARCIAL">Pago parcial</option>
              <option value="PENDIENTE">Pendiente</option>
              <option value="VENCIDO">Vencido</option>
            </select>
            <button
              (click)="cargarObligaciones()"
              class="w-full sm:w-auto cursor-pointer rounded-xl border border-ui-divider bg-ui-surface-soft px-3 py-1.5 font-semibold text-ui-text hover:bg-ui-surface-soft box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm leading-[1.25] text-center align-middle"
            >
              ↻ Actualizar
            </button>
          </div>
        </div>

        <div class="w-full min-w-0 overflow-x-auto bg-ui-surface">
          <table class="w-full border-collapse text-left font-sans text-sm text-ui-text [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-ui-surface-soft/70" data-mobile-table-cards="" data-treasury-mobile="">
            <thead class="border-b border-ui-divider bg-ui-surface-soft text-xs font-extrabold uppercase tracking-wider text-ui-action">
              <tr>
                <th class="px-4 py-3.5 whitespace-nowrap">
                  @if (puedeEjecutarPagos() && obligacionesPendientes().length > 0) {
                    <label class="inline-flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" class="size-4 accent-[#173B67]" [checked]="todasPendientesSeleccionadas()" (change)="alternarTodasPendientes($any($event.target).checked)" aria-label="Seleccionar todas las cuotas pendientes" />
                      <span>Sel.</span>
                    </label>
                  } @else {
                    <span>N.º</span>
                  }
                </th>
                <th class="min-w-[190px] px-4 py-3.5 whitespace-nowrap">Estudiante</th>
                <th class="min-w-[210px] px-4 py-3.5 whitespace-nowrap">Concepto</th>
                <th class="px-4 py-3.5 text-right whitespace-nowrap">Monto</th>
                <th class="px-4 py-3.5 text-right whitespace-nowrap">Saldo</th>
                <th class="px-4 py-3.5 whitespace-nowrap">Vencimiento</th>
                <th class="px-4 py-3.5 whitespace-nowrap">Estado</th>
                <th class="px-4 py-3.5 whitespace-nowrap">Boleta</th>
                <th class="px-4 py-3.5 text-right whitespace-nowrap">Acción</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-ui-divider text-ui-action">
              @if (cargando()) {
                <tr>
                  <td colspan="9" class="py-10 text-center text-ui-muted">
                    <div class="grid min-h-[180px] content-center justify-items-center gap-[10px] p-6 text-center text-ui-action"><span class="mb-1 h-[30px] w-[30px] rounded-full border-[3px] border-ui-divider border-t-ui-action animate-[grade-spin_.8s_linear_infinite]" aria-hidden="true"></span><p>Consultando tus cuotas y pagos...</p></div>
                  </td>
                </tr>
              } @else {
                @for (grupo of gruposObligaciones(); track grupo.id) {
                  @if (!gestionaExtraordinarios()) {
                    <tr>
                      <th colspan="9" scope="row" class="bg-gradient-to-r from-[#f1f5f9] to-white px-4 py-3 text-left text-sm font-bold text-[#173B67]">
                        {{ grupo.nombre }}
                      </th>
                    </tr>
                  }
                  @for (item of grupo.filas; track item.id) {
                  <tr class="align-middle transition-colors" [class.bg-[#f0f9ff]/60]="estaSeleccionadaAdelanto(item.id)">
                    <td class="px-4 py-3.5 font-mono text-xs whitespace-nowrap text-ui-muted" data-label="Selección">
                      @if (puedeEjecutarPagos() && esPagable(item)) {
                        <label class="inline-flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" class="size-4 accent-[#173B67]" [checked]="estaSeleccionadaAdelanto(item.id)" (change)="alternarSeleccionAdelanto(item.id, $any($event.target).checked)" [attr.aria-label]="'Seleccionar ' + item.concepto" />
                          <span>#{{ item.id }}</span>
                        </label>
                      } @else {
                        <span>#{{ item.id }}</span>
                      }
                    </td>
                    <td class="min-w-[190px] px-4 py-3.5 font-bold text-ui-text" data-label="Estudiante">
                      <span class="block leading-snug">{{ item.estudiante }}</span>
                      <span class="mt-0.5 block text-[11px] font-medium text-ui-muted">Matrícula #{{ item.matriculaId }}</span>
                    </td>
                    <td class="min-w-[210px] px-4 py-3.5" data-label="Concepto">
                      <span class="inline-block rounded-lg border border-ui-divider/70 bg-ui-surface-soft px-2.5 py-1 text-xs font-semibold leading-snug text-ui-text break-words">
                        {{ item.concepto }}
                      </span>
                    </td>
                    <td class="px-4 py-3.5 text-right font-mono font-bold tabular-nums whitespace-nowrap text-ui-text" data-label="Monto">
                      S/ {{ item.monto | number:'1.2-2' }}
                    </td>
                    <td class="px-4 py-3.5 text-right font-mono font-bold tabular-nums whitespace-nowrap text-ui-warning-text" data-label="Saldo">
                      S/ {{ item.saldoPendiente | number:'1.2-2' }}
                    </td>
                    <td class="px-4 py-3.5 font-mono text-xs whitespace-nowrap text-ui-action" data-label="Vencimiento">{{ item.fechaVencimiento | uiDatePe }}</td>
                    <td class="px-4 py-3.5 whitespace-nowrap" data-label="Estado">
                      @switch (item.estado) {
                        @case ('PAGADO_TOTAL') {
                          <ui-status-badge tone="success" label="PAGADO" />
                        }
                        @case ('PENDIENTE') {
                          <ui-status-badge tone="warning" label="PENDIENTE" />
                        }
                        @case ('PAGADO_PARCIAL') {
                          <ui-status-badge tone="info" label="PAGO PARCIAL" />
                        }
                        @case ('VENCIDO') {
                          <ui-status-badge tone="error" label="VENCIDO" />
                        }
                        @case ('SIN_ESTADO') {
                          <ui-status-badge tone="info" label="ESTADO NO INFORMADO" />
                        }
                        @default { <span class="text-ui-action">{{ item.estado }}</span> }
                      }
                    </td>
                    <td class="px-4 py-3.5 whitespace-nowrap" data-label="Boleta">
                      @if (item.estado === 'PAGADO_TOTAL' && (!esAuxiliar() || esExtraordinario(item))) {
                        <button type="button" class="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-ui-divider bg-white px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-[#173B67] shadow-2xs transition hover:bg-ui-surface-soft cursor-pointer max-[600px]:w-full max-[600px]:justify-center"
                          (click)="descargarConstancia(item)">Descargar PDF</button>
                      } @else { <span class="text-ui-muted text-xs">—</span> }
                    </td>
                    <td class="px-4 py-3.5 text-right whitespace-nowrap" data-label="Acción">
                      @if (esPagable(item)) {
                        <div class="flex flex-wrap items-center justify-end gap-2 max-[600px]:w-full max-[600px]:flex-col max-[600px]:items-stretch">
                          @if (puedeEjecutarPagos()) { <button
                            type="button"
                            (click)="pagarConMercadoPago(item)"
                            [disabled]="pagandoId() !== null || cobrandoId() !== null || preparandoAdelanto()"
                            [attr.aria-label]="pagandoId() === item.id ? 'Preparando pago con Mercado Pago' : 'Pagar con Mercado Pago'"
                            class="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#009EE3] px-3 py-2 text-xs font-bold whitespace-nowrap text-white shadow-2xs transition hover:bg-[#007eb5] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 cursor-pointer max-[600px]:min-h-11 max-[600px]:w-full"
                          ><span>{{ pagandoId() === item.id ? 'Preparando...' : 'Pagar con MP' }}</span><span class="sr-only"> Mercado Pago</span></button> }
                          @if (puedeCobrar(item)) {
                            <button
                              type="button"
                              (click)="cobrar(item)"
                              [disabled]="cobrandoId() !== null || pagandoId() !== null"
                              class="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-ui-control-border bg-white px-3 py-2 text-xs font-semibold whitespace-nowrap text-ui-action transition hover:bg-ui-surface-soft disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer max-[600px]:min-h-11 max-[600px]:w-full"
                            >Cobrar en Caja</button>
                          }
                        </div>
                      } @else if (item.estado === 'SIN_ESTADO') {
                        <span class="font-mono text-xs text-ui-muted">Estado no disponible</span>
                      } @else {
                        <span class="font-mono text-xs text-emerald-700 font-semibold">Al día</span>
                      }
                    </td>
                  </tr>
                  }
                } @empty {
                  <tr>
                    <td colspan="9" class="py-12 text-center text-ui-muted">
                      <div class="grid min-h-[180px] content-center justify-items-center gap-[10px] rounded-2xl border border-ui-divider bg-ui-surface p-6 text-center text-ui-action"><p class="m-0 text-ui-text text-sm font-[750]">No se encontraron obligaciones de cobro.</p><p class="m-0 max-w-[48ch] text-ui-muted text-xs leading-[1.5]">{{ gestionaExtraordinarios() ? 'Selecciona un estudiante o genera un cobro para visualizar los cargos.' : 'No tienes cuotas pendientes o registradas en este filtro.' }}</p></div>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>

        <ui-paginacion
          [totalRegistros]="obligacionesFiltradas().length"
          [paginaActual]="paginaActual()"
          [tamanoPagina]="tamanoPagina()"
          etiqueta="obligaciones"
          ariaLabel="Paginación de tesorería"
          (cambioPagina)="cambiarPagina($event)"
        />
      </div>
    </div>
  `
})
export class TesoreriaComponent implements OnInit, OnDestroy {
  private readonly tesoreriaService = inject(TesoreriaService);
  private readonly authStore = inject(AuthStore);
  @ViewChild('cronogramaDialog') private cronogramaDialog?: ElementRef<HTMLDialogElement>;
  @ViewChild('cobroDialog') private cobroDialog?: ElementRef<HTMLDialogElement>;
  readonly esAdministrativo = computed(() => this.authStore.hasAnyRole(['DIRECCION', 'SECRETARIA', 'ADMINISTRADOR']));
  readonly esAuxiliar = computed(() => this.authStore.hasRole('AUXILIAR') && !this.esAdministrativo());
  readonly gestionaExtraordinarios = computed(() => this.esAdministrativo() || this.esAuxiliar());
  readonly modalExtraordinariosAbierto = signal(false);
  readonly tabExtraordinarios = signal<'asignar' | 'catalogo'>('asignar');
  readonly conceptosExtra = signal<ConceptoCobroResponseDto[]>([]);
  readonly extrasActivos = computed(() => this.conceptosExtra().filter(c => c.activo !== false));
  readonly matriculasExtra = signal<MatriculaParaCobro[]>([]);
  readonly guardandoExtra = signal(false);
  readonly seleccionExtra = new Set<number>();
  buscarExtra = '';
  conceptoExtraId: number | null = null;
  vencimientoExtra = '';
  conceptoEditId: number | null = null;
  conceptoEdit: ConceptoExtraordinario = { nombre: '', tipo: 'OTRO', monto: null, activo: true, vencimiento: null };
  diaPension = 20;

  readonly esSecretaria = computed(() => this.authStore.hasRole('SECRETARIA'));
  readonly puedeEjecutarPagos = computed(() => this.authStore.hasAnyRole(['SECRETARIA', 'APODERADO']));
  readonly cobroSeleccionado = signal<ObligacionCobro | null>(null);
  metodoCaja: 'EFECTIVO' | 'TRANSFERENCIA' = 'EFECTIVO';
  referenciaTransferencia = '';
  readonly mensaje = signal<string | null>(null);
  private readonly clavesPago = new Map<number, string>();
  readonly cobrandoId = signal<number | null>(null);
  readonly pagandoId = signal<number | null>(null);
  readonly preparandoAdelanto = signal(false);
  readonly checkoutUrl = signal<string | null>(null);
  readonly checkoutObligacionId = signal<number | null>(null);
  readonly checkoutObligacionesLote = signal<ObligacionCobro[]>([]);
  readonly checkoutMonto = signal<number>(0);
  readonly seleccionAdelanto = signal<number[]>([]);
  readonly verificandoPago = signal(false);
  private seguimientoPago: ReturnType<typeof setInterval> | null = null;
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  matriculaId = 0;
  readonly error = signal<string | null>(null);
  readonly guardando = signal(false);
  primerVencimiento = '';
  readonly fechaMinimaVencimiento = fechaActualEnPeru();
  filtroEstado = 'TODOS';
  cargando = signal(false);

  readonly obligaciones = signal<ObligacionCobro[]>([]);
  readonly vistaActiva = signal<'por-cobrar' | 'caja-dia' | 'comprobantes'>('por-cobrar');

  readonly obligacionesPendientes = computed(() =>
    this.obligaciones()
      .filter(o => this.esPagable(o))
      .sort((a, b) => a.fechaVencimiento.localeCompare(b.fechaVencimiento))
  );

  readonly montoTotalPendiente = computed(() =>
    this.obligacionesPendientes().reduce((sum, o) => sum + o.saldoPendiente, 0)
  );

  readonly montoSeleccionAdelanto = computed(() => {
    const elegidas = new Set(this.seleccionAdelanto());
    return this.obligacionesPendientes()
      .filter(o => elegidas.has(o.id))
      .reduce((sum, o) => sum + o.saldoPendiente, 0);
  });

  readonly todasPendientesSeleccionadas = computed(() => {
    const pendientes = this.obligacionesPendientes();
    if (!pendientes.length) return false;
    const elegidas = new Set(this.seleccionAdelanto());
    return pendientes.every(o => elegidas.has(o.id));
  });

  readonly checkoutModalAbierto = computed(() =>
    this.checkoutObligacionId() !== null || this.checkoutObligacionesLote().length > 0
  );

  readonly checkoutTitulo = computed(() => {
    const lote = this.checkoutObligacionesLote();
    if (lote.length > 1) return `Pago adelantado de ${lote.length} cuotas`;
    if (lote.length === 1) return `${lote[0].concepto} · ${lote[0].estudiante}`;
    const id = this.checkoutObligacionId();
    return id ? `Pago digital de cuota #${id}` : 'Checkout Mercado Pago';
  });

  readonly checkoutResumenItems = computed(() =>
    this.checkoutObligacionesLote().map(o => `${o.estudiante} — ${o.concepto} (S/ ${o.saldoPendiente.toFixed(2)})`)
  );

  cambiarVistaTesoreria(vista: 'por-cobrar' | 'caja-dia' | 'comprobantes'): void {
    this.vistaActiva.set(vista);
    this.paginaActual.set(1);
    if (vista === 'comprobantes') {
      this.filtroEstado = 'PAGADO_TOTAL';
    } else {
      this.filtroEstado = 'TODOS';
    }
  }

  cambiarMatriculaFiltro(): void {
    this.paginaActual.set(1);
    this.cargarObligaciones();
  }

  cambiarFiltroEstado(): void {
    this.paginaActual.set(1);
  }

  obligacionesFiltradas(): ObligacionCobro[] {
    let base = this.obligaciones();
    if (this.vistaActiva() === 'comprobantes') {
      base = base.filter(o => o.estado === 'PAGADO_TOTAL' || o.totalPagado > 0);
    }
    if (this.filtroEstado === 'TODOS') return base;
    return base.filter(o => o.estado === this.filtroEstado);
  }

  readonly recaudacionTotal = computed(() => {
    return this.obligaciones()
      .reduce((sum, o) => sum + o.totalPagado, 0);
  });

  readonly pendienteTotal = computed(() => {
    return this.obligaciones()
      .filter(o => o.estado !== 'CANCELADO_POR_TRASLADO')
      .reduce((sum, o) => sum + o.saldoPendiente, 0);
  });

  readonly porcentajePagado = computed(() => {
    const total = this.recaudacionTotal() + this.pendienteTotal();
    if (total <= 0) return this.obligaciones().length ? 100 : 0;
    return Math.min(100, Math.round((this.recaudacionTotal() * 100) / total));
  });

  esPagable(item: ObligacionCobro): boolean {
    return (item.estado === 'PENDIENTE' || item.estado === 'PAGADO_PARCIAL' || item.estado === 'VENCIDO')
      && item.saldoPendiente > 0;
  }

  estaSeleccionadaAdelanto(id: number): boolean {
    return this.seleccionAdelanto().includes(id);
  }

  alternarSeleccionAdelanto(id: number, marcado: boolean): void {
    this.seleccionAdelanto.update(actual => {
      if (marcado) return actual.includes(id) ? actual : [...actual, id];
      return actual.filter(item => item !== id);
    });
  }

  alternarTodasPendientes(marcado: boolean): void {
    this.seleccionAdelanto.set(
      marcado ? this.obligacionesPendientes().map(o => o.id) : []
    );
  }

  limpiarSeleccionAdelanto(): void {
    this.seleccionAdelanto.set([]);
  }

  readonly paginaActual = signal<number>(1);
  readonly tamanoPagina = signal<number>(10);

  cambiarPagina(nuevaPagina: number): void {
    this.paginaActual.set(nuevaPagina);
  }

  gruposObligaciones() {
    const grupos = new Map<number, { id: number; nombre: string; filas: ObligacionCobro[] }>();
    const filasPaginadas = paginarRegistros(this.obligacionesFiltradas(), this.paginaActual(), this.tamanoPagina());
    for (const fila of filasPaginadas) {
      const grupo = grupos.get(fila.matriculaId) ?? { id: fila.matriculaId, nombre: fila.estudiante, filas: [] };
      grupo.filas.push(fila);
      grupos.set(grupo.id, grupo);
    }
    return [...grupos.values()].map(g => ({ ...g, filas: g.filas.sort((a, b) => a.fechaVencimiento.localeCompare(b.fechaVencimiento)) }));
  }

  opcionesExtra() {
    const texto = this.buscarExtra.trim().toLocaleLowerCase();
    return this.matriculasExtra().filter(m => m.estudiante.toLocaleLowerCase().includes(texto));
  }

  seleccionarExtra(id: number, seleccionado: boolean) {
    if (seleccionado) this.seleccionExtra.add(id);
    else this.seleccionExtra.delete(id);
  }

  editarConceptoExtra(id: number | null) {
    this.conceptoEditId = id;
    const concepto = this.conceptosExtra().find(c => c.id === id);
    this.conceptoEdit = concepto
      ? { nombre: concepto.nombre, tipo: concepto.tipoConcepto === 'CERTIFICADO' ? 'CERTIFICADO' : 'OTRO',
          monto: concepto.montoSugerido, activo: concepto.activo !== false, vencimiento: null }
      : { nombre: '', tipo: 'OTRO', monto: null, activo: true, vencimiento: null };
  }

  private cargarConceptosExtra() {
    this.tesoreriaService.conceptosExtraordinarios().subscribe({
      next: conceptos => this.conceptosExtra.set(conceptos),
      error: () => this.error.set('No se pudo cargar el catálogo de cobros extraordinarios.')
    });
  }

  guardarConceptoExtra() {
    if (!this.esAdministrativo() || this.guardandoExtra() || !this.conceptoEdit.monto) return;
    const esNuevoActivo = this.conceptoEditId === null && this.conceptoEdit.activo;
    this.guardandoExtra.set(true);
    this.error.set(null);
    this.tesoreriaService.guardarConceptoExtraordinario(this.conceptoEditId, this.conceptoEdit).subscribe({
      next: () => {
        this.guardandoExtra.set(false);
        this.mensaje.set(
          esNuevoActivo
            ? 'Concepto guardado y cargos generados automáticamente para los padres.'
            : 'Concepto guardado.'
        );
        this.editarConceptoExtra(null);
        this.cargarConceptosExtra();
        this.cargarObligaciones();
      },
      error: () => { this.guardandoExtra.set(false); this.error.set('No se pudo guardar el concepto.'); }
    });
  }

  guardarVencimientoPension() {
    if (!this.esAdministrativo() || this.guardandoExtra() || !Number.isInteger(this.diaPension)
      || this.diaPension < 1 || this.diaPension > 28) return;
    this.guardandoExtra.set(true);
    this.error.set(null);
    this.tesoreriaService.configurarPension(this.diaPension).subscribe({
      next: () => { this.guardandoExtra.set(false); this.mensaje.set('Vencimiento guardado para nuevas pensiones.'); },
      error: () => { this.guardandoExtra.set(false); this.error.set('No se pudo guardar el vencimiento.'); }
    });
  }

  abrirModalExtraordinarios(): void {
    if (!this.gestionaExtraordinarios()) return;
    this.error.set(null);
    this.mensaje.set(null);
    this.tabExtraordinarios.set('asignar');
    this.modalExtraordinariosAbierto.set(true);
  }

  cerrarModalExtraordinarios(): void {
    this.modalExtraordinariosAbierto.set(false);
  }

  generarExtraordinarios() {
    if (!this.gestionaExtraordinarios() || this.guardandoExtra() || !this.conceptoExtraId
      || !this.seleccionExtra.size || !this.vencimientoExtra) return;
    this.guardandoExtra.set(true);
    this.error.set(null);
    this.tesoreriaService.generarExtraordinarios(this.conceptoExtraId, [...this.seleccionExtra], this.vencimientoExtra).subscribe({
      next: filas => {
        this.guardandoExtra.set(false);
        this.seleccionExtra.clear();
        this.modalExtraordinariosAbierto.set(false);
        this.mensaje.set('Cobro disponible para ' + filas.length + ' estudiante(s).');
        if (filas.length) this.matriculaId = filas[0].matriculaId;
        this.cargarObligaciones();
      },
      error: err => { this.guardandoExtra.set(false); this.error.set(err?.error?.message ?? 'No se pudo generar el cobro.'); }
    });
  }

  esExtraordinario(item: ObligacionCobro) {
    return item.tipoConcepto === 'OTRO' || item.tipoConcepto === 'CERTIFICADO';
  }

  puedeCobrar(item: ObligacionCobro) {
    return this.esSecretaria() || this.esAdministrativo() || (this.esAuxiliar() && this.esExtraordinario(item));
  }

  descargarConstancia(item: ObligacionCobro) {
    this.tesoreriaService.descargarConstancia(item.id).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = 'constancia-' + item.id + '.pdf';
        enlace.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      },
      error: () => this.error.set('No se pudo descargar la constancia.')
    });
  }

  ngOnInit(): void {
    if (this.gestionaExtraordinarios()) {
      this.cargarConceptosExtra();
      this.tesoreriaService.matriculasParaCobro().subscribe({
        next: filas => this.matriculasExtra.set(filas),
        error: () => this.error.set('No se pudieron cargar los estudiantes matriculados.')
      });
    }
    this.cargarObligaciones();
    this.restaurarConfirmacionMercadoPago();
    if (!this.esAdministrativo()) return;
    this.tesoreriaService.listarConceptos().subscribe({ next: conceptos => {
      this.diaPension = conceptos.find(c => c.codigo === "PENSION_MENSUAL")?.diaVencimiento ?? 20;
    }, error: () => this.error.set('No se pudieron cargar los conceptos de cobro.') });
  }

  cargarObligaciones(): void {
    this.cargando.set(true);
    const solicitud = this.esAdministrativo()
      ? this.tesoreriaService.listarObligaciones(this.matriculaId)
      : this.esAuxiliar() ? this.tesoreriaService.listarExtraordinarios(this.matriculaId)
      : this.tesoreriaService.listarMisObligaciones();
    solicitud.subscribe({
      next: (res) => {
        this.cargando.set(false);
        if (Array.isArray(res)) {
          const mapeadas: ObligacionCobro[] = res.map(o => ({
            id: o.id,
            matriculaId: o.matriculaId,
            estudiante: o.nombreEstudiante || 'Estudiante sin datos',
            tipoConcepto: o.tipoConcepto,
            concepto: o.descripcion || `Cuota #${o.numeroCuota || 1}`,
            monto: o.montoBase,
            saldoPendiente: o.saldoPendiente,
            totalPagado: o.totalPagado,
            fechaVencimiento: o.fechaVencimiento ? String(o.fechaVencimiento) : '-',
            estado: o.estado ?? 'SIN_ESTADO'
          }));
          this.obligaciones.set(mapeadas);
          const pagables = new Set(mapeadas.filter(item => this.esPagable(item)).map(item => item.id));
          this.seleccionAdelanto.update(ids => ids.filter(id => pagables.has(id)));
        } else {
          this.obligaciones.set([]);
          this.seleccionAdelanto.set([]);
        }
      },
      error: () => {
        this.cargando.set(false);
        this.obligaciones.set([]);
        this.seleccionAdelanto.set([]);
        this.error.set('No se pudieron cargar las obligaciones de pago.');
      }
    });
  }

  pagarConMercadoPago(item: ObligacionCobro): void {
    if (!this.puedeEjecutarPagos()) return;
    if (item.saldoPendiente <= 0 || this.pagandoId() !== null || this.cobrandoId() !== null || this.preparandoAdelanto()) return;
    this.error.set(null);
    this.cerrarModalCheckout();
    this.pagandoId.set(item.id);
    const { retornoPublico, retorno } = this.contextoRetorno();
    this.tesoreriaService.crearPreferenciaMercadoPago({
      obligacionPagoId: item.id,
      ...(retornoPublico ? {
        backUrlSuccess: `${retorno}?resultado=aprobado&obligacionId=${item.id}`,
        backUrlFailure: `${retorno}?resultado=fallido&obligacionId=${item.id}`
      } : {})
    }).subscribe({
      next: preferencia => {
        this.pagandoId.set(null);
        this.abrirCheckoutConEnlace(preferencia.initPoint, item.id, [item], item.saldoPendiente);
      },
      error: err => {
        this.pagandoId.set(null);
        this.error.set(err?.error?.message ?? 'No se pudo iniciar el pago con Mercado Pago.');
      }
    });
  }

  pagarTodoPorAdelantado(): void {
    this.iniciarPagoAdelanto(this.obligacionesPendientes());
  }

  pagarSeleccionadasPorAdelantado(): void {
    const elegidas = new Set(this.seleccionAdelanto());
    const lote = this.obligacionesPendientes().filter(o => elegidas.has(o.id));
    this.iniciarPagoAdelanto(lote);
  }

  private iniciarPagoAdelanto(lote: ObligacionCobro[]): void {
    if (!this.puedeEjecutarPagos() || !lote.length) return;
    if (this.pagandoId() !== null || this.cobrandoId() !== null || this.preparandoAdelanto()) return;
    if (lote.length === 1) {
      this.pagarConMercadoPago(lote[0]);
      return;
    }
    this.error.set(null);
    this.cerrarModalCheckout();
    this.preparandoAdelanto.set(true);
    const ids = lote.map(o => o.id);
    const total = lote.reduce((sum, o) => sum + o.saldoPendiente, 0);
    const { retornoPublico, retorno } = this.contextoRetorno();
    this.tesoreriaService.crearPreferenciaAdelantoMercadoPago({
      obligacionPagoIds: ids,
      ...(retornoPublico ? {
        backUrlSuccess: `${retorno}?resultado=aprobado&obligacionIds=${ids.join(',')}`,
        backUrlFailure: `${retorno}?resultado=fallido&obligacionIds=${ids.join(',')}`
      } : {})
    }).subscribe({
      next: preferencia => {
        this.preparandoAdelanto.set(false);
        this.abrirCheckoutConEnlace(preferencia.initPoint, null, lote, total);
      },
      error: err => {
        this.preparandoAdelanto.set(false);
        this.error.set(err?.error?.message ?? 'No se pudo preparar el pago adelantado con Mercado Pago.');
      }
    });
  }

  cerrarModalCheckout(): void {
    this.ngOnDestroy();
    this.checkoutUrl.set(null);
    this.checkoutObligacionId.set(null);
    this.checkoutObligacionesLote.set([]);
    this.checkoutMonto.set(0);
    this.verificandoPago.set(false);
  }

  private contextoRetorno(): { retornoPublico: boolean; retorno: string } {
    const host = window.location.hostname.toLowerCase();
    const retornoPublico = window.location.protocol === 'https:' && host !== 'localhost' && host !== '127.0.0.1';
    const retorno = `${window.location.origin}/admin/tesoreria`;
    return { retornoPublico, retorno };
  }

  private abrirCheckoutConEnlace(
    enlace: string,
    obligacionId: number | null,
    lote: ObligacionCobro[],
    montoTotal: number
  ): void {
    try {
      const url = new URL(enlace);
      const dominio = url.hostname.toLowerCase();
      if (url.protocol !== 'https:' || !['mercadopago.com', 'mercadopago.com.pe'].some(base => dominio === base || dominio.endsWith(`.${base}`))) {
        throw new Error('URL de checkout no válida');
      }
      this.checkoutObligacionId.set(obligacionId);
      this.checkoutObligacionesLote.set(lote);
      this.checkoutMonto.set(montoTotal);
      this.checkoutUrl.set(url.toString());
      if (this.seguimientoPago) clearInterval(this.seguimientoPago);
      this.seguimientoPago = setInterval(() => this.confirmarPago(), 10000);
    } catch {
      this.error.set('Mercado Pago devolvió un enlace de pago no válido.');
    }
  }

  simularPagoOnline(evento: PagoSimuladoEvent): void {
    if (!this.puedeEjecutarPagos() || this.verificandoPago()) return;
    const lote = this.checkoutObligacionesLote();
    const id = this.checkoutObligacionId() ?? (lote.length === 1 ? lote[0].id : null);
    if (lote.length <= 1 && !id) return;
    this.error.set(null);
    this.verificandoPago.set(true);

    const exito = () => {
      this.cerrarModalCheckout();
      this.limpiarRetornoMercadoPago();
      this.limpiarSeleccionAdelanto();
      this.mensaje.set('Pago confirmado y boleta registrada.');
      this.cargarObligaciones();
    };
    const fallo = (err: { error?: { message?: string } }) => {
      this.verificandoPago.set(false);
      this.error.set(err?.error?.message ?? 'No se pudo procesar el pago digital en modo sandbox.');
    };

    if (lote.length > 1) {
      this.tesoreriaService.simularPagoAdelantoMercadoPago(
        lote.map(o => o.id),
        evento.metodoPago,
        evento.referenciaOperacion
      ).subscribe({ next: exito, error: fallo });
      return;
    }

    this.tesoreriaService.simularPagoMercadoPago(id!, evento.metodoPago, evento.referenciaOperacion)
      .subscribe({ next: exito, error: fallo });
  }

  confirmarPago(): void {
    if (!this.puedeEjecutarPagos() || this.verificandoPago()) return;
    const lote = this.checkoutObligacionesLote();
    const id = this.checkoutObligacionId() ?? (lote.length === 1 ? lote[0].id : null);
    const enlace = this.checkoutUrl();
    if (lote.length <= 1 && !id) return;

    this.error.set(null);
    this.verificandoPago.set(true);
    const manejarError = (err: { status?: number; error?: { message?: string } }) => {
      this.verificandoPago.set(false);
      if (this.checkoutUrl() !== enlace) return;
      if (err?.status === 0 || (err?.status ?? 0) >= 500) {
        this.error.set(err?.error?.message ?? 'No se pudo verificar temporalmente. Seguiremos consultando el pago.');
        return;
      }
      this.ngOnDestroy();
      this.error.set(err?.error?.message ?? 'No se pudo verificar el pago. Puedes volver a consultar.');
    };

    if (lote.length > 1) {
      this.tesoreriaService.confirmarPagoAdelanto(lote.map(o => o.id)).subscribe({
        next: pagos => {
          this.verificandoPago.set(false);
          if (this.checkoutUrl() !== enlace || !pagos?.length) return;
          this.cerrarModalCheckout();
          this.limpiarRetornoMercadoPago();
          this.limpiarSeleccionAdelanto();
          this.mensaje.set('Pago confirmado y boleta registrada.');
          this.cargarObligaciones();
        },
        error: manejarError
      });
      return;
    }

    this.tesoreriaService.confirmarPago(id!).subscribe({
      next: pago => {
        this.verificandoPago.set(false);
        if (this.checkoutUrl() !== enlace) return;
        if (!pago) return;
        this.cerrarModalCheckout();
        this.limpiarRetornoMercadoPago();
        this.limpiarSeleccionAdelanto();
        this.mensaje.set('Pago confirmado y boleta registrada.');
        this.cargarObligaciones();
      },
      error: manejarError
    });
  }

  ngOnDestroy(): void {
    if (this.seguimientoPago) clearInterval(this.seguimientoPago);
    this.seguimientoPago = null;
  }

  private restaurarConfirmacionMercadoPago(): void {
    const resultado = this.route.snapshot.queryParamMap.get('resultado');
    if (!['aprobado', 'fallido'].includes(resultado ?? '')) return;
    const obligacionIdsParam = this.route.snapshot.queryParamMap.get('obligacionIds');
    if (obligacionIdsParam) {
      const ids = obligacionIdsParam.split(',').map(Number).filter(n => Number.isSafeInteger(n) && n > 0);
      if (ids.length > 1) {
        this.checkoutObligacionesLote.set(ids.map(id => ({
          id, matriculaId: 0, estudiante: '', concepto: `Cuota #${id}`,
          monto: 0, saldoPendiente: 0, totalPagado: 0, fechaVencimiento: '', estado: 'PENDIENTE'
        })));
        this.seguimientoPago = setInterval(() => this.confirmarPago(), 10000);
        this.confirmarPago();
        return;
      }
    }
    const obligacionId = Number(this.route.snapshot.queryParamMap.get('obligacionId'));
    if (!Number.isSafeInteger(obligacionId) || obligacionId <= 0) return;
    this.checkoutObligacionId.set(obligacionId);
    this.seguimientoPago = setInterval(() => this.confirmarPago(), 10000);
    this.confirmarPago();
  }

  private limpiarRetornoMercadoPago(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { resultado: null, obligacionId: null, obligacionIds: null },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  cobrar(item: ObligacionCobro): void {
    if (!this.puedeCobrar(item)) return;
    if (item.saldoPendiente <= 0 || this.cobrandoId() !== null) return;
    this.error.set(null);
    this.metodoCaja = 'EFECTIVO';
    this.referenciaTransferencia = '';
    this.cobroSeleccionado.set(item);
    this.cobroDialog?.nativeElement.showModal();
  }

  confirmarCobro(item: ObligacionCobro): void {
    if (!this.puedeCobrar(item)) return;
    if (item.saldoPendiente <= 0 || this.cobrandoId() !== null) return;
    if (this.metodoCaja === 'TRANSFERENCIA' && !this.referenciaTransferencia.trim()) {
      this.error.set('Indica banco y número de operación verificados.'); return;
    }
    const clave = this.metodoCaja === 'TRANSFERENCIA'
      ? `BANCO-${this.referenciaTransferencia.trim().toUpperCase()}`
      : this.clavesPago.get(item.id) ?? `CAJA-${crypto.randomUUID()}`;
    this.clavesPago.set(item.id, clave);
    this.cobrandoId.set(item.id);
    const payload = {
      obligacionPagoId: item.id,
      montoPagado: item.saldoPendiente,
      metodoPago: this.metodoCaja,
      pasarelaTransaccionId: clave
    };

    this.tesoreriaService.registrarPagoCaja(payload).subscribe({
      next: () => {
        this.cobrandoId.set(null);
        this.clavesPago.delete(item.id);
        this.cerrarCobro();
        this.mensaje.set(`Pago registrado para la obligación #${item.id}.`);
        this.cargarObligaciones();
      },
      error: (err) => {
        this.cobrandoId.set(null);
        this.error.set(err?.error?.message ?? 'No se pudo registrar el pago.');
      }
    });
  }

  abrirModalCuotaMatricula(): void {
    if (!this.esSecretaria() && !this.esAdministrativo()) return;
    this.error.set(null);
    this.mensaje.set(null);
    this.primerVencimiento = '';
    this.cronogramaDialog?.nativeElement.showModal();
  }

  cerrarCronograma(): void { this.cronogramaDialog?.nativeElement.close(); }
  cerrarCobro(): void { this.cobroDialog?.nativeElement.close(); this.cobroSeleccionado.set(null); }

  guardarGeneracion(): void { this.generarObligacionMatricula(); }

  generarObligacionMatricula(): void {
    if (!this.esSecretaria() && !this.esAdministrativo()) return;
    if (!this.matriculaId || !this.primerVencimiento) { this.error.set('Complete matrícula y fecha de vencimiento.'); return; }
    if (this.primerVencimiento < this.fechaMinimaVencimiento) { this.error.set('La fecha de vencimiento no puede ser anterior a hoy.'); return; }
    if (this.guardando()) return;
    this.guardando.set(true); this.error.set(null);
    this.tesoreriaService.generarObligacionMatricula({ matriculaId: this.matriculaId, fechaVencimiento: this.primerVencimiento }).subscribe({
      next: obligacion => {
        this.guardando.set(false);
        this.cerrarCronograma();
        this.mensaje.set(`Cuota de matrícula #${obligacion.id} generada por S/ ${Number(obligacion.montoBase).toFixed(2)}.`);
        this.cargarObligaciones();
      },
      error: err => { this.guardando.set(false); this.error.set(err?.error?.message ?? 'No se pudo generar la cuota de matrícula.'); }
    });
  }

}
