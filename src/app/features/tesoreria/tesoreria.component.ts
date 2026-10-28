import { Component, ElementRef, inject, signal, computed, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppAlertComponent } from '../../shared/ui/app-alert.component';
import { StatusBadgeComponent } from '../../shared/ui/status-badge.component';
import { TesoreriaService } from '../../core/services/tesoreria.service';
import { ConceptoCobroResponseDto } from '../../core/models/tesoreria.model';
import { AuthStore } from '../../core/state/auth.store';
import { UiDatePePipe } from '../../shared/ui/ui-date-pe.pipe';

export type EstadoPago = 'PAGADO_TOTAL' | 'PAGADO_PARCIAL' | 'PENDIENTE' | 'VENCIDO' | 'CANCELADO_POR_TRASLADO';

export interface ObligacionCobro {
  id: number;
  matriculaId: number;
  estudiante: string;
  concepto: string;
  monto: number;
  saldoPendiente: number;
  totalPagado: number;
  fechaVencimiento: string;
  estado: EstadoPago;
  comprobanteNumero?: string;
}

@Component({
  selector: 'app-tesoreria',
  standalone: true,
  imports: [CommonModule, FormsModule, AppAlertComponent, StatusBadgeComponent, UiDatePePipe],
template: `
    <div class="space-y-6 grid min-w-0 gap-[22px] text-ui-text font-sans max-[600px]:gap-4">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t-[3px] border-t-ui-divider pt-3">
        <div>
          <h2 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-ui-text tracking-[-.025em]">Tesorería & Pagos</h2>
          <p class="text-sm text-ui-muted mt-0">
            @if (esAdministrativo()) { Gestión de pensiones escolares, conciliación de caja y pagos digitales. }
            @else { Consulta tus obligaciones escolares y paga de forma segura con Mercado Pago. }
          </p>
        </div>
        @if (esAdministrativo()) {
        <div class="flex items-center gap-3">
          <button
            (click)="abrirModalEmitir()"
            class="px-4 py-2.5 rounded-xl bg-ui-action hover:bg-ui-action/90 text-ui-action-text font-semibold text-xs sm:text-sm shadow-[var(--ui-card-shadow)] transition flex items-center gap-2 cursor-pointer box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px] !text-sm !leading-[1.25]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>Generar Cronograma en BD</span>
          </button>
        </div>
        }
      </div>

      @if (!esAdministrativo()) {
        <ui-app-alert
          tone="warning"
          title="Pendiente de habilitación"
          message="El selector de estudiante, el estado de cuenta detallado y el reporte de notas estarán disponibles cuando el backend habilite la consulta vinculada al apoderado."
        />
      }

      @if (error()) { <p class="flex items-start gap-3 rounded-lg border border-transparent px-4 py-3 font-sans text-base leading-6 border-ui-error-border bg-ui-error-bg text-ui-error-text" role="alert">{{ error() }}</p> }
      @if (checkoutUrl()) {
        <div class="flex items-start gap-3 rounded-lg border border-transparent px-4 py-3 font-sans text-base leading-6 border-ui-info-border bg-ui-info-bg text-ui-info-text !grid gap-[10px] m-0" role="status">
          <p>Pago preparado para la obligación #{{ checkoutObligacionId() }}. El pago solo se registrará cuando Mercado Pago confirme la operación.</p>
          <a [href]="checkoutUrl()" target="_blank" rel="noopener noreferrer" class="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-transparent px-4 py-2 text-center font-sans text-[15px] leading-[1.25] font-semibold no-underline transition-[background-color,border-color,color,box-shadow] duration-[140ms] [cursor:pointer] focus-visible:outline-3 focus-visible:outline-ui-focus focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:border-ui-divider disabled:bg-ui-surface-soft disabled:text-ui-muted aria-disabled:cursor-not-allowed aria-disabled:border-ui-divider aria-disabled:bg-ui-surface-soft aria-disabled:text-ui-muted bg-ui-action text-ui-action-text hover:bg-ui-action/90">Abrir Mercado Pago</a>
          <p class="m-0 text-ui-action text-xs">Selecciona Yape, tarjeta o PagoEfectivo para pagar con CIP por los canales bancarios disponibles. La confirmación se consulta automáticamente.</p>
          <button type="button" (click)="confirmarPago()" [disabled]="verificandoPago()" class="min-h-11 rounded-lg border px-4 py-2">{{ verificandoPago() ? 'Verificando…' : 'Consultar pago' }}</button>
        </div>
      }
      @if (mensaje()) { <p class="flex items-start gap-3 rounded-lg border border-transparent px-4 py-3 font-sans text-base leading-6 border-ui-success-border bg-ui-success-bg text-ui-success-text" role="status">{{ mensaje() }}</p> }
      @if (esAdministrativo()) {
        <dialog #cronogramaDialog class="box-border w-[min(680px,calc(100vw-24px))] max-w-[calc(100vw-24px)] max-h-[calc(100dvh-24px)] overflow-hidden border border-ui-divider rounded-[22px] bg-ui-surface text-ui-text p-0 shadow-[0_28px_90px_rgb(15_31_57_/_28%)] backdrop:bg-[rgb(12_24_43_/_46%)] backdrop:backdrop-blur-[3px] max-[639px]:w-[calc(100vw-16px)] max-[639px]:max-w-[calc(100vw-16px)] max-[639px]:max-h-[calc(100dvh-16px)] max-[639px]:rounded-[18px] !w-[min(600px,calc(100vw-24px))] !max-w-[calc(100vw-24px)] !max-h-[calc(100dvh-24px)] !overflow-hidden !rounded-[18px] !border-ui-divider !bg-ui-surface !p-0 !text-ui-text font-sans !shadow-[0_24px_72px_rgb(15_31_57_/_24%)] backdrop:!bg-[rgb(15_31_57_/_48%)] backdrop:!backdrop-blur-[3px]" aria-labelledby="cronograma-dialog-title">
          <div class="flex max-h-[calc(100dvh-24px)] min-h-0 flex-col max-h-[calc(100dvh-24px)] overflow-auto bg-ui-surface"><header class="flex flex-[0_0_auto] items-center justify-between gap-4 border-b border-ui-divider px-6 py-5 [&_h3]:m-0 [&_h3]:text-ui-text [&_h3]:text-lg [&_h3]:leading-[27px] [&_h3]:font-[750] [&_p]:mb-0 [&_p]:mt-1 [&_p]:text-ui-muted [&_p]:text-xs [&_p]:leading-[1.5] max-[639px]:p-4 bg-ui-surface"><div><h3 id="cronograma-dialog-title" class="!text-ui-text !text-[19px] font-[750] !leading-[28.5px] tracking-[-.025em]">Generar cronograma de cobros</h3><p class="text-ui-muted">Confirma matrícula, conceptos y fecha del primer vencimiento.</p></div><button type="button" class="min-h-9 rounded-xl border border-ui-divider bg-ui-surface-soft px-3 !font-[650] text-ui-action !h-9 !w-auto !min-h-9 !py-0 font-sans" (click)="cerrarCronograma()" aria-label="Cerrar">✕</button></header>
            <form (ngSubmit)="generarCronograma()" class="flex min-h-0 flex-[1_1_auto] flex-col"><div class="min-h-0 flex-[1_1_auto] overflow-auto overscroll-contain px-6 py-5 max-[639px]:p-4 space-y-4 bg-ui-surface text-ui-action">
              @if (error()) { <p class="flex items-start gap-3 rounded-lg border border-transparent px-4 py-3 font-sans text-base leading-6 border-ui-error-border bg-ui-error-bg text-ui-error-text" role="alert">{{ error() }}</p> }
              <label class="block min-w-0 text-xs font-semibold leading-normal text-ui-muted [&_input]:mt-[6px] [&_input]:block [&_input]:w-full [&_select]:mt-[6px] [&_select]:block [&_select]:w-full [&_textarea]:mt-[6px] [&_textarea]:block [&_textarea]:w-full text-ui-action">Matrícula ID *<input type="number" [(ngModel)]="matriculaId" aria-label="Matrícula ID *" name="matricula" min="1" required class="!min-h-11 !rounded-[10px] !border-ui-control-border !px-[11px] !py-[9px] !text-ui-text !font-sans max-[600px]:!text-sm min-w-0 !min-h-[44px] max-w-full border px-3 py-[10px] !border-ui-control-border rounded-xl !bg-ui-surface !text-ui-text transition-colors focus:border-ui-focus focus:outline-none focus:shadow-[0_0_0_3px_var(--ui-focus)] max-[639px]:text-base !font-[650]"></label>
              <label class="block min-w-0 text-xs font-semibold leading-normal text-ui-muted [&_input]:mt-[6px] [&_input]:block [&_input]:w-full [&_select]:mt-[6px] [&_select]:block [&_select]:w-full [&_textarea]:mt-[6px] [&_textarea]:block [&_textarea]:w-full text-ui-action">Concepto matrícula *<select [(ngModel)]="conceptoMatriculaId" name="conceptoMatricula" [disabled]="!conceptosMatricula().length" required class="!min-h-11 !rounded-[10px] !border-ui-control-border !px-[11px] !py-[9px] !text-ui-text !font-sans max-[600px]:!text-sm min-w-0 !min-h-[44px] max-w-full border px-3 py-[10px] !border-ui-control-border rounded-xl !bg-ui-surface !text-ui-text transition-colors focus:border-ui-focus focus:outline-none focus:shadow-[0_0_0_3px_var(--ui-focus)] max-[639px]:text-base !font-[650]">@if (!conceptosMatricula().length) { <option [ngValue]="0">Sin conceptos disponibles</option> } @for (c of conceptosMatricula(); track c.id) { <option [ngValue]="c.id">{{ c.nombre }}</option> }</select></label>
              <label class="block min-w-0 text-xs font-semibold leading-normal text-ui-muted [&_input]:mt-[6px] [&_input]:block [&_input]:w-full [&_select]:mt-[6px] [&_select]:block [&_select]:w-full [&_textarea]:mt-[6px] [&_textarea]:block [&_textarea]:w-full text-ui-action">Concepto pensión *<select [(ngModel)]="conceptoPensionId" name="conceptoPension" [disabled]="!conceptosPension().length" required class="!min-h-11 !rounded-[10px] !border-ui-control-border !px-[11px] !py-[9px] !text-ui-text !font-sans max-[600px]:!text-sm min-w-0 !min-h-[44px] max-w-full border px-3 py-[10px] !border-ui-control-border rounded-xl !bg-ui-surface !text-ui-text transition-colors focus:border-ui-focus focus:outline-none focus:shadow-[0_0_0_3px_var(--ui-focus)] max-[639px]:text-base !font-[650]">@if (!conceptosPension().length) { <option [ngValue]="0">Sin conceptos disponibles</option> } @for (c of conceptosPension(); track c.id) { <option [ngValue]="c.id">{{ c.nombre }}</option> }</select></label>
              <label class="block min-w-0 text-xs font-semibold leading-normal text-ui-muted [&_input]:mt-[6px] [&_input]:block [&_input]:w-full [&_select]:mt-[6px] [&_select]:block [&_select]:w-full [&_textarea]:mt-[6px] [&_textarea]:block [&_textarea]:w-full text-ui-action">Primer vencimiento *<input type="date" [(ngModel)]="primerVencimiento" name="primerVencimiento" required class="!min-h-11 !rounded-[10px] !border-ui-control-border !px-[11px] !py-[9px] !text-ui-text !font-sans max-[600px]:!text-sm min-w-0 !min-h-[44px] max-w-full border px-3 py-[10px] !border-ui-control-border rounded-xl !bg-ui-surface !text-ui-text transition-colors focus:border-ui-focus focus:outline-none focus:shadow-[0_0_0_3px_var(--ui-focus)] max-[639px]:text-base !font-[650]"></label>
            </div><footer class="sticky bottom-0 z-[1] flex flex-[0_0_auto] flex-wrap justify-end gap-[10px] border-t border-ui-divider bg-ui-surface px-6 py-[14px] max-[639px]:px-4 max-[639px]:py-3 max-[639px]:[&>button]:flex-[1_1_auto] border-t border-ui-divider bg-ui-surface max-[600px]:!flex-col-reverse"><button type="button" class="rounded-xl border border-ui-divider bg-ui-surface-soft px-4 font-semibold text-ui-action box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]" (click)="cerrarCronograma()">Cancelar</button><button type="submit" [disabled]="guardando()" class="rounded-xl bg-ui-action px-[18px] font-bold text-ui-action-text shadow-[0_8px_18px_rgb(37_99_235_/_18%)] disabled:cursor-wait disabled:opacity-[.55] box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]">{{ guardando() ? 'Generando…' : 'Generar cronograma' }}</button></footer></form>
          </div>
        </dialog>
        <dialog #cobroDialog class="box-border w-[min(680px,calc(100vw-24px))] max-w-[calc(100vw-24px)] max-h-[calc(100dvh-24px)] overflow-hidden border border-ui-divider rounded-[22px] bg-ui-surface text-ui-text p-0 shadow-[0_28px_90px_rgb(15_31_57_/_28%)] backdrop:bg-[rgb(12_24_43_/_46%)] backdrop:backdrop-blur-[3px] max-[639px]:w-[calc(100vw-16px)] max-[639px]:max-w-[calc(100vw-16px)] max-[639px]:max-h-[calc(100dvh-16px)] max-[639px]:rounded-[18px] !w-[min(600px,calc(100vw-24px))] !max-w-[calc(100vw-24px)] !max-h-[calc(100dvh-24px)] !overflow-hidden !rounded-[18px] !border-ui-divider !bg-ui-surface !p-0 !text-ui-text font-sans !shadow-[0_24px_72px_rgb(15_31_57_/_24%)] backdrop:!bg-[rgb(15_31_57_/_48%)] backdrop:!backdrop-blur-[3px]" aria-labelledby="cobro-dialog-title">
          @if (cobroSeleccionado(); as obligacion) {
            <div class="flex max-h-[calc(100dvh-24px)] min-h-0 flex-col max-h-[calc(100dvh-24px)] overflow-auto bg-ui-surface"><header class="flex flex-[0_0_auto] items-center justify-between gap-4 border-b border-ui-divider px-6 py-5 [&_h3]:m-0 [&_h3]:text-ui-text [&_h3]:text-lg [&_h3]:leading-[27px] [&_h3]:font-[750] [&_p]:mb-0 [&_p]:mt-1 [&_p]:text-ui-muted [&_p]:text-xs [&_p]:leading-[1.5] max-[639px]:p-4 bg-ui-surface"><div><h3 id="cobro-dialog-title" class="!text-ui-text !text-[19px] font-[750] !leading-[28.5px] tracking-[-.025em]">Confirmar cobro en caja</h3><p class="text-ui-muted">Registra efectivo recibido o una transferencia ya verificada en el banco.</p></div><button type="button" class="min-h-9 rounded-xl border border-ui-divider bg-ui-surface-soft px-3 !font-[650] text-ui-action !h-9 !w-auto !min-h-9 !py-0 font-sans" (click)="cerrarCobro()" aria-label="Cerrar">✕</button></header>
              <div class="min-h-0 flex-[1_1_auto] overflow-auto overscroll-contain px-6 py-5 max-[639px]:p-4 space-y-3 bg-ui-surface text-ui-action text-sm"><label class="grid gap-2">Medio de pago<select [(ngModel)]="metodoCaja" class="min-h-11 rounded-lg border p-2"><option value="EFECTIVO">Efectivo recibido</option><option value="TRANSFERENCIA">Transferencia bancaria verificada</option></select></label>@if (metodoCaja === "TRANSFERENCIA") { <label class="grid gap-2">Banco y número de operación<input [(ngModel)]="referenciaTransferencia" maxlength="80" class="min-h-11 rounded-lg border p-2" autocomplete="off" /></label><p>Confirma primero el abono en la cuenta del colegio. Una captura no acredita el pago.</p> }<p><span class="font-semibold">Obligación:</span> #{{ obligacion.id }} · {{ obligacion.concepto }}</p><p><span class="font-semibold">Saldo a registrar:</span> S/ {{ obligacion.saldoPendiente | number:'1.2-2' }}</p>@if (error()) { <p class="flex items-start gap-3 rounded-lg border border-transparent px-4 py-3 font-sans text-base leading-6 border-ui-error-border bg-ui-error-bg text-ui-error-text" role="alert">{{ error() }}</p> }</div>
              <footer class="sticky bottom-0 z-[1] flex flex-[0_0_auto] flex-wrap justify-end gap-[10px] border-t border-ui-divider bg-ui-surface px-6 py-[14px] max-[639px]:px-4 max-[639px]:py-3 max-[639px]:[&>button]:flex-[1_1_auto] border-t border-ui-divider bg-ui-surface max-[600px]:!flex-col-reverse"><button type="button" class="rounded-xl border border-ui-divider bg-ui-surface-soft px-4 font-semibold text-ui-action box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]" (click)="cerrarCobro()">Cancelar</button><button type="button" class="rounded-xl bg-ui-action px-[18px] font-bold text-ui-action-text shadow-[0_8px_18px_rgb(37_99_235_/_18%)] disabled:cursor-wait disabled:opacity-[.55] box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]" [disabled]="cobrandoId() !== null" (click)="confirmarCobro(obligacion)">{{ cobrandoId() === obligacion.id ? 'Registrando…' : 'Registrar pago verificado' }}</button></footer>
            </div>
          }
        </dialog>
      }

      <!-- Financial Summary Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 min-[901px]:!grid-cols-3 gap-5 max-[600px]:!gap-3 [&>*:last-child]:max-[900px]:col-span-full">
        <div class="rounded-2xl border border-ui-divider bg-ui-surface p-6 shadow-[0_4px_16px_rgb(16_36_71_/_8%)] grid min-w-0 gap-[10px] !rounded-2xl !border-ui-divider !p-5 max-[600px]:!p-[17px] bg-ui-surface shadow-[0_5px_16px_rgb(23_43_77_/_5%)]">
          <div class="text-xs font-semibold text-ui-muted uppercase tracking-wider">Pagado en obligaciones consultadas</div>
          <div class="text-3xl font-black text-ui-success-text mt-2">S/ {{ recaudacionTotal() | number:'1.2-2' }}</div>
          <p class="text-xs text-ui-muted">Suma de pagos registrados en las obligaciones consultadas</p>
        </div>

        <div class="rounded-2xl border border-ui-divider bg-ui-surface p-6 shadow-[0_4px_16px_rgb(16_36_71_/_8%)] grid min-w-0 gap-[10px] !rounded-2xl !border-ui-divider !p-5 max-[600px]:!p-[17px] bg-ui-surface shadow-[0_5px_16px_rgb(23_43_77_/_5%)]">
          <div class="text-xs font-semibold text-ui-muted uppercase tracking-wider">Pendiente por Cobrar</div>
          <div class="text-3xl font-black text-ui-warning-text mt-2">S/ {{ pendienteTotal() | number:'1.2-2' }}</div>
          <p class="text-xs text-ui-muted">Obligaciones vigentes en PostgreSQL</p>
        </div>

        <div class="rounded-2xl border border-ui-divider bg-ui-surface p-6 shadow-[0_4px_16px_rgb(16_36_71_/_8%)] grid min-w-0 gap-[10px] !rounded-2xl !border-ui-divider !p-5 max-[600px]:!p-[17px] bg-ui-surface shadow-[0_5px_16px_rgb(23_43_77_/_5%)]">
          <div class="text-xs font-semibold text-ui-muted uppercase tracking-wider">Pasarela Mercado Pago</div>
          <div class="text-3xl font-black text-ui-action mt-2">Pago digital</div>
          <p class="text-xs text-ui-muted">Checkout de prueba disponible para saldos pendientes</p>
        </div>
      </div>

      <!-- Obligations & Invoices Table -->
      <div class="min-w-0 overflow-hidden rounded-2xl border border-ui-divider bg-ui-surface shadow-sm">
        <div class="flex items-end justify-between gap-4 border-b border-ui-divider bg-ui-surface p-[18px] max-[600px]:items-stretch max-[600px]:flex-col max-[600px]:p-4">
          <h3 class="m-0 text-ui-text text-[15px] font-extrabold tracking-[-.025em]">Registro de Obligaciones y Comprobantes</h3>
          <div class="flex flex-col flex-wrap items-stretch gap-3 sm:flex-row sm:items-center">
            @if (esAdministrativo()) { <div class="flex items-center gap-2">
              <label class="text-xs text-ui-action">Matrícula ID:</label>
              <input
                type="number"
                [(ngModel)]="matriculaId" aria-label="Matrícula ID:"
                (change)="cargarObligaciones()"
              class="w-full sm:w-24 rounded-lg border border-ui-control-border bg-ui-surface px-2 py-1 text-base text-ui-text focus:outline-none min-w-0 !min-h-[44px] max-w-full border px-3 py-[10px] !border-ui-control-border rounded-xl !bg-ui-surface !text-ui-text transition-colors focus:border-ui-focus focus:outline-none focus:shadow-[0_0_0_3px_var(--ui-focus)] max-[639px]:text-base box-border !min-h-11 !py-1 !text-base !leading-6"
              />
            </div> }
            <select
              [(ngModel)]="filtroEstado" aria-label="Estado del pago"
              class="w-full rounded-xl border border-ui-control-border bg-ui-surface px-3 py-1.5 text-xs text-ui-text focus:outline-none sm:w-auto min-w-0 !min-h-[44px] max-w-full border px-3 py-[10px] !border-ui-control-border rounded-xl !bg-ui-surface !text-ui-text transition-colors focus:border-ui-focus focus:outline-none focus:shadow-[0_0_0_3px_var(--ui-focus)] max-[639px]:text-base !min-h-11 !py-[6px] !text-base"
            >
              <option value="TODOS">Todos los Estados</option>
              <option value="PAGADO_TOTAL">Pagado</option>
              <option value="PAGADO_PARCIAL">Pago parcial</option>
              <option value="PENDIENTE">Pendiente</option>
              <option value="VENCIDO">Vencido</option>
            </select>
            <button
              (click)="cargarObligaciones()"
              class="cursor-pointer rounded-xl border border-ui-divider bg-ui-surface-soft px-3 py-1.5 text-xs font-semibold text-ui-text hover:bg-ui-surface-soft box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px] !text-sm !leading-[1.25]"
            >
              Consultar BD
            </button>
          </div>
        </div>

        <p class="hidden min-[601px]:max-[1399px]:block m-0 bg-[#f4f7fb] px-3 py-[9px] text-ui-action text-[11px] font-semibold">Desliza horizontalmente para ver todas las columnas</p>
        <div class="max-w-full overflow-x-auto rounded-2xl border border-ui-divider bg-ui-surface min-w-0 overflow-x-auto">
          <table class="w-full border-collapse text-left font-sans text-base leading-6 text-ui-text [&_th]:px-4 [&_th]:py-3 [&_th]:align-middle [&_th]:border-b [&_th]:border-ui-divider [&_td]:px-4 [&_td]:py-3 [&_td]:align-middle [&_td]:border-b [&_td]:border-ui-divider [&_th]:bg-ui-surface-soft [&_th]:text-[13px] [&_th]:font-semibold [&_tr:last-child_td]:border-b-0 w-full min-w-[1100px] text-left text-xs min-[1400px]:min-w-0 min-[1400px]:table-fixed [&_thead]:!bg-ui-surface-soft [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:!bg-ui-surface-soft" data-mobile-table-cards="" data-treasury-mobile="">
            <thead class="border-b border-ui-divider bg-ui-surface-soft text-ui-action uppercase tracking-[.04em] font-extrabold">
              <tr>
                <th class="!px-[5px] !py-3 !text-[11px] font-extrabold whitespace-nowrap min-[1400px]:!py-2 min-[1400px]:w-[6%]">ID BD</th>
                <th class="!px-[5px] !py-3 !text-[11px] font-extrabold whitespace-nowrap min-[1400px]:!py-2 min-[1400px]:w-[10%]">Matrícula ID</th>
                <th class="!px-[5px] !py-3 !text-[11px] font-extrabold whitespace-nowrap min-w-[190px] min-[1400px]:!py-2 min-[1400px]:w-[15%] min-[1400px]:min-w-0">Concepto</th>
                <th class="!px-[5px] !py-3 !text-[11px] font-extrabold whitespace-nowrap min-[1400px]:!py-2 min-[1400px]:w-[9%]">Monto Base</th>
                <th class="!px-[5px] !py-3 !text-[11px] font-extrabold whitespace-nowrap min-[1400px]:!py-2 min-[1400px]:w-[11%]">Saldo Pendiente</th>
                <th class="!px-[5px] !py-3 !text-[11px] font-extrabold whitespace-nowrap min-[1400px]:!py-2 min-[1400px]:w-[9%]">Vencimiento</th>
                <th class="!px-[5px] !py-3 !text-[11px] font-extrabold whitespace-nowrap min-[1400px]:!py-2 min-[1400px]:w-[14%]">Estado en BD</th>
                <th class="!px-[5px] !py-3 !text-[11px] font-extrabold whitespace-nowrap min-w-[140px] min-[1400px]:!py-2 min-[1400px]:w-[10%] min-[1400px]:min-w-0 min-[1400px]:whitespace-normal">Comprobante</th>
                <th class="sticky right-0 z-[5] !px-[5px] !py-3 !text-[11px] font-extrabold text-right whitespace-nowrap min-w-[170px] bg-ui-surface-soft shadow-[-8px_0_12px_rgb(16_36_71_/_10%)] min-[1400px]:static min-[1400px]:z-auto min-[1400px]:!py-2 min-[1400px]:w-[16%] min-[1400px]:min-w-0 min-[1400px]:shadow-none">Acción</th>
              </tr>
            </thead>
            <tbody class="text-ui-action">
              @if (cargando()) {
                <tr>
                  <td colspan="9" class="py-10 text-center text-ui-muted">
                    <div class="grid min-h-[180px] content-center justify-items-center gap-[10px] p-6 text-center text-ui-action"><span class="mb-1 h-[30px] w-[30px] rounded-full border-[3px] border-ui-divider border-t-ui-action animate-[grade-spin_.8s_linear_infinite]" aria-hidden="true"></span><p>Consultando obligaciones financieras en la base de datos...</p></div>
                  </td>
                </tr>
              } @else {
                @for (item of obligacionesFiltradas(); track item.id) {
                  <tr class="transition hover:[&>td]:bg-ui-surface-soft">
                    <td class="px-[5px] py-3 min-[601px]:!px-[5px] min-[601px]:!py-3 min-[1400px]:!py-2 font-mono text-ui-muted" data-label="ID BD">{{ item.id }}</td>
                    <td class="px-[5px] py-3 min-[601px]:!px-[5px] min-[601px]:!py-3 min-[1400px]:!py-2 font-bold text-ui-text" data-label="Matrícula ID">{{ item.estudiante }}</td>
                    <td class="px-[5px] py-3 min-[601px]:!px-[5px] min-[601px]:!py-3 min-[1400px]:!py-2" data-label="Concepto">
                      <span class="inline-block max-w-[260px] align-middle rounded bg-ui-surface-soft px-2 py-0.5 text-ui-muted font-medium whitespace-normal leading-[1.35] max-[600px]:!whitespace-nowrap min-[1400px]:max-w-full">
                        {{ item.concepto }}
                      </span>
                    </td>
                    <td class="px-[5px] py-3 min-[601px]:!px-[5px] min-[601px]:!py-3 min-[1400px]:!py-2 font-mono font-bold text-ui-text" data-label="Monto Base">
                      S/ {{ item.monto | number:'1.2-2' }}
                    </td>
                    <td class="px-[5px] py-3 min-[601px]:!px-[5px] min-[601px]:!py-3 min-[1400px]:!py-2 font-mono font-semibold text-ui-warning-text" data-label="Saldo Pendiente">
                      S/ {{ item.saldoPendiente | number:'1.2-2' }}
                    </td>
                    <td class="px-[5px] py-3 min-[601px]:!px-[5px] min-[601px]:!py-3 min-[1400px]:!py-2 font-mono whitespace-nowrap text-ui-action" data-label="Vencimiento">{{ item.fechaVencimiento | uiDatePe }}</td>
                    <td class="px-[5px] py-3 min-[601px]:!px-[5px] min-[601px]:!py-3 min-[1400px]:!py-2" data-label="Estado en BD">
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
                        @default { <span class="text-ui-action">{{ item.estado }}</span> }
                      }
                    </td>
                    <td class="px-[5px] py-3 min-[601px]:!px-[5px] min-[601px]:!py-3 min-[1400px]:!py-2" data-label="Comprobante">@if (item.comprobanteNumero) { <span class="inline-flex min-h-7 items-center rounded-lg border border-ui-success-border bg-ui-success-bg px-2 py-1 text-[11px] font-bold text-ui-success-text whitespace-nowrap">{{ item.comprobanteNumero }}</span> } @else { <span class="text-ui-muted text-[11px]">—</span> }</td>
                    <td class="sticky right-0 z-[3] px-[5px] py-3 min-[601px]:!px-[5px] min-[601px]:!py-3 text-right min-w-[170px] min-[601px]:min-w-[176px] bg-ui-surface shadow-[-8px_0_12px_rgb(16_36_71_/_10%)] min-[1400px]:static min-[1400px]:z-auto min-[1400px]:!py-2 min-[1400px]:w-[16%] min-[1400px]:min-w-0 min-[1400px]:shadow-none" data-label="Acción">
                      @if (item.estado !== 'PAGADO_TOTAL' && item.estado !== 'CANCELADO_POR_TRASLADO' && item.saldoPendiente > 0) {
                        <div class="flex flex-wrap justify-end gap-[7px] max-[600px]:w-full max-[600px]:flex-col max-[600px]:items-stretch">
                          <button
                            (click)="pagarConMercadoPago(item)"
                            [disabled]="pagandoId() !== null || cobrandoId() !== null"
                            [attr.aria-label]="pagandoId() === item.id ? 'Preparando pago con Mercado Pago' : 'Pagar con Mercado Pago'"
                            class="inline-flex items-center justify-center gap-2 rounded-lg border border-transparent px-4 py-2 text-center font-sans text-[15px] leading-[1.25] font-semibold no-underline transition-[background-color,border-color,color,box-shadow] duration-[140ms] [cursor:pointer] focus-visible:outline-3 focus-visible:outline-ui-focus focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:border-ui-divider disabled:bg-ui-surface-soft disabled:text-ui-muted aria-disabled:cursor-not-allowed aria-disabled:border-ui-divider aria-disabled:bg-ui-surface-soft aria-disabled:text-ui-muted bg-ui-action text-ui-action-text hover:bg-ui-action/90 !min-h-10 !px-[10px] !py-2 !text-[11px] !font-normal whitespace-nowrap max-[600px]:!min-h-11 max-[600px]:!w-full box-border inline-flex min-w-0 min-h-10 items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:min-h-11 !leading-[1.4]"
                          ><span>{{ pagandoId() === item.id ? 'Preparando...' : 'Pagar' }}</span><span class="sr-only"> con Mercado Pago</span></button>
                          @if (esAdministrativo()) {
                            <button
                              (click)="cobrar(item)"
                              [disabled]="cobrandoId() !== null || pagandoId() !== null"
                              class="inline-flex items-center justify-center gap-2 rounded-lg border border-transparent px-4 py-2 text-center font-sans text-[15px] leading-[1.25] font-semibold no-underline transition-[background-color,border-color,color,box-shadow] duration-[140ms] [cursor:pointer] focus-visible:outline-3 focus-visible:outline-ui-focus focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:border-ui-divider disabled:bg-ui-surface-soft disabled:text-ui-muted aria-disabled:cursor-not-allowed aria-disabled:border-ui-divider aria-disabled:bg-ui-surface-soft aria-disabled:text-ui-muted border-ui-divider bg-ui-surface text-ui-action hover:bg-ui-surface-soft !min-h-10 !px-[10px] !py-2 !text-xs !font-normal whitespace-nowrap max-[600px]:!min-h-11 max-[600px]:!w-full box-border inline-flex min-w-0 min-h-10 items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:min-h-11"
                            >Cobrar en Caja</button>
                          }
                        </div>
                      } @else {
                        <span class="font-mono text-xs text-ui-muted">Emitido</span>
                      }
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="9" class="py-12 text-center text-ui-muted">
                      <div class="grid justify-items-center rounded-2xl border border-ui-divider bg-ui-surface p-6 text-center grid min-h-[180px] content-center justify-items-center gap-[10px] p-6 text-center text-ui-action"><p class="m-0 text-ui-text text-sm font-[750]">No se encontraron obligaciones de cobro en la base de datos.</p><p class="m-0 max-w-[48ch] text-ui-muted text-xs leading-[1.5]">Genere el cronograma anual de pensiones para visualizar los compromisos de pago en PostgreSQL.</p></div>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
})
export class TesoreriaComponent implements OnInit, OnDestroy {
  private readonly tesoreriaService = inject(TesoreriaService);
  private readonly authStore = inject(AuthStore);
  @ViewChild('cronogramaDialog') private cronogramaDialog?: ElementRef<HTMLDialogElement>;
  @ViewChild('cobroDialog') private cobroDialog?: ElementRef<HTMLDialogElement>;
  readonly esAdministrativo = computed(() => this.authStore.hasAnyRole(['DIRECCION', 'SECRETARIA']));
  readonly cobroSeleccionado = signal<ObligacionCobro | null>(null);
  metodoCaja: 'EFECTIVO' | 'TRANSFERENCIA' = 'EFECTIVO';
  referenciaTransferencia = '';
  readonly mensaje = signal<string | null>(null);
  private readonly clavesPago = new Map<number, string>();
  readonly cobrandoId = signal<number | null>(null);
  readonly pagandoId = signal<number | null>(null);
  readonly checkoutUrl = signal<string | null>(null);
  readonly checkoutObligacionId = signal<number | null>(null);
  readonly verificandoPago = signal(false);
  private seguimientoPago: ReturnType<typeof setInterval> | null = null;

  matriculaId = 1;
  readonly error = signal<string | null>(null);
  readonly guardando = signal(false);
  readonly conceptosMatricula = signal<ConceptoCobroResponseDto[]>([]);
  readonly conceptosPension = signal<ConceptoCobroResponseDto[]>([]);
  conceptoMatriculaId = 0;
  conceptoPensionId = 0;
  primerVencimiento = '';
  filtroEstado = 'TODOS';
  cargando = signal(false);

  readonly obligaciones = signal<ObligacionCobro[]>([]);

  obligacionesFiltradas(): ObligacionCobro[] {
    if (this.filtroEstado === 'TODOS') return this.obligaciones();
    return this.obligaciones().filter(o => o.estado === this.filtroEstado);
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

  ngOnInit(): void {
    this.cargarObligaciones();
    if (!this.esAdministrativo()) return;
    this.tesoreriaService.listarConceptos().subscribe({ next: conceptos => {
      this.conceptosMatricula.set(conceptos.filter(c => c.tipoConcepto === 'MATRICULA'));
      this.conceptosPension.set(conceptos.filter(c => c.tipoConcepto === 'PENSION'));
      this.conceptoMatriculaId = this.conceptosMatricula()[0]?.id ?? 0;
      this.conceptoPensionId = this.conceptosPension()[0]?.id ?? 0;
    }, error: () => this.error.set('No se pudieron cargar los conceptos de cobro.') });
  }

  cargarObligaciones(): void {
    if (this.esAdministrativo() && !this.matriculaId) { this.obligaciones.set([]); return; }
    this.cargando.set(true);
    const solicitud = this.esAdministrativo()
      ? this.tesoreriaService.listarObligaciones(this.matriculaId)
      : this.tesoreriaService.listarMisObligaciones();
    solicitud.subscribe({
      next: (res) => {
        this.cargando.set(false);
        if (Array.isArray(res)) {
          this.obligaciones.set(
            res.map(o => ({
              id: o.id,
              matriculaId: o.matriculaId,
              estudiante: `Matrícula #${o.matriculaId}`,
              concepto: o.descripcion || `Cuota #${o.numeroCuota || 1}`,
              monto: Number(o.montoBase || 0),
              saldoPendiente: Number(o.saldoPendiente || 0),
              totalPagado: Number(o.totalPagado || 0),
              fechaVencimiento: o.fechaVencimiento ? String(o.fechaVencimiento) : '-',
              estado: (o.estado as EstadoPago) || 'PENDIENTE'
            }))
          );
        } else {
          this.obligaciones.set([]);
        }
      },
      error: () => {
        this.cargando.set(false);
        this.obligaciones.set([]);
        this.error.set('No se pudieron cargar las obligaciones de pago.');
      }
    });
  }

  pagarConMercadoPago(item: ObligacionCobro): void {
    if (item.saldoPendiente <= 0 || this.pagandoId() !== null || this.cobrandoId() !== null) return;
    this.error.set(null);
    this.ngOnDestroy();
    this.checkoutUrl.set(null);
    this.checkoutObligacionId.set(null);
    this.pagandoId.set(item.id);
    const host = window.location.hostname.toLowerCase();
    const retornoPublico = window.location.protocol === 'https:' && host !== 'localhost' && host !== '127.0.0.1';
    const retorno = `${window.location.origin}/admin/tesoreria`;
    this.tesoreriaService.crearPreferenciaMercadoPago({
      obligacionPagoId: item.id,
      ...(retornoPublico ? { backUrlSuccess: `${retorno}?resultado=aprobado`, backUrlFailure: `${retorno}?resultado=fallido` } : {})
    }).subscribe({
      next: preferencia => {
        this.pagandoId.set(null);
        const enlace = preferencia.initPoint;
        try {
          const url = new URL(enlace);
          const dominio = url.hostname.toLowerCase();
          if (url.protocol !== 'https:' || !['mercadopago.com', 'mercadopago.com.pe'].some(base => dominio === base || dominio.endsWith(`.${base}`))) {
            throw new Error('URL de checkout no válida');
          }
          this.checkoutObligacionId.set(item.id);
          this.checkoutUrl.set(url.toString());
          if (this.seguimientoPago) clearInterval(this.seguimientoPago);
          this.seguimientoPago = setInterval(() => this.confirmarPago(), 10000);
        } catch {
          this.error.set('Mercado Pago devolvió un enlace de pago no válido.');
        }
      },
      error: err => {
        this.pagandoId.set(null);
        this.error.set(err?.error?.message ?? 'No se pudo iniciar el pago con Mercado Pago.');
      }
    });
  }

  confirmarPago(): void {
    const id = this.checkoutObligacionId();
    const enlace = this.checkoutUrl();
    if (!id || this.verificandoPago()) return;
    this.verificandoPago.set(true);
    this.tesoreriaService.confirmarPago(id).subscribe({
      next: pago => {
        this.verificandoPago.set(false);
        if (this.checkoutUrl() !== enlace) return;
        if (!pago) return;
        this.ngOnDestroy();
        this.checkoutUrl.set(null);
        this.checkoutObligacionId.set(null);
        this.mensaje.set('Pago confirmado y boleta registrada.');
        this.cargarObligaciones();
      },
      error: err => {
        this.verificandoPago.set(false);
        if (this.checkoutUrl() !== enlace) return;
        this.ngOnDestroy();
        this.error.set(err?.error?.message ?? 'No se pudo verificar el pago. Puedes volver a consultar.');
      }
    });
  }

  ngOnDestroy(): void {
    if (this.seguimientoPago) clearInterval(this.seguimientoPago);
    this.seguimientoPago = null;
  }

  cobrar(item: ObligacionCobro): void {
    if (item.saldoPendiente <= 0 || this.cobrandoId() !== null) return;
    this.error.set(null);
    this.metodoCaja = 'EFECTIVO';
    this.referenciaTransferencia = '';
    this.cobroSeleccionado.set(item);
    this.cobroDialog?.nativeElement.showModal();
  }

  confirmarCobro(item: ObligacionCobro): void {
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

  abrirModalEmitir(): void {
    this.error.set(null);
    this.mensaje.set(null);
    this.primerVencimiento = '';
    this.cronogramaDialog?.nativeElement.showModal();
  }

  cerrarCronograma(): void { this.cronogramaDialog?.nativeElement.close(); }
  cerrarCobro(): void { this.cobroDialog?.nativeElement.close(); this.cobroSeleccionado.set(null); }

  generarCronograma(): void {
    if (!this.matriculaId || !this.conceptoMatriculaId || !this.conceptoPensionId || !this.primerVencimiento) { this.error.set('Complete todos los campos del cronograma.'); return; }
    this.guardando.set(true); this.error.set(null);
    this.tesoreriaService.generarCronograma({ matriculaId: this.matriculaId, conceptoMatriculaId: this.conceptoMatriculaId, conceptoPensionId: this.conceptoPensionId, primerVencimiento: this.primerVencimiento }).subscribe({
      next: () => { this.guardando.set(false); this.cerrarCronograma(); this.mensaje.set('Cronograma generado correctamente.'); this.cargarObligaciones(); },
      error: err => { this.guardando.set(false); this.error.set(err?.error?.message ?? 'No se pudo generar el cronograma.'); }
    });
  }
}
