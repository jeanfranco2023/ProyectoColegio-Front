import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export type UiAlertTone = 'success' | 'warning' | 'error' | 'info';

@Component({
  selector: 'ui-app-alert',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="ui-alert"
      [class.ui-alert--success]="tone === 'success'"
      [class.ui-alert--warning]="tone === 'warning'"
      [class.ui-alert--error]="tone === 'error'"
      [class.ui-alert--info]="tone === 'info'"
      [attr.role]="tone === 'error' ? 'alert' : 'status'"
      [attr.aria-live]="tone === 'error' ? 'assertive' : 'polite'"
    >
      <svg class="ui-alert__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx="12" cy="12" r="9"></circle>
        <path [attr.d]="iconPath"></path>
      </svg>
      <div class="ui-alert__content">
        @if (title) {
          <h3 class="ui-alert__title">{{ title }}</h3>
        }
        <p class="ui-alert__message">{{ message }}</p>
      </div>
    </section>
  `,
})
export class AppAlertComponent {
  @Input() title = '';
  @Input() message = '';
  @Input() tone: UiAlertTone = 'info';

  get iconPath(): string {
    switch (this.tone) {
      case 'success':
        return 'm8 12 2.5 2.5L16 9';
      case 'warning':
        return 'M12 8v5m0 3h.01';
      case 'error':
        return 'm9 9 6 6m0-6-6 6';
      default:
        return 'M12 11v5m0-9h.01';
    }
  }
}
