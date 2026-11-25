import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AsignacionHorarioOpcionDto, BloqueHorarioDto, DiaHorario, HorarioDto, HorarioService } from '../../core/services/horario.service';
import { AuthStore } from '../../core/state/auth.store';
import { AcademicoService } from '../../core/services/academico.service';
import { AnioLectivoResponseDto, GradoResponseDto, NivelResponseDto } from '../../core/models/academico.model';
import { forkJoin, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { AsignacionDocenteComponent } from './asignacion-docente.component';

interface GradoHorarioOpcion { clave: string; anioLectivoId: number; anio: number; nivel: string; nivelId: number; grado: string; gradoId: number; numeroGrado?: number; }

@Component({ selector: 'app-horarios', standalone: true, imports: [FormsModule, AsignacionDocenteComponent], template: `
  <main class="grid min-w-0 gap-5 text-[#172b4d]" aria-labelledby="horarios-title">
    <header class="flex flex-wrap items-end justify-between gap-4 border-t-[3px] border-[#c49a58]/50 pt-3">
      <div><p class="m-0 text-[11px] font-extrabold uppercase tracking-[.14em] text-[#8b6425]">Planificación académica</p><h1 id="horarios-title" class="m-0 text-2xl font-extrabold tracking-tight">Docentes, cursos y horarios</h1><p class="mt-1 text-sm text-slate-600">Asigna cada curso a un docente y programa sus bloques en vista semanal o agenda diaria adaptable en móvil.</p></div>
      @if (gestion()) { <span class="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800">Edición de Dirección</span> }
    </header>

    @if (gestion()) { <nav class="flex flex-wrap gap-2" aria-label="Vistas de planificación">
      <button type="button" class="min-h-10 rounded-lg px-4 text-sm font-semibold" [class.bg-blue-700]="vista() === 'asignaciones'" [class.text-white]="vista() === 'asignaciones'" [class.bg-slate-100]="vista() !== 'asignaciones'" (click)="mostrarVista('asignaciones')">Asignaciones docentes</button>
      <button type="button" class="min-h-10 rounded-lg px-4 text-sm font-semibold" [class.bg-blue-700]="vista() === 'malla'" [class.text-white]="vista() === 'malla'" [class.bg-slate-100]="vista() !== 'malla'" (click)="mostrarVista('malla')">Malla general por grado</button>
    </nav> }

    @if (!gestion() || vista() === 'asignaciones') { <app-asignacion-docente /> }

    @if (gestion() && vista() === 'malla') {

    <section class="grid gap-4 rounded-2xl border border-ui-divider bg-ui-surface-soft p-4 shadow-sm md:grid-cols-[minmax(190px,.75fr)_minmax(240px,1fr)_minmax(250px,1fr)_auto] md:items-end" aria-label="Filtros de malla horaria">
      <div class="grid gap-1">
        <label for="malla-nivel-select" class="text-xs font-semibold text-ui-muted">Nivel</label>
        <select id="malla-nivel-select" class="min-h-11 rounded-xl border border-ui-control-border bg-ui-surface px-3 text-sm text-ui-text focus:outline-none focus:border-ui-focus" [ngModel]="nivelSeleccionado()" name="nivel" (ngModelChange)="seleccionarNivel($event)"><option [ngValue]="0">Selecciona un nivel</option>@for (nivel of nivelesMalla(); track nivel.id) { <option [ngValue]="nivel.id">{{ nivel.nombre }}</option> }</select>
      </div>
      <div class="grid gap-1">
        <label for="malla-grado-select" class="text-xs font-semibold text-ui-muted">Grado</label>
        <select id="malla-grado-select" class="min-h-11 rounded-xl border border-ui-control-border bg-ui-surface px-3 text-sm text-ui-text focus:outline-none focus:border-ui-focus disabled:cursor-not-allowed disabled:bg-ui-surface-soft" [ngModel]="gradoSeleccionado()" name="grado" (ngModelChange)="seleccionarGradoId($event)" [disabled]="!nivelSeleccionado()"><option value="">Selecciona un grado</option>@for (grado of gradosDelNivel(); track grado.gradoId) { <option [value]="grado.gradoId">{{ grado.grado }}</option> }</select>
      </div>
      @if (gestion() && gradoActual()) {
        <div class="grid gap-1">
          <label for="malla-area-select" class="text-xs font-semibold text-ui-muted">Área del siguiente bloque</label>
          <select id="malla-area-select" class="min-h-11 rounded-xl border border-ui-control-border bg-ui-surface px-3 text-sm text-ui-text focus:outline-none focus:border-ui-focus" [(ngModel)]="areaSeleccionada" name="area"><option [ngValue]="0">Selecciona el área</option>@for (area of areasDelGrado(); track area.id) { <option [ngValue]="area.id">{{ area.nombre }}</option> }</select>
        </div>
      }
      <div class="flex flex-wrap items-center gap-2" role="group" aria-label="Modo de visualización de horario">
        <button type="button" (click)="modoHorario.set('semanal')" [class]="modoHorario() === 'semanal' ? 'bg-ui-action text-ui-surface font-semibold' : 'bg-ui-surface border border-ui-divider text-ui-text font-medium hover:bg-ui-surface-soft'" class="min-h-10 rounded-lg px-3.5 text-xs transition cursor-pointer">
          Horario semanal
        </button>
        <button type="button" (click)="modoHorario.set('agenda')" [class]="modoHorario() === 'agenda' ? 'bg-ui-action text-ui-surface font-semibold' : 'bg-ui-surface border border-ui-divider text-ui-text font-medium hover:bg-ui-surface-soft'" class="min-h-10 rounded-lg px-3.5 text-xs transition cursor-pointer">
          Agenda diaria (Móvil)
        </button>
      </div>
    </section>

    @if (horarioSeleccionado()) { <p class="m-0 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">Seleccionaste un bloque para moverlo o cambiar de área. Elige una celda libre; el cambio se aplica a todas las secciones del grado. <button class="ml-2 min-h-10 rounded-lg border border-blue-200 bg-white px-3 font-semibold" type="button" (click)="cancelarMovimiento()">Cancelar</button></p> }
    @if (mensaje()) { <p role="status" class="m-0 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">{{ mensaje() }}</p> }

    <!-- Vista Agenda Diaria Adaptable en Móvil (visible cuando modoHorario === 'agenda' o en pantallas pequeñas) -->
    <section [class]="modoHorario() === 'agenda' ? 'block rounded-2xl border border-[#e1e8f1] bg-white p-4 shadow-sm space-y-4' : 'block md:hidden rounded-2xl border border-[#e1e8f1] bg-white p-4 shadow-sm space-y-4'" aria-label="Agenda diaria adaptable en móvil">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <span class="text-[11px] font-bold uppercase tracking-wider text-blue-700 block">Agenda diaria</span>
          <h2 class="m-0 text-base font-bold text-slate-900">Bloques del día {{ diaAgendaActual().nombre }}</h2>
        </div>
        <div class="flex flex-wrap gap-1.5" role="tablist" aria-label="Seleccionar día de la semana">
          @for (dia of dias; track dia.numero) {
            <button
              type="button"
              (click)="diaAgendaMovil.set(dia.numero)"
              [class]="diaAgendaMovil() === dia.numero ? 'bg-blue-700 text-white font-bold' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold'"
              class="min-h-9 rounded-lg px-3 py-1.5 text-xs transition cursor-pointer"
            >
              {{ dia.nombre }}
            </button>
          }
        </div>
      </div>

      <div class="grid gap-2.5">
        @for (bloque of bloques(); track bloque.id) {
          <div class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
            <div>
              <span class="text-xs font-bold text-slate-600 block">{{ bloque.horaInicio.slice(0,5) }}–{{ bloque.horaFin.slice(0,5) }}</span>
              @if (bloque.esRecreo) {
                <span class="mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold" [class.bg-blue-100]="esAlmuerzo(bloque)" [class.text-blue-800]="esAlmuerzo(bloque)" [class.bg-amber-100]="!esAlmuerzo(bloque)" [class.text-amber-800]="!esAlmuerzo(bloque)">{{ nombreBloqueNoLectivo(bloque) }}</span>
              } @else if (celda(diaAgendaActual().numero, bloque.id); as horarioDia) {
                <strong class="mt-0.5 block text-sm text-slate-900">{{ nombreArea(horarioDia.areaCurricularId) }}</strong>
                <small class="text-xs text-slate-500">Aplica a todas las secciones del grado</small>
              } @else {
                <span class="text-xs text-slate-500">Bloque libre</span>
              }
            </div>
            @if (!bloque.esRecreo && gestion() && gradoActual()) {
              @if (celda(diaAgendaActual().numero, bloque.id); as horarioDia) {
                <div class="flex flex-wrap gap-1.5">
                  <button class="min-h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold hover:bg-slate-50" type="button" [disabled]="guardando()" (click)="seleccionarHorario(horarioDia)">Mover / editar</button>
                  <button class="min-h-9 rounded-lg border border-red-200 bg-white px-2.5 text-xs font-semibold text-red-700 hover:bg-red-50" type="button" [disabled]="guardando()" (click)="retirar(horarioDia.id)">Retirar</button>
                </div>
              } @else {
                <button class="min-h-9 rounded-lg border border-dashed border-blue-300 bg-white px-3 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50" type="button" [disabled]="guardando() || ocupado(diaAgendaActual().numero, bloque.id) || !areaSeleccionada" (click)="horarioSeleccionado() ? mover(diaAgendaActual().codigo, bloque.id) : programar(diaAgendaActual().codigo, bloque.id)">
                  {{ horarioSeleccionado() ? 'Mover aquí' : '+ Programar' }}
                </button>
              }
            }
          </div>
        } @empty {
          <p class="m-0 py-6 text-center text-sm text-slate-500">Selecciona un grado para consultar su agenda diaria.</p>
        }
      </div>
    </section>

    <!-- Vista Horario Semanal en Escritorio -->
    <section [class]="modoHorario() === 'agenda' ? 'hidden md:block overflow-hidden rounded-2xl border border-ui-divider bg-ui-surface shadow-sm' : 'overflow-hidden rounded-2xl border border-ui-divider bg-ui-surface shadow-sm'" aria-label="Horario semanal por grado">
      <div class="overflow-x-auto"><table class="w-full min-w-[760px] border-collapse text-left text-sm [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-ui-surface-soft/75">
        <thead class="bg-ui-surface-soft border-b border-ui-divider text-xs uppercase tracking-wide text-ui-action font-bold"><tr><th class="p-3">Bloque</th>@for (dia of dias; track dia.numero) { <th class="p-3">{{ dia.nombre }}</th> }</tr></thead>
        <tbody class="divide-y divide-ui-divider bg-ui-surface">
          @for (bloque of bloques(); track bloque.id) { <tr class="bg-ui-surface"><th class="whitespace-nowrap p-3 text-xs font-semibold text-ui-muted">{{ bloque.horaInicio.slice(0,5) }}–{{ bloque.horaFin.slice(0,5) }}</th>
            @for (dia of dias; track dia.numero) { <td class="min-w-28 p-3 align-top">
              @if (bloque.esRecreo) { <span class="rounded-full px-2 py-1 text-xs font-semibold" [class.bg-blue-50]="esAlmuerzo(bloque)" [class.text-blue-800]="esAlmuerzo(bloque)" [class.bg-amber-50]="!esAlmuerzo(bloque)" [class.text-amber-800]="!esAlmuerzo(bloque)">{{ nombreBloqueNoLectivo(bloque) }}</span> }
              @else if (celda(dia.numero, bloque.id); as horario) { <div class="grid gap-2"><span class="font-semibold text-slate-800">{{ nombreArea(horario.areaCurricularId) }}</span><small class="text-slate-500">Aplica a todas las secciones</small>@if (gestion()) { <div class="flex flex-wrap gap-1"><button class="min-h-9 rounded-lg border border-slate-200 px-2 text-xs font-semibold hover:bg-slate-50" type="button" [disabled]="guardando()" (click)="seleccionarHorario(horario)">Mover / editar</button><button class="min-h-9 rounded-lg border border-red-200 px-2 text-xs font-semibold text-red-700 hover:bg-red-50" type="button" [disabled]="guardando()" (click)="retirar(horario.id)">Retirar</button></div> }</div> }
              @else if (gestion() && gradoActual()) { <button class="min-h-10 w-full rounded-lg border border-dashed border-blue-200 px-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50" type="button" [disabled]="guardando() || ocupado(dia.numero, bloque.id) || (horarioSeleccionado() ? !areaSeleccionada : !areaSeleccionada)" (click)="horarioSeleccionado() ? mover(dia.codigo, bloque.id) : programar(dia.codigo, bloque.id)">{{ horarioSeleccionado() ? 'Mover aquí' : '+ Programar' }}</button> }
              @else { <span class="text-xs text-slate-400">Libre</span> }
            </td> }
          </tr> } @empty { <tr><td colspan="6" class="p-10 text-center text-sm text-slate-500">Selecciona un grado para consultar su horario.</td></tr> }
        </tbody>
      </table></div>
    </section>
    @if (!grados().length && !cargando()) { <p class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{{ gestion() ? 'No hay grados disponibles para construir la malla.' : 'No hay grados con asignaciones docentes disponibles para tu usuario.' }}</p> }
    @if (cargando()) { <p role="status" class="text-sm text-slate-500">Cargando malla del grado…</p> }
    }
  </main>` })
export class HorariosComponent implements OnInit {
  private readonly servicio = inject(HorarioService);
  private readonly store = inject(AuthStore);
  private readonly academicoService = inject(AcademicoService);
  readonly catalogo = signal<AsignacionHorarioOpcionDto[]>([]);
  readonly opcionesDireccion = signal<GradoHorarioOpcion[]>([]);
  readonly nivelesMalla = signal<NivelResponseDto[]>([]);
  readonly areasNivel = signal<Array<{ id: number; nombre: string }>>([]);
  readonly bloques = signal<BloqueHorarioDto[]>([]);
  readonly horarios = signal<HorarioDto[]>([]);
  readonly mensaje = signal('');
  readonly guardando = signal(false);
  readonly cargando = signal(false);
  readonly horarioSeleccionado = signal<HorarioDto | null>(null);
  readonly vista = signal<'asignaciones' | 'malla'>('asignaciones');
  readonly modoHorario = signal<'semanal' | 'agenda'>('semanal');
  readonly diaAgendaMovil = signal<number>(1);
  private mallaInicializada = false;
  readonly grados = computed(() => {
    if (this.gestion()) return this.opcionesDireccion();
    const opciones = new Map<string, GradoHorarioOpcion>();
    for (const item of this.catalogo()) {
      const clave = `${item.anioLectivoId}/${item.gradoId}`;
      opciones.set(clave, { clave, anioLectivoId: item.anioLectivoId, anio: item.anio, nivel: item.nivel, nivelId: item.nivelId, grado: item.grado, gradoId: item.gradoId });
    }
    return [...opciones.values()].sort((a, b) => b.anio - a.anio || a.nivel.localeCompare(b.nivel) || a.grado.localeCompare(b.grado));
  });
  readonly gradosDelNivel = computed(() => this.grados()
    .filter(grado => grado.nivelId === this.nivelSeleccionado())
    .sort((a, b) => (a.numeroGrado ?? 0) - (b.numeroGrado ?? 0) || a.grado.localeCompare(b.grado)));
  readonly gradoActual = computed(() => this.gestion()
    ? this.grados().find(g => g.nivelId === this.nivelSeleccionado() && String(g.gradoId) === this.gradoSeleccionado()) ?? null
    : this.grados().find(g => g.clave === this.gradoSeleccionado()) ?? null);
  readonly areasDelGrado = computed(() => {
    const grade = this.gradoActual();
    if (!grade) return [];
    if (this.gestion()) return this.areasNivel();
    const opciones = new Map<number, string>();
    for (const item of this.catalogo()) if (item.gradoId === grade.gradoId && item.anioLectivoId === grade.anioLectivoId) opciones.set(item.areaId, item.areaNombre);
    return [...opciones].map(([id, nombre]) => ({ id, nombre })).sort((a, b) => a.nombre.localeCompare(b.nombre));
  });
  readonly nivelSeleccionado = signal(0);
  readonly gradoSeleccionado = signal('');
  areaSeleccionada = 0;
  private revision = 0;
  readonly dias: Array<{ numero: number; nombre: string; codigo: DiaHorario }> = [
    { numero: 1, nombre: 'Lunes', codigo: 'LUNES' }, { numero: 2, nombre: 'Martes', codigo: 'MARTES' },
    { numero: 3, nombre: 'Miércoles', codigo: 'MIERCOLES' }, { numero: 4, nombre: 'Jueves', codigo: 'JUEVES' }, { numero: 5, nombre: 'Viernes', codigo: 'VIERNES' }
  ];
  readonly diaAgendaActual = computed(() => this.dias.find(d => d.numero === this.diaAgendaMovil()) ?? this.dias[0]);

  gestion(): boolean { return this.store.hasRole('DIRECCION') || this.store.hasRole('ADMINISTRADOR'); }
  ngOnInit(): void {
    if (this.gestion() && this.vista() === 'malla') this.cargarMallaDireccion();
  }

  mostrarVista(vista: 'asignaciones' | 'malla'): void {
    this.vista.set(vista);
    if (vista === 'malla' && !this.mallaInicializada) this.cargarMallaDireccion();
  }

  private cargarMallaDireccion(): void {
    this.mallaInicializada = true;
    this.cargando.set(true);
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
        this.nivelesMalla.set(niveles);
        const anioContexto = anios.find(anio => anio.abierto) ?? anios[0];
        this.opcionesDireccion.set(anioContexto
          ? this.crearOpcionesDireccion(anioContexto, niveles, gradosPorNivel)
          : []);
        const primerGrado = this.grados()[0];
        this.nivelSeleccionado.set(primerGrado?.nivelId ?? 0);
        this.gradoSeleccionado.set(primerGrado ? String(primerGrado.gradoId) : '');
        if (primerGrado) this.cargar();
        else {
          this.cargando.set(false);
          if (!anioContexto) this.mensaje.set('No hay un año lectivo disponible para cargar la malla.');
        }
      },
      error: error => { this.cargando.set(false); this.mensaje.set(error?.error?.message ?? 'No se pudieron cargar años, niveles y grados.'); }
    });
  }

  private crearOpcionesDireccion(anio: AnioLectivoResponseDto, niveles: NivelResponseDto[], gradosPorNivel: GradoResponseDto[][]): GradoHorarioOpcion[] {
    return niveles.flatMap((nivel, indice) => (gradosPorNivel[indice] ?? []).map(grado => ({
      clave: `${anio.id}/${grado.id}`, anioLectivoId: anio.id, anio: anio.anio,
      nivel: nivel.nombre, nivelId: nivel.id, grado: grado.nombre, gradoId: grado.id,
      numeroGrado: grado.numeroGrado
    }))).sort((a, b) => a.nivel.localeCompare(b.nivel) || (a.numeroGrado ?? 0) - (b.numeroGrado ?? 0));
  }

  seleccionarGrado(clave: string): void {
    const grado = this.grados().find(opcion => opcion.clave === clave);
    this.nivelSeleccionado.set(grado?.nivelId ?? 0);
    this.gradoSeleccionado.set(grado ? String(grado.gradoId) : '');
    this.cargar();
  }

  seleccionarNivel(nivel: number | string): void {
    this.nivelSeleccionado.set(Number(nivel) || 0);
    const primerGrado = this.gradosDelNivel()[0];
    this.gradoSeleccionado.set(primerGrado ? String(primerGrado.gradoId) : '');
    this.cargar();
  }

  seleccionarGradoId(gradoId: number | string): void {
    this.gradoSeleccionado.set(String(gradoId || ''));
    this.cargar();
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
  esAlmuerzo(bloque: BloqueHorarioDto): boolean {
    const minutos = (hora: string) => {
      const [horas, minutos] = hora.split(':').map(Number);
      return horas * 60 + minutos;
    };
    return bloque.esRecreo && minutos(bloque.horaFin) - minutos(bloque.horaInicio) >= 30;
  }
  nombreBloqueNoLectivo(bloque: BloqueHorarioDto): string { return this.esAlmuerzo(bloque) ? 'Almuerzo' : 'Recreo'; }
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
