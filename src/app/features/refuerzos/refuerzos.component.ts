import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AcademicoService } from '../../core/services/academico.service';
import { RefuerzoService, SesionRefuerzoDto, InscripcionRefuerzoDto } from '../../core/services/refuerzo.service';
import { AsignacionDocenteResponseDto, AulaResponseDto, PeriodoResponseDto } from '../../core/models/academico.model';
import { fechaActualEnPeru } from '../../core/utils/fecha-nacimiento';
import { AsignacionHorarioOpcionDto, HorarioService } from '../../core/services/horario.service';
@Component({ selector: 'app-refuerzos', standalone: true, imports: [FormsModule], template: `
  <section class="grid gap-4 text-ui-text"><header class="grid gap-2 border-b border-ui-divider pb-4"><p class="m-0 text-[11px] font-semibold uppercase tracking-[.12em] text-ui-muted">Acompañamiento pedagógico</p><h1 class="m-0 font-display text-2xl font-bold">Refuerzo académico</h1></header>
    <label class="grid gap-2 text-sm font-semibold">Asignación docente <select class="min-h-11 rounded-lg border border-ui-control-border bg-ui-surface px-3 py-2 text-ui-text focus-visible:outline-2 focus-visible:outline-ui-focus" [(ngModel)]="asignacionId" (ngModelChange)="cambiarAsignacion()">@for(a of asignaciones(); track a.id){<option [ngValue]="a.id">{{ descripcion(a.id) }}</option>}</select></label>
    <label class="grid gap-2 text-sm font-semibold">Periodo <select class="min-h-11 rounded-lg border border-ui-control-border bg-ui-surface px-3 py-2 text-ui-text focus-visible:outline-2 focus-visible:outline-ui-focus" [(ngModel)]="periodoId" (ngModelChange)="cargar()">@for(p of periodos();track p.id){<option [ngValue]="p.id">{{ p.nombre }}</option>}</select></label>
    <p role="status" class="m-0 min-h-11 rounded-lg border border-ui-divider bg-ui-surface-soft px-3 py-2 text-sm text-ui-text">{{ mensaje() }}</p>
    <details class="rounded-xl border border-ui-divider bg-ui-surface p-4"><summary class="min-h-11 cursor-pointer content-center font-semibold text-ui-text">Programar sesión</summary>
      <form (ngSubmit)="programar()" class="mt-4 grid gap-3 md:grid-cols-2">
        <label class="grid gap-2 text-sm font-semibold">Tema <input class="min-h-11 rounded-lg border border-ui-control-border bg-ui-surface px-3 py-2 text-ui-text focus-visible:outline-2 focus-visible:outline-ui-focus" name="tema" [(ngModel)]="tema" maxlength="40" required /></label>
        <label class="grid gap-2 text-sm font-semibold">Fecha <input class="min-h-11 rounded-lg border border-ui-control-border bg-ui-surface px-3 py-2 text-ui-text focus-visible:outline-2 focus-visible:outline-ui-focus" type="date" name="fecha" [(ngModel)]="fecha" [min]="hoy" required /></label>
        <label class="grid gap-2 text-sm font-semibold">Inicio <input class="min-h-11 rounded-lg border border-ui-control-border bg-ui-surface px-3 py-2 text-ui-text focus-visible:outline-2 focus-visible:outline-ui-focus" type="time" name="inicio" [(ngModel)]="inicio" required /></label>
        <label class="grid gap-2 text-sm font-semibold">Fin <input class="min-h-11 rounded-lg border border-ui-control-border bg-ui-surface px-3 py-2 text-ui-text focus-visible:outline-2 focus-visible:outline-ui-focus" type="time" name="fin" [(ngModel)]="fin" required /></label>
        <label class="grid gap-2 text-sm font-semibold">Aula <select class="min-h-11 rounded-lg border border-ui-control-border bg-ui-surface px-3 py-2 text-ui-text focus-visible:outline-2 focus-visible:outline-ui-focus" name="aula" [(ngModel)]="aula" required><option value="">Selecciona</option>@for(a of aulas();track a.id){<option [value]="a.codigo">{{ a.codigo }} · {{ a.nombre }}</option>}</select></label>
        <button class="min-h-11 rounded-lg bg-ui-accent px-4 py-2 font-semibold text-ui-accent-text disabled:opacity-50" [disabled]="ocupado() || !periodoId" type="submit">Guardar sesión</button>
      </form>
    </details>
    <ul class="grid gap-3">@for(s of sesiones();track s.id){<li class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ui-divider bg-ui-surface p-4"><div><h2 class="font-semibold text-ui-text">{{ s.tema }}</h2><p class="text-sm text-ui-muted">{{ s.fechaProgramada }} · {{ s.horaInicio }} - {{ s.horaFin }} · {{ s.aulaAsignada || 'Sin aula' }}</p></div>
      <div class="flex gap-2"><button class="min-h-11 rounded-lg border border-ui-control-border bg-ui-surface px-3 py-2 text-ui-text focus-visible:outline-2 focus-visible:outline-ui-focus" type="button" [disabled]="ocupado()" (click)="seleccionar(s)">Pase de lista</button><button class="min-h-11 rounded-lg border border-ui-control-border bg-ui-surface px-3 py-2 text-ui-text focus-visible:outline-2 focus-visible:outline-ui-focus" type="button" [disabled]="ocupado()" (click)="derivar(s)">Derivar estudiantes B/C</button></div></li>}
    @if(!sesiones().length){<li class="grid justify-items-center rounded-xl border border-ui-divider bg-ui-surface p-6 text-center text-sm text-ui-muted">No hay sesiones en este periodo.</li>}</ul>
    @if(seleccionada();as sesion){<section class="grid gap-3 rounded-xl border border-ui-divider bg-ui-surface p-4"><h2 class="text-lg font-semibold text-ui-text">Asistencia: {{ sesion.tema }}</h2><div class="overflow-x-auto"><table class="w-full min-w-[680px] text-left text-sm text-ui-text" data-mobile-table-cards=""><thead class="bg-ui-surface-soft text-ui-muted"><tr><th class="p-2">Estudiante</th><th class="p-2">Estado</th><th class="p-2">Observaciones de avance</th><th class="p-2">Acción</th></tr></thead><tbody>
      @for(i of inscritos();track i.id){<tr class="border-t border-ui-divider"><td class="p-2" data-label="Estudiante">{{ i.nombreEstudiante || 'Estudiante #' + i.estudianteId }}</td><td class="p-2" data-label="Estado"><select class="min-h-11 rounded-lg border border-ui-control-border bg-ui-surface px-3 py-2 text-ui-text focus-visible:outline-2 focus-visible:outline-ui-focus" [ngModel]="i.estadoAsistencia" (ngModelChange)="i.estadoAsistencia=$event"><option>PENDIENTE</option><option>ASISTIO</option><option>FALTO</option><option>JUSTIFICADO</option></select></td><td><input class="min-h-11 rounded-lg border border-ui-control-border bg-ui-surface px-3 py-2 text-ui-text focus-visible:outline-2 focus-visible:outline-ui-focus" maxlength="500" [ngModel]="i.observaciones" (ngModelChange)="i.observaciones=$event" [attr.aria-label]="'Avance del estudiante ' + i.estudianteId" /></td><td><button class="min-h-11 rounded-lg border border-ui-control-border bg-ui-surface px-3 py-2 text-ui-text focus-visible:outline-2 focus-visible:outline-ui-focus" type="button" [disabled]="ocupado() || !puedeTomarAsistencia() || i.estadoAsistencia === 'PENDIENTE' || (i.estadoAsistencia === 'JUSTIFICADO' && !i.observaciones?.trim())" (click)="guardarAsistencia(i)">Guardar</button></td></tr>}
    </tbody></table></div></section>}
  </section>` })
export class RefuerzosComponent implements OnInit {
    private readonly academico = inject(AcademicoService);
    private readonly servicio = inject(RefuerzoService);
    private readonly horarios = inject(HorarioService);
    readonly catalogo = signal<AsignacionHorarioOpcionDto[]>([]);
    readonly asignaciones = signal<AsignacionDocenteResponseDto[]>([]);
    readonly periodos = signal<PeriodoResponseDto[]>([]);
    readonly aulas = signal<AulaResponseDto[]>([]);
    readonly sesiones = signal<SesionRefuerzoDto[]>([]);
    readonly inscritos = signal<InscripcionRefuerzoDto[]>([]);
    readonly seleccionada = signal<SesionRefuerzoDto | null>(null);
    readonly mensaje = signal('');
    readonly ocupado = signal(false);
    readonly hoy = fechaActualEnPeru();
    asignacionId = 0;
    periodoId = 0;
    tema = '';
    fecha = this.hoy;
    inicio = '';
    fin = '';
    aula = '';
    private revision = 0;
    ngOnInit() {
        this.horarios.catalogo().subscribe({ next: datos => this.catalogo.set(datos), error: () => this.mensaje.set('No se pudo cargar el catálogo docente.') });
        this.academico.listarAsignaciones().subscribe({ next: datos => { this.asignaciones.set(Array.from(new Map(datos.map(a => [`${a.anioLectivoId}/${a.areaCurricularId}/${a.docenteUsuarioId}`, a])).values())); this.asignacionId = this.asignaciones()[0]?.id ?? 0; this.cambiarAsignacion(); }, error: () => this.mensaje.set('No se pudieron cargar las asignaciones.') });
        this.academico.listarAulas().subscribe({ next: aulas => this.aulas.set(aulas.filter(a => a.activa)), error: () => this.mensaje.set('No se pudieron cargar las aulas.') });
    }
    cambiarAsignacion() {
        const a = this.asignaciones().find(a => a.id === Number(this.asignacionId));
        this.periodoId = 0;
        this.sesiones.set([]);
        this.seleccionada.set(null);
        const revision = ++this.revision;
        if (!a)
            return;
        this.academico.listarPeriodos(a.anioLectivoId).subscribe({ next: datos => { if (revision !== this.revision)
                return; this.periodos.set(datos); this.periodoId = datos[0]?.id ?? 0; this.cargar(); }, error: () => this.mensaje.set('No se pudieron cargar los periodos.') });
    }
    cargar() {
        this.seleccionada.set(null);
        this.inscritos.set([]);
        this.sesiones.set([]);
        const periodo = Number(this.periodoId);
        const asignacionId = Number(this.asignacionId);
        const asignacion = this.asignaciones().find(a => a.id === asignacionId);
        if (!periodo || !asignacion) return;
        this.mensaje.set('Cargando sesiones…');
        this.servicio.listarSesiones(periodo).subscribe({
            next: datos => {
                if (periodo !== Number(this.periodoId) || asignacionId !== Number(this.asignacionId)) return;
                this.sesiones.set(datos.filter(s => s.anioLectivoId === asignacion.anioLectivoId
                    && s.areaCurricularId === asignacion.areaCurricularId && s.docenteUsuarioId === asignacion.docenteUsuarioId));
                this.mensaje.set('');
            },
            error: error => {
                if (periodo === Number(this.periodoId) && asignacionId === Number(this.asignacionId))
                    this.mensaje.set(error?.error?.message ?? 'No se pudieron cargar las sesiones.');
            }
        });
    }
    programar() {
        const a = this.asignaciones().find(a => a.id === Number(this.asignacionId));
        if (!a || !this.periodoId || this.ocupado())
            return;
        if (!this.tema.trim() || this.tema.length > 40 || !this.aula || this.fecha < this.hoy || !this.inicio || !this.fin || this.fin <= this.inicio) {
            this.mensaje.set('Revisa el tema, aula, fecha y rango horario.');
            return;
        }
        this.ocupado.set(true);
        this.servicio.programar({ anioLectivoId: a.anioLectivoId, periodoAcademicoId: Number(this.periodoId), areaCurricularId: a.areaCurricularId, docenteUsuarioId: a.docenteUsuarioId, tema: this.tema.trim(), fechaProgramada: this.fecha, horaInicio: this.inicio, horaFin: this.fin, aulaAsignada: this.aula }).subscribe({ next: () => { this.ocupado.set(false); this.tema = ''; this.mensaje.set('Sesión programada.'); this.cargar(); }, error: e => this.fallo(e) });
    }
    seleccionar(s: SesionRefuerzoDto) { this.seleccionada.set(s); this.inscritos.set([]); this.servicio.inscripciones(s.id).subscribe({ next: datos => { if (this.seleccionada()?.id === s.id)
            this.inscritos.set(datos); }, error: e => this.fallo(e) }); }
    derivar(s: SesionRefuerzoDto) { if (this.ocupado())
        return; this.ocupado.set(true); this.servicio.derivarAutomatico(s.id).subscribe({ next: datos => { this.ocupado.set(false); this.mensaje.set(`Derivación completada: ${datos.length} inscripciones devueltas.`); this.seleccionar(s); }, error: e => this.fallo(e) }); }
    guardarAsistencia(i: InscripcionRefuerzoDto) { if (this.ocupado())
        return; this.ocupado.set(true); this.servicio.asistencia({ inscripcionId: i.id, estadoAsistencia: i.estadoAsistencia, observaciones: i.observaciones ?? '' }).subscribe({ next: () => { this.ocupado.set(false); this.mensaje.set('Asistencia guardada.'); }, error: e => this.fallo(e) }); }
    puedeTomarAsistencia() { return !!this.seleccionada() && this.seleccionada()!.fechaProgramada <= this.hoy; }
    private fallo(error: {
        error?: {
            message?: string;
        };
    }) { this.ocupado.set(false); this.mensaje.set(error?.error?.message ?? 'No se pudo completar la operación.'); }
    descripcion(id: number) { const a = this.catalogo().find(a => a.asignacionId === id); return a ? `${a.anio} · ${a.areaNombre} · ${a.docenteNombre}` : 'Asignación sin catálogo'; }
}
