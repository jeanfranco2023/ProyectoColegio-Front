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
  requiereRefuerzo: boolean;
  competenciaId: number;
}

@Component({
  selector: 'app-calificaciones',
  standalone: true,
  imports: [CommonModule, FormsModule],
template: `
    <main class="ui-grade-page" aria-labelledby="calificaciones-title">
      <header class="ui-grade-header">
        <div class="ui-grade-heading">
          <p class="ui-grade-eyebrow">Evaluación docente</p>
          <h1 id="calificaciones-title" class="ui-grade-title">Matriz de Calificaciones CNEB</h1>
          <p class="ui-grade-description">Registro y evaluación por competencias conectada con la base de datos oficial.</p>
        </div>

        <div class="ui-grade-actions">
          @if (guardadoExitoso()) {
            <span class="ui-alert ui-alert--success ui-grade-save-status" role="status">
              <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>
              Calificaciones guardadas en BD
            </span>
          }
          <button type="button" (click)="guardarCalificaciones()" [disabled]="alumnos().length === 0 || !asignacionId || !competenciaId" class="ui-button ui-button--primary ui-grade-save">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
            <span>Guardar en BD</span>
          </button>
        </div>
      </header>

      @if (error()) {
        <div class="ui-alert ui-alert--error ui-grade-error" role="alert">{{ error() }}</div>
      }

      <section class="ui-card ui-grade-filters" aria-label="Filtros de calificaciones">
        <div class="ui-field ui-grade-filter">
          <label class="ui-field__label" for="periodo-calificaciones">Periodo Académico</label>
          <select id="periodo-calificaciones" [(ngModel)]="periodoId" (change)="cargarCalificaciones()" [disabled]="!periodos().length" class="ui-field__control ui-select__control ui-grade-select">
            @if (!periodos().length) { <option [ngValue]="0">Sin periodos disponibles</option> } @for (periodo of periodos(); track periodo.id) { <option [ngValue]="periodo.id">{{ periodo.nombre }}</option> }
          </select>
        </div>

        <div class="ui-field ui-grade-filter">
          <label class="ui-field__label" for="asignacion-calificaciones">Asignación docente y sección</label>
          <select id="asignacion-calificaciones" [(ngModel)]="asignacionId" (change)="cambiarAsignacion()" [disabled]="!asignaciones().length" class="ui-field__control ui-select__control ui-grade-select">
            @if (!asignaciones().length) { <option [ngValue]="0">Sin asignaciones disponibles</option> } @for (a of asignaciones(); track a.id) { <option [ngValue]="a.id">Sección {{ a.seccionId }} · Área {{ a.areaCurricularId }} · Asignación {{ a.id }}</option> }
          </select>
        </div>

        <div class="ui-field ui-grade-filter">
          <label class="ui-field__label" for="competencia-calificaciones">Competencia</label>
          <select id="competencia-calificaciones" [(ngModel)]="competenciaId" (change)="cargarCalificaciones()" [disabled]="!competencias().length" class="ui-field__control ui-select__control ui-grade-select">
            @if (!competencias().length) { <option [ngValue]="0">Sin competencias disponibles</option> } @for (c of competencias(); track c.id) { <option [ngValue]="c.id">{{ c.nombre }}</option> }
          </select>
        </div>

        <div class="ui-grade-filter-action">
          <button type="button" (click)="cargarCalificaciones()" [disabled]="!asignacionId || !periodoId || !competenciaId" class="ui-button ui-button--secondary ui-grade-consult">Consultar Registros</button>
        </div>
      </section>

      <section class="ui-card ui-grade-matrix" aria-label="Matriz de calificaciones">
        <div class="ui-grade-matrix-toolbar">
          <div class="ui-grade-scale" aria-label="Escala CNEB">
            <span class="ui-grade-scale__title">Escala CNEB:</span>
            <span class="ui-grade-chip ui-grade-chip--ad">AD</span>
            <span class="ui-grade-chip ui-grade-chip--a">A</span>
            <span class="ui-grade-chip ui-grade-chip--b">B</span>
            <span class="ui-grade-chip ui-grade-chip--c">C</span>
          </div>
          <p class="ui-grade-total">Total en matriz: <strong>{{ alumnos().length }}</strong></p>
        </div>

        <p class="ui-grade-scroll-hint">Desliza horizontalmente para consultar Conclusión, Refuerzo y Acciones.</p>
        <div class="ui-table-wrap ui-grade-table-wrap">
          <table class="ui-table ui-grade-table ui-mobile-table-scroll">
            <thead>
              <tr>
                <th scope="col" class="ui-grade-number-column">N°</th>
                <th scope="col">Estudiante / Matrícula</th>
                <th scope="col">Calificación</th>
                <th scope="col">Conclusión</th>
                <th scope="col">Refuerzo</th>
                <th scope="col">Acciones</th>
              </tr>
            </thead>
            <tbody>
              @if (cargando()) {
                <tr>
                  <td colspan="6">
                    <div class="ui-list-state ui-grade-loading" role="status" aria-live="polite">
                      <span class="ui-grade-spinner" aria-hidden="true"></span>
                      <span class="ui-list-state__title">Consultando calificaciones</span>
                      <span class="ui-list-state__message">Espera mientras se carga la matriz.</span>
                    </div>
                  </td>
                </tr>
              } @else {
                @for (alumno of alumnos(); track alumno.matriculaId) {
                  <tr [class.ui-grade-row-incomplete]="alumno.c1 === '-'">
                    <td class="ui-grade-number" data-label="N°">{{ alumno.numeroOrden }}</td>
                    <td data-label="Estudiante / Matrícula"><span class="ui-grade-enrollment">{{ alumno.estudiante }}</span></td>
                    <td class="ui-grade-score-cell" data-label="Calificación">
                      @if (alumno.c1 === '-') {
                        <span class="ui-grade-value ui-grade-value--pending">Sin calificar</span>
                      } @else {
                        <span class="ui-grade-value" [class.ui-grade-chip--ad]="alumno.c1 === 'AD'" [class.ui-grade-chip--a]="alumno.c1 === 'A'" [class.ui-grade-chip--b]="alumno.c1 === 'B'" [class.ui-grade-chip--c]="alumno.c1 === 'C'">{{ alumno.c1 }}</span>
                      }
                    </td>
                    <td class="ui-grade-conclusion" [title]="alumno.conclusionDescriptiva || 'Sin conclusión'" data-label="Conclusión">{{ alumno.conclusionDescriptiva || 'Sin conclusión' }}</td>
                    <td data-label="Refuerzo">
                      @if (alumno.requiereRefuerzo) {
                        <span class="ui-grade-support ui-grade-support--needed">CNEB C</span>
                      } @else {
                        <span class="ui-grade-support">Normal</span>
                      }
                    </td>
                    <td class="ui-grade-row-action" data-label="Acciones"><button type="button" (click)="abrirEdicion(alumno)" class="ui-button ui-button--secondary ui-grade-edit">Editar</button></td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="6">
                      <div class="ui-list-state ui-grade-empty">
                        <span class="ui-list-state__icon" aria-hidden="true">✓</span>
                        <span class="ui-list-state__title">No hay calificaciones para mostrar</span>
                        <span class="ui-list-state__message">Selecciona un periodo y una asignación con matrículas para consultar la matriz.</span>
                      </div>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
      </section>

      <dialog #edicionDialog class="ui-grade-dialog" aria-labelledby="calificacion-dialog-title">
        <div class="ui-grade-dialog__shell">
          <header class="ui-grade-dialog__header">
            <div><p class="ui-grade-eyebrow">Matriz CNEB</p><h2 id="calificacion-dialog-title">Editar evaluación</h2><p>{{ alumnoEditando()?.estudiante }}</p></div>
            <button type="button" class="ui-grade-dialog__close" (click)="cerrarEdicion()" aria-label="Cerrar">✕</button>
          </header>
          <form (ngSubmit)="aplicarEdicion()" class="ui-grade-dialog__form">
            <div class="ui-grade-dialog__body">
              <label class="ui-field ui-grade-dialog__field">
                <span class="ui-field__label">Calificación CNEB *</span>
                <select [(ngModel)]="notaEditada" name="nota" required class="ui-field__control ui-select__control">
                  <option value="-" disabled>Seleccione</option>
                  <option value="AD">AD · Logro destacado</option>
                  <option value="A">A · Logro esperado</option>
                  <option value="B">B · En proceso</option>
                  <option value="C">C · En inicio</option>
                </select>
              </label>
              <label class="ui-field ui-grade-dialog__field">
                <span class="ui-field__label">Conclusión descriptiva</span>
                <textarea [(ngModel)]="conclusionEditada" name="conclusion" maxlength="4000" rows="5" placeholder="Describe los avances y aspectos por reforzar" class="ui-field__control"></textarea>
              </label>
              @if (notaEditada === 'C') { <p class="ui-grade-dialog__hint">Esta calificación marcará al estudiante para refuerzo.</p> }
            </div>
            <footer class="ui-grade-dialog__footer">
              <button type="button" class="ui-button ui-button--secondary" (click)="cerrarEdicion()">Cancelar</button>
              <button type="submit" [disabled]="notaEditada === '-'" class="ui-button ui-button--primary">Aplicar cambios</button>
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
              requiereRefuerzo: c.requiereRefuerzo ?? false,
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
