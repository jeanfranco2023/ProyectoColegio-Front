import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { ObservacionesFaltasComponent } from './observaciones-faltas.component';
import { Stage9ObservationDraft, Stage9State } from './stage9.contract';
import { HijoPortalDto, PortalFamiliarService } from '../../core/services/portal-familiar.service';
import { ConvivenciaService } from '../../core/services/convivencia.service';
import { IncidenciaResponseDto, TipoFalta } from '../../core/models/convivencia.model';
import { fechaActualEnPeru } from '../../core/utils/fecha-nacimiento';
@Component({ selector: 'app-observaciones-faltas-page', standalone: true, imports: [ObservacionesFaltasComponent], template: `
  <p role="status">{{ mensaje() }}</p>
  <app-observaciones-faltas-screen [state]="estado()" [errorMessage]="mensaje()" [formError]="errorFormulario()" [students]="opciones()" [observationTypes]="tipos" [draft]="draft()" [observations]="observaciones()" (draftChange)="draft.set($event)" (saveRequested)="guardar($event)" (retry)="cargar()" />
` })
export class ObservacionesFaltasPageComponent implements OnInit {
    private readonly portal = inject(PortalFamiliarService);
    private readonly convivencia = inject(ConvivenciaService);
    readonly hijos = signal<HijoPortalDto[]>([]);
    readonly incidencias = signal<IncidenciaResponseDto[]>([]);
    readonly estado = signal<Stage9State>('loading');
    readonly mensaje = signal('');
    readonly errorFormulario = signal('');
    readonly ocupado = signal(false);
    readonly tipos: TipoFalta[] = ['LEVE', 'GRAVE', 'MUY_GRAVE'];
    readonly draft = signal<Stage9ObservationDraft>({ studentId: null, date: fechaActualEnPeru(), type: 'LEVE', description: '' });
    readonly opciones = computed(() => this.hijos().map(h => ({ id: h.matriculaId, fullName: `${h.nombres} ${h.apellidoPaterno} ${h.apellidoMaterno}`, gradeLabel: `${h.grado} ${h.seccion} · ${h.anio}` })));
    readonly observaciones = computed(() => { const nombres = new Map(this.opciones().map(h => [h.id, h.fullName])); return this.incidencias().filter(i => nombres.has(i.matriculaId)).map(i => ({ id: i.id, studentId: i.matriculaId, studentName: nombres.get(i.matriculaId)!, date: i.fechaIncidencia, type: i.tipoFalta, description: i.descripcion, authorName: `Usuario #${i.reportadoPorUsuarioId}` })); });
    ngOnInit() { this.cargar(); }
    cargar() { this.estado.set('loading'); forkJoin({ hijos: this.portal.alumnosSeguimiento(), incidencias: this.convivencia.listarIncidencias() }).subscribe({ next: d => { this.hijos.set(d.hijos); this.incidencias.set(d.incidencias); this.estado.set(d.incidencias.length ? 'normal' : 'empty'); }, error: e => { this.estado.set('error'); this.mensaje.set(e?.error?.message ?? 'No se pudo cargar el registro de observaciones.'); } }); }
    guardar(draft: Stage9ObservationDraft) {
        if (this.ocupado())
            return;
        this.errorFormulario.set('');
        if (!draft.studentId || !this.hijos().some(h => h.matriculaId === draft.studentId) || !this.tipos.includes(draft.type as TipoFalta) || !draft.date || draft.date > fechaActualEnPeru() || !draft.description.trim() || draft.description.trim().length > 10000) {
            this.errorFormulario.set('Revisa estudiante, fecha, tipo y descripción (hasta 10000 caracteres).');
            return;
        }
        this.ocupado.set(true);
        this.convivencia.registrarIncidencia({ matriculaId: draft.studentId, fechaIncidencia: draft.date, tipoFalta: draft.type as TipoFalta, descripcion: draft.description.trim(), requiereCitacion: false }).subscribe({ next: () => { this.ocupado.set(false); this.draft.set({ ...draft, description: '' }); this.mensaje.set('Observación registrada en convivencia escolar.'); this.cargar(); }, error: e => { this.ocupado.set(false); this.errorFormulario.set(e?.error?.message ?? 'No se pudo guardar la observación.'); } });
    }
}
