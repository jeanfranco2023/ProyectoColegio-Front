import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export type UiAlertTone = 'success' | 'warning' | 'error' | 'info';

@Component({
  selector: 'ui-app-alert',
  standalone: true,
  imports: [NgClass],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="flex items-start gap-3 rounded-lg border border-transparent px-4 py-3 font-sans text-base leading-6" [ngClass]="toneClasses" [attr.role]="tone === 'error' ? 'alert' : 'status'" [attr.aria-live]="tone === 'error' ? 'assertive' : 'polite'">
      <svg class="mt-0.5 h-[18px] w-[18px] shrink-0 fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.8]" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9"></circle><path [attr.d]="iconPath"></path></svg>
      <div class="min-w-0">@if (title) { <h3 class="mb-1 mt-0 font-bold">{{ title }}</h3> }<p class="m-0">{{ message }}</p></div>
    </section>
  `,
})
export class AppAlertComponent {
  @Input() title = '';
  @Input() message = '';
  @Input() tone: UiAlertTone = 'info';

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
