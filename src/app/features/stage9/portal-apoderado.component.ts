import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, ViewEncapsulation } from '@angular/core';
import { AppAlertComponent } from '../../shared/ui/app-alert.component';
import { ListStateComponent } from '../../shared/ui/list-state.component';
import { StatusBadgeComponent } from '../../shared/ui/status-badge.component';
import { UiDatePePipe } from '../../shared/ui/ui-date-pe.pipe';
import { Stage9GradeRow, Stage9Payment, Stage9PeriodOption, Stage9State, Stage9StudentOption } from './stage9.contract';

@Component({
  selector: 'app-portal-apoderado-screen',
  standalone: true,
  imports: [CommonModule, AppAlertComponent, ListStateComponent, StatusBadgeComponent, UiDatePePipe],
  template: `
    <section class="ui-s9-screen" aria-labelledby="ui-s9-guardian-title">
      <header class="ui-s9-heading">
        <p class="ui-s9-eyebrow">PORTAL FAMILIAR · APODERADO</p>
        <h1 id="ui-s9-guardian-title">Portal del apoderado</h1>
        <p class="ui-s9-muted">Consulta las notas y el estado de cuenta de tus hijos.</p>
      </header>
      @if (state === 'error') {
        <ui-app-alert tone="error" title="No se pudo cargar el portal" [message]="errorMessage" />
        <button class="ui-button ui-button--secondary ui-s9-retry" type="button" (click)="retry.emit()">Reintentar</button>
      }
      <div class="ui-s9-toolbar ui-s9-toolbar--guardian">
        <label class="ui-s9-field">Hijo
          <select [value]="selectedStudentId ?? ''" (change)="childSelected.emit(+$any($event.target).value)">
            @for (student of children; track student.id) { <option [value]="student.id">{{ student.fullName }} · {{ student.gradeLabel }}</option> }
          </select>
        </label>
        <label class="ui-s9-field">Periodo
          <select [value]="selectedPeriodId ?? ''" (change)="periodSelected.emit(+$any($event.target).value)">
            @for (period of periods; track period.id) { <option [value]="period.id">{{ period.label }}</option> }
          </select>
        </label>
        <button class="ui-button ui-button--primary" type="button" [disabled]="!selectedStudentId || !selectedPeriodId" (click)="reportRequested.emit({ studentId: selectedStudentId!, periodId: selectedPeriodId! })">Descargar reporte</button>
      </div>
      <div class="ui-s9-grid ui-s9-grid--guardian">
        <section class="ui-s9-card" aria-labelledby="ui-s9-grades-title">
          <div class="ui-s9-card-heading"><div><p class="ui-s9-eyebrow">RENDIMIENTO ACADÉMICO</p><h2 id="ui-s9-grades-title">Notas por área</h2></div><span class="ui-s9-scale">Primaria · AD / A / B / C</span></div>
          @if (state === 'loading') { <ui-list-state state="loading" title="Cargando notas" /> }
          @else if (state === 'empty') { <ui-list-state state="empty" title="Sin notas para este periodo" message="Las notas aparecerán cuando hayan sido publicadas." /> }
          @else if (state === 'normal') {
            <p class="ui-s9-scroll-hint">Desliza la tabla para ver todas las columnas.</p><div class="ui-s9-table-wrap"><table class="ui-s9-table ui-mobile-table-cards"><thead><tr><th>Área</th><th>Calificación</th><th>Conclusión</th></tr></thead><tbody>
              @for (row of grades; track row.areaId) { <tr><td data-label="Área">{{ row.areaName }}</td><td data-label="Calificación"><span class="ui-s9-grade" [class.ui-s9-grade--ad]="row.grade === 'AD'" [class.ui-s9-grade--b]="row.grade === 'B'" [class.ui-s9-grade--c]="row.grade === 'C'">{{ row.grade }}</span></td><td data-label="Conclusión">{{ row.conclusion || '—' }}</td></tr> }
            </tbody></table></div>
          }
        </section>
        <section class="ui-s9-card" aria-labelledby="ui-s9-account-title">
          <div class="ui-s9-card-heading"><div><p class="ui-s9-eyebrow">ESTADO DE CUENTA</p><h2 id="ui-s9-account-title">Pagos del año {{ schoolYear }}</h2></div></div>
          @if (state === 'loading') { <ui-list-state state="loading" title="Cargando estado de cuenta" /> }
          @else if (state === 'empty') { <ui-list-state state="empty" title="Sin movimientos registrados" message="No hay pagos que mostrar para este año lectivo." /> }
          @else if (state === 'normal') {
            <ul class="ui-s9-payment-list">
              @for (payment of payments; track payment.id) {
                <li class="ui-s9-payment"><div><h3>{{ payment.concept }} · {{ payment.schoolYear }}</h3><p>S/ {{ payment.amount | number:'1.2-2' }} · Vence {{ payment.dueDate | uiDatePe }}</p><p>{{ payment.receiptName ? 'Comprobante: ' + payment.receiptName : 'Sin comprobante' }}</p></div><ui-status-badge [label]="payment.status" [tone]="payment.status === 'PAGADO' ? 'success' : payment.status === 'PENDIENTE' ? 'warning' : 'error'" /></li>
              }
            </ul>
          }
        </section>
      </div>
    </section>
  `,
encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortalApoderadoComponent {
  @Input() state: Stage9State = 'empty';
  @Input() errorMessage = 'Intenta cargar la información otra vez.';
  @Input() schoolYear = 2026;
  @Input() children: Stage9StudentOption[] = [];
  @Input() periods: Stage9PeriodOption[] = [];
  @Input() grades: Stage9GradeRow[] = [];
  @Input() payments: Stage9Payment[] = [];
  @Input() selectedStudentId: number | null = null;
  @Input() selectedPeriodId: number | null = null;
  @Output() readonly childSelected = new EventEmitter<number>();
  @Output() readonly periodSelected = new EventEmitter<number>();
  @Output() readonly reportRequested = new EventEmitter<{ studentId: number; periodId: number }>();
  @Output() readonly retry = new EventEmitter<void>();
}
