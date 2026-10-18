import { Component, ElementRef, inject, signal, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConvivenciaService } from '../../core/services/convivencia.service';
import { UiDatePePipe } from '../../shared/ui/ui-date-pe.pipe';

export interface IncidenciaEscolar {
  id: number;
  matriculaId: number;
  fecha: string;
  tipoFalta: string;
  descripcion: string;
  reportadoPor: string;
  citacionPadre: boolean | null;
  estado: string;
}

@Component({
  selector: 'app-convivencia',
  standalone: true,
  imports: [CommonModule, FormsModule, UiDatePePipe],
template: `
    <div class="space-y-6 min-w-0 font-inter text-[#172b4d] [&_button]:min-h-11 [&_input]:min-h-11 [&_select]:min-h-11 [&_textarea]:min-h-11 [&_:focus-visible]:outline-[3px] [&_:focus-visible]:outline-[#2864c5] [&_:focus-visible]:outline-offset-[3px] [&_.grid>div]:min-w-0 [&_.grid>article]:min-w-0">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t-[3px] border-[#c49a58]/50 pt-3">
        <div>
          <h2 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#14213d] tracking-[-.025em]">Convivencia Escolar & Tutoría</h2>
          <p class="text-sm text-[#59677a] mt-1">
            Libro de incidencias, seguimiento formativo de estudiantes y citaciones registradas en la base de datos.
          </p>
        </div>
        <div class="flex items-center gap-3">
          <button
            (click)="nuevaIncidencia()"
            class="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs !text-[11px] sm:!text-[11px] shadow-lg shadow-blue-600/30 transition flex items-center gap-2 cursor-pointer max-[640px]:w-full box-border inline-flex min-w-0 !min-h-[40px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>Registrar Incidencia en BD</span>
          </button>
        </div>
      </div>

      @if (error()) { <p class="text-[#b91c1c] text-sm" role="alert">{{ error() }}</p> }
      @if (mensaje()) { <p class="text-emerald-700 text-sm" role="status">{{ mensaje() }}</p> }
      <dialog #incidenciaDialog class="box-border w-[min(680px,calc(100vw-24px))] max-w-[calc(100vw-24px)] max-h-[calc(100dvh-24px)] overflow-hidden border border-[#e4eaf3] rounded-[22px] bg-white text-[#14213d] p-0 shadow-[0_28px_90px_rgb(15_31_57_/_28%)] backdrop:bg-[rgb(12_24_43_/_46%)] backdrop:backdrop-blur-[3px] max-[639px]:w-[calc(100vw-16px)] max-[639px]:max-w-[calc(100vw-16px)] max-[639px]:max-h-[calc(100dvh-16px)] max-[639px]:rounded-[18px] !w-[min(620px,calc(100vw_-_24px))] !max-w-[calc(100vw_-_24px)] !max-h-[calc(100dvh_-_24px)] !overflow-auto" aria-labelledby="incidencia-dialog-title">
        <div class="flex max-h-[calc(100dvh-24px)] min-h-0 flex-col"><header class="flex flex-[0_0_auto] items-center justify-between gap-4 border-b border-[#e5eaf2] px-6 py-5 [&_h3]:m-0 [&_h3]:text-[#14213d] [&_h3]:text-lg [&_h3]:leading-[27px] [&_h3]:font-[750] [&_p]:mb-0 [&_p]:mt-1 [&_p]:text-[#64748b] [&_p]:text-xs [&_p]:leading-[1.5] max-[639px]:p-4"><div><h3 id="incidencia-dialog-title" class="tracking-[-.025em]">Registrar incidencia escolar</h3><p>Documenta el hecho y define si requiere citación.</p></div><button type="button" class="min-h-11 rounded-xl border border-[#e5eaf2] bg-[#f5f7fb] px-4 font-semibold text-[#334155] !grid !h-11 !w-11 !min-h-11 !min-w-11 !flex-none !place-items-center !p-0 !font-[650]" (click)="cerrarDialogo()" aria-label="Cerrar">✕</button></header>
          <form (ngSubmit)="registrar()" class="flex min-h-0 flex-[1_1_auto] flex-col"><div class="min-h-0 flex-[1_1_auto] overflow-auto overscroll-contain px-6 py-5 max-[639px]:p-4 space-y-4">
            @if (error()) { <p class="m-0 rounded-xl border border-[#fecaca] bg-[#fef2f2] px-3 py-[10px] text-xs text-[#b91c1c]" role="alert">{{ error() }}</p> }
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label class="block min-w-0 text-xs font-semibold leading-normal text-[#475569] [&_input]:mt-[6px] [&_input]:block [&_input]:w-full [&_select]:mt-[6px] [&_select]:block [&_select]:w-full [&_textarea]:mt-[6px] [&_textarea]:block [&_textarea]:w-full">Matrícula ID *<input type="number" [(ngModel)]="matriculaId" name="matricula" min="1" required class="min-w-0 !min-h-[46px] max-w-full border px-3 py-[10px] !border-[#d9e1ec] rounded-xl !bg-white !text-[#14213d] transition-colors focus:border-[#5b83d6] focus:outline-none focus:shadow-[0_0_0_3px_rgb(59_110_214_/_13%)] max-[639px]:text-base !font-[650]"></label>
              <label class="block min-w-0 text-xs font-semibold leading-normal text-[#475569] [&_input]:mt-[6px] [&_input]:block [&_input]:w-full [&_select]:mt-[6px] [&_select]:block [&_select]:w-full [&_textarea]:mt-[6px] [&_textarea]:block [&_textarea]:w-full">Fecha *<input type="date" [(ngModel)]="fechaIncidencia" name="fecha" required class="min-w-0 !min-h-[46px] max-w-full border px-3 py-[10px] !border-[#d9e1ec] rounded-xl !bg-white !text-[#14213d] transition-colors focus:border-[#5b83d6] focus:outline-none focus:shadow-[0_0_0_3px_rgb(59_110_214_/_13%)] max-[639px]:text-base !font-[650]"></label>
              <label class="block min-w-0 text-xs font-semibold leading-normal text-[#475569] [&_input]:mt-[6px] [&_input]:block [&_input]:w-full [&_select]:mt-[6px] [&_select]:block [&_select]:w-full [&_textarea]:mt-[6px] [&_textarea]:block [&_textarea]:w-full sm:col-span-2">Tipo de falta<select [(ngModel)]="tipoFalta" name="tipoFalta" class="min-w-0 !min-h-[46px] max-w-full border px-3 py-[10px] !border-[#d9e1ec] rounded-xl !bg-white !text-[#14213d] transition-colors focus:border-[#5b83d6] focus:outline-none focus:shadow-[0_0_0_3px_rgb(59_110_214_/_13%)] max-[639px]:text-base !font-[650]"><option value="LEVE">Leve</option><option value="GRAVE">Grave</option><option value="MUY_GRAVE">Muy grave</option></select></label>
              <label class="block min-w-0 text-xs font-semibold leading-normal text-[#475569] [&_input]:mt-[6px] [&_input]:block [&_input]:w-full [&_select]:mt-[6px] [&_select]:block [&_select]:w-full [&_textarea]:mt-[6px] [&_textarea]:block [&_textarea]:w-full sm:col-span-2">Descripción *<textarea [(ngModel)]="descripcion" name="descripcion" required maxlength="10000" rows="4" placeholder="Describe lo ocurrido con lenguaje objetivo" class="min-w-0 max-w-full border px-3 py-[10px] !border-[#d9e1ec] rounded-xl !bg-white !text-[#14213d] transition-colors focus:border-[#5b83d6] focus:outline-none focus:shadow-[0_0_0_3px_rgb(59_110_214_/_13%)] max-[639px]:text-base py-[10px] resize-y !min-h-[110px] !font-[650]"></textarea></label>
              <label class="inline-flex items-center gap-3 text-sm text-slate-700 sm:col-span-2"><input type="checkbox" class="w-[18px] accent-[#2563eb] !font-[650]" [(ngModel)]="requiereCitacion" name="requiereCitacion"> Requiere citación al apoderado</label>
            </div>
          </div><footer class="sticky bottom-0 z-[1] flex flex-[0_0_auto] flex-wrap justify-end gap-[10px] border-t border-[#e5eaf2] bg-white px-6 py-[14px] max-[639px]:px-4 max-[639px]:py-3 max-[639px]:[&>button]:flex-[1_1_auto]"><button type="button" class="rounded-xl border border-[#e5eaf2] bg-[#f5f7fb] px-4 font-semibold text-[#334155] max-[640px]:w-full box-border inline-flex min-w-0 !min-h-[40px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]" (click)="cerrarDialogo()">Cancelar</button><button type="submit" [disabled]="guardando()" class="rounded-xl bg-[#2563eb] px-[18px] font-bold text-white shadow-[0_8px_18px_rgb(37_99_235_/_18%)] disabled:cursor-wait disabled:opacity-[.55] max-[640px]:w-full box-border inline-flex min-w-0 !min-h-[40px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]">{{ guardando() ? 'Guardando…' : 'Registrar incidencia' }}</button></footer></form>
        </div>
      </dialog>

      <!-- Incidents Table -->
      <div class="rounded-2xl bg-white border border-[#e5eaf2] overflow-hidden shadow-sm">
        <div class="px-4 py-4 sm:px-6 bg-white border-b border-[#e5eaf2] flex flex-wrap items-center justify-between gap-3">
          <h3 class="text-sm font-bold text-[#14213d] tracking-[-.025em]">Registro Formativo y Medidas Correctivas</h3>
          <button
            (click)="cargarIncidencias()"
            class="px-3 py-1.5 rounded-xl bg-[#f3f6fa] hover:bg-slate-700 text-[#34445d] text-xs !text-[11px] font-semibold cursor-pointer max-[640px]:w-full box-border inline-flex min-w-0 !min-h-[40px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]"
          >
            Actualizar BD
          </button>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full min-w-[850px] max-[640px]:min-w-[760px] text-left text-xs !text-[11px] [&_thead]:!bg-[#f7f9fc] [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:!bg-[#f8faff]" data-mobile-table-cards="">
            <thead class="bg-[#f5f7fb] border-b border-[#e5eaf2] text-[#59677a] uppercase tracking-wider font-semibold">
              <tr>
                <th class="px-5 py-3.5">ID BD</th>
                <th class="px-5 py-3.5">Matrícula ID</th>
                <th class="px-5 py-3.5">Fecha</th>
                <th class="px-5 py-3.5">Tipo Falta</th>
                <th class="px-5 py-3.5">Detalle Formativo</th>
                <th class="px-5 py-3.5">Citación</th>
                <th class="px-5 py-3.5">Estado en BD</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#edf0f5] text-[#34445d]">
              @if (cargando()) {
                <tr>
                  <td colspan="7" class="text-center py-10 text-[#59677a]">
                    <span class="inline-block w-5 h-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-2"></span>
                    <p>Consultando incidencias formativas en la base de datos...</p>
                  </td>
                </tr>
              } @else {
                @for (item of incidencias(); track item.id) {
                  <tr class="!bg-[#f1f4f9] hover:bg-[#f1f4f9] transition">
                    <td class="px-5 py-3.5 font-mono text-[#59677a]" data-label="ID BD">{{ item.id }}</td>
                    <td class="px-5 py-3.5 font-bold text-[#14213d]" data-label="Matrícula ID">Matrícula #{{ item.matriculaId }}</td>
                    <td class="px-5 py-3.5 font-mono !text-[#59677a]" data-label="Fecha">{{ item.fecha | uiDatePe }}</td>
                    <td class="px-5 py-3.5" data-label="Tipo Falta">
                      <span class="px-2 py-0.5 rounded bg-[#f3f6fa] text-[#34445d]">
                        {{ item.tipoFalta }}
                      </span>
                    </td>
                    <td class="px-5 py-3.5 text-[#34445d] max-w-xs truncate" [title]="item.descripcion" data-label="Detalle Formativo">
                      {{ item.descripcion }}
                    </td>
                    <td class="px-5 py-3.5" data-label="Citación">
                      @if (item.citacionPadre === true) {
                        <span class="text-[#a16207] font-semibold text-[11px]">Citado a Dirección</span>
                      } @else if (item.citacionPadre === false) {
                        <span class="text-[#59677a] text-[11px]">No requerida</span>
                      } @else {
                        <span class="text-[#59677a] text-[11px]">Sin dato</span>
                      }
                    </td>
                    <td class="px-5 py-3.5" data-label="Estado en BD">
                      <span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#edf9f3] border border-[#b8dfcc] text-[#126943]">
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
          <div class="grid w-full justify-items-center gap-2 p-[36px_20px] text-center text-[#59677a] whitespace-normal [overflow-wrap:anywhere] relative pt-[62px]">
            <p class="font-medium text-[#59677a]">No se encontraron incidencias registradas en la base de datos.</p>
            <p class="text-[11px] text-[#59677a]">Cuando existan observaciones, aparecerán aquí.</p>
          </div>
        }
      </div>
    </div>
  `
})
export class ConvivenciaComponent implements OnInit {
  private readonly convivenciaService = inject(ConvivenciaService);
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
    if (!this.matriculaId || !this.fechaIncidencia || !this.descripcion.trim()) { this.error.set('Complete matrícula, fecha y descripción.'); return; }
    this.guardando.set(true); this.error.set(null);
    this.convivenciaService.registrarIncidencia({ matriculaId: this.matriculaId, fechaIncidencia: this.fechaIncidencia, tipoFalta: this.tipoFalta, descripcion: this.descripcion.trim(), requiereCitacion: this.requiereCitacion }).subscribe({
      next: () => { this.guardando.set(false); this.cerrarDialogo(); this.error.set(null); this.mensaje.set('Incidencia registrada correctamente.'); this.descripcion = ''; this.cargarIncidencias(); },
      error: err => { this.guardando.set(false); this.error.set(err?.error?.message ?? 'No se pudo registrar la incidencia.'); }
    });
  }
}
