import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AsignacionHorarioOpcionDto, BloqueHorarioDto, DiaHorario, HorarioDto, HorarioService } from '../../core/services/horario.service';
import { AuthStore } from '../../core/state/auth.store';
import { AcademicoService } from '../../core/services/academico.service';
import { AnioLectivoResponseDto, GradoResponseDto, NivelResponseDto } from '../../core/models/academico.model';
import { forkJoin, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

interface GradoHorarioOpcion { clave: string; anioLectivoId: number; anio: number; nivel: string; nivelId: number; grado: string; gradoId: number; numeroGrado?: number; }

@Component({ selector: 'app-horarios', standalone: true, imports: [FormsModule], template: `
  <main class="grid min-w-0 gap-5 text-[#172b4d]" aria-labelledby="horarios-title">
    <header class="flex flex-wrap items-end justify-between gap-4 border-t-[3px] border-[#c49a58]/50 pt-3">
      <div><p class="m-0 text-[11px] font-extrabold uppercase tracking-[.14em] text-[#8b6425]">Planificación académica</p><h1 id="horarios-title" class="m-0 text-2xl font-extrabold tracking-tight">Malla horaria por grado</h1><p class="mt-1 text-sm text-slate-600">Un horario común para todas las secciones del grado durante el año lectivo seleccionado.</p></div>
      @if (gestion()) { <span class="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800">Edición de Dirección</span> }
    </header>

    <section class="grid gap-4 rounded-2xl border border-[#e1e8f1] bg-white p-4 shadow-sm md:grid-cols-[minmax(260px,1fr)_minmax(260px,1fr)]" aria-label="Filtros de malla horaria">
      <label class="grid gap-1 text-xs font-semibold text-slate-600">Año lectivo y grado
        <select class="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800" [(ngModel)]="gradoSeleccionado" name="grado" (ngModelChange)="cargar()"><option value="">Selecciona un grado</option>@for (grado of grados(); track grado.clave) { <option [value]="grado.clave">{{ grado.anio }} · {{ grado.nivel }} · {{ grado.grado }}</option> }</select>
      </label>
      @if (gestion() && gradoActual()) { <label class="grid gap-1 text-xs font-semibold text-slate-600">Área del siguiente bloque
        <select class="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800" [(ngModel)]="areaSeleccionada" name="area"><option [ngValue]="0">Selecciona el área</option>@for (area of areasDelGrado(); track area.id) { <option [ngValue]="area.id">{{ area.nombre }}</option> }</select>
      </label> }
    </section>

    @if (horarioSeleccionado()) { <p class="m-0 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">Seleccionaste un bloque para moverlo o cambiar de área. Elige una celda libre; el cambio se aplica a todas las secciones del grado. <button class="ml-2 min-h-10 rounded-lg border border-blue-200 bg-white px-3 font-semibold" type="button" (click)="cancelarMovimiento()">Cancelar</button></p> }
    @if (mensaje()) { <p role="status" class="m-0 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">{{ mensaje() }}</p> }

    <section class="overflow-hidden rounded-2xl border border-[#e1e8f1] bg-white shadow-sm" aria-label="Horario semanal por grado">
      <div class="overflow-x-auto"><table class="w-full min-w-[760px] border-collapse text-left text-sm">
        <thead class="bg-slate-50 text-xs uppercase tracking-wide text-slate-600"><tr><th class="p-3">Bloque</th>@for (dia of dias; track dia.numero) { <th class="p-3">{{ dia.nombre }}</th> }</tr></thead>
        <tbody>
          @for (bloque of bloques(); track bloque.id) { <tr class="border-t border-slate-100"><th class="whitespace-nowrap p-3 text-xs font-semibold text-slate-600">{{ bloque.horaInicio.slice(0,5) }}–{{ bloque.horaFin.slice(0,5) }}</th>
            @for (dia of dias; track dia.numero) { <td class="min-w-28 p-3 align-top">
              @if (bloque.esRecreo) { <span class="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">Recreo</span> }
              @else if (celda(dia.numero, bloque.id); as horario) { <div class="grid gap-2"><span class="font-semibold text-slate-800">{{ nombreArea(horario.areaCurricularId) }}</span><small class="text-slate-500">Aplica a todas las secciones</small>@if (gestion()) { <div class="flex flex-wrap gap-1"><button class="min-h-9 rounded-lg border border-slate-200 px-2 text-xs font-semibold hover:bg-slate-50" type="button" [disabled]="guardando()" (click)="seleccionarHorario(horario)">Mover / editar</button><button class="min-h-9 rounded-lg border border-red-200 px-2 text-xs font-semibold text-red-700 hover:bg-red-50" type="button" [disabled]="guardando()" (click)="retirar(horario.id)">Retirar</button></div> }</div> }
              @else if (gestion() && gradoActual()) { <button class="min-h-10 w-full rounded-lg border border-dashed border-blue-200 px-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50" type="button" [disabled]="guardando() || ocupado(dia.numero, bloque.id) || (horarioSeleccionado() ? !areaSeleccionada : !areaSeleccionada)" (click)="horarioSeleccionado() ? mover(dia.codigo, bloque.id) : programar(dia.codigo, bloque.id)">{{ horarioSeleccionado() ? 'Mover aquí' : '+ Programar' }}</button> }
              @else { <span class="text-xs text-slate-400">Libre</span> }
            </td> }
          </tr> } @empty { <tr><td colspan="6" class="p-10 text-center text-sm text-slate-500">Selecciona un grado para consultar su horario.</td></tr> }
        </tbody>
      </table></div>
    </section>
    @if (!grados().length && !cargando()) { <p class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{{ gestion() ? 'No hay grados configurados para los años lectivos.' : 'No hay grados con asignaciones docentes disponibles para tu usuario.' }}</p> }
    @if (cargando()) { <p role="status" class="text-sm text-slate-500">Cargando malla del grado…</p> }
  </main>` })
export class HorariosComponent implements OnInit {
  private readonly servicio = inject(HorarioService);
  private readonly store = inject(AuthStore);
  private readonly academicoService = inject(AcademicoService);
  readonly catalogo = signal<AsignacionHorarioOpcionDto[]>([]);
  readonly opcionesDireccion = signal<GradoHorarioOpcion[]>([]);
  readonly areasNivel = signal<Array<{ id: number; nombre: string }>>([]);
  readonly bloques = signal<BloqueHorarioDto[]>([]);
  readonly horarios = signal<HorarioDto[]>([]);
  readonly mensaje = signal('');
  readonly guardando = signal(false);
  readonly cargando = signal(false);
  readonly horarioSeleccionado = signal<HorarioDto | null>(null);
  readonly grados = computed(() => {
    if (this.gestion()) return this.opcionesDireccion();
    const opciones = new Map<string, GradoHorarioOpcion>();
    for (const item of this.catalogo()) {
      const clave = `${item.anioLectivoId}/${item.gradoId}`;
      opciones.set(clave, { clave, anioLectivoId: item.anioLectivoId, anio: item.anio, nivel: item.nivel, nivelId: item.nivelId, grado: item.grado, gradoId: item.gradoId });
    }
    return [...opciones.values()].sort((a, b) => b.anio - a.anio || a.nivel.localeCompare(b.nivel) || a.grado.localeCompare(b.grado));
  });
  readonly gradoActual = computed(() => this.grados().find(g => g.clave === this.gradoSeleccionado) ?? null);
  readonly areasDelGrado = computed(() => {
    const grade = this.gradoActual();
    if (!grade) return [];
    if (this.gestion()) return this.areasNivel();
    const opciones = new Map<number, string>();
    for (const item of this.catalogo()) if (item.gradoId === grade.gradoId && item.anioLectivoId === grade.anioLectivoId) opciones.set(item.areaId, item.areaNombre);
    return [...opciones].map(([id, nombre]) => ({ id, nombre })).sort((a, b) => a.nombre.localeCompare(b.nombre));
  });
  gradoSeleccionado = '';
  areaSeleccionada = 0;
  private revision = 0;
  readonly dias: Array<{ numero: number; nombre: string; codigo: DiaHorario }> = [
    { numero: 1, nombre: 'Lunes', codigo: 'LUNES' }, { numero: 2, nombre: 'Martes', codigo: 'MARTES' },
    { numero: 3, nombre: 'Miércoles', codigo: 'MIERCOLES' }, { numero: 4, nombre: 'Jueves', codigo: 'JUEVES' }, { numero: 5, nombre: 'Viernes', codigo: 'VIERNES' }
  ];

  gestion(): boolean { return this.store.hasRole('DIRECCION'); }
  ngOnInit(): void {
    this.cargando.set(true);
    if (this.gestion()) {
      forkJoin({
        anios: this.academicoService.listarAnios(),
        niveles: this.academicoService.listarNiveles(),
        bloques: this.servicio.bloques()
      }).pipe(switchMap(({ anios, niveles, bloques }) => {
        const consultasGrados = niveles.map(nivel => this.academicoService.listarGrados(nivel.id));
        const gradosPorNivel$ = consultasGrados.length ? forkJoin(consultasGrados) : of([] as GradoResponseDto[][]);
        return gradosPorNivel$.pipe(map(gradosPorNivel => ({ anios, niveles, bloques, gradosPorNivel })));
      })).subscribe({
        next: ({ anios, niveles, bloques, gradosPorNivel }) => {
          this.bloques.set(bloques);
          this.opcionesDireccion.set(this.crearOpcionesDireccion(anios, niveles, gradosPorNivel));
          const anioAbierto = anios.find(anio => anio.abierto);
          this.gradoSeleccionado = this.grados().find(grado => grado.anioLectivoId === anioAbierto?.id)?.clave
            ?? this.grados()[0]?.clave ?? '';
          this.cargar();
        },
        error: error => { this.cargando.set(false); this.mensaje.set(error?.error?.message ?? 'No se pudieron cargar años, niveles y grados.'); }
      });
      return;
    }

    forkJoin({ catalogo: this.servicio.catalogo(), bloques: this.servicio.bloques() }).subscribe({
      next: ({ catalogo, bloques }) => {
        this.catalogo.set(catalogo); this.bloques.set(bloques);
        this.gradoSeleccionado = this.grados()[0]?.clave ?? '';
        this.cargar();
      },
      error: error => { this.cargando.set(false); this.mensaje.set(error?.error?.message ?? 'No se pudieron cargar los grados asignados y los bloques.'); }
    });
  }

  private crearOpcionesDireccion(anios: AnioLectivoResponseDto[], niveles: NivelResponseDto[], gradosPorNivel: GradoResponseDto[][]): GradoHorarioOpcion[] {
    return niveles.flatMap((nivel, indice) => (gradosPorNivel[indice] ?? []).flatMap(grado => anios.map(anio => ({
      clave: `${anio.id}/${grado.id}`, anioLectivoId: anio.id, anio: anio.anio,
      nivel: nivel.nombre, nivelId: nivel.id, grado: grado.nombre, gradoId: grado.id,
      numeroGrado: grado.numeroGrado
    })))).sort((a, b) => b.anio - a.anio || a.nivel.localeCompare(b.nivel) || (a.numeroGrado ?? 0) - (b.numeroGrado ?? 0));
  }

  cargar(): void {
    const grade = this.gradoActual();
    const revision = ++this.revision;
    this.horarios.set([]); this.horarioSeleccionado.set(null); this.mensaje.set('');
    if (!grade) { this.cargando.set(false); return; }
    this.cargando.set(true);
    const cargarHorario = () => this.servicio.obtenerPorGrado(grade.gradoId, grade.anioLectivoId).subscribe({
      next: horarios => { if (revision !== this.revision) return; this.horarios.set(horarios); this.areaSeleccionada = this.areasDelGrado()[0]?.id ?? 0; this.cargando.set(false); },
      error: error => { if (revision !== this.revision) return; this.cargando.set(false); this.mensaje.set(error?.error?.message ?? 'No se pudo cargar la malla del grado.'); }
    });
    if (this.gestion()) {
      this.areasNivel.set([]);
      this.academicoService.listarAreas(grade.nivelId).subscribe({
        next: areas => { if (revision !== this.revision) return; this.areasNivel.set(areas); cargarHorario(); },
        error: error => { if (revision !== this.revision) return; this.cargando.set(false); this.mensaje.set(error?.error?.message ?? 'No se pudieron cargar los cursos de este nivel.'); }
      });
    } else cargarHorario();
  }
  celda(dia: number, bloque: number): HorarioDto | undefined { return this.horarios().find(h => h.diaSemana === dia && h.bloqueHorarioId === bloque); }
  ocupado(dia: number, bloque: number): boolean { return this.horarios().some(h => h.diaSemana === dia && h.bloqueHorarioId === bloque); }
  nombreArea(id: number): string { return this.areasDelGrado().find(a => a.id === id)?.nombre ?? 'Área curricular'; }
  seleccionarHorario(horario: HorarioDto): void { this.horarioSeleccionado.set(horario); this.areaSeleccionada = horario.areaCurricularId; }
  cancelarMovimiento(): void { this.horarioSeleccionado.set(null); }
  programar(diaSemana: DiaHorario, bloqueHorarioId: number): void {
    const grade = this.gradoActual(); if (!grade || !this.areaSeleccionada || !this.gestion() || this.guardando()) return;
    this.guardar(this.servicio.programar({ anioLectivoId: grade.anioLectivoId, gradoId: grade.gradoId, areaCurricularId: this.areaSeleccionada, diaSemana, bloqueHorarioId }));
  }
  mover(diaSemana: DiaHorario, bloqueHorarioId: number): void {
    const grade = this.gradoActual(), actual = this.horarioSeleccionado();
    if (!grade || !actual || !this.areaSeleccionada || !this.gestion() || this.guardando()) return;
    this.guardar(this.servicio.actualizar(actual.id, { anioLectivoId: grade.anioLectivoId, gradoId: grade.gradoId, areaCurricularId: this.areaSeleccionada, diaSemana, bloqueHorarioId }));
  }
  retirar(id: number): void { if (this.gestion() && !this.guardando()) this.guardar(this.servicio.retirar(id)); }
  private guardar(request: ReturnType<HorarioService['programar']>): void {
    this.guardando.set(true); this.mensaje.set('');
    request.subscribe({ next: () => { this.guardando.set(false); this.horarioSeleccionado.set(null); this.cargar(); }, error: error => { this.guardando.set(false); this.mensaje.set(error?.error?.message ?? 'No se pudo guardar el bloque.'); } });
  }
}
