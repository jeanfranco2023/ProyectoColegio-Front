import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, ViewEncapsulation } from '@angular/core';
import { AppAlertComponent } from '../../shared/ui/app-alert.component';
import { ListStateComponent } from '../../shared/ui/list-state.component';
import { UiDatePePipe } from '../../shared/ui/ui-date-pe.pipe';
import { Stage9Observation, Stage9ObservationDraft, Stage9State, Stage9StudentOption } from './stage9.contract';

@Component({
  selector: 'app-observaciones-faltas-screen',
  standalone: true,
  imports: [CommonModule, AppAlertComponent, ListStateComponent, UiDatePePipe],
  template: `
    <section class="ui-s9-screen" aria-labelledby="ui-s9-observations-title">
      <header class="ui-s9-heading"><p class="ui-s9-eyebrow">DOCENTE · TUTOR</p><h1 id="ui-s9-observations-title">Observaciones de faltas</h1><p class="ui-s9-muted">Registra y consulta observaciones vinculadas a la asistencia.</p></header>
      @if (formError) { <ui-app-alert tone="error" title="Revisa el formulario" [message]="formError" /> }
      @if (state === 'error') { <ui-app-alert tone="error" title="No se pudo cargar el listado" [message]="errorMessage" /><button class="ui-button ui-button--secondary ui-s9-retry" type="button" (click)="retry.emit()">Reintentar</button> }
      <form class="ui-s9-card ui-s9-form" (submit)="$event.preventDefault(); saveRequested.emit(draft)">
        <div class="ui-s9-card-heading"><div><p class="ui-s9-eyebrow">NUEVO REGISTRO</p><h2>Registrar observación</h2></div></div>
        <div class="ui-s9-form-grid">
          <label class="ui-s9-field">Estudiante *<select required [value]="draft.studentId ?? ''" (change)="updateDraft('studentId', +$any($event.target).value)"><option value="" disabled>Seleccionar estudiante</option>@for (student of students; track student.id) { <option [value]="student.id">{{ student.fullName }} · {{ student.gradeLabel }}</option> }</select></label>
          <label class="ui-s9-field">Fecha *<input required type="date" [value]="draft.date" (input)="updateDraft('date', $any($event.target).value)" /></label>
          <label class="ui-s9-field">Tipo *<select required [value]="draft.type" (change)="updateDraft('type', $any($event.target).value)"><option value="" disabled>Seleccionar tipo</option>@for (type of observationTypes; track type) { <option [value]="type">{{ type }}</option> }</select></label>
          <label class="ui-s9-field ui-s9-field--wide">Descripción *<textarea required rows="3" maxlength="1000" [value]="draft.description" (input)="updateDraft('description', $any($event.target).value)" placeholder="Describe la situación de forma objetiva"></textarea></label>
        </div>
        <div class="ui-s9-actions"><button class="ui-button ui-button--primary" type="submit">Guardar observación</button></div>
      </form>
      <section class="ui-s9-card" aria-labelledby="ui-s9-observation-list-title"><div class="ui-s9-card-heading"><div><p class="ui-s9-eyebrow">SEGUIMIENTO</p><h2 id="ui-s9-observation-list-title">Observaciones registradas</h2></div></div>
        @if (state === 'loading') { <ui-list-state state="loading" title="Cargando observaciones" /> }
        @else if (state === 'empty') { <ui-list-state state="empty" title="Sin observaciones" message="No hay observaciones para los filtros seleccionados." /> }
        @else if (state === 'normal') { <p class="ui-s9-scroll-hint">Desliza la tabla para ver todas las columnas.</p><div class="ui-s9-table-wrap"><table class="ui-s9-table ui-mobile-table-cards"><thead><tr><th>Fecha</th><th>Estudiante</th><th>Tipo</th><th>Descripción</th><th>Registró</th></tr></thead><tbody>@for (item of observations; track item.id) { <tr><td data-label="Fecha">{{ item.date | uiDatePe }}</td><td data-label="Estudiante">{{ item.studentName }}</td><td data-label="Tipo"><span class="ui-s9-kind">{{ item.type }}</span></td><td data-label="Descripción">{{ item.description }}</td><td data-label="Registró">{{ item.authorName }}</td></tr> }</tbody></table></div> }
      </section>
    </section>
  `,
encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ObservacionesFaltasComponent {
  @Input() state: Stage9State = 'empty';
  @Input() errorMessage = 'Intenta cargar el listado otra vez.';
  @Input() formError = '';
  @Input() students: Stage9StudentOption[] = [];
  @Input() observationTypes: string[] = ['Inasistencia', 'Tardanza', 'Retiro anticipado', 'Otro'];
  @Input() draft: Stage9ObservationDraft = { studentId: null, date: '', type: '', description: '' };
  @Input() observations: Stage9Observation[] = [];
  @Output() readonly draftChange = new EventEmitter<Stage9ObservationDraft>();
  @Output() readonly saveRequested = new EventEmitter<Stage9ObservationDraft>();
  @Output() readonly retry = new EventEmitter<void>();

  updateDraft<K extends keyof Stage9ObservationDraft>(key: K, value: Stage9ObservationDraft[K]): void {
    this.draftChange.emit({ ...this.draft, [key]: value });
  }
}
