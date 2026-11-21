import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

/** Devuelve la porción de una lista correspondiente a la página (base 1). */
export function paginarRegistros<T>(lista: readonly T[], pagina: number, tamano = 10): T[] {
  const total = Math.max(1, Math.ceil(lista.length / tamano));
  const paginaSegura = Math.min(Math.max(1, pagina), total);
  const inicio = (paginaSegura - 1) * tamano;
  return lista.slice(inicio, inicio + tamano);
}

/** Calcula la página válida dentro de [1, totalPaginas]. */
export function clampPagina(pagina: number, totalRegistros: number, tamano = 10): number {
  const total = Math.max(1, Math.ceil(totalRegistros / tamano));
  return Math.min(Math.max(1, pagina), total);
}

export type PageToken = number | 'ellipsis-left' | 'ellipsis-right';

/** Barra unificada de paginación para todas las tablas del sistema. */
@Component({
  selector: 'ui-paginacion',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (totalRegistros() > 0) {
      <div class="px-5 py-3.5 bg-ui-surface border-t border-ui-divider flex flex-wrap items-center justify-between gap-4">
        <div class="text-xs text-ui-muted">
          Página <span class="font-bold text-ui-text">{{ paginaSegura() }}</span> de <span class="font-bold text-ui-text">{{ totalPaginas() }}</span>
        </div>

        <nav class="flex flex-wrap items-center gap-1.5" [attr.aria-label]="ariaLabel()">
          <button
            type="button"
            [disabled]="paginaSegura() <= 1"
            (click)="irA(paginaSegura() - 1)"
            class="px-3 py-1.5 rounded-lg border border-ui-divider bg-ui-surface text-xs font-semibold text-ui-action disabled:opacity-40 disabled:cursor-not-allowed hover:bg-ui-surface-soft transition cursor-pointer"
          >
            « Anterior
          </button>

          @for (token of tokens(); track token) {
            @if (token === 'ellipsis-left' || token === 'ellipsis-right') {
              <span class="px-1.5 text-xs font-semibold text-ui-muted select-none" aria-hidden="true">…</span>
            } @else {
              <button
                type="button"
                (click)="irA(token)"
                [attr.aria-current]="token === paginaSegura() ? 'page' : null"
                [class]="token === paginaSegura()
                  ? 'min-w-8 h-8 px-2 rounded-lg bg-ui-action text-ui-action-text text-xs font-bold cursor-pointer'
                  : 'min-w-8 h-8 px-2 rounded-lg border border-ui-divider bg-ui-surface text-xs font-semibold text-ui-text hover:bg-ui-surface-soft transition cursor-pointer'"
              >
                {{ token }}
              </button>
            }
          }

          <button
            type="button"
            [disabled]="paginaSegura() >= totalPaginas()"
            (click)="irA(paginaSegura() + 1)"
            class="px-3 py-1.5 rounded-lg border border-ui-divider bg-ui-surface text-xs font-semibold text-ui-action disabled:opacity-40 disabled:cursor-not-allowed hover:bg-ui-surface-soft transition cursor-pointer"
          >
            Siguiente »
          </button>
        </nav>
      </div>
    }
  `
})
export class UiPaginacionComponent {
  readonly totalRegistros = input.required<number>();
  readonly paginaActual = input.required<number>();
  readonly tamanoPagina = input<number>(10);
  readonly etiqueta = input<string>('registros');
  readonly ariaLabel = input<string>('Paginación de tabla');
  readonly cambioPagina = output<number>();

  readonly totalPaginas = computed(() => Math.max(1, Math.ceil(this.totalRegistros() / Math.max(1, this.tamanoPagina()))));

  readonly paginaSegura = computed(() => Math.min(Math.max(1, this.paginaActual()), this.totalPaginas()));

  readonly tokens = computed<PageToken[]>(() => {
    const total = this.totalPaginas();
    const actual = this.paginaSegura();
    if (total <= 7) {
      return Array.from({ length: total }, (_, idx) => idx + 1);
    }
    const items: PageToken[] = [1];
    const start = Math.max(2, actual - 1);
    const end = Math.min(total - 1, actual + 1);
    if (start > 2) items.push('ellipsis-left');
    for (let p = start; p <= end; p++) items.push(p);
    if (end < total - 1) items.push('ellipsis-right');
    items.push(total);
    return items;
  });

  irA(pagina: number): void {
    const total = this.totalPaginas();
    if (pagina >= 1 && pagina <= total && pagina !== this.paginaSegura()) {
      this.cambioPagina.emit(pagina);
    }
  }
}
