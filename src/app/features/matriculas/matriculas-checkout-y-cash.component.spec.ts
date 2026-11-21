import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MatriculasComponent } from './matriculas.component';
import { MatriculaService } from '../../core/services/matricula.service';
import { AcademicoService } from '../../core/services/academico.service';
import { MatriculaPublicaService } from '../../core/services/matricula-publica.service';
import { AuthStore } from '../../core/state/auth.store';

describe('MatriculasComponent - Flujo presencial sin constancia y checkout en línea', () => {
  let mockMatriculaService: any;
  let mockAcademicoService: any;
  let mockAuthStore: any;

  beforeEach(async () => {
    mockMatriculaService = {
      listarEstudiantes: vi.fn(() => of([])),
      listarPorAnio: vi.fn(() => of([])),
      listarEstudianteIdsMatriculados: vi.fn(() => of([])),
      listarApoderados: vi.fn(() => of([])),
      listarApoderadosPorEstudiante: vi.fn(() => of([])),
      importeEfectivoPresencial: vi.fn(() => of(350)),
      registrarPresencial: vi.fn(() =>
        of({
          matriculaId: 501,
          estudianteId: 601,
          apoderadoId: 701,
          solicitudId: 'sol-cash-1',
          comprobanteCodigo: 'B001-00000501',
          montoCobrado: 350,
          metodoPago: 'EFECTIVO',
          fechaEmision: '2026-11-12T10:00:00Z',
          usernameApoderado: 'apod.demo',
          emailApoderado: 'apod@example.test',
          cuentaNueva: false,
          voucherPdfBase64: '',
          mensaje: 'Matrícula registrada',
        }),
      ),
      iniciarPagoPresencialEnLinea: vi.fn(() =>
        of({
          solicitudId: 'sol-online-1',
          enlacePago: 'https://sandbox.mercadopago.com.pe/checkout/v1/redirect?pref_id=SIM-1',
          monto: 350,
        }),
      ),
      simularPagoPresencialEnLinea: vi.fn(() =>
        of({
          estado: 'MATRICULADA',
          comprobanteCodigo: 'B001-00000502',
        }),
      ),
      estadoPagoPresencial: vi.fn(() =>
        of({
          estado: 'PAGO_PENDIENTE',
          comprobanteCodigo: null,
        }),
      ),
    };

    mockAcademicoService = {
      listarAnios: vi.fn(() => of([{ id: 1, anio: 2026, abierto: true }])),
      listarGrados: vi.fn(() =>
        of([{ id: 10, nivelId: 3, nivelCodigo: 'SECUNDARIA', numeroGrado: 5, nombre: '5° de Secundaria' }]),
      ),
      listarSecciones: vi.fn(() =>
        of([
          {
            id: 37,
            anioLectivoId: 1,
            gradoId: 10,
            nivelId: 3,
            letra: 'A',
            cupoMaximo: 30,
            vacantesOcupadas: 15,
            codigoAula: 'SEC-5-A',
            aulaActiva: true,
          },
        ]),
      ),
    };

    mockAuthStore = {
      hasRole: vi.fn((rol: string) => rol === 'DIRECCION' || rol === 'SECRETARIA'),
      hasAnyRole: vi.fn((roles: string[]) => roles.includes('DIRECCION') || roles.includes('SECRETARIA')),
    };

    await TestBed.configureTestingModule({
      imports: [MatriculasComponent],
      providers: [
        provideRouter([]),
        { provide: MatriculaService, useValue: mockMatriculaService },
        { provide: AcademicoService, useValue: mockAcademicoService },
        { provide: MatriculaPublicaService, useValue: { listarAdmin: vi.fn(() => of([])) } },
        { provide: AuthStore, useValue: mockAuthStore },
        { provide: MatDialog, useValue: { open: vi.fn() } },
      ],
    }).compileComponents();
  });

  function poblarPaso1Valido(comp: MatriculasComponent) {
    comp.presencialAnioId = 1;
    comp.presencialNivelId = 3;
    comp.presencialGradoId = 10;
    comp.presencialSeccionId = 37;
    comp.presencialDniEstudiante = '76543210';
    comp.presencialNombresEstudiante = 'Mateo';
    comp.presencialApePaternoEstudiante = 'Quispe';
    comp.presencialApeMaternoEstudiante = 'Vega';
    comp.presencialNacimientoEstudiante = '2010-04-12';
    comp.presencialGeneroEstudiante = 'M';
    comp.presencialDniApoderado = '46543210';
    comp.presencialNombresApoderado = 'Elena';
    comp.presencialApePaternoApoderado = 'Vega';
    comp.presencialApeMaternoApoderado = 'Soto';
    comp.presencialCelularApoderado = '987654321';
    comp.presencialEmailApoderado = 'elena@example.test';
    comp.presencialDireccionApoderado = 'Av. Libertad 450';
  }

  it('exige la fotografía del alumno en el Paso 1 antes de avanzar a Documentos', () => {
    const fixture = TestBed.createComponent(MatriculasComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    poblarPaso1Valido(comp);
    comp.presencialArchivos.foto = null;
    comp.avanzarAPaso2Presencial();

    expect(comp.etapaPresencial()).toBe(1);
    expect(comp.errorPresencial()).toContain('fotografía');

    comp.presencialArchivos.foto = new File(['png-bytes'], 'foto.png', { type: 'image/png' });
    comp.avanzarAPaso2Presencial();

    expect(comp.etapaPresencial()).toBe(2);
    expect(comp.errorPresencial()).toBeNull();
  });

  it('registra matrícula presencial en efectivo sin adjuntar constancia de pago en FormData', () => {
    const fixture = TestBed.createComponent(MatriculasComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    poblarPaso1Valido(comp);
    comp.presencialArchivos.foto = new File(['png-bytes'], 'foto.png', { type: 'image/png' });
    comp.avanzarAPaso2Presencial();
    expect(comp.etapaPresencial()).toBe(2);

    comp.presencialArchivos.partida = new File(['pdf-bytes'], 'partida.pdf', { type: 'application/pdf' });
    comp.presencialArchivos.dni = new File(['pdf-bytes'], 'dni.pdf', { type: 'application/pdf' });
    comp.presencialArchivos.recibo = new File(['pdf-bytes'], 'recibo.pdf', { type: 'application/pdf' });
    comp.avanzarAPaso3Presencial();

    expect(comp.etapaPresencial()).toBe(3);
    expect(mockMatriculaService.importeEfectivoPresencial).toHaveBeenCalled();
    expect(comp.presencialMontoEfectivo()).toBe(350);

    comp.presencialMetodoPago = 'EFECTIVO';
    comp.confirmarMatriculaPresencial();

    expect(mockMatriculaService.registrarPresencial).toHaveBeenCalledTimes(1);
    const fdSent: FormData = mockMatriculaService.registrarPresencial.mock.calls[0][0];
    expect(fdSent.get('constanciaPago')).toBeNull();
    expect(fdSent.get('montoEfectivo')).toBe('350');
    expect(fdSent.get('foto')).toBeTruthy();
    expect(comp.etapaPresencial()).toBe(4);
    expect(comp.resultadoPresencial()?.comprobanteCodigo).toBe('B001-00000501');
  });

  it('simula pago digital presencial desde el checkout del Paso 4 y actualiza la constancia', () => {
    const fixture = TestBed.createComponent(MatriculasComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    comp.presencialPagoEnLinea.set({
      solicitudId: 'sol-online-1',
      enlacePago: 'https://sandbox.mercadopago.com.pe/checkout/v1/redirect?pref_id=SIM-1',
      monto: 350,
    });
    comp.etapaPresencial.set(4);

    comp.simularPagoPresencial({ metodoPago: 'YAPE', referenciaOperacion: 'YAPE-482910' });

    expect(mockMatriculaService.simularPagoPresencialEnLinea).toHaveBeenCalledWith(
      'sol-online-1',
      'YAPE',
      'YAPE-482910',
    );
    expect(comp.presencialEstadoPago()?.estado).toBe('MATRICULADA');
    expect(comp.presencialEstadoPago()?.comprobanteCodigo).toBe('B001-00000502');
    expect(comp.mensajeExito()).toContain('Pago en línea confirmado');
  });
});
