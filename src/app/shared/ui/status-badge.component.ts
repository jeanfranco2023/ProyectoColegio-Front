import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export type UiStatusTone = 'success' | 'warning' | 'error' | 'info';

@Component({
  selector: 'ui-status-badge',
  standalone: true,
  imports: [NgClass],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="inline-flex min-h-7 items-center gap-1 rounded-full border border-transparent px-2 py-[2px] font-sans text-[13px] leading-[1.25] font-semibold" [ngClass]="toneClasses">
      <svg class="h-[18px] w-[18px] shrink-0 fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.8]" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9"></circle><path [attr.d]="iconPath"></path></svg>
      <span>{{ label }}</span>
    </span>
  `,
})
export class StatusBadgeComponent {
  @Input() label = '';
  @Input() tone: UiStatusTone = 'info';

  get toneClasses(): string {
    switch (this.tone) {
      case 'success': return 'border-ui-success-border bg-ui-success-bg text-ui-success-text';
      case 'warning': return 'border-ui-warning-border bg-ui-warning-bg text-ui-warning-text';
      case 'error': return 'border-ui-error-border bg-ui-error-bg text-ui-error-text';
      default: return 'border-ui-info-border bg-ui-info-bg text-ui-info-text';
    }
  }

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
