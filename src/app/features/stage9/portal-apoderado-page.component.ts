import { CommonModule } from '@angular/common';
import { A11yModule } from '@angular/cdk/a11y';
import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { PortalApoderadoComponent } from './portal-apoderado.component';
import { Stage9State, Stage9Payment } from './stage9.contract';
import { CalificacionPortalDto, HijoPortalDto, PortalFamiliarService } from '../../core/services/portal-familiar.service';
import { AsistenciaAulaResponseDto } from '../../core/models/asistencia.model';
import { PeriodoResponseDto } from '../../core/models/academico.model';
import { TesoreriaService } from '../../core/services/tesoreria.service';
import { EvaluacionService } from '../../core/services/evaluacion.service';
import { AuthStore } from '../../core/state/auth.store';
import { guardarDescarga } from '../../shared/ui/carga-planilla.component';
import { PagoSimuladoEvent, SimuladorCheckoutComponent } from '../../shared/ui/simulador-checkout.component';
import { UiPaginacionComponent, paginarRegistros } from '../../shared/ui/ui-paginacion.component';

const STORAGE_PORTAL_STUDENT_KEY = 'shuji.portal.matriculaId';

@Component({
  selector: 'app-portal-apoderado-page',
  standalone: true,
  imports: [CommonModule, A11yModule, PortalApoderadoComponent, RouterLink, UiPaginacionComponent, SimuladorCheckoutComponent],
  template: `
  <nav class="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#e2e8f0] bg-gradient-to-r from-[#f8fbff] via-white to-[#f0f9ff] p-3.5 shadow-2xs" aria-label="Servicios de la familia">
    <div class="flex flex-wrap gap-2.5">
      <a class="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#bae6fd] bg-white px-4 py-2 text-sm font-bold text-[#0369a1] no-underline hover:bg-[#f0f9ff] transition" routerLink="/admin/tesoreria">💳 Centro de pagos</a>
      <a class="inline-flex min-h-11 items-center gap-2 rounded-xl border border-ui-divider bg-white px-4 py-2 text-sm font-semibold text-ui-text no-underline hover:bg-ui-surface-soft transition" routerLink="/admin/comunicados">📬 Comunicados</a>
      <a class="inline-flex min-h-11 items-center gap-2 rounded-xl border border-ui-divider bg-white px-4 py-2 text-sm font-semibold text-ui-text no-underline hover:bg-ui-surface-soft transition" routerLink="/admin/suplencias">🪪 Designar suplente</a>
    </div>
    @if (puedePagarOnline() && pagosPendientes().length > 0) {
      <button
        type="button"
        (click)="pagarTodoPorAdelantadoPortal()"
        [disabled]="preparandoPagoPortal()"
        data-testid="btn-nav-pagar-todo-adelantado"
        class="min-h-11 rounded-xl bg-[#009EE3] hover:bg-[#007eb5] px-4 py-2 text-sm font-bold text-white shadow-xs transition cursor-pointer disabled:opacity-50"
      >
        {{ preparandoPagoPortal() ? 'Preparando Mercado Pago…' : ('⚡ Adelantar todo (' + pagosPendientes().length + ' cuotas · S/ ' + totalPendientePortal().toFixed(2) + ')') }}
      </button>
    }
  </nav>

  @if (hijoActual(); as actual) {
    <section class="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Resumen rápido del estudiante seleccionado">
      <article class="rounded-2xl border border-ui-divider border-t-4 border-t-[#173B67] bg-white p-4 shadow-2xs">
        <span class="block text-[11px] font-bold uppercase tracking-wider text-ui-muted">Estudiante seleccionado</span>
        <strong class="mt-1 block text-sm font-extrabold text-ui-text">{{ actual.nombres }} {{ actual.apellidoPaterno }} {{ actual.apellidoMaterno }}</strong>
        <span class="mt-0.5 block text-xs text-ui-muted">{{ actual.grado }} {{ actual.seccion }} · Año {{ actual.anio }}</span>
      </article>
      <article class="rounded-2xl border border-ui-divider border-t-4 border-t-emerald-600 bg-white p-4 shadow-2xs">
        <span class="block text-[11px] font-bold uppercase tracking-wider text-ui-muted">Resumen de asistencia</span>
        <strong class="mt-1 block text-sm font-extrabold text-ui-text">{{ resumenCortoAsistencia() }}</strong>
        <span class="mt-0.5 block text-xs text-ui-muted">{{ asistencias().length }} sesiones registradas</span>
      </article>
      <article class="rounded-2xl border border-[#bae6fd] border-t-4 border-t-[#009EE3] bg-gradient-to-br from-white to-[#f0f9ff]/60 p-4 shadow-2xs">
        <span class="block text-[11px] font-bold uppercase tracking-wider text-[#0369a1]">Próximo pago · Mercado Pago</span>
        <strong class="mt-1 block text-sm font-extrabold text-ui-text">{{ proximoPagoResumen().titulo }}</strong>
        <span class="mt-0.5 block text-xs text-ui-muted">{{ proximoPagoResumen().detalle }}</span>
        @if (puedePagarOnline() && pagosPendientes().length > 0) {
          <button
            type="button"
            (click)="pagarCuotaPortal(pagosPendientes()[0])"
            class="mt-2 inline-flex items-center gap-1 rounded-lg bg-[#009EE3] px-2.5 py-1 text-[11px] font-bold text-white hover:bg-[#007eb5] cursor-pointer"
          >
            💳 Pagar ahora
          </button>
        }
      </article>
      <article class="rounded-2xl border border-ui-divider border-t-4 border-t-amber-500 bg-white p-4 shadow-2xs">
        <span class="block text-[11px] font-bold uppercase tracking-wider text-ui-muted">Comunicados escolares</span>
        <strong class="mt-1 block text-sm font-extrabold text-ui-text">Avisos de {{ actual.grado }} {{ actual.seccion }}</strong>
        <a routerLink="/admin/comunicados" class="mt-1 inline-block text-xs font-semibold text-ui-action underline">Ver bandeja de comunicados</a>
      </article>
    </section>
  }

  @if (aviso()) {
    <p role="status" class="mb-4 flex items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">
      <span>{{ aviso() }}</span>
      <button type="button" (click)="aviso.set('')" class="border-0 bg-transparent text-base font-bold text-emerald-800 cursor-pointer">×</button>
    </p>
  }

  <!-- Modal Checkout Mercado Pago dentro del Portal Familiar -->
  @if (checkoutLote().length > 0) {
    <div
      class="fixed inset-0 z-[2200] flex items-center justify-center bg-[#0c192b]/60 p-3 sm:p-5 backdrop-blur-[2px]"
      (click)="cerrarCheckoutPortal()"
      (keydown.escape)="cerrarCheckoutPortal()"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-portal-mp-titulo"
        cdkTrapFocus
        (click)="$event.stopPropagation()"
        class="flex max-h-[min(90dvh,760px)] w-full max-w-[700px] flex-col overflow-hidden rounded-[22px] border border-[#cbd5e1] bg-white p-0 shadow-[0_28px_90px_rgb(12_25_43_/_38%)]"
      >
        <header class="shrink-0 flex items-start justify-between gap-4 border-b border-[#e2e8f0] bg-white px-5 py-4">
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <span class="inline-flex items-center gap-1.5 rounded-full bg-[#009EE3] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white">
                Mercado Pago · Portal Familiar
              </span>
              <span class="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                Importe total: S/ {{ checkoutMontoPortal() | number:'1.2-2' }}
              </span>
            </div>
            <h3 id="modal-portal-mp-titulo" class="m-0 mt-1.5 text-lg font-extrabold text-[#14213d] leading-snug break-words">
              {{ checkoutLote().length > 1 ? ('Pago adelantado de ' + checkoutLote().length + ' cuotas') : checkoutLote()[0].concept }}
            </h3>
          </div>
          <button
            type="button"
            (click)="cerrarCheckoutPortal()"
            aria-label="Cerrar ventana de pago"
            class="h-10 w-10 shrink-0 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] text-base font-bold text-[#334155] hover:bg-[#e2e8f0] cursor-pointer"
          >
            ✕
          </button>
        </header>
        <div class="min-h-0 flex-1 overflow-y-auto p-5 space-y-4 bg-white">
          @if (errorCheckoutPortal()) {
            <p class="m-0 rounded-xl border border-[#fca5a5] bg-[#fee2e2] px-4 py-3 text-sm font-semibold text-[#7f1d1d]" role="alert">
              {{ errorCheckoutPortal() }}
            </p>
          }
          <div class="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#bfdbfe] bg-[#eff6ff] px-4 py-3">
            <span class="text-xs font-semibold text-[#1e3a8a]">Consulta o confirma el abono procesado con Mercado Pago.</span>
            <button
              type="button"
              (click)="confirmarCheckoutPortal()"
              [disabled]="verificandoCheckoutPortal()"
              class="min-h-10 rounded-xl border border-[#1d4ed8]/30 bg-white px-3 py-1.5 text-xs font-bold text-[#1e3a8a] hover:bg-blue-50 cursor-pointer disabled:opacity-50"
            >
              {{ verificandoCheckoutPortal() ? 'Verificando…' : 'Verificar estado en Mercado Pago' }}
            </button>
          </div>
          <app-simulador-checkout
            [monto]="checkoutMontoPortal()"
            [enlaceExterno]="checkoutUrlPortal()"
            [procesando]="verificandoCheckoutPortal()"
            [titulo]="checkoutLote().length > 1 ? ('Pago adelantado · ' + checkoutLote().length + ' conceptos') : checkoutLote()[0].concept"
            [resumenConceptos]="checkoutResumenPortal()"
            [ocultarCabecera]="true"
            (pagoSimulado)="simularPagoPortal($event)"
          />
        </div>
      </section>
    </div>
  }

  <app-portal-apoderado-screen
    [state]="estado()"
    [errorMessage]="mensaje()"
    [children]="opciones()"
    [schoolYear]="hijoActual()?.anio ?? 0"
    [periods]="opcionesPeriodos()"
    [selectedStudentId]="matriculaId()"
    [selectedPeriodId]="periodoId()"
    [grades]="notasPeriodo()"
    [payments]="pagos()"
    [canExecutePayments]="puedePagarOnline()"
    (childSelected)="seleccionar($event)"
    (periodSelected)="periodoId.set($event)"
    (reportRequested)="descargar($event.studentId)"
    (paymentRequested)="pagarCuotaPortal($event)"
    (advanceAllRequested)="pagarTodoPorAdelantadoPortal()"
    (receiptRequested)="descargarBoletaPortal($event)"
    (retry)="cargar()"
  />
  @if(matriculaId() && estado() === 'normal'){
    <section class="grid gap-3 rounded-2xl border border-ui-divider bg-ui-surface p-5 shadow-[var(--ui-card-shadow)]"><h2 class="text-lg font-semibold m-0">Asistencia escolar del año</h2><p class="m-0 text-sm text-ui-muted">{{ resumenAsistencia() }}</p>
      <div class="overflow-hidden rounded-xl border border-ui-divider"><div class="overflow-x-auto"><table class="w-full text-left text-sm"><thead><tr><th class="p-2.5 bg-ui-surface-soft">Fecha</th><th class="p-2.5 bg-ui-surface-soft">Estado</th><th class="p-2.5 bg-ui-surface-soft">Justificación</th></tr></thead><tbody>@for(a of asistenciasPaginadas();track a.id){<tr class="border-t"><td class="p-2.5">{{ a.fechaSesion }}</td><td class="p-2.5">{{ a.estado }}</td><td class="p-2.5">{{ a.justificada ? a.motivoJustificacion : '—' }}</td></tr>}</tbody></table></div><ui-paginacion [totalRegistros]="asistencias().length" [paginaActual]="paginaAsistencia()" [tamanoPagina]="10" etiqueta="asistencias" ariaLabel="Paginación de asistencia escolar del año" (cambioPagina)="paginaAsistencia.set($event)" /></div>
      @if(!asistencias().length){<p class="text-sm text-ui-muted m-0">No hay asistencias registradas para esta matrícula.</p>}
      <p class="text-xs text-ui-muted m-0">La libreta PDF incluye todos los periodos registrados del año.</p>
    </section>
  }
`
})
export class PortalApoderadoPageComponent implements OnInit, OnDestroy {
    private readonly portal = inject(PortalFamiliarService);
    private readonly tesoreria = inject(TesoreriaService);
    private readonly evaluacion = inject(EvaluacionService);
    private readonly store = inject(AuthStore);
    readonly hijos = signal<HijoPortalDto[]>([]);
    readonly matriculaId = signal<number | null>(null);
    readonly periodoId = signal<number | null>(null);
    readonly periodos = signal<PeriodoResponseDto[]>([]);
    readonly notas = signal<CalificacionPortalDto[]>([]);
    readonly pagos = signal<Stage9Payment[]>([]);
    readonly asistencias = signal<AsistenciaAulaResponseDto[]>([]);
    readonly paginaAsistencia = signal<number>(1);
    readonly asistenciasPaginadas = computed(() => paginarRegistros(this.asistencias(), this.paginaAsistencia(), 10));
    readonly estado = signal<Stage9State>('loading');
    readonly mensaje = signal('');
    readonly aviso = signal('');
    readonly puedePagarOnline = computed(() => this.store.hasAnyRole(['APODERADO', 'SECRETARIA']));
    readonly pagosPendientes = computed(() =>
      this.pagos().filter(p => p.canPay ?? (p.status === 'PENDIENTE' || p.status === 'PAGO PARCIAL' || p.status === 'VENCIDO'))
    );
    readonly totalPendientePortal = computed(() =>
      this.pagosPendientes().reduce((sum, p) => sum + Number(p.rawAmount ?? p.amount ?? 0), 0)
    );
    readonly checkoutLote = signal<Stage9Payment[]>([]);
    readonly checkoutUrlPortal = signal<string | null>(null);
    readonly checkoutMontoPortal = signal<number>(0);
    readonly preparandoPagoPortal = signal(false);
    readonly verificandoCheckoutPortal = signal(false);
    readonly errorCheckoutPortal = signal<string | null>(null);
    readonly checkoutResumenPortal = computed(() =>
      this.checkoutLote().map(p => `${p.concept} — S/ ${Number(p.rawAmount ?? p.amount ?? 0).toFixed(2)}`)
    );
    private pollingPortal: ReturnType<typeof setInterval> | null = null;
    private revision = 0;
    readonly opciones = computed(() => this.hijos().map(h => ({ id: h.matriculaId, fullName: `${h.nombres} ${h.apellidoPaterno} ${h.apellidoMaterno}`, gradeLabel: `${h.grado} ${h.seccion} · ${h.anio}` })));
    readonly hijoActual = computed(() => this.hijos().find(h => h.matriculaId === this.matriculaId()));
    readonly opcionesPeriodos = computed(() => this.periodos().map(p => ({ id: p.id, label: p.nombre })));
    readonly notasPeriodo = computed(() => this.notas().filter(n => n.periodoId === this.periodoId()).map(n => ({ areaId: n.areaId, areaName: n.areaNombre, competenciaId: n.competenciaId, competenciaName: n.competenciaNombre, grade: n.nota, conclusion: n.conclusion })));
    readonly resumenCortoAsistencia = computed(() => {
        const total = this.asistencias().length;
        if (!total) return 'Sin registros';
        const presentes = this.asistencias().filter(a => a.estado === 'PRESENTE').length;
        return `${Math.round(presentes * 100 / total)}% asistencia (${presentes}/${total})`;
    });
    readonly proximoPagoResumen = computed(() => {
        const pendiente = this.pagos().find(p => p.status === 'PENDIENTE' || p.status === 'VENCIDO' || p.status === 'PAGO PARCIAL');
        if (!pendiente) {
            return { titulo: 'Al día', detalle: 'Sin cuotas pendientes registradas' };
        }
        return {
            titulo: `S/ ${Number(pendiente.amount).toFixed(2)} · ${pendiente.status}`,
            detalle: `${pendiente.concept} (Vence: ${pendiente.dueDate})`
        };
    });
    readonly resumenAsistencia = computed(() => {
        const total = this.asistencias().length;
        if (!total)
            return 'Sin registros de asistencia.';
        const presentes = this.asistencias().filter(a => a.estado === 'PRESENTE').length;
        const tardanzas = this.asistencias().filter(a => a.estado === 'TARDANZA').length;
        const faltasJustificadas = this.asistencias().filter(a => a.estado === 'FALTA_JUSTIFICADA').length;
        const faltasInjustificadas = this.asistencias().filter(a => a.estado === 'FALTA_INJUSTIFICADA').length;
        return `De ${total} registros: ${presentes} presentes (${Math.round(presentes * 100 / total)}%), ${tardanzas} tardanzas, ${faltasJustificadas} faltas justificadas y ${faltasInjustificadas} faltas injustificadas.`;
    });
    ngOnInit() { this.cargar(); }
    cargar() {
        this.estado.set('loading');
        this.portal.hijos().subscribe({ next: hijos => {
                this.hijos.set(hijos);
                if (!hijos.length) {
                    this.estado.set('empty');
                    return;
                }
                const guardado = this.leerMatriculaGuardada();
                const preferido = this.matriculaId() ?? guardado;
                const destino = preferido && hijos.some(h => h.matriculaId === preferido) ? preferido : hijos[0].matriculaId;
                this.seleccionar(destino);
            }, error: e => { this.estado.set('error'); this.mensaje.set(e?.error?.message ?? 'No se pudo cargar el portal familiar.'); } });
    }
    seleccionar(id: number) {
        const hijo = this.hijos().find(h => h.matriculaId === id);
        if (!hijo)
            return;
        const revision = ++this.revision;
        this.matriculaId.set(id);
        this.guardarMatriculaSeleccionada(id);
        this.periodoId.set(null);
        this.estado.set('loading');
        this.notas.set([]);
        this.pagos.set([]);
        this.asistencias.set([]);
        this.aviso.set('');
        const obligaciones = this.store.hasAnyRole(['DIRECCION']) ? this.tesoreria.listarObligaciones(id) : this.tesoreria.listarMisObligaciones();
        forkJoin({ notas: this.portal.calificaciones(id), periodos: this.portal.periodos(id), asistencias: this.portal.asistencia(id), obligaciones }).subscribe({ next: datos => {
                if (revision !== this.revision)
                    return;
                this.notas.set(datos.notas);
                this.periodos.set(datos.periodos);
                this.periodoId.set(datos.periodos[0]?.id ?? null);
                this.asistencias.set(datos.asistencias);
                this.pagos.set(datos.obligaciones.filter(o => o.matriculaId === id && o.estado !== 'CANCELADO_POR_TRASLADO').map(o => {
                    const monto = o.saldoPendiente > 0 ? o.saldoPendiente : o.totalPagado;
                    const pagable = o.saldoPendiente > 0 && (o.estado === 'PENDIENTE' || o.estado === 'PAGADO_PARCIAL' || o.estado === 'VENCIDO');
                    return {
                        id: o.id,
                        concept: o.saldoPendiente > 0 ? `${o.descripcion} (saldo por pagar)` : o.descripcion,
                        schoolYear: hijo.anio,
                        amount: monto,
                        rawAmount: monto,
                        amountLabel: o.saldoPendiente > 0 ? 'Saldo pendiente' : 'Pagado',
                        currency: 'PEN',
                        dueDate: o.fechaVencimiento,
                        status: o.estado === 'PAGADO_TOTAL' ? 'PAGADO' : o.estado === 'PAGADO_PARCIAL' ? 'PAGO PARCIAL' : o.estado === 'VENCIDO' ? 'VENCIDO' : o.estado === 'PENDIENTE' ? 'PENDIENTE' : 'SIN ESTADO',
                        canPay: pagable,
                        canDownloadReceipt: o.estado === 'PAGADO_TOTAL'
                    };
                }));
                this.estado.set('normal');
            }, error: e => { if (revision !== this.revision)
                return; this.estado.set('error'); this.mensaje.set(e?.error?.message ?? 'No se pudo consultar la información del estudiante.'); } });
    }
    pagarCuotaPortal(payment: Stage9Payment): void {
        if (!this.puedePagarOnline() || !payment.id || this.preparandoPagoPortal()) return;
        this.iniciarCheckoutPortal([payment]);
    }
    pagarTodoPorAdelantadoPortal(): void {
        const lote = this.pagosPendientes();
        if (!this.puedePagarOnline() || !lote.length || this.preparandoPagoPortal()) return;
        this.iniciarCheckoutPortal(lote);
    }
    private iniciarCheckoutPortal(lote: Stage9Payment[]): void {
        this.cerrarCheckoutPortal();
        this.preparandoPagoPortal.set(true);
        this.errorCheckoutPortal.set(null);
        const total = lote.reduce((sum, p) => sum + Number(p.rawAmount ?? p.amount ?? 0), 0);
        const peticion = lote.length === 1
            ? this.tesoreria.crearPreferenciaMercadoPago({ obligacionPagoId: lote[0].id })
            : this.tesoreria.crearPreferenciaAdelantoMercadoPago({ obligacionPagoIds: lote.map(p => p.id) });
        peticion.subscribe({
            next: pref => {
                this.preparandoPagoPortal.set(false);
                try {
                    const url = new URL(pref.initPoint);
                    const dominio = url.hostname.toLowerCase();
                    if (url.protocol !== 'https:' || !['mercadopago.com', 'mercadopago.com.pe'].some(base => dominio === base || dominio.endsWith(`.${base}`))) {
                        throw new Error('URL de Mercado Pago no válida');
                    }
                    this.checkoutUrlPortal.set(url.toString());
                    this.checkoutMontoPortal.set(total);
                    this.checkoutLote.set(lote);
                    if (this.pollingPortal) clearInterval(this.pollingPortal);
                    this.pollingPortal = setInterval(() => this.confirmarCheckoutPortal(), 10000);
                } catch {
                    this.aviso.set('Mercado Pago devolvió un enlace de pago no válido.');
                }
            },
            error: err => {
                this.preparandoPagoPortal.set(false);
                this.aviso.set(err?.error?.message ?? 'No se pudo iniciar el pago con Mercado Pago.');
            }
        });
    }
    simularPagoPortal(evento: PagoSimuladoEvent): void {
        const lote = this.checkoutLote();
        if (!this.puedePagarOnline() || !lote.length || this.verificandoCheckoutPortal()) return;
        this.verificandoCheckoutPortal.set(true);
        this.errorCheckoutPortal.set(null);
        const finalizarExito = () => {
            this.cerrarCheckoutPortal();
            this.aviso.set(lote.length > 1
                ? `Pago adelantado de ${lote.length} cuotas confirmado con Mercado Pago.`
                : 'Pago confirmado y boleta registrada con Mercado Pago.');
            const idActual = this.matriculaId();
            if (idActual) this.seleccionar(idActual);
        };
        const manejarFallo = (err: { error?: { message?: string } }) => {
            this.verificandoCheckoutPortal.set(false);
            this.errorCheckoutPortal.set(err?.error?.message ?? 'No se pudo completar el pago con Mercado Pago.');
        };
        if (lote.length === 1) {
            this.tesoreria.simularPagoMercadoPago(lote[0].id, evento.metodoPago, evento.referenciaOperacion)
                .subscribe({ next: finalizarExito, error: manejarFallo });
            return;
        }
        this.tesoreria.simularPagoAdelantoMercadoPago(lote.map(p => p.id), evento.metodoPago, evento.referenciaOperacion)
            .subscribe({ next: finalizarExito, error: manejarFallo });
    }
    confirmarCheckoutPortal(): void {
        const lote = this.checkoutLote();
        if (!this.puedePagarOnline() || !lote.length || this.verificandoCheckoutPortal()) return;
        this.verificandoCheckoutPortal.set(true);
        this.errorCheckoutPortal.set(null);
        const manejarError = (err: { error?: { message?: string } }) => {
            this.verificandoCheckoutPortal.set(false);
            this.errorCheckoutPortal.set(err?.error?.message ?? 'No se pudo verificar el estado en Mercado Pago.');
        };
        if (lote.length === 1) {
            this.tesoreria.confirmarPago(lote[0].id).subscribe({
                next: pago => {
                    this.verificandoCheckoutPortal.set(false);
                    if (!pago) return;
                    this.cerrarCheckoutPortal();
                    this.aviso.set('Pago confirmado en Mercado Pago.');
                    const idActual = this.matriculaId();
                    if (idActual) this.seleccionar(idActual);
                },
                error: manejarError
            });
            return;
        }
        this.tesoreria.confirmarPagoAdelanto(lote.map(p => p.id)).subscribe({
            next: pagos => {
                this.verificandoCheckoutPortal.set(false);
                if (!pagos?.length) return;
                this.cerrarCheckoutPortal();
                this.aviso.set('Pago adelantado confirmado en Mercado Pago.');
                const idActual = this.matriculaId();
                if (idActual) this.seleccionar(idActual);
            },
            error: manejarError
        });
    }
    cerrarCheckoutPortal(): void {
        this.ngOnDestroy();
        this.checkoutLote.set([]);
        this.checkoutUrlPortal.set(null);
        this.checkoutMontoPortal.set(0);
        this.verificandoCheckoutPortal.set(false);
        this.errorCheckoutPortal.set(null);
    }
    descargarBoletaPortal(payment: Stage9Payment): void {
        this.tesoreria.descargarConstancia(payment.id).subscribe({
            next: blob => guardarDescarga(blob, `boleta_${payment.id}.pdf`),
            error: () => this.aviso.set('No se pudo descargar la boleta PDF.')
        });
    }
    ngOnDestroy(): void {
        if (this.pollingPortal) clearInterval(this.pollingPortal);
        this.pollingPortal = null;
    }
    descargar(id: number) {
        if (id !== this.matriculaId() || !this.hijos().some(h => h.matriculaId === id))
            return;
        this.evaluacion.descargarLibretaPdf(id).subscribe({ next: blob => guardarDescarga(blob, `libreta_${id}.pdf`), error: () => this.aviso.set('No se pudo descargar la libreta.') });
    }
    private leerMatriculaGuardada(): number | null {
        try {
            const raw = sessionStorage.getItem(STORAGE_PORTAL_STUDENT_KEY);
            const num = raw ? Number(raw) : NaN;
            return Number.isSafeInteger(num) && num > 0 ? num : null;
        } catch {
            return null;
        }
    }
    private guardarMatriculaSeleccionada(id: number): void {
        try {
            sessionStorage.setItem(STORAGE_PORTAL_STUDENT_KEY, String(id));
        } catch {
            // ignore storage errors in restricted environments
        }
    }
}
