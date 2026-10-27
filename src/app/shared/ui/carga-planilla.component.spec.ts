import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CargaPlanillaComponent } from './carga-planilla.component';
describe('carga masiva CNEB', () => {
    let http: HttpTestingController;
    let componente: CargaPlanillaComponent;
    beforeEach(() => {
        TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
        http = TestBed.inject(HttpTestingController);
        componente = TestBed.runInInjectionContext(() => new CargaPlanillaComponent());
        componente.asignacionId = 9;
        componente.periodoId = 1;
        componente.seccionId = 2;
        componente.competenciaId = 3;
        componente.archivo = new File(['DNI_ESTUDIANTE,COMPETENCIA_ID,NOTA_CNEB,CONCLUSION_DESCRIPTIVA\n00123456,3,B,Explica con apoyo'], 'notas.csv', { type: 'text/csv' });
    });
    afterEach(() => { http.verify(); TestBed.resetTestingModule(); });
    it('exige previsualización y revalida en servidor antes de confirmar', () => {
        componente.enviar(true);
        http.expectNone(r => r.url.endsWith('/cneb/carga-masiva'));
        componente.enviar(false);
        const previo = http.expectOne(r => r.url.endsWith('/cneb/carga-masiva'));
        expect(previo.request.params.get('confirmar')).toBe('false');
        expect(previo.request.params.get('asignacionDocenteId')).toBe('9');
        expect(previo.request.body instanceof FormData).toBe(true);
        previo.flush({ filasValidadas: 1, filasProcesadas: 0, filas: [] });
        expect(componente.vista()?.filasProcesadas).toBe(0);
        componente.enviar(true);
        const definitivo = http.expectOne(r => r.url.endsWith('/cneb/carga-masiva'));
        expect(definitivo.request.params.get('confirmar')).toBe('true');
        definitivo.flush({ filasValidadas: 1, filasProcesadas: 1, filas: [] });
        expect(componente.vista()).toBeNull();
        expect(componente.mensaje()).toContain('1 calificaciones guardadas');
    });
    it('muestra errores por fila sin habilitar confirmación', () => { componente.enviar(false); http.expectOne(r => r.url.endsWith('/cneb/carga-masiva')).flush({ message: 'Corrige filas', validationErrors: { 'fila[2].NOTA_CNEB': 'Solo AD, A, B o C' } }, { status: 422, statusText: 'Unprocessable Entity' }); expect(componente.errores()[0].campo).toBe('fila[2].NOTA_CNEB'); expect(componente.vista()).toBeNull(); });
    it('cancela una previsualización al cambiar de contexto académico', () => { componente.enviar(false); const solicitud = http.expectOne(r => r.url.endsWith('/cneb/carga-masiva')); componente.ngOnChanges(); expect(solicitud.cancelled).toBe(true); expect(componente.archivo).toBeNull(); expect(componente.vista()).toBeNull(); });
});
