import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TesoreriaComponent, ObligacionCobro } from './tesoreria.component';
import { TesoreriaService } from '../../core/services/tesoreria.service';
import { AuthStore } from '../../core/state/auth.store';

describe('TesoreriaComponent - Checkout interactivo en línea (sandbox)', () => {
  let mockTesoreriaService: any;
  let mockAuthStore: any;

  const obligacionDemo: ObligacionCobro = {
    id: 40,
    matriculaId: 91,
    estudiante: 'Lucía Vargas',
    tipoConcepto: 'PENSION',
    concepto: 'Pensión Noviembre',
    monto: 420,
    saldoPendiente: 420,
    totalPagado: 0,
    fechaVencimiento: '2026-11-10',
    estado: 'PENDIENTE',
  };

  beforeEach(async () => {
    mockTesoreriaService = {
      listarMisObligaciones: vi.fn(() => of([
        {
          id: 40,
          matriculaId: 91,
          nombreEstudiante: 'Lucía Vargas',
          tipoConcepto: 'PENSION',
          descripcion: 'Pensión Noviembre',
          numeroCuota: 8,
          montoBase: 420,
          saldoPendiente: 420,
          totalPagado: 0,
          fechaVencimiento: '2026-11-10',
          estado: 'PENDIENTE',
        },
      ])),
      listarObligaciones: vi.fn(() => of([])),
      listarExtraordinarios: vi.fn(() => of([])),
      listarConceptos: vi.fn(() => of([])),
      conceptosExtraordinarios: vi.fn(() => of([])),
      matriculasParaCobro: vi.fn(() => of([])),
      crearPreferenciaMercadoPago: vi.fn(() =>
        of({
          preferenceId: 'SIM-PREF-OBL-40',
          initPoint: 'https://sandbox.mercadopago.com.pe/checkout/v1/redirect?pref_id=SIM-OBL-40',
          sandboxInitPoint: 'https://sandbox.mercadopago.com.pe/checkout/v1/redirect?pref_id=SIM-OBL-40',
          publicKey: null,
        }),
      ),
      simularPagoMercadoPago: vi.fn(() =>
        of({
          id: 901,
          obligacionPagoId: 40,
          pasarelaProveedor: 'MERCADO_PAGO',
          pasarelaTransaccionId: 'SIM-YAPE-482910',
          metodoPago: 'YAPE',
          montoPagado: 420,
          fechaPago: '2026-11-12T10:00:00Z',
          estadoPago: 'APROBADO',
          payloadWebhook: null,
        }),
      ),
      confirmarPago: vi.fn(() => of(null)),
    };

    mockAuthStore = {
      hasRole: vi.fn((r: string) => r === 'APODERADO'),
      hasAnyRole: vi.fn((roles: string[]) => roles.includes('APODERADO')),
    };

    await TestBed.configureTestingModule({
      imports: [TesoreriaComponent],
      providers: [
        provideRouter([]),
        { provide: TesoreriaService, useValue: mockTesoreriaService },
        { provide: AuthStore, useValue: mockAuthStore },
      ],
    }).compileComponents();
  });

  it('abre el panel simulador con monto cuando se inicia pago en línea y procesa la simulación', () => {
    const fixture = TestBed.createComponent(TesoreriaComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    comp.pagarConMercadoPago(obligacionDemo);
    fixture.detectChanges();

    expect(comp.checkoutObligacionId()).toBe(40);
    expect(comp.checkoutMonto()).toBe(420);
    expect((fixture.nativeElement as HTMLElement).querySelector('app-simulador-checkout')).not.toBeNull();

    comp.simularPagoOnline({ metodoPago: 'YAPE', referenciaOperacion: 'YAPE-482910' });
    fixture.detectChanges();

    expect(mockTesoreriaService.simularPagoMercadoPago).toHaveBeenCalledWith(40, 'YAPE', 'YAPE-482910');
    expect(comp.checkoutObligacionId()).toBeNull();
    expect(comp.checkoutMonto()).toBe(0);
    expect(comp.mensaje()).toBe('Pago confirmado y boleta registrada.');
    expect(mockTesoreriaService.listarMisObligaciones).toHaveBeenCalledTimes(2);
  });

  it('muestra error controlado si la simulación en línea falla en el backend', () => {
    mockTesoreriaService.simularPagoMercadoPago.mockReturnValue(
      throwError(() => ({ error: { message: 'La simulación de pagos solo está habilitada en entorno sandbox' } })),
    );
    const fixture = TestBed.createComponent(TesoreriaComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    comp.checkoutObligacionId.set(40);
    comp.checkoutMonto.set(420);
    comp.simularPagoOnline({ metodoPago: 'TARJETA_CREDITO', referenciaOperacion: 'TC-4557-8899' });

    expect(comp.verificandoPago()).toBe(false);
    expect(comp.checkoutObligacionId()).toBe(40);
    expect(comp.error()).toContain('sandbox');
  });

  it('abre modal Mercado Pago para pago adelantado total y liquida múltiples cuotas', () => {
    mockTesoreriaService.listarMisObligaciones.mockReturnValue(of([
      {
        id: 40, matriculaId: 91, nombreEstudiante: 'Lucía Vargas', tipoConcepto: 'PENSION',
        descripcion: 'Pensión Noviembre', numeroCuota: 9, montoBase: 120,
        saldoPendiente: 120, totalPagado: 0, fechaVencimiento: '2026-11-20', estado: 'PENDIENTE',
      },
      {
        id: 41, matriculaId: 91, nombreEstudiante: 'Lucía Vargas', tipoConcepto: 'PENSION',
        descripcion: 'Pensión Diciembre', numeroCuota: 10, montoBase: 120,
        saldoPendiente: 120, totalPagado: 0, fechaVencimiento: '2026-12-20', estado: 'PENDIENTE',
      },
    ]));
    mockTesoreriaService.crearPreferenciaAdelantoMercadoPago = vi.fn(() =>
      of({
        preferenceId: 'SIM-PREF-ADELANTO-40-41',
        initPoint: 'https://sandbox.mercadopago.com.pe/checkout/v1/redirect?pref_id=ADELANTO-40-41',
        sandboxInitPoint: 'https://sandbox.mercadopago.com.pe/checkout/v1/redirect?pref_id=ADELANTO-40-41',
        publicKey: null,
      })
    );
    mockTesoreriaService.simularPagoAdelantoMercadoPago = vi.fn(() => of([]));

    const fixture = TestBed.createComponent(TesoreriaComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    comp.pagarTodoPorAdelantado();
    fixture.detectChanges();

    expect(mockTesoreriaService.crearPreferenciaAdelantoMercadoPago).toHaveBeenCalledWith({
      obligacionPagoIds: [40, 41],
    });
    expect(comp.checkoutModalAbierto()).toBe(true);
    expect(comp.checkoutMonto()).toBe(240);
    expect((fixture.nativeElement as HTMLElement).querySelector('[role="dialog"] app-simulador-checkout')).not.toBeNull();

    comp.simularPagoOnline({ metodoPago: 'YAPE', referenciaOperacion: 'YAPE-482910' });
    expect(mockTesoreriaService.simularPagoAdelantoMercadoPago).toHaveBeenCalledWith(
      [40, 41], 'YAPE', 'YAPE-482910'
    );
    expect(comp.checkoutModalAbierto()).toBe(false);
    expect(comp.mensaje()).toBe('Pago confirmado y boleta registrada.');
  });
});
