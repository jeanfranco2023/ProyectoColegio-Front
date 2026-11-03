import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Subject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CalificacionesComponent } from './calificaciones.component';
import { AcademicoService } from '../../core/services/academico.service';
import { EvaluacionService } from '../../core/services/evaluacion.service';
import { AuthStore } from '../../core/state/auth.store';
describe('calificaciones y sugerencias pedagógicas', () => {
    const rolActual = signal('DOCENTE');
    let respuesta: Subject<{
        conclusionDescriptiva: string;
        aspectoMejora: string;
        recomendacionApoderado: string;
        generadoPorIa: boolean;
    }>;
    let componente: CalificacionesComponent;
    beforeEach(() => {
        rolActual.set('DOCENTE');
        respuesta = new Subject();
        TestBed.configureTestingModule({ providers: [{ provide: AcademicoService, useValue: {} }, { provide: EvaluacionService, useValue: { sugerirConclusion: () => respuesta } }, { provide: AuthStore, useValue: { hasRole: (role: string) => rolActual() === role } }] });
        componente = TestBed.runInInjectionContext(() => new CalificacionesComponent());
        componente.asignaciones.set([{ id: 1, areaCurricularId: 3, anioLectivoId: 2, seccionId: 4, docenteUsuarioId: 5, nivelId: 1 }]);
        componente.asignacionId = 1;
        componente.competenciaId = 2;
        componente.competencias.set([{ id: 2, areaId: 3, nombre: 'Resuelve problemas', numeroOrden: 1, descripcion: '' }]);
        componente.areas.set([{ id: 3, nombre: 'Matemática' }]);
        componente.alumnoEditando.set({ matriculaId: 9, numeroOrden: 1, estudiante: 'Ana', c1: 'B', c2: '-', c3: '-', conclusionDescriptiva: '', requiereRefuerzo: false, competenciaId: 2 });
        componente.notaEditada = 'B';
        componente.evidenciaObservada = 'Resuelve con apoyo';
    });
    afterEach(() => TestBed.resetTestingModule());
    const resultado = { conclusionDescriptiva: 'Resuelve con apoyo.', aspectoMejora: 'Comprobar resultados.', recomendacionApoderado: 'Practicar con ejemplos.', generadoPorIa: true };
    it('recalcula la matriz al cambiar nombre y calificación sin volver a consultar datos', () => {
        const alumno = componente.alumnoEditando()!;
        componente.alumnos.set([
            { ...alumno, estudiante: 'Ana', c1: 'B' },
            { ...alumno, matriculaId: 10, estudiante: 'Lucía', c1: 'A' }
        ]);
        expect(componente.alumnosFiltrados()).toHaveLength(2);
        componente.busquedaAlumno.set('luc');
        expect(componente.alumnosFiltrados().map(a => a.matriculaId)).toEqual([10]);
        componente.filtroNota.set('B');
        expect(componente.alumnosFiltrados()).toHaveLength(0);
        componente.filtroNota.set('A');
        expect(componente.alumnosFiltrados()).toHaveLength(1);
        componente.busquedaAlumno.set('');
        componente.filtroNota.set('TODOS');
        expect(componente.alumnosFiltrados()).toHaveLength(2);
    });
    it('presenta la sugerencia para revisión y conserva su procedencia IA', () => { componente.sugerirConclusionConIa(); respuesta.next(resultado); expect(componente.conclusionEditada).toContain('Resuelve con apoyo.'); expect(componente.sugerenciaIaEditada).toBe(true); expect(componente.mensajeIa()).toContain('Revísala'); });
    it('no sobrescribe cambios humanos realizados durante la consulta', () => { componente.sugerirConclusionConIa(); componente.conclusionEditada = 'Conclusión escrita por el docente'; respuesta.next(resultado); expect(componente.conclusionEditada).toBe('Conclusión escrita por el docente'); expect(componente.sugerenciaIaEditada).toBe(false); });
    it('permite a Dirección consultar, pero bloquea los controles de escritura', () => { const alumno = componente.alumnoEditando()!; rolActual.set('DIRECCION'); componente.alumnoEditando.set(null); componente.abrirEdicion(alumno); componente.sugerirConclusionConIa(); componente.aplicarEdicion(); componente.guardarCalificaciones(); expect(componente.puedeEditar()).toBe(false); expect(componente.alumnoEditando()).toBeNull(); expect(respuesta.observed).toBe(false); });
});
