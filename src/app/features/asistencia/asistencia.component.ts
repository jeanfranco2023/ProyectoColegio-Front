import { Component, ElementRef, inject, signal, computed, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AsistenciaService } from '../../core/services/asistencia.service';
import { AcademicoService } from '../../core/services/academico.service';
import { AuthStore } from '../../core/state/auth.store';
import { AnioLectivoResponseDto } from '../../core/models/academico.model';
import { AsistenciaAulaResponseDto, DiscrepanciaAlertaResponseDto, DocenteAsistenciaDiariaResponseDto, TipoDiscrepancia } from '../../core/models/asistencia.model';
import { UiDatePePipe } from '../../shared/ui/ui-date-pe.pipe';
import { StatusBadgeComponent, UiStatusTone } from '../../shared/ui/status-badge.component';

export type EstadoAsistencia = 'PRESENTE' | 'TARDANZA' | 'FALTA_JUSTIFICADA' | 'FALTA_INJUSTIFICADA';

export interface AlumnoAsistenciaItem {
  id: number;
  estudiante: string;
  estado: EstadoAsistencia;
  fecha: string;
  horaRegistro?: string;
}


@Component({
  selector: 'app-asistencia',
  standalone: true,
  imports: [CommonModule, FormsModule, UiDatePePipe, StatusBadgeComponent],
  template: `
    <div class="space-y-6 min-w-0 font-sans text-ui-text [&_*:focus-visible]:outline-[3px] [&_*:focus-visible]:outline-ui-focus [&_*:focus-visible]:outline-offset-[3px] [&_button]:min-h-11 [&_input]:min-h-11 [&_select]:min-h-11">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t-[3px] border-t-ui-divider pt-3">
        <div>
          <h2 class="text-2xl sm:text-3xl font-extrabold tracking-tight !text-ui-text tracking-[-.025em]">Control de Asistencia & Biometría</h2>
          <p class="text-sm !text-ui-muted mt-1">
            Consulta de marcas diarias y conciliación con molinetes biométricos de la base de datos.
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          @if (puedeRegistrarAsistencia()) { <button (click)="abrirDialogoRegistro()" class="px-4 py-2.5 rounded-xl !bg-ui-action hover:!bg-ui-action/90 !text-ui-action-text font-semibold text-xs !text-[11px] sm:text-sm cursor-pointer max-[640px]:w-full box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]">Registrar asistencia</button> }
          @if (puedeImportarBiometria()) { <button (click)="abrirDialogoBiometrico()" class="px-4 py-2.5 rounded-xl border !border-ui-divider !bg-ui-surface-soft hover:!bg-ui-surface !text-ui-text font-semibold text-xs !text-[11px] sm:text-sm cursor-pointer max-[640px]:w-full box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]">Importar marca</button> }
          @if (puedeConciliar()) { <button
            (click)="ejecutarConciliacion()"
            class="px-4 py-2.5 rounded-xl border !border-ui-divider !bg-ui-surface-soft hover:!bg-ui-surface !text-ui-text font-semibold text-xs !text-[11px] sm:text-sm shadow-lg shadow-none transition flex items-center gap-2 cursor-pointer max-[640px]:w-full box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Ejecutar Conciliación en BD</span>
          </button> }
        </div>
      </div>
      @if (error()) { <p class="text-ui-error-text text-sm" role="alert">{{ error() }}</p> }
      @if (mensaje()) { <p class="text-ui-success-text text-sm" role="status">{{ mensaje() }}</p> }

      <dialog #registroDialog class="box-border w-[min(680px,calc(100vw-24px))] max-w-[calc(100vw-24px)] max-h-[calc(100dvh-24px)] overflow-hidden border border-ui-divider rounded-[22px] bg-ui-surface text-ui-text p-0 shadow-dialog backdrop:bg-[rgb(12_24_43_/_46%)] backdrop:backdrop-blur-[3px] max-[639px]:w-[calc(100vw-16px)] max-[639px]:max-w-[calc(100vw-16px)] max-[639px]:max-h-[calc(100dvh-16px)] max-[639px]:rounded-[18px]" aria-labelledby="registro-dialog-title">
        <div class="flex max-h-[calc(100dvh-24px)] min-h-0 flex-col"><header class="flex flex-[0_0_auto] items-center justify-between gap-4 border-b border-ui-divider px-6 py-5 [&_h3]:m-0 [&_h3]:text-ui-text [&_h3]:text-lg [&_h3]:leading-[27px] [&_h3]:font-[750] [&_p]:mb-0 [&_p]:mt-1 [&_p]:text-ui-muted [&_p]:text-xs [&_p]:leading-[1.5] max-[639px]:p-4"><div><h3 id="registro-dialog-title" class="tracking-[-.025em]">Registrar asistencia</h3><p>Registra una marca manual para la matrícula seleccionada.</p></div><button type="button" class="min-h-11 rounded-xl border border-ui-divider bg-ui-surface-soft px-4 font-semibold text-ui-text !h-11 !w-11 !min-w-11 !min-h-11 !shrink-0 !p-0 grid place-items-center !font-[650]" (click)="cerrarDialogos()" aria-label="Cerrar">✕</button></header>
          <form (ngSubmit)="registrarAsistencia()" class="flex min-h-0 flex-[1_1_auto] flex-col"><div class="min-h-0 flex-[1_1_auto] overflow-auto overscroll-contain px-6 py-5 max-[639px]:p-4 space-y-4">
            @if (error()) { <p class="m-0 rounded-xl border border-ui-error-border bg-ui-error-bg px-3 py-[10px] text-xs text-ui-error-text" role="alert">{{ error() }}</p> }
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label class="block min-w-0 text-xs font-semibold leading-normal text-ui-muted [&_input]:mt-[6px] [&_input]:block [&_input]:w-full [&_select]:mt-[6px] [&_select]:block [&_select]:w-full [&_textarea]:mt-[6px] [&_textarea]:block [&_textarea]:w-full">Matrícula ID *<input type="number" [(ngModel)]="matriculaId" name="matriculaId" min="1" required class="min-w-0 !min-h-[46px] max-w-full border px-3 !py-[10px] !border-ui-control-border rounded-xl !bg-ui-surface !text-ui-text transition-colors focus:border-ui-focus focus:outline-none focus:shadow-[0_0_0_3px_var(--ui-focus-shadow)] max-[639px]:text-base !font-[650]"></label>
              <label class="block min-w-0 text-xs font-semibold leading-normal text-ui-muted [&_input]:mt-[6px] [&_input]:block [&_input]:w-full [&_select]:mt-[6px] [&_select]:block [&_select]:w-full [&_textarea]:mt-[6px] [&_textarea]:block [&_textarea]:w-full">Fecha *<input type="date" [(ngModel)]="fechaSesionNueva" name="fechaSesion" required class="min-w-0 !min-h-[46px] max-w-full border px-3 !py-[10px] !border-ui-control-border rounded-xl !bg-ui-surface !text-ui-text transition-colors focus:border-ui-focus focus:outline-none focus:shadow-[0_0_0_3px_var(--ui-focus-shadow)] max-[639px]:text-base !font-[650]"></label>
              <label class="block min-w-0 text-xs font-semibold leading-normal text-ui-muted [&_input]:mt-[6px] [&_input]:block [&_input]:w-full [&_select]:mt-[6px] [&_select]:block [&_select]:w-full [&_textarea]:mt-[6px] [&_textarea]:block [&_textarea]:w-full">Hora *<input type="time" [(ngModel)]="horaRegistro" name="horaRegistro" required class="min-w-0 !min-h-[46px] max-w-full border px-3 !py-[10px] !border-ui-control-border rounded-xl !bg-ui-surface !text-ui-text transition-colors focus:border-ui-focus focus:outline-none focus:shadow-[0_0_0_3px_var(--ui-focus-shadow)] max-[639px]:text-base !font-[650]"></label>
              <label class="block min-w-0 text-xs font-semibold leading-normal text-ui-muted [&_input]:mt-[6px] [&_input]:block [&_input]:w-full [&_select]:mt-[6px] [&_select]:block [&_select]:w-full [&_textarea]:mt-[6px] [&_textarea]:block [&_textarea]:w-full">Estado<select [(ngModel)]="estadoRegistro" name="estado" class="min-w-0 !min-h-[46px] max-w-full border px-3 !py-[10px] !border-ui-control-border rounded-xl !bg-ui-surface !text-ui-text transition-colors focus:border-ui-focus focus:outline-none focus:shadow-[0_0_0_3px_var(--ui-focus-shadow)] max-[639px]:text-base !font-[650]"><option value="PRESENTE">Presente</option><option value="TARDANZA">Tardanza</option><option value="FALTA_INJUSTIFICADA">Falta injustificada</option></select></label>
            </div>
          </div><footer class="sticky bottom-0 z-[1] flex flex-[0_0_auto] flex-wrap justify-end gap-[10px] border-t border-ui-divider bg-ui-surface px-6 py-[14px] max-[639px]:px-4 max-[639px]:py-3 max-[639px]:[&>button]:flex-[1_1_auto]"><button type="button" class="rounded-xl border border-ui-divider bg-ui-surface-soft px-4 font-semibold text-ui-text max-[640px]:w-full box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]" (click)="cerrarDialogos()">Cancelar</button><button type="submit" [disabled]="operando()" class="rounded-xl bg-ui-action px-[18px] font-bold text-ui-action-text shadow-none disabled:cursor-wait disabled:opacity-[.55] max-[640px]:w-full box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]">{{ operando() ? 'Guardando…' : 'Guardar asistencia' }}</button></footer></form>
        </div>
      </dialog>

      <dialog #biometricoDialog class="box-border w-[min(680px,calc(100vw-24px))] max-w-[calc(100vw-24px)] max-h-[calc(100dvh-24px)] overflow-hidden border border-ui-divider rounded-[22px] bg-ui-surface text-ui-text p-0 shadow-dialog backdrop:bg-[rgb(12_24_43_/_46%)] backdrop:backdrop-blur-[3px] max-[639px]:w-[calc(100vw-16px)] max-[639px]:max-w-[calc(100vw-16px)] max-[639px]:max-h-[calc(100dvh-16px)] max-[639px]:rounded-[18px]" aria-labelledby="biometrico-dialog-title">
        <div class="flex max-h-[calc(100dvh-24px)] min-h-0 flex-col"><header class="flex flex-[0_0_auto] items-center justify-between gap-4 border-b border-ui-divider px-6 py-5 [&_h3]:m-0 [&_h3]:text-ui-text [&_h3]:text-lg [&_h3]:leading-[27px] [&_h3]:font-[750] [&_p]:mb-0 [&_p]:mt-1 [&_p]:text-ui-muted [&_p]:text-xs [&_p]:leading-[1.5] max-[639px]:p-4"><div><h3 id="biometrico-dialog-title" class="tracking-[-.025em]">Importar marca biométrica</h3><p>Registra una lectura de molinete asociada a un DNI.</p></div><button type="button" class="min-h-11 rounded-xl border border-ui-divider bg-ui-surface-soft px-4 font-semibold text-ui-text !h-11 !w-11 !min-w-11 !min-h-11 !shrink-0 !p-0 grid place-items-center !font-[650]" (click)="cerrarDialogos()" aria-label="Cerrar">✕</button></header>
          <form (ngSubmit)="importarMarca()" class="flex min-h-0 flex-[1_1_auto] flex-col"><div class="min-h-0 flex-[1_1_auto] overflow-auto overscroll-contain px-6 py-5 max-[639px]:p-4 space-y-4">
            @if (error()) { <p class="m-0 rounded-xl border border-ui-error-border bg-ui-error-bg px-3 py-[10px] text-xs text-ui-error-text" role="alert">{{ error() }}</p> }
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label class="block min-w-0 text-xs font-semibold leading-normal text-ui-muted [&_input]:mt-[6px] [&_input]:block [&_input]:w-full [&_select]:mt-[6px] [&_select]:block [&_select]:w-full [&_textarea]:mt-[6px] [&_textarea]:block [&_textarea]:w-full">DNI *<input [(ngModel)]="dniBiometrico" name="dniBiometrico" inputmode="numeric" pattern="[0-9]{8}" maxlength="8" required placeholder="8 dígitos" class="min-w-0 !min-h-[46px] max-w-full border px-3 !py-[10px] !border-ui-control-border rounded-xl !bg-ui-surface !text-ui-text transition-colors focus:border-ui-focus focus:outline-none focus:shadow-[0_0_0_3px_var(--ui-focus-shadow)] max-[639px]:text-base !font-[650]"></label>
              <label class="block min-w-0 text-xs font-semibold leading-normal text-ui-muted [&_input]:mt-[6px] [&_input]:block [&_input]:w-full [&_select]:mt-[6px] [&_select]:block [&_select]:w-full [&_textarea]:mt-[6px] [&_textarea]:block [&_textarea]:w-full">Fecha y hora *<input type="datetime-local" [(ngModel)]="fechaHoraBiometrico" name="fechaHoraBiometrico" required class="min-w-0 !min-h-[46px] max-w-full border px-3 !py-[10px] !border-ui-control-border rounded-xl !bg-ui-surface !text-ui-text transition-colors focus:border-ui-focus focus:outline-none focus:shadow-[0_0_0_3px_var(--ui-focus-shadow)] max-[639px]:text-base !font-[650]"></label>
              <label class="block min-w-0 text-xs font-semibold leading-normal text-ui-muted [&_input]:mt-[6px] [&_input]:block [&_input]:w-full [&_select]:mt-[6px] [&_select]:block [&_select]:w-full [&_textarea]:mt-[6px] [&_textarea]:block [&_textarea]:w-full sm:col-span-2">Código del dispositivo *<input [(ngModel)]="dispositivoCodigo" name="dispositivoCodigo" maxlength="30" required class="min-w-0 !min-h-[46px] max-w-full border px-3 !py-[10px] !border-ui-control-border rounded-xl !bg-ui-surface !text-ui-text transition-colors focus:border-ui-focus focus:outline-none focus:shadow-[0_0_0_3px_var(--ui-focus-shadow)] max-[639px]:text-base !font-[650]"></label>
            </div>
          </div><footer class="sticky bottom-0 z-[1] flex flex-[0_0_auto] flex-wrap justify-end gap-[10px] border-t border-ui-divider bg-ui-surface px-6 py-[14px] max-[639px]:px-4 max-[639px]:py-3 max-[639px]:[&>button]:flex-[1_1_auto]"><button type="button" class="rounded-xl border border-ui-divider bg-ui-surface-soft px-4 font-semibold text-ui-text max-[640px]:w-full box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]" (click)="cerrarDialogos()">Cancelar</button><button type="submit" [disabled]="operando()" class="rounded-xl bg-ui-action px-[18px] font-bold text-ui-action-text shadow-none disabled:cursor-wait disabled:opacity-[.55] max-[640px]:w-full box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]">{{ operando() ? 'Importando…' : 'Registrar marca' }}</button></footer></form>
        </div>
      </dialog>

      <dialog #justificacionDialog class="box-border w-[min(680px,calc(100vw-24px))] max-w-[calc(100vw-24px)] max-h-[calc(100dvh-24px)] overflow-hidden border border-ui-divider rounded-[22px] bg-ui-surface text-ui-text p-0 shadow-dialog backdrop:bg-[rgb(12_24_43_/_46%)] backdrop:backdrop-blur-[3px] max-[639px]:w-[calc(100vw-16px)] max-[639px]:max-w-[calc(100vw-16px)] max-[639px]:max-h-[calc(100dvh-16px)] max-[639px]:rounded-[18px]" aria-labelledby="justificacion-dialog-title">
        <div class="flex max-h-[calc(100dvh-24px)] min-h-0 flex-col"><header class="flex flex-[0_0_auto] items-center justify-between gap-4 border-b border-ui-divider px-6 py-5 [&_h3]:m-0 [&_h3]:text-ui-text [&_h3]:text-lg [&_h3]:leading-[27px] [&_h3]:font-[750] [&_p]:mb-0 [&_p]:mt-1 [&_p]:text-ui-muted [&_p]:text-xs [&_p]:leading-[1.5] max-[639px]:p-4"><div><h3 id="justificacion-dialog-title" class="tracking-[-.025em]">Justificar inasistencia</h3><p>La justificación quedará asociada a la asistencia seleccionada.</p></div><button type="button" class="min-h-11 rounded-xl border border-ui-divider bg-ui-surface-soft px-4 font-semibold text-ui-text !h-11 !w-11 !min-w-11 !min-h-11 !shrink-0 !p-0 grid place-items-center !font-[650]" (click)="cerrarDialogos()" aria-label="Cerrar">✕</button></header>
          <form (ngSubmit)="justificarSeleccionada()" class="flex min-h-0 flex-[1_1_auto] flex-col"><div class="min-h-0 flex-[1_1_auto] overflow-auto overscroll-contain px-6 py-5 max-[639px]:p-4 space-y-4">
            @if (error()) { <p class="m-0 rounded-xl border border-ui-error-border bg-ui-error-bg px-3 py-[10px] text-xs text-ui-error-text" role="alert">{{ error() }}</p> }
            <label class="block min-w-0 text-xs font-semibold leading-normal text-ui-muted [&_input]:mt-[6px] [&_input]:block [&_input]:w-full [&_select]:mt-[6px] [&_select]:block [&_select]:w-full [&_textarea]:mt-[6px] [&_textarea]:block [&_textarea]:w-full">Motivo de justificación *<textarea [(ngModel)]="motivoJustificacion" name="motivoJustificacion" required maxlength="4000" rows="4" placeholder="Describe brevemente el motivo" class="min-w-0 max-w-full border px-3 !py-[10px] !border-ui-control-border rounded-xl !bg-ui-surface !text-ui-text transition-colors focus:border-ui-focus focus:outline-none focus:shadow-[0_0_0_3px_var(--ui-focus-shadow)] max-[639px]:text-base py-[10px] resize-y !min-h-[110px] !font-[650]"></textarea></label>
            <label class="block min-w-0 text-xs font-semibold leading-normal text-ui-muted">Documento sustentatorio PDF *<input type="file" name="archivoJustificacion" accept="application/pdf,.pdf" required (change)="seleccionarArchivoJustificacion($event)" class="mt-[6px] block w-full min-h-11 rounded-xl border border-ui-control-border bg-ui-surface px-3 py-2 text-sm text-ui-text file:mr-3 file:rounded-lg file:border-0 file:bg-ui-surface-soft file:px-3 file:py-2 file:font-semibold file:text-ui-text"></label>
            <p class="m-0 text-xs text-ui-muted">PDF legible, de hasta 5 MB. El backend valida el archivo antes de guardar la justificación.</p>
          </div><footer class="sticky bottom-0 z-[1] flex flex-[0_0_auto] flex-wrap justify-end gap-[10px] border-t border-ui-divider bg-ui-surface px-6 py-[14px] max-[639px]:px-4 max-[639px]:py-3 max-[639px]:[&>button]:flex-[1_1_auto]"><button type="button" class="rounded-xl border border-ui-divider bg-ui-surface-soft px-4 font-semibold text-ui-text max-[640px]:w-full box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]" (click)="cerrarDialogos()">Cancelar</button><button type="submit" [disabled]="operando()" class="rounded-xl bg-ui-action px-[18px] font-bold text-ui-action-text shadow-none disabled:cursor-wait disabled:opacity-[.55] max-[640px]:w-full box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]">{{ operando() ? 'Guardando…' : 'Guardar justificación' }}</button></footer></form>
        </div>
      </dialog>

      <!-- Filters & Date Selection -->
      <div class="p-4 rounded-2xl !bg-ui-surface border !border-ui-divider grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label class="block text-xs !text-[11px] font-semibold !text-ui-muted mb-1">Fecha de Registro</label>
          <input
            type="date"
            [(ngModel)]="fechaSeleccionada" aria-label="Fecha de Registro"
            (change)="cargarAsistencia()"
            class="w-full px-3 py-2 rounded-xl !bg-ui-surface border !border-ui-divider !text-ui-text text-xs !text-[11px] focus:outline-none focus:border-ui-divider min-w-0 !min-h-[44px] max-w-full border px-3 py-2 !border-ui-control-border rounded-xl !bg-ui-surface !text-ui-text transition-colors focus:border-ui-focus focus:outline-none focus:shadow-[0_0_0_3px_var(--ui-focus-shadow)] max-[639px]:text-base"
          />
        </div>

        <div><label class="block text-xs !text-[11px] font-semibold !text-ui-muted mb-1">Año lectivo para conciliación</label><select [(ngModel)]="anioId" aria-label="Año lectivo para conciliación" [disabled]="!anios().length" class="w-full px-3 py-2 rounded-xl !bg-ui-surface border !border-ui-divider !text-ui-text text-xs !text-[11px] min-w-0 !min-h-[44px] max-w-full border px-3 py-2 !border-ui-control-border rounded-xl !bg-ui-surface !text-ui-text transition-colors focus:border-ui-focus focus:outline-none focus:shadow-[0_0_0_3px_var(--ui-focus-shadow)] max-[639px]:text-base">@if (!anios().length) { <option [ngValue]="0">Sin años lectivos disponibles</option> } @for (anio of anios(); track anio.id) { <option [ngValue]="anio.id">{{ anio.anio }}</option> }</select></div>

        <div class="flex items-end">
          <button
            (click)="cargarAsistencia()"
            class="w-full py-2 px-3 rounded-xl !bg-ui-surface-soft hover:!bg-ui-surface-soft !text-ui-text text-xs !text-[11px] font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 max-[640px]:w-full box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]"
          >
            <span>Actualizar de la BD</span>
          </button>
        </div>
      </div>

      <!-- Summary Quick Stats -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div class="p-4 rounded-xl border !border-ui-success-border dark:!border-[var(--ui-success-text)] !bg-ui-success-bg dark:!bg-ui-success-bg">
          <div class="text-[11px] !text-[11px] font-bold uppercase tracking-wider !text-ui-success-text dark:!text-ui-success-text">Presentes</div>
          <div class="text-2xl font-black !text-ui-text mt-1">{{ totalPresentes() }}</div>
        </div>
        <div class="p-4 rounded-xl border !border-ui-warning-border dark:!border-ui-gold !bg-ui-warning-bg dark:!bg-ui-warning-bg">
          <div class="text-[11px] !text-[11px] font-bold uppercase tracking-wider !text-ui-warning-text dark:!text-ui-warning-text">Tardanzas</div>
          <div class="text-2xl font-black !text-ui-text mt-1">{{ totalTardanzas() }}</div>
        </div>
        <div class="p-4 rounded-xl border !border-ui-divider !bg-ui-surface-soft">
          <div class="text-[11px] !text-[11px] font-bold uppercase tracking-wider !text-ui-action">Faltas Justificadas</div>
          <div class="text-2xl font-black !text-ui-text mt-1">{{ totalJustificadas() }}</div>
        </div>
        <div class="p-4 rounded-xl border !border-ui-error-border dark:!border-ui-error-border !bg-ui-error-bg dark:!bg-ui-error-bg">
          <div class="text-[11px] !text-[11px] font-bold uppercase tracking-wider !text-ui-error-text dark:!text-ui-error-text">Faltas Injustificadas</div>
          <div class="text-2xl font-black !text-ui-text mt-1">{{ totalInjustificadas() }}</div>
        </div>
      </div>

      <!-- Tabs Navigation -->
      <div class="flex items-center gap-2 border-b border-ui-divider">
        <button
          (click)="tabActiva.set('AULA')"
          [class]="tabActiva() === 'AULA' ? 'border-ui-action !text-ui-action font-bold' : 'border-transparent !text-ui-muted hover:!text-ui-text'"
          class="px-4 py-2.5 border-b-2 text-xs !text-[11px] transition cursor-pointer max-[640px]:w-full box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]"
        >
          Pase de Lista de Aula
        </button>
        @if (puedeVerConciliacion()) { <button
          (click)="tabActiva.set('CONCILIACION')"
          [class]="tabActiva() === 'CONCILIACION' ? 'border-ui-action !text-ui-action font-bold' : 'border-transparent !text-ui-muted hover:!text-ui-text'"
          class="px-4 py-2.5 border-b-2 text-xs !text-[11px] transition cursor-pointer flex items-center gap-2 max-[640px]:w-full box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]"
        >
          <span>Alertas de Conciliación Biométrica</span>
          <span class="px-1.5 py-0.2 rounded-full text-[11px] !text-[11px] !text-ui-warning-text dark:text-ui-warning-text !bg-ui-warning-bg dark:bg-ui-warning-bg border !border-ui-warning-border">
            {{ discrepancias().length }}
          </span>
        </button> }
      </div>

      <!-- Tab Content: Pase de Lista -->
      @if (tabActiva() === 'AULA') {
        <div class="rounded-2xl !bg-ui-surface border !border-ui-divider overflow-hidden shadow-sm">
          <div class="overflow-x-auto" data-attendance-table-scroll="">
            <table class="w-full min-w-[760px] text-left text-xs !text-[11px] [&_thead]:!bg-ui-surface-soft [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:!bg-ui-surface-soft" data-mobile-table-cards="">
              <thead class="!bg-ui-surface border-b !border-ui-divider !text-ui-muted uppercase tracking-wider font-semibold">
                <tr>
                  <th class="px-5 py-3.5">Estudiante</th>
                  <th class="px-5 py-3.5">Fecha</th>
                  <th class="px-5 py-3.5">Hora de registro</th>
                  <th class="px-5 py-3.5 text-center">Pase de Lista en Aula</th>
                  <th class="px-5 py-3.5 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[var(--ui-divider)] !text-ui-text">
                @if (cargando()) {
                  <tr>
                    <td colspan="5" class="text-center py-10 !text-ui-muted">
                      <span class="inline-block w-5 h-5 border-2 border-ui-divider/30 border-t-ui-action rounded-full animate-spin mb-2"></span>
                      <p>Consultando marcas de asistencia en la base de datos...</p>
                    </td>
                  </tr>
                } @else {
                  @for (item of alumnos(); track item.id) {
                    <tr class="!bg-ui-surface-soft hover:bg-ui-surface-soft transition">
                      <td class="px-5 py-3.5 font-bold !text-ui-text" data-label="Estudiante">{{ item.estudiante }}</td>
                      <td class="px-5 py-3.5 font-mono !text-ui-muted" data-label="Fecha">{{ item.fecha | uiDatePe }}</td>
                      <td class="px-5 py-3.5 font-mono !text-ui-muted" data-label="Hora de registro">{{ item.horaRegistro || '—' }}</td>
                      <td class="px-5 py-3.5 text-center font-bold" data-label="Pase de Lista en Aula">
                        @switch (item.estado) {
                          @case ('PRESENTE') { <span class="inline-grid grid-cols-[20px_auto] items-center gap-x-[7px] gap-y-px p-[6px_10px] border rounded-xl text-left leading-[1.25] !border-ui-success-border dark:!border-[var(--ui-success-text)] !bg-ui-success-bg dark:!bg-ui-success-bg !text-ui-success-text dark:!text-ui-success-text"><span class="row-span-2 grid h-5 w-5 place-items-center rounded-full font-extrabold !bg-ui-success-bg dark:bg-ui-success-bg" aria-hidden="true">✓</span><span>Presente</span><small class="col-start-2 text-[11px] [font-weight:650]">PRESENTE</small></span> }
                          @case ('TARDANZA') { <span class="inline-grid grid-cols-[20px_auto] items-center gap-x-[7px] gap-y-px p-[6px_10px] border rounded-xl text-left leading-[1.25] !border-ui-warning-border dark:!border-ui-gold !bg-ui-warning-bg dark:!bg-ui-warning-bg !text-ui-warning-text dark:!text-ui-warning-text"><span class="row-span-2 grid h-5 w-5 place-items-center rounded-full font-extrabold !bg-ui-warning-bg dark:bg-ui-warning-bg" aria-hidden="true">◷</span><span>Tardanza</span><small class="col-start-2 text-[11px] [font-weight:650]">TARDANZA</small></span> }
                          @case ('FALTA_JUSTIFICADA') { <span class="inline-grid grid-cols-[20px_auto] items-center gap-x-[7px] gap-y-px p-[6px_10px] border rounded-xl text-left leading-[1.25] !border-ui-divider !bg-ui-surface-soft !text-ui-action"><span class="row-span-2 grid h-5 w-5 place-items-center rounded-full font-extrabold !bg-ui-surface-soft" aria-hidden="true">✓</span><span>Falta justificada</span><small class="col-start-2 text-[11px] [font-weight:650]">FALTA_JUSTIFICADA</small></span> }
                          @case ('FALTA_INJUSTIFICADA') { <span class="inline-grid grid-cols-[20px_auto] items-center gap-x-[7px] gap-y-px p-[6px_10px] border rounded-xl text-left leading-[1.25] !border-ui-error-border dark:!border-ui-error-border !bg-ui-error-bg dark:!bg-ui-error-bg !text-ui-error-text dark:!text-ui-error-text"><span class="row-span-2 grid h-5 w-5 place-items-center rounded-full font-extrabold !bg-ui-error-bg dark:bg-ui-error-bg" aria-hidden="true">!</span><span>Falta injustificada</span><small class="col-start-2 text-[11px] [font-weight:650]">FALTA_INJUSTIFICADA</small></span> }
                        }
                      </td>
                      <td class="px-5 py-3.5 text-center" data-label="Acciones">
                        @if (puedeJustificar() && item.estado === 'FALTA_INJUSTIFICADA') {
                          <button (click)="abrirDialogoJustificacion(item.id)" class="text-ui-action font-semibold max-[640px]:w-full box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]">Justificar</button>
                        }
                      </td>
                    </tr>
                  } @empty {
                    <tr [hidden]="!!error()">
                      <td colspan="5" class="relative !pt-[62px] text-center py-12 !text-ui-muted space-y-2" data-illustration="calendar">
                        <svg aria-hidden="true" focusable="false" viewBox="0 0 48 48" fill="none" stroke="var(--ui-action)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="absolute top-3 left-1/2 h-[42px] w-[42px] -translate-x-1/2"><rect x="7" y="10" width="34" height="31" rx="4"/><path d="M15 6v8m18-8v8M7 19h34" stroke="var(--ui-gold)"/><path d="M15 26h4m5 0h4m5 0h3M15 33h4m5 0h4"/></svg>
                      <p class="font-medium !text-ui-muted">No se encontraron marcas de asistencia para la fecha indicada.</p>
                        <p class="text-[11px] !text-ui-muted">Los pases de lista registrados en el aula y las importaciones biométricas se mostrarán aquí.</p>
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
          <div class="rounded-2xl !bg-ui-surface border !border-ui-divider overflow-hidden shadow-sm">
            <div class="overflow-x-auto" data-attendance-table-scroll="">
            <table class="w-full min-w-[760px] text-left text-xs !text-[11px] [&_thead]:!bg-ui-surface-soft [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:!bg-ui-surface-soft" data-mobile-table-cards="">
              <thead class="!bg-ui-surface border-b !border-ui-divider !text-ui-muted uppercase tracking-wider font-semibold">
                <tr>
                  <th class="px-5 py-3.5">Estudiante</th>
                  <th class="px-5 py-3.5">Fecha</th>
                  <th class="px-5 py-3.5">Resultado</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[var(--ui-divider)] !text-ui-text">
                @for (d of discrepancias(); track $index) {
                  <tr class="!bg-ui-surface-soft hover:bg-ui-surface-soft transition">
                    <td class="px-5 py-3.5 font-bold !text-ui-text" data-label="Estudiante">{{ d.nombreEstudiante || ('Estudiante #' + d.estudianteId) }}</td>
                    <td class="px-5 py-3.5 font-mono !text-ui-muted" data-label="Fecha">{{ d.fecha | uiDatePe }}</td>
                    <td class="px-5 py-3.5" data-label="Resultado">
                      <ui-status-badge [label]="resultadoDiscrepancia(d.tipoDiscrepancia)" [tone]="tonoDiscrepancia(d.tipoDiscrepancia)" />
                    </td>
                  </tr>
                } @empty {
                  <tr [hidden]="!!error()">
                    <td colspan="3" class="relative !pt-[62px] text-center py-12 !text-ui-muted space-y-2" data-illustration="calendar">
                      <svg aria-hidden="true" focusable="false" viewBox="0 0 48 48" fill="none" stroke="var(--ui-action)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="absolute top-3 left-1/2 h-[42px] w-[42px] -translate-x-1/2"><rect x="7" y="10" width="34" height="31" rx="4"/><path d="M15 6v8m18-8v8M7 19h34" stroke="var(--ui-gold)"/><path d="M15 26h4m5 0h4m5 0h3M15 33h4m5 0h4"/></svg>
                      <p class="font-medium !text-ui-muted">No hay resultados de conciliación para la fecha indicada.</p>
                      <p class="text-[11px] !text-ui-muted">La respuesta no contiene alertas para esta fecha.</p>
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
  private readonly authStore = inject(AuthStore);
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
  readonly archivoJustificacion = signal<File | null>(null);
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

  puedeRegistrarAsistencia(): boolean { return this.authStore.hasAnyRole(['DOCENTE', 'AUXILIAR', 'TUTOR']); }
  puedeImportarBiometria(): boolean { return this.authStore.hasAnyRole(['SECRETARIA', 'AUXILIAR']); }
  puedeConciliar(): boolean { return this.authStore.hasAnyRole(['SECRETARIA', 'AUXILIAR']); }
  puedeVerConciliacion(): boolean { return this.authStore.hasAnyRole(['DIRECCION', 'SECRETARIA', 'AUXILIAR']); }
  puedeJustificar(): boolean { return this.authStore.hasAnyRole(['SECRETARIA', 'AUXILIAR', 'TUTOR']); }
  private usaReporteDocente(): boolean { return this.authStore.hasAnyRole(['DOCENTE', 'TUTOR']); }

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
    const mostrarRegistros = (registros: Array<AsistenciaAulaResponseDto | DocenteAsistenciaDiariaResponseDto>) => {
      this.cargando.set(false);
      this.alumnos.set(registros.map(a => this.mapearAsistencia(a)));
    };
    const mostrarError = () => {
      this.cargando.set(false);
      this.alumnos.set([]);
      this.error.set('No se pudieron cargar las marcas de asistencia.');
    };
    if (this.usaReporteDocente()) {
      this.asistenciaService.obtenerReporteDocente(this.fechaSeleccionada).subscribe({ next: mostrarRegistros, error: mostrarError });
    } else {
      this.asistenciaService.obtenerReporteDiario(this.fechaSeleccionada).subscribe({ next: reporte => mostrarRegistros(reporte.asistencias), error: mostrarError });
    }

    if (!this.puedeVerConciliacion()) {
      this.discrepancias.set([]);
      return;
    }
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

  private mapearAsistencia(a: AsistenciaAulaResponseDto | DocenteAsistenciaDiariaResponseDto): AlumnoAsistenciaItem {
    const nombre = 'nombreEstudiante' in a ? a.nombreEstudiante : a.estudiante;
    return {
      id: a.id,
      estudiante: `${nombre || 'Estudiante'} · Matrícula #${a.matriculaId}`,
      fecha: a.fechaSesion,
      estado: a.estado as EstadoAsistencia,
      horaRegistro: a.horaRegistro || undefined
    };
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

  seleccionarArchivoJustificacion(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.archivoJustificacion.set(input.files?.[0] ?? null);
  }

  justificar(asistenciaId: number): void {
    const archivo = this.archivoJustificacion();
    if (!this.motivoJustificacion.trim()) { this.error.set('Indique el motivo de justificación.'); return; }
    if (!archivo || !archivo.name.toLowerCase().endsWith('.pdf') || archivo.size > 5 * 1024 * 1024) { this.error.set('Adjunte un PDF de hasta 5 MB.'); return; }
    this.error.set(null); this.mensaje.set(null); this.operando.set(true);
    this.asistenciaService.justificarInasistencia({ asistenciaId, motivo: this.motivoJustificacion.trim(), archivo }).subscribe({
      next: () => { this.operando.set(false); this.cerrarDialogos(); this.justificacionId.set(null); this.motivoJustificacion = ''; this.archivoJustificacion.set(null); this.mensaje.set('Falta justificada en la base de datos.'); this.cargarAsistencia(); },
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
    this.archivoJustificacion.set(null);
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
