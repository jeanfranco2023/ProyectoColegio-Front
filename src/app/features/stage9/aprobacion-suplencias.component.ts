import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, ViewEncapsulation } from '@angular/core';
import { AppAlertComponent } from '../../shared/ui/app-alert.component';
import { ListStateComponent } from '../../shared/ui/list-state.component';
import { StatusBadgeComponent } from '../../shared/ui/status-badge.component';
import { UiDatePePipe } from '../../shared/ui/ui-date-pe.pipe';
import { UiPaginacionComponent, paginarRegistros } from '../../shared/ui/ui-paginacion.component';
import { Stage9ReasonAction, Stage9ReasonDialog, Stage9State, Stage9SubstituteRequest } from './stage9.contract';

@Component({
  selector: 'app-aprobacion-suplencias-screen',
  standalone: true,
  imports: [CommonModule, AppAlertComponent, ListStateComponent, StatusBadgeComponent, UiDatePePipe, UiPaginacionComponent],
  template: `
    <section class="mx-auto w-full max-w-[1360px] p-6 font-sans text-ui-text max-[700px]:px-[14px] max-[700px]:pt-4 max-[700px]:pb-6" aria-labelledby="ui-s9-approvals-title">
      <header class="mb-[22px] border-t-[3px] border-t-ui-gold pt-3 [&_h1]:m-0 [&_h1]:mt-1 [&_h1]:mb-[6px] [&_h1]:font-display [&_h1]:text-[28px] [&_h1]:leading-[1.25] [&_h1]:font-bold [&_h1]:text-ui-text [&_p]:m-0 max-[700px]:mb-[18px] max-[700px]:[&_h1]:text-[23px] max-[700px]::text-[13px]"><p class="text-[11px] leading-[1.4] tracking-[.075em] font-bold text-ui-muted">DIRECCIÓN</p><h1 id="ui-s9-approvals-title" class="tracking-[-.025em]">Aprobación de suplencias</h1><p class="text-[13px] leading-[1.5] text-ui-muted">Revisa las solicitudes y consulta la decisión, vigencia y motivo registrado en cada ficha.</p></header>
      @if (state === 'error') { <ui-app-alert tone="error" title="No se pudo cargar la bandeja" [message]="errorMessage" /><button class="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-transparent px-4 py-2 text-center font-sans text-[14px] leading-[1.2] font-semibold no-underline transition-[background-color,border-color,color,box-shadow] duration-[140ms] [cursor:pointer] focus-visible:outline-3 focus-visible:outline-ui-focus focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:!border-ui-divider disabled:bg-ui-surface-soft disabled:text-ui-muted aria-disabled:cursor-not-allowed aria-disabled:!border-ui-divider aria-disabled:bg-ui-surface-soft aria-disabled:text-ui-muted !border-ui-divider bg-ui-surface text-ui-text hover:bg-ui-surface-soft mb-4 mt-2" type="button" (click)="retry.emit()">Reintentar</button> }
      <div class="mb-[18px] grid grid-cols-2 lg:grid-cols-4 gap-3">
        <article class="flex min-w-0 flex-col gap-1.5 rounded-2xl border border-ui-divider border-t-4 border-t-[#173B67] bg-ui-surface px-4 py-3.5 shadow-[var(--ui-card-shadow)]">
          <span class="text-[11px] font-bold uppercase tracking-wider text-ui-muted">Total en bandeja</span>
          <strong class="text-2xl leading-tight font-extrabold text-ui-text tabular-nums">{{ requests.length }}</strong>
        </article>
        <article class="flex min-w-0 flex-col gap-1.5 rounded-2xl border border-ui-divider border-t-4 border-t-amber-500 bg-ui-surface px-4 py-3.5 shadow-[var(--ui-card-shadow)]">
          <span class="text-[11px] font-bold uppercase tracking-wider text-ui-muted">Pendientes de firma</span>
          <strong class="text-2xl leading-tight font-extrabold text-ui-text tabular-nums">{{ pendingCount }}</strong>
        </article>
        <article class="flex min-w-0 flex-col gap-1.5 rounded-2xl border border-ui-divider border-t-4 border-t-emerald-600 bg-ui-surface px-4 py-3.5 shadow-[var(--ui-card-shadow)]">
          <span class="text-[11px] font-bold uppercase tracking-wider text-ui-muted">Autorizaciones activas</span>
          <strong class="text-2xl leading-tight font-extrabold text-ui-text tabular-nums">{{ activeCount }}</strong>
        </article>
        <article class="flex min-w-0 flex-col gap-1.5 rounded-2xl border border-ui-divider border-t-4 border-t-slate-400 bg-ui-surface px-4 py-3.5 shadow-[var(--ui-card-shadow)]">
          <span class="text-[11px] font-bold uppercase tracking-wider text-ui-muted">Vencidas / Cerradas</span>
          <strong class="text-2xl leading-tight font-extrabold text-ui-text tabular-nums">{{ expiredCount }}</strong>
        </article>
      </div>
      <label class="flex min-w-0 flex-col gap-[7px] font-sans text-[13px] leading-[1.4] font-medium text-ui-muted [&>span]:text-ui-error-text [&_input]:box-border [&_input]:min-h-[44px] [&_input]:w-full [&_input]:min-w-0 [&_input]:max-w-full [&_input]:rounded-lg [&_input]:border [&_input]:border-ui-control-border [&_input]:bg-ui-surface [&_input]:px-3 [&_input]:py-[10px] [&_input]:font-sans [&_input]:text-sm [&_input]:leading-[1.4] [&_input]:text-ui-text [&_input:focus]:border-ui-focus [&_input:focus]:outline-none [&_input:focus]:shadow-[0_0_0_3px_var(--ui-focus-shadow)] [&_input::placeholder]:text-ui-muted [&_select]:box-border [&_select]:min-h-[44px] [&_select]:w-full [&_select]:min-w-0 [&_select]:max-w-full [&_select]:rounded-lg [&_select]:border [&_select]:border-ui-control-border [&_select]:bg-ui-surface [&_select]:px-3 [&_select]:py-[10px] [&_select]:font-sans [&_select]:text-sm [&_select]:leading-[1.4] [&_select]:text-ui-text [&_textarea]:box-border [&_textarea]:min-h-[96px] [&_textarea]:w-full [&_textarea]:min-w-0 [&_textarea]:max-w-full [&_textarea]:resize-y [&_textarea]:rounded-lg [&_textarea]:border [&_textarea]:border-ui-control-border [&_textarea]:bg-ui-surface [&_textarea]:px-3 [&_textarea]:py-[10px] [&_textarea]:font-sans [&_textarea]:text-sm [&_textarea]:leading-[1.4] [&_textarea]:text-ui-text [&_textarea:focus]:border-ui-focus [&_textarea:focus]:outline-none [&_textarea:focus]:shadow-[0_0_0_3px_var(--ui-focus-shadow)] [&_textarea::placeholder]:text-ui-muted mb-[18px] w-full max-w-[620px] max-[700px]:max-w-none">Buscar por estudiante o DNI
        <span class="relative block [&_svg]:pointer-events-none [&_svg]:absolute [&_svg]:left-3 [&_svg]:top-[13px] [&_svg]:h-[18px] [&_svg]:w-[18px] [&_svg]:fill-none [&_svg]:stroke-ui-muted [&_svg]:stroke-[1.8] [&_input]:pl-10"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.5"></circle><path d="m16 16 5 5"></path></svg><input type="search" [value]="search" (input)="searchChanged.emit($any($event.target).value)" placeholder="Escribe un nombre o DNI" /></span>
      </label>
      <section class="mb-[18px] min-w-0 rounded-2xl border border-ui-divider bg-ui-surface p-5 shadow-[var(--ui-card-shadow)] max-[700px]:rounded-xl max-[700px]:px-[14px] max-[700px]:py-4" aria-labelledby="ui-s9-approval-list-title"><div class="mb-4 flex items-start justify-between gap-3 [&_h2]:m-0 [&_h2]:mt-1 [&_h2]:font-display [&_h2]:text-lg [&_h2]:leading-[1.35] [&_h2]:font-semibold [&_h2]:text-ui-text [&_.text-\[11px\]]:m-0 max-[700px]:[&_h2]:text-[17px]"><div><p class="text-[11px] leading-[1.4] tracking-[.075em] font-bold text-ui-muted">SOLICITUDES RECIBIDAS</p><h2 id="ui-s9-approval-list-title" class="tracking-[-.025em]">Bandeja de Dirección</h2></div></div>
        @if (state === 'loading') { <ui-list-state state="loading" title="Cargando solicitudes" /> }
        @else if (state === 'empty') { <ui-list-state state="empty" title="Sin solicitudes pendientes" message="No hay solicitudes para los filtros seleccionados." /> }
        @else if (state === 'normal') {
          <div class="w-full overflow-x-auto overscroll-x-contain">
            <table class="w-full min-w-[760px] border-collapse text-left text-[13px] [&_th]:border-b [&_th]:border-ui-divider [&_th]:px-[10px] [&_th]:py-[11px] [&_th]:text-[11px] [&_th]:tracking-[.06em] [&_th]:text-ui-muted [&_th]:uppercase [&_td]:border-b [&_td]:border-ui-divider [&_td]:px-[10px] [&_td]:py-[13px] [&_td]:align-middle [&_td]:text-ui-text [&_tbody_tr:last-child_td]:border-b-0 [&_small]:mt-1 [&_small]:block [&_small]:text-xs [&_small]:text-ui-muted [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:!bg-ui-surface-soft" data-mobile-table-cards="">
              <thead>
                <tr>
                  <th>Estudiante</th>
                  <th>Suplente</th>
                  <th>DNI</th>
                  <th>Vigencia</th>
                  <th>Decisión / Estado</th>
                  <th>Motivo registrado en ficha</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (request of requestsPaginados; track request.id) {
                  <tr>
                    <td data-label="Estudiante">{{ request.studentName }}</td>
                    <td data-label="Suplente">{{ request.fullName }}<small>{{ request.relationship }} · {{ request.phone }}</small></td>
                    <td data-label="DNI">{{ request.dni }}</td>
                    <td data-label="Vigencia">{{ request.startDate | uiDatePe }} – {{ request.endDate | uiDatePe }}</td>
                    <td data-label="Decisión / Estado">
                      <ui-status-badge [label]="request.status.replaceAll('_', ' ')" [tone]="toneFor(request.status)" />
                      <small>{{ decisionText(request) }}</small>
                    </td>
                    <td data-label="Motivo registrado en ficha">
                      <span class="block text-xs text-ui-text">{{ reasonText(request) }}</span>
                    </td>
                    <td class="flex flex-wrap items-center gap-[7px]" data-label="Acciones">
                      @if (request.status === 'PENDIENTE_APROBACION') {
                        <button class="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-transparent px-4 py-2 text-center font-sans text-[14px] leading-[1.2] font-semibold no-underline transition-[background-color,border-color,color,box-shadow] duration-[140ms] [cursor:pointer] focus-visible:outline-3 focus-visible:outline-ui-focus focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:!border-ui-divider disabled:bg-ui-surface-soft disabled:text-ui-muted aria-disabled:cursor-not-allowed aria-disabled:!border-ui-divider aria-disabled:bg-ui-surface-soft aria-disabled:text-ui-muted bg-ui-action text-ui-action-text hover:opacity-90 min-h-11 !px-3" type="button" (click)="approveRequested.emit(request.id)">Aprobar</button>
                        <button class="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-transparent px-4 py-2 text-center font-sans text-[14px] leading-[1.2] font-semibold no-underline transition-[background-color,border-color,color,box-shadow] duration-[140ms] [cursor:pointer] focus-visible:outline-3 focus-visible:outline-ui-focus focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:!border-ui-divider disabled:bg-ui-surface-soft disabled:text-ui-muted aria-disabled:cursor-not-allowed aria-disabled:!border-ui-divider aria-disabled:bg-ui-surface-soft aria-disabled:text-ui-muted !border-ui-divider bg-ui-surface text-ui-text hover:bg-ui-surface-soft min-h-11 !px-3" type="button" (click)="reasonRequested.emit({ requestId: request.id, action: 'reject' })">Rechazar</button>
                      } @else if (request.status === 'ACTIVO') {
                        <button class="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-transparent px-4 py-2 text-center font-sans text-[14px] leading-[1.2] font-semibold no-underline transition-[background-color,border-color,color,box-shadow] duration-[140ms] [cursor:pointer] focus-visible:outline-3 focus-visible:outline-ui-focus focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:!border-ui-divider disabled:bg-ui-surface-soft disabled:text-ui-muted aria-disabled:cursor-not-allowed aria-disabled:!border-ui-divider aria-disabled:bg-ui-surface-soft aria-disabled:text-ui-muted !border-ui-divider bg-ui-surface text-ui-text hover:bg-ui-surface-soft min-h-11 !px-3" type="button" (click)="reasonRequested.emit({ requestId: request.id, action: 'revoke' })">Revocar</button>
                      } @else {
                        <span class="text-[13px] leading-[1.5] text-ui-muted">—</span>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <ui-paginacion [totalRegistros]="requests.length" [paginaActual]="paginaActual" [tamanoPagina]="10" etiqueta="solicitudes" ariaLabel="Paginación de aprobación de suplencias" (cambioPagina)="paginaActual = $event" />
        }
      </section>
      @if (reasonDialog) {
        <div class="fixed inset-0 z-[1000] grid place-items-center bg-black/50 p-[18px]" role="presentation"><section class="relative w-full max-w-[540px] rounded-2xl border border-ui-divider bg-ui-surface p-[26px] shadow-[var(--ui-dialog-shadow)] [&_h2]:mt-[5px] [&_h2]:mb-2 [&_h2]:font-display [&_h2]:text-[22px] [&_h2]:leading-[1.3] [&_h2]:font-semibold [&_h2]:text-ui-text [&_label]:mt-[14px] max-[700px]:p-[22px_18px] max-[700px]:[&>div:last-child]:flex max-[700px]:[&>div:last-child]:flex-col-reverse max-[700px]:[&>div:last-child>button]:w-full" role="dialog" aria-modal="true" aria-labelledby="ui-s9-dialog-title"><button class="absolute right-[14px] top-[14px] grid h-11 w-11 place-items-center rounded-[9px] border border-ui-control-border bg-ui-surface font-sans text-[27px] leading-none font-normal text-ui-text" type="button" aria-label="Cerrar diálogo" (click)="reasonCanceled.emit()">×</button><p class="text-[11px] leading-[1.4] tracking-[.075em] font-bold text-ui-muted">MOTIVO OBLIGATORIO</p><h2 id="ui-s9-dialog-title" class="tracking-[-.025em]">{{ reasonDialog.action === 'reject' ? 'Rechazar solicitud' : 'Revocar suplencia' }}</h2><p class="text-[13px] leading-[1.5] text-ui-muted">Selecciona un motivo rápido o escribe el detalle que quedará en la ficha.</p>
          <div class="mt-3 flex flex-wrap gap-1.5">
            @for (motivo of motivosRapidos(reasonDialog.action); track motivo) {
              <button
                type="button"
                (click)="reasonDraftChanged.emit(motivo)"
                class="rounded-lg border border-ui-divider bg-ui-surface-soft px-2.5 py-1.5 text-xs font-semibold text-ui-text hover:bg-ui-surface cursor-pointer text-left"
              >
                {{ motivo }}
              </button>
            }
          </div>
          <label class="flex min-w-0 flex-col gap-[7px] font-sans text-[13px] leading-[1.4] font-medium text-ui-muted [&>span]:text-ui-error-text [&_textarea]:box-border [&_textarea]:min-h-[96px] [&_textarea]:w-full [&_textarea]:min-w-0 [&_textarea]:max-w-full [&_textarea]:resize-y [&_textarea]:rounded-lg [&_textarea]:border [&_textarea]:border-ui-control-border [&_textarea]:bg-ui-surface [&_textarea]:px-3 [&_textarea]:py-[10px] [&_textarea]:font-sans [&_textarea]:text-sm [&_textarea]:leading-[1.4] [&_textarea]:text-ui-text [&_textarea:focus]:border-ui-focus [&_textarea:focus]:outline-none [&_textarea:focus]:shadow-[0_0_0_3px_var(--ui-focus-shadow)] [&_textarea::placeholder]:text-ui-muted">Motivo *<textarea required rows="4" [value]="reasonDraft" (input)="reasonDraftChanged.emit($any($event.target).value)" placeholder="Escribe el motivo" class="min-h-[100px] py-[10px] resize-y"></textarea></label><div class="mt-[18px] flex justify-end gap-[10px] max-[700px]:grid max-[700px]:grid-cols-1 [&>button]:text-sm [&>button]:leading-[1.2] max-[700px]:[&>button]:w-full"><button class="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-transparent px-4 py-2 text-center font-sans text-[14px] leading-[1.2] font-semibold no-underline transition-[background-color,border-color,color,box-shadow] duration-[140ms] [cursor:pointer] focus-visible:outline-3 focus-visible:outline-ui-focus focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:!border-ui-divider disabled:bg-ui-surface-soft disabled:text-ui-muted aria-disabled:cursor-not-allowed aria-disabled:!border-ui-divider aria-disabled:bg-ui-surface-soft aria-disabled:text-ui-muted !border-ui-divider bg-ui-surface text-ui-text hover:bg-ui-surface-soft" type="button" (click)="reasonCanceled.emit()">Cancelar</button><button class="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-transparent px-4 py-2 text-center font-sans text-[14px] leading-[1.2] font-semibold no-underline transition-[background-color,border-color,color,box-shadow] duration-[140ms] [cursor:pointer] focus-visible:outline-3 focus-visible:outline-ui-focus focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:!border-ui-divider disabled:bg-ui-surface-soft disabled:text-ui-muted aria-disabled:cursor-not-allowed aria-disabled:!border-ui-divider aria-disabled:bg-ui-surface-soft aria-disabled:text-ui-muted bg-ui-action text-ui-action-text hover:opacity-90" type="button" [disabled]="!reasonDraft.trim()" (click)="reasonConfirmed.emit({ requestId: reasonDialog.requestId, action: reasonDialog.action, reason: reasonDraft.trim() })">{{ reasonDialog.action === 'reject' ? 'Confirmar rechazo' : 'Confirmar revocación' }}</button></div></section></div>
      }
    </section>
  `,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AprobacionSuplenciasComponent {
  @Input() state: Stage9State = 'empty';
  @Input() errorMessage = 'Intenta cargar la bandeja otra vez.';
  @Input() requests: Stage9SubstituteRequest[] = [];
  @Input() pendingCount = 0;
  @Input() activeCount = 0;
  @Input() expiredCount = 0;
  @Input() search = '';
  @Input() reasonDialog: Stage9ReasonDialog | null = null;
  @Input() reasonDraft = '';
  paginaActual = 1;
  get requestsPaginados(): Stage9SubstituteRequest[] { return paginarRegistros(this.requests, this.paginaActual, 10); }
  @Output() readonly searchChanged = new EventEmitter<string>();
  @Output() readonly approveRequested = new EventEmitter<number>();
  @Output() readonly reasonRequested = new EventEmitter<Stage9ReasonDialog>();
  @Output() readonly reasonDraftChanged = new EventEmitter<string>();
  @Output() readonly reasonConfirmed = new EventEmitter<{ requestId: number; action: Stage9ReasonAction; reason: string }>();
  @Output() readonly reasonCanceled = new EventEmitter<void>();
  @Output() readonly retry = new EventEmitter<void>();

  toneFor(status: Stage9SubstituteRequest['status']): 'success' | 'warning' | 'error' | 'info' {
    return status === 'ACTIVO' ? 'success' : status === 'VENCIDO' || status === 'RECHAZADO' || status === 'REVOCADO' ? 'error' : 'warning';
  }

  decisionText(request: Stage9SubstituteRequest): string {
    const custom = (request as Stage9SubstituteRequest & { decisionLabel?: string }).decisionLabel;
    if (custom) return custom;
    return request.status === 'ACTIVO'
      ? 'Decisión: Aprobada'
      : request.status === 'RECHAZADO'
        ? 'Decisión: Rechazada'
        : request.status === 'REVOCADO'
          ? 'Decisión: Revocada'
          : request.status === 'VENCIDO'
            ? 'Vigencia concluida'
            : 'Pendiente de decisión';
  }

  motivosRapidos(action: Stage9ReasonAction): readonly string[] {
    return action === 'reject'
      ? [
          'Datos del adulto autorizado no coinciden con RENIEC.',
          'Falta autorización expresa o contacto válido del apoderado titular.',
          'El rango de vigencia solicitado excede el periodo lectivo actual.'
        ]
      : [
          'Revocada a solicitud directa del apoderado titular.',
          'Actualización del protocolo de seguridad y retiro escolar.',
          'Cambio de apoderado o término anticipado del permiso.'
        ];
  }

  reasonText(request: Stage9SubstituteRequest): string {
    const reason = (request as Stage9SubstituteRequest & { reason?: string }).reason;
    if (reason && reason.trim()) return reason.trim();
    return request.status === 'PENDIENTE_APROBACION'
      ? 'Sin motivo de resolución aún'
      : 'Sin motivo adicional registrado';
  }
}
