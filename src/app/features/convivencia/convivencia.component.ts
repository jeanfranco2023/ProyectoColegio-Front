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
          <h2 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">Convivencia Escolar & Tutoría</h2>
          <p class="text-sm text-[#59677a] mt-1">
            Libro de incidencias, seguimiento formativo de estudiantes y citaciones registradas en la base de datos.
          </p>
        </div>
        <div class="flex items-center gap-3">
          <button
            (click)="nuevaIncidencia()"
            class="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs !text-[11px] sm:!text-[11px] shadow-lg shadow-blue-600/30 transition flex items-center gap-2 cursor-pointer max-[640px]:w-full"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>Registrar Incidencia en BD</span>
          </button>
        </div>
      </div>

      @if (error()) { <p class="text-red-400 text-sm" role="alert">{{ error() }}</p> }
      @if (mensaje()) { <p class="text-emerald-700 text-sm" role="status">{{ mensaje() }}</p> }
      <dialog #incidenciaDialog class="school-native-dialog !w-[min(620px,calc(100vw_-_24px))] !max-w-[calc(100vw_-_24px)] !max-h-[calc(100dvh_-_24px)] !overflow-auto" aria-labelledby="incidencia-dialog-title">
        <div class="school-dialog-shell"><header class="school-dialog-header"><div><h3 id="incidencia-dialog-title">Registrar incidencia escolar</h3><p>Documenta el hecho y define si requiere citación.</p></div><button type="button" class="school-dialog-cancel !grid !h-11 !w-11 !min-h-11 !min-w-11 !flex-none !place-items-center !p-0" (click)="cerrarDialogo()" aria-label="Cerrar">✕</button></header>
          <form (ngSubmit)="registrar()" class="school-dialog-form"><div class="school-dialog-body space-y-4">
            @if (error()) { <p class="school-dialog-error" role="alert">{{ error() }}</p> }
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label class="school-dialog-field">Matrícula ID *<input type="number" [(ngModel)]="matriculaId" name="matricula" min="1" required></label>
              <label class="school-dialog-field">Fecha *<input type="date" [(ngModel)]="fechaIncidencia" name="fecha" required></label>
              <label class="school-dialog-field sm:col-span-2">Tipo de falta<select [(ngModel)]="tipoFalta" name="tipoFalta"><option value="LEVE">Leve</option><option value="GRAVE">Grave</option><option value="MUY_GRAVE">Muy grave</option></select></label>
              <label class="school-dialog-field sm:col-span-2">Descripción *<textarea [(ngModel)]="descripcion" name="descripcion" required maxlength="10000" rows="4" placeholder="Describe lo ocurrido con lenguaje objetivo"></textarea></label>
              <label class="inline-flex items-center gap-3 text-sm text-slate-700 sm:col-span-2"><input type="checkbox" [(ngModel)]="requiereCitacion" name="requiereCitacion"> Requiere citación al apoderado</label>
            </div>
          </div><footer class="school-dialog-footer"><button type="button" class="school-dialog-cancel max-[640px]:w-full" (click)="cerrarDialogo()">Cancelar</button><button type="submit" [disabled]="guardando()" class="school-dialog-submit max-[640px]:w-full">{{ guardando() ? 'Guardando…' : 'Registrar incidencia' }}</button></footer></form>
        </div>
      </dialog>

      <!-- Incidents Table -->
      <div class="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-sm">
        <div class="px-4 py-4 sm:px-6 bg-white border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <h3 class="text-sm font-bold text-white">Registro Formativo y Medidas Correctivas</h3>
          <button
            (click)="cargarIncidencias()"
            class="px-3 py-1.5 rounded-xl bg-[#f3f6fa] hover:bg-slate-700 text-[#34445d] text-xs !text-[11px] font-semibold cursor-pointer max-[640px]:w-full"
          >
            Actualizar BD
          </button>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full min-w-[850px] max-[640px]:min-w-[760px] text-left text-xs !text-[11px] ui-mobile-table-cards">
            <thead class="bg-slate-950/70 border-b border-slate-800 text-[#59677a] uppercase tracking-wider font-semibold">
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
            <tbody class="divide-y divide-slate-800/60 text-[#34445d]">
              @if (cargando()) {
                <tr>
                  <td colspan="7" class="text-center py-10 text-[#59677a]">
                    <span class="inline-block w-5 h-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-2"></span>
                    <p>Consultando incidencias formativas en la base de datos...</p>
                  </td>
                </tr>
              } @else {
                @for (item of incidencias(); track item.id) {
                  <tr class="hover:bg-slate-800/40 transition">
                    <td class="px-5 py-3.5 font-mono text-[#59677a]" data-label="ID BD">{{ item.id }}</td>
                    <td class="px-5 py-3.5 font-bold text-white" data-label="Matrícula ID">Matrícula #{{ item.matriculaId }}</td>
                    <td class="px-5 py-3.5 font-mono text-[#59677a]" data-label="Fecha">{{ item.fecha | uiDatePe }}</td>
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
                        <span class="text-amber-400 font-semibold text-[11px]">Citado a Dirección</span>
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
          <div class="grid w-full justify-items-center gap-2 p-[36px_20px] text-center text-[#59677a] whitespace-normal [overflow-wrap:anywhere] ui-empty-state-art">
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
