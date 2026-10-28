import { Component, ElementRef, inject, signal, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AcademicoService } from '../../core/services/academico.service';
import { AulaResponseDto, NivelResponseDto } from '../../core/models/academico.model';

const AULA_CODE_PREFIXES: Record<string, string> = {
  INIC: 'AULA_I_',
  PRIM: 'AULA_P_',
  SEC: 'AULA_S_'
};

export interface AulaItem {
  id: number;
  codigo: string;
  nombre: string;
  ubicacion: string;
  capacidad: number | null;
  activa: boolean | null;
}

export interface NivelItem {
  id: number;
  codigo: string;
  nombre: string;
}

@Component({
  selector: 'app-academico',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6 min-w-0 text-ui-text [&_*:focus-visible]:outline-[3px] [&_*:focus-visible]:outline-ui-focus [&_*:focus-visible]:outline-offset-[3px]">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t-[3px] border-t-ui-divider pt-3">
        <div>
          <h2 class="text-2xl sm:text-3xl font-extrabold tracking-tight !text-ui-text tracking-[-.025em]">Estructura Académica & Aulas</h2>
          <p class="text-sm !text-ui-muted mt-1">
            Configuración de niveles educativos, secciones, aforo físico y aulas registradas en la base de datos.
          </p>
        </div>
        <div class="flex items-center gap-3">
          <button
            (click)="abrirModalNuevaAula()"
            class="px-4 py-2.5 rounded-xl bg-ui-action hover:bg-ui-action/90 text-ui-action-text font-semibold !text-[11px] leading-[1.333333] sm:text-sm shadow-[var(--ui-card-shadow)] transition flex items-center gap-2 cursor-pointer max-[640px]:min-h-11 box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px] !leading-[1.25]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>Nueva Aula en BD</span>
          </button>
        </div>
      </div>

      @if (error()) { <p class="text-ui-error-text text-sm" role="alert">{{ error() }}</p> }
      <dialog #aulaDialog class="box-border w-[min(680px,calc(100vw-24px))] max-w-[calc(100vw-24px)] max-h-[calc(100dvh-24px)] overflow-hidden border border-ui-divider rounded-[22px] bg-ui-surface text-ui-text p-0 shadow-[0_28px_90px_rgb(15_31_57_/_28%)] backdrop:bg-[rgb(12_24_43_/_46%)] backdrop:backdrop-blur-[3px] max-[639px]:w-[calc(100vw-16px)] max-[639px]:max-w-[calc(100vw-16px)] max-[639px]:max-h-[calc(100dvh-16px)] max-[639px]:rounded-[18px]" aria-labelledby="aula-dialog-title">
        <div class="flex max-h-[calc(100dvh-24px)] min-h-0 flex-col">
          <header class="flex flex-[0_0_auto] items-center justify-between gap-4 border-b border-ui-divider px-6 py-5 [&_h3]:m-0 [&_h3]:text-ui-text [&_h3]:text-lg [&_h3]:leading-[27px] [&_h3]:font-[750] [&_p]:mb-0 [&_p]:mt-1 [&_p]:text-ui-muted [&_p]:text-xs [&_p]:leading-[1.5] max-[639px]:p-4">
            <div><h3 id="aula-dialog-title" class="tracking-[-.025em]">Registrar aula</h3><p>Completa los datos del ambiente escolar.</p></div>
            <button type="button" class="min-h-9 rounded-xl border border-ui-divider bg-ui-surface-soft px-3 !font-[650] text-ui-action !grid !h-11 !w-11 !min-w-11 !min-h-11 !place-items-center !py-0" (click)="cerrarDialogoAula()" aria-label="Cerrar">✕</button>
          </header>
          <form (ngSubmit)="crearAula()" class="flex min-h-0 flex-[1_1_auto] flex-col">
            <div class="min-h-0 flex-[1_1_auto] overflow-auto overscroll-contain px-6 py-5 max-[639px]:p-4 space-y-4">
              @if (error()) { <p class="m-0 rounded-xl border border-ui-error-border bg-ui-error-bg px-3 py-[10px] text-xs text-ui-error-text" role="alert">{{ error() }}</p> }
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label class="block min-w-0 text-xs font-semibold leading-normal text-ui-muted [&_input]:mt-[6px] [&_input]:block [&_input]:w-full [&_select]:mt-[6px] [&_select]:block [&_select]:w-full [&_textarea]:mt-[6px] [&_textarea]:block [&_textarea]:w-full">Código de aula *<input [(ngModel)]="codigo" name="codigo" required maxlength="30" placeholder="Ej. AULA-101" autocomplete="off" class="min-w-0 !min-h-[44px] max-w-full border px-3 py-[10px] !border-ui-control-border rounded-xl !bg-ui-surface !text-ui-text transition-colors focus:border-ui-focus focus:outline-none focus:shadow-[0_0_0_3px_var(--ui-focus)] max-[639px]:text-base !font-[650]"></label>
                <label class="block min-w-0 text-xs font-semibold leading-normal text-ui-muted [&_input]:mt-[6px] [&_input]:block [&_input]:w-full [&_select]:mt-[6px] [&_select]:block [&_select]:w-full [&_textarea]:mt-[6px] [&_textarea]:block [&_textarea]:w-full">Nombre de aula *<input [(ngModel)]="nombre" name="nombre" required maxlength="100" placeholder="Ej. Aula de 1.º A" class="min-w-0 !min-h-[44px] max-w-full border px-3 py-[10px] !border-ui-control-border rounded-xl !bg-ui-surface !text-ui-text transition-colors focus:border-ui-focus focus:outline-none focus:shadow-[0_0_0_3px_var(--ui-focus)] max-[639px]:text-base !font-[650]"></label>
                <label class="block min-w-0 text-xs font-semibold leading-normal text-ui-muted [&_input]:mt-[6px] [&_input]:block [&_input]:w-full [&_select]:mt-[6px] [&_select]:block [&_select]:w-full [&_textarea]:mt-[6px] [&_textarea]:block [&_textarea]:w-full sm:col-span-2">Ubicación<input [(ngModel)]="ubicacion" name="ubicacion" maxlength="150" placeholder="Pabellón, piso u otra referencia" class="min-w-0 !min-h-[44px] max-w-full border px-3 py-[10px] !border-ui-control-border rounded-xl !bg-ui-surface !text-ui-text transition-colors focus:border-ui-focus focus:outline-none focus:shadow-[0_0_0_3px_var(--ui-focus)] max-[639px]:text-base !font-[650]"></label>
                <label class="block min-w-0 text-xs font-semibold leading-normal text-ui-muted [&_input]:mt-[6px] [&_input]:block [&_input]:w-full [&_select]:mt-[6px] [&_select]:block [&_select]:w-full [&_textarea]:mt-[6px] [&_textarea]:block [&_textarea]:w-full">Capacidad *<input type="number" [(ngModel)]="capacidad" name="capacidad" min="1" max="200" required class="min-w-0 !min-h-[44px] max-w-full border px-3 py-[10px] !border-ui-control-border rounded-xl !bg-ui-surface !text-ui-text transition-colors focus:border-ui-focus focus:outline-none focus:shadow-[0_0_0_3px_var(--ui-focus)] max-[639px]:text-base !font-[650]"></label>
              </div>
            </div>
            <footer class="sticky bottom-0 z-[1] flex flex-[0_0_auto] flex-wrap justify-end gap-[10px] border-t border-ui-divider bg-ui-surface px-6 py-[14px] max-[639px]:px-4 max-[639px]:py-3 max-[639px]:[&>button]:flex-[1_1_auto]">
              <button type="button" class="rounded-xl border border-ui-divider bg-ui-surface-soft px-4 font-semibold text-ui-action max-[640px]:min-h-11 box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]" (click)="cerrarDialogoAula()">Cancelar</button>
              <button type="submit" [disabled]="guardando()" class="rounded-xl bg-ui-action px-[18px] font-bold text-ui-action-text shadow-[0_8px_18px_rgb(37_99_235_/_18%)] disabled:cursor-wait disabled:opacity-[.55] max-[640px]:min-h-11 box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]">{{ guardando() ? 'Guardando…' : 'Crear aula' }}</button>
            </footer>
          </form>
        </div>
      </dialog>

      <!-- Level Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div class="p-6 rounded-2xl !bg-ui-surface border !border-ui-divider">
          <div class="flex items-center justify-between">
            <span class="!text-[11px] leading-[1.333333] font-bold text-ui-muted uppercase tracking-wider">Nivel Inicial</span>
            <span class="px-2 py-0.5 rounded !text-[11px] !bg-ui-surface-soft !text-ui-muted border !border-ui-divider font-semibold">
              {{ contarAulasPorFiltro('INIC') }} Aulas
            </span>
          </div>
          <div class="text-2xl font-black !text-ui-text mt-3">{{ contarCapacidadPorFiltro('INIC') ?? '—' }} Capacidad</div>
          <p class="!text-[11px] leading-[1.333333] !text-ui-muted mt-1">Aulas de 3, 4 y 5 años configuradas en PostgreSQL</p>
        </div>

        <div class="p-6 rounded-2xl !bg-ui-surface border !border-ui-divider">
          <div class="flex items-center justify-between">
            <span class="!text-[11px] leading-[1.333333] font-bold text-ui-muted uppercase tracking-wider">Nivel Primaria</span>
            <span class="px-2 py-0.5 rounded !text-[11px] !bg-ui-surface-soft !text-ui-muted border !border-ui-divider font-semibold">
              {{ contarAulasPorFiltro('PRIM') }} Aulas
            </span>
          </div>
          <div class="text-2xl font-black !text-ui-text mt-3">{{ contarCapacidadPorFiltro('PRIM') ?? '—' }} Capacidad</div>
          <p class="!text-[11px] leading-[1.333333] !text-ui-muted mt-1">De 1° a 6° de Primaria registradas en PostgreSQL</p>
        </div>

        <div class="p-6 rounded-2xl !bg-ui-surface border !border-ui-divider">
          <div class="flex items-center justify-between">
            <span class="!text-[11px] leading-[1.333333] font-bold text-ui-action uppercase tracking-wider">Nivel Secundaria</span>
            <span class="px-2 py-0.5 rounded !text-[11px] bg-ui-surface-soft text-ui-muted border border-ui-divider font-semibold">
              {{ contarAulasPorFiltro('SEC') }} Aulas
            </span>
          </div>
          <div class="text-2xl font-black !text-ui-text mt-3">{{ contarCapacidadPorFiltro('SEC') ?? '—' }} Capacidad</div>
          <p class="!text-[11px] leading-[1.333333] !text-ui-muted mt-1">De 1° a 5° de Secundaria registradas en PostgreSQL</p>
        </div>
      </div>

      <!-- Classrooms List -->
      <div class="rounded-2xl !bg-ui-surface border !border-ui-divider overflow-hidden shadow-sm">
        <div class="px-6 py-4 !bg-ui-surface border-b !border-ui-divider flex items-center justify-between">
          <h3 class="text-sm font-bold !text-ui-text tracking-[-.025em]">Directorio de Aulas Físicas</h3>
          <button
            (click)="cargarDatos()"
            class="px-3 py-1.5 rounded-xl !bg-ui-surface-soft hover:bg-ui-divider !text-ui-action !text-[11px] leading-[1.333333] font-semibold cursor-pointer max-[640px]:min-h-11 box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px] !leading-[1.25]"
          >
            Actualizar BD
          </button>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full min-w-[680px] text-left !text-[11px] leading-[1.333333] [&_thead]:!bg-ui-surface-soft [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:!bg-[#f8faff]" data-mobile-table-cards="">
            <thead class="bg-ui-surface-soft border-b !border-ui-divider !text-ui-muted uppercase tracking-wider font-semibold">
              <tr>
                <th class="px-5 py-3.5">ID BD</th>
                <th class="px-5 py-3.5">Código Aula</th>
                <th class="px-5 py-3.5">Nombre & Ubicación</th>
                <th class="px-5 py-3.5">Capacidad Aforo</th>
                <th class="px-5 py-3.5 text-center">Estado en BD</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#edf0f5] !text-ui-action">
              @if (cargando()) {
                <tr>
                  <td colspan="5" class="text-center py-10 !text-ui-muted">
                    <span class="inline-block w-5 h-5 border-2 border-ui-divider border-t-ui-action rounded-full animate-spin mb-2"></span>
                    <p>Consultando infraestructura escolar en la base de datos...</p>
                  </td>
                </tr>
              } @else {
                @for (aula of aulas(); track aula.id) {
                  <tr class="!bg-ui-surface-soft hover:bg-ui-surface-soft transition">
                    <td class="px-5 py-3.5 font-mono !text-ui-muted" data-label="ID BD">{{ aula.id }}</td>
                    <td class="px-5 py-3.5 font-mono text-ui-action font-semibold" data-label="Código Aula">{{ aula.codigo }}</td>
                    <td class="px-5 py-3.5" data-label="Nombre & Ubicación">
                      <div class="font-bold !text-ui-text">{{ aula.nombre }}</div>
                      <div class="text-[11px] !text-ui-muted">{{ aula.ubicacion || 'Sin ubicación registrada' }}</div>
                    </td>
                    <td class="px-5 py-3.5 font-mono !text-ui-text" data-label="Capacidad Aforo">
                      {{ aula.capacidad == null ? 'Sin dato de capacidad' : aula.capacidad + ' vacantes' }}
                    </td>
                    <td class="px-5 py-3.5 text-center" data-label="Estado en BD">
                      @if (aula.activa === true) {
                        <span class="px-2.5 py-1 rounded-full !text-[11px] font-bold !bg-ui-surface-soft !text-ui-muted border !border-ui-divider">
                          ACTIVA
                        </span>
                      } @else if (aula.activa === false) {
                        <span class="px-2.5 py-1 rounded-full !text-[11px] font-bold !bg-ui-surface-soft !text-ui-muted border !border-ui-divider">
                          INACTIVA
                        </span>
                      } @else {
                        <span class="px-2.5 py-1 rounded-full !text-[11px] font-bold !bg-ui-surface-soft !text-ui-muted border !border-ui-divider">
                          SIN DATO
                        </span>
                      }
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
        @if (!cargando() && !error() && aulas().length === 0) {
          <div class="relative grid justify-items-center gap-2 w-full px-5 pt-[62px] pb-9 !text-ui-muted text-center whitespace-normal [overflow-wrap:anywhere]" data-illustration="crest">
            <svg aria-hidden="true" focusable="false" viewBox="0 0 48 48" fill="none" stroke="var(--ui-action)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="absolute top-3 left-1/2 h-[42px] w-[42px] -translate-x-1/2"><path d="M24 5 39 11v11c0 10-6.5 16-15 21C15.5 38 9 32 9 22V11z"/><path d="M15 18c3-1 6-.5 9 1.5v13c-3-2-6-2.5-9-1.5zM33 18c-3-1-6-.5-9 1.5v13c3-2 6-2.5 9-1.5z" stroke="var(--ui-action)"/></svg>
            <p class="m-0 max-w-full font-medium !text-ui-muted">No se encontraron aulas físicas en la base de datos.</p>
            <p class="text-[11px] !text-ui-muted">Configure los pabellones y aulas escolares en PostgreSQL para visualizar el directorio.</p>
          </div>
        }
      </div>
    </div>
  `
})
export class AcademicoComponent implements OnInit {
  private readonly academicoService = inject(AcademicoService);
  readonly error = signal<string | null>(null);
  readonly guardando = signal(false);
  codigo = '';
  nombre = '';
  ubicacion = '';
  capacidad = 1;

  cargando = signal(false);
  readonly aulas = signal<AulaItem[]>([]);
  readonly niveles = signal<NivelItem[]>([]);
  @ViewChild('aulaDialog') private aulaDialog!: ElementRef<HTMLDialogElement>;

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.error.set(null);
    this.cargando.set(true);
    this.academicoService.listarAulas().subscribe({
      next: (res: AulaResponseDto[]) => {
        this.cargando.set(false);
        if (Array.isArray(res)) {
          this.aulas.set(
            res.map(a => ({
              id: a.id,
              codigo: a.codigo,
              nombre: a.nombre,
              ubicacion: a.ubicacion,
              capacidad: a.capacidad ?? null,
              activa: a.activa ?? null
            }))
          );
        } else {
          this.aulas.set([]);
        }
      },
      error: () => {
        this.cargando.set(false);
        this.aulas.set([]);
        this.error.set('No se pudieron cargar las aulas.');
      }
    });

    this.academicoService.listarNiveles().subscribe({
      next: (res: NivelResponseDto[]) => {
        if (Array.isArray(res)) {
          this.niveles.set(res.map(n => ({ id: n.id, codigo: n.codigo, nombre: n.nombre })));
        } else {
          this.niveles.set([]);
        }
      },
      error: () => {
        this.niveles.set([]);
        this.error.set('No se pudieron cargar los niveles académicos.');
      }
    });
  }

  contarAulasPorFiltro(codigoPrefix: string): number {
    const prefix = AULA_CODE_PREFIXES[codigoPrefix] ?? codigoPrefix;
    return this.aulas().filter(a => a.codigo && a.codigo.toUpperCase().startsWith(prefix)).length;
  }

  contarCapacidadPorFiltro(codigoPrefix: string): number | null {
    const prefix = AULA_CODE_PREFIXES[codigoPrefix] ?? codigoPrefix;
    const aulas = this.aulas().filter(a => a.codigo && a.codigo.toUpperCase().startsWith(prefix));
    if (aulas.some(a => a.capacidad == null)) return null;
    return aulas.reduce((sum, a) => sum + (a.capacidad as number), 0);
  }

  abrirModalNuevaAula(): void {
    this.error.set(null);
    this.codigo = '';
    this.nombre = '';
    this.ubicacion = '';
    this.capacidad = 1;
    this.aulaDialog.nativeElement.showModal();
  }

  cerrarDialogoAula(): void {
    this.aulaDialog.nativeElement.close();
  }

  crearAula(): void {
    if (!this.codigo.trim() || !this.nombre.trim() || this.capacidad < 1) { this.error.set('Complete código, nombre y capacidad.'); return; }
    this.guardando.set(true); this.error.set(null);
    this.academicoService.crearAula({ codigo: this.codigo.trim(), nombre: this.nombre.trim(), ubicacion: this.ubicacion.trim(), capacidad: this.capacidad }).subscribe({
      next: () => { this.guardando.set(false); this.cerrarDialogoAula(); this.error.set(null); this.cargarDatos(); },
      error: err => { this.guardando.set(false); this.error.set(err?.error?.message ?? 'No se pudo crear el aula.'); }
    });
  }
}
