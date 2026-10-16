import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export type UiStatusTone = 'success' | 'warning' | 'error' | 'info';

@Component({
  selector: 'ui-status-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="ui-status-badge"
      [class.ui-status-badge--success]="tone === 'success'"
      [class.ui-status-badge--warning]="tone === 'warning'"
      [class.ui-status-badge--error]="tone === 'error'"
      [class.ui-status-badge--info]="tone === 'info'"
    >
      <svg class="ui-status-badge__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx="12" cy="12" r="9"></circle>
        <path [attr.d]="iconPath"></path>
      </svg>
      <span>{{ label }}</span>
    </span>
  `,
})
export class StatusBadgeComponent {
  @Input() label = '';
  @Input() tone: UiStatusTone = 'info';

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
