import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';

export type MetodoPagoOnline =
  | 'TARJETA_CREDITO'
  | 'TARJETA_DEBITO'
  | 'YAPE'
  | 'PLIN'
  | 'TRANSFERENCIA'
  | 'PAGO_EFECTIVO';

export interface PagoSimuladoEvent {
  metodoPago: MetodoPagoOnline;
  referenciaOperacion: string;
}

type PestanaCheckout = 'TARJETA' | 'YAPE' | 'PLIN' | 'BANCARIO';

@Component({
  selector: 'app-simulador-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (sandboxHabilitado) {
      <div class="rounded-2xl border border-[#bae6fd] bg-white p-4 sm:p-5 text-left shadow-xs space-y-4">
        @if (!ocultarCabecera) {
          <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <span class="inline-flex items-center gap-1.5 rounded-full bg-[#009EE3]/15 px-2.5 py-0.5 text-xs font-extrabold text-[#006699]">
                  Mercado Pago · Checkout Digital
                </span>
                <span class="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-900">
                  Modo Sandbox
                </span>
              </div>
              <h4 class="m-0 mt-1.5 text-base font-bold text-[#14213d] break-words">{{ titulo }}</h4>
            </div>
            <div class="text-right shrink-0">
              <span class="block text-xs font-semibold text-slate-500">Importe total a pagar</span>
              <strong class="text-xl font-extrabold text-[#173B67]">S/ {{ monto | number:'1.2-2' }}</strong>
            </div>
          </div>
        } @else {
          <div class="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5">
            <div class="flex items-center gap-2">
              <span class="inline-flex items-center rounded-full bg-[#009EE3]/15 px-2.5 py-0.5 text-[11px] font-extrabold text-[#006699]">
                Checkout Digital Mercado Pago
              </span>
              <span class="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-900">
                Sandbox
              </span>
            </div>
            <div class="flex items-baseline gap-1.5">
              <span class="text-xs font-semibold text-slate-500">Total:</span>
              <strong class="text-base font-extrabold text-[#173B67]">S/ {{ monto | number:'1.2-2' }}</strong>
            </div>
          </div>
        }

        @if (resumenConceptos.length > 0) {
          <div class="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3.5 py-2.5">
            <span class="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Conceptos incluidos ({{ resumenConceptos.length }})
            </span>
            <ul class="m-0 list-none p-0 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs font-medium text-slate-700 max-h-28 overflow-y-auto pr-1">
              @for (concepto of resumenConceptos; track concepto) {
                <li class="flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-white px-2.5 py-1 truncate" [title]="concepto">
                  <span class="h-1.5 w-1.5 shrink-0 rounded-full bg-[#009EE3]" aria-hidden="true"></span>
                  <span class="truncate">{{ concepto }}</span>
                </li>
              }
            </ul>
          </div>
        }

        <div class="flex flex-wrap items-center justify-between gap-2">
          <span class="text-xs font-semibold text-slate-600">Elige tu medio de pago respaldado por Mercado Pago:</span>
          <button type="button" (click)="autocompletarDatosPrueba()" data-testid="btn-autocompletar-checkout"
            class="inline-flex items-center gap-1 rounded-lg border border-[#009EE3]/40 bg-[#f0f9ff] px-2.5 py-1 text-xs font-bold text-[#0369a1] hover:bg-[#e0f2fe] transition cursor-pointer">
            ⚡ Autocompletar datos de prueba
          </button>
        </div>

        <!-- Tabs de medios de pago -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2" role="tablist" aria-label="Medios de pago disponibles">
          <button type="button" role="tab" [attr.aria-selected]="tab() === 'TARJETA'"
            (click)="seleccionarTab('TARJETA')"
            class="min-h-11 rounded-xl border px-3 py-2 text-sm font-bold transition cursor-pointer"
            [class.border-[#173B67]]="tab() === 'TARJETA'"
            [class.bg-[#173B67]]="tab() === 'TARJETA'"
            [class.text-white]="tab() === 'TARJETA'"
            [class.border-slate-200]="tab() !== 'TARJETA'"
            [class.bg-slate-50]="tab() !== 'TARJETA'"
            [class.text-slate-700]="tab() !== 'TARJETA'">
            💳 Tarjeta
          </button>
          <button type="button" role="tab" [attr.aria-selected]="tab() === 'YAPE'"
            (click)="seleccionarTab('YAPE')"
            class="min-h-11 rounded-xl border px-3 py-2 text-sm font-bold transition cursor-pointer"
            [class.border-[#742284]]="tab() === 'YAPE'"
            [class.bg-[#742284]]="tab() === 'YAPE'"
            [class.text-white]="tab() === 'YAPE'"
            [class.border-slate-200]="tab() !== 'YAPE'"
            [class.bg-slate-50]="tab() !== 'YAPE'"
            [class.text-slate-700]="tab() !== 'YAPE'">
            📱 Yape
          </button>
          <button type="button" role="tab" [attr.aria-selected]="tab() === 'PLIN'"
            (click)="seleccionarTab('PLIN')"
            class="min-h-11 rounded-xl border px-3 py-2 text-sm font-bold transition cursor-pointer"
            [class.border-[#00A6A6]]="tab() === 'PLIN'"
            [class.bg-[#00A6A6]]="tab() === 'PLIN'"
            [class.text-white]="tab() === 'PLIN'"
            [class.border-slate-200]="tab() !== 'PLIN'"
            [class.bg-slate-50]="tab() !== 'PLIN'"
            [class.text-slate-700]="tab() !== 'PLIN'">
            💠 Plin
          </button>
          <button type="button" role="tab" [attr.aria-selected]="tab() === 'BANCARIO'"
            (click)="seleccionarTab('BANCARIO')"
            class="min-h-11 rounded-xl border px-3 py-2 text-sm font-bold transition cursor-pointer"
            [class.border-[#173B67]]="tab() === 'BANCARIO'"
            [class.bg-[#173B67]]="tab() === 'BANCARIO'"
            [class.text-white]="tab() === 'BANCARIO'"
            [class.border-slate-200]="tab() !== 'BANCARIO'"
            [class.bg-slate-50]="tab() !== 'BANCARIO'"
            [class.text-slate-700]="tab() !== 'BANCARIO'">
            🏦 PagoEfectivo / Transf.
          </button>
        </div>

        @if (errorLocal()) {
          <p class="m-0 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm font-semibold text-rose-800" role="alert">
            {{ errorLocal() }}
          </p>
        }

        <!-- Panel 1: Tarjeta Crédito / Débito -->
        @if (tab() === 'TARJETA') {
          <div class="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <div class="flex flex-wrap gap-3">
              <label class="flex items-center gap-2 text-sm font-semibold text-slate-800 cursor-pointer">
                <input type="radio" name="tipoTarjetaCheckout" value="TARJETA_CREDITO" [(ngModel)]="tipoTarjeta" />
                Tarjeta de Crédito
              </label>
              <label class="flex items-center gap-2 text-sm font-semibold text-slate-800 cursor-pointer">
                <input type="radio" name="tipoTarjetaCheckout" value="TARJETA_DEBITO" [(ngModel)]="tipoTarjeta" />
                Tarjeta de Débito
              </label>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div class="sm:col-span-2">
                <label class="block text-sm font-semibold text-slate-700 mb-1">Número de tarjeta *</label>
                <input type="text" [(ngModel)]="tarjetaNumero" (ngModelChange)="formatearTarjeta($event)"
                  maxlength="19" inputmode="numeric" placeholder="4557 8800 1234 5678"
                  class="w-full min-h-11 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-base font-mono text-slate-900 focus:border-[#173B67] focus:outline-none" />
              </div>
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1">Vencimiento (MM/AA) *</label>
                <input type="text" [(ngModel)]="tarjetaVencimiento" (ngModelChange)="formatearVencimiento($event)"
                  maxlength="5" inputmode="numeric" placeholder="08/29"
                  class="w-full min-h-11 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-base font-mono text-slate-900 focus:border-[#173B67] focus:outline-none" />
              </div>
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1">CVV *</label>
                <input type="password" [(ngModel)]="tarjetaCvv" maxlength="4" inputmode="numeric" placeholder="•••"
                  class="w-full min-h-11 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-base font-mono text-slate-900 focus:border-[#173B67] focus:outline-none" />
              </div>
              <div class="sm:col-span-2">
                <label class="block text-sm font-semibold text-slate-700 mb-1">Nombre del titular *</label>
                <input type="text" [(ngModel)]="tarjetaTitular" maxlength="60" placeholder="Como figura en la tarjeta"
                  class="w-full min-h-11 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-base text-slate-900 focus:border-[#173B67] focus:outline-none" />
              </div>
            </div>
          </div>
        }

        <!-- Panel 2: Yape / Plin -->
        @if (tab() === 'YAPE' || tab() === 'PLIN') {
          <div class="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-4 items-center rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <div class="mx-auto flex flex-col items-center justify-center rounded-2xl border-2 bg-white p-3 w-36 h-36 shadow-2xs"
              [class.border-[#742284]]="tab() === 'YAPE'"
              [class.border-[#00A6A6]]="tab() === 'PLIN'">
              <svg viewBox="0 0 64 64" class="w-24 h-24 text-slate-900" aria-hidden="true">
                <rect x="4" y="4" width="18" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="4" />
                <rect x="10" y="10" width="6" height="6" fill="currentColor" />
                <rect x="42" y="4" width="18" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="4" />
                <rect x="48" y="10" width="6" height="6" fill="currentColor" />
                <rect x="4" y="42" width="18" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="4" />
                <rect x="10" y="48" width="6" height="6" fill="currentColor" />
                <path d="M28 8h8v8h-8zm0 14h6v6h-6zm10 6h8v8h-8zm-10 10h8v8h-8zm16 10h12v12H44zm-16 8h10v6H28z" fill="currentColor" />
              </svg>
              <span class="text-xs font-bold uppercase tracking-wider mt-1"
                [class.text-[#742284]]="tab() === 'YAPE'"
                [class.text-[#008080]]="tab() === 'PLIN'">
                QR {{ tab() }} Escolar
              </span>
            </div>
            <div class="space-y-3">
              <p class="m-0 text-sm text-slate-700 leading-relaxed">
                Escanea el QR o yapea/plinea al <strong>987 654 321</strong> (I.E. Shuji Kitamura) por <strong>S/ {{ monto | number:'1.2-2' }}</strong> e ingresa tu código de aprobación:
              </p>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label class="block text-sm font-semibold text-slate-700 mb-1">Celular de tu billetera *</label>
                  <input type="text" [(ngModel)]="billeteraCelular" maxlength="9" inputmode="numeric" placeholder="9XXXXXXXX"
                    class="w-full min-h-11 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-base font-mono text-slate-900 focus:border-[#173B67] focus:outline-none" />
                </div>
                <div>
                  <label class="block text-sm font-semibold text-slate-700 mb-1">Código de aprobación *</label>
                  <input type="text" [(ngModel)]="billeteraCodigo" maxlength="8" inputmode="numeric" placeholder="6 dígitos (ej. 482910)"
                    class="w-full min-h-11 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-base font-mono text-slate-900 focus:border-[#173B67] focus:outline-none" />
                </div>
              </div>
            </div>
          </div>
        }

        <!-- Panel 3: PagoEfectivo / Transferencia -->
        @if (tab() === 'BANCARIO') {
          <div class="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <div class="flex flex-wrap gap-3">
              <label class="flex items-center gap-2 text-sm font-semibold text-slate-800 cursor-pointer">
                <input type="radio" name="tipoBancarioCheckout" value="PAGO_EFECTIVO" [(ngModel)]="tipoBancario" />
                PagoEfectivo (Código CIP)
              </label>
              <label class="flex items-center gap-2 text-sm font-semibold text-slate-800 cursor-pointer">
                <input type="radio" name="tipoBancarioCheckout" value="TRANSFERENCIA" [(ngModel)]="tipoBancario" />
                Transferencia bancaria
              </label>
            </div>
            <div class="rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700">
              @if (tipoBancario === 'PAGO_EFECTIVO') {
                <span>Código CIP asignado: <strong class="font-mono text-[#173B67]">912 405 881</strong> · Válido 24 h en agentes y banca móvil.</span>
              } @else {
                <span>CCI Colegio Shuji: <strong class="font-mono text-[#173B67]">002-191-004829103847-55</strong> (BCP Soles).</span>
              }
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1">Número de operación / comprobante *</label>
              <input type="text" [(ngModel)]="operacionBancaria" maxlength="30" placeholder="Ej. OP-2026111201"
                class="w-full min-h-11 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-base font-mono text-slate-900 focus:border-[#173B67] focus:outline-none" />
            </div>
          </div>
        }

        <div class="flex flex-wrap items-center justify-between gap-3 pt-1">
          @if (enlaceExterno) {
            <a [href]="enlaceExterno" target="_blank" rel="noopener noreferrer"
              class="text-sm font-bold text-[#173B67] hover:underline">
              Abrir pasarela Mercado Pago ↗
            </a>
          } @else {
            <span></span>
          }
          <button type="button" (click)="confirmarSimulacion()" [disabled]="procesando"
            class="min-h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-2.5 text-sm sm:text-base font-bold text-white shadow-md transition disabled:opacity-50 cursor-pointer inline-flex items-center gap-2">
            @if (procesando) {
              <span class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <span>Procesando pago…</span>
            } @else {
              <span>Confirmar pago en línea (S/ {{ monto | number:'1.2-2' }})</span>
            }
          </button>
        </div>
      </div>
    } @else if (enlaceExterno) {
      <div class="rounded-2xl border border-[#bae6fd] bg-[#f0f9ff]/60 p-4 text-center space-y-3">
        <p class="m-0 text-sm font-semibold text-[#173B67]">
          Serás redirigido a la pasarela oficial de <strong>Mercado Pago</strong> por <strong>S/ {{ monto | number:'1.2-2' }}</strong>.
        </p>
        <div class="flex justify-center">
          <a [href]="enlaceExterno" target="_blank" rel="noopener noreferrer"
            class="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#009EE3] px-5 py-2.5 text-sm font-bold text-white no-underline shadow-sm hover:bg-[#007eb5]">
            Ir a pagar con Mercado Pago ↗
          </a>
        </div>
      </div>
    }
  `
})
export class SimuladorCheckoutComponent {
  @Input() monto = 0;
  @Input() enlaceExterno: string | null = null;
  @Input() procesando = false;
  @Input() titulo = 'Paga con Tarjeta, Yape, Plin o Banca';
  @Input() resumenConceptos: string[] = [];
  @Input() ocultarCabecera = false;
  @Output() pagoSimulado = new EventEmitter<PagoSimuladoEvent>();

  readonly sandboxHabilitado = environment.mercadoPagoSandbox;
  readonly tab = signal<PestanaCheckout>('TARJETA');
  readonly errorLocal = signal<string | null>(null);

  tipoTarjeta: 'TARJETA_CREDITO' | 'TARJETA_DEBITO' = 'TARJETA_CREDITO';
  tarjetaNumero = '';
  tarjetaVencimiento = '';
  tarjetaCvv = '';
  tarjetaTitular = '';

  billeteraCelular = '';
  billeteraCodigo = '';

  tipoBancario: 'PAGO_EFECTIVO' | 'TRANSFERENCIA' = 'PAGO_EFECTIVO';
  operacionBancaria = '';

  seleccionarTab(nueva: PestanaCheckout): void {
    this.tab.set(nueva);
    this.errorLocal.set(null);
  }

  autocompletarDatosPrueba(): void {
    this.errorLocal.set(null);
    const pestana = this.tab();
    if (pestana === 'TARJETA') {
      this.tarjetaNumero = '4557 8800 1234 5678';
      this.tarjetaVencimiento = '08/29';
      this.tarjetaCvv = '123';
      this.tarjetaTitular = 'Apoderado Responsable';
      return;
    }
    if (pestana === 'YAPE' || pestana === 'PLIN') {
      this.billeteraCelular = '987654321';
      this.billeteraCodigo = pestana === 'YAPE' ? '482910' : '654321';
      return;
    }
    this.operacionBancaria = this.tipoBancario === 'PAGO_EFECTIVO' ? 'CIP-912405881' : 'OP-2026112001';
  }

  formatearTarjeta(valor: string): void {
    const digitos = (valor || '').replace(/\D/g, '').slice(0, 16);
    this.tarjetaNumero = digitos.replace(/(.{4})/g, '$1 ').trim();
  }

  formatearVencimiento(valor: string): void {
    let digitos = (valor || '').replace(/\D/g, '').slice(0, 4);
    if (digitos.length === 1 && Number(digitos) >= 2) {
      digitos = `0${digitos}`;
    } else if (digitos.length >= 2) {
      const mes = Number(digitos.slice(0, 2));
      if (mes === 0) {
        digitos = `01${digitos.slice(2)}`;
      } else if (mes > 12) {
        digitos = `12${digitos.slice(2)}`;
      }
    }
    this.tarjetaVencimiento = digitos.length > 2 ? `${digitos.slice(0, 2)}/${digitos.slice(2)}` : digitos;
  }

  confirmarSimulacion(): void {
    if (this.procesando) return;
    this.errorLocal.set(null);
    const pestana = this.tab();

    if (pestana === 'TARJETA') {
      const num = this.tarjetaNumero.replace(/\s+/g, '');
      if (!/^\d{13,16}$/.test(num)) {
        this.errorLocal.set('Ingresa un número de tarjeta válido (13 a 16 dígitos).');
        return;
      }
      if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(this.tarjetaVencimiento.trim())) {
        this.errorLocal.set('Ingresa el vencimiento en formato MM/AA.');
        return;
      }
      if (!/^\d{3,4}$/.test(this.tarjetaCvv.trim())) {
        this.errorLocal.set('Ingresa un código CVV de 3 o 4 dígitos.');
        return;
      }
      if (!this.tarjetaTitular.trim() || this.tarjetaTitular.trim().length < 3) {
        this.errorLocal.set('Ingresa el nombre del titular de la tarjeta.');
        return;
      }
      this.pagoSimulado.emit({
        metodoPago: this.tipoTarjeta,
        referenciaOperacion: `TARJ-${num.slice(-4)}-${Date.now().toString().slice(-6)}`
      });
      return;
    }

    if (pestana === 'YAPE' || pestana === 'PLIN') {
      const cel = this.billeteraCelular.replace(/\D/g, '');
      const cod = this.billeteraCodigo.trim();
      if (!/^9\d{8}$/.test(cel)) {
        this.errorLocal.set('Ingresa el número de celular de 9 dígitos asociado a tu billetera.');
        return;
      }
      if (!/^\d{4,8}$/.test(cod)) {
        this.errorLocal.set('Ingresa el código de aprobación numérico (4 a 8 dígitos).');
        return;
      }
      this.pagoSimulado.emit({
        metodoPago: pestana,
        referenciaOperacion: `${pestana}-${cod}`
      });
      return;
    }

    const op = this.operacionBancaria.trim();
    if (!op || op.length < 4) {
      this.errorLocal.set('Ingresa el número de operación o código CIP.');
      return;
    }
    this.pagoSimulado.emit({
      metodoPago: this.tipoBancario,
      referenciaOperacion: op
    });
  }
}
