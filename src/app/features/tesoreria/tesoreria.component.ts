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
    <div class="space-y-6 ui-payments-page">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">Tesorería & Pagos</h2>
          <p class="text-sm text-slate-400 mt-1">
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
        <div class="ui-alert ui-alert--info ui-payments-checkout" role="status">
          <p>Preferencia de prueba creada para la obligación #{{ checkoutObligacionId() }}. El pago solo se registrará cuando Mercado Pago confirme la operación.</p>
          <a [href]="checkoutUrl()" target="_blank" rel="noopener noreferrer" class="ui-button ui-button--primary">Abrir checkout de prueba</a>
          <p class="ui-payments-checkout__hint">Usa una cuenta compradora de prueba distinta de la vendedora. Después, vuelve aquí y actualiza las obligaciones.</p>
        </div>
      }
      @if (mensaje()) { <p class="ui-alert ui-alert--success" role="status">{{ mensaje() }}</p> }
      @if (esAdministrativo()) {
        <dialog #cronogramaDialog class="school-native-dialog ui-payments-dialog" aria-labelledby="cronograma-dialog-title">
          <div class="school-dialog-shell ui-payments-dialog__shell"><header class="school-dialog-header ui-payments-dialog__header"><div><h3 id="cronograma-dialog-title">Generar cronograma de cobros</h3><p>Confirma matrícula, conceptos y fecha del primer vencimiento.</p></div><button type="button" class="school-dialog-cancel ui-payments-dialog__close !min-h-9 !px-3" (click)="cerrarCronograma()" aria-label="Cerrar">✕</button></header>
            <form (ngSubmit)="generarCronograma()" class="school-dialog-form"><div class="school-dialog-body ui-payments-dialog__body space-y-4">
              @if (error()) { <p class="ui-alert ui-alert--error" role="alert">{{ error() }}</p> }
              <label class="school-dialog-field">Matrícula ID *<input type="number" [(ngModel)]="matriculaId" name="matricula" min="1" required></label>
              <label class="school-dialog-field">Concepto matrícula *<select [(ngModel)]="conceptoMatriculaId" name="conceptoMatricula" [disabled]="!conceptosMatricula().length" required>@if (!conceptosMatricula().length) { <option [ngValue]="0">Sin conceptos disponibles</option> } @for (c of conceptosMatricula(); track c.id) { <option [ngValue]="c.id">{{ c.nombre }}</option> }</select></label>
              <label class="school-dialog-field">Concepto pensión *<select [(ngModel)]="conceptoPensionId" name="conceptoPension" [disabled]="!conceptosPension().length" required>@if (!conceptosPension().length) { <option [ngValue]="0">Sin conceptos disponibles</option> } @for (c of conceptosPension(); track c.id) { <option [ngValue]="c.id">{{ c.nombre }}</option> }</select></label>
              <label class="school-dialog-field">Primer vencimiento *<input type="date" [(ngModel)]="primerVencimiento" name="primerVencimiento" required></label>
            </div><footer class="school-dialog-footer ui-payments-dialog__footer"><button type="button" class="school-dialog-cancel" (click)="cerrarCronograma()">Cancelar</button><button type="submit" [disabled]="guardando()" class="school-dialog-submit">{{ guardando() ? 'Generando…' : 'Generar cronograma' }}</button></footer></form>
          </div>
        </dialog>
        <dialog #cobroDialog class="school-native-dialog ui-payments-dialog" aria-labelledby="cobro-dialog-title">
          @if (cobroSeleccionado(); as obligacion) {
            <div class="school-dialog-shell ui-payments-dialog__shell"><header class="school-dialog-header ui-payments-dialog__header"><div><h3 id="cobro-dialog-title">Confirmar cobro en caja</h3><p>Verifica el monto antes de registrar el pago en efectivo.</p></div><button type="button" class="school-dialog-cancel ui-payments-dialog__close !min-h-9 !px-3" (click)="cerrarCobro()" aria-label="Cerrar">✕</button></header>
              <div class="school-dialog-body ui-payments-dialog__body space-y-3 text-sm"><p><span class="font-semibold">Obligación:</span> #{{ obligacion.id }} · {{ obligacion.concepto }}</p><p><span class="font-semibold">Saldo a registrar:</span> S/ {{ obligacion.saldoPendiente | number:'1.2-2' }}</p>@if (error()) { <p class="ui-alert ui-alert--error" role="alert">{{ error() }}</p> }</div>
              <footer class="school-dialog-footer ui-payments-dialog__footer"><button type="button" class="school-dialog-cancel" (click)="cerrarCobro()">Cancelar</button><button type="button" class="school-dialog-submit" [disabled]="cobrandoId() !== null" (click)="confirmarCobro(obligacion)">{{ cobrandoId() === obligacion.id ? 'Registrando…' : 'Confirmar pago en efectivo' }}</button></footer>
            </div>
          }
        </dialog>
      }

      <!-- Financial Summary Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-5 ui-payments-summary">
        <div class="ui-card ui-payments-summary-card">
          <div class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pagado en obligaciones consultadas</div>
          <div class="text-3xl font-black text-emerald-400 mt-2">S/ {{ recaudacionTotal() | number:'1.2-2' }}</div>
          <p class="text-xs text-slate-500 mt-1">Suma de pagos registrados en las obligaciones consultadas</p>
        </div>

        <div class="ui-card ui-payments-summary-card">
          <div class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pendiente por Cobrar</div>
          <div class="text-3xl font-black text-amber-400 mt-2">S/ {{ pendienteTotal() | number:'1.2-2' }}</div>
          <p class="text-xs text-slate-500 mt-1">Obligaciones vigentes en PostgreSQL</p>
        </div>

        <div class="ui-card ui-payments-summary-card">
          <div class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pasarela Mercado Pago</div>
          <div class="text-3xl font-black text-blue-400 mt-2">Pago digital</div>
          <p class="text-xs text-slate-500 mt-1">Checkout de prueba disponible para saldos pendientes</p>
        </div>
      </div>

      <!-- Obligations & Invoices Table -->
      <div class="ui-card ui-payments-table-card rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-sm">
        <div class="px-6 py-4 bg-slate-950/50 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 ui-payments-toolbar">
          <h3 class="text-sm font-bold text-white">Registro de Obligaciones y Comprobantes</h3>
          <div class="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3">
            @if (esAdministrativo()) { <div class="flex items-center gap-2">
              <label class="text-xs text-slate-400">Matrícula ID:</label>
              <input
                type="number"
                [(ngModel)]="matriculaId"
                (change)="cargarObligaciones()"
              class="w-full sm:w-24 px-2 py-1 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none"
              />
            </div> }
            <select
              [(ngModel)]="filtroEstado"
              class="w-full sm:w-auto px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none"
            >
              <option value="TODOS">Todos los Estados</option>
              <option value="PAGADO_TOTAL">Pagado</option>
              <option value="PAGADO_PARCIAL">Pago parcial</option>
              <option value="PENDIENTE">Pendiente</option>
              <option value="VENCIDO">Vencido</option>
            </select>
            <button
              (click)="cargarObligaciones()"
              class="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
            >
              Consultar BD
            </button>
          </div>
        </div>

        <div class="ui-table-wrap overflow-x-auto ui-payments-table-wrap">
          <table class="ui-table w-full text-left text-xs ui-payments-table ui-mobile-table-cards">
            <thead class="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
              <tr>
                <th class="px-5 py-3.5">ID BD</th>
                <th class="px-5 py-3.5">Matrícula ID</th>
                <th class="px-5 py-3.5">Concepto</th>
                <th class="px-5 py-3.5">Monto Base</th>
                <th class="px-5 py-3.5">Saldo Pendiente</th>
                <th class="px-5 py-3.5">Vencimiento</th>
                <th class="px-5 py-3.5">Estado en BD</th>
                <th class="px-5 py-3.5">Comprobante</th>
                <th class="px-5 py-3.5 text-right">Acción</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/60 text-slate-300">
              @if (cargando()) {
                <tr>
                  <td colspan="9" class="text-center py-10 text-slate-400">
                    <div class="ui-list-state ui-payments-state"><span class="ui-grade-spinner" aria-hidden="true"></span><p>Consultando obligaciones financieras en la base de datos...</p></div>
                  </td>
                </tr>
              } @else {
                @for (item of obligacionesFiltradas(); track item.id) {
                  <tr class="hover:bg-slate-800/40 transition">
                    <td class="px-5 py-3.5 font-mono text-slate-500" data-label="ID BD">{{ item.id }}</td>
                    <td class="px-5 py-3.5 font-bold text-white" data-label="Matrícula ID">{{ item.estudiante }}</td>
                    <td class="px-5 py-3.5" data-label="Concepto">
                      <span class="ui-payments-concept px-2 py-0.5 rounded bg-slate-800 font-medium text-slate-300">
                        {{ item.concepto }}
                      </span>
                    </td>
                    <td class="px-5 py-3.5 font-mono font-bold text-white" data-label="Monto Base">
                      S/ {{ item.monto | number:'1.2-2' }}
                    </td>
                    <td class="px-5 py-3.5 font-mono text-amber-400 font-semibold" data-label="Saldo Pendiente">
                      S/ {{ item.saldoPendiente | number:'1.2-2' }}
                    </td>
                    <td class="px-5 py-3.5 text-slate-400 font-mono" data-label="Vencimiento">{{ item.fechaVencimiento | uiDatePe }}</td>
                    <td class="px-5 py-3.5" data-label="Estado en BD">
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
                        @default { <span class="text-slate-400">{{ item.estado }}</span> }
                      }
                    </td>
                    <td data-label="Comprobante">@if (item.comprobanteNumero) { <span class="ui-payments-receipt">{{ item.comprobanteNumero }}</span> } @else { <span class="ui-payments-no-receipt">—</span> }</td>
                    <td class="px-5 py-3.5 text-right" data-label="Acción">
                      @if (item.estado !== 'PAGADO_TOTAL' && item.estado !== 'CANCELADO_POR_TRASLADO' && item.saldoPendiente > 0) {
                        <div class="ui-payments-action__buttons">
                          <button
                            (click)="pagarConMercadoPago(item)"
                            [disabled]="pagandoId() !== null || cobrandoId() !== null"
                            [attr.aria-label]="pagandoId() === item.id ? 'Preparando pago con Mercado Pago' : 'Pagar con Mercado Pago'"
                            class="ui-button ui-button--primary ui-payments-action-button"
                          ><span>{{ pagandoId() === item.id ? 'Preparando...' : 'Pagar' }}</span><span class="sr-only"> con Mercado Pago</span></button>
                          @if (esAdministrativo()) {
                            <button
                              (click)="cobrar(item)"
                              [disabled]="cobrandoId() !== null || pagandoId() !== null"
                              class="ui-button ui-button--secondary ui-payments-action-button"
                            >Cobrar en Caja</button>
                          }
                        </div>
                      } @else {
                        <span class="text-slate-500 font-mono text-xs">Emitido</span>
                      }
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="9" class="text-center py-12 text-slate-500 space-y-2">
                      <div class="ui-list-state ui-payments-state"><p class="ui-list-state__title">No se encontraron obligaciones de cobro en la base de datos.</p><p class="ui-list-state__message">Genere el cronograma anual de pensiones para visualizar los compromisos de pago en PostgreSQL.</p></div>
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
