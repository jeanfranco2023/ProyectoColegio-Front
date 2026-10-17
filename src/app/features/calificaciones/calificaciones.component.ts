import { Component, ElementRef, inject, signal, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EvaluacionService } from '../../core/services/evaluacion.service';
import { AcademicoService } from '../../core/services/academico.service';
import { AsignacionDocenteResponseDto, CompetenciaResponseDto, PeriodoResponseDto } from '../../core/models/academico.model';

type NotaCNEB = 'AD' | 'A' | 'B' | 'C' | '-';

export interface EvaluacionAlumno {
  matriculaId: number;
  numeroOrden: number;
  estudiante: string;
  c1: NotaCNEB;
  c2: NotaCNEB;
  c3: NotaCNEB;
  conclusionDescriptiva: string;
  requiereRefuerzo: boolean | null;
  competenciaId: number;
}

@Component({
  selector: 'app-calificaciones',
  standalone: true,
  imports: [CommonModule, FormsModule],
template: `
    <main class="grid min-w-0 gap-[22px] text-[#172b4d] max-[600px]:gap-4 max-[600px]:pb-1" aria-labelledby="calificaciones-title">
      <header class="flex items-end justify-between gap-6 border-t-[3px] border-[rgb(196_154_88_/_50%)] pt-3 max-[600px]:items-stretch max-[600px]:flex-col max-[600px]:gap-[14px]">
        <div class="min-w-0">
          <p class="m-0 mb-[6px] text-[#8b6425] text-[11px] font-extrabold tracking-[.14em] leading-[1.4] uppercase">Evaluación docente</p>
          <h1 id="calificaciones-title" class="m-0 text-[#172b4d] text-[clamp(24px,3vw,34px)] font-extrabold tracking-[-.035em] leading-[1.15]">Matriz de Calificaciones CNEB</h1>
          <p class="mt-2 max-w-[680px] text-[#56657c] text-sm leading-[1.6]">Registro y evaluación por competencias conectada con la base de datos oficial.</p>
        </div>

        <div class="flex flex-[0_0_auto] items-center justify-end gap-3 max-[600px]:items-stretch max-[600px]:flex-col">
          @if (guardadoExitoso()) {
            <span class="ui-alert ui-alert--success m-0 text-xs" role="status">
              <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>
              Calificaciones guardadas en BD
            </span>
          }
          <button type="button" (click)="guardarCalificaciones()" [disabled]="alumnos().length === 0 || !asignacionId || !competenciaId" class="ui-button ui-button--primary min-h-11 whitespace-nowrap max-[600px]:w-full max-[600px]:justify-center">
            <svg class="h-[17px] w-[17px] flex-[0_0_17px]" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
            <span>Guardar en BD</span>
          </button>
        </div>
      </header>

      @if (error()) {
        <div class="ui-alert ui-alert--error m-0 text-[13px]" role="alert">{{ error() }}</div>
      }

      <section class="grid min-w-0 grid-cols-[minmax(160px,.9fr)_minmax(240px,1.25fr)_minmax(310px,1.55fr)_minmax(150px,.8fr)] items-end gap-4 rounded-2xl border border-[#e1e8f1] bg-white !p-[18px] shadow-[0_5px_16px_rgb(23_43_77_/_5%)] max-[1399px]:grid-cols-2 max-[600px]:grid-cols-1 max-[600px]:gap-[13px] max-[600px]:!p-[15px]" aria-label="Filtros de calificaciones">
        <div class="ui-field min-w-0 m-0">
          <label class="ui-field__label" for="periodo-calificaciones">Periodo Académico</label>
          <select id="periodo-calificaciones" [(ngModel)]="periodoId" (change)="cargarCalificaciones()" [disabled]="!periodos().length" class="ui-field__control ui-select__control min-[601px]:!text-[13px]">
            @if (!periodos().length) { <option [ngValue]="0">Sin periodos disponibles</option> } @for (periodo of periodos(); track periodo.id) { <option [ngValue]="periodo.id">{{ periodo.nombre }}</option> }
          </select>
        </div>

        <div class="ui-field min-w-0 m-0">
          <label class="ui-field__label" for="asignacion-calificaciones">Asignación docente y sección</label>
          <select id="asignacion-calificaciones" [(ngModel)]="asignacionId" (change)="cambiarAsignacion()" [disabled]="!asignaciones().length" class="ui-field__control ui-select__control min-[601px]:!text-[13px]">
            @if (!asignaciones().length) { <option [ngValue]="0">Sin asignaciones disponibles</option> } @for (a of asignaciones(); track a.id) { <option [ngValue]="a.id">Sección {{ a.seccionId }} · Área {{ a.areaCurricularId }} · Asignación {{ a.id }}</option> }
          </select>
        </div>

        <div class="ui-field min-w-0 m-0">
          <label class="ui-field__label" for="competencia-calificaciones">Competencia</label>
          <select id="competencia-calificaciones" [(ngModel)]="competenciaId" (change)="cargarCalificaciones()" [disabled]="!competencias().length" class="ui-field__control ui-select__control min-[601px]:!text-[13px]">
            @if (!competencias().length) { <option [ngValue]="0">Sin competencias disponibles</option> } @for (c of competencias(); track c.id) { <option [ngValue]="c.id">{{ c.nombre }}</option> }
          </select>
        </div>

        <div class="min-w-0">
          <button type="button" (click)="cargarCalificaciones()" [disabled]="!asignacionId || !periodoId || !competenciaId" class="ui-button ui-button--secondary min-h-11 w-full">Consultar Registros</button>
        </div>
      </section>

      <section class="min-w-0 overflow-hidden rounded-2xl border border-[#e1e8f1] bg-white !p-0 shadow-[0_5px_16px_rgb(23_43_77_/_5%)]" aria-label="Matriz de calificaciones">
        <div class="flex min-h-16 items-center justify-between gap-[14px] border-b border-[#e5eaf2] px-[18px] py-[14px] max-[600px]:items-start max-[600px]:flex-col max-[600px]:px-[14px]">
          <div class="flex flex-wrap items-center gap-2 max-[600px]:gap-[6px]" aria-label="Escala CNEB">
            <span class="mr-1 text-[#34445d] text-xs font-extrabold tracking-[.06em] uppercase max-[600px]:mb-0.5 max-[600px]:w-full">Escala CNEB:</span>
            <span class="inline-flex min-h-[26px] items-center justify-center rounded-lg border border-[#a9c6ff] bg-[#eff5ff] px-[9px] py-[3px] text-xs font-extrabold leading-[1.3] text-[#184fae] whitespace-nowrap">AD</span>
            <span class="inline-flex min-h-[26px] items-center justify-center rounded-lg border border-[#9bd8bf] bg-[#edf9f3] px-[9px] py-[3px] text-xs font-extrabold leading-[1.3] text-[#126943] whitespace-nowrap">A</span>
            <span class="inline-flex min-h-[26px] items-center justify-center rounded-lg border border-[#edca83] bg-[#fff7e7] px-[9px] py-[3px] text-xs font-extrabold leading-[1.3] text-[#805300] whitespace-nowrap">B</span>
            <span class="inline-flex min-h-[26px] items-center justify-center rounded-lg border border-[#f2b7b0] bg-[#fff1ef] px-[9px] py-[3px] text-xs font-extrabold leading-[1.3] text-[#a43128] whitespace-nowrap">C</span>
          </div>
          <p class="m-0 text-[#59677a] text-xs">Total en matriz: <strong class="text-[#172b4d] text-[13px]">{{ alumnos().length }}</strong></p>
        </div>

        <p class="ui-grade-scroll-hint">Desliza horizontalmente para consultar Conclusión, Refuerzo y Acciones.</p>
        <div class="ui-table-wrap min-w-0 overflow-x-auto">
          <table class="ui-table ui-mobile-table-scroll min-w-[790px]">
            <thead>
              <tr>
                <th scope="col" class="w-16 text-center whitespace-nowrap">N°</th>
                <th scope="col" class="whitespace-nowrap">Estudiante / Matrícula</th>
                <th scope="col" class="whitespace-nowrap">Calificación</th>
                <th scope="col" class="whitespace-nowrap">Conclusión</th>
                <th scope="col" class="whitespace-nowrap">Refuerzo</th>
                <th scope="col" class="sticky right-0 z-[2] min-w-[88px] whitespace-nowrap bg-[#f6f8fb] shadow-[-8px_0_12px_rgb(23_43_77_/_8%)]">Acciones</th>
              </tr>
            </thead>
            <tbody>
              @if (cargando()) {
                <tr>
                  <td colspan="6">
                    <div class="grid min-h-[220px] content-center justify-items-center gap-2 p-6 text-center" role="status" aria-live="polite">
                      <span class="mb-1 h-[30px] w-[30px] rounded-full border-[3px] border-[#dbe6f5] border-t-[#2864c5] animate-[ui-grade-spin_.8s_linear_infinite]" aria-hidden="true"></span>
                      <span class="text-[#253a59] text-sm font-bold">Consultando calificaciones</span>
                      <span class="max-w-[48ch] text-[#59677a] text-xs leading-[1.5]">Espera mientras se carga la matriz.</span>
                    </div>
                  </td>
                </tr>
              } @else {
                @for (alumno of alumnos(); track alumno.matriculaId) {
                  <tr [ngClass]="alumno.c1 === '-' ? '[&>td]:bg-[#fffaf0] [&>td:first-child]:shadow-[inset_3px_0_#d4a239] [&>td:last-child]:bg-[#fffaf0]' : ''">
                    <td class="w-16 text-center text-[#64748b] tabular-nums" data-label="N°">{{ alumno.numeroOrden }}</td>
                    <td data-label="Estudiante / Matrícula"><span class="inline-flex min-h-8 items-center rounded-[9px] border border-[#dfe7f2] bg-[#f7f9fc] px-[9px] py-[5px] text-xs font-bold text-[#34445d] whitespace-nowrap">{{ alumno.estudiante }}</span></td>
                    <td class="text-center" data-label="Calificación">
                      @if (alumno.c1 === '-') {
                        <span class="inline-flex min-h-[26px] items-center justify-center rounded-lg border border-[#e9c979] bg-[#fff5d9] px-[9px] py-[3px] text-xs font-extrabold leading-[1.3] text-[#714c00] whitespace-nowrap">Sin calificar</span>
                      } @else {
                        <span class="inline-flex min-h-[26px] items-center justify-center rounded-lg border px-[9px] py-[3px] text-xs font-extrabold leading-[1.3] whitespace-nowrap" [ngClass]="{ 'border-[#a9c6ff] bg-[#eff5ff] text-[#184fae]': alumno.c1 === 'AD', 'border-[#9bd8bf] bg-[#edf9f3] text-[#126943]': alumno.c1 === 'A', 'border-[#edca83] bg-[#fff7e7] text-[#805300]': alumno.c1 === 'B', 'border-[#f2b7b0] bg-[#fff1ef] text-[#a43128]': alumno.c1 === 'C' }">{{ alumno.c1 }}</span>
                      }
                    </td>
                    <td class="max-w-[320px] overflow-hidden text-ellipsis whitespace-nowrap text-[#56657c]" [title]="alumno.conclusionDescriptiva || 'Sin conclusión'" data-label="Conclusión">{{ alumno.conclusionDescriptiva || 'Sin conclusión' }}</td>
                    <td data-label="Refuerzo">
                      @if (alumno.requiereRefuerzo === true) {
                        <span class="inline-flex min-h-[26px] items-center justify-center rounded-lg border border-[#f1c7bf] bg-[#fff1ee] px-[9px] py-[3px] text-xs font-[650] leading-[1.3] text-[#9d392f] whitespace-nowrap">CNEB C</span>
                      } @else if (alumno.requiereRefuerzo === false) {
                        <span class="inline-flex min-h-[26px] items-center justify-center rounded-lg border border-[#dce5f0] bg-[#f3f6fa] px-[9px] py-[3px] text-xs font-[650] leading-[1.3] text-[#4c5d74] whitespace-nowrap">Normal</span>
                      } @else {
                        <span class="inline-flex min-h-[26px] items-center justify-center rounded-lg border border-[#dce5f0] bg-[#f3f6fa] px-[9px] py-[3px] text-xs font-[650] leading-[1.3] text-[#4c5d74] whitespace-nowrap">Sin dato</span>
                      }
                    </td>
                    <td class="sticky right-0 z-[1] min-w-[88px] bg-white text-right shadow-[-8px_0_12px_rgb(23_43_77_/_8%)]" data-label="Acciones"><button type="button" (click)="abrirEdicion(alumno)" class="ui-button ui-button--secondary !px-3 !text-xs">Editar</button></td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="6">
                      <div class="grid min-h-[220px] content-center justify-items-center gap-2 p-6 text-center">
                        <span class="grid h-[42px] w-[42px] place-items-center rounded-[14px] bg-[#eff4fb] text-[#51719e] text-lg" aria-hidden="true">✓</span>
                        <span class="text-[#253a59] text-sm font-bold">No hay calificaciones para mostrar</span>
                        <span class="max-w-[48ch] text-[#59677a] text-xs leading-[1.5]">Selecciona un periodo y una asignación con matrículas para consultar la matriz.</span>
                      </div>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
      </section>

      <dialog #edicionDialog class="fixed inset-0 m-auto w-[min(620px,calc(100vw-24px))] max-w-[calc(100vw-24px)] max-h-[calc(100dvh-24px)] overflow-hidden rounded-[20px] border border-[#e1e8f1] bg-white p-0 text-[#172b4d] font-sans shadow-[0_24px_72px_rgb(15_31_57_/_24%)] backdrop:bg-[rgb(15_31_57_/_48%)] backdrop:backdrop-blur-[3px]" aria-labelledby="calificacion-dialog-title">
        <div class="flex min-h-0 max-h-[calc(100dvh-24px)] flex-col">
          <header class="flex flex-[0_0_auto] items-center justify-between gap-4 border-b border-[#e5eaf2] px-6 py-5 max-[600px]:px-4">
            <div><p class="m-0 mb-[6px] text-[#8b6425] text-[11px] font-extrabold tracking-[.14em] leading-[1.4] uppercase">Matriz CNEB</p><h2 id="calificacion-dialog-title" class="m-0 text-[#172b4d] text-xl font-extrabold">Editar evaluación</h2><p class="mt-[5px] mb-0 text-[#59677a] text-[13px]">{{ alumnoEditando()?.estudiante }}</p></div>
            <button type="button" class="grid h-[38px] w-[38px] flex-[0_0_38px] place-items-center rounded-[11px] border border-[#e0e6ef] bg-[#f7f9fc] text-[#4e6079] text-lg cursor-pointer" (click)="cerrarEdicion()" aria-label="Cerrar">✕</button>
          </header>
          <form (ngSubmit)="aplicarEdicion()" class="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div class="grid min-h-0 flex-1 gap-[18px] overflow-auto px-6 py-[22px] max-[600px]:px-4">
              <label class="ui-field m-0 gap-[7px]">
                <span class="ui-field__label">Calificación CNEB *</span>
                <select [(ngModel)]="notaEditada" name="nota" required class="ui-field__control ui-select__control !min-h-[46px] !text-sm max-[600px]:!text-base">
                  <option value="-" disabled>Seleccione</option>
                  <option value="AD">AD · Logro destacado</option>
                  <option value="A">A · Logro esperado</option>
                  <option value="B">B · En proceso</option>
                  <option value="C">C · En inicio</option>
                </select>
              </label>
              <label class="ui-field m-0 gap-[7px]">
                <span class="ui-field__label">Conclusión descriptiva</span>
                <textarea [(ngModel)]="conclusionEditada" name="conclusion" maxlength="4000" rows="5" placeholder="Describe los avances y aspectos por reforzar" class="ui-field__control !min-h-[130px] !text-sm max-[600px]:!text-base resize-y"></textarea>
              </label>
              @if (notaEditada === 'C') { <p class="m-0 -mt-[6px] rounded-[10px] border border-[#edd9aa] bg-[#fff8e9] px-3 py-[10px] text-[#76500a] text-xs leading-[1.5]">Esta calificación marcará al estudiante para refuerzo.</p> }
            </div>
            <footer class="sticky bottom-0 flex flex-[0_0_auto] justify-end gap-[10px] border-t border-[#e5eaf2] bg-white px-6 py-[14px] max-[600px]:flex-col-reverse max-[600px]:px-4 max-[600px]:py-3">
              <button type="button" class="ui-button ui-button--secondary max-[600px]:w-full" (click)="cerrarEdicion()">Cancelar</button>
              <button type="submit" [disabled]="notaEditada === '-'" class="ui-button ui-button--primary max-[600px]:w-full">Aplicar cambios</button>
            </footer>
          </form>
        </div>
      </dialog>
    </main>
  `
})
export class CalificacionesComponent implements OnInit {
  private readonly evaluacionService = inject(EvaluacionService);
  private readonly academicoService = inject(AcademicoService);
  @ViewChild('edicionDialog') private edicionDialog!: ElementRef<HTMLDialogElement>;
  readonly alumnoEditando = signal<EvaluacionAlumno | null>(null);
  notaEditada: NotaCNEB = '-';
  conclusionEditada = '';

  periodoId = 0;
  asignacionId = 0;
  competenciaId = 0;
  readonly asignaciones = signal<AsignacionDocenteResponseDto[]>([]);
  readonly competencias = signal<CompetenciaResponseDto[]>([]);
  readonly periodos = signal<PeriodoResponseDto[]>([]);
  readonly error = signal<string | null>(null);
  guardadoExitoso = signal(false);
  cargando = signal(false);

  readonly alumnos = signal<EvaluacionAlumno[]>([]);

  abrirEdicion(alumno: EvaluacionAlumno): void {
    this.alumnoEditando.set(alumno);
    this.notaEditada = alumno.c1;
    this.conclusionEditada = alumno.conclusionDescriptiva;
    this.edicionDialog.nativeElement.showModal();
  }

  cerrarEdicion(): void { this.edicionDialog.nativeElement.close(); this.alumnoEditando.set(null); }

  aplicarEdicion(): void {
    const seleccionado = this.alumnoEditando();
    if (!seleccionado || this.notaEditada === '-') return;
    this.alumnos.update(lista => lista.map(alumno => alumno.matriculaId === seleccionado.matriculaId
      ? { ...alumno, c1: this.notaEditada, conclusionDescriptiva: this.conclusionEditada.trim(), requiereRefuerzo: this.notaEditada === 'C' }
      : alumno));
    this.cerrarEdicion();
    this.guardadoExitoso.set(false);
  }

  ngOnInit(): void {
    this.academicoService.listarAsignaciones().subscribe({
      next: asignaciones => {
        this.asignaciones.set(asignaciones);
        this.asignacionId = asignaciones[0]?.id ?? 0;
        this.cambiarAsignacion();
      },
      error: () => this.error.set('No se pudieron consultar las asignaciones docentes.')
    });
  }

  cambiarAsignacion(): void {
    const asignacion = this.asignaciones().find(a => a.id === Number(this.asignacionId));
    if (!asignacion) return;
    this.periodoId = 0;
    this.competenciaId = 0;
    this.alumnos.set([]);
    this.error.set(null);
    this.academicoService.listarCompetencias(asignacion.areaCurricularId).subscribe({
      next: competencias => { this.competencias.set(competencias); this.competenciaId = competencias[0]?.id ?? 0; this.cargarCalificaciones(); },
      error: () => this.error.set('No se pudieron consultar las competencias.')
    });
    this.academicoService.listarPeriodos(asignacion.anioLectivoId).subscribe({
      next: periodos => { this.periodos.set(periodos); this.periodoId = periodos[0]?.id ?? 0; this.cargarCalificaciones(); },
      error: () => this.error.set('No se pudieron consultar los periodos.')
    });
  }

  cargarCalificaciones(): void {
    this.cargando.set(true);
    if (!this.asignacionId || !this.periodoId || !this.competenciaId) { this.cargando.set(false); return; }
    this.evaluacionService.listarMatriz(Number(this.asignacionId), Number(this.periodoId), Number(this.competenciaId)).subscribe({
      next: (res) => {
        this.cargando.set(false);
        if (Array.isArray(res)) {
          this.alumnos.set(
            res.map((c, idx) => ({
              matriculaId: c.matriculaId,
              numeroOrden: idx + 1,
              estudiante: `Matrícula #${c.matriculaId}`,
              c1: c.calificacionCualitativa ?? '-',
              c2: '-',
              c3: '-',
              conclusionDescriptiva: c.conclusionDescriptiva || '',
              requiereRefuerzo: c.requiereRefuerzo ?? null,
              competenciaId: c.competenciaId
            }))
          );
        } else {
          this.alumnos.set([]);
        }
      },
      error: (err) => {
        this.cargando.set(false);
        this.alumnos.set([]);
        this.error.set(err?.error?.message ?? 'No se pudo consultar la matriz de calificaciones.');
      }
    });
  }

  guardarCalificaciones(): void {
    if (this.alumnos().length === 0 || !this.asignacionId || !this.competenciaId || !this.periodoId) return;
    if (this.alumnos().some(a => a.c1 === '-')) { this.error.set('Seleccione una calificación para cada estudiante.'); return; }
    this.error.set(null);
    const payload = {
      asignacionDocenteId: Number(this.asignacionId),
      periodoAcademicoId: Number(this.periodoId),
      calificaciones: this.alumnos().map(a => ({
        matriculaId: a.matriculaId,
        competenciaId: a.competenciaId,
        calificacionCualitativa: a.c1 as 'AD' | 'A' | 'B' | 'C',
        conclusionDescriptiva: a.conclusionDescriptiva,
        sugerenciaIaUtilizada: false
      }))
    };

    this.evaluacionService.registrarCalificaciones(payload).subscribe({
      next: () => {
        this.guardadoExitoso.set(true);
        this.cargarCalificaciones();
        setTimeout(() => this.guardadoExitoso.set(false), 3000);
      },
      error: (err) => {
        this.guardadoExitoso.set(false);
        this.error.set(err?.error?.message ?? 'No se pudieron guardar las calificaciones.');
      }
    });
  }
}
