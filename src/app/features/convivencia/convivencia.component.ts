import { Component, ElementRef, inject, signal, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConvivenciaService } from '../../core/services/convivencia.service';
import { UiDatePePipe } from '../../shared/ui/ui-date-pe.pipe';
import { AuthStore } from '../../core/state/auth.store';

export interface IncidenciaEscolar {
  id: number;
  matriculaId: number;
  fecha: string;
  tipoFalta: string;
  descripcion: string;
  reportadoPor: string;
  citacionPadre: boolean | null;
  estado: string;
  nombreEstudiante: string;
}

@Component({
  selector: 'app-convivencia',
  standalone: true,
  imports: [CommonModule, FormsModule, UiDatePePipe],
template: `
    <div class="space-y-6 min-w-0 font-sans text-ui-text [&_button]:min-h-11 [&_input]:min-h-11 [&_select]:min-h-11 [&_textarea]:min-h-11 [&_:focus-visible]:outline-[3px] [&_:focus-visible]:outline-[var(--ui-action)] [&_:focus-visible]:outline-offset-[3px] [&_.grid>div]:min-w-0 [&_.grid>article]:min-w-0">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t-[3px] border-[var(--ui-gold)]/50 pt-3">
        <div>
          <h2 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-ui-text tracking-[-.025em]">Convivencia Escolar & Tutoría</h2>
          <p class="text-sm text-ui-muted mt-1">
            Libro de incidencias, seguimiento formativo de estudiantes y citaciones registradas en la base de datos.
          </p>
        </div>
        <div class="flex items-center gap-3">
          @if (authStore.hasRole('TUTOR')) {
          <button
            (click)="nuevaIncidencia()"
            class="px-4 py-2.5 rounded-xl bg-ui-action hover:bg-ui-action text-ui-action-text font-semibold text-xs !text-[11px] sm:!text-[11px] shadow-lg shadow-card transition flex items-center gap-2 cursor-pointer max-[640px]:w-full box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>Registrar Incidencia en BD</span>
          </button>
          }
        </div>
      </div>

      @if (error()) { <p class="text-ui-error-text text-sm" role="alert">{{ error() }}</p> }
      @if (mensaje()) { <p class="text-ui-success-text text-sm" role="status">{{ mensaje() }}</p> }
      <dialog #incidenciaDialog class="box-border w-[min(680px,calc(100vw-24px))] max-w-[calc(100vw-24px)] max-h-[calc(100dvh-24px)] overflow-hidden border border-ui-divider rounded-[22px] bg-ui-surface text-ui-text p-0 shadow-dialog backdrop:bg-[rgb(12_24_43_/_46%)] backdrop:backdrop-blur-[3px] max-[639px]:w-[calc(100vw-16px)] max-[639px]:max-w-[calc(100vw-16px)] max-[639px]:max-h-[calc(100dvh-16px)] max-[639px]:rounded-[18px] !w-[min(620px,calc(100vw_-_24px))] !max-w-[calc(100vw_-_24px)] !max-h-[calc(100dvh_-_24px)] !overflow-auto" aria-labelledby="incidencia-dialog-title">
        <div class="flex max-h-[calc(100dvh-24px)] min-h-0 flex-col"><header class="flex flex-[0_0_auto] items-center justify-between gap-4 border-b border-ui-divider px-6 py-5 [&_h3]:m-0 [&_h3]:text-ui-text [&_h3]:text-lg [&_h3]:leading-[27px] [&_h3]:font-[750] [&_p]:mb-0 [&_p]:mt-1 [&_p]:text-ui-muted [&_p]:text-xs [&_p]:leading-[1.5] max-[639px]:p-4"><div><h3 id="incidencia-dialog-title" class="tracking-[-.025em]">Registrar incidencia escolar</h3><p>Documenta el hecho y define si requiere citación.</p></div><button type="button" class="min-h-11 rounded-xl border border-ui-divider bg-ui-surface-soft px-4 font-semibold text-ui-text !grid !h-11 !w-11 !min-h-11 !min-w-11 !flex-none !place-items-center !p-0 !font-[650]" (click)="cerrarDialogo()" aria-label="Cerrar">✕</button></header>
          <form (ngSubmit)="registrar()" class="flex min-h-0 flex-[1_1_auto] flex-col"><div class="min-h-0 flex-[1_1_auto] overflow-auto overscroll-contain px-6 py-5 max-[639px]:p-4 space-y-4">
            @if (error()) { <p class="m-0 rounded-xl border border-ui-error-border bg-ui-error-bg px-3 py-[10px] text-xs text-ui-error-text" role="alert">{{ error() }}</p> }
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label class="block min-w-0 text-xs font-semibold leading-normal text-ui-muted [&_input]:mt-[6px] [&_input]:block [&_input]:w-full [&_select]:mt-[6px] [&_select]:block [&_select]:w-full [&_textarea]:mt-[6px] [&_textarea]:block [&_textarea]:w-full">Matrícula ID *<input type="number" [(ngModel)]="matriculaId" name="matricula" min="1" required class="min-w-0 !min-h-[46px] max-w-full border px-3 py-[10px] !border-ui-control-border rounded-xl !bg-ui-surface !text-ui-text transition-colors focus:border-[var(--ui-focus)] focus:outline-none focus:shadow-[0_0_0_3px_var(--ui-focus-shadow)] max-[639px]:text-base !font-[650]"></label>
              <label class="block min-w-0 text-xs font-semibold leading-normal text-ui-muted [&_input]:mt-[6px] [&_input]:block [&_input]:w-full [&_select]:mt-[6px] [&_select]:block [&_select]:w-full [&_textarea]:mt-[6px] [&_textarea]:block [&_textarea]:w-full">Fecha *<input type="date" [(ngModel)]="fechaIncidencia" name="fecha" required class="min-w-0 !min-h-[46px] max-w-full border px-3 py-[10px] !border-ui-control-border rounded-xl !bg-ui-surface !text-ui-text transition-colors focus:border-[var(--ui-focus)] focus:outline-none focus:shadow-[0_0_0_3px_var(--ui-focus-shadow)] max-[639px]:text-base !font-[650]"></label>
              <label class="block min-w-0 text-xs font-semibold leading-normal text-ui-muted [&_input]:mt-[6px] [&_input]:block [&_input]:w-full [&_select]:mt-[6px] [&_select]:block [&_select]:w-full [&_textarea]:mt-[6px] [&_textarea]:block [&_textarea]:w-full sm:col-span-2">Tipo de falta<select [(ngModel)]="tipoFalta" name="tipoFalta" class="min-w-0 !min-h-[46px] max-w-full border px-3 py-[10px] !border-ui-control-border rounded-xl !bg-ui-surface !text-ui-text transition-colors focus:border-[var(--ui-focus)] focus:outline-none focus:shadow-[0_0_0_3px_var(--ui-focus-shadow)] max-[639px]:text-base !font-[650]"><option value="LEVE">Leve</option><option value="GRAVE">Grave</option><option value="MUY_GRAVE">Muy grave</option></select></label>
              <label class="block min-w-0 text-xs font-semibold leading-normal text-ui-muted [&_input]:mt-[6px] [&_input]:block [&_input]:w-full [&_select]:mt-[6px] [&_select]:block [&_select]:w-full [&_textarea]:mt-[6px] [&_textarea]:block [&_textarea]:w-full sm:col-span-2">Descripción *<textarea [(ngModel)]="descripcion" name="descripcion" required maxlength="10000" rows="4" placeholder="Describe lo ocurrido con lenguaje objetivo" class="min-w-0 max-w-full border px-3 py-[10px] !border-ui-control-border rounded-xl !bg-ui-surface !text-ui-text transition-colors focus:border-[var(--ui-focus)] focus:outline-none focus:shadow-[0_0_0_3px_var(--ui-focus-shadow)] max-[639px]:text-base py-[10px] resize-y !min-h-[110px] !font-[650]"></textarea></label>
              <label class="inline-flex items-center gap-3 text-sm text-ui-text sm:col-span-2"><input type="checkbox" class="w-[18px] accent-[var(--ui-action)] !font-[650]" [(ngModel)]="requiereCitacion" name="requiereCitacion"> Requiere citación al apoderado</label>
            </div>
          </div><footer class="sticky bottom-0 z-[1] flex flex-[0_0_auto] flex-wrap justify-end gap-[10px] border-t border-ui-divider bg-ui-surface px-6 py-[14px] max-[639px]:px-4 max-[639px]:py-3 max-[639px]:[&>button]:flex-[1_1_auto]"><button type="button" class="rounded-xl border border-ui-divider bg-ui-surface-soft px-4 font-semibold text-ui-text max-[640px]:w-full box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]" (click)="cerrarDialogo()">Cancelar</button><button type="submit" [disabled]="guardando()" class="rounded-xl bg-ui-action px-[18px] font-bold text-ui-action-text shadow-card disabled:cursor-wait disabled:opacity-[.55] max-[640px]:w-full box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]">{{ guardando() ? 'Guardando…' : 'Registrar incidencia' }}</button></footer></form>
        </div>
      </dialog>

      <!-- Incidents Table -->
      <div class="rounded-2xl bg-ui-surface border border-ui-divider overflow-hidden shadow-sm">
        <div class="px-4 py-4 sm:px-6 bg-ui-surface border-b border-ui-divider flex flex-wrap items-center justify-between gap-3">
          <h3 class="text-sm font-bold text-ui-text tracking-[-.025em]">Registro Formativo y Medidas Correctivas</h3>
          <button
            (click)="cargarIncidencias()"
            class="px-3 py-1.5 rounded-xl bg-ui-surface-soft hover:bg-ui-divider text-ui-text text-xs !text-[11px] font-semibold cursor-pointer max-[640px]:w-full box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]"
          >
            Actualizar BD
          </button>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full min-w-[850px] max-[640px]:min-w-[760px] text-left text-xs !text-[11px] [&_thead]:!bg-ui-surface-soft [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:!bg-ui-surface-soft" data-mobile-table-cards="">
            <thead class="bg-ui-surface-soft border-b border-ui-divider text-ui-muted uppercase tracking-wider font-semibold">
              <tr>
                <th class="px-5 py-3.5">ID BD</th>
                <th class="px-5 py-3.5">Estudiante</th>
                <th class="px-5 py-3.5">Fecha</th>
                <th class="px-5 py-3.5">Tipo Falta</th>
                <th class="px-5 py-3.5">Detalle Formativo</th>
                <th class="px-5 py-3.5">Citación</th>
                <th class="px-5 py-3.5">Estado en BD</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[var(--ui-divider)] text-ui-text">
              @if (cargando()) {
                <tr>
                  <td colspan="7" class="text-center py-10 text-ui-muted">
                    <span class="inline-block w-5 h-5 border-2 border-ui-action/30 border-t-ui-action rounded-full animate-spin mb-2"></span>
                    <p>Consultando incidencias formativas en la base de datos...</p>
                  </td>
                </tr>
              } @else {
                @for (item of incidencias(); track item.id) {
                  <tr class="!bg-ui-surface-soft hover:bg-ui-surface-soft transition">
                    <td class="px-5 py-3.5 font-mono text-ui-muted" data-label="ID BD">{{ item.id }}</td>
                    <td class="px-5 py-3.5 font-bold text-ui-text" data-label="Estudiante"><span>{{ item.nombreEstudiante || 'Estudiante' }}</span><small class="block text-xs font-normal text-ui-muted">Matrícula #{{ item.matriculaId }}</small></td>
                    <td class="px-5 py-3.5 font-mono !text-ui-muted" data-label="Fecha">{{ item.fecha | uiDatePe }}</td>
                    <td class="px-5 py-3.5" data-label="Tipo Falta">
                      <span class="px-2 py-0.5 rounded bg-ui-surface-soft text-ui-text">
                        {{ item.tipoFalta }}
                      </span>
                    </td>
                    <td class="px-5 py-3.5 text-ui-text max-w-xs truncate" [title]="item.descripcion" data-label="Detalle Formativo">
                      {{ item.descripcion }}
                    </td>
                    <td class="px-5 py-3.5" data-label="Citación">
                      @if (item.citacionPadre === true) {
                        <span class="text-ui-warning-text font-semibold text-[11px]">Citado a Dirección</span>
                      } @else if (item.citacionPadre === false) {
                        <span class="text-ui-muted text-[11px]">No requerida</span>
                      } @else {
                        <span class="text-ui-muted text-[11px]">Sin dato</span>
                      }
                    </td>
                    <td class="px-5 py-3.5" data-label="Estado en BD">
                      <span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-ui-success-bg border border-ui-success-border text-ui-success-text">
                        {{ item.estado }}
                      </span>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
        @if (!cargando() && !error() && incidencias().length === 0) {
          <div class="grid w-full justify-items-center gap-2 p-[36px_20px] text-center text-ui-muted whitespace-normal [overflow-wrap:anywhere] relative pt-[62px]">
            <p class="font-medium text-ui-muted">No se encontraron incidencias registradas en la base de datos.</p>
            <p class="text-[11px] text-ui-muted">Cuando existan observaciones, aparecerán aquí.</p>
          </div>
        }
      </div>
    </div>
  `
})
export class ConvivenciaComponent implements OnInit {
  private readonly convivenciaService = inject(ConvivenciaService);
  readonly authStore = inject(AuthStore);
  @ViewChild('incidenciaDialog') private incidenciaDialog!: ElementRef<HTMLDialogElement>;
  readonly error = signal<string | null>(null);
  readonly mensaje = signal<string | null>(null);
  readonly guardando = signal(false);
  matriculaId = 0;
  fechaIncidencia = new Date().toLocaleDateString('sv-SE');
  tipoFalta: 'LEVE' | 'GRAVE' | 'MUY_GRAVE' = 'LEVE';
  descripcion = '';
  requiereCitacion = false;

  cargando = signal(false);
  readonly incidencias = signal<IncidenciaEscolar[]>([]);

  ngOnInit(): void {
    this.cargarIncidencias();
  }

  cargarIncidencias(): void {
    this.error.set(null);
    this.cargando.set(true);
    this.convivenciaService.listarIncidencias().subscribe({
      next: (res) => {
        this.cargando.set(false);
        if (Array.isArray(res)) {
          this.incidencias.set(
            res.map(i => ({
              id: i.id,
              matriculaId: i.matriculaId,
              nombreEstudiante: i.nombreEstudiante,
              fecha: i.fechaIncidencia ? String(i.fechaIncidencia) : '-',
              tipoFalta: i.tipoFalta || '—',
              descripcion: i.descripcion || '',
              reportadoPor: i.reportadoPorUsuarioId ? `Usuario #${i.reportadoPorUsuarioId}` : '—',
              citacionPadre: i.requiereCitacion ?? null,
              estado: i.estado
            }))
          );
        } else {
          this.incidencias.set([]);
        }
      },
      error: () => {
        this.cargando.set(false);
        this.incidencias.set([]);
        this.error.set('No se pudieron cargar las observaciones de convivencia.');
      }
    });
  }

  nuevaIncidencia(): void {
    if (!this.authStore.hasRole('TUTOR')) return;
    this.error.set(null);
    this.mensaje.set(null);
    this.matriculaId = 0;
    this.fechaIncidencia = new Date().toLocaleDateString('sv-SE');
    this.descripcion = '';
    this.requiereCitacion = false;
    this.incidenciaDialog.nativeElement.showModal();
  }

  cerrarDialogo(): void { this.incidenciaDialog.nativeElement.close(); }

  registrar(): void {
    if (!this.authStore.hasRole('TUTOR')) return;
    if (!this.matriculaId || !this.fechaIncidencia || !this.descripcion.trim()) { this.error.set('Complete matrícula, fecha y descripción.'); return; }
    this.guardando.set(true); this.error.set(null);
    this.convivenciaService.registrarIncidencia({ matriculaId: this.matriculaId, fechaIncidencia: this.fechaIncidencia, tipoFalta: this.tipoFalta, descripcion: this.descripcion.trim(), requiereCitacion: this.requiereCitacion }).subscribe({
      next: () => { this.guardando.set(false); this.cerrarDialogo(); this.error.set(null); this.mensaje.set('Incidencia registrada correctamente.'); this.descripcion = ''; this.cargarIncidencias(); },
      error: err => { this.guardando.set(false); this.error.set(err?.error?.message ?? 'No se pudo registrar la incidencia.'); }
    });
  }
}
