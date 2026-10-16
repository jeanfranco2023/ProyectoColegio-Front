import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'uiDatePe', standalone: true })
export class UiDatePePipe implements PipeTransform {
  transform(value: string | number | Date | null | undefined, includeTime = false): string {
    if (value == null || value === '') return '—';
    const dateOnly = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
    const date = value instanceof Date
      ? value
      : new Date(dateOnly ? `${value}T12:00:00-05:00` : value);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('es-PE', {
      day: '2-digit', month: 'short', year: 'numeric',
      ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {}),
      timeZone: 'America/Lima',
    }).format(date).replaceAll('.', '');
  }
}
