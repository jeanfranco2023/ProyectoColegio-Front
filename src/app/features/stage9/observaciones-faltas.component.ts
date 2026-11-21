import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, signal, ViewEncapsulation } from '@angular/core';
import { AppAlertComponent } from '../../shared/ui/app-alert.component';
import { FormsModule } from '@angular/forms';
import { ListStateComponent } from '../../shared/ui/list-state.component';
import { UiDatePePipe } from '../../shared/ui/ui-date-pe.pipe';
import { UiCalendarComponent } from '../../shared/ui/ui-calendar.component';
import { UiPaginacionComponent, paginarRegistros } from '../../shared/ui/ui-paginacion.component';
import { Stage9Observation, Stage9ObservationDraft, Stage9State, Stage9StudentOption } from './stage9.contract';

@Component({
  selector: 'app-observaciones-faltas-screen',
  standalone: true,
  imports: [CommonModule, FormsModule, AppAlertComponent, ListStateComponent, UiDatePePipe, UiCalendarComponent, UiPaginacionComponent],
  template: `
    <section class="mx-auto w-full max-w-[1360px] p-6 font-sans text-ui-text max-[700px]:px-[14px] max-[700px]:pt-4 max-[700px]:pb-6" aria-labelledby="ui-s9-observations-title">
      <header class="mb-[22px] border-t-[3px] border-t-ui-gold pt-3 [&_h1]:m-0 [&_h1]:mt-1 [&_h1]:mb-[6px] [&_h1]:font-display [&_h1]:text-[28px] [&_h1]:leading-[1.25] [&_h1]:font-bold [&_h1]:text-ui-text [&_p]:m-0 max-[700px]:mb-[18px] max-[700px]:[&_h1]:text-[23px] max-[700px]::text-[13px]">
        <p class="text-[11px] leading-[1.4] tracking-[.075em] font-bold text-ui-muted">REGISTRO ESCOLAR</p>
        <h1 id="ui-s9-observations-title" class="tracking-[-.025em]">Observaciones de faltas</h1>
        <p class="text-[13px] leading-[1.5] text-ui-muted">Consulta las observaciones registradas; solo los roles autorizados pueden registrar incidencias.</p>
      </header>

      @if (formError) { <ui-app-alert tone="error" title="Revisa el formulario" [message]="formError" /> }
      @if (state === 'error') {
        <ui-app-alert tone="error" title="No se pudo cargar el listado" [message]="errorMessage" />
        <button class="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-transparent px-4 py-2 text-center font-sans text-[14px] leading-[1.2] font-semibold no-underline transition-[background-color,border-color,color,box-shadow] duration-[140ms] [cursor:pointer] focus-visible:outline-3 focus-visible:outline-ui-focus focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:!border-ui-divider disabled:bg-ui-surface-soft disabled:text-ui-muted aria-disabled:cursor-not-allowed aria-disabled:!border-ui-divider aria-disabled:bg-ui-surface-soft aria-disabled:text-ui-muted !border-ui-divider bg-ui-surface text-ui-text hover:bg-ui-surface-soft mb-4 mt-2" type="button" (click)="retry.emit()">Reintentar</button>
      }

      @if (canCreate) {
      <form class="mb-[18px] min-w-0 rounded-2xl border border-ui-divider bg-ui-surface p-5 shadow-[var(--ui-card-shadow)] max-[700px]:rounded-xl max-[700px]:px-[14px] max-[700px]:py-4" (submit)="$event.preventDefault(); solicitarGuardado()">
        <div class="mb-4 flex items-start justify-between gap-3 [&_h2]:m-0 [&_h2]:mt-1 [&_h2]:font-display [&_h2]:text-lg [&_h2]:leading-[1.35] [&_h2]:font-semibold [&_h2]:text-ui-text [&_.text-\[11px\]]:m-0 max-[700px]:[&_h2]:text-[17px]">
          <div>
            <p class="text-[11px] leading-[1.4] tracking-[.075em] font-bold text-ui-muted">NUEVO REGISTRO</p>
            <h2 class="tracking-[-.025em]">Registrar observación</h2>
          </div>
        </div>
        <div class="mt-[15px] grid grid-cols-2 gap-[14px] max-[700px]:mt-[14px] max-[700px]:grid-cols-1 max-[700px]:gap-3">
          <div class="flex min-w-0 flex-col gap-[7px]">
            <label for="s9-obs-buscar-alumno" class="font-sans text-[13px] leading-[1.4] font-medium text-ui-muted">Buscar alumno (nombre o DNI)</label>
            <input id="s9-obs-buscar-alumno" type="search" [ngModel]="busquedaEstudiante()" (ngModelChange)="busquedaEstudiante.set($event)" name="busquedaEstudiante" placeholder="Filtra por nombre, apellido o sección" class="box-border min-h-[44px] w-full min-w-0 max-w-full rounded-lg border border-ui-control-border bg-ui-surface px-3 py-[10px] font-sans text-sm leading-[1.4] text-ui-text focus:border-ui-focus focus:outline-none focus:shadow-[0_0_0_3px_var(--ui-focus-shadow)] placeholder:text-ui-muted" />
          </div>

          <div class="flex min-w-0 flex-col gap-[7px]">
            <label for="s9-obs-estudiante" class="font-sans text-[13px] leading-[1.4] font-medium text-ui-muted">Estudiante *</label>
            <select id="s9-obs-estudiante" required [value]="draft.studentId ?? ''" (change)="updateDraft('studentId', +$any($event.target).value)" aria-describedby="s9-obs-estudiante-error" class="box-border min-h-[44px] w-full min-w-0 max-w-full rounded-lg border border-ui-control-border bg-ui-surface px-3 py-[10px] font-sans text-sm leading-[1.4] text-ui-text focus:border-ui-focus focus:outline-none focus:shadow-[0_0_0_3px_var(--ui-focus-shadow)]">
              <option value="" disabled>Seleccionar estudiante</option>
              @for (student of estudiantesFiltrados(); track student.id) {
                <option [value]="student.id">{{ student.fullName }} · {{ student.gradeLabel }}</option>
              }
            </select>
            @if (intentoEnvio() && !draft.studentId) {
              <span id="s9-obs-estudiante-error" class="text-xs font-semibold text-ui-error-text" role="alert">Selecciona un estudiante antes de guardar.</span>
            }
          </div>

          @if (estudianteSeleccionado(); as alumnoSel) {
            <div class="col-span-full flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50/80 px-3.5 py-2.5 text-xs text-emerald-950">
              <div>
                <span class="font-bold uppercase tracking-wider text-emerald-800 block text-[10px]">Confirmación de alumno seleccionado</span>
                <strong class="text-sm">{{ alumnoSel.fullName }}</strong>
              </div>
              <span class="rounded-lg border border-emerald-300 bg-white px-2.5 py-1 font-bold text-emerald-900">Grado y sección: {{ alumnoSel.gradeLabel }}</span>
            </div>
          }

          <div class="flex min-w-0 flex-col gap-[7px]">
            <label for="s9-obs-fecha" class="font-sans text-[13px] leading-[1.4] font-medium text-ui-muted">Fecha *</label>
            <app-ui-calendar id="s9-obs-fecha" [ngModel]="draft.date" (ngModelChange)="updateDraft('date', $event)" name="fecha" [required]="true" aria-label="Fecha de falta" aria-describedby="s9-obs-fecha-error"></app-ui-calendar>
            @if (intentoEnvio() && !draft.date) {
              <span id="s9-obs-fecha-error" class="text-xs font-semibold text-ui-error-text" role="alert">Indica la fecha de la observación.</span>
            }
          </div>

          <div class="flex min-w-0 flex-col gap-[7px]">
            <label for="s9-obs-tipo" class="font-sans text-[13px] leading-[1.4] font-medium text-ui-muted">Tipo *</label>
            <select id="s9-obs-tipo" required [value]="draft.type" (change)="updateDraft('type', $any($event.target).value)" aria-describedby="s9-obs-tipo-error" class="box-border min-h-[44px] w-full min-w-0 max-w-full rounded-lg border border-ui-control-border bg-ui-surface px-3 py-[10px] font-sans text-sm leading-[1.4] text-ui-text focus:border-ui-focus focus:outline-none focus:shadow-[0_0_0_3px_var(--ui-focus-shadow)]">
              <option value="" disabled>Seleccionar tipo</option>
              @for (type of observationTypes; track type) { <option [value]="type">{{ type }}</option> }
            </select>
            @if (intentoEnvio() && !draft.type) {
              <span id="s9-obs-tipo-error" class="text-xs font-semibold text-ui-error-text" role="alert">Selecciona el tipo de falta u observación.</span>
            }
          </div>

          <div class="flex min-w-0 flex-col gap-[7px] col-span-full max-[700px]:col-auto">
            <label for="s9-obs-descripcion" class="font-sans text-[13px] leading-[1.4] font-medium text-ui-muted">Descripción *</label>
            <textarea id="s9-obs-descripcion" required rows="3" maxlength="1000" [value]="draft.description" (input)="updateDraft('description', $any($event.target).value)" placeholder="Describe la situación de forma objetiva" aria-describedby="s9-obs-descripcion-error" class="box-border min-h-[100px] w-full min-w-0 max-w-full resize-y rounded-lg border border-ui-control-border bg-ui-surface px-3 py-[10px] font-sans text-sm leading-[1.4] text-ui-text focus:border-ui-focus focus:outline-none focus:shadow-[0_0_0_3px_var(--ui-focus-shadow)] placeholder:text-ui-muted"></textarea>
            @if (intentoEnvio() && !draft.description.trim()) {
              <span id="s9-obs-descripcion-error" class="text-xs font-semibold text-ui-error-text" role="alert">Ingresa una descripción objetiva del caso.</span>
            }
          </div>
        </div>
        <div class="mt-[18px] flex justify-end gap-[10px] max-[700px]:grid max-[700px]:grid-cols-1 [&>button]:text-sm [&>button]:leading-[1.2] max-[700px]:[&>button]:w-full">
          <button class="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-transparent px-4 py-2 text-center font-sans text-[14px] leading-[1.2] font-semibold no-underline transition-[background-color,border-color,color,box-shadow] duration-[140ms] [cursor:pointer] focus-visible:outline-3 focus-visible:outline-ui-focus focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:!border-ui-divider disabled:bg-ui-surface-soft disabled:text-ui-muted aria-disabled:cursor-not-allowed aria-disabled:!border-ui-divider aria-disabled:bg-ui-surface-soft aria-disabled:text-ui-muted bg-ui-action text-ui-action-text hover:opacity-90" type="submit">Guardar observación</button>
        </div>
      </form>
      } @else {
        <p class="mb-[18px] rounded-xl border border-ui-info-border bg-ui-info-bg px-4 py-3 text-sm font-medium text-ui-info-text" role="status">El backend permite registrar incidencias únicamente al rol Tutor. Esta vista está en modo consulta.</p>
      }

      <!-- Filtros del listado con contador de casos -->
      <section class="mb-4 rounded-2xl border border-ui-divider bg-ui-surface p-4 shadow-xs" aria-label="Filtros de observaciones">
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div>
            <label for="s9-filtro-busqueda" class="block text-xs font-semibold text-ui-muted mb-1">Buscar alumno o descripción</label>
            <input id="s9-filtro-busqueda" type="search" [ngModel]="filtroBusqueda()" (ngModelChange)="filtroBusqueda.set($event)" placeholder="Nombre o detalle" class="min-h-11 w-full rounded-lg border border-ui-control-border bg-ui-surface px-3 text-sm text-ui-text" />
          </div>
          <div>
            <label for="s9-filtro-seccion" class="block text-xs font-semibold text-ui-muted mb-1">Sección / Grado</label>
            <select id="s9-filtro-seccion" [ngModel]="filtroSeccion()" (ngModelChange)="filtroSeccion.set($event)" class="min-h-11 w-full rounded-lg border border-ui-control-border bg-ui-surface px-3 text-sm text-ui-text">
              <option value="TODAS">Todas las secciones</option>
              @for (sec of seccionesDisponibles(); track sec) {
                <option [value]="sec">{{ sec }}</option>
              }
            </select>
          </div>
          <div>
            <label for="s9-filtro-tipo" class="block text-xs font-semibold text-ui-muted mb-1">Tipo / Estado</label>
            <select id="s9-filtro-tipo" [ngModel]="filtroTipo()" (ngModelChange)="filtroTipo.set($event)" class="min-h-11 w-full rounded-lg border border-ui-control-border bg-ui-surface px-3 text-sm text-ui-text">
              <option value="TODOS">Todos los tipos</option>
              @for (type of observationTypes; track type) {
                <option [value]="type">{{ type }}</option>
              }
            </select>
          </div>
          <div>
            <label for="s9-filtro-citacion" class="block text-xs font-semibold text-ui-muted mb-1">Citación</label>
            <select id="s9-filtro-citacion" [ngModel]="filtroCitacion()" (ngModelChange)="filtroCitacion.set($event)" class="min-h-11 w-full rounded-lg border border-ui-control-border bg-ui-surface px-3 text-sm text-ui-text">
              <option value="TODAS">Todas</option>
              <option value="REQUIERE">Requiere seguimiento</option>
              <option value="REGISTRADA">Informativa</option>
            </select>
          </div>
        </div>
        <div class="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-ui-divider pt-2.5 text-xs text-ui-muted">
          <span>Mostrando <strong class="text-ui-text">{{ observationsFiltradas().length }}</strong> de <strong class="text-ui-text">{{ observations.length }}</strong> casos registrados</span>
          @if (filtroBusqueda() || filtroSeccion() !== 'TODAS' || filtroTipo() !== 'TODOS' || filtroCitacion() !== 'TODAS') {
            <button type="button" (click)="limpiarFiltros()" class="text-xs font-semibold text-ui-action hover:underline cursor-pointer">Limpiar filtros</button>
          }
        </div>
      </section>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <section [class]="observacionSeleccionada() ? 'lg:col-span-7 mb-[18px] min-w-0 rounded-2xl border border-ui-divider bg-ui-surface p-5 shadow-[var(--ui-card-shadow)] max-[700px]:rounded-xl max-[700px]:px-[14px] max-[700px]:py-4' : 'lg:col-span-12 mb-[18px] min-w-0 rounded-2xl border border-ui-divider bg-ui-surface p-5 shadow-[var(--ui-card-shadow)] max-[700px]:rounded-xl max-[700px]:px-[14px] max-[700px]:py-4'" aria-labelledby="ui-s9-observation-list-title">
          <div class="mb-4 flex items-start justify-between gap-3 [&_h2]:m-0 [&_h2]:mt-1 [&_h2]:font-display [&_h2]:text-lg [&_h2]:leading-[1.35] [&_h2]:font-semibold [&_h2]:text-ui-text [&_.text-\[11px\]]:m-0 max-[700px]:[&_h2]:text-[17px]">
            <div>
              <p class="text-[11px] leading-[1.4] tracking-[.075em] font-bold text-ui-muted">SEGUIMIENTO</p>
              <h2 id="ui-s9-observation-list-title" class="tracking-[-.025em]">Observaciones registradas</h2>
            </div>
          </div>
          @if (state === 'loading') { <ui-list-state state="loading" title="Cargando observaciones" /> }
          @else if (state === 'empty' || observationsFiltradas().length === 0) { <ui-list-state state="empty" title="Sin observaciones" message="No hay observaciones para los filtros seleccionados." /> }
          @else if (state === 'normal') {
            <div class="w-full overflow-x-auto overscroll-x-contain">
              <table class="w-full min-w-[620px] border-collapse text-left text-[13px] [&_th]:border-b [&_th]:border-ui-divider [&_th]:px-[10px] [&_th]:py-[11px] [&_th]:text-[11px] [&_th]:tracking-[.06em] [&_th]:text-ui-muted [&_th]:uppercase [&_td]:border-b [&_td]:border-ui-divider [&_td]:px-[10px] [&_td]:py-[13px] [&_td]:align-middle [&_td]:text-ui-text [&_tbody_tr:last-child_td]:border-b-0 [&_small]:mt-1 [&_small]:block [&_small]:text-xs [&_small]:text-ui-muted [&_thead]:!bg-ui-surface-soft [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:!bg-ui-surface-soft" data-mobile-table-cards="">
                <thead>
                  <tr>
                    <th>Estudiante</th>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Estado</th>
                    <th>Descripción</th>
                    <th>Registró</th>
                    <th class="text-right">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of observationsPaginadas(); track item.id) {
                    <tr [class.bg-ui-surface-soft]="observacionSeleccionada()?.id === item.id">
                      <td data-label="Estudiante" class="font-semibold">{{ item.studentName }}</td>
                      <td data-label="Fecha">{{ item.date | uiDatePe }}</td>
                      <td data-label="Tipo"><span class="inline-flex rounded-full bg-ui-surface-soft px-2 py-[6px] text-[11px] font-semibold text-ui-muted">{{ item.type }}</span></td>
                      <td data-label="Estado"><span class="inline-flex rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">Registrada</span></td>
                      <td data-label="Descripción">{{ item.description }}</td>
                      <td data-label="Registró">{{ item.authorName }}</td>
                      <td data-label="Acción" class="text-right">
                        <button type="button" (click)="verDetalle(item)" class="min-h-9 rounded-lg border border-ui-divider bg-ui-surface px-3 py-1.5 text-xs font-semibold text-ui-action hover:bg-ui-surface-soft cursor-pointer">
                          Ver detalle
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <ui-paginacion
              [totalRegistros]="observationsFiltradas().length"
              [paginaActual]="paginaObservaciones()"
              [tamanoPagina]="10"
              etiqueta="observaciones"
              ariaLabel="Paginación de observaciones registradas"
              (cambioPagina)="paginaObservaciones.set($event)"
            />
          }
        </section>

        @if (observacionSeleccionada(); as sel) {
          <aside class="lg:col-span-5 rounded-2xl border border-ui-divider bg-ui-surface p-5 shadow-[var(--ui-card-shadow)] space-y-4" aria-label="Ficha de detalle de la observación">
            <div class="flex items-start justify-between gap-3 border-b border-ui-divider pb-3">
              <div>
                <p class="m-0 text-[11px] font-bold uppercase tracking-wider text-ui-muted">Ficha del caso #{{ sel.id }}</p>
                <h3 class="m-0 mt-1 text-base font-bold text-ui-text">{{ sel.studentName }}</h3>
                <p class="m-0 mt-0.5 text-xs text-ui-muted">Fecha: {{ sel.date | uiDatePe }} · Tipo: {{ sel.type }}</p>
              </div>
              <button type="button" (click)="cerrarDetalle()" class="min-h-9 rounded-lg border border-ui-divider bg-ui-surface-soft px-3 py-1.5 text-xs font-semibold text-ui-text cursor-pointer" aria-label="Cerrar detalle">
                Cerrar
              </button>
            </div>

            <div class="rounded-xl border border-ui-divider bg-ui-surface-soft p-3.5 space-y-1.5">
              <span class="text-[11px] font-bold uppercase tracking-wider text-ui-muted block">Detalle formativo</span>
              <p class="m-0 text-sm leading-relaxed text-ui-text">{{ sel.description }}</p>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div class="rounded-xl border border-ui-divider p-3">
                <span class="text-[10px] font-bold uppercase tracking-wider text-ui-muted block">Estado de citación</span>
                <strong class="mt-1 block text-ui-text">{{ sel.type === 'Inasistencia' || sel.type === 'Retiro anticipado' ? 'Seguimiento con apoderado recomendado' : 'Registro formativo en aula' }}</strong>
              </div>
              <div class="rounded-xl border border-ui-divider p-3">
                <span class="text-[10px] font-bold uppercase tracking-wider text-ui-muted block">Próxima acción</span>
                <strong class="mt-1 block text-ui-text">{{ sel.type === 'Inasistencia' ? 'Verificar justificación documentada' : 'Monitorear puntualidad y convivencia' }}</strong>
              </div>
            </div>

            <div class="rounded-xl border border-ui-divider p-3.5 space-y-2 text-xs">
              <span class="text-[10px] font-bold uppercase tracking-wider text-ui-muted block">Historial del caso</span>
              <ul class="m-0 pl-4 space-y-1 text-ui-text">
                <li><strong>{{ sel.date | uiDatePe }}</strong> — Observación registrada por {{ sel.authorName }}.</li>
                <li>Estado actual: Activa en expediente formativo de tutoría.</li>
              </ul>
            </div>
          </aside>
        }
      </div>
    </section>
  `,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ObservacionesFaltasComponent {
  @Input() state: Stage9State = 'empty';
  @Input() errorMessage = 'Intenta cargar el listado otra vez.';
  @Input() formError = '';
  @Input() canCreate = false;
  @Input() students: Stage9StudentOption[] = [];
  @Input() observationTypes: string[] = ['Inasistencia', 'Tardanza', 'Retiro anticipado', 'Otro'];
  @Input() draft: Stage9ObservationDraft = { studentId: null, date: '', type: '', description: '' };
  @Input() observations: Stage9Observation[] = [];
  @Output() readonly draftChange = new EventEmitter<Stage9ObservationDraft>();
  @Output() readonly saveRequested = new EventEmitter<Stage9ObservationDraft>();
  @Output() readonly retry = new EventEmitter<void>();

  readonly busquedaEstudiante = signal('');
  readonly filtroBusqueda = signal('');
  readonly filtroSeccion = signal('TODAS');
  readonly filtroTipo = signal('TODOS');
  readonly filtroCitacion = signal('TODAS');
  readonly observacionSeleccionada = signal<Stage9Observation | null>(null);
  readonly paginaObservaciones = signal<number>(1);
  readonly intentoEnvio = signal(false);

  estudiantesFiltrados(): Stage9StudentOption[] {
    const q = this.busquedaEstudiante().trim().toLocaleLowerCase('es');
    if (!q) return this.students;
    return this.students.filter(s => `${s.fullName} ${s.gradeLabel}`.toLocaleLowerCase('es').includes(q));
  }

  estudianteSeleccionado(): Stage9StudentOption | null {
    if (!this.draft.studentId) return null;
    return this.students.find(s => s.id === this.draft.studentId) ?? null;
  }

  seccionesDisponibles(): string[] {
    return Array.from(new Set(this.students.map(s => s.gradeLabel).filter(Boolean)));
  }

  observationsFiltradas(): Stage9Observation[] {
    const q = this.filtroBusqueda().trim().toLocaleLowerCase('es');
    const sec = this.filtroSeccion();
    const tipo = this.filtroTipo();
    const cit = this.filtroCitacion();
    const nombresPorSeccion = sec === 'TODAS'
      ? null
      : new Set(this.students.filter(s => s.gradeLabel === sec).map(s => s.fullName));

    return this.observations.filter(item => {
      if (q && !`${item.studentName} ${item.description} ${item.type}`.toLocaleLowerCase('es').includes(q)) return false;
      if (nombresPorSeccion && !nombresPorSeccion.has(item.studentName)) return false;
      if (tipo !== 'TODOS' && item.type !== tipo) return false;
      if (cit === 'REQUIERE' && item.type !== 'Inasistencia' && item.type !== 'Retiro anticipado') return false;
      if (cit === 'REGISTRADA' && (item.type === 'Inasistencia' || item.type === 'Retiro anticipado')) return false;
      return true;
    });
  }

  observationsPaginadas(): Stage9Observation[] {
    return paginarRegistros(this.observationsFiltradas(), this.paginaObservaciones(), 10);
  }

  limpiarFiltros(): void {
    this.paginaObservaciones.set(1);
    this.filtroBusqueda.set('');
    this.filtroSeccion.set('TODAS');
    this.filtroTipo.set('TODOS');
    this.filtroCitacion.set('TODAS');
  }

  verDetalle(item: Stage9Observation): void {
    this.observacionSeleccionada.set(item);
  }

  cerrarDetalle(): void {
    this.observacionSeleccionada.set(null);
  }

  solicitarGuardado(): void {
    this.intentoEnvio.set(true);
    this.saveRequested.emit(this.draft);
  }

  updateDraft<K extends keyof Stage9ObservationDraft>(key: K, value: Stage9ObservationDraft[K]): void {
    this.draftChange.emit({ ...this.draft, [key]: value });
  }
}
