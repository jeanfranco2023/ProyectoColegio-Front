import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, ViewEncapsulation } from '@angular/core';
import { AppAlertComponent } from '../../shared/ui/app-alert.component';
import { ListStateComponent } from '../../shared/ui/list-state.component';
import { StatusBadgeComponent } from '../../shared/ui/status-badge.component';
import { UiDatePePipe } from '../../shared/ui/ui-date-pe.pipe';
import { Stage9PeriodOption, Stage9State, Stage9TutorFilters, Stage9TutorStudent } from './stage9.contract';

@Component({
  selector: 'app-seguimiento-tutoria-screen',
  standalone: true,
  imports: [CommonModule, AppAlertComponent, ListStateComponent, StatusBadgeComponent, UiDatePePipe],
  template: `
    <section class="ui-s9-screen" aria-labelledby="ui-s9-tutor-title">
      <header class="ui-s9-heading"><p class="ui-s9-eyebrow">TUTOR</p><h1 id="ui-s9-tutor-title">Seguimiento de tutoría</h1><p class="ui-s9-muted">Consulta la asistencia, incidencias y observaciones de tus estudiantes.</p></header>
      @if (state === 'error') { <ui-app-alert tone="error" title="No se pudo cargar el seguimiento" [message]="errorMessage" /><button class="ui-button ui-button--secondary ui-s9-retry" type="button" (click)="retry.emit()">Reintentar</button> }
      <div class="ui-s9-toolbar ui-s9-toolbar--tutor"><label class="ui-s9-field">Sección<select [value]="filters.sectionId ?? ''" (change)="updateFilter('sectionId', +$any($event.target).value)">@for (section of sections; track section.id) { <option [value]="section.id">{{ section.label }}</option> }</select></label><label class="ui-s9-field">Periodo<select [value]="filters.periodId ?? ''" (change)="updateFilter('periodId', +$any($event.target).value)">@for (period of periods; track period.id) { <option [value]="period.id">{{ period.label }}</option> }</select></label><label class="ui-s9-field">Buscar estudiante<input type="search" [value]="filters.search" (input)="updateFilter('search', $any($event.target).value)" placeholder="Nombre o matrícula" /></label></div>
      <div class="ui-s9-summary"><article><span>Estudiantes</span><strong>{{ studentCount }}</strong></article><article><span>Asistencia</span><strong>{{ attendanceSummary }}</strong></article><article><span>Incidencias</span><strong>{{ incidentCount }}</strong></article><article><span>Observaciones</span><strong>{{ observationCount }}</strong></article></div>
      <section class="ui-s9-card" aria-labelledby="ui-s9-tutor-list-title"><div class="ui-s9-card-heading"><div><p class="ui-s9-eyebrow">ESTUDIANTES ASIGNADOS</p><h2 id="ui-s9-tutor-list-title">Mi sección</h2></div></div>
        @if (state === 'loading') { <ui-list-state state="loading" title="Cargando estudiantes" /> }
        @else if (state === 'empty') { <ui-list-state state="empty" title="Sin estudiantes asignados" message="No hay estudiantes asignados a esta sección." /> }
        @else if (state === 'normal') { <p class="ui-s9-scroll-hint">Desliza la tabla para ver todas las columnas.</p><div class="ui-s9-table-wrap"><table class="ui-s9-table ui-mobile-table-cards"><thead><tr><th>Estudiante</th><th>Asistencia</th><th>Incidencias</th><th>Observaciones</th><th>Última actividad</th><th></th></tr></thead><tbody>@for (student of students; track student.id) { <tr><td data-label="Estudiante">{{ student.fullName }}</td><td data-label="Asistencia"><ui-status-badge [label]="student.attendanceSummary" [tone]="student.attendanceSummary.includes('falta') ? 'warning' : 'success'" /></td><td data-label="Incidencias">{{ student.incidentsSummary }}</td><td data-label="Observaciones">{{ student.observationsCount }}</td><td data-label="Última actividad">{{ student.lastActivity | uiDatePe }}</td><td data-label="Acción"><button class="ui-button ui-button--secondary ui-button--small" type="button" (click)="studentRequested.emit(student.id)">Ver</button></td></tr> }</tbody></table></div> }
      </section>
    </section>
  `,
encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SeguimientoTutoriaComponent {
  @Input() state: Stage9State = 'empty';
  @Input() errorMessage = 'Intenta cargar el seguimiento otra vez.';
  @Input() filters: Stage9TutorFilters = { sectionId: null, periodId: null, search: '' };
  @Input() sections: Array<{ id: number; label: string }> = [];
  @Input() periods: Stage9PeriodOption[] = [];
  @Input() students: Stage9TutorStudent[] = [];
  @Input() studentCount = 0;
  @Input() attendanceSummary = '—';
  @Input() incidentCount = 0;
  @Input() observationCount = 0;
  @Output() readonly filtersChanged = new EventEmitter<Stage9TutorFilters>();
  @Output() readonly studentRequested = new EventEmitter<number>();
  @Output() readonly retry = new EventEmitter<void>();

  updateFilter<K extends keyof Stage9TutorFilters>(key: K, value: Stage9TutorFilters[K]): void {
    this.filtersChanged.emit({ ...this.filters, [key]: value });
  }
}
