import { Component, ElementRef, inject, signal, computed, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AsistenciaService } from '../../core/services/asistencia.service';
import { AcademicoService } from '../../core/services/academico.service';
import { AnioLectivoResponseDto } from '../../core/models/academico.model';
import { DiscrepanciaAlertaResponseDto, TipoDiscrepancia } from '../../core/models/asistencia.model';
import { UiDatePePipe } from '../../shared/ui/ui-date-pe.pipe';
import { StatusBadgeComponent, UiStatusTone } from '../../shared/ui/status-badge.component';

export type EstadoAsistencia = 'PRESENTE' | 'TARDANZA' | 'FALTA_JUSTIFICADA' | 'FALTA_INJUSTIFICADA';

export interface AlumnoAsistenciaItem {
  id: number;
  estudiante: string;
  estado: EstadoAsistencia;
  fecha: string;
  horaMarcacionPuerta?: string;
}


@Component({
  selector: 'app-asistencia',
  standalone: true,
  imports: [CommonModule, FormsModule, UiDatePePipe, StatusBadgeComponent],
  template: `
    <div class="space-y-6 min-w-0 font-sans text-[#172b4d] [&_*:focus-visible]:outline-[3px] [&_*:focus-visible]:outline-[#2864c5] [&_*:focus-visible]:outline-offset-[3px] [&_button]:min-h-11 [&_input]:min-h-11 [&_select]:min-h-11">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t-[3px] border-t-[#c49a58]/50 pt-3">
        <div>
          <h2 class="text-2xl sm:text-3xl font-extrabold tracking-tight !text-[#172b4d] tracking-[-.025em]">Control de Asistencia & Biometría</h2>
          <p class="text-sm !text-[#59677a] mt-1">
            Consulta de marcas diarias y conciliación con molinetes biométricos de la base de datos.
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button (click)="abrirDialogoRegistro()" class="px-4 py-2.5 rounded-xl !bg-[#1d4ed8] hover:!bg-[#1e40af] !text-white font-semibold text-xs !text-[11px] sm:text-sm cursor-pointer max-[640px]:w-full box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]">Registrar asistencia</button>
          <button (click)="abrirDialogoBiometrico()" class="px-4 py-2.5 rounded-xl !bg-[#334155] hover:!bg-[#1f2937] !text-white font-semibold text-xs !text-[11px] sm:text-sm cursor-pointer max-[640px]:w-full box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]">Importar marca</button>
          <button
            (click)="ejecutarConciliacion()"
            class="px-4 py-2.5 rounded-xl border !border-[#874300] !bg-[#9a4d00] hover:!bg-[#874300] !text-white font-semibold text-xs !text-[11px] sm:text-sm shadow-lg shadow-amber-600/30 transition flex items-center gap-2 cursor-pointer max-[640px]:w-full box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Ejecutar Conciliación en BD</span>
          </button>
        </div>
      </div>
      @if (error()) { <p class="text-[#b91c1c] text-sm" role="alert">{{ error() }}</p> }
      @if (mensaje()) { <p class="text-[#047857] text-sm" role="status">{{ mensaje() }}</p> }

      <dialog #registroDialog class="box-border w-[min(680px,calc(100vw-24px))] max-w-[calc(100vw-24px)] max-h-[calc(100dvh-24px)] overflow-hidden border border-[#e4eaf3] rounded-[22px] bg-white text-[#14213d] p-0 shadow-[0_28px_90px_rgb(15_31_57_/_28%)] backdrop:bg-[rgb(12_24_43_/_46%)] backdrop:backdrop-blur-[3px] max-[639px]:w-[calc(100vw-16px)] max-[639px]:max-w-[calc(100vw-16px)] max-[639px]:max-h-[calc(100dvh-16px)] max-[639px]:rounded-[18px]" aria-labelledby="registro-dialog-title">
        <div class="flex max-h-[calc(100dvh-24px)] min-h-0 flex-col"><header class="flex flex-[0_0_auto] items-center justify-between gap-4 border-b border-[#e5eaf2] px-6 py-5 [&_h3]:m-0 [&_h3]:text-[#14213d] [&_h3]:text-lg [&_h3]:leading-[27px] [&_h3]:font-[750] [&_p]:mb-0 [&_p]:mt-1 [&_p]:text-[#64748b] [&_p]:text-xs [&_p]:leading-[1.5] max-[639px]:p-4"><div><h3 id="registro-dialog-title" class="tracking-[-.025em]">Registrar asistencia</h3><p>Registra una marca manual para la matrícula seleccionada.</p></div><button type="button" class="min-h-11 rounded-xl border border-[#e5eaf2] bg-[#f5f7fb] px-4 font-semibold text-[#334155] !h-11 !w-11 !min-w-11 !min-h-11 !shrink-0 !p-0 grid place-items-center !font-[650]" (click)="cerrarDialogos()" aria-label="Cerrar">✕</button></header>
          <form (ngSubmit)="registrarAsistencia()" class="flex min-h-0 flex-[1_1_auto] flex-col"><div class="min-h-0 flex-[1_1_auto] overflow-auto overscroll-contain px-6 py-5 max-[639px]:p-4 space-y-4">
            @if (error()) { <p class="m-0 rounded-xl border border-[#fecaca] bg-[#fef2f2] px-3 py-[10px] text-xs text-[#b91c1c]" role="alert">{{ error() }}</p> }
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label class="block min-w-0 text-xs font-semibold leading-normal text-[#475569] [&_input]:mt-[6px] [&_input]:block [&_input]:w-full [&_select]:mt-[6px] [&_select]:block [&_select]:w-full [&_textarea]:mt-[6px] [&_textarea]:block [&_textarea]:w-full">Matrícula ID *<input type="number" [(ngModel)]="matriculaId" name="matriculaId" min="1" required class="min-w-0 !min-h-[46px] max-w-full border px-3 !py-[10px] !border-[#d9e1ec] rounded-xl !bg-white !text-[#172b4d] transition-colors focus:border-[#5b83d6] focus:outline-none focus:shadow-[0_0_0_3px_rgb(59_110_214_/_13%)] max-[639px]:text-base !font-[650]"></label>
              <label class="block min-w-0 text-xs font-semibold leading-normal text-[#475569] [&_input]:mt-[6px] [&_input]:block [&_input]:w-full [&_select]:mt-[6px] [&_select]:block [&_select]:w-full [&_textarea]:mt-[6px] [&_textarea]:block [&_textarea]:w-full">Fecha *<input type="date" [(ngModel)]="fechaSesionNueva" name="fechaSesion" required class="min-w-0 !min-h-[46px] max-w-full border px-3 !py-[10px] !border-[#d9e1ec] rounded-xl !bg-white !text-[#172b4d] transition-colors focus:border-[#5b83d6] focus:outline-none focus:shadow-[0_0_0_3px_rgb(59_110_214_/_13%)] max-[639px]:text-base !font-[650]"></label>
              <label class="block min-w-0 text-xs font-semibold leading-normal text-[#475569] [&_input]:mt-[6px] [&_input]:block [&_input]:w-full [&_select]:mt-[6px] [&_select]:block [&_select]:w-full [&_textarea]:mt-[6px] [&_textarea]:block [&_textarea]:w-full">Hora *<input type="time" [(ngModel)]="horaRegistro" name="horaRegistro" required class="min-w-0 !min-h-[46px] max-w-full border px-3 !py-[10px] !border-[#d9e1ec] rounded-xl !bg-white !text-[#172b4d] transition-colors focus:border-[#5b83d6] focus:outline-none focus:shadow-[0_0_0_3px_rgb(59_110_214_/_13%)] max-[639px]:text-base !font-[650]"></label>
              <label class="block min-w-0 text-xs font-semibold leading-normal text-[#475569] [&_input]:mt-[6px] [&_input]:block [&_input]:w-full [&_select]:mt-[6px] [&_select]:block [&_select]:w-full [&_textarea]:mt-[6px] [&_textarea]:block [&_textarea]:w-full">Estado<select [(ngModel)]="estadoRegistro" name="estado" class="min-w-0 !min-h-[46px] max-w-full border px-3 !py-[10px] !border-[#d9e1ec] rounded-xl !bg-white !text-[#172b4d] transition-colors focus:border-[#5b83d6] focus:outline-none focus:shadow-[0_0_0_3px_rgb(59_110_214_/_13%)] max-[639px]:text-base !font-[650]"><option value="PRESENTE">Presente</option><option value="TARDANZA">Tardanza</option><option value="FALTA_INJUSTIFICADA">Falta injustificada</option></select></label>
            </div>
          </div><footer class="sticky bottom-0 z-[1] flex flex-[0_0_auto] flex-wrap justify-end gap-[10px] border-t border-[#e5eaf2] bg-white px-6 py-[14px] max-[639px]:px-4 max-[639px]:py-3 max-[639px]:[&>button]:flex-[1_1_auto]"><button type="button" class="rounded-xl border border-[#e5eaf2] bg-[#f5f7fb] px-4 font-semibold text-[#334155] max-[640px]:w-full box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]" (click)="cerrarDialogos()">Cancelar</button><button type="submit" [disabled]="operando()" class="rounded-xl bg-[#2563eb] px-[18px] font-bold text-white shadow-[0_8px_18px_rgb(37_99_235_/_18%)] disabled:cursor-wait disabled:opacity-[.55] max-[640px]:w-full box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]">{{ operando() ? 'Guardando…' : 'Guardar asistencia' }}</button></footer></form>
        </div>
      </dialog>

      <dialog #biometricoDialog class="box-border w-[min(680px,calc(100vw-24px))] max-w-[calc(100vw-24px)] max-h-[calc(100dvh-24px)] overflow-hidden border border-[#e4eaf3] rounded-[22px] bg-white text-[#14213d] p-0 shadow-[0_28px_90px_rgb(15_31_57_/_28%)] backdrop:bg-[rgb(12_24_43_/_46%)] backdrop:backdrop-blur-[3px] max-[639px]:w-[calc(100vw-16px)] max-[639px]:max-w-[calc(100vw-16px)] max-[639px]:max-h-[calc(100dvh-16px)] max-[639px]:rounded-[18px]" aria-labelledby="biometrico-dialog-title">
        <div class="flex max-h-[calc(100dvh-24px)] min-h-0 flex-col"><header class="flex flex-[0_0_auto] items-center justify-between gap-4 border-b border-[#e5eaf2] px-6 py-5 [&_h3]:m-0 [&_h3]:text-[#14213d] [&_h3]:text-lg [&_h3]:leading-[27px] [&_h3]:font-[750] [&_p]:mb-0 [&_p]:mt-1 [&_p]:text-[#64748b] [&_p]:text-xs [&_p]:leading-[1.5] max-[639px]:p-4"><div><h3 id="biometrico-dialog-title" class="tracking-[-.025em]">Importar marca biométrica</h3><p>Registra una lectura de molinete asociada a un DNI.</p></div><button type="button" class="min-h-11 rounded-xl border border-[#e5eaf2] bg-[#f5f7fb] px-4 font-semibold text-[#334155] !h-11 !w-11 !min-w-11 !min-h-11 !shrink-0 !p-0 grid place-items-center !font-[650]" (click)="cerrarDialogos()" aria-label="Cerrar">✕</button></header>
          <form (ngSubmit)="importarMarca()" class="flex min-h-0 flex-[1_1_auto] flex-col"><div class="min-h-0 flex-[1_1_auto] overflow-auto overscroll-contain px-6 py-5 max-[639px]:p-4 space-y-4">
            @if (error()) { <p class="m-0 rounded-xl border border-[#fecaca] bg-[#fef2f2] px-3 py-[10px] text-xs text-[#b91c1c]" role="alert">{{ error() }}</p> }
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label class="block min-w-0 text-xs font-semibold leading-normal text-[#475569] [&_input]:mt-[6px] [&_input]:block [&_input]:w-full [&_select]:mt-[6px] [&_select]:block [&_select]:w-full [&_textarea]:mt-[6px] [&_textarea]:block [&_textarea]:w-full">DNI *<input [(ngModel)]="dniBiometrico" name="dniBiometrico" inputmode="numeric" pattern="[0-9]{8}" maxlength="8" required placeholder="8 dígitos" class="min-w-0 !min-h-[46px] max-w-full border px-3 !py-[10px] !border-[#d9e1ec] rounded-xl !bg-white !text-[#172b4d] transition-colors focus:border-[#5b83d6] focus:outline-none focus:shadow-[0_0_0_3px_rgb(59_110_214_/_13%)] max-[639px]:text-base !font-[650]"></label>
              <label class="block min-w-0 text-xs font-semibold leading-normal text-[#475569] [&_input]:mt-[6px] [&_input]:block [&_input]:w-full [&_select]:mt-[6px] [&_select]:block [&_select]:w-full [&_textarea]:mt-[6px] [&_textarea]:block [&_textarea]:w-full">Fecha y hora *<input type="datetime-local" [(ngModel)]="fechaHoraBiometrico" name="fechaHoraBiometrico" required class="min-w-0 !min-h-[46px] max-w-full border px-3 !py-[10px] !border-[#d9e1ec] rounded-xl !bg-white !text-[#172b4d] transition-colors focus:border-[#5b83d6] focus:outline-none focus:shadow-[0_0_0_3px_rgb(59_110_214_/_13%)] max-[639px]:text-base !font-[650]"></label>
              <label class="block min-w-0 text-xs font-semibold leading-normal text-[#475569] [&_input]:mt-[6px] [&_input]:block [&_input]:w-full [&_select]:mt-[6px] [&_select]:block [&_select]:w-full [&_textarea]:mt-[6px] [&_textarea]:block [&_textarea]:w-full sm:col-span-2">Código del dispositivo *<input [(ngModel)]="dispositivoCodigo" name="dispositivoCodigo" maxlength="30" required class="min-w-0 !min-h-[46px] max-w-full border px-3 !py-[10px] !border-[#d9e1ec] rounded-xl !bg-white !text-[#172b4d] transition-colors focus:border-[#5b83d6] focus:outline-none focus:shadow-[0_0_0_3px_rgb(59_110_214_/_13%)] max-[639px]:text-base !font-[650]"></label>
            </div>
          </div><footer class="sticky bottom-0 z-[1] flex flex-[0_0_auto] flex-wrap justify-end gap-[10px] border-t border-[#e5eaf2] bg-white px-6 py-[14px] max-[639px]:px-4 max-[639px]:py-3 max-[639px]:[&>button]:flex-[1_1_auto]"><button type="button" class="rounded-xl border border-[#e5eaf2] bg-[#f5f7fb] px-4 font-semibold text-[#334155] max-[640px]:w-full box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]" (click)="cerrarDialogos()">Cancelar</button><button type="submit" [disabled]="operando()" class="rounded-xl bg-[#2563eb] px-[18px] font-bold text-white shadow-[0_8px_18px_rgb(37_99_235_/_18%)] disabled:cursor-wait disabled:opacity-[.55] max-[640px]:w-full box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]">{{ operando() ? 'Importando…' : 'Registrar marca' }}</button></footer></form>
        </div>
      </dialog>

      <dialog #justificacionDialog class="box-border w-[min(680px,calc(100vw-24px))] max-w-[calc(100vw-24px)] max-h-[calc(100dvh-24px)] overflow-hidden border border-[#e4eaf3] rounded-[22px] bg-white text-[#14213d] p-0 shadow-[0_28px_90px_rgb(15_31_57_/_28%)] backdrop:bg-[rgb(12_24_43_/_46%)] backdrop:backdrop-blur-[3px] max-[639px]:w-[calc(100vw-16px)] max-[639px]:max-w-[calc(100vw-16px)] max-[639px]:max-h-[calc(100dvh-16px)] max-[639px]:rounded-[18px]" aria-labelledby="justificacion-dialog-title">
        <div class="flex max-h-[calc(100dvh-24px)] min-h-0 flex-col"><header class="flex flex-[0_0_auto] items-center justify-between gap-4 border-b border-[#e5eaf2] px-6 py-5 [&_h3]:m-0 [&_h3]:text-[#14213d] [&_h3]:text-lg [&_h3]:leading-[27px] [&_h3]:font-[750] [&_p]:mb-0 [&_p]:mt-1 [&_p]:text-[#64748b] [&_p]:text-xs [&_p]:leading-[1.5] max-[639px]:p-4"><div><h3 id="justificacion-dialog-title" class="tracking-[-.025em]">Justificar inasistencia</h3><p>La justificación quedará asociada a la asistencia seleccionada.</p></div><button type="button" class="min-h-11 rounded-xl border border-[#e5eaf2] bg-[#f5f7fb] px-4 font-semibold text-[#334155] !h-11 !w-11 !min-w-11 !min-h-11 !shrink-0 !p-0 grid place-items-center !font-[650]" (click)="cerrarDialogos()" aria-label="Cerrar">✕</button></header>
          <form (ngSubmit)="justificarSeleccionada()" class="flex min-h-0 flex-[1_1_auto] flex-col"><div class="min-h-0 flex-[1_1_auto] overflow-auto overscroll-contain px-6 py-5 max-[639px]:p-4 space-y-4">
            @if (error()) { <p class="m-0 rounded-xl border border-[#fecaca] bg-[#fef2f2] px-3 py-[10px] text-xs text-[#b91c1c]" role="alert">{{ error() }}</p> }
            <label class="block min-w-0 text-xs font-semibold leading-normal text-[#475569] [&_input]:mt-[6px] [&_input]:block [&_input]:w-full [&_select]:mt-[6px] [&_select]:block [&_select]:w-full [&_textarea]:mt-[6px] [&_textarea]:block [&_textarea]:w-full">Motivo de justificación *<textarea [(ngModel)]="motivoJustificacion" name="motivoJustificacion" required maxlength="4000" rows="4" placeholder="Describe brevemente el motivo" class="min-w-0 max-w-full border px-3 !py-[10px] !border-[#d9e1ec] rounded-xl !bg-white !text-[#172b4d] transition-colors focus:border-[#5b83d6] focus:outline-none focus:shadow-[0_0_0_3px_rgb(59_110_214_/_13%)] max-[639px]:text-base py-[10px] resize-y !min-h-[110px] !font-[650]"></textarea></label>
          </div><footer class="sticky bottom-0 z-[1] flex flex-[0_0_auto] flex-wrap justify-end gap-[10px] border-t border-[#e5eaf2] bg-white px-6 py-[14px] max-[639px]:px-4 max-[639px]:py-3 max-[639px]:[&>button]:flex-[1_1_auto]"><button type="button" class="rounded-xl border border-[#e5eaf2] bg-[#f5f7fb] px-4 font-semibold text-[#334155] max-[640px]:w-full box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]" (click)="cerrarDialogos()">Cancelar</button><button type="submit" [disabled]="operando()" class="rounded-xl bg-[#2563eb] px-[18px] font-bold text-white shadow-[0_8px_18px_rgb(37_99_235_/_18%)] disabled:cursor-wait disabled:opacity-[.55] max-[640px]:w-full box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]">{{ operando() ? 'Guardando…' : 'Guardar justificación' }}</button></footer></form>
        </div>
      </dialog>

      <!-- Filters & Date Selection -->
      <div class="p-4 rounded-2xl !bg-white border !border-[#e1e8f1] grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label class="block text-xs !text-[11px] font-semibold !text-[#59677a] mb-1">Fecha de Registro</label>
          <input
            type="date"
            [(ngModel)]="fechaSeleccionada" aria-label="Fecha de Registro"
            (change)="cargarAsistencia()"
            class="w-full px-3 py-2 rounded-xl !bg-white border !border-[#e1e8f1] !text-[#172b4d] text-xs !text-[11px] focus:outline-none focus:border-blue-500 min-w-0 !min-h-[44px] max-w-full border px-3 py-2 !border-[#d9e1ec] rounded-xl !bg-white !text-[#172b4d] transition-colors focus:border-[#5b83d6] focus:outline-none focus:shadow-[0_0_0_3px_rgb(59_110_214_/_13%)] max-[639px]:text-base"
          />
        </div>

        <div><label class="block text-xs !text-[11px] font-semibold !text-[#59677a] mb-1">Año lectivo para conciliación</label><select [(ngModel)]="anioId" aria-label="Año lectivo para conciliación" [disabled]="!anios().length" class="w-full px-3 py-2 rounded-xl !bg-white border !border-[#e1e8f1] !text-[#172b4d] text-xs !text-[11px] min-w-0 !min-h-[44px] max-w-full border px-3 py-2 !border-[#d9e1ec] rounded-xl !bg-white !text-[#172b4d] transition-colors focus:border-[#5b83d6] focus:outline-none focus:shadow-[0_0_0_3px_rgb(59_110_214_/_13%)] max-[639px]:text-base">@if (!anios().length) { <option [ngValue]="0">Sin años lectivos disponibles</option> } @for (anio of anios(); track anio.id) { <option [ngValue]="anio.id">{{ anio.anio }}</option> }</select></div>

        <div class="flex items-end">
          <button
            (click)="cargarAsistencia()"
            class="w-full py-2 px-3 rounded-xl !bg-[#f1f4f9] hover:!bg-[#f1f4f9] !text-[#34445d] text-xs !text-[11px] font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 max-[640px]:w-full box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]"
          >
            <span>Actualizar de la BD</span>
          </button>
        </div>
      </div>

      <!-- Summary Quick Stats -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div class="p-4 rounded-xl border !border-[#b8dfcc] !bg-[#edf9f3]">
          <div class="text-[10px] !text-[11px] font-bold uppercase tracking-wider !text-[#146c45]">Presentes</div>
          <div class="text-2xl font-black !text-[#172b4d] mt-1">{{ totalPresentes() }}</div>
        </div>
        <div class="p-4 rounded-xl border !border-[#edca83] !bg-[#fff7e7]">
          <div class="text-[10px] !text-[11px] font-bold uppercase tracking-wider !text-[#805300]">Tardanzas</div>
          <div class="text-2xl font-black !text-[#172b4d] mt-1">{{ totalTardanzas() }}</div>
        </div>
        <div class="p-4 rounded-xl border !border-[#c3d6f5] !bg-[#eff5ff]">
          <div class="text-[10px] !text-[11px] font-bold uppercase tracking-wider !text-[#184fae]">Faltas Justificadas</div>
          <div class="text-2xl font-black !text-[#172b4d] mt-1">{{ totalJustificadas() }}</div>
        </div>
        <div class="p-4 rounded-xl border !border-[#f2b7b0] !bg-[#fff1ef]">
          <div class="text-[10px] !text-[11px] font-bold uppercase tracking-wider !text-[#a43128]">Faltas Injustificadas</div>
          <div class="text-2xl font-black !text-[#172b4d] mt-1">{{ totalInjustificadas() }}</div>
        </div>
      </div>

      <!-- Tabs Navigation -->
      <div class="flex items-center gap-2 border-b border-[#e5eaf2]">
        <button
          (click)="tabActiva.set('AULA')"
          [class]="tabActiva() === 'AULA' ? 'border-blue-500 !text-[#184fae] font-bold' : 'border-transparent !text-[#59677a] hover:!text-[#172b4d]'"
          class="px-4 py-2.5 border-b-2 text-xs !text-[11px] transition cursor-pointer max-[640px]:w-full box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]"
        >
          Pase de Lista de Aula
        </button>
        <button
          (click)="tabActiva.set('CONCILIACION')"
          [class]="tabActiva() === 'CONCILIACION' ? 'border-amber-500 !text-[#805300] font-bold' : 'border-transparent !text-[#59677a] hover:!text-[#172b4d]'"
          class="px-4 py-2.5 border-b-2 text-xs !text-[11px] transition cursor-pointer flex items-center gap-2 max-[640px]:w-full box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]"
        >
          <span>Alertas de Conciliación Biométrica</span>
          <span class="px-1.5 py-0.2 rounded-full text-[10px] !text-[11px] !text-[#704500] !bg-[#fff0c7] border !border-[#edca83]">
            {{ discrepancias().length }}
          </span>
        </button>
      </div>

      <!-- Tab Content: Pase de Lista -->
      @if (tabActiva() === 'AULA') {
        <div class="rounded-2xl !bg-white border !border-[#e1e8f1] overflow-hidden shadow-sm">
          <div class="overflow-x-auto" data-attendance-table-scroll="">
            <table class="w-full min-w-[760px] text-left text-xs !text-[11px] [&_thead]:!bg-[#f7f9fc] [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:!bg-[#f8faff]" data-mobile-table-cards="">
              <thead class="!bg-white border-b !border-[#e1e8f1] !text-[#59677a] uppercase tracking-wider font-semibold">
                <tr>
                  <th class="px-5 py-3.5">Estudiante</th>
                  <th class="px-5 py-3.5">Fecha</th>
                  <th class="px-5 py-3.5">Molinete Puerta</th>
                  <th class="px-5 py-3.5 text-center">Pase de Lista en Aula</th>
                  <th class="px-5 py-3.5 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#edf0f5] !text-[#34445d]">
                @if (cargando()) {
                  <tr>
                    <td colspan="5" class="text-center py-10 !text-[#59677a]">
                      <span class="inline-block w-5 h-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-2"></span>
                      <p>Consultando marcas de asistencia en la base de datos...</p>
                    </td>
                  </tr>
                } @else {
                  @for (item of alumnos(); track item.id) {
                    <tr class="!bg-[#f1f4f9] hover:bg-[#f1f4f9] transition">
                      <td class="px-5 py-3.5 font-bold !text-[#172b4d]" data-label="Estudiante">{{ item.estudiante }}</td>
                      <td class="px-5 py-3.5 font-mono !text-[#59677a]" data-label="Fecha">{{ item.fecha | uiDatePe }}</td>
                      <td class="px-5 py-3.5 font-mono !text-[#146c45]" data-label="Molinete Puerta">{{ item.horaMarcacionPuerta || '-' }}</td>
                      <td class="px-5 py-3.5 text-center font-bold" data-label="Pase de Lista en Aula">
                        @switch (item.estado) {
                          @case ('PRESENTE') { <span class="inline-grid grid-cols-[20px_auto] items-center gap-x-[7px] gap-y-px p-[6px_10px] border rounded-xl text-left leading-[1.25] !border-[#b8dfcc] !bg-[#edf9f3] !text-[#146c45]"><span class="row-span-2 grid h-5 w-5 place-items-center rounded-full font-extrabold !bg-[#d8f0e3]" aria-hidden="true">✓</span><span>Presente</span><small class="col-start-2 text-[11px] [font-weight:650]">PRESENTE</small></span> }
                          @case ('TARDANZA') { <span class="inline-grid grid-cols-[20px_auto] items-center gap-x-[7px] gap-y-px p-[6px_10px] border rounded-xl text-left leading-[1.25] !border-[#edca83] !bg-[#fff7e7] !text-[#805300]"><span class="row-span-2 grid h-5 w-5 place-items-center rounded-full font-extrabold !bg-[#ffedc5]" aria-hidden="true">◷</span><span>Tardanza</span><small class="col-start-2 text-[11px] [font-weight:650]">TARDANZA</small></span> }
                          @case ('FALTA_JUSTIFICADA') { <span class="inline-grid grid-cols-[20px_auto] items-center gap-x-[7px] gap-y-px p-[6px_10px] border rounded-xl text-left leading-[1.25] !border-[#c3d6f5] !bg-[#eff5ff] !text-[#184fae]"><span class="row-span-2 grid h-5 w-5 place-items-center rounded-full font-extrabold !bg-[#dce9ff]" aria-hidden="true">✓</span><span>Falta justificada</span><small class="col-start-2 text-[11px] [font-weight:650]">FALTA_JUSTIFICADA</small></span> }
                          @case ('FALTA_INJUSTIFICADA') { <span class="inline-grid grid-cols-[20px_auto] items-center gap-x-[7px] gap-y-px p-[6px_10px] border rounded-xl text-left leading-[1.25] !border-[#f2b7b0] !bg-[#fff1ef] !text-[#a43128]"><span class="row-span-2 grid h-5 w-5 place-items-center rounded-full font-extrabold !bg-[#ffe0dc]" aria-hidden="true">!</span><span>Falta injustificada</span><small class="col-start-2 text-[11px] [font-weight:650]">FALTA_INJUSTIFICADA</small></span> }
                        }
                      </td>
                      <td class="px-5 py-3.5 text-center" data-label="Acciones">
                        @if (item.estado === 'FALTA_INJUSTIFICADA') {
                          <button (click)="abrirDialogoJustificacion(item.id)" class="text-blue-600 font-semibold max-[640px]:w-full box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]">Justificar</button>
                        }
                      </td>
                    </tr>
                  } @empty {
                    <tr [hidden]="!!error()">
                      <td colspan="5" class="relative !pt-[62px] text-center py-12 !text-[#59677a] space-y-2" data-illustration="calendar">
                        <svg aria-hidden="true" focusable="false" viewBox="0 0 48 48" fill="none" stroke="#102447" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="absolute top-3 left-1/2 h-[42px] w-[42px] -translate-x-1/2"><rect x="7" y="10" width="34" height="31" rx="4"/><path d="M15 6v8m18-8v8M7 19h34" stroke="#C49A58"/><path d="M15 26h4m5 0h4m5 0h3M15 33h4m5 0h4"/></svg>
                      <p class="font-medium !text-[#59677a]">No se encontraron marcas de asistencia para la fecha indicada.</p>
                        <p class="text-[11px] !text-[#59677a]">Los pases de lista registrados en el aula y las importaciones biométricas se mostrarán aquí.</p>
                      </td>
                    </tr>
                  }
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      <!-- Tab Content: Conciliación Biométrica -->
      @if (tabActiva() === 'CONCILIACION') {
        <div class="space-y-4">
          <div class="rounded-2xl !bg-white border !border-[#e1e8f1] overflow-hidden shadow-sm">
            <div class="overflow-x-auto" data-attendance-table-scroll="">
            <table class="w-full min-w-[760px] text-left text-xs !text-[11px] [&_thead]:!bg-[#f7f9fc] [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:!bg-[#f8faff]" data-mobile-table-cards="">
              <thead class="!bg-white border-b !border-[#e1e8f1] !text-[#59677a] uppercase tracking-wider font-semibold">
                <tr>
                  <th class="px-5 py-3.5">Estudiante</th>
                  <th class="px-5 py-3.5">Fecha</th>
                  <th class="px-5 py-3.5">Resultado</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#edf0f5] !text-[#34445d]">
                @for (d of discrepancias(); track $index) {
                  <tr class="!bg-[#f1f4f9] hover:bg-[#f1f4f9] transition">
                    <td class="px-5 py-3.5 font-bold !text-[#172b4d]" data-label="Estudiante">Estudiante #{{ d.estudianteId }}</td>
                    <td class="px-5 py-3.5 font-mono !text-[#59677a]" data-label="Fecha">{{ d.fecha | uiDatePe }}</td>
                    <td class="px-5 py-3.5" data-label="Resultado">
                      <ui-status-badge [label]="resultadoDiscrepancia(d.tipoDiscrepancia)" [tone]="tonoDiscrepancia(d.tipoDiscrepancia)" />
                    </td>
                  </tr>
                } @empty {
                  <tr [hidden]="!!error()">
                    <td colspan="3" class="relative !pt-[62px] text-center py-12 !text-[#59677a] space-y-2" data-illustration="calendar">
                      <svg aria-hidden="true" focusable="false" viewBox="0 0 48 48" fill="none" stroke="#102447" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="absolute top-3 left-1/2 h-[42px] w-[42px] -translate-x-1/2"><rect x="7" y="10" width="34" height="31" rx="4"/><path d="M15 6v8m18-8v8M7 19h34" stroke="#C49A58"/><path d="M15 26h4m5 0h4m5 0h3M15 33h4m5 0h4"/></svg>
                      <p class="font-medium !text-[#59677a]">No hay resultados de conciliación para la fecha indicada.</p>
                      <p class="text-[11px] !text-[#59677a]">La respuesta no contiene alertas para esta fecha.</p>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class AsistenciaComponent implements OnInit {
  private readonly asistenciaService = inject(AsistenciaService);
  private readonly academicoService = inject(AcademicoService);
  readonly anios = signal<AnioLectivoResponseDto[]>([]);
  @ViewChild('registroDialog') private registroDialog!: ElementRef<HTMLDialogElement>;
  @ViewChild('biometricoDialog') private biometricoDialog!: ElementRef<HTMLDialogElement>;
  @ViewChild('justificacionDialog') private justificacionDialog!: ElementRef<HTMLDialogElement>;

  fechaSeleccionada = new Date().toLocaleDateString('sv-SE');
  fechaSesionNueva = new Date().toLocaleDateString('sv-SE');
  anioId = 0;
  readonly error = signal<string | null>(null);
  readonly mensaje = signal<string | null>(null);
  readonly justificacionId = signal<number | null>(null);
  readonly operando = signal(false);
  tabActiva = signal<'AULA' | 'CONCILIACION'>('AULA');
  cargando = signal(false);

  matriculaId = 0;
  horaRegistro = '08:00';
  estadoRegistro: EstadoAsistencia = 'PRESENTE';
  motivoJustificacion = '';
  dniBiometrico = '';
  fechaHoraBiometrico = '';
  dispositivoCodigo = 'PUERTA-1';

  readonly alumnos = signal<AlumnoAsistenciaItem[]>([]);
  readonly discrepancias = signal<DiscrepanciaAlertaResponseDto[]>([]);

  readonly totalPresentes = computed(() => this.alumnos().filter(a => a.estado === 'PRESENTE').length);
  readonly totalTardanzas = computed(() => this.alumnos().filter(a => a.estado === 'TARDANZA').length);
  readonly totalJustificadas = computed(() => this.alumnos().filter(a => a.estado === 'FALTA_JUSTIFICADA').length);
  readonly totalInjustificadas = computed(() => this.alumnos().filter(a => a.estado === 'FALTA_INJUSTIFICADA').length);

  ngOnInit(): void {
    this.academicoService.listarAnios().subscribe({
      next: anios => { this.anios.set(anios); this.anioId = anios.find(a => a.abierto)?.id ?? anios[0]?.id ?? 0; },
      error: () => this.error.set('No se pudieron consultar los años lectivos.')
    });
    this.cargarAsistencia();
  }

  cargarAsistencia(): void {
    this.error.set(null);
    this.cargando.set(true);
    this.asistenciaService.obtenerReporteDiario(this.fechaSeleccionada).subscribe({
      next: (res) => {
        this.cargando.set(false);
        if (res && Array.isArray(res.asistencias)) {
          this.alumnos.set(
            res.asistencias.map(a => ({
              id: a.id,
              estudiante: `Matrícula #${a.matriculaId}`,
              fecha: a.fechaSesion,
              estado: a.estado as EstadoAsistencia,
              horaMarcacionPuerta: a.horaRegistro || '-'
            }))
          );
        } else {
          this.alumnos.set([]);
        }
      },
      error: () => {
        this.cargando.set(false);
        this.alumnos.set([]);
        this.error.set('No se pudieron cargar las marcas de asistencia.');
      }
    });

    this.asistenciaService.listarAlertasConciliacion(this.fechaSeleccionada).subscribe({
      next: (res) => {
        if (Array.isArray(res)) {
          this.discrepancias.set(res);
        } else {
          this.discrepancias.set([]);
        }
      },
      error: () => {
        this.discrepancias.set([]);
        this.error.set('No se pudieron cargar las alertas de conciliación.');
      }
    });
  }

  resultadoDiscrepancia(tipo: TipoDiscrepancia): string {
    switch (tipo) {
      case 'ASISTENCIA_CONCILIADA': return 'Conciliada';
      case 'DISCREPANCIA_FUGA': return 'Posible fuga';
      case 'DISCREPANCIA_OMISION_PORTERIA': return 'Omisión en portería';
      case 'PENDIENTE_CIERRE_TURNO': return 'Pendiente de cierre de turno';
      default: return tipo;
    }
  }

  tonoDiscrepancia(tipo: TipoDiscrepancia): UiStatusTone {
    switch (tipo) {
      case 'ASISTENCIA_CONCILIADA': return 'success';
      case 'DISCREPANCIA_FUGA': return 'error';
      case 'DISCREPANCIA_OMISION_PORTERIA': return 'warning';
      case 'PENDIENTE_CIERRE_TURNO': return 'info';
      default: return 'info';
    }
  }

  registrarAsistencia(): void {
    if (this.matriculaId <= 0 || !this.fechaSesionNueva || !this.horaRegistro) {
      this.error.set('Complete matrícula, fecha y hora.'); return;
    }
    this.error.set(null); this.mensaje.set(null); this.operando.set(true);
    this.asistenciaService.registrarAsistenciaAula({ matriculaId: this.matriculaId, fechaSesion: this.fechaSesionNueva, horaRegistro: this.horaRegistro, estado: this.estadoRegistro }).subscribe({
      next: () => { this.operando.set(false); this.cerrarDialogos(); this.mensaje.set('Asistencia guardada en la base de datos.'); this.cargarAsistencia(); },
      error: err => { this.operando.set(false); this.error.set(err?.error?.message ?? 'No se pudo registrar la asistencia.'); }
    });
  }

  justificar(asistenciaId: number): void {
    if (!this.motivoJustificacion.trim()) { this.error.set('Indique el motivo de justificación.'); return; }
    this.error.set(null); this.mensaje.set(null); this.operando.set(true);
    this.asistenciaService.justificarInasistencia({ asistenciaId, motivo: this.motivoJustificacion.trim() }).subscribe({
      next: () => { this.operando.set(false); this.cerrarDialogos(); this.justificacionId.set(null); this.motivoJustificacion = ''; this.mensaje.set('Falta justificada en la base de datos.'); this.cargarAsistencia(); },
      error: err => { this.operando.set(false); this.error.set(err?.error?.message ?? 'No se pudo justificar la falta.'); }
    });
  }

  importarMarca(): void {
    if (!/^[0-9]{8}$/.test(this.dniBiometrico) || !this.fechaHoraBiometrico || !this.dispositivoCodigo.trim()) {
      this.error.set('Complete DNI, fecha/hora y dispositivo.'); return;
    }
    this.error.set(null); this.mensaje.set(null); this.operando.set(true);
    const fechaHora = `${this.fechaHoraBiometrico}:00-05:00`;
    this.asistenciaService.importarLoteBiometrico({ nombreArchivo: `marca-ui-${this.dniBiometrico}-${Date.now()}.json`, marcas: [{ dniLeido: this.dniBiometrico, fechaHora, dispositivoCodigo: this.dispositivoCodigo.trim() }] }).subscribe({
      next: res => { this.operando.set(false); this.cerrarDialogos(); this.mensaje.set(`Marca importada: ${res.marcasValidas} válida(s), ${res.marcasErroneas} errónea(s).`); this.cargarAsistencia(); },
      error: err => { this.operando.set(false); this.error.set(err?.error?.message ?? 'No se pudo importar la marca biométrica.'); }
    });
  }

  ejecutarConciliacion(): void {
    if (!this.anioId) { this.error.set('Indique el año lectivo antes de conciliar.'); return; }
    this.error.set(null);
    this.asistenciaService.conciliarAsistencia(this.anioId, this.fechaSeleccionada, true).subscribe({
      next: (res) => {
        this.mensaje.set('Conciliación ejecutada. Registros procesados: ' + (res?.length || 0));
        this.cargarAsistencia();
      },
      error: () => {
        this.error.set('No se pudo ejecutar la conciliación.');
      }
    });
  }

  abrirDialogoRegistro(): void {
    this.error.set(null);
    this.mensaje.set(null);
    this.fechaSesionNueva = this.fechaSeleccionada;
    this.registroDialog.nativeElement.showModal();
  }

  abrirDialogoBiometrico(): void {
    this.error.set(null);
    this.mensaje.set(null);
    this.dniBiometrico = '';
    this.fechaHoraBiometrico = '';
    this.biometricoDialog.nativeElement.showModal();
  }

  abrirDialogoJustificacion(id: number): void {
    this.error.set(null);
    this.mensaje.set(null);
    this.motivoJustificacion = '';
    this.justificacionId.set(id);
    this.justificacionDialog.nativeElement.showModal();
  }

  cerrarDialogos(): void {
    for (const dialog of [this.registroDialog?.nativeElement, this.biometricoDialog?.nativeElement, this.justificacionDialog?.nativeElement]) {
      if (dialog?.open) dialog.close();
    }
  }

  justificarSeleccionada(): void {
    const id = this.justificacionId();
    if (id !== null) this.justificar(id);
  }
}
