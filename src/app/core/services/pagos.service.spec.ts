import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MatriculaPublicaService } from './matricula-publica.service';
import { TesoreriaService } from './tesoreria.service';

describe('Confirmación segura de pagos', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('consulta el pago público mediante POST y token sin enviar importe ni estado', () => {
    TestBed.inject(MatriculaPublicaService).consultarPago('solicitud', 'secreto').subscribe();
    const request = http.expectOne(r => r.url.endsWith('/solicitudes-matricula/public/solicitud/consultar-pago'));
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('X-Solicitud-Matricula-Token')).toBe('secreto');
    expect(request.request.body).toEqual({});
    request.flush({ estado: 'PAGO_PENDIENTE' });
  });

  it('un pago de obligación pendiente no se interpreta como aprobado', () => {
    let respuesta: unknown = undefined;
    TestBed.inject(TesoreriaService).confirmarPago(42).subscribe(p => respuesta = p);
    const request = http.expectOne(r => r.url.endsWith('/tesoreria/obligaciones/42/confirmar-pago'));
    expect(request.request.method).toBe('POST');
    request.flush(null, { status: 204, statusText: 'No Content' });
    expect(respuesta).toBeNull();
  });

  it('envía la referencia bancaria de la transferencia verificada', () => {
    TestBed.inject(TesoreriaService).registrarPagoCaja({ obligacionPagoId: 42, montoPagado: 350,
      metodoPago: 'TRANSFERENCIA', pasarelaTransaccionId: 'BANCO-BCP-OPERACION-PRUEBA' }).subscribe();
    const request = http.expectOne(r => r.url.endsWith('/tesoreria/pagos/caja'));
    expect(request.request.body.metodoPago).toBe('TRANSFERENCIA');
    expect(request.request.body.montoPagado).toBe(350);
    expect(request.request.body.pasarelaTransaccionId).toBe('BANCO-BCP-OPERACION-PRUEBA');
    request.flush({ id: 1 });
  });
});
