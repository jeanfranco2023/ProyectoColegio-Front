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
          <h2 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#14213d]">Tesorería & Pagos</h2>
          <p class="text-sm text-[#64748b] mt-0">
            @if (esAdministrativo()) { Gestión de pensiones escolares, conciliación de caja y pagos digitales. }
            @else { Consulta tus obligaciones escolares y paga de forma segura con Mercado Pago. }
          </p>
        </div>
        @if (esAdministrativo()) {
        <div class="flex items-center gap-3">
          <button
            (click)="abrirModalEmitir()"
            class="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-blue-600/30 transition flex items-center gap-2 cursor-pointer"
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

      @if (error()) { <p class="ui-alert ui-alert--error" role="alert">{{ error() }}</p> }
      @if (checkoutUrl()) {
        <div class="ui-alert ui-alert--info !grid gap-[10px] m-0" role="status">
          <p>Preferencia de prueba creada para la obligación #{{ checkoutObligacionId() }}. El pago solo se registrará cuando Mercado Pago confirme la operación.</p>
          <a [href]="checkoutUrl()" target="_blank" rel="noopener noreferrer" class="ui-button ui-button--primary">Abrir checkout de prueba</a>
          <p class="m-0 text-[#34445d] text-xs">Usa una cuenta compradora de prueba distinta de la vendedora. Después, vuelve aquí y actualiza las obligaciones.</p>
        </div>
      }
      @if (mensaje()) { <p class="ui-alert ui-alert--success" role="status">{{ mensaje() }}</p> }
      @if (esAdministrativo()) {
        <dialog #cronogramaDialog class="school-native-dialog !w-[min(600px,calc(100vw-24px))] !max-w-[calc(100vw-24px)] !max-h-[calc(100dvh-24px)] !overflow-hidden !rounded-[18px] !border-[#e1e8f1] !bg-white !p-0 !text-[#172b4d] font-sans !shadow-[0_24px_72px_rgb(15_31_57_/_24%)] backdrop:!bg-[rgb(15_31_57_/_48%)] backdrop:!backdrop-blur-[3px]" aria-labelledby="cronograma-dialog-title">
          <div class="school-dialog-shell max-h-[calc(100dvh-24px)] overflow-auto bg-white"><header class="school-dialog-header bg-white"><div><h3 id="cronograma-dialog-title" class="!text-[#172b4d] !text-[19px] font-[750]">Generar cronograma de cobros</h3><p class="text-[#59677a]">Confirma matrícula, conceptos y fecha del primer vencimiento.</p></div><button type="button" class="school-dialog-cancel !min-h-9 !px-3 font-sans" (click)="cerrarCronograma()" aria-label="Cerrar">✕</button></header>
            <form (ngSubmit)="generarCronograma()" class="school-dialog-form"><div class="school-dialog-body space-y-4 bg-white text-[#34445d]">
              @if (error()) { <p class="ui-alert ui-alert--error" role="alert">{{ error() }}</p> }
              <label class="school-dialog-field text-[#34445d]">Matrícula ID *<input type="number" [(ngModel)]="matriculaId" name="matricula" min="1" required class="!min-h-11 !rounded-[10px] !border-[#cbd5e1] !px-[11px] !py-[9px] !text-[#172b4d] !font-sans max-[600px]:!text-base"></label>
              <label class="school-dialog-field text-[#34445d]">Concepto matrícula *<select [(ngModel)]="conceptoMatriculaId" name="conceptoMatricula" [disabled]="!conceptosMatricula().length" required class="!min-h-11 !rounded-[10px] !border-[#cbd5e1] !px-[11px] !py-[9px] !text-[#172b4d] !font-sans max-[600px]:!text-base">@if (!conceptosMatricula().length) { <option [ngValue]="0">Sin conceptos disponibles</option> } @for (c of conceptosMatricula(); track c.id) { <option [ngValue]="c.id">{{ c.nombre }}</option> }</select></label>
              <label class="school-dialog-field text-[#34445d]">Concepto pensión *<select [(ngModel)]="conceptoPensionId" name="conceptoPension" [disabled]="!conceptosPension().length" required class="!min-h-11 !rounded-[10px] !border-[#cbd5e1] !px-[11px] !py-[9px] !text-[#172b4d] !font-sans max-[600px]:!text-base">@if (!conceptosPension().length) { <option [ngValue]="0">Sin conceptos disponibles</option> } @for (c of conceptosPension(); track c.id) { <option [ngValue]="c.id">{{ c.nombre }}</option> }</select></label>
              <label class="school-dialog-field text-[#34445d]">Primer vencimiento *<input type="date" [(ngModel)]="primerVencimiento" name="primerVencimiento" required class="!min-h-11 !rounded-[10px] !border-[#cbd5e1] !px-[11px] !py-[9px] !text-[#172b4d] !font-sans max-[600px]:!text-base"></label>
            </div><footer class="school-dialog-footer border-t border-[#e5eaf2] bg-white max-[600px]:!flex-col-reverse"><button type="button" class="school-dialog-cancel" (click)="cerrarCronograma()">Cancelar</button><button type="submit" [disabled]="guardando()" class="school-dialog-submit">{{ guardando() ? 'Generando…' : 'Generar cronograma' }}</button></footer></form>
          </div>
        </dialog>
        <dialog #cobroDialog class="school-native-dialog !w-[min(600px,calc(100vw-24px))] !max-w-[calc(100vw-24px)] !max-h-[calc(100dvh-24px)] !overflow-hidden !rounded-[18px] !border-[#e1e8f1] !bg-white !p-0 !text-[#172b4d] font-sans !shadow-[0_24px_72px_rgb(15_31_57_/_24%)] backdrop:!bg-[rgb(15_31_57_/_48%)] backdrop:!backdrop-blur-[3px]" aria-labelledby="cobro-dialog-title">
          @if (cobroSeleccionado(); as obligacion) {
            <div class="school-dialog-shell max-h-[calc(100dvh-24px)] overflow-auto bg-white"><header class="school-dialog-header bg-white"><div><h3 id="cobro-dialog-title" class="!text-[#172b4d] !text-[19px] font-[750]">Confirmar cobro en caja</h3><p class="text-[#59677a]">Verifica el monto antes de registrar el pago en efectivo.</p></div><button type="button" class="school-dialog-cancel !min-h-9 !px-3 font-sans" (click)="cerrarCobro()" aria-label="Cerrar">✕</button></header>
              <div class="school-dialog-body space-y-3 bg-white text-[#34445d] text-sm"><p><span class="font-semibold">Obligación:</span> #{{ obligacion.id }} · {{ obligacion.concepto }}</p><p><span class="font-semibold">Saldo a registrar:</span> S/ {{ obligacion.saldoPendiente | number:'1.2-2' }}</p>@if (error()) { <p class="ui-alert ui-alert--error" role="alert">{{ error() }}</p> }</div>
              <footer class="school-dialog-footer border-t border-[#e5eaf2] bg-white max-[600px]:!flex-col-reverse"><button type="button" class="school-dialog-cancel" (click)="cerrarCobro()">Cancelar</button><button type="button" class="school-dialog-submit" [disabled]="cobrandoId() !== null" (click)="confirmarCobro(obligacion)">{{ cobrandoId() === obligacion.id ? 'Registrando…' : 'Confirmar pago en efectivo' }}</button></footer>
            </div>
          }
        </dialog>
      }

      <!-- Financial Summary Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 min-[901px]:!grid-cols-3 gap-5 max-[600px]:!gap-3 [&>*:last-child]:max-[900px]:col-span-full">
        <div class="ui-card grid min-w-0 gap-[10px] !rounded-2xl !border-[#e1e8f1] !p-5 max-[600px]:!p-[17px] bg-white shadow-[0_5px_16px_rgb(23_43_77_/_5%)]">
          <div class="text-xs font-semibold text-[#64748b] uppercase tracking-wider">Pagado en obligaciones consultadas</div>
          <div class="text-3xl font-black text-emerald-400 mt-2">S/ {{ recaudacionTotal() | number:'1.2-2' }}</div>
          <p class="text-xs text-[#64748b]">Suma de pagos registrados en las obligaciones consultadas</p>
        </div>

        <div class="ui-card grid min-w-0 gap-[10px] !rounded-2xl !border-[#e1e8f1] !p-5 max-[600px]:!p-[17px] bg-white shadow-[0_5px_16px_rgb(23_43_77_/_5%)]">
          <div class="text-xs font-semibold text-[#64748b] uppercase tracking-wider">Pendiente por Cobrar</div>
          <div class="text-3xl font-black text-amber-400 mt-2">S/ {{ pendienteTotal() | number:'1.2-2' }}</div>
          <p class="text-xs text-[#64748b]">Obligaciones vigentes en PostgreSQL</p>
        </div>

        <div class="ui-card grid min-w-0 gap-[10px] !rounded-2xl !border-[#e1e8f1] !p-5 max-[600px]:!p-[17px] bg-white shadow-[0_5px_16px_rgb(23_43_77_/_5%)]">
          <div class="text-xs font-semibold text-[#64748b] uppercase tracking-wider">Pasarela Mercado Pago</div>
          <div class="text-3xl font-black text-blue-400 mt-2">Pago digital</div>
          <p class="text-xs text-[#64748b]">Checkout de prueba disponible para saldos pendientes</p>
        </div>
      </div>

      <!-- Obligations & Invoices Table -->
      <div class="min-w-0 overflow-hidden rounded-2xl border border-[#e1e8f1] bg-white shadow-sm">
        <div class="flex items-end justify-between gap-4 border-b border-[#e5eaf2] bg-white p-[18px] max-[600px]:items-stretch max-[600px]:flex-col max-[600px]:p-4">
          <h3 class="m-0 text-[#172b4d] text-[15px] font-extrabold">Registro de Obligaciones y Comprobantes</h3>
          <div class="flex flex-col flex-wrap items-stretch gap-3 sm:flex-row sm:items-center">
            @if (esAdministrativo()) { <div class="flex items-center gap-2">
              <label class="text-xs text-[#34445d]">Matrícula ID:</label>
              <input
                type="number"
                [(ngModel)]="matriculaId"
                (change)="cargarObligaciones()"
              class="w-full sm:w-24 rounded-lg border border-[#cbd5e1] bg-white px-2 py-1 text-xs text-[#172b4d] focus:outline-none"
              />
            </div> }
            <select
              [(ngModel)]="filtroEstado"
              class="w-full rounded-xl border border-[#cbd5e1] bg-white px-3 py-1.5 text-xs text-[#172b4d] focus:outline-none sm:w-auto"
            >
              <option value="TODOS">Todos los Estados</option>
              <option value="PAGADO_TOTAL">Pagado</option>
              <option value="PAGADO_PARCIAL">Pago parcial</option>
              <option value="PENDIENTE">Pendiente</option>
              <option value="VENCIDO">Vencido</option>
            </select>
            <button
              (click)="cargarObligaciones()"
              class="cursor-pointer rounded-xl border border-[#e1e8f1] bg-[#f3f6fa] px-3 py-1.5 text-xs font-semibold text-[#172b4d] hover:bg-[#e8edf5]"
            >
              Consultar BD
            </button>
          </div>
        </div>

        <p class="hidden min-[601px]:max-[1399px]:block m-0 bg-[#f4f7fb] px-3 py-[9px] text-[#34445d] text-[11px] font-semibold">Desliza horizontalmente para ver todas las columnas</p>
        <div class="ui-table-wrap min-w-0 overflow-x-auto">
          <table class="ui-table w-full min-w-[1100px] text-left text-xs ui-mobile-table-cards min-[1400px]:min-w-0 min-[1400px]:table-fixed">
            <thead class="border-b border-[#e1e8f1] bg-[#f5f7fb] text-[#34445d] uppercase tracking-[.04em] font-extrabold">
              <tr>
                <th class="!px-[5px] !py-[14px] !text-[11px] font-extrabold whitespace-nowrap min-[1400px]:!py-2 min-[1400px]:w-[6%]">ID BD</th>
                <th class="!px-[5px] !py-[14px] !text-[11px] font-extrabold whitespace-nowrap min-[1400px]:!py-2 min-[1400px]:w-[10%]">Matrícula ID</th>
                <th class="!px-[5px] !py-[14px] !text-[11px] font-extrabold whitespace-nowrap min-w-[190px] min-[1400px]:!py-2 min-[1400px]:w-[15%] min-[1400px]:min-w-0">Concepto</th>
                <th class="!px-[5px] !py-[14px] !text-[11px] font-extrabold whitespace-nowrap min-[1400px]:!py-2 min-[1400px]:w-[9%]">Monto Base</th>
                <th class="!px-[5px] !py-[14px] !text-[11px] font-extrabold whitespace-nowrap min-[1400px]:!py-2 min-[1400px]:w-[11%]">Saldo Pendiente</th>
                <th class="!px-[5px] !py-[14px] !text-[11px] font-extrabold whitespace-nowrap min-[1400px]:!py-2 min-[1400px]:w-[9%]">Vencimiento</th>
                <th class="!px-[5px] !py-[14px] !text-[11px] font-extrabold whitespace-nowrap min-[1400px]:!py-2 min-[1400px]:w-[14%]">Estado en BD</th>
                <th class="!px-[5px] !py-[14px] !text-[11px] font-extrabold whitespace-nowrap min-w-[140px] min-[1400px]:!py-2 min-[1400px]:w-[10%] min-[1400px]:min-w-0 min-[1400px]:whitespace-normal">Comprobante</th>
                <th class="sticky right-0 z-[5] !px-[5px] !py-[14px] !text-[11px] font-extrabold text-right whitespace-nowrap min-w-[170px] bg-[#f5f7fb] shadow-[-8px_0_12px_rgb(16_36_71_/_10%)] min-[1400px]:static min-[1400px]:z-auto min-[1400px]:!py-2 min-[1400px]:w-[16%] min-[1400px]:min-w-0 min-[1400px]:shadow-none">Acción</th>
              </tr>
            </thead>
            <tbody class="text-[#34445d]">
              @if (cargando()) {
                <tr>
                  <td colspan="9" class="py-10 text-center text-[#59677a]">
                    <div class="grid min-h-[180px] content-center justify-items-center gap-[10px] p-6 text-center text-[#34445d]"><span class="mb-1 h-[30px] w-[30px] rounded-full border-[3px] border-[#dbe6f5] border-t-[#2864c5] animate-[ui-grade-spin_.8s_linear_infinite]" aria-hidden="true"></span><p>Consultando obligaciones financieras en la base de datos...</p></div>
                  </td>
                </tr>
              } @else {
                @for (item of obligacionesFiltradas(); track item.id) {
                  <tr class="transition hover:[&>td]:bg-[#f8faff]">
                    <td class="px-[5px] py-[14px] min-[601px]:!px-[5px] min-[601px]:!py-[14px] min-[1400px]:!py-2 font-mono text-[#64748b]" data-label="ID BD">{{ item.id }}</td>
                    <td class="px-[5px] py-[14px] min-[601px]:!px-[5px] min-[601px]:!py-[14px] min-[1400px]:!py-2 font-bold text-[#172b4d]" data-label="Matrícula ID">{{ item.estudiante }}</td>
                    <td class="px-[5px] py-[14px] min-[601px]:!px-[5px] min-[601px]:!py-[14px] min-[1400px]:!py-2" data-label="Concepto">
                      <span class="inline-block max-w-[260px] align-middle rounded bg-[#f1f4f9] px-2 py-0.5 text-[#475569] whitespace-normal leading-[1.35] max-[600px]:text-xs min-[1400px]:max-w-full">
                        {{ item.concepto }}
                      </span>
                    </td>
                    <td class="px-[5px] py-[14px] min-[601px]:!px-[5px] min-[601px]:!py-[14px] min-[1400px]:!py-2 font-mono font-bold text-[#172b4d]" data-label="Monto Base">
                      S/ {{ item.monto | number:'1.2-2' }}
                    </td>
                    <td class="px-[5px] py-[14px] min-[601px]:!px-[5px] min-[601px]:!py-[14px] min-[1400px]:!py-2 font-mono font-semibold text-[#805300]" data-label="Saldo Pendiente">
                      S/ {{ item.saldoPendiente | number:'1.2-2' }}
                    </td>
                    <td class="px-[5px] py-[14px] min-[601px]:!px-[5px] min-[601px]:!py-[14px] min-[1400px]:!py-2 font-mono text-[#34445d]" data-label="Vencimiento">{{ item.fechaVencimiento | uiDatePe }}</td>
                    <td class="px-[5px] py-[14px] min-[601px]:!px-[5px] min-[601px]:!py-[14px] min-[1400px]:!py-2" data-label="Estado en BD">
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
                    <td class="px-[5px] py-[14px] min-[601px]:!px-[5px] min-[601px]:!py-[14px] min-[1400px]:!py-2" data-label="Comprobante">@if (item.comprobanteNumero) { <span class="inline-flex min-h-7 items-center rounded-lg border border-[#b8dfcc] bg-[#edf9f3] px-2 py-1 text-[11px] font-bold text-[#126943] whitespace-nowrap">{{ item.comprobanteNumero }}</span> } @else { <span class="text-[#59677a] text-[11px]">—</span> }</td>
                    <td class="sticky right-0 z-[3] px-[5px] py-[14px] min-[601px]:!px-[5px] min-[601px]:!py-[14px] text-right min-w-[170px] bg-white shadow-[-8px_0_12px_rgb(16_36_71_/_10%)] min-[1400px]:static min-[1400px]:z-auto min-[1400px]:!py-2 min-[1400px]:w-[16%] min-[1400px]:min-w-0 min-[1400px]:shadow-none" data-label="Acción">
                      @if (item.estado !== 'PAGADO_TOTAL' && item.estado !== 'CANCELADO_POR_TRASLADO' && item.saldoPendiente > 0) {
                        <div class="flex flex-wrap justify-end gap-[7px] max-[600px]:w-full max-[600px]:flex-col max-[600px]:items-stretch">
                          <button
                            (click)="pagarConMercadoPago(item)"
                            [disabled]="pagandoId() !== null || cobrandoId() !== null"
                            [attr.aria-label]="pagandoId() === item.id ? 'Preparando pago con Mercado Pago' : 'Pagar con Mercado Pago'"
                            class="ui-button ui-button--primary !min-h-10 !px-[10px] !py-2 !text-xs !font-normal whitespace-nowrap max-[600px]:!min-h-11 max-[600px]:!w-full"
                          ><span>{{ pagandoId() === item.id ? 'Preparando...' : 'Pagar' }}</span><span class="sr-only"> con Mercado Pago</span></button>
                          @if (esAdministrativo()) {
                            <button
                              (click)="cobrar(item)"
                              [disabled]="cobrandoId() !== null || pagandoId() !== null"
                              class="ui-button ui-button--secondary !min-h-10 !px-[10px] !py-2 !text-xs !font-normal whitespace-nowrap max-[600px]:!min-h-11 max-[600px]:!w-full"
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
                      <div class="grid min-h-[180px] content-center justify-items-center gap-[10px] p-6 text-center text-[#34445d]"><p class="text-[#253a59] text-sm font-bold">No se encontraron obligaciones de cobro en la base de datos.</p><p class="max-w-[48ch] text-[#59677a] text-xs leading-[1.5]">Genere el cronograma anual de pensiones para visualizar los compromisos de pago en PostgreSQL.</p></div>
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
