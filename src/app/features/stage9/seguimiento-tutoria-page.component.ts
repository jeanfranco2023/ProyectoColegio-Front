import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { forkJoin, map } from 'rxjs';
import { SeguimientoTutoriaComponent } from './seguimiento-tutoria.component';
import { Stage9State, Stage9TutorFilters } from './stage9.contract';
import { HijoPortalDto, PortalFamiliarService } from '../../core/services/portal-familiar.service';
import { ConvivenciaService } from '../../core/services/convivencia.service';
import { AsistenciaService } from '../../core/services/asistencia.service';
import { IncidenciaResponseDto } from '../../core/models/convivencia.model';
import { AsistenciaAulaResponseDto, DocenteAsistenciaDiariaResponseDto } from '../../core/models/asistencia.model';
import { PeriodoResponseDto } from '../../core/models/academico.model';
import { fechaActualEnPeru } from '../../core/utils/fecha-nacimiento';
import { AuthStore } from '../../core/state/auth.store';
@Component({ selector: 'app-seguimiento-tutoria-page', standalone: true, imports: [SeguimientoTutoriaComponent], template: `
  @if (authStore.hasRole('SECRETARIA')) {
    <p class="rounded-xl border border-ui-info-border bg-ui-info-bg px-4 py-3 text-sm font-medium text-ui-info-text" role="status">El backend no expone para Secretaría los datos de seguimiento por estudiante requeridos en esta vista. Está disponible para Dirección, Tutoría y Auxiliar.</p>
  } @else {
  <p class="mb-3 text-sm">Asistencia de hoy: {{ hoy }}. Las observaciones e incidencias se filtran por el periodo seleccionado.</p>
  <app-seguimiento-tutoria-screen [state]="estado()" [errorMessage]="mensaje()" [filters]="filtros()" [sections]="secciones()" [periods]="opcionesPeriodos()" [students]="filas()" [studentCount]="filas().length" [attendanceSummary]="asistenciasResumen()" [incidentCount]="graves()" [observationCount]="incidenciasFiltradas().length" (filtersChanged)="filtrar($event)" (studentRequested)="seleccionar($event)" (retry)="cargar()" />
  @if(detalleId();as id){<aside class="grid gap-2 rounded-xl border bg-ui-surface p-4" aria-label="Detalle de seguimiento"><h2 class="font-semibold">{{ nombre(id) }}</h2>@for(i of detalle();track i.id){<p>{{ i.fechaIncidencia }} · {{ i.tipoFalta }} · {{ i.descripcion }}</p>}@if(!detalle().length){<p>No hay incidencias registradas para este estudiante en el periodo.</p>}<button type="button" class="min-h-11 rounded-lg border p-2" (click)="detalleId.set(null)">Cerrar detalle</button></aside>}
  }
` })
export class SeguimientoTutoriaPageComponent implements OnInit {
    private readonly portal = inject(PortalFamiliarService);
    private readonly convivencia = inject(ConvivenciaService);
    private readonly asistencia = inject(AsistenciaService);
    readonly authStore = inject(AuthStore);
    readonly hoy = fechaActualEnPeru();
    readonly hijos = signal<HijoPortalDto[]>([]);
    readonly incidencias = signal<IncidenciaResponseDto[]>([]);
    readonly asistencias = signal<Array<AsistenciaAulaResponseDto | DocenteAsistenciaDiariaResponseDto>>([]);
    readonly periodos = signal<PeriodoResponseDto[]>([]);
    readonly estado = signal<Stage9State>('loading');
    readonly mensaje = signal('');
    readonly detalleId = signal<number | null>(null);
    readonly filtros = signal<Stage9TutorFilters>({ sectionId: null, periodId: null, search: '' });
    private anioCargado = 0;
    readonly secciones = computed(() => Array.from(new Map(this.hijos().map(h => [h.seccionId, { id: h.seccionId, label: `${h.nivel} · ${h.grado} ${h.seccion} · ${h.anio}` }])).values()));
    readonly opcionesPeriodos = computed(() => this.periodos().map(p => ({ id: p.id, label: p.nombre })));
    readonly alumnosFiltrados = computed(() => this.hijos().filter(h => (!this.filtros().sectionId || h.seccionId === this.filtros().sectionId) && `${h.nombres} ${h.apellidoPaterno} ${h.apellidoMaterno}`.toLocaleLowerCase('es').includes(this.filtros().search.trim().toLocaleLowerCase('es'))));
    readonly incidenciasFiltradas = computed(() => { const ids = new Set(this.alumnosFiltrados().map(h => h.matriculaId)); const periodo = this.periodos().find(p => p.id === this.filtros().periodId); return this.incidencias().filter(i => ids.has(i.matriculaId) && (!periodo || (i.fechaIncidencia >= periodo.fechaInicio && i.fechaIncidencia <= periodo.fechaFin))); });
    readonly filas = computed(() => {
        const marcas = new Map(this.asistencias().map(a => [a.matriculaId, a]));
        const grupos = new Map<number, IncidenciaResponseDto[]>();
        for (const i of this.incidenciasFiltradas()) {
            const grupo = grupos.get(i.matriculaId) ?? [];
            grupo.push(i);
            grupos.set(i.matriculaId, grupo);
        }
        return this.alumnosFiltrados().map(h => { const registros = grupos.get(h.matriculaId) ?? []; const graves = registros.filter(i => i.tipoFalta !== 'LEVE').length; return { id: h.matriculaId, fullName: `${h.nombres} ${h.apellidoPaterno} ${h.apellidoMaterno}`, attendanceSummary: marcas.get(h.matriculaId)?.estado ?? 'Sin registro hoy', incidentsSummary: `${graves} graves o muy graves`, observationsCount: registros.length, lastActivity: registros.map(i => i.fechaIncidencia).sort().at(-1) ?? marcas.get(h.matriculaId)?.fechaSesion ?? 'Sin actividad' }; });
    });
    readonly graves = computed(() => this.incidenciasFiltradas().filter(i => i.tipoFalta !== 'LEVE').length);
    readonly asistenciasResumen = computed(() => { const ids = new Set(this.alumnosFiltrados().map(h => h.matriculaId)); return `${this.asistencias().filter(a => ids.has(a.matriculaId)).length} registros de hoy`; });
    readonly detalle = computed(() => this.incidenciasFiltradas().filter(i => i.matriculaId === this.detalleId()));
    ngOnInit() { this.cargar(); }
    cargar() {
        if (this.authStore.hasRole('SECRETARIA')) return;
        this.estado.set('loading');
        const asistencia$ = this.authStore.hasRole('TUTOR')
            ? this.asistencia.obtenerReporteDocente(this.hoy)
            : this.asistencia.obtenerReporteDiario(this.hoy).pipe(map(reporte => reporte.asistencias));
        forkJoin({ hijos: this.portal.alumnosSeguimiento(), incidencias: this.convivencia.listarIncidencias(), asistencia: asistencia$ }).subscribe({ next: d => { this.hijos.set(d.hijos); this.incidencias.set(d.incidencias); this.asistencias.set(d.asistencia); this.estado.set(d.hijos.length ? 'normal' : 'empty'); if (!this.filtros().sectionId && d.hijos.length)
            this.filtros.update(f => ({ ...f, sectionId: d.hijos[0].seccionId })); this.cargarPeriodos(); }, error: e => { this.estado.set('error'); this.mensaje.set(e?.error?.message ?? 'No se pudo cargar el seguimiento.'); } }); }
    filtrar(f: Stage9TutorFilters) { this.filtros.set(f); this.detalleId.set(null); this.cargarPeriodos(); }
    private cargarPeriodos() { const anio = this.hijos().find(h => h.seccionId === this.filtros().sectionId)?.anioLectivoId; if (!anio || anio === this.anioCargado)
        return; this.anioCargado = anio; this.periodos.set([]); this.filtros.update(f => ({ ...f, periodId: null })); this.portal.periodosSeguimiento(anio).subscribe({ next: periodos => { if (anio !== this.anioCargado)
            return; this.periodos.set(periodos); const actual = periodos.find(p => p.fechaInicio <= this.hoy && p.fechaFin >= this.hoy) ?? periodos[0]; this.filtros.update(f => ({ ...f, periodId: actual?.id ?? null })); }, error: () => { this.anioCargado = 0; this.mensaje.set('No se pudieron cargar los periodos.'); } }); }
    seleccionar(id: number) { if (this.alumnosFiltrados().some(h => h.matriculaId === id))
        this.detalleId.set(id); }
    nombre(id: number) { const h = this.hijos().find(h => h.matriculaId === id); return h ? `${h.nombres} ${h.apellidoPaterno} ${h.apellidoMaterno}` : ''; }
}
