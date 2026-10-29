import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HorarioService } from './horario.service';
import { RefuerzoService } from './refuerzo.service';
describe('contratos reales de horarios y refuerzos', () => {
    let http: HttpTestingController;
    beforeEach(() => { TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] }); http = TestBed.inject(HttpTestingController); });
    afterEach(() => { http.verify(); TestBed.resetTestingModule(); });
    it('consulta la malla de un grado y año con el contrato por grado', () => { let dia = 0; TestBed.inject(HorarioService).obtenerPorGrado(3, 2).subscribe(r => dia = r[0].diaSemana); const r = http.expectOne(r => r.url.endsWith('/horarios/grado/3')); expect(r.request.params.get('anioId')).toBe('2'); r.flush([{ id: 1, anioLectivoId: 2, gradoId: 3, areaCurricularId: 9, diaSemana: 1, bloqueHorarioId: 4, activo: true }]); expect(dia).toBe(1); });
    it('programa un bloque de grado con año, curso y día', () => { TestBed.inject(HorarioService).programar({ anioLectivoId: 2, gradoId: 3, areaCurricularId: 9, diaSemana: 'LUNES', bloqueHorarioId: 4 }).subscribe(); const r = http.expectOne(r => r.url.endsWith('/horarios/grado')); expect(r.request.method).toBe('POST'); expect(r.request.body).toEqual({ anioLectivoId: 2, gradoId: 3, areaCurricularId: 9, diaSemana: 'LUNES', bloqueHorarioId: 4 }); r.flush({ id: 1 }); });
    it('consultar inscritos no deriva alumnos ni modifica la sesión', () => { TestBed.inject(RefuerzoService).inscripciones(7).subscribe(); const r = http.expectOne(r => r.url.endsWith('/refuerzo/7/inscripciones')); expect(r.request.method).toBe('GET'); r.flush([]); });
    it('registra una justificación de refuerzo con el contrato existente', () => { TestBed.inject(RefuerzoService).asistencia({ inscripcionId: 8, estadoAsistencia: 'JUSTIFICADO', observaciones: 'Constancia recibida' }).subscribe(); const r = http.expectOne(r => r.url.endsWith('/refuerzo/asistencia')); expect(r.request.body.inscripcionId).toBe(8); expect(r.request.body.estadoAsistencia).toBe('JUSTIFICADO'); r.flush({ id: 8 }); });
});
