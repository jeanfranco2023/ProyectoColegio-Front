import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { SimuladorCheckoutComponent, PagoSimuladoEvent } from './simulador-checkout.component';

describe('SimuladorCheckoutComponent', () => {
  async function crearComponente(
    monto = 350,
    enlaceExterno: string | null = 'https://sandbox.mercadopago.com.pe/checkout/v1/redirect?pref_id=SIM-1',
  ) {
    await TestBed.configureTestingModule({
      imports: [SimuladorCheckoutComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(SimuladorCheckoutComponent);
    fixture.componentInstance.monto = monto;
    fixture.componentInstance.enlaceExterno = enlaceExterno;
    fixture.detectChanges();
    return fixture;
  }

  it('muestra los medios de pago y valida tarjeta antes de emitir pagoSimulado', async () => {
    const fixture = await crearComponente(350);
    const comp = fixture.componentInstance;
    const emitidos: PagoSimuladoEvent[] = [];
    comp.pagoSimulado.subscribe((e) => emitidos.push(e));

    // Intento con datos vacíos debe mostrar error local y bloquear emisión
    comp.confirmarSimulacion();
    fixture.detectChanges();
    expect(comp.errorLocal()).toContain('número de tarjeta');
    expect(emitidos.length).toBe(0);

    // Completar datos válidos de tarjeta de crédito y confirmar
    comp.tipoTarjeta = 'TARJETA_CREDITO';
    comp.tarjetaNumero = '4557 8800 1234 5678';
    comp.tarjetaVencimiento = '08/29';
    comp.tarjetaCvv = '123';
    comp.tarjetaTitular = 'Marco Rojas';
    comp.confirmarSimulacion();
    fixture.detectChanges();

    expect(comp.errorLocal()).toBeNull();
    expect(emitidos.length).toBe(1);
    expect(emitidos[0].metodoPago).toBe('TARJETA_CREDITO');
    expect(emitidos[0].referenciaOperacion.length).toBeGreaterThanOrEqual(4);
  });

  it('soporta Yape y Plin con QR, validación de celular y código de aprobación', async () => {
    const fixture = await crearComponente(420);
    const comp = fixture.componentInstance;
    const spy = vi.spyOn(comp.pagoSimulado, 'emit');

    comp.seleccionarTab('YAPE');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('QR YAPE Escolar');

    comp.billeteraCelular = '12345';
    comp.confirmarSimulacion();
    expect(comp.errorLocal()).toContain('celular de 9 dígitos');
    expect(spy).not.toHaveBeenCalled();

    comp.billeteraCelular = '987654321';
    comp.billeteraCodigo = '482910';
    comp.confirmarSimulacion();
    expect(comp.errorLocal()).toBeNull();
    expect(spy).toHaveBeenCalledWith({
      metodoPago: 'YAPE',
      referenciaOperacion: 'YAPE-482910',
    });

    comp.seleccionarTab('PLIN');
    comp.billeteraCelular = '987654321';
    comp.billeteraCodigo = '654321';
    comp.confirmarSimulacion();
    expect(spy).toHaveBeenLastCalledWith({
      metodoPago: 'PLIN',
      referenciaOperacion: 'PLIN-654321',
    });
  });

  it('permite simular PagoEfectivo (CIP) y Transferencia bancaria', async () => {
    const fixture = await crearComponente(280);
    const comp = fixture.componentInstance;
    const spy = vi.spyOn(comp.pagoSimulado, 'emit');

    comp.seleccionarTab('BANCARIO');
    comp.tipoBancario = 'PAGO_EFECTIVO';
    comp.operacionBancaria = 'CIP-912405881';
    comp.confirmarSimulacion();
    expect(spy).toHaveBeenCalledWith({
      metodoPago: 'PAGO_EFECTIVO',
      referenciaOperacion: 'CIP-912405881',
    });

    comp.tipoBancario = 'TRANSFERENCIA';
    comp.operacionBancaria = 'OP-2026111299';
    comp.confirmarSimulacion();
    expect(spy).toHaveBeenLastCalledWith({
      metodoPago: 'TRANSFERENCIA',
      referenciaOperacion: 'OP-2026111299',
    });
  });

  it('deshabilita el botón principal mientras procesando es true', async () => {
    const fixture = await crearComponente(350);
    fixture.componentInstance.procesando = true;
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const btns = Array.from(el.querySelectorAll('button'));
    const submitBtn = btns.find((b) => b.textContent?.includes('Procesando'));
    expect(submitBtn).toBeDefined();
    expect(submitBtn?.disabled).toBe(true);
  });

  it('autocompleta datos de prueba válidos en 1 clic según la pestaña activa', async () => {
    const fixture = await crearComponente(240);
    const comp = fixture.componentInstance;
    const spy = vi.spyOn(comp.pagoSimulado, 'emit');

    comp.autocompletarDatosPrueba();
    comp.confirmarSimulacion();
    expect(comp.errorLocal()).toBeNull();
    expect(spy).toHaveBeenCalledTimes(1);

    comp.seleccionarTab('YAPE');
    comp.autocompletarDatosPrueba();
    comp.confirmarSimulacion();
    expect(comp.errorLocal()).toBeNull();
    expect(spy).toHaveBeenLastCalledWith({
      metodoPago: 'YAPE',
      referenciaOperacion: 'YAPE-482910',
    });
  });
});
