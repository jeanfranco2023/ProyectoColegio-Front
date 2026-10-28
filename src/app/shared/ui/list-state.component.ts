import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

export type UiListState = 'loading' | 'empty' | 'error';

@Component({
  selector: 'ui-list-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="grid justify-items-center gap-3 rounded-2xl border border-ui-border bg-ui-surface p-8 text-center text-ui-text"
      [attr.aria-busy]="state === 'loading'"
      [attr.role]="state === 'error' ? 'alert' : 'status'"
      [attr.aria-live]="state === 'error' ? 'assertive' : 'polite'"
    >
      @if (state === 'loading') {
        <span class="sr-only">{{ resolvedTitle }}</span>
        <div class="grid w-full gap-3" aria-hidden="true">
          <span class="block h-4 w-full rounded-full bg-[linear-gradient(90deg,var(--ui-skeleton-base)_25%,var(--ui-skeleton-highlight)_50%,var(--ui-skeleton-base)_75%)] bg-[length:200%_100%] [animation:skeleton-shimmer_1.4s_ease-in-out_infinite]"></span>
          <span class="block h-4 w-[72%] rounded-full bg-[linear-gradient(90deg,var(--ui-skeleton-base)_25%,var(--ui-skeleton-highlight)_50%,var(--ui-skeleton-base)_75%)] bg-[length:200%_100%] [animation:skeleton-shimmer_1.4s_ease-in-out_infinite]"></span>
          <span class="block h-4 w-[44%] rounded-full bg-[linear-gradient(90deg,var(--ui-skeleton-base)_25%,var(--ui-skeleton-highlight)_50%,var(--ui-skeleton-base)_75%)] bg-[length:200%_100%] [animation:skeleton-shimmer_1.4s_ease-in-out_infinite]"></span>
        </div>
      } @else {
        @if (state === 'empty') {
          <svg class="h-[52px] w-[52px] fill-none stroke-ui-action [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.8]" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
            <path d="M7 11.5c5.5-2 11.2-1.4 17 1.8v25c-5.8-3.2-11.5-3.8-17-1.8z"></path>
            <path d="M41 11.5c-5.5-2-11.2-1.4-17 1.8v25c5.8-3.2 11.5-3.8 17-1.8z"></path>
            <path d="M24 13.3v25"></path>
            <path d="M12 17.5c2.4-.4 4.8-.1 7.2.8M12 22c2.4-.4 4.8-.1 7.2.8M29 18.3c2.4-.9 4.8-1.2 7.2-.8M29 22.8c2.4-.9 4.8-1.2 7.2-.8"></path>
          </svg>
        } @else {
          <svg class="h-[18px] w-[18px] fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.8]" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <circle cx="12" cy="12" r="9"></circle>
            <path [attr.d]="iconPath"></path>
          </svg>
        }
        <h3 class="m-0 font-sans text-lg leading-[1.35] font-semibold">{{ resolvedTitle }}</h3>
        <p class="m-0 max-w-[48ch] font-sans text-base leading-6 text-ui-muted">{{ message || resolvedMessage }}</p>
        @if (state === 'error') {
          <button class="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-ui-control-border bg-ui-surface px-4 py-2 text-center font-sans text-[14px] leading-[1.2] font-semibold text-ui-text no-underline transition-colors hover:bg-[#f4f6fb] focus-visible:outline-3 focus-visible:outline-[rgb(37_99_235_/_35%)] focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:border-ui-border disabled:bg-ui-surface-soft disabled:text-ui-muted" type="button" (click)="retry.emit()">
            {{ retryLabel }}
          </button>
        }
      }
    </section>
  `,
})
export class ListStateComponent {
  @Input() state: UiListState = 'empty';
  @Input() title = '';
  @Input() message = '';
  @Input() retryLabel = 'Reintentar';
  @Output() readonly retry = new EventEmitter<void>();

  get resolvedTitle(): string {
    if (this.title) {
      return this.title;
    }

    if (this.state === 'loading') {
      return 'Cargando';
    }

    return this.state === 'error' ? 'No se pudo cargar' : 'Sin resultados';
  }

  get resolvedMessage(): string {
    return this.state === 'error'
      ? 'Inténtalo de nuevo.'
      : 'No hay elementos para mostrar.';
  }

  get iconPath(): string {
    return this.state === 'error' ? 'm9 9 6 6m0-6-6 6' : 'M8 12h8';
  }
}
