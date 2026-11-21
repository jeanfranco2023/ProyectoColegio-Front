import { FormatoEntradaDirective } from '../../shared/ui/formato-entrada.directive';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, ViewEncapsulation } from '@angular/core';
import { AppAlertComponent } from '../../shared/ui/app-alert.component';
import { ListStateComponent } from '../../shared/ui/list-state.component';
import { StatusBadgeComponent } from '../../shared/ui/status-badge.component';
import { UiDatePePipe } from '../../shared/ui/ui-date-pe.pipe';
import { UiCalendarComponent } from '../../shared/ui/ui-calendar.component';
import { UiPaginacionComponent, paginarRegistros } from '../../shared/ui/ui-paginacion.component';
import { Stage9State, Stage9StudentOption, Stage9SubstituteDraft, Stage9SubstituteRequest } from './stage9.contract';

@Component({
  selector: 'app-suplente-apoderado-screen',
  standalone: true,
  imports: [FormatoEntradaDirective, CommonModule, FormsModule, AppAlertComponent, ListStateComponent, StatusBadgeComponent, UiDatePePipe, UiCalendarComponent, UiPaginacionComponent],
  template: `
    <section class="mx-auto w-full max-w-[1360px] p-4 sm:p-6 font-sans text-ui-text" aria-labelledby="ui-s9-substitute-title">
      @if (!hideHeader) {
        <header class="mb-[22px] border-t-[3px] border-t-ui-gold pt-3 [&_h1]:m-0 [&_h1]:mt-1 [&_h1]:mb-[6px] [&_h1]:font-display [&_h1]:text-[28px] [&_h1]:leading-[1.25] [&_h1]:font-bold [&_h1]:text-ui-text [&_p]:m-0 max-[700px]:mb-[18px] max-[700px]:[&_h1]:text-[23px]"><p class="text-[11px] leading-[1.4] tracking-[.075em] font-bold text-ui-muted">APODERADO</p><h1 id="ui-s9-substitute-title" class="tracking-[-.025em]">Suplente del apoderado</h1><p class="text-[13px] leading-[1.5] text-ui-muted">Designa a una persona de confianza durante un periodo temporal.</p></header>
      } @else {
        <h2 id="ui-s9-substitute-title" class="sr-only">Suplencias registradas</h2>
      }
      @if (formError) { <ui-app-alert tone="error" title="Revisa la solicitud" [message]="formError" /> }
      @if (state === 'error') { <ui-app-alert tone="error" title="No se pudo cargar Mis solicitudes" [message]="errorMessage" /><button class="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-transparent px-4 py-2 text-center font-sans text-[14px] leading-[1.2] font-semibold no-underline transition-[background-color,border-color,color,box-shadow] duration-[140ms] [cursor:pointer] focus-visible:outline-3 focus-visible:outline-ui-focus focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:!border-ui-divider disabled:bg-ui-surface-soft disabled:text-ui-muted aria-disabled:cursor-not-allowed aria-disabled:!border-ui-divider aria-disabled:bg-ui-surface-soft aria-disabled:text-ui-muted !border-ui-divider bg-ui-surface text-ui-text hover:bg-ui-surface-soft mb-4 mt-2" type="button" (click)="retry.emit()">Reintentar</button> }
      @if (showForm) { <form class="mb-[18px] min-w-0 rounded-2xl border border-ui-divider bg-ui-surface p-5 shadow-[var(--ui-card-shadow)] max-[700px]:rounded-xl max-[700px]:px-[14px] max-[700px]:py-4 p-5" (submit)="$event.preventDefault(); submitRequested.emit(draft)">
        <div class="mb-4 flex items-start justify-between gap-3 [&_h2]:m-0 [&_h2]:mt-1 [&_h2]:font-display [&_h2]:text-lg [&_h2]:leading-[1.35] [&_h2]:font-semibold [&_h2]:text-ui-text [&_.text-\[11px\]]:m-0 max-[700px]:[&_h2]:text-[17px]"><div><p class="text-[11px] leading-[1.4] tracking-[.075em] font-bold text-ui-muted">AUTORIZACIÓN TEMPORAL</p><h2 class="tracking-[-.025em]">Datos del suplente</h2></div></div>
        <label class="flex min-w-0 flex-col gap-[7px] font-sans text-[13px] leading-[1.4] font-medium text-ui-muted [&>span]:text-ui-error-text [&_input]:box-border [&_input]:min-h-[44px] [&_input]:w-full [&_input]:min-w-0 [&_input]:max-w-full [&_input]:rounded-lg [&_input]:border [&_input]:border-ui-control-border [&_input]:bg-ui-surface [&_input]:px-3 [&_input]:py-[10px] [&_input]:font-sans [&_input]:text-sm [&_input]:leading-[1.4] [&_input]:text-ui-text [&_input:focus]:border-ui-focus [&_input:focus]:outline-none [&_input:focus]:shadow-[0_0_0_3px_var(--ui-focus-shadow)] [&_input::placeholder]:text-ui-muted [&_select]:box-border [&_select]:min-h-[44px] [&_select]:w-full [&_select]:min-w-0 [&_select]:max-w-full [&_select]:rounded-lg [&_select]:border [&_select]:border-ui-control-border [&_select]:bg-ui-surface [&_select]:px-3 [&_select]:py-[10px] [&_select]:font-sans [&_select]:text-sm [&_select]:leading-[1.4] [&_select]:text-ui-text [&_textarea]:box-border [&_textarea]:min-h-[96px] [&_textarea]:w-full [&_textarea]:min-w-0 [&_textarea]:max-w-full [&_textarea]:resize-y [&_textarea]:rounded-lg [&_textarea]:border [&_textarea]:border-ui-control-border [&_textarea]:bg-ui-surface [&_textarea]:px-3 [&_textarea]:py-[10px] [&_textarea]:font-sans [&_textarea]:text-sm [&_textarea]:leading-[1.4] [&_textarea]:text-ui-text [&_textarea:focus]:border-ui-focus [&_textarea:focus]:outline-none [&_textarea:focus]:shadow-[0_0_0_3px_var(--ui-focus-shadow)] [&_textarea::placeholder]:text-ui-muted">Hijo *<select required [value]="draft.studentId ?? ''" (change)="updateDraft('studentId', +$any($event.target).value)"><option value="" disabled>Seleccionar hijo</option>@for (student of children; track student.id) { <option [value]="student.id">{{ student.fullName }} · {{ student.gradeLabel }}</option> }</select></label>
        <div class="mt-[15px] grid grid-cols-2 gap-[14px] max-[700px]:mt-[14px] max-[700px]:grid-cols-1 max-[700px]:gap-3">
          <label class="flex min-w-0 flex-col gap-[7px] font-sans text-[13px] leading-[1.4] font-medium text-ui-muted [&>span]:text-ui-error-text [&_input]:box-border [&_input]:min-h-[44px] [&_input]:w-full [&_input]:min-w-0 [&_input]:max-w-full [&_input]:rounded-lg [&_input]:border [&_input]:border-ui-control-border [&_input]:bg-ui-surface [&_input]:px-3 [&_input]:py-[10px] [&_input]:font-sans [&_input]:text-sm [&_input]:leading-[1.4] [&_input]:text-ui-text [&_input:focus]:border-ui-focus [&_input:focus]:outline-none [&_input:focus]:shadow-[0_0_0_3px_var(--ui-focus-shadow)] [&_input::placeholder]:text-ui-muted [&_select]:box-border [&_select]:min-h-[44px] [&_select]:w-full [&_select]:min-w-0 [&_select]:max-w-full [&_select]:rounded-lg [&_select]:border [&_select]:border-ui-control-border [&_select]:bg-ui-surface [&_select]:px-3 [&_select]:py-[10px] [&_select]:font-sans [&_select]:text-sm [&_select]:leading-[1.4] [&_select]:text-ui-text [&_textarea]:box-border [&_textarea]:min-h-[96px] [&_textarea]:w-full [&_textarea]:min-w-0 [&_textarea]:max-w-full [&_textarea]:resize-y [&_textarea]:rounded-lg [&_textarea]:border [&_textarea]:border-ui-control-border [&_textarea]:bg-ui-surface [&_textarea]:px-3 [&_textarea]:py-[10px] [&_textarea]:font-sans [&_textarea]:text-sm [&_textarea]:leading-[1.4] [&_textarea]:text-ui-text [&_textarea:focus]:border-ui-focus [&_textarea:focus]:outline-none [&_textarea:focus]:shadow-[0_0_0_3px_var(--ui-focus-shadow)] [&_textarea::placeholder]:text-ui-muted">Nombre completo *<input appFormatoEntrada="nombre" required autocomplete="name" [value]="draft.fullName" (input)="updateDraft('fullName', $any($event.target).value)" /></label>
          <div class="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-end gap-2"><label class="flex min-w-0 flex-col gap-[7px] font-sans text-[13px] leading-[1.4] font-medium text-ui-muted [&_input]:box-border [&_input]:min-h-11 [&_input]:w-full [&_input]:min-w-0 [&_input]:rounded-lg [&_input]:border [&_input]:border-ui-control-border [&_input]:bg-ui-surface [&_input]:px-3 [&_input]:py-[10px] [&_input]:text-sm [&_input]:text-ui-text">DNI *<input appFormatoEntrada="dni" required inputmode="numeric" maxlength="8" pattern="[0-9]{8}" placeholder="8 dígitos" [value]="draft.dni" (input)="updateDraft('dni', $any($event.target).value)" /></label><button class="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-ui-divider bg-ui-surface-soft px-3 text-sm font-semibold text-ui-text transition-colors hover:bg-ui-surface focus-visible:outline-3 focus-visible:outline-ui-focus focus-visible:outline-offset-2 disabled:opacity-50" type="button" (click)="solicitarConsultaDni()" [disabled]="dniLookupBusy || !dniValido()"><svg class="h-5 w-5 shrink-0" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="10.8" cy="10.8" r="6.3"></circle><path d="m15.5 15.5 4.2 4.2"></path></svg>{{ dniLookupBusy ? 'Consultando…' : 'Consultar DNI' }}</button></div>
          @if (dniLookupMessage) { <p class="md:col-span-2 text-sm text-ui-muted" role="status" aria-live="polite">{{ dniLookupMessage }}</p> }
          <label class="flex min-w-0 flex-col gap-[7px] font-sans text-[13px] leading-[1.4] font-medium text-ui-muted [&>span]:text-ui-error-text [&_select]:box-border [&_select]:min-h-[44px] [&_select]:w-full [&_select]:min-w-0 [&_select]:max-w-full [&_select]:rounded-lg [&_select]:border [&_select]:border-ui-control-border [&_select]:bg-ui-surface [&_select]:px-3 [&_select]:py-[10px] [&_select]:font-sans [&_select]:text-sm [&_select]:leading-[1.4] [&_select]:text-ui-text">Parentesco *<select required [value]="draft.relationship" (change)="updateDraft('relationship', $any($event.target).value)"><option value="" disabled>Selecciona parentesco</option>@for (rel of parentescosComunes; track rel) { <option [value]="rel">{{ rel }}</option> }@if (draft.relationship && !parentescosComunes.includes(draft.relationship)) { <option [value]="draft.relationship">{{ draft.relationship }}</option> }</select></label>
          <label class="flex min-w-0 flex-col gap-[7px] font-sans text-[13px] leading-[1.4] font-medium text-ui-muted [&>span]:text-ui-error-text [&_input]:box-border [&_input]:min-h-[44px] [&_input]:w-full [&_input]:min-w-0 [&_input]:max-w-full [&_input]:rounded-lg [&_input]:border [&_input]:border-ui-control-border [&_input]:bg-ui-surface [&_input]:px-3 [&_input]:py-[10px] [&_input]:font-sans [&_input]:text-sm [&_input]:leading-[1.4] [&_input]:text-ui-text [&_input:focus]:border-ui-focus [&_input:focus]:outline-none [&_input:focus]:shadow-[0_0_0_3px_var(--ui-focus-shadow)] [&_input::placeholder]:text-ui-muted">Teléfono *<input maxlength="9" inputmode="numeric" appFormatoEntrada="celular" required type="tel" autocomplete="tel" [value]="draft.phone" (input)="updateDraft('phone', $any($event.target).value)" /></label>
          <label class="flex min-w-0 flex-col gap-[7px] font-sans text-[13px] leading-[1.4] font-medium text-ui-muted [&>span]:text-ui-error-text [&_input]:box-border [&_input]:min-h-[44px] [&_input]:w-full [&_input]:min-w-0 [&_input]:max-w-full [&_input]:rounded-lg [&_input]:border [&_input]:border-ui-control-border [&_input]:bg-ui-surface [&_input]:px-3 [&_input]:py-[10px] [&_input]:font-sans [&_input]:text-sm [&_input]:leading-[1.4] [&_input]:text-ui-text [&_input:focus]:border-ui-focus [&_input:focus]:outline-none [&_input:focus]:shadow-[0_0_0_3px_var(--ui-focus-shadow)] [&_input::placeholder]:text-ui-muted">Fecha de inicio *<app-ui-calendar [ngModel]="draft.startDate" (ngModelChange)="updateDraft('startDate', $event)" name="startDate" [required]="true" aria-label="Fecha de inicio"></app-ui-calendar></label>
          <label class="flex min-w-0 flex-col gap-[7px] font-sans text-[13px] leading-[1.4] font-medium text-ui-muted [&>span]:text-ui-error-text [&_input]:box-border [&_input]:min-h-[44px] [&_input]:w-full [&_input]:min-w-0 [&_input]:max-w-full [&_input]:rounded-lg [&_input]:border [&_input]:border-ui-control-border [&_input]:bg-ui-surface [&_input]:px-3 [&_input]:py-[10px] [&_input]:font-sans [&_input]:text-sm [&_input]:leading-[1.4] [&_input]:text-ui-text [&_input:focus]:border-ui-focus [&_input:focus]:outline-none [&_input:focus]:shadow-[0_0_0_3px_var(--ui-focus-shadow)] [&_input::placeholder]:text-ui-muted">Fecha de fin *<app-ui-calendar [ngModel]="draft.endDate" (ngModelChange)="updateDraft('endDate', $event)" name="endDate" [required]="true" aria-label="Fecha de fin"></app-ui-calendar></label>
        </div>
        <p class="mt-3 text-[13px] leading-[1.5] text-ui-muted">La solicitud debe ser validada por Dirección antes de entrar en vigor.</p>
        <div class="mt-[18px] flex justify-end gap-[10px] max-[700px]:grid max-[700px]:grid-cols-1 [&>button]:text-sm [&>button]:leading-[1.2] max-[700px]:[&>button]:w-full"><button class="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-transparent px-4 py-2 text-center font-sans text-[14px] leading-[1.2] font-semibold no-underline transition-[background-color,border-color,color,box-shadow] duration-[140ms] [cursor:pointer] focus-visible:outline-3 focus-visible:outline-ui-focus focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:!border-ui-divider disabled:bg-ui-surface-soft disabled:text-ui-muted aria-disabled:cursor-not-allowed aria-disabled:!border-ui-divider aria-disabled:bg-ui-surface-soft aria-disabled:text-ui-muted bg-ui-action text-ui-action-text hover:opacity-90" type="submit">Enviar solicitud</button></div>
      </form> }
      <section class="min-w-0 rounded-2xl border border-ui-divider bg-ui-surface p-5 shadow-[var(--ui-card-shadow)] max-[700px]:rounded-xl max-[700px]:px-[14px] max-[700px]:py-4" aria-labelledby="ui-s9-substitute-list-title">
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="m-0 text-[11px] leading-[1.4] tracking-[.075em] font-bold text-ui-muted uppercase">Historial institucional</p>
            <h2 id="ui-s9-substitute-list-title" class="m-0 mt-1 font-display text-lg leading-[1.35] font-semibold text-ui-text tracking-[-.025em]">Suplencias registradas</h2>
          </div>
          <span class="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
            {{ requests.length }} registro{{ requests.length === 1 ? '' : 's' }}
          </span>
        </div>
        @if (state === 'loading') { <ui-list-state state="loading" title="Cargando solicitudes" /> }
        @else if (state === 'empty') { <ui-list-state state="empty" title="Aún no tienes solicitudes" message="Las autorizaciones de recojo que registres aparecerán aquí con su estado actualizado." /> }
        @else if (state === 'normal') {
          <div class="w-full overflow-x-auto overscroll-x-contain rounded-xl border border-slate-200/80">
            <table class="w-full min-w-[680px] border-collapse text-left text-[13px] [&_th]:border-b [&_th]:border-ui-divider [&_th]:px-3 [&_th]:py-3 [&_th]:text-[11px] [&_th]:font-bold [&_th]:tracking-[.06em] [&_th]:text-ui-muted [&_th]:uppercase [&_td]:border-b [&_td]:border-ui-divider [&_td]:px-3 [&_td]:py-3.5 [&_td]:align-middle [&_td]:text-ui-text [&_tbody_tr:last-child_td]:border-b-0 [&_thead]:!bg-ui-surface-soft [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:!bg-slate-50/90" data-mobile-table-cards="">
              <thead>
                <tr>
                  <th>Estudiante</th>
                  <th>Adulto autorizado</th>
                  <th>DNI</th>
                  <th>Vigencia</th>
                  <th>Estado</th>
                  <th class="text-right">Ficha</th>
                </tr>
              </thead>
              <tbody>
                @for (request of requestsPaginados; track request.id) {
                  <tr>
                    <td data-label="Estudiante" class="font-semibold text-[#14213d]">{{ request.studentName }}</td>
                    <td data-label="Adulto autorizado">
                      <div class="flex items-center gap-2.5">
                        <span class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#173B67]/10 text-xs font-extrabold text-[#173B67]">
                          {{ iniciales(request.fullName) }}
                        </span>
                        <div class="min-w-0">
                          <strong class="block font-semibold text-[#14213d] truncate">{{ request.fullName }}</strong>
                          <small class="block text-xs text-slate-500">{{ request.relationship || 'Familiar' }} · {{ request.phone }}</small>
                        </div>
                      </div>
                    </td>
                    <td data-label="DNI" class="font-mono text-xs font-semibold text-slate-700 tabular-nums">{{ request.dni }}</td>
                    <td data-label="Vigencia">
                      <span class="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 tabular-nums">
                        {{ request.startDate | uiDatePe }} – {{ request.endDate | uiDatePe }}
                      </span>
                    </td>
                    <td data-label="Estado"><ui-status-badge [label]="statusLabel(request.status)" [tone]="statusTone(request.status)" /></td>
                    <td data-label="Ficha" class="text-right">
                      <button class="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-[#173B67] shadow-2xs transition hover:bg-slate-50 cursor-pointer whitespace-nowrap" type="button" (click)="detailsRequested.emit(request.id)">
                        Ver detalle
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <ui-paginacion [totalRegistros]="requests.length" [paginaActual]="paginaActual" [tamanoPagina]="10" etiqueta="solicitudes" ariaLabel="Paginación de suplencias registradas" (cambioPagina)="paginaActual = $event" />
        }
      </section>
    </section>
  `,
encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuplenteApoderadoComponent {
  readonly parentescosComunes = [
    'Abuelo(a)',
    'Tío(a)',
    'Hermano(a) mayor de edad',
    'Primo(a) mayor de edad',
    'Apoderado alterno / Familiar responsable',
    'Tutor familiar autorizado'
  ];
  @Input() hideHeader = false;
  @Input() showForm = true;
  @Input() state: Stage9State = 'empty';
  @Input() errorMessage = 'Intenta cargar las solicitudes otra vez.';
  @Input() formError = '';
  @Input() dniLookupBusy = false;
  @Input() dniLookupMessage = '';
  @Input() children: Stage9StudentOption[] = [];
  @Input() draft: Stage9SubstituteDraft = { studentId: null, fullName: '', dni: '', relationship: '', phone: '', startDate: '', endDate: '' };
  @Input() requests: Stage9SubstituteRequest[] = [];
  paginaActual = 1;
  get requestsPaginados(): Stage9SubstituteRequest[] { return paginarRegistros(this.requests, this.paginaActual, 10); }
  @Output() readonly draftChange = new EventEmitter<Stage9SubstituteDraft>();
  @Output() readonly submitRequested = new EventEmitter<Stage9SubstituteDraft>();
  @Output() readonly dniLookupRequested = new EventEmitter<string>();
  @Output() readonly detailsRequested = new EventEmitter<number>();
  @Output() readonly retry = new EventEmitter<void>();

  iniciales(nombre: string): string {
    const partes = (nombre || '').trim().split(/\s+/).filter(Boolean);
    if (partes.length === 0) return 'S';
    return ((partes[0][0] ?? '') + (partes[1]?.[0] ?? '')).toUpperCase();
  }

  statusLabel(status: Stage9SubstituteRequest['status']): string { return status.replaceAll('_', ' '); }
  statusTone(status: Stage9SubstituteRequest['status']): 'success' | 'warning' | 'error' | 'info' {
    return status === 'ACTIVO' ? 'success' : status === 'VENCIDO' || status === 'RECHAZADO' || status === 'REVOCADO' ? 'error' : 'warning';
  }

  updateDraft<K extends keyof Stage9SubstituteDraft>(key: K, value: Stage9SubstituteDraft[K]): void {
    this.draftChange.emit({ ...this.draft, [key]: value });
  }

  dniValido(): boolean { return /^\d{8}$/.test(this.draft.dni); }

  solicitarConsultaDni(): void {
    if (this.dniValido() && !this.dniLookupBusy) this.dniLookupRequested.emit(this.draft.dni);
  }
}
