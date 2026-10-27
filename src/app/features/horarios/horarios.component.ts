import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AcademicoService } from '../../core/services/academico.service';
import { AsignacionDocenteResponseDto } from '../../core/models/academico.model';
import { AsignacionHorarioOpcionDto, BloqueHorarioDto, DiaHorario, HorarioDto, HorarioService } from '../../core/services/horario.service';
import { AuthStore } from '../../core/state/auth.store';
@Component({ selector: 'app-horarios', standalone: true, imports: [FormsModule], template: `
  <section class="grid gap-5 text-slate-800"><h1 class="text-2xl font-bold">Malla horaria semanal</h1>
    <p>Selecciona una asignación para consultar su sección. Dirección y Secretaría pueden programarla en un bloque libre.</p>
    <label class="grid gap-2">Año, sección y asignación docente
      <select class="min-h-11 rounded-lg border p-2" [(ngModel)]="asignacionId" (ngModelChange)="cargar()"><option [ngValue]="0">Selecciona</option>
      @for (a of asignaciones(); track a.id) { <option [ngValue]="a.id">{{ descripcion(a.id) }}</option> }</select>
    </label>
    <p role="status">{{ mensaje() }}</p>
    <div class="overflow-auto rounded-xl border bg-white"><table class="w-full min-w-[750px] text-left text-sm"><thead><tr><th class="p-3">Bloque</th>@for (dia of dias; track dia.numero) { <th class="p-3">{{ dia.nombre }}</th> }</tr></thead><tbody>
      @for (bloque of bloques(); track bloque.id) { <tr class="border-t"><th class="p-3">{{ bloque.horaInicio.slice(0,5) }} - {{ bloque.horaFin.slice(0,5) }}</th>
        @for (dia of dias; track dia.numero) { <td class="p-3 align-top">
          @if (bloque.esRecreo) { <span>Recreo</span> }
          @else if (celda(dia.numero,bloque.id); as horario) { <p>{{ datosHorario(horario)?.areaNombre }}</p><small>{{ datosHorario(horario)?.docenteNombre }} · Aula {{ datosHorario(horario)?.aulaCodigo }}</small> }
          @else if (gestion()) { <button class="min-h-11 rounded-lg border p-2 disabled:opacity-50" type="button" [disabled]="guardando() || !asignacionId || ocupado(dia.numero,bloque.id)" (click)="programar(dia.codigo,bloque.id)">{{ ocupado(dia.numero,bloque.id) ? 'Docente ocupado en otra sección' : '+ Programar' }}</button> }
          @else { <span>Libre</span> }
        </td> }
      </tr> }
    </tbody></table></div>
    @if (!asignaciones().length) { <p>No tienes asignaciones docentes para consultar.</p> }
  </section>` })
export class HorariosComponent implements OnInit {
    private readonly academico = inject(AcademicoService);
    private readonly servicio = inject(HorarioService);
    private readonly store = inject(AuthStore);
    readonly asignaciones = signal<AsignacionDocenteResponseDto[]>([]);
    readonly bloques = signal<BloqueHorarioDto[]>([]);
    readonly catalogo = signal<AsignacionHorarioOpcionDto[]>([]);
    readonly horarios = signal<HorarioDto[]>([]);
    readonly docente = signal<HorarioDto[]>([]);
    readonly mensaje = signal('');
    readonly guardando = signal(false);
    asignacionId = 0;
    private revision = 0;
    readonly dias: Array<{
        numero: number;
        nombre: string;
        codigo: DiaHorario;
    }> = [
        { numero: 1, nombre: 'Lunes', codigo: 'LUNES' }, { numero: 2, nombre: 'Martes', codigo: 'MARTES' },
        { numero: 3, nombre: 'Miércoles', codigo: 'MIERCOLES' }, { numero: 4, nombre: 'Jueves', codigo: 'JUEVES' }, { numero: 5, nombre: 'Viernes', codigo: 'VIERNES' }
    ];
    gestion() { return this.store.hasAnyRole(['DIRECCION', 'SECRETARIA']); }
    ngOnInit() {
        forkJoin({ asignaciones: this.academico.listarAsignaciones(), bloques: this.servicio.bloques(), catalogo: this.servicio.catalogo() }).subscribe({
            next: d => { this.catalogo.set(d.catalogo); this.asignaciones.set(d.asignaciones); this.bloques.set(d.bloques); this.asignacionId = d.asignaciones[0]?.id ?? 0; this.cargar(); }, error: () => this.mensaje.set('No se pudieron cargar las asignaciones y bloques.')
        });
    }
    cargar() {
        const a = this.asignaciones().find(a => a.id === Number(this.asignacionId));
        const revision = ++this.revision;
        this.horarios.set([]);
        this.docente.set([]);
        if (!a)
            return;
        this.mensaje.set('Cargando horarios…');
        forkJoin({ seccion: this.servicio.obtenerPorSeccion(a.seccionId, a.anioLectivoId), docente: this.servicio.obtenerPorDocente(a.docenteUsuarioId, a.anioLectivoId) }).subscribe({
            next: d => { if (revision !== this.revision)
                return; this.horarios.set(d.seccion.horarios); this.docente.set(d.docente.horarios); this.mensaje.set(''); },
            error: e => { if (revision === this.revision)
                this.mensaje.set(e?.error?.message ?? 'No se pudo cargar la malla.'); }
        });
    }
    celda(dia: number, bloque: number) { return this.horarios().find(h => h.diaSemana === dia && h.bloqueHorarioId === bloque); }
    ocupado(dia: number, bloque: number) { return this.docente().some(h => h.diaSemana === dia && h.bloqueHorarioId === bloque); }
    datosHorario(h: HorarioDto) { return this.catalogo().find(a => a.asignacionId === h.asignacionDocenteId); }
    descripcion(id: number) { const a = this.catalogo().find(a => a.asignacionId === id); return a ? `${a.anio} · ${a.nivel} · ${a.grado} ${a.letra} · ${a.areaNombre} · ${a.docenteNombre}` : 'Asignación sin catálogo'; }
    programar(diaSemana: DiaHorario, bloqueHorarioId: number) {
        if (this.guardando() || !this.gestion())
            return;
        this.guardando.set(true);
        this.servicio.programar({ asignacionDocenteId: Number(this.asignacionId), diaSemana, bloqueHorarioId }).subscribe({
            next: () => { this.guardando.set(false); this.cargar(); },
            error: e => { this.guardando.set(false); this.mensaje.set(e?.error?.message ?? 'No se pudo programar el bloque.'); }
        });
    }
}
