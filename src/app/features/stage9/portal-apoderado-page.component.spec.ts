import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PortalApoderadoPageComponent } from './portal-apoderado-page.component';
import { AuthStore } from '../../core/state/auth.store';
import { HijoPortalDto } from '../../core/services/portal-familiar.service';
describe('portal familiar conectado', () => {
    let componente: PortalApoderadoPageComponent;
    let http: HttpTestingController;
    const hijo = (id: number): HijoPortalDto => ({ estudianteId: id, matriculaId: id, anioLectivoId: 2, anio: 2026, seccionId: 3, nombres: 'Ana', apellidoPaterno: 'Perez', apellidoMaterno: 'Ruiz', numeroDocumento: '00123456', nivel: 'PRIMARIA', grado: 'Primero', seccion: 'A' });
    beforeEach(() => { TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), { provide: AuthStore, useValue: { hasAnyRole: () => false } }] }); http = TestBed.inject(HttpTestingController); componente = TestBed.runInInjectionContext(() => new PortalApoderadoPageComponent()); componente.hijos.set([hijo(1), hijo(2)]); });
    afterEach(() => { http.verify(); TestBed.resetTestingModule(); });
    function completar(id: number) { http.expectOne(r => r.url.endsWith(`/matriculas/${id}/calificaciones`)).flush([]); http.expectOne(r => r.url.endsWith(`/matriculas/${id}/periodos`)).flush([{ id: 1, nombre: 'I Bimestre' }]); http.expectOne(r => r.url.endsWith(`/matriculas/${id}/asistencia`)).flush([]); http.expectOne(r => r.url.endsWith('/tesoreria/mis-obligaciones')).flush([]); }
    it('carga datos reales por matrícula y consulta únicamente obligaciones familiares', () => { componente.seleccionar(1); completar(1); expect(componente.estado()).toBe('normal'); expect(componente.matriculaId()).toBe(1); expect(componente.periodoId()).toBe(1); });
    it('no consulta una matrícula ajena al selector autorizado', () => { componente.seleccionar(99); componente.descargar(99); http.expectNone(() => true); });
    it('una respuesta tardía de otro hijo no reemplaza la selección actual', () => { componente.seleccionar(1); const primeras = http.match(() => true); componente.seleccionar(2); completar(2); for (const peticion of primeras)
        peticion.flush([]); expect(componente.matriculaId()).toBe(2); expect(componente.estado()).toBe('normal'); });
});
