import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

export type UiListState = 'loading' | 'empty' | 'error';

@Component({
  selector: 'ui-list-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="ui-list-state"
      [class.ui-list-state--loading]="state === 'loading'"
      [class.ui-list-state--empty]="state === 'empty'"
      [class.ui-list-state--error]="state === 'error'"
      [attr.aria-busy]="state === 'loading'"
      [attr.role]="state === 'error' ? 'alert' : 'status'"
      [attr.aria-live]="state === 'error' ? 'assertive' : 'polite'"
    >
      @if (state === 'loading') {
        <span class="ui-sr-only">{{ resolvedTitle }}</span>
        <div class="ui-list-state__skeleton" aria-hidden="true">
          <span class="ui-skeleton ui-skeleton--wide"></span>
          <span class="ui-skeleton ui-skeleton--medium"></span>
          <span class="ui-skeleton ui-skeleton--short"></span>
        </div>
      } @else {
        @if (state === 'empty') {
          <svg class="ui-list-state__icon ui-list-state__illustration" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
            <path d="M7 11.5c5.5-2 11.2-1.4 17 1.8v25c-5.8-3.2-11.5-3.8-17-1.8z"></path>
            <path d="M41 11.5c-5.5-2-11.2-1.4-17 1.8v25c5.8-3.2 11.5-3.8 17-1.8z"></path>
            <path d="M24 13.3v25"></path>
            <path d="M12 17.5c2.4-.4 4.8-.1 7.2.8M12 22c2.4-.4 4.8-.1 7.2.8M29 18.3c2.4-.9 4.8-1.2 7.2-.8M29 22.8c2.4-.9 4.8-1.2 7.2-.8"></path>
          </svg>
        } @else {
          <svg class="ui-list-state__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <circle cx="12" cy="12" r="9"></circle>
            <path [attr.d]="iconPath"></path>
          </svg>
        }
        <h3 class="ui-list-state__title">{{ resolvedTitle }}</h3>
        <p class="ui-list-state__message">{{ message || resolvedMessage }}</p>
        @if (state === 'error') {
          <button class="ui-button ui-button--secondary" type="button" (click)="retry.emit()">
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
