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
    <section class="mx-auto w-full max-w-[1360px] p-6 font-sans text-ui-text max-[700px]:px-[14px] max-[700px]:pt-4 max-[700px]:pb-6" aria-labelledby="ui-s9-guardian-title">
      <header class="mb-[22px] border-t-[3px] border-t-ui-gold pt-3 [&_h1]:m-0 [&_h1]:mt-1 [&_h1]:mb-[6px] [&_h1]:font-display [&_h1]:text-[28px] [&_h1]:leading-[1.25] [&_h1]:font-bold [&_h1]:text-ui-text [&_p]:m-0 max-[700px]:mb-[18px] max-[700px]:[&_h1]:text-[23px] max-[700px]::text-[13px]">
        <p class="text-[11px] leading-[1.4] tracking-[.075em] font-bold text-ui-muted">PORTAL FAMILIAR · APODERADO</p>
        <h1 id="ui-s9-guardian-title" class="tracking-[-.025em]">Portal del apoderado</h1>
        <p class="text-[13px] leading-[1.5] text-ui-muted">Consulta las notas y el estado de cuenta de tus hijos.</p>
      </header>
      @if (state === 'error') {
        <ui-app-alert tone="error" title="No se pudo cargar el portal" [message]="errorMessage" />
        <button class="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-transparent px-4 py-2 text-center font-sans text-[14px] leading-[1.2] font-semibold no-underline transition-[background-color,border-color,color,box-shadow] duration-[140ms] [cursor:pointer] focus-visible:outline-3 focus-visible:outline-ui-focus focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:!border-ui-divider disabled:bg-ui-surface-soft disabled:text-ui-muted aria-disabled:cursor-not-allowed aria-disabled:!border-ui-divider aria-disabled:bg-ui-surface-soft aria-disabled:text-ui-muted !border-ui-divider bg-ui-surface text-ui-text hover:bg-ui-surface-soft mb-4 mt-2" type="button" (click)="retry.emit()">Reintentar</button>
      }
      <div class="mb-[18px] flex flex-wrap items-end gap-[14px] max-[700px]:grid max-[700px]:grid-cols-1 max-[700px]:gap-3 [&>label]:flex-[1_1_190px] max-[700px]:[&>label]:w-full max-[700px]:[&>button]:w-full">
        <label class="flex min-w-0 flex-col gap-[7px] font-sans text-[13px] leading-[1.4] font-medium text-ui-muted [&>span]:text-ui-error-text [&_input]:box-border [&_input]:min-h-[44px] [&_input]:w-full [&_input]:min-w-0 [&_input]:max-w-full [&_input]:rounded-lg [&_input]:border [&_input]:border-ui-control-border [&_input]:bg-ui-surface [&_input]:px-3 [&_input]:py-[10px] [&_input]:font-sans [&_input]:text-sm [&_input]:leading-[1.4] [&_input]:text-ui-text [&_input:focus]:border-ui-focus [&_input:focus]:outline-none [&_input:focus]:shadow-[0_0_0_3px_var(--ui-focus-shadow)] [&_input::placeholder]:text-ui-muted [&_select]:box-border [&_select]:min-h-[44px] [&_select]:w-full [&_select]:min-w-0 [&_select]:max-w-full [&_select]:rounded-lg [&_select]:border [&_select]:border-ui-control-border [&_select]:bg-ui-surface [&_select]:px-3 [&_select]:py-[10px] [&_select]:font-sans [&_select]:text-sm [&_select]:leading-[1.4] [&_select]:text-ui-text [&_textarea]:box-border [&_textarea]:min-h-[96px] [&_textarea]:w-full [&_textarea]:min-w-0 [&_textarea]:max-w-full [&_textarea]:resize-y [&_textarea]:rounded-lg [&_textarea]:border [&_textarea]:border-ui-control-border [&_textarea]:bg-ui-surface [&_textarea]:px-3 [&_textarea]:py-[10px] [&_textarea]:font-sans [&_textarea]:text-sm [&_textarea]:leading-[1.4] [&_textarea]:text-ui-text [&_textarea:focus]:border-ui-focus [&_textarea:focus]:outline-none [&_textarea:focus]:shadow-[0_0_0_3px_var(--ui-focus-shadow)] [&_textarea::placeholder]:text-ui-muted">Hijo
          <select [value]="selectedStudentId ?? ''" (change)="childSelected.emit(+$any($event.target).value)">
            @for (student of children; track student.id) { <option [value]="student.id">{{ student.fullName }} · {{ student.gradeLabel }}</option> }
          </select>
        </label>
        <label class="flex min-w-0 flex-col gap-[7px] font-sans text-[13px] leading-[1.4] font-medium text-ui-muted [&>span]:text-ui-error-text [&_input]:box-border [&_input]:min-h-[44px] [&_input]:w-full [&_input]:min-w-0 [&_input]:max-w-full [&_input]:rounded-lg [&_input]:border [&_input]:border-ui-control-border [&_input]:bg-ui-surface [&_input]:px-3 [&_input]:py-[10px] [&_input]:font-sans [&_input]:text-sm [&_input]:leading-[1.4] [&_input]:text-ui-text [&_input:focus]:border-ui-focus [&_input:focus]:outline-none [&_input:focus]:shadow-[0_0_0_3px_var(--ui-focus-shadow)] [&_input::placeholder]:text-ui-muted [&_select]:box-border [&_select]:min-h-[44px] [&_select]:w-full [&_select]:min-w-0 [&_select]:max-w-full [&_select]:rounded-lg [&_select]:border [&_select]:border-ui-control-border [&_select]:bg-ui-surface [&_select]:px-3 [&_select]:py-[10px] [&_select]:font-sans [&_select]:text-sm [&_select]:leading-[1.4] [&_select]:text-ui-text [&_textarea]:box-border [&_textarea]:min-h-[96px] [&_textarea]:w-full [&_textarea]:min-w-0 [&_textarea]:max-w-full [&_textarea]:resize-y [&_textarea]:rounded-lg [&_textarea]:border [&_textarea]:border-ui-control-border [&_textarea]:bg-ui-surface [&_textarea]:px-3 [&_textarea]:py-[10px] [&_textarea]:font-sans [&_textarea]:text-sm [&_textarea]:leading-[1.4] [&_textarea]:text-ui-text [&_textarea:focus]:border-ui-focus [&_textarea:focus]:outline-none [&_textarea:focus]:shadow-[0_0_0_3px_var(--ui-focus-shadow)] [&_textarea::placeholder]:text-ui-muted">Periodo
          <select [value]="selectedPeriodId ?? ''" (change)="periodSelected.emit(+$any($event.target).value)">
            @for (period of periods; track period.id) { <option [value]="period.id">{{ period.label }}</option> }
          </select>
        </label>
        <button class="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-transparent px-4 py-2 text-center font-sans text-[14px] leading-[1.2] font-semibold no-underline transition-[background-color,border-color,color,box-shadow] duration-[140ms] [cursor:pointer] focus-visible:outline-3 focus-visible:outline-ui-focus focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:!border-ui-divider disabled:bg-ui-surface-soft disabled:text-ui-muted aria-disabled:cursor-not-allowed aria-disabled:!border-ui-divider aria-disabled:bg-ui-surface-soft aria-disabled:text-ui-muted bg-ui-action text-ui-action-text hover:opacity-90" type="button" [disabled]="!selectedStudentId || !selectedPeriodId" (click)="reportRequested.emit({ studentId: selectedStudentId!, periodId: selectedPeriodId! })">Descargar reporte</button>
      </div>
      <div class="grid gap-[18px] grid-cols-[minmax(0,1.05fr)_minmax(0,.95fr)] max-[700px]:grid-cols-1">
        <section class="mb-[18px] min-w-0 rounded-2xl border border-ui-divider bg-ui-surface p-5 shadow-[var(--ui-card-shadow)] max-[700px]:rounded-xl max-[700px]:px-[14px] max-[700px]:py-4" aria-labelledby="ui-s9-grades-title">
          <div class="mb-4 flex items-start justify-between gap-3 [&_h2]:m-0 [&_h2]:mt-1 [&_h2]:font-display [&_h2]:text-lg [&_h2]:leading-[1.35] [&_h2]:font-semibold [&_h2]:text-ui-text [&_.text-\[11px\]]:m-0 max-[700px]:[&_h2]:text-[17px]"><div><p class="text-[11px] leading-[1.4] tracking-[.075em] font-bold text-ui-muted">RENDIMIENTO ACADÉMICO</p><h2 id="ui-s9-grades-title" class="tracking-[-.025em]">Notas por área</h2></div><span class="self-center whitespace-nowrap rounded-full bg-ui-warning-bg px-[10px] py-[7px] text-[11px] font-semibold text-ui-warning-text max-[700px]:max-w-[136px] max-[700px]:whitespace-normal max-[700px]:text-center max-[700px]:text-[11px]">Primaria · AD / A / B / C</span></div>
          @if (state === 'loading') { <ui-list-state state="loading" title="Cargando notas" /> }
          @else if (state === 'empty') { <ui-list-state state="empty" title="Sin notas para este periodo" message="Las notas aparecerán cuando hayan sido publicadas." /> }
          @else if (state === 'normal') {
            <div class="w-full overflow-x-auto overscroll-x-contain"><table class="w-full min-w-[620px] border-collapse text-left text-[13px] [&_th]:border-b [&_th]:border-ui-divider [&_th]:px-[10px] [&_th]:py-[11px] [&_th]:text-[11px] [&_th]:tracking-[.06em] [&_th]:text-ui-muted [&_th]:uppercase [&_td]:border-b [&_td]:border-ui-divider [&_td]:px-[10px] [&_td]:py-[13px] [&_td]:align-middle [&_td]:text-ui-text [&_tbody_tr:last-child_td]:border-b-0 [&_small]:mt-1 [&_small]:block [&_small]:text-xs [&_small]:text-ui-muted [&_thead]:!bg-ui-surface-soft [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:!bg-ui-surface-soft" data-mobile-table-cards=""><thead><tr><th>Área</th><th>Calificación</th><th>Conclusión</th></tr></thead><tbody>
              @for (row of grades; track row.areaId + "/" + (row.competenciaId ?? 0)) { <tr><td data-label="Área">{{ row.areaName }} {{ row.competenciaName ? "· " + row.competenciaName : "" }}</td><td data-label="Calificación"><span class="inline-flex min-h-8 min-w-9 items-center justify-center rounded-lg bg-ui-info-bg font-extrabold text-ui-info-text" [ngClass]="row.grade === 'AD' ? '!bg-ui-success-bg !text-ui-success-text' : row.grade === 'B' ? 'bg-ui-warning-bg text-ui-warning-text' : row.grade === 'C' ? 'bg-ui-error-bg text-ui-error-text' : ''">{{ row.grade }}</span></td><td data-label="Conclusión">{{ row.conclusion || '—' }}</td></tr> }
            </tbody></table></div>
          }
        </section>
        <section class="mb-[18px] min-w-0 rounded-2xl border border-ui-divider bg-ui-surface p-5 shadow-[var(--ui-card-shadow)] max-[700px]:rounded-xl max-[700px]:px-[14px] max-[700px]:py-4" aria-labelledby="ui-s9-account-title">
          <div class="mb-4 flex items-start justify-between gap-3 [&_h2]:m-0 [&_h2]:mt-1 [&_h2]:font-display [&_h2]:text-lg [&_h2]:leading-[1.35] [&_h2]:font-semibold [&_h2]:text-ui-text [&_.text-\[11px\]]:m-0 max-[700px]:[&_h2]:text-[17px]"><div><p class="text-[11px] leading-[1.4] tracking-[.075em] font-bold text-ui-muted">ESTADO DE CUENTA</p><h2 id="ui-s9-account-title" class="tracking-[-.025em]">Pagos del año {{ schoolYear }}</h2></div></div>
          @if (state === 'loading') { <ui-list-state state="loading" title="Cargando estado de cuenta" /> }
          @else if (state === 'empty') { <ui-list-state state="empty" title="Sin movimientos registrados" message="No hay pagos que mostrar para este año lectivo." /> }
          @else if (state === 'normal') {
            <ul class="m-0 list-none p-0">
              @for (payment of payments; track payment.id) {
                <li class="flex items-center justify-between gap-[14px] border-b border-ui-divider py-[15px] last:border-b-0 max-[700px]:flex-wrap max-[700px]:items-start [&_h3]:m-0 [&_h3]:text-sm [&_h3]:text-ui-text [&_h3]:leading-[1.5] [&_p]:mt-[5px] [&_p]:mb-0 [&_p]:text-xs [&_p]:text-ui-muted [&_p]:leading-[1.5] max-[700px]:[&_h3]:text-[13px]"><div><h3 class="tracking-[-.025em]">{{ payment.concept }} · {{ payment.schoolYear }}</h3><p>{{ payment.amountLabel }}: S/ {{ payment.amount | number:'1.2-2' }} · Vence {{ payment.dueDate | uiDatePe }}</p><p>Comprobante: dato no disponible</p></div><ui-status-badge [label]="payment.status" [tone]="payment.status === 'PAGADO' ? 'success' : payment.status === 'PENDIENTE' || payment.status === 'PAGO PARCIAL' ? 'warning' : payment.status === 'SIN ESTADO' ? 'info' : 'error'" /></li>
              } @empty {
                <li class="border-b border-ui-divider py-[15px] text-sm text-ui-muted">No se recibieron obligaciones para esta matrícula. El estado de cuenta incluye las asociadas al apoderado responsable económico.</li>
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
