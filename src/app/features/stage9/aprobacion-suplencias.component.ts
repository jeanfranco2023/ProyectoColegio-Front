import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, ViewEncapsulation } from '@angular/core';
import { AppAlertComponent } from '../../shared/ui/app-alert.component';
import { ListStateComponent } from '../../shared/ui/list-state.component';
import { StatusBadgeComponent } from '../../shared/ui/status-badge.component';
import { UiDatePePipe } from '../../shared/ui/ui-date-pe.pipe';
import { Stage9ReasonAction, Stage9ReasonDialog, Stage9State, Stage9SubstituteRequest } from './stage9.contract';

@Component({
  selector: 'app-aprobacion-suplencias-screen',
  standalone: true,
  imports: [CommonModule, AppAlertComponent, ListStateComponent, StatusBadgeComponent, UiDatePePipe],
  template: `
    <section class="ui-s9-screen" aria-labelledby="ui-s9-approvals-title">
      <header class="ui-s9-heading"><p class="ui-s9-eyebrow">DIRECCIÓN</p><h1 id="ui-s9-approvals-title">Aprobación de suplencias</h1><p class="ui-s9-muted">Revisa las solicitudes y registra las decisiones.</p></header>
      @if (state === 'error') { <ui-app-alert tone="error" title="No se pudo cargar la bandeja" [message]="errorMessage" /><button class="ui-button ui-button--secondary ui-s9-retry" type="button" (click)="retry.emit()">Reintentar</button> }
      <div class="ui-s9-summary"><article><span>Pendientes</span><strong>{{ pendingCount }}</strong></article><article><span>Activas</span><strong>{{ activeCount }}</strong></article><article><span>Vencidas</span><strong>{{ expiredCount }}</strong></article></div>
      <label class="ui-s9-field ui-s9-search">Buscar por estudiante o DNI
        <span class="ui-s9-search-box"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.5"></circle><path d="m16 16 5 5"></path></svg><input type="search" [value]="search" (input)="searchChanged.emit($any($event.target).value)" placeholder="Escribe un nombre o DNI" /></span>
      </label>
      <section class="ui-s9-card" aria-labelledby="ui-s9-approval-list-title"><div class="ui-s9-card-heading"><div><p class="ui-s9-eyebrow">SOLICITUDES RECIBIDAS</p><h2 id="ui-s9-approval-list-title">Bandeja de Dirección</h2></div></div>
        @if (state === 'loading') { <ui-list-state state="loading" title="Cargando solicitudes" /> }
        @else if (state === 'empty') { <ui-list-state state="empty" title="Sin solicitudes pendientes" message="No hay solicitudes para los filtros seleccionados." /> }
        @else if (state === 'normal') { <p class="ui-s9-scroll-hint">Desliza la tabla para ver todas las columnas.</p><div class="ui-s9-table-wrap"><table class="ui-s9-table ui-mobile-table-cards"><thead><tr><th>Estudiante</th><th>Suplente</th><th>DNI</th><th>Vigencia</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>@for (request of requests; track request.id) { <tr><td data-label="Estudiante">{{ request.studentName }}</td><td data-label="Suplente">{{ request.fullName }}<small>{{ request.relationship }} · {{ request.phone }}</small></td><td data-label="DNI">{{ request.dni }}</td><td data-label="Vigencia">{{ request.startDate | uiDatePe }} – {{ request.endDate | uiDatePe }}</td><td data-label="Estado"><ui-status-badge [label]="request.status.replaceAll('_', ' ')" [tone]="toneFor(request.status)" /></td><td class="ui-s9-action-cell" data-label="Acciones">@if (request.status === 'PENDIENTE_APROBACION') { <button class="ui-button ui-button--primary ui-button--small" type="button" (click)="approveRequested.emit(request.id)">Aprobar</button><button class="ui-button ui-button--secondary ui-button--small" type="button" (click)="reasonRequested.emit({ requestId: request.id, action: 'reject' })">Rechazar</button> } @else if (request.status === 'ACTIVO') { <button class="ui-button ui-button--secondary ui-button--small" type="button" (click)="reasonRequested.emit({ requestId: request.id, action: 'revoke' })">Revocar</button> } @else { <span class="ui-s9-muted">—</span> }</td></tr> }</tbody></table></div> }
      </section>
      @if (reasonDialog) {
        <div class="ui-s9-dialog-backdrop" role="presentation"><section class="ui-s9-dialog" role="dialog" aria-modal="true" aria-labelledby="ui-s9-dialog-title"><button class="ui-s9-dialog-close" type="button" aria-label="Cerrar diálogo" (click)="reasonCanceled.emit()">×</button><p class="ui-s9-eyebrow">MOTIVO OBLIGATORIO</p><h2 id="ui-s9-dialog-title">{{ reasonDialog.action === 'reject' ? 'Rechazar solicitud' : 'Revocar suplencia' }}</h2><p class="ui-s9-muted">El motivo quedará registrado junto con la decisión.</p><label class="ui-s9-field">Motivo *<textarea required rows="4" [value]="reasonDraft" (input)="reasonDraftChanged.emit($any($event.target).value)" placeholder="Escribe el motivo"></textarea></label><div class="ui-s9-actions"><button class="ui-button ui-button--secondary" type="button" (click)="reasonCanceled.emit()">Cancelar</button><button class="ui-button ui-button--primary" type="button" [disabled]="!reasonDraft.trim()" (click)="reasonConfirmed.emit({ requestId: reasonDialog.requestId, action: reasonDialog.action, reason: reasonDraft.trim() })">{{ reasonDialog.action === 'reject' ? 'Confirmar rechazo' : 'Confirmar revocación' }}</button></div></section></div>
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
}
