import { Component, ElementRef, inject, signal, computed, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppAlertComponent } from '../../shared/ui/app-alert.component';
import { StatusBadgeComponent } from '../../shared/ui/status-badge.component';
import { TesoreriaService } from '../../core/services/tesoreria.service';
import { ConceptoCobroResponseDto } from '../../core/models/tesoreria.model';
import { AuthStore } from '../../core/state/auth.store';
import { environment } from '../../../environments/environment';
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
    <div class="space-y-6 grid min-w-0 gap-[22px] text-[#172b4d] font-sans max-[600px]:gap-4">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t-[3px] border-[rgb(196_154_88_/_50%)] pt-3">
        <div>
          <h2 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#14213d] tracking-[-.025em]">Tesorería & Pagos</h2>
          <p class="text-sm text-[#64748b] mt-0">
            @if (esAdministrativo()) { Gestión de pensiones escolares, conciliación de caja y pagos digitales. }
            @else { Consulta tus obligaciones escolares y paga de forma segura con Mercado Pago. }
          </p>
        </div>
        @if (esAdministrativo()) {
        <div class="flex items-center gap-3">
          <button
            (click)="abrirModalEmitir()"
            class="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-blue-600/30 transition flex items-center gap-2 cursor-pointer box-border inline-flex min-w-0 !min-h-[40px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px] !text-sm !leading-[1.25]"
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

      @if (error()) { <p class="flex items-start gap-3 rounded-lg border border-transparent px-4 py-3 font-sans text-base leading-6 border-[#fca5a5] bg-[#fee2e2] text-[#7f1d1d]" role="alert">{{ error() }}</p> }
      @if (checkoutUrl()) {
        <div class="flex items-start gap-3 rounded-lg border border-transparent px-4 py-3 font-sans text-base leading-6 border-[#93c5fd] bg-[#dbeafe] text-[#1e3a8a] !grid gap-[10px] m-0" role="status">
          <p>Preferencia de prueba creada para la obligación #{{ checkoutObligacionId() }}. El pago solo se registrará cuando Mercado Pago confirme la operación.</p>
          <a [href]="checkoutUrl()" target="_blank" rel="noopener noreferrer" class="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-transparent px-4 py-2 text-center font-sans text-[15px] leading-[1.25] font-semibold no-underline transition-[background-color,border-color,color,box-shadow] duration-[140ms] [cursor:pointer] focus-visible:outline-3 focus-visible:outline-[rgb(37_99_235_/_35%)] focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:border-[#e2e8f0] disabled:bg-[#f1f5f9] disabled:text-[#64748b] aria-disabled:cursor-not-allowed aria-disabled:border-[#e2e8f0] aria-disabled:bg-[#f1f5f9] aria-disabled:text-[#64748b] bg-[#2563eb] text-white hover:bg-[#1d4ed8]">Abrir checkout de prueba</a>
          <p class="m-0 text-[#34445d] text-xs">Usa una cuenta compradora de prueba distinta de la vendedora. Después, vuelve aquí y actualiza las obligaciones.</p>
        </div>
      }
      @if (mensaje()) { <p class="flex items-start gap-3 rounded-lg border border-transparent px-4 py-3 font-sans text-base leading-6 border-[#86efac] bg-[#dcfce7] text-[#14532d]" role="status">{{ mensaje() }}</p> }
      @if (esAdministrativo()) {
        <dialog #cronogramaDialog class="box-border w-[min(680px,calc(100vw-24px))] max-w-[calc(100vw-24px)] max-h-[calc(100dvh-24px)] overflow-hidden border border-[#e4eaf3] rounded-[22px] bg-white text-[#14213d] p-0 shadow-[0_28px_90px_rgb(15_31_57_/_28%)] backdrop:bg-[rgb(12_24_43_/_46%)] backdrop:backdrop-blur-[3px] max-[639px]:w-[calc(100vw-16px)] max-[639px]:max-w-[calc(100vw-16px)] max-[639px]:max-h-[calc(100dvh-16px)] max-[639px]:rounded-[18px] !w-[min(600px,calc(100vw-24px))] !max-w-[calc(100vw-24px)] !max-h-[calc(100dvh-24px)] !overflow-hidden !rounded-[18px] !border-[#e1e8f1] !bg-white !p-0 !text-[#172b4d] font-sans !shadow-[0_24px_72px_rgb(15_31_57_/_24%)] backdrop:!bg-[rgb(15_31_57_/_48%)] backdrop:!backdrop-blur-[3px]" aria-labelledby="cronograma-dialog-title">
          <div class="flex max-h-[calc(100dvh-24px)] min-h-0 flex-col max-h-[calc(100dvh-24px)] overflow-auto bg-white"><header class="flex flex-[0_0_auto] items-center justify-between gap-4 border-b border-[#e5eaf2] px-6 py-5 [&_h3]:m-0 [&_h3]:text-[#14213d] [&_h3]:text-lg [&_h3]:leading-[27px] [&_h3]:font-[750] [&_p]:mb-0 [&_p]:mt-1 [&_p]:text-[#64748b] [&_p]:text-xs [&_p]:leading-[1.5] max-[639px]:p-4 bg-white"><div><h3 id="cronograma-dialog-title" class="!text-[#172b4d] !text-[19px] font-[750] !leading-[28.5px] tracking-[-.025em]">Generar cronograma de cobros</h3><p class="text-[#59677a]">Confirma matrícula, conceptos y fecha del primer vencimiento.</p></div><button type="button" class="min-h-9 rounded-xl border border-[#e5eaf2] bg-[#f5f7fb] px-3 !font-[650] text-[#334155] !h-9 !w-auto !min-h-9 !py-0 font-sans" (click)="cerrarCronograma()" aria-label="Cerrar">✕</button></header>
            <form (ngSubmit)="generarCronograma()" class="flex min-h-0 flex-[1_1_auto] flex-col"><div class="min-h-0 flex-[1_1_auto] overflow-auto overscroll-contain px-6 py-5 max-[639px]:p-4 space-y-4 bg-white text-[#34445d]">
              @if (error()) { <p class="flex items-start gap-3 rounded-lg border border-transparent px-4 py-3 font-sans text-base leading-6 border-[#fca5a5] bg-[#fee2e2] text-[#7f1d1d]" role="alert">{{ error() }}</p> }
              <label class="block min-w-0 text-xs font-semibold leading-normal text-[#475569] [&_input]:mt-[6px] [&_input]:block [&_input]:w-full [&_select]:mt-[6px] [&_select]:block [&_select]:w-full [&_textarea]:mt-[6px] [&_textarea]:block [&_textarea]:w-full text-[#34445d]">Matrícula ID *<input type="number" [(ngModel)]="matriculaId" name="matricula" min="1" required class="!min-h-11 !rounded-[10px] !border-[#cbd5e1] !px-[11px] !py-[9px] !text-[#172b4d] !font-sans max-[600px]:!text-sm min-w-0 !min-h-[44px] max-w-full border px-3 py-[10px] !border-[#d9e1ec] rounded-xl !bg-white !text-[#14213d] transition-colors focus:border-[#5b83d6] focus:outline-none focus:shadow-[0_0_0_3px_rgb(59_110_214_/_13%)] max-[639px]:text-base !font-[650]"></label>
              <label class="block min-w-0 text-xs font-semibold leading-normal text-[#475569] [&_input]:mt-[6px] [&_input]:block [&_input]:w-full [&_select]:mt-[6px] [&_select]:block [&_select]:w-full [&_textarea]:mt-[6px] [&_textarea]:block [&_textarea]:w-full text-[#34445d]">Concepto matrícula *<select [(ngModel)]="conceptoMatriculaId" name="conceptoMatricula" [disabled]="!conceptosMatricula().length" required class="!min-h-11 !rounded-[10px] !border-[#cbd5e1] !px-[11px] !py-[9px] !text-[#172b4d] !font-sans max-[600px]:!text-sm min-w-0 !min-h-[44px] max-w-full border px-3 py-[10px] !border-[#d9e1ec] rounded-xl !bg-white !text-[#14213d] transition-colors focus:border-[#5b83d6] focus:outline-none focus:shadow-[0_0_0_3px_rgb(59_110_214_/_13%)] max-[639px]:text-base !font-[650]">@if (!conceptosMatricula().length) { <option [ngValue]="0">Sin conceptos disponibles</option> } @for (c of conceptosMatricula(); track c.id) { <option [ngValue]="c.id">{{ c.nombre }}</option> }</select></label>
              <label class="block min-w-0 text-xs font-semibold leading-normal text-[#475569] [&_input]:mt-[6px] [&_input]:block [&_input]:w-full [&_select]:mt-[6px] [&_select]:block [&_select]:w-full [&_textarea]:mt-[6px] [&_textarea]:block [&_textarea]:w-full text-[#34445d]">Concepto pensión *<select [(ngModel)]="conceptoPensionId" name="conceptoPension" [disabled]="!conceptosPension().length" required class="!min-h-11 !rounded-[10px] !border-[#cbd5e1] !px-[11px] !py-[9px] !text-[#172b4d] !font-sans max-[600px]:!text-sm min-w-0 !min-h-[44px] max-w-full border px-3 py-[10px] !border-[#d9e1ec] rounded-xl !bg-white !text-[#14213d] transition-colors focus:border-[#5b83d6] focus:outline-none focus:shadow-[0_0_0_3px_rgb(59_110_214_/_13%)] max-[639px]:text-base !font-[650]">@if (!conceptosPension().length) { <option [ngValue]="0">Sin conceptos disponibles</option> } @for (c of conceptosPension(); track c.id) { <option [ngValue]="c.id">{{ c.nombre }}</option> }</select></label>
              <label class="block min-w-0 text-xs font-semibold leading-normal text-[#475569] [&_input]:mt-[6px] [&_input]:block [&_input]:w-full [&_select]:mt-[6px] [&_select]:block [&_select]:w-full [&_textarea]:mt-[6px] [&_textarea]:block [&_textarea]:w-full text-[#34445d]">Primer vencimiento *<input type="date" [(ngModel)]="primerVencimiento" name="primerVencimiento" required class="!min-h-11 !rounded-[10px] !border-[#cbd5e1] !px-[11px] !py-[9px] !text-[#172b4d] !font-sans max-[600px]:!text-sm min-w-0 !min-h-[44px] max-w-full border px-3 py-[10px] !border-[#d9e1ec] rounded-xl !bg-white !text-[#14213d] transition-colors focus:border-[#5b83d6] focus:outline-none focus:shadow-[0_0_0_3px_rgb(59_110_214_/_13%)] max-[639px]:text-base !font-[650]"></label>
            </div><footer class="sticky bottom-0 z-[1] flex flex-[0_0_auto] flex-wrap justify-end gap-[10px] border-t border-[#e5eaf2] bg-white px-6 py-[14px] max-[639px]:px-4 max-[639px]:py-3 max-[639px]:[&>button]:flex-[1_1_auto] border-t border-[#e5eaf2] bg-white max-[600px]:!flex-col-reverse"><button type="button" class="rounded-xl border border-[#e5eaf2] bg-[#f5f7fb] px-4 font-semibold text-[#334155] box-border inline-flex min-w-0 !min-h-[40px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]" (click)="cerrarCronograma()">Cancelar</button><button type="submit" [disabled]="guardando()" class="rounded-xl bg-[#2563eb] px-[18px] font-bold text-white shadow-[0_8px_18px_rgb(37_99_235_/_18%)] disabled:cursor-wait disabled:opacity-[.55] box-border inline-flex min-w-0 !min-h-[40px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]">{{ guardando() ? 'Generando…' : 'Generar cronograma' }}</button></footer></form>
          </div>
        </dialog>
        <dialog #cobroDialog class="box-border w-[min(680px,calc(100vw-24px))] max-w-[calc(100vw-24px)] max-h-[calc(100dvh-24px)] overflow-hidden border border-[#e4eaf3] rounded-[22px] bg-white text-[#14213d] p-0 shadow-[0_28px_90px_rgb(15_31_57_/_28%)] backdrop:bg-[rgb(12_24_43_/_46%)] backdrop:backdrop-blur-[3px] max-[639px]:w-[calc(100vw-16px)] max-[639px]:max-w-[calc(100vw-16px)] max-[639px]:max-h-[calc(100dvh-16px)] max-[639px]:rounded-[18px] !w-[min(600px,calc(100vw-24px))] !max-w-[calc(100vw-24px)] !max-h-[calc(100dvh-24px)] !overflow-hidden !rounded-[18px] !border-[#e1e8f1] !bg-white !p-0 !text-[#172b4d] font-sans !shadow-[0_24px_72px_rgb(15_31_57_/_24%)] backdrop:!bg-[rgb(15_31_57_/_48%)] backdrop:!backdrop-blur-[3px]" aria-labelledby="cobro-dialog-title">
          @if (cobroSeleccionado(); as obligacion) {
            <div class="flex max-h-[calc(100dvh-24px)] min-h-0 flex-col max-h-[calc(100dvh-24px)] overflow-auto bg-white"><header class="flex flex-[0_0_auto] items-center justify-between gap-4 border-b border-[#e5eaf2] px-6 py-5 [&_h3]:m-0 [&_h3]:text-[#14213d] [&_h3]:text-lg [&_h3]:leading-[27px] [&_h3]:font-[750] [&_p]:mb-0 [&_p]:mt-1 [&_p]:text-[#64748b] [&_p]:text-xs [&_p]:leading-[1.5] max-[639px]:p-4 bg-white"><div><h3 id="cobro-dialog-title" class="!text-[#172b4d] !text-[19px] font-[750] !leading-[28.5px] tracking-[-.025em]">Confirmar cobro en caja</h3><p class="text-[#59677a]">Verifica el monto antes de registrar el pago en efectivo.</p></div><button type="button" class="min-h-9 rounded-xl border border-[#e5eaf2] bg-[#f5f7fb] px-3 !font-[650] text-[#334155] !h-9 !w-auto !min-h-9 !py-0 font-sans" (click)="cerrarCobro()" aria-label="Cerrar">✕</button></header>
              <div class="min-h-0 flex-[1_1_auto] overflow-auto overscroll-contain px-6 py-5 max-[639px]:p-4 space-y-3 bg-white text-[#34445d] text-sm"><p><span class="font-semibold">Obligación:</span> #{{ obligacion.id }} · {{ obligacion.concepto }}</p><p><span class="font-semibold">Saldo a registrar:</span> S/ {{ obligacion.saldoPendiente | number:'1.2-2' }}</p>@if (error()) { <p class="flex items-start gap-3 rounded-lg border border-transparent px-4 py-3 font-sans text-base leading-6 border-[#fca5a5] bg-[#fee2e2] text-[#7f1d1d]" role="alert">{{ error() }}</p> }</div>
              <footer class="sticky bottom-0 z-[1] flex flex-[0_0_auto] flex-wrap justify-end gap-[10px] border-t border-[#e5eaf2] bg-white px-6 py-[14px] max-[639px]:px-4 max-[639px]:py-3 max-[639px]:[&>button]:flex-[1_1_auto] border-t border-[#e5eaf2] bg-white max-[600px]:!flex-col-reverse"><button type="button" class="rounded-xl border border-[#e5eaf2] bg-[#f5f7fb] px-4 font-semibold text-[#334155] box-border inline-flex min-w-0 !min-h-[40px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]" (click)="cerrarCobro()">Cancelar</button><button type="button" class="rounded-xl bg-[#2563eb] px-[18px] font-bold text-white shadow-[0_8px_18px_rgb(37_99_235_/_18%)] disabled:cursor-wait disabled:opacity-[.55] box-border inline-flex min-w-0 !min-h-[40px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]" [disabled]="cobrandoId() !== null" (click)="confirmarCobro(obligacion)">{{ cobrandoId() === obligacion.id ? 'Registrando…' : 'Confirmar pago en efectivo' }}</button></footer>
            </div>
          }
        </dialog>
      }

      <!-- Financial Summary Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 min-[901px]:!grid-cols-3 gap-5 max-[600px]:!gap-3 [&>*:last-child]:max-[900px]:col-span-full">
        <div class="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-[0_4px_16px_rgb(16_36_71_/_8%)] grid min-w-0 gap-[10px] !rounded-2xl !border-[#e1e8f1] !p-5 max-[600px]:!p-[17px] bg-white shadow-[0_5px_16px_rgb(23_43_77_/_5%)]">
          <div class="text-xs font-semibold text-[#64748b] uppercase tracking-wider">Pagado en obligaciones consultadas</div>
          <div class="text-3xl font-black text-[#047857] mt-2">S/ {{ recaudacionTotal() | number:'1.2-2' }}</div>
          <p class="text-xs text-[#64748b]">Suma de pagos registrados en las obligaciones consultadas</p>
        </div>

        <div class="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-[0_4px_16px_rgb(16_36_71_/_8%)] grid min-w-0 gap-[10px] !rounded-2xl !border-[#e1e8f1] !p-5 max-[600px]:!p-[17px] bg-white shadow-[0_5px_16px_rgb(23_43_77_/_5%)]">
          <div class="text-xs font-semibold text-[#64748b] uppercase tracking-wider">Pendiente por Cobrar</div>
          <div class="text-3xl font-black text-[#a16207] mt-2">S/ {{ pendienteTotal() | number:'1.2-2' }}</div>
          <p class="text-xs text-[#64748b]">Obligaciones vigentes en PostgreSQL</p>
        </div>

        <div class="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-[0_4px_16px_rgb(16_36_71_/_8%)] grid min-w-0 gap-[10px] !rounded-2xl !border-[#e1e8f1] !p-5 max-[600px]:!p-[17px] bg-white shadow-[0_5px_16px_rgb(23_43_77_/_5%)]">
          <div class="text-xs font-semibold text-[#64748b] uppercase tracking-wider">Pasarela Mercado Pago</div>
          <div class="text-3xl font-black text-[#2563eb] mt-2">Pago digital</div>
          <p class="text-xs text-[#64748b]">Checkout de prueba disponible para saldos pendientes</p>
        </div>
      </div>

      <!-- Obligations & Invoices Table -->
      <div class="min-w-0 overflow-hidden rounded-2xl border border-[#e1e8f1] bg-white shadow-sm">
        <div class="flex items-end justify-between gap-4 border-b border-[#e5eaf2] bg-white p-[18px] max-[600px]:items-stretch max-[600px]:flex-col max-[600px]:p-4">
          <h3 class="m-0 text-[#172b4d] text-[15px] font-extrabold tracking-[-.025em]">Registro de Obligaciones y Comprobantes</h3>
          <div class="flex flex-col flex-wrap items-stretch gap-3 sm:flex-row sm:items-center">
            @if (esAdministrativo()) { <div class="flex items-center gap-2">
              <label class="text-xs text-[#34445d]">Matrícula ID:</label>
              <input
                type="number"
                [(ngModel)]="matriculaId"
                (change)="cargarObligaciones()"
              class="w-full sm:w-24 rounded-lg border border-[#cbd5e1] bg-white px-2 py-1 text-base text-[#172b4d] focus:outline-none min-w-0 !min-h-[44px] max-w-full border px-3 py-[10px] !border-[#d9e1ec] rounded-xl !bg-white !text-[#14213d] transition-colors focus:border-[#5b83d6] focus:outline-none focus:shadow-[0_0_0_3px_rgb(59_110_214_/_13%)] max-[639px]:text-base box-border !min-h-11 !py-1 !text-base !leading-6"
              />
            </div> }
            <select
              [(ngModel)]="filtroEstado"
              class="w-full rounded-xl border border-[#cbd5e1] bg-white px-3 py-1.5 text-xs text-[#172b4d] focus:outline-none sm:w-auto min-w-0 !min-h-[44px] max-w-full border px-3 py-[10px] !border-[#d9e1ec] rounded-xl !bg-white !text-[#14213d] transition-colors focus:border-[#5b83d6] focus:outline-none focus:shadow-[0_0_0_3px_rgb(59_110_214_/_13%)] max-[639px]:text-base !min-h-11 !py-[6px] !text-base"
            >
              <option value="TODOS">Todos los Estados</option>
              <option value="PAGADO_TOTAL">Pagado</option>
              <option value="PAGADO_PARCIAL">Pago parcial</option>
              <option value="PENDIENTE">Pendiente</option>
              <option value="VENCIDO">Vencido</option>
            </select>
            <button
              (click)="cargarObligaciones()"
              class="cursor-pointer rounded-xl border border-[#e1e8f1] bg-[#f3f6fa] px-3 py-1.5 text-xs font-semibold text-[#172b4d] hover:bg-[#e8edf5] box-border inline-flex min-w-0 !min-h-[40px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px] !text-sm !leading-[1.25]"
            >
              Consultar BD
            </button>
          </div>
        </div>

        <p class="hidden min-[601px]:max-[1399px]:block m-0 bg-[#f4f7fb] px-3 py-[9px] text-[#34445d] text-[11px] font-semibold">Desliza horizontalmente para ver todas las columnas</p>
        <div class="max-w-full overflow-x-auto rounded-2xl border border-[#e2e8f0] bg-white min-w-0 overflow-x-auto">
          <table class="w-full border-collapse text-left font-sans text-base leading-6 text-[#1e293b] [&_th]:px-4 [&_th]:py-3 [&_th]:align-middle [&_th]:border-b [&_th]:border-[#e2e8f0] [&_td]:px-4 [&_td]:py-3 [&_td]:align-middle [&_td]:border-b [&_td]:border-[#e2e8f0] [&_th]:bg-[#f4f6fb] [&_th]:text-[13px] [&_th]:font-semibold [&_tr:last-child_td]:border-b-0 w-full min-w-[1100px] text-left text-xs min-[1400px]:min-w-0 min-[1400px]:table-fixed [&_thead]:!bg-[#f7f9fc] [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:!bg-[#f8faff]" data-mobile-table-cards="" data-treasury-mobile="">
            <thead class="border-b border-[#e1e8f1] bg-[#f5f7fb] text-[#34445d] uppercase tracking-[.04em] font-extrabold">
              <tr>
                <th class="!px-[5px] !py-3 !text-[11px] font-extrabold whitespace-nowrap min-[1400px]:!py-2 min-[1400px]:w-[6%]">ID BD</th>
                <th class="!px-[5px] !py-3 !text-[11px] font-extrabold whitespace-nowrap min-[1400px]:!py-2 min-[1400px]:w-[10%]">Matrícula ID</th>
                <th class="!px-[5px] !py-3 !text-[11px] font-extrabold whitespace-nowrap min-w-[190px] min-[1400px]:!py-2 min-[1400px]:w-[15%] min-[1400px]:min-w-0">Concepto</th>
                <th class="!px-[5px] !py-3 !text-[11px] font-extrabold whitespace-nowrap min-[1400px]:!py-2 min-[1400px]:w-[9%]">Monto Base</th>
                <th class="!px-[5px] !py-3 !text-[11px] font-extrabold whitespace-nowrap min-[1400px]:!py-2 min-[1400px]:w-[11%]">Saldo Pendiente</th>
                <th class="!px-[5px] !py-3 !text-[11px] font-extrabold whitespace-nowrap min-[1400px]:!py-2 min-[1400px]:w-[9%]">Vencimiento</th>
                <th class="!px-[5px] !py-3 !text-[11px] font-extrabold whitespace-nowrap min-[1400px]:!py-2 min-[1400px]:w-[14%]">Estado en BD</th>
                <th class="!px-[5px] !py-3 !text-[11px] font-extrabold whitespace-nowrap min-w-[140px] min-[1400px]:!py-2 min-[1400px]:w-[10%] min-[1400px]:min-w-0 min-[1400px]:whitespace-normal">Comprobante</th>
                <th class="sticky right-0 z-[5] !px-[5px] !py-3 !text-[11px] font-extrabold text-right whitespace-nowrap min-w-[170px] bg-[#f5f7fb] shadow-[-8px_0_12px_rgb(16_36_71_/_10%)] min-[1400px]:static min-[1400px]:z-auto min-[1400px]:!py-2 min-[1400px]:w-[16%] min-[1400px]:min-w-0 min-[1400px]:shadow-none">Acción</th>
              </tr>
            </thead>
            <tbody class="text-[#34445d]">
              @if (cargando()) {
                <tr>
                  <td colspan="9" class="py-10 text-center text-[#59677a]">
                    <div class="grid min-h-[180px] content-center justify-items-center gap-[10px] p-6 text-center text-[#34445d]"><span class="mb-1 h-[30px] w-[30px] rounded-full border-[3px] border-[#dbe6f5] border-t-[#2864c5] animate-[grade-spin_.8s_linear_infinite]" aria-hidden="true"></span><p>Consultando obligaciones financieras en la base de datos...</p></div>
                  </td>
                </tr>
              } @else {
                @for (item of obligacionesFiltradas(); track item.id) {
                  <tr class="transition hover:[&>td]:bg-[#f8faff]">
                    <td class="px-[5px] py-3 min-[601px]:!px-[5px] min-[601px]:!py-3 min-[1400px]:!py-2 font-mono text-[#64748b]" data-label="ID BD">{{ item.id }}</td>
                    <td class="px-[5px] py-3 min-[601px]:!px-[5px] min-[601px]:!py-3 min-[1400px]:!py-2 font-bold text-[#172b4d]" data-label="Matrícula ID">{{ item.estudiante }}</td>
                    <td class="px-[5px] py-3 min-[601px]:!px-[5px] min-[601px]:!py-3 min-[1400px]:!py-2" data-label="Concepto">
                      <span class="inline-block max-w-[260px] align-middle rounded bg-[#f1f4f9] px-2 py-0.5 text-[#475569] font-medium whitespace-normal leading-[1.35] max-[600px]:!whitespace-nowrap min-[1400px]:max-w-full">
                        {{ item.concepto }}
                      </span>
                    </td>
                    <td class="px-[5px] py-3 min-[601px]:!px-[5px] min-[601px]:!py-3 min-[1400px]:!py-2 font-mono font-bold text-[#172b4d]" data-label="Monto Base">
                      S/ {{ item.monto | number:'1.2-2' }}
                    </td>
                    <td class="px-[5px] py-3 min-[601px]:!px-[5px] min-[601px]:!py-3 min-[1400px]:!py-2 font-mono font-semibold text-[#805300]" data-label="Saldo Pendiente">
                      S/ {{ item.saldoPendiente | number:'1.2-2' }}
                    </td>
                    <td class="px-[5px] py-3 min-[601px]:!px-[5px] min-[601px]:!py-3 min-[1400px]:!py-2 font-mono whitespace-nowrap text-[#34445d]" data-label="Vencimiento">{{ item.fechaVencimiento | uiDatePe }}</td>
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
                        @default { <span class="text-[#34445d]">{{ item.estado }}</span> }
                      }
                    </td>
                    <td class="px-[5px] py-3 min-[601px]:!px-[5px] min-[601px]:!py-3 min-[1400px]:!py-2" data-label="Comprobante">@if (item.comprobanteNumero) { <span class="inline-flex min-h-7 items-center rounded-lg border border-[#b8dfcc] bg-[#edf9f3] px-2 py-1 text-[11px] font-bold text-[#126943] whitespace-nowrap">{{ item.comprobanteNumero }}</span> } @else { <span class="text-[#59677a] text-[11px]">—</span> }</td>
                    <td class="sticky right-0 z-[3] px-[5px] py-3 min-[601px]:!px-[5px] min-[601px]:!py-3 text-right min-w-[170px] min-[601px]:min-w-[176px] bg-white shadow-[-8px_0_12px_rgb(16_36_71_/_10%)] min-[1400px]:static min-[1400px]:z-auto min-[1400px]:!py-2 min-[1400px]:w-[16%] min-[1400px]:min-w-0 min-[1400px]:shadow-none" data-label="Acción">
                      @if (item.estado !== 'PAGADO_TOTAL' && item.estado !== 'CANCELADO_POR_TRASLADO' && item.saldoPendiente > 0) {
                        <div class="flex flex-wrap justify-end gap-[7px] max-[600px]:w-full max-[600px]:flex-col max-[600px]:items-stretch">
                          <button
                            (click)="pagarConMercadoPago(item)"
                            [disabled]="pagandoId() !== null || cobrandoId() !== null"
                            [attr.aria-label]="pagandoId() === item.id ? 'Preparando pago con Mercado Pago' : 'Pagar con Mercado Pago'"
                            class="inline-flex items-center justify-center gap-2 rounded-lg border border-transparent px-4 py-2 text-center font-sans text-[15px] leading-[1.25] font-semibold no-underline transition-[background-color,border-color,color,box-shadow] duration-[140ms] [cursor:pointer] focus-visible:outline-3 focus-visible:outline-[rgb(37_99_235_/_35%)] focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:border-[#e2e8f0] disabled:bg-[#f1f5f9] disabled:text-[#64748b] aria-disabled:cursor-not-allowed aria-disabled:border-[#e2e8f0] aria-disabled:bg-[#f1f5f9] aria-disabled:text-[#64748b] bg-[#2563eb] text-white hover:bg-[#1d4ed8] !min-h-10 !px-[10px] !py-2 !text-[11px] !font-normal whitespace-nowrap max-[600px]:!min-h-11 max-[600px]:!w-full box-border inline-flex min-w-0 min-h-10 items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:min-h-11 !leading-[1.4]"
                          ><span>{{ pagandoId() === item.id ? 'Preparando...' : 'Pagar' }}</span><span class="sr-only"> con Mercado Pago</span></button>
                          @if (esAdministrativo()) {
                            <button
                              (click)="cobrar(item)"
                              [disabled]="cobrandoId() !== null || pagandoId() !== null"
                              class="inline-flex items-center justify-center gap-2 rounded-lg border border-transparent px-4 py-2 text-center font-sans text-[15px] leading-[1.25] font-semibold no-underline transition-[background-color,border-color,color,box-shadow] duration-[140ms] [cursor:pointer] focus-visible:outline-3 focus-visible:outline-[rgb(37_99_235_/_35%)] focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:border-[#e2e8f0] disabled:bg-[#f1f5f9] disabled:text-[#64748b] aria-disabled:cursor-not-allowed aria-disabled:border-[#e2e8f0] aria-disabled:bg-[#f1f5f9] aria-disabled:text-[#64748b] border-[#e2e8f0] bg-white text-[#102447] hover:bg-[#f4f6fb] !min-h-10 !px-[10px] !py-2 !text-xs !font-normal whitespace-nowrap max-[600px]:!min-h-11 max-[600px]:!w-full box-border inline-flex min-w-0 min-h-10 items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:min-h-11"
                            >Cobrar en Caja</button>
                          }
                        </div>
                      } @else {
                        <span class="font-mono text-xs text-[#59677a]">Emitido</span>
                      }
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="9" class="py-12 text-center text-[#59677a]">
                      <div class="grid justify-items-center rounded-2xl border border-[#e2e8f0] bg-white p-6 text-center grid min-h-[180px] content-center justify-items-center gap-[10px] p-6 text-center text-[#34445d]"><p class="m-0 text-[#253a59] text-sm font-[750]">No se encontraron obligaciones de cobro en la base de datos.</p><p class="m-0 max-w-[48ch] text-[#59677a] text-xs leading-[1.5]">Genere el cronograma anual de pensiones para visualizar los compromisos de pago en PostgreSQL.</p></div>
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
export class TesoreriaComponent implements OnInit {
  private readonly tesoreriaService = inject(TesoreriaService);
  private readonly authStore = inject(AuthStore);
  @ViewChild('cronogramaDialog') private cronogramaDialog?: ElementRef<HTMLDialogElement>;
  @ViewChild('cobroDialog') private cobroDialog?: ElementRef<HTMLDialogElement>;
  readonly esAdministrativo = computed(() => this.authStore.hasAnyRole(['DIRECCION', 'SECRETARIA']));
  readonly cobroSeleccionado = signal<ObligacionCobro | null>(null);
  readonly mensaje = signal<string | null>(null);
  private readonly clavesPago = new Map<number, string>();
  readonly cobrandoId = signal<number | null>(null);
  readonly pagandoId = signal<number | null>(null);
  readonly checkoutUrl = signal<string | null>(null);
  readonly checkoutObligacionId = signal<number | null>(null);

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
        const enlace = environment.mercadoPagoSandbox ? preferencia.sandboxInitPoint : preferencia.initPoint;
        try {
          const url = new URL(enlace);
          const dominio = url.hostname.toLowerCase();
          if (url.protocol !== 'https:' || !['mercadopago.com', 'mercadopago.com.pe'].some(base => dominio === base || dominio.endsWith(`.${base}`))) {
            throw new Error('URL de checkout no válida');
          }
          this.checkoutObligacionId.set(item.id);
          this.checkoutUrl.set(url.toString());
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

  cobrar(item: ObligacionCobro): void {
    if (item.saldoPendiente <= 0 || this.cobrandoId() !== null) return;
    this.error.set(null);
    this.cobroSeleccionado.set(item);
    this.cobroDialog?.nativeElement.showModal();
  }

  confirmarCobro(item: ObligacionCobro): void {
    if (item.saldoPendiente <= 0 || this.cobrandoId() !== null) return;
    const clave = this.clavesPago.get(item.id) ?? `CAJA-${crypto.randomUUID()}`;
    this.clavesPago.set(item.id, clave);
    this.cobrandoId.set(item.id);
    const payload = {
      obligacionPagoId: item.id,
      montoPagado: item.saldoPendiente,
      metodoPago: 'EFECTIVO' as const,
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
