import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, ViewEncapsulation } from '@angular/core';
import { AppAlertComponent } from '../../shared/ui/app-alert.component';
import { ListStateComponent } from '../../shared/ui/list-state.component';
import { StatusBadgeComponent } from '../../shared/ui/status-badge.component';
import { UiDatePePipe } from '../../shared/ui/ui-date-pe.pipe';
import { Stage9State, Stage9StudentOption, Stage9SubstituteDraft, Stage9SubstituteRequest } from './stage9.contract';

@Component({
  selector: 'app-suplente-apoderado-screen',
  standalone: true,
  imports: [CommonModule, AppAlertComponent, ListStateComponent, StatusBadgeComponent, UiDatePePipe],
  template: `
    <section class="ui-s9-screen" aria-labelledby="ui-s9-substitute-title">
      <header class="ui-s9-heading"><p class="ui-s9-eyebrow">APODERADO</p><h1 id="ui-s9-substitute-title">Suplente del apoderado</h1><p class="ui-s9-muted">Designa a una persona de confianza durante un periodo temporal.</p></header>
      @if (formError) { <ui-app-alert tone="error" title="Revisa la solicitud" [message]="formError" /> }
      @if (state === 'error') { <ui-app-alert tone="error" title="No se pudo cargar Mis solicitudes" [message]="errorMessage" /><button class="ui-button ui-button--secondary ui-s9-retry" type="button" (click)="retry.emit()">Reintentar</button> }
      <form class="ui-s9-card ui-s9-form" (submit)="$event.preventDefault(); submitRequested.emit(draft)">
        <div class="ui-s9-card-heading"><div><p class="ui-s9-eyebrow">AUTORIZACIÓN TEMPORAL</p><h2>Datos del suplente</h2></div></div>
        <label class="ui-s9-field">Hijo *<select required [value]="draft.studentId ?? ''" (change)="updateDraft('studentId', +$any($event.target).value)"><option value="" disabled>Seleccionar hijo</option>@for (student of children; track student.id) { <option [value]="student.id">{{ student.fullName }} · {{ student.gradeLabel }}</option> }</select></label>
        <div class="ui-s9-form-grid">
          <label class="ui-s9-field">Nombre completo *<input required autocomplete="name" [value]="draft.fullName" (input)="updateDraft('fullName', $any($event.target).value)" /></label>
          <label class="ui-s9-field">DNI *<input required inputmode="numeric" maxlength="8" [value]="draft.dni" (input)="updateDraft('dni', $any($event.target).value)" /></label>
          <label class="ui-s9-field">Parentesco *<input required [value]="draft.relationship" (input)="updateDraft('relationship', $any($event.target).value)" /></label>
          <label class="ui-s9-field">Teléfono *<input required type="tel" autocomplete="tel" [value]="draft.phone" (input)="updateDraft('phone', $any($event.target).value)" /></label>
          <label class="ui-s9-field">Fecha de inicio *<input required type="date" [value]="draft.startDate" (input)="updateDraft('startDate', $any($event.target).value)" /></label>
          <label class="ui-s9-field">Fecha de fin *<input required type="date" [value]="draft.endDate" (input)="updateDraft('endDate', $any($event.target).value)" /></label>
        </div>
        <p class="ui-s9-helper">La solicitud debe ser aprobada por Dirección antes de entrar en vigor.</p>
        <div class="ui-s9-actions"><button class="ui-button ui-button--primary" type="submit">Enviar solicitud</button></div>
      </form>
      <section class="ui-s9-card" aria-labelledby="ui-s9-substitute-list-title"><div class="ui-s9-card-heading"><div><p class="ui-s9-eyebrow">MIS SOLICITUDES</p><h2 id="ui-s9-substitute-list-title">Suplencias registradas</h2></div></div>
        @if (state === 'loading') { <ui-list-state state="loading" title="Cargando solicitudes" /> }
        @else if (state === 'empty') { <ui-list-state state="empty" title="Aún no tienes solicitudes" message="Las solicitudes que registres aparecerán aquí." /> }
        @else if (state === 'normal') { <p class="ui-s9-scroll-hint">Desliza la tabla para ver todas las columnas.</p><div class="ui-s9-table-wrap"><table class="ui-s9-table ui-mobile-table-cards"><thead><tr><th>Hijo</th><th>Suplente</th><th>DNI</th><th>Vigencia</th><th>Estado</th><th>Detalle</th></tr></thead><tbody>@for (request of requests; track request.id) { <tr><td data-label="Hijo">{{ request.studentName }}</td><td data-label="Suplente">{{ request.fullName }}</td><td data-label="DNI">{{ request.dni }}</td><td data-label="Vigencia">{{ request.startDate | uiDatePe }} – {{ request.endDate | uiDatePe }}</td><td data-label="Estado"><ui-status-badge [label]="statusLabel(request.status)" [tone]="statusTone(request.status)" /></td><td data-label="Detalle"><button class="ui-button ui-button--secondary ui-button--small" type="button" (click)="detailsRequested.emit(request.id)">Ver detalle</button></td></tr> }</tbody></table></div> }
      </section>
    </section>
  `,
encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuplenteApoderadoComponent {
  @Input() state: Stage9State = 'empty';
  @Input() errorMessage = 'Intenta cargar las solicitudes otra vez.';
  @Input() formError = '';
  @Input() children: Stage9StudentOption[] = [];
  @Input() draft: Stage9SubstituteDraft = { studentId: null, fullName: '', dni: '', relationship: '', phone: '', startDate: '', endDate: '' };
  @Input() requests: Stage9SubstituteRequest[] = [];
  @Output() readonly draftChange = new EventEmitter<Stage9SubstituteDraft>();
  @Output() readonly submitRequested = new EventEmitter<Stage9SubstituteDraft>();
  @Output() readonly detailsRequested = new EventEmitter<number>();
  @Output() readonly retry = new EventEmitter<void>();

  statusLabel(status: Stage9SubstituteRequest['status']): string { return status.replaceAll('_', ' '); }
  statusTone(status: Stage9SubstituteRequest['status']): 'success' | 'warning' | 'error' | 'info' {
    return status === 'ACTIVO' ? 'success' : status === 'VENCIDO' || status === 'RECHAZADO' || status === 'REVOCADO' ? 'error' : 'warning';
  }

  updateDraft<K extends keyof Stage9SubstituteDraft>(key: K, value: Stage9SubstituteDraft[K]): void {
    this.draftChange.emit({ ...this.draft, [key]: value });
  }
}
