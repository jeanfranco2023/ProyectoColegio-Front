import { FormatoEntradaDirective } from '../../shared/ui/formato-entrada.directive';
import { Component, ElementRef, inject, signal, computed, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AsistenciaService } from '../../core/services/asistencia.service';
import { AcademicoService } from '../../core/services/academico.service';
import { AnioLectivoResponseDto } from '../../core/models/academico.model';
import { DiscrepanciaAlertaResponseDto, EstadoImportacionBiometrica, ImportacionBiometricaResponseDto, TipoDiscrepancia } from '../../core/models/asistencia.model';
import { UiDatePePipe } from '../../shared/ui/ui-date-pe.pipe';
import { UiCalendarComponent } from '../../shared/ui/ui-calendar.component';
import { StatusBadgeComponent, UiStatusTone } from '../../shared/ui/status-badge.component';
import { AuthStore } from '../../core/state/auth.store';
import { UiPaginacionComponent, paginarRegistros } from '../../shared/ui/ui-paginacion.component';
import { timer } from 'rxjs';
import { switchMap, takeWhile } from 'rxjs/operators';

export type EstadoAsistencia = 'PRESENTE' | 'TARDANZA' | 'FALTA_JUSTIFICADA' | 'FALTA_INJUSTIFICADA';

export interface AlumnoAsistenciaItem {
  id: number;
  estudiante: string;
  estado: EstadoAsistencia;
  fecha: string;
  seccionId?: number | null;
  seccion?: string | null;
  horaMarcacionPuerta?: string;
  tieneDocumentoSustento?: boolean;
}

function fechaDiaEscolarMasReciente(): string {
  const fecha = new Date();
  if (fecha.getDay() === 0) fecha.setDate(fecha.getDate() - 2);
  else if (fecha.getDay() === 6) fecha.setDate(fecha.getDate() - 1);
  return fecha.toLocaleDateString('sv-SE');
}

@Component({
  selector: 'app-asistencia',
  standalone: true,
  imports: [FormatoEntradaDirective, CommonModule, FormsModule, UiDatePePipe, UiCalendarComponent, StatusBadgeComponent, UiPaginacionComponent],
  template: `
    <div class="space-y-6 min-w-0 font-sans text-[#172b4d] [&_*:focus-visible]:outline-[3px] [&_*:focus-visible]:outline-[#2864c5] [&_*:focus-visible]:outline-offset-[3px] [&_button]:min-h-11 [&_input]:min-h-11 [&_select]:min-h-11">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t-[3px] border-t-[#c49a58]/50 pt-3">
        <div>
          <h2 class="text-2xl sm:text-3xl font-extrabold tracking-tight !text-[#172b4d] tracking-[-.025em]">Control de Asistencia & Biometría</h2>
          <p class="text-sm !text-[#59677a] mt-1">
            Espacio de trabajo diario por fecha, sección y lista de estudiantes con conciliación biométrica.
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          @if (puedeRegistrar()) {
          <button (click)="abrirDialogoRegistro()" [disabled]="puedeSeleccionarMatricula() && matriculasDocente().length === 0" class="px-4 py-2.5 rounded-xl !bg-[#1d4ed8] hover:!bg-[#1e40af] !text-white font-semibold text-xs !text-[11px] sm:text-sm cursor-pointer max-[640px]:w-full box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]">Registrar asistencia</button>
          }
          @if (puedeGestionarBiometria()) {
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
          }
        </div>
      </div>
      @if (error()) {
        <div class="flex items-center justify-between gap-3 rounded-2xl border border-[#fecaca] bg-[#fef2f2] p-4 text-[#b91c1c] shadow-sm" role="alert">
          <div class="flex items-center gap-2.5">
            <span class="text-base">⚠️</span>
            <span class="text-xs sm:text-sm font-semibold">{{ error() }}</span>
          </div>
          <button type="button" (click)="error.set(null)" class="text-xs font-bold text-[#b91c1c] hover:underline cursor-pointer">✕</button>
        </div>
      }
      @if (mensaje()) {
        <div class="flex items-center justify-between gap-3 rounded-2xl border border-[#b8dfcc] bg-[#edf9f3] p-4 text-[#146c45] shadow-sm animate-fade-in" role="status">
          <div class="flex items-center gap-3">
            <span class="grid h-8 w-8 place-items-center rounded-full bg-[#d8f0e3] text-sm font-black shrink-0">✓</span>
            <div>
              <p class="m-0 text-xs sm:text-sm font-bold">{{ mensaje() }}</p>
              <p class="m-0 mt-0.5 text-[11px] text-[#146c45]/90">La grilla de asistencia de la sección y los indicadores han sido actualizados en tiempo real.</p>
            </div>
          </div>
          <button type="button" (click)="mensaje.set(null)" class="text-xs font-bold text-[#146c45] hover:underline cursor-pointer">✕</button>
        </div>
      }

      <dialog #registroDialog class="box-border w-[min(680px,calc(100vw-24px))] max-w-[calc(100vw-24px)] max-h-[calc(100dvh-24px)] overflow-hidden border border-[#e4eaf3] rounded-[22px] bg-white text-[#14213d] p-0 shadow-[0_28px_90px_rgb(15_31_57_/_28%)] backdrop:bg-[rgb(12_24_43_/_46%)] backdrop:backdrop-blur-[3px] max-[639px]:w-[calc(100vw-16px)] max-[639px]:max-w-[calc(100vw-16px)] max-[639px]:max-h-[calc(100dvh-16px)] max-[639px]:rounded-[18px]" aria-labelledby="registro-dialog-title">
        <div class="flex max-h-[calc(100dvh-24px)] min-h-0 flex-col"><header class="flex flex-[0_0_auto] items-center justify-between gap-4 border-b border-[#e5eaf2] px-6 py-5 [&_h3]:m-0 [&_h3]:text-[#14213d] [&_h3]:text-lg [&_h3]:leading-[27px] [&_h3]:font-[750] [&_p]:mb-0 [&_p]:mt-1 [&_p]:text-[#64748b] [&_p]:text-xs [&_p]:leading-[1.5] max-[639px]:p-4"><div><h3 id="registro-dialog-title" class="tracking-[-.025em]">Registrar asistencia</h3><p>Registra una marca manual para la matrícula seleccionada.</p></div><button type="button" class="min-h-11 rounded-xl border border-[#e5eaf2] bg-[#f5f7fb] px-4 font-semibold text-[#334155] !h-11 !w-11 !min-w-11 !min-h-11 !shrink-0 !p-0 grid place-items-center !font-[650]" (click)="cerrarDialogos()" aria-label="Cerrar">✕</button></header>
          <form (ngSubmit)="registrarAsistencia()" class="flex min-h-0 flex-[1_1_auto] flex-col"><div class="min-h-0 flex-[1_1_auto] overflow-auto overscroll-contain px-6 py-5 max-[639px]:p-4 space-y-4">
            @if (error()) { <p class="m-0 rounded-xl border border-[#fecaca] bg-[#fef2f2] px-3 py-[10px] text-xs text-[#b91c1c]" role="alert">{{ error() }}</p> }
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              @if (puedeSeleccionarMatricula()) {
                <div>
                  <label for="asistencia-estudiante-select" class="block min-w-0 text-xs font-semibold leading-normal text-[#475569]">Estudiante asignado *</label>
                  <select id="asistencia-estudiante-select" [(ngModel)]="matriculaId" name="matriculaId" required class="mt-[6px] block w-full min-h-[46px] rounded-xl border border-[#d9e1ec] bg-white px-3 text-[#172b4d]"><option [ngValue]="0" disabled>Seleccione estudiante</option>@for (matricula of matriculasDocente(); track matricula.matriculaId) { <option [ngValue]="matricula.matriculaId">{{ matricula.estudiante }}</option> }</select>
                </div>
              } @else {
                <div>
                  <label for="asistencia-matricula-id" class="block min-w-0 text-xs font-semibold leading-normal text-[#475569]">Matrícula ID *</label>
                  <input id="asistencia-matricula-id" appFormatoEntrada="entero" type="number" [(ngModel)]="matriculaId" name="matriculaId" min="1" required class="mt-[6px] block w-full min-w-0 !min-h-[46px] max-w-full border px-3 !py-[10px] !border-[#d9e1ec] rounded-xl !bg-white !text-[#172b4d] transition-colors focus:border-[#5b83d6] focus:outline-none focus:shadow-[0_0_0_3px_rgb(59_110_214_/_13%)] max-[639px]:text-base !font-[650]">
                </div>
              }
              <div>
                <label for="asistencia-fecha-nueva" class="block min-w-0 text-xs font-semibold leading-normal text-[#475569] mb-[6px]">Fecha *</label>
                <app-ui-calendar id="asistencia-fecha-nueva" [(ngModel)]="fechaSesionNueva" name="fechaSesion" [disableWeekends]="true" [required]="true" aria-label="Fecha de asistencia"></app-ui-calendar>
              </div>
              <div>
                <label for="asistencia-hora-registro" class="block min-w-0 text-xs font-semibold leading-normal text-[#475569]">Hora *</label>
                <input id="asistencia-hora-registro" type="time" [(ngModel)]="horaRegistro" name="horaRegistro" required class="mt-[6px] block w-full min-w-0 !min-h-[46px] max-w-full border px-3 !py-[10px] !border-[#d9e1ec] rounded-xl !bg-white !text-[#172b4d] transition-colors focus:border-[#5b83d6] focus:outline-none focus:shadow-[0_0_0_3px_rgb(59_110_214_/_13%)] max-[639px]:text-base !font-[650]">
              </div>
              <div>
                <label for="asistencia-estado-registro" class="block min-w-0 text-xs font-semibold leading-normal text-[#475569]">Estado</label>
                <select id="asistencia-estado-registro" [(ngModel)]="estadoRegistro" name="estado" class="mt-[6px] block w-full min-w-0 !min-h-[46px] max-w-full border px-3 !py-[10px] !border-[#d9e1ec] rounded-xl !bg-white !text-[#172b4d] transition-colors focus:border-[#5b83d6] focus:outline-none focus:shadow-[0_0_0_3px_rgb(59_110_214_/_13%)] max-[639px]:text-base !font-[650]"><option value="PRESENTE">Presente</option><option value="TARDANZA">Tardanza</option><option value="FALTA_INJUSTIFICADA">Falta injustificada</option></select>
              </div>
            </div>
          </div><footer class="sticky bottom-0 z-[1] flex flex-[0_0_auto] flex-wrap justify-end gap-[10px] border-t border-[#e5eaf2] bg-white px-6 py-[14px] max-[639px]:px-4 max-[639px]:py-3 max-[639px]:[&>button]:flex-[1_1_auto]"><button type="button" class="rounded-xl border border-[#e5eaf2] bg-[#f5f7fb] px-4 font-semibold text-[#334155] max-[640px]:w-full box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]" (click)="cerrarDialogos()">Cancelar</button><button type="submit" [disabled]="operando()" class="rounded-xl bg-[#2563eb] px-[18px] font-bold text-white shadow-[0_8px_18px_rgb(37_99_235_/_18%)] disabled:cursor-wait disabled:opacity-[.55] max-[640px]:w-full box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]">{{ operando() ? 'Guardando…' : 'Guardar asistencia' }}</button></footer></form>
        </div>
      </dialog>

      <dialog #biometricoDialog class="box-border w-[min(740px,calc(100vw-24px))] max-w-[calc(100vw-24px)] max-h-[calc(100dvh-24px)] overflow-hidden border border-[#e4eaf3] rounded-[22px] bg-white text-[#14213d] p-0 shadow-[0_28px_90px_rgb(15_31_57_/_28%)] backdrop:bg-[rgb(12_24_43_/_46%)] backdrop:backdrop-blur-[3px] max-[639px]:w-[calc(100vw-16px)] max-[639px]:max-w-[calc(100vw-16px)] max-[639px]:max-h-[calc(100dvh-16px)] max-[639px]:rounded-[18px]" aria-labelledby="biometrico-dialog-title">
        <div class="flex max-h-[calc(100dvh-24px)] min-h-0 flex-col">
          <header class="flex flex-[0_0_auto] items-center justify-between gap-4 border-b border-[#e5eaf2] bg-[#f8fafc] px-6 py-5 max-[639px]:p-4">
            <div class="flex items-center gap-3">
              <span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#eaf1ff] text-[#1d4ed8]">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
              </span>
              <div>
                <h3 id="biometrico-dialog-title" class="m-0 text-lg font-extrabold text-[#14213d] tracking-[-.025em]">Importación de Asistencia & Biometría</h3>
                <p class="m-0 mt-0.5 text-xs text-[#64748b]">Flujo guiado en 3 etapas: Selección, Revisión previa y Resultado de procesamiento.</p>
              </div>
            </div>
            <button type="button" class="min-h-10 rounded-xl border border-[#e5eaf2] bg-white px-3 font-semibold text-[#334155] hover:bg-slate-100 transition cursor-pointer" (click)="cerrarDialogos()" aria-label="Cerrar">✕</button>
          </header>

          <!-- Pestañas de modo -->
          <div class="flex border-b border-[#e2e8f0] bg-slate-50/60 px-6 pt-2">
            <button
              type="button"
              (click)="modoImportacion.set('csv')"
              [class]="modoImportacion() === 'csv' ? 'border-b-2 border-[#1d4ed8] text-[#1d4ed8] font-bold bg-white rounded-t-lg' : 'text-[#64748b] hover:text-[#1e293b] font-medium'"
              class="px-4 py-2.5 text-xs transition cursor-pointer flex items-center gap-2"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"/></svg>
              <span>Carga masiva (CSV / XLSX)</span>
            </button>
            <button
              type="button"
              (click)="modoImportacion.set('manual')"
              [class]="modoImportacion() === 'manual' ? 'border-b-2 border-[#1d4ed8] text-[#1d4ed8] font-bold bg-white rounded-t-lg' : 'text-[#64748b] hover:text-[#1e293b] font-medium'"
              class="px-4 py-2.5 text-xs transition cursor-pointer flex items-center gap-2"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
              <span>Registro manual individual</span>
            </button>
          </div>

          <div class="min-h-0 flex-[1_1_auto] overflow-auto overscroll-contain px-6 py-5 max-[639px]:p-4 space-y-4">
            @if (error()) {
              <div class="m-0 rounded-xl border border-[#fecaca] bg-[#fef2f2] px-3.5 py-2.5 text-xs text-[#b91c1c] flex items-center gap-2" role="alert">
                <span>⚠️</span>
                <span>{{ error() }}</span>
              </div>
            }

            @if (modoImportacion() === 'csv') {
              <div class="space-y-4">
                <!-- Indicador de las 3 etapas claras -->
                <ol class="grid grid-cols-3 gap-2 rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] p-2.5 text-xs" aria-label="Etapas de importación CSV/XLSX">
                  <li [class]="etapaImportacion() === 1 ? 'rounded-xl border border-blue-200 bg-white p-2.5 font-bold text-[#1d4ed8] shadow-2xs' : 'rounded-xl p-2.5 text-[#475569]'">
                    <span class="block text-[10px] uppercase tracking-wider">Etapa 1</span>
                    <span>1. Selección de archivo</span>
                  </li>
                  <li [class]="etapaImportacion() === 2 ? 'rounded-xl border border-blue-200 bg-white p-2.5 font-bold text-[#1d4ed8] shadow-2xs' : 'rounded-xl p-2.5 text-[#475569]'">
                    <span class="block text-[10px] uppercase tracking-wider">Etapa 2</span>
                    <span>2. Revisión previa</span>
                  </li>
                  <li [class]="etapaImportacion() === 3 ? 'rounded-xl border border-blue-200 bg-white p-2.5 font-bold text-[#1d4ed8] shadow-2xs' : 'rounded-xl p-2.5 text-[#475569]'">
                    <span class="block text-[10px] uppercase tracking-wider">Etapa 3</span>
                    <span>3. Resultado de importación</span>
                  </li>
                </ol>

                <!-- Etapa 1: Selección de archivo y plantillas -->
                @if (etapaImportacion() === 1) {
                  <div class="space-y-4">
                    <div class="rounded-2xl border border-[#d9e1ec] bg-gradient-to-r from-[#f8fafc] to-[#edf4ff] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span class="text-[11px] font-extrabold uppercase tracking-wider text-[#1d4ed8] block">Plantilla de asistencia</span>
                        <p class="m-0 text-xs text-[#334155] font-semibold mt-0.5">Reemplaza los DNI y las fechas del ejemplo por los registros de tu padrón antes de importar.</p>
                        <p class="m-0 text-[11px] text-[#64748b] font-mono mt-0.5">dni, fechaHora (ISO-8601 con zona -05:00), dispositivoCodigo</p>
                      </div>
                      <div class="flex flex-wrap items-center gap-2 shrink-0">
                        <button
                          type="button"
                          (click)="descargarPlantillaCsv()"
                          class="px-3.5 py-2 rounded-xl border border-[#1d4ed8]/40 bg-white hover:bg-blue-50 text-[#1d4ed8] font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                          title="Descargar plantilla CSV con cabecera dni,fechaHora,dispositivoCodigo"
                        >
                          <svg class="w-4 h-4 text-[#1d4ed8]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                          <span>Descargar Plantilla CSV</span>
                        </button>
                      </div>
                    </div>

                    <div class="rounded-2xl border-2 border-dashed border-[#b9c9df] hover:border-[#2563eb] bg-[#f8fafc] p-6 text-center transition space-y-3">
                      <div class="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 mx-auto flex items-center justify-center text-2xl shadow-sm">
                        📁
                      </div>
                      <div>
                        <label for="archivo-csv-biometrico" class="block text-sm font-bold text-[#172b4d] cursor-pointer">1. Selecciona tu archivo CSV o XLSX biométrico</label>
                        <p class="m-0 mt-1 text-xs text-[#64748b]">Validación automática de formato (.csv / .xlsx) y tamaño máximo de 5 MB (hasta 10 000 filas).</p>
                      </div>
                      <div class="pt-2">
                        <input
                          id="archivo-csv-biometrico"
                          type="file"
                          accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                          aria-label="Archivo CSV o XLSX biométrico"
                          (change)="seleccionarCsvBiometrico($event)"
                          class="block w-full max-w-sm mx-auto text-xs text-[#334155] file:mr-3 file:min-h-10 file:rounded-xl file:border-0 file:bg-[#1d4ed8] file:px-4 file:font-semibold file:text-white hover:file:bg-[#1e40af] cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                }

                <!-- Etapa 2: Revisión previa -->
                @if (etapaImportacion() === 2 && archivoBiometrico) {
                  <div class="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5 space-y-3" aria-label="Revisión previa del archivo">
                    <div class="flex flex-wrap items-start justify-between gap-2">
                      <div class="flex items-center gap-2.5">
                        <span class="w-8 h-8 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center text-sm font-black">✓</span>
                        <div>
                          <span class="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 block">Etapa 2 · Revisión previa antes de confirmar envío</span>
                          <p class="m-0 text-sm font-bold text-emerald-950">{{ archivoBiometrico.name }} ({{ (archivoBiometrico.size / 1024).toFixed(1) }} KB)</p>
                        </div>
                      </div>
                      <button type="button" (click)="irAEtapaImportacion(1)" class="rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 cursor-pointer">
                        Cambiar archivo
                      </button>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
                      <div class="rounded-xl border border-emerald-200 bg-white p-3">
                        <span class="text-[10px] font-bold uppercase text-slate-500 block">Formato validado</span>
                        <strong class="text-slate-800">{{ archivoBiometrico.name.toLowerCase().endsWith('.xlsx') ? 'Planilla XLSX' : 'Archivo CSV' }} · ≤ 5 MB</strong>
                      </div>
                      <div class="rounded-xl border border-emerald-200 bg-white p-3">
                        <span class="text-[10px] font-bold uppercase text-slate-500 block">Filas detectadas</span>
                        <strong class="text-slate-800">{{ csvTotalFilasDetectadas() > 0 ? '~' + csvTotalFilasDetectadas() + ' registros' : 'Listo para validación en servidor' }}</strong>
                      </div>
                      <div class="rounded-xl border border-emerald-200 bg-white p-3">
                        <span class="text-[10px] font-bold uppercase text-slate-500 block">Fecha identificada</span>
                        <strong class="text-slate-800">{{ csvFechaDetectada() || 'Múltiples / según archivo' }}</strong>
                      </div>
                    </div>

                    @if (csvFechaDetectada()) {
                      <div class="pt-1">
                        <label for="ajustar-fecha-importar" class="flex items-center gap-2 text-xs font-semibold text-emerald-900 cursor-pointer">
                          <input id="ajustar-fecha-importar" type="checkbox" [(ngModel)]="ajustarFechaAlImportar" class="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4">
                          <span>Ajustar automáticamente la vista a la fecha <strong>{{ csvFechaDetectada() }}</strong> al finalizar la importación</span>
                        </label>
                      </div>
                    }
                  </div>
                }

                <!-- Etapa 3: Resultado de importación -->
                @if (etapaImportacion() === 3) {
                  <div class="rounded-2xl border border-[#d9e1ec] bg-[#f8fafc] p-5 space-y-3" role="status" aria-live="polite">
                    <div class="flex items-center justify-between gap-2">
                      <div>
                        <span class="text-[10px] font-extrabold uppercase tracking-wider text-[#1d4ed8] block">Etapa 3 · Resultado de importación (HTTP 202 / Procesamiento)</span>
                        <h4 class="m-0 mt-0.5 text-sm font-bold text-[#172b4d]">
                          {{ estadoImportacion() === 'EN_COLA' ? 'Importación recibida y en cola (202 Accepted)' : estadoImportacion() === 'PROCESANDO' ? 'Procesando marcas biométricas en segundo plano…' : estadoImportacion() === 'ERROR' ? 'La importación terminó con observaciones de error' : 'Importación completada exitosamente' }}
                        </h4>
                      </div>
                      <span class="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                        {{ estadoImportacion() || 'PROCESADO' }}
                      </span>
                    </div>

                    @if (ultimoResultadoImportacion(); as res) {
                      <div class="grid grid-cols-3 gap-2.5 text-xs">
                        <div class="rounded-xl border border-slate-200 bg-white p-3">
                          <span class="text-[10px] font-bold uppercase text-slate-500 block">Total filas</span>
                          <strong class="text-base text-slate-900">{{ res.totalFilas }}</strong>
                        </div>
                        <div class="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                          <span class="text-[10px] font-bold uppercase text-emerald-700 block">Marcas válidas</span>
                          <strong class="text-base text-emerald-900">{{ res.marcasValidas }}</strong>
                        </div>
                        <div class="rounded-xl border border-amber-200 bg-amber-50 p-3">
                          <span class="text-[10px] font-bold uppercase text-amber-800 block">Duplicadas / erróneas</span>
                          <strong class="text-base text-amber-900">{{ res.marcasErroneas }}</strong>
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>
            } @else {
              <!-- Registro manual individual -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label for="biometrico-dni" class="block min-w-0 text-xs font-semibold leading-normal text-[#475569]">DNI del estudiante *</label>
                  <input id="biometrico-dni" appFormatoEntrada="dni" [(ngModel)]="dniBiometrico" name="dniBiometrico" inputmode="numeric" pattern="[0-9]{8}" maxlength="8" required placeholder="8 dígitos" class="mt-[6px] block w-full min-h-[46px] rounded-xl border border-[#d9e1ec] bg-white px-3 text-[#172b4d] font-semibold" />
                </div>
                <div class="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(94px,auto)]">
                  <div class="grid min-w-0 gap-1">
                    <label for="biometrico-fecha" class="text-xs font-semibold text-[#475569]">Fecha *</label>
                    <app-ui-calendar id="biometrico-fecha" [(ngModel)]="fechaBiometrico" name="fechaBiometrico" [required]="true" aria-label="Fecha de la marca biométrica" />
                  </div>
                  <div class="grid min-w-0 gap-1">
                    <label for="biometrico-hora" class="text-xs font-semibold text-[#475569]">Hora *</label>
                    <input id="biometrico-hora" type="time" [(ngModel)]="horaBiometrico" name="horaBiometrico" required class="block w-full min-h-11 rounded-lg border border-[#d9e1ec] bg-white px-2 text-[#172b4d]" />
                  </div>
                </div>
                <div class="sm:col-span-2">
                  <label for="biometrico-dispositivo" class="block min-w-0 text-xs font-semibold leading-normal text-[#475569]">Código del dispositivo *</label>
                  <input id="biometrico-dispositivo" [(ngModel)]="dispositivoCodigo" name="dispositivoCodigo" maxlength="30" required class="mt-[6px] block w-full min-h-[46px] rounded-xl border border-[#d9e1ec] bg-white px-3 text-[#172b4d] font-semibold" />
                </div>
              </div>
            }
          </div>

          <footer class="sticky bottom-0 z-[1] flex flex-[0_0_auto] flex-wrap justify-end gap-[10px] border-t border-[#e5eaf2] bg-[#f8fafc] px-6 py-[14px] max-[639px]:px-4 max-[639px]:py-3">
            <button type="button" class="rounded-xl border border-[#e5eaf2] bg-white px-4 font-semibold text-[#334155] min-h-[44px] cursor-pointer" (click)="cerrarDialogos()">Cancelar</button>
            @if (modoImportacion() === 'csv') {
              <button
                type="button"
                (click)="importarCsvBiometrico()"
                [disabled]="operando() || !archivoBiometrico"
                class="rounded-xl bg-[#1d4ed8] hover:bg-[#1e40af] px-5 font-bold text-white shadow-sm min-h-[44px] inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                @if (operando()) {
                  <span class="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>Procesando archivo CSV…</span>
                } @else {
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                  <span>Confirmar e importar CSV</span>
                }
              </button>
              @if (estadoImportacion()) {
                <span class="basis-full text-right text-xs font-semibold text-[#475569]" role="status" aria-live="polite">
                  {{ estadoImportacion() === 'EN_COLA' ? 'Importación en cola; se procesará por turnos.' : estadoImportacion() === 'PROCESANDO' ? 'Procesando importación en segundo plano…' : estadoImportacion() === 'ERROR' ? 'La importación terminó con error.' : 'Importación completada.' }}
                </span>
              }
            } @else {
              <button
                type="button"
                (click)="importarMarca()"
                [disabled]="operando()"
                class="rounded-xl bg-[#1d4ed8] hover:bg-[#1e40af] px-5 font-bold text-white shadow-sm min-h-[44px] inline-flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {{ operando() ? 'Registrando…' : 'Registrar marca individual' }}
              </button>
            }
          </footer>
        </div>
      </dialog>

      <dialog #justificacionDialog class="!fixed !left-1/2 !top-1/2 !m-0 !-translate-x-1/2 !-translate-y-1/2 box-border w-[min(600px,calc(100vw-24px))] max-w-[calc(100vw-24px)] max-h-[calc(100dvh-24px)] overflow-hidden border border-[#e4eaf3] rounded-[22px] bg-white text-[#14213d] p-0 shadow-[0_28px_90px_rgb(15_31_57_/_28%)] backdrop:bg-[rgb(12_24_43_/_46%)] backdrop:backdrop-blur-[3px] max-[639px]:w-[calc(100vw-16px)] max-[639px]:max-w-[calc(100vw-16px)] max-[639px]:max-h-[calc(100dvh-16px)] max-[639px]:rounded-[18px]" aria-labelledby="justificacion-dialog-title">
        <div class="flex max-h-[calc(100dvh-24px)] min-h-0 flex-col">
          <header class="flex flex-[0_0_auto] items-center justify-between gap-4 border-b border-[#e5eaf2] px-6 py-5 max-[639px]:p-4">
            <div>
              <h3 id="justificacion-dialog-title" class="m-0 text-lg font-[750] leading-[27px] tracking-[-.025em] text-[#14213d]">Justificar inasistencia</h3>
              <p class="mb-0 mt-1 text-xs leading-relaxed text-[#64748b]">Registra el motivo y adjunta el documento que lo sustenta.</p>
            </div>
            <button type="button" class="grid h-11 w-11 min-h-11 min-w-11 shrink-0 place-items-center rounded-xl border border-[#e5eaf2] bg-[#f5f7fb] font-semibold text-[#334155]" (click)="cerrarDialogos()" aria-label="Cerrar">✕</button>
          </header>
          <form (ngSubmit)="justificarSeleccionada()" class="flex min-h-0 flex-[1_1_auto] flex-col">
            <div class="min-h-0 flex-[1_1_auto] space-y-5 overflow-auto overscroll-contain px-6 py-5 max-[639px]:space-y-4 max-[639px]:p-4">
              @if (error()) { <p class="m-0 rounded-xl border border-[#fecaca] bg-[#fef2f2] px-3 py-[10px] text-sm text-[#b91c1c]" role="alert">{{ error() }}</p> }
              <section class="rounded-xl border border-[#dce5f2] bg-[#f7f9fc] px-4 py-3" aria-label="Inasistencia seleccionada">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <div class="min-w-0">
                    <p class="m-0 text-[11px] font-semibold text-[#64748b]">ASISTENCIA #{{ justificacionId() }}</p>
                    <p class="mb-0 mt-1 truncate text-sm font-bold text-[#172b4d]">{{ asistenciaEnJustificacion()?.estudiante || 'Estudiante seleccionado' }}</p>
                  </div>
                  <div class="text-right">
                    <p class="m-0 text-[11px] font-semibold text-[#64748b]">FECHA DE FALTA</p>
                    @if (asistenciaEnJustificacion()?.fecha) { <p class="mb-0 mt-1 text-sm font-semibold text-[#172b4d]">{{ asistenciaEnJustificacion()?.fecha | uiDatePe }}</p> }
                  </div>
                </div>
              </section>
              <div>
                <label for="motivo-justificacion" class="block text-sm font-semibold leading-normal text-[#334155]">Motivo de la inasistencia *</label>
                <span class="mt-1 block text-xs font-normal text-[#64748b]">Explica brevemente por qué el estudiante no pudo asistir.</span>
                <textarea id="motivo-justificacion" [(ngModel)]="motivoJustificacion" name="motivoJustificacion" required maxlength="4000" rows="4" placeholder="Escribe el motivo de la ausencia…" class="mt-2 block min-h-[112px] w-full resize-y rounded-xl border border-[#d9e1ec] bg-white px-3 py-3 text-sm font-normal leading-relaxed text-[#172b4d] transition-colors focus:border-[#5b83d6] focus:outline-none focus:shadow-[0_0_0_3px_rgb(59_110_214_/_13%)]"></textarea>
                <span class="mt-1 block text-right text-xs font-normal text-[#64748b]">{{ motivoJustificacion.length }} / 4000 caracteres</span>
              </div>
              <section class="rounded-2xl border border-[#d8e2f0] bg-white p-4 max-[639px]:p-3" aria-labelledby="sustento-title">
                <div class="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h4 id="sustento-title" class="m-0 text-sm font-bold text-[#172b4d]">Documento de sustento <span class="text-[#b42318]">*</span></h4>
                    <p class="mb-0 mt-1 text-xs leading-relaxed text-[#64748b]">PDF de hasta 5 MB. Se guardará de forma privada junto a esta asistencia.</p>
                  </div>
                  <span class="rounded-full border border-[#dce5f2] bg-[#f7f9fc] px-2.5 py-1 text-[11px] font-semibold text-[#52647e]">PDF · máx. 5 MB</span>
                </div>
                <div class="mt-3 flex flex-col gap-3 rounded-xl border border-dashed border-[#a9bbd4] bg-[#f7f9fc] p-4 max-[639px]:p-3">
                  <div class="flex items-center gap-3">
                    <span class="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#eaf1ff] text-[#2458a6]" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none" class="h-5 w-5" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M7 3.75h6l4.25 4.5v11A1.75 1.75 0 0 1 15.5 21h-8A1.75 1.75 0 0 1 5.75 19.25v-13A2.5 2.5 0 0 1 8.25 3.75Z"/><path stroke-linecap="round" stroke-linejoin="round" d="M13 4v5h4M8.5 13h6M8.5 16.5h6"/></svg>
                    </span>
                    <div class="min-w-0 flex-1">
                      @if (archivoSustento) {
                        <p class="m-0 break-all text-sm font-semibold text-[#172b4d]">{{ archivoSustento.name }}</p>
                        <p class="mb-0 mt-1 text-xs text-[#047857]">{{ archivoSustento.size / (1024 * 1024) | number:'1.1-1' }} MB · Listo para adjuntar</p>
                      } @else {
                        <p class="m-0 text-sm font-semibold text-[#172b4d]">Aún no has elegido un PDF</p>
                        <p class="mb-0 mt-1 text-xs text-[#64748b]">Busca el documento en tu dispositivo.</p>
                      }
                    </div>
                  </div>
                  <label for="sustento-pdf-input" class="relative inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-xl border border-[#b9c9df] bg-white px-4 text-sm font-bold text-[#1d4ed8] shadow-sm transition-colors hover:bg-[#edf4ff] focus-within:outline-none focus-within:ring-2 focus-within:ring-[#93b4f4]">
                    {{ archivoSustento ? 'Cambiar documento PDF' : 'Buscar documento PDF' }}
                    <input #sustentoInput id="sustento-pdf-input" type="file" accept="application/pdf,.pdf" required aria-label="Adjuntar sustento en formato PDF" (change)="seleccionarSustento($event)" class="absolute inset-0 h-full w-full cursor-pointer opacity-0">
                  </label>
                </div>
              </section>
            </div>
            <footer class="sticky bottom-0 z-[1] flex flex-[0_0_auto] flex-wrap justify-end gap-[10px] border-t border-[#e5eaf2] bg-white px-6 py-[14px] max-[639px]:px-4 max-[639px]:py-3 max-[639px]:[&>button]:flex-[1_1_auto]"><button type="button" class="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#e5eaf2] bg-[#f5f7fb] px-4 font-semibold text-[#334155] max-[640px]:w-full" (click)="cerrarDialogos()">Cancelar</button><button type="submit" [disabled]="operando()" class="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#2563eb] px-[18px] font-semibold text-white shadow-[0_8px_18px_rgb(37_99_235_/_18%)] disabled:cursor-wait disabled:opacity-[.55] max-[640px]:w-full">{{ operando() ? 'Guardando…' : 'Guardar justificación' }}</button></footer>
          </form>
        </div>
      </dialog>

      <!-- Filters & Date Selection (Espacio de trabajo principal: Fecha, Sección y Lista de estudiantes) -->
      <div class="p-5 sm:p-6 rounded-2xl !bg-white border !border-[#e1e8f1] space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-5">
          <div>
            <label for="fecha-registro-asistencia" class="block text-sm sm:text-base font-extrabold !text-[#34445d] mb-1.5">Fecha de Registro</label>
            <app-ui-calendar
              id="fecha-registro-asistencia"
              [(ngModel)]="fechaSeleccionada"
              (ngModelChange)="cargarAsistencia()"
              (visibleMonthChange)="cargarFechasConRegistros($event)"
              [attendanceCalendar]="true"
              [disableWeekends]="true"
              [attendanceDates]="fechasConRegistros()"
              [attendanceDataLoaded]="!fechasConRegistrosCargando() && !errorFechasConRegistros()"
              [attendanceDataLoading]="fechasConRegistrosCargando()"
              [attendanceLoadError]="errorFechasConRegistros()"
              aria-label="Fecha de registro de asistencia">
            </app-ui-calendar>
          </div>

          <div>
            <label for="seccion-filtro-asistencia" class="block text-sm sm:text-base font-extrabold !text-[#34445d] mb-1.5">Sección</label>
            <select id="seccion-filtro-asistencia" [ngModel]="seccionFiltro()" (ngModelChange)="seccionFiltro.set($event); paginaAsistencia.set(0)" name="seccionFiltro" class="w-full min-w-0 max-w-full min-h-12 rounded-xl border !border-[#d9e1ec] !bg-white px-3.5 py-2.5 text-sm sm:text-base font-medium !text-[#172b4d] transition-colors focus:border-[#5b83d6] focus:outline-none focus:shadow-[0_0_0_3px_rgb(59_110_214_/_13%)]">
              <option value="TODAS">Todas las secciones</option>
              @for (sec of seccionesDisponibles(); track sec.id) {
                <option [ngValue]="sec.id">{{ sec.nombre }}</option>
              }
            </select>
          </div>

          <div>
            <label for="anio-conciliacion-select" class="block text-sm sm:text-base font-extrabold !text-[#34445d] mb-1.5">Año lectivo para conciliación</label>
            <select id="anio-conciliacion-select" [(ngModel)]="anioId" aria-label="Año lectivo para conciliación" [disabled]="!anios().length" class="w-full min-w-0 max-w-full min-h-12 rounded-xl border !border-[#d9e1ec] !bg-white px-3.5 py-2.5 text-sm sm:text-base font-medium !text-[#172b4d] transition-colors focus:border-[#5b83d6] focus:outline-none focus:shadow-[0_0_0_3px_rgb(59_110_214_/_13%)]">
              @if (!anios().length) { <option [ngValue]="0">Sin años lectivos disponibles</option> }
              @for (anio of anios(); track anio.id) { <option [ngValue]="anio.id">{{ anio.anio }}</option> }
            </select>
          </div>

          <div class="flex items-end">
            <button
              (click)="cargarAsistencia()"
              class="w-full py-2 px-3 rounded-xl !bg-[#f1f4f9] hover:!bg-[#e2e8f0] !text-[#34445d] text-xs !text-[11px] font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 max-[640px]:w-full box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]"
            >
              <span>Actualizar de la BD</span>
            </button>
          </div>
        </div>

        <!-- Leyenda clara del calendario de asistencia -->
        <div class="flex flex-wrap items-center gap-4 border-t border-[#e5eaf2] pt-3 text-xs text-[#475569]" aria-label="Leyenda del calendario de asistencia">
          <span class="font-bold text-[#172b4d]">Leyenda del calendario:</span>
          <span class="inline-flex items-center gap-1.5">
            <span class="h-2.5 w-2.5 rounded-full bg-emerald-600"></span>
            <span>Días hábiles con registros</span>
          </span>
          <span class="inline-flex items-center gap-1.5">
            <span class="h-2.5 w-2.5 rounded-full border border-slate-400 bg-white"></span>
            <span>Días hábiles sin registros</span>
          </span>
          <span class="inline-flex items-center gap-1.5">
            <span class="h-2.5 w-2.5 rounded-full bg-slate-300"></span>
            <span>Fines de semana bloqueados (Sáb/Dom)</span>
          </span>
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
      @if (puedeConsultarAlertas()) { <div class="flex items-center gap-2 border-b border-ui-divider">
        <button
          (click)="tabActiva.set('AULA')"
          [class]="tabActiva() === 'AULA' ? 'border-ui-action text-ui-action font-bold' : 'border-transparent text-ui-muted hover:text-ui-text'"
          class="px-4 py-2.5 border-b-2 text-xs !text-[11px] transition cursor-pointer max-[640px]:w-full box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]"
        >
          Pase de Lista de Aula
        </button>
        <button
          (click)="tabActiva.set('CONCILIACION')"
          [class]="tabActiva() === 'CONCILIACION' ? 'border-ui-gold text-ui-gold font-bold' : 'border-transparent text-ui-muted hover:text-ui-text'"
          class="px-4 py-2.5 border-b-2 text-xs !text-[11px] transition cursor-pointer flex items-center gap-2 max-[640px]:w-full box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]"
        >
          <span>Alertas de Conciliación Biométrica</span>
          <span class="px-1.5 py-0.2 rounded-full text-[10px] !text-[11px] text-ui-warning-text bg-ui-warning-bg border border-ui-warning-border">
            {{ discrepancias().length }}
          </span>
        </button>
      </div> }

      <!-- Tab Content: Pase de Lista -->
      @if (tabActiva() === 'AULA') {
        <div class="rounded-2xl bg-ui-surface border border-ui-divider overflow-hidden shadow-sm">
          <div class="flex flex-wrap items-end gap-3 border-b border-ui-divider bg-ui-surface-soft p-4">
            <div class="grid min-w-[220px] flex-1 gap-1">
              <label for="buscar-estudiante-asistencia" class="text-xs font-semibold text-ui-muted">Buscar estudiante</label>
              <input id="buscar-estudiante-asistencia" [ngModel]="busquedaAsistencia()" (ngModelChange)="busquedaAsistencia.set($event); paginaAsistencia.set(0)" name="buscarAsistencia" type="search" placeholder="Nombre o apellido" class="min-h-11 rounded-xl border border-ui-control-border bg-ui-surface px-3 text-sm font-normal text-ui-text focus:outline-none focus:border-ui-focus" />
            </div>
            <div class="grid min-w-[180px] gap-1">
              <label for="filtro-estado-asistencia" class="text-xs font-semibold text-ui-muted">Estado</label>
              <select id="filtro-estado-asistencia" [ngModel]="estadoFiltro()" (ngModelChange)="estadoFiltro.set($event); paginaAsistencia.set(0)" name="filtroEstadoAsistencia" class="min-h-11 rounded-xl border border-ui-control-border bg-ui-surface px-3 text-sm font-normal text-ui-text focus:outline-none focus:border-ui-focus">
                <option value="TODOS">Todos</option><option value="PRESENTE">Presente</option><option value="TARDANZA">Tardanza</option><option value="FALTA_JUSTIFICADA">Falta justificada</option><option value="FALTA_INJUSTIFICADA">Falta injustificada</option>
              </select>
            </div>
            <span class="pb-3 text-xs text-ui-muted font-medium">{{ alumnosFiltrados().length }} registros</span>
          </div>
          <div class="overflow-x-auto" data-attendance-table-scroll="">
            <table class="w-full min-w-[760px] text-left text-xs !text-[11px] [&_thead]:!bg-ui-surface-soft [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:!bg-ui-surface-soft/75" data-mobile-table-cards="">
              <thead class="bg-ui-surface-soft border-b border-ui-divider text-ui-action uppercase tracking-wider font-bold">
                <tr>
                  <th class="px-5 py-3.5">Estudiante</th>
                  <th class="px-5 py-3.5">Fecha</th>
                  <th class="px-5 py-3.5">Molinete Puerta</th>
                  <th class="px-5 py-3.5 text-center">Pase de Lista en Aula</th>
                  <th class="px-5 py-3.5 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-ui-divider text-ui-text">
                @if (cargando()) {
                  <tr>
                    <td colspan="5" class="text-center py-10 text-ui-muted">
                      <span class="inline-block w-5 h-5 border-2 border-ui-divider border-t-ui-action rounded-full animate-spin mb-2"></span>
                      <p>Consultando marcas de asistencia en la base de datos...</p>
                    </td>
                  </tr>
                } @else {
                  @for (item of alumnosPagina(); track item.id) {
                    <tr class="bg-ui-surface hover:bg-ui-surface-soft/75 transition-colors">
                      <td class="px-5 py-3.5 font-bold text-ui-text" data-label="Estudiante">{{ item.estudiante }}</td>
                      <td class="px-5 py-3.5 font-mono text-ui-muted" data-label="Fecha">{{ item.fecha | uiDatePe }}</td>
                      <td class="px-5 py-3.5 font-mono text-ui-success-text" data-label="Molinete Puerta">{{ item.horaMarcacionPuerta || '-' }}</td>
                      <td class="px-5 py-3.5 text-center font-bold" data-label="Pase de Lista en Aula">
                        @switch (item.estado) {
                          @case ('PRESENTE') { <span class="inline-grid grid-cols-[20px_auto] items-center gap-x-[7px] gap-y-px p-[6px_10px] border rounded-xl text-left leading-[1.25] !border-[#b8dfcc] !bg-[#edf9f3] !text-[#146c45]"><span class="row-span-2 grid h-5 w-5 place-items-center rounded-full font-extrabold !bg-[#d8f0e3]" aria-hidden="true">✓</span><span>Presente</span><small class="col-start-2 text-[11px] [font-weight:650]">PRESENTE</small></span> }
                          @case ('TARDANZA') { <span class="inline-grid grid-cols-[20px_auto] items-center gap-x-[7px] gap-y-px p-[6px_10px] border rounded-xl text-left leading-[1.25] !border-[#edca83] !bg-[#fff7e7] !text-[#805300]"><span class="row-span-2 grid h-5 w-5 place-items-center rounded-full font-extrabold !bg-[#ffedc5]" aria-hidden="true">◷</span><span>Tardanza</span><small class="col-start-2 text-[11px] [font-weight:650]">TARDANZA</small></span> }
                          @case ('FALTA_JUSTIFICADA') { <span class="inline-grid grid-cols-[20px_auto] items-center gap-x-[7px] gap-y-px p-[6px_10px] border rounded-xl text-left leading-[1.25] !border-[#c3d6f5] !bg-[#eff5ff] !text-[#184fae]"><span class="row-span-2 grid h-5 w-5 place-items-center rounded-full font-extrabold !bg-[#dce9ff]" aria-hidden="true">✓</span><span>Falta justificada</span><small class="col-start-2 text-[11px] [font-weight:650]">FALTA_JUSTIFICADA</small></span> }
                          @case ('FALTA_INJUSTIFICADA') { <span class="inline-grid grid-cols-[20px_auto] items-center gap-x-[7px] gap-y-px p-[6px_10px] border rounded-xl text-left leading-[1.25] !border-[#f2b7b0] !bg-[#fff1ef] !text-[#a43128]"><span class="row-span-2 grid h-5 w-5 place-items-center rounded-full font-extrabold !bg-[#ffe0dc]" aria-hidden="true">!</span><span>Falta injustificada</span><small class="col-start-2 text-[11px] [font-weight:650]">FALTA_INJUSTIFICADA</small></span> }
                        }
                      </td>
                      <td class="px-5 py-3.5 text-center" data-label="Acciones">
                        @if (puedeJustificar() && item.estado === 'FALTA_INJUSTIFICADA') {
                          <button (click)="abrirDialogoJustificacion(item.id)" class="text-ui-action font-semibold hover:underline max-[640px]:w-full box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]">Justificar</button>
                        }
                        @if (puedeDescargarSustento() && item.tieneDocumentoSustento) {
                          <button (click)="descargarSustento(item.id)" class="text-ui-text font-semibold hover:text-ui-action hover:underline max-[640px]:w-full box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center">Ver sustento privado</button>
                        }
                      </td>
                    </tr>
                  } @empty {
                    <tr [hidden]="!!error()">
                      <td colspan="5" class="relative !pt-[62px] text-center py-12 text-ui-muted space-y-2" data-illustration="calendar">
                        <svg aria-hidden="true" focusable="false" viewBox="0 0 48 48" fill="none" stroke="#173B67" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="absolute top-3 left-1/2 h-[42px] w-[42px] -translate-x-1/2"><rect x="7" y="10" width="34" height="31" rx="4"/><path d="M15 6v8m18-8v8M7 19h34" stroke="#85632F"/><path d="M15 26h4m5 0h4m5 0h3M15 33h4m5 0h4"/></svg>
                      <p class="font-medium text-ui-muted">No se encontraron marcas de asistencia para la fecha indicada.</p>
                        <p class="text-[11px] text-ui-muted">Los pases de lista registrados en el aula y las importaciones biométricas se mostrarán aquí.</p>
                      </td>
                    </tr>
                  }
                }
              </tbody>
            </table>
          </div>
          <ui-paginacion
            [totalRegistros]="alumnosFiltrados().length"
            [paginaActual]="paginaAsistencia() + 1"
            [tamanoPagina]="tamanoPaginaAsistencia()"
            etiqueta="asistencias"
            ariaLabel="Paginación de asistencias"
            (cambioPagina)="cambiarPaginaAsistencia($event)"
          />
        </div>
      }

      <!-- Tab Content: Conciliación Biométrica -->
      @if (puedeConsultarAlertas() && tabActiva() === 'CONCILIACION') {
        <div class="space-y-4">
          <div class="rounded-2xl bg-ui-surface border border-ui-divider overflow-hidden shadow-sm">
            <div class="overflow-x-auto" data-attendance-table-scroll="">
            <table class="w-full min-w-[760px] text-left text-xs !text-[11px] [&_thead]:!bg-ui-surface-soft [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:!bg-ui-surface-soft/75" data-mobile-table-cards="">
              <thead class="bg-ui-surface-soft border-b border-ui-divider text-ui-action uppercase tracking-wider font-bold">
                <tr>
                  <th class="px-5 py-3.5">Estudiante</th>
                  <th class="px-5 py-3.5">Fecha</th>
                  <th class="px-5 py-3.5">Resultado</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-ui-divider text-ui-text">
                @for (d of discrepanciasPaginadas(); track $index) {
                  <tr class="bg-ui-surface hover:bg-ui-surface-soft/75 transition-colors">
                    <td class="px-5 py-3.5 font-bold text-ui-text" data-label="Estudiante">{{ d.nombreEstudiante || 'Estudiante sin datos' }}</td>
                    <td class="px-5 py-3.5 font-mono text-ui-muted" data-label="Fecha">{{ d.fecha | uiDatePe }}</td>
                    <td class="px-5 py-3.5" data-label="Resultado">
                      <ui-status-badge [label]="resultadoDiscrepancia(d.tipoDiscrepancia)" [tone]="tonoDiscrepancia(d.tipoDiscrepancia)" />
                    </td>
                  </tr>
                } @empty {
                  <tr [hidden]="!!error()">
                    <td colspan="3" class="relative !pt-[62px] text-center py-12 text-ui-muted space-y-2" data-illustration="calendar">
                      <svg aria-hidden="true" focusable="false" viewBox="0 0 48 48" fill="none" stroke="#173B67" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="absolute top-3 left-1/2 h-[42px] w-[42px] -translate-x-1/2"><rect x="7" y="10" width="34" height="31" rx="4"/><path d="M15 6v8m18-8v8M7 19h34" stroke="#85632F"/><path d="M15 26h4m5 0h4m5 0h3M15 33h4m5 0h4"/></svg>
                      <p class="font-medium text-ui-muted">No hay resultados de conciliación para la fecha indicada.</p>
                      <p class="text-[11px] text-ui-muted">La respuesta no contiene alertas para esta fecha.</p>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
            </div>
            <ui-paginacion
              [totalRegistros]="discrepancias().length"
              [paginaActual]="paginaConciliacion()"
              [tamanoPagina]="10"
              etiqueta="registros de conciliación"
              ariaLabel="Paginación de conciliación biométrica"
              (cambioPagina)="paginaConciliacion.set($event)"
            />
          </div>
        </div>
      }
    </div>
  `
})
export class AsistenciaComponent implements OnInit {
  private readonly asistenciaService = inject(AsistenciaService);
  private readonly academicoService = inject(AcademicoService);
  private readonly auth = inject(AuthStore);
  readonly puedeSeleccionarMatricula = computed(() => this.auth.hasAnyRole(['DOCENTE', 'TUTOR']));
  readonly puedeRegistrar = computed(() => this.auth.hasAnyRole(['DOCENTE', 'TUTOR', 'AUXILIAR']));
  readonly puedeConsultarAlertas = computed(() => this.auth.hasAnyRole(['DIRECCION', 'SECRETARIA', 'AUXILIAR']));
  readonly puedeGestionarBiometria = computed(() => this.auth.hasAnyRole(['SECRETARIA', 'AUXILIAR']));
  readonly puedeJustificar = computed(() => this.auth.hasAnyRole(['SECRETARIA', 'AUXILIAR', 'TUTOR']));
  readonly puedeDescargarSustento = computed(() => this.auth.hasRole('DIRECCION') || this.auth.hasRole('SECRETARIA'));
  readonly matriculasDocente = signal<{ matriculaId: number; estudiante: string }[]>([]);
  readonly anios = signal<AnioLectivoResponseDto[]>([]);
  readonly seccionFiltro = signal<number | 'TODAS'>('TODAS');
  @ViewChild('registroDialog') private registroDialog!: ElementRef<HTMLDialogElement>;
  @ViewChild('biometricoDialog') private biometricoDialog!: ElementRef<HTMLDialogElement>;
  @ViewChild('justificacionDialog') private justificacionDialog!: ElementRef<HTMLDialogElement>;
  @ViewChild('sustentoInput') private sustentoInput!: ElementRef<HTMLInputElement>;

  fechaSeleccionada = fechaDiaEscolarMasReciente();
  fechaSesionNueva = fechaDiaEscolarMasReciente();
  readonly fechasConRegistros = signal<string[]>([]);
  readonly fechasConRegistrosCargando = signal(false);
  readonly errorFechasConRegistros = signal(false);
  private mesCalendarioVisible = '';
  private readonly cacheFechasRegistros = new Map<string, string[]>();
  private revisionFechasRegistros = 0;
  anioId = 0;
  readonly error = signal<string | null>(null);
  readonly mensaje = signal<string | null>(null);
  readonly justificacionId = signal<number | null>(null);
  readonly asistenciaEnJustificacion = signal<AlumnoAsistenciaItem | null>(null);
  readonly operando = signal(false);
  readonly estadoImportacion = signal<EstadoImportacionBiometrica | null>(null);
  readonly etapaImportacion = signal<1 | 2 | 3>(1);
  readonly ultimoResultadoImportacion = signal<ImportacionBiometricaResponseDto | null>(null);
  tabActiva = signal<'AULA' | 'CONCILIACION'>('AULA');
  cargando = signal(false);

  matriculaId = 0;
  horaRegistro = '08:00';
  estadoRegistro: EstadoAsistencia = 'PRESENTE';
  motivoJustificacion = '';
  archivoSustento: File | null = null;
  dniBiometrico = '';
  fechaBiometrico = '';
  horaBiometrico = '';
  dispositivoCodigo = 'PUERTA-1';
  archivoBiometrico: File | null = null;
  readonly modoImportacion = signal<'csv' | 'manual'>('csv');
  readonly csvTotalFilasDetectadas = signal<number>(0);
  readonly csvFechaDetectada = signal<string | null>(null);
  ajustarFechaAlImportar = true;

  readonly alumnos = signal<AlumnoAsistenciaItem[]>([]);
  readonly busquedaAsistencia = signal('');
  readonly estadoFiltro = signal<EstadoAsistencia | 'TODOS'>('TODOS');
  readonly paginaAsistencia = signal(0);
  readonly tamanoPaginaAsistencia = signal(10);

  readonly seccionesDisponibles = computed(() => {
    const secciones = new Map<number, string>();
    for (const alumno of this.alumnos()) {
      if (alumno.seccionId != null && alumno.seccion) {
        secciones.set(alumno.seccionId, alumno.seccion);
      }
    }
    return Array.from(secciones, ([id, nombre]) => ({ id, nombre }));
  });

  readonly alumnosFiltrados = computed(() => {
    const texto = this.busquedaAsistencia().trim().toLocaleLowerCase('es-PE');
    const sec = this.seccionFiltro();
    return this.alumnos().filter(alumno =>
      (!texto || alumno.estudiante.toLocaleLowerCase('es-PE').includes(texto)) &&
      (sec === 'TODAS' || alumno.seccionId === sec) &&
      (this.estadoFiltro() === 'TODOS' || alumno.estado === this.estadoFiltro()));
  });
  readonly alumnosPagina = computed(() =>
    paginarRegistros(this.alumnosFiltrados(), this.paginaAsistencia() + 1, this.tamanoPaginaAsistencia())
  );
  readonly discrepancias = signal<DiscrepanciaAlertaResponseDto[]>([]);
  readonly paginaConciliacion = signal<number>(1);
  readonly discrepanciasPaginadas = computed(() =>
    paginarRegistros(this.discrepancias(), this.paginaConciliacion(), 10)
  );

  readonly totalPresentes = computed(() => this.alumnos().filter(a => a.estado === 'PRESENTE').length);
  readonly totalTardanzas = computed(() => this.alumnos().filter(a => a.estado === 'TARDANZA').length);
  readonly totalJustificadas = computed(() => this.alumnos().filter(a => a.estado === 'FALTA_JUSTIFICADA').length);
  readonly totalInjustificadas = computed(() => this.alumnos().filter(a => a.estado === 'FALTA_INJUSTIFICADA').length);

  ngOnInit(): void {
    if (this.puedeSeleccionarMatricula()) {
      this.asistenciaService.obtenerMatriculasDocente().subscribe({
        next: matriculas => {
          this.matriculasDocente.set(matriculas);
          this.matriculaId = matriculas[0]?.matriculaId ?? 0;
        },
        error: () => this.error.set('No se pudieron cargar sus estudiantes asignados.')
      });
      this.cargarAsistencia();
      return;
    }
    if (this.puedeGestionarBiometria()) {
      this.academicoService.listarAnios().subscribe({
        next: anios => { this.anios.set(anios); this.anioId = anios.find(a => a.abierto)?.id ?? anios[0]?.id ?? 0; },
        error: () => this.error.set('No se pudieron consultar los años lectivos.')
      });
    }
    this.cargarAsistencia();
  }

  irAEtapaImportacion(etapa: 1 | 2 | 3): void {
    this.etapaImportacion.set(etapa);
  }

  cargarAsistencia(): void {
    this.paginaAsistencia.set(0);
    this.paginaConciliacion.set(1);
    this.error.set(null);
    if (!this.fechaSeleccionada) {
      this.alumnos.set([]);
      this.cargando.set(false);
      return;
    }
    this.cargando.set(true);
    if (this.puedeSeleccionarMatricula()) {
      this.asistenciaService.obtenerReporteDocente(this.fechaSeleccionada).subscribe({
        next: res => {
          this.cargando.set(false);
          this.alumnos.set(res.map(a => ({
            id: a.id,
            estudiante: a.estudiante,
            fecha: a.fechaSesion,
            estado: a.estado as EstadoAsistencia,
            horaMarcacionPuerta: a.horaRegistro || '-'
          })));
          this.discrepancias.set([]);
        },
        error: () => {
          this.cargando.set(false);
          this.alumnos.set([]);
          this.error.set('No se pudo cargar la asistencia de sus secciones asignadas.');
        }
      });
      return;
    }
    this.asistenciaService.obtenerReporteDiario(this.fechaSeleccionada).subscribe({
      next: (res) => {
        this.cargando.set(false);
        if (res && Array.isArray(res.asistencias)) {
          this.alumnos.set(
            res.asistencias.map(a => ({
              id: a.id,
              estudiante: a.nombreEstudiante || 'Estudiante sin datos',
              seccionId: a.seccionId ?? undefined,
              seccion: a.seccion ?? undefined,
              fecha: a.fechaSesion,
              estado: a.estado as EstadoAsistencia,
              horaMarcacionPuerta: a.horaRegistro || '-',
              tieneDocumentoSustento: Boolean(a.tieneDocumentoSustento)
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

    if (this.puedeConsultarAlertas()) {
      this.asistenciaService.listarAlertasConciliacion(this.fechaSeleccionada).subscribe({
        next: (res) => this.discrepancias.set(Array.isArray(res) ? res : []),
        error: () => {
          this.discrepancias.set([]);
          this.error.set('No se pudieron cargar las alertas de conciliación.');
        }
      });
    } else {
      this.discrepancias.set([]);
    }
  }

  cargarFechasConRegistros(mes: string): void {
    const [anio, numeroMes] = mes.split('-').map(Number);
    if (!anio || !numeroMes || numeroMes < 1 || numeroMes > 12) return;
    this.mesCalendarioVisible = mes;

    if (this.cacheFechasRegistros.has(mes)) {
      this.fechasConRegistros.set(this.cacheFechasRegistros.get(mes)!);
      this.fechasConRegistrosCargando.set(false);
      this.errorFechasConRegistros.set(false);
      return;
    }

    const padMes = String(numeroMes).padStart(2, '0');
    const ultimoDia = String(new Date(anio, numeroMes, 0).getDate()).padStart(2, '0');
    const desde = anio + '-' + padMes + '-01';
    const hasta = anio + '-' + padMes + '-' + ultimoDia;
    const revision = this.revisionFechasRegistros;
    this.fechasConRegistrosCargando.set(true);
    this.errorFechasConRegistros.set(false);
    this.asistenciaService.obtenerFechasConRegistros(desde, hasta).subscribe({
      next: fechas => {
        if (revision !== this.revisionFechasRegistros) return;
        this.cacheFechasRegistros.set(mes, fechas);
        if (this.mesCalendarioVisible !== mes) return;
        this.fechasConRegistros.set(fechas);
        this.fechasConRegistrosCargando.set(false);
      },
      error: () => {
        if (revision !== this.revisionFechasRegistros || this.mesCalendarioVisible !== mes) return;
        this.errorFechasConRegistros.set(true);
        this.fechasConRegistrosCargando.set(false);
      }
    });
  }

  private refrescarFechasConRegistros(): void {
    this.revisionFechasRegistros++;
    this.cacheFechasRegistros.clear();
    this.fechasConRegistros.set([]);
    if (this.mesCalendarioVisible) {
      this.cargarFechasConRegistros(this.fechaSeleccionada.slice(0, 7));
    }
  }

  cambiarPaginaAsistencia(pagina: number): void {
    this.paginaAsistencia.set(Math.max(0, pagina - 1));
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
    if (!this.puedeRegistrar()) return;
    if (this.matriculaId <= 0 || !this.fechaSesionNueva || !this.horaRegistro) {
      this.error.set('Complete matrícula, fecha y hora.'); return;
    }
    this.error.set(null); this.mensaje.set(null); this.operando.set(true);
    this.asistenciaService.registrarAsistenciaAula({ matriculaId: this.matriculaId, fechaSesion: this.fechaSesionNueva, horaRegistro: this.horaRegistro, estado: this.estadoRegistro }).subscribe({
      next: () => { this.operando.set(false); this.cerrarDialogos(); this.refrescarFechasConRegistros(); this.mensaje.set('Asistencia guardada en la base de datos.'); this.cargarAsistencia(); },
      error: err => { this.operando.set(false); this.error.set(err?.error?.message ?? 'No se pudo registrar la asistencia.'); }
    });
  }

  justificar(asistenciaId: number): void {
    if (!this.motivoJustificacion.trim() || !this.archivoSustento) { this.error.set('Indique el motivo y adjunte el sustento PDF.'); return; }
    this.error.set(null); this.mensaje.set(null); this.operando.set(true);
    this.asistenciaService.justificarInasistencia({ asistenciaId, motivo: this.motivoJustificacion.trim() }, this.archivoSustento).subscribe({
      next: () => { this.operando.set(false); this.cerrarDialogos(); this.justificacionId.set(null); this.motivoJustificacion = ''; this.archivoSustento = null; this.refrescarFechasConRegistros(); this.mensaje.set('Falta justificada y sustento privado guardado.'); this.cargarAsistencia(); },
      error: err => { this.operando.set(false); this.error.set(err?.error?.message ?? 'No se pudo justificar la falta.'); }
    });
  }

  seleccionarSustento(event: Event): void {
    const archivo = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.archivoSustento = archivo?.type === 'application/pdf' && archivo.size <= 5 * 1024 * 1024 ? archivo : null;
    if (archivo && !this.archivoSustento) {
      this.error.set('Adjunta un archivo PDF de hasta 5 MB.');
      this.sustentoInput.nativeElement.value = '';
    }
    else this.error.set(null);
  }

  descargarSustento(asistenciaId: number): void {
    this.asistenciaService.obtenerUrlSustentoPrivado(asistenciaId).subscribe({
      next: ({ url }) => { window.location.assign(url); },
      error: err => this.error.set(err?.error?.message ?? 'No se pudo abrir el sustento privado.')
    });
  }

  importarMarca(): void {
    if (!this.puedeGestionarBiometria()) return;
    if (!/^[0-9]{8}$/.test(this.dniBiometrico) || !this.fechaBiometrico || !this.horaBiometrico || !this.dispositivoCodigo.trim()) {
      this.error.set('Complete DNI, fecha/hora y dispositivo.'); return;
    }
    this.error.set(null); this.mensaje.set(null); this.operando.set(true);
    const fechaHora = `${this.fechaBiometrico}T${this.horaBiometrico}:00-05:00`;
    this.asistenciaService.importarLoteBiometrico({ nombreArchivo: `marca-ui-${this.dniBiometrico}-${Date.now()}.json`, marcas: [{ dniLeido: this.dniBiometrico, fechaHora, dispositivoCodigo: this.dispositivoCodigo.trim() }] }).subscribe({
      next: res => this.seguirImportacion(res, null, false, 'Marca importada'),
      error: err => { this.operando.set(false); this.error.set(err?.error?.message ?? 'No se pudo importar la marca biométrica.'); }
    });
  }

  seleccionarCsvBiometrico(event: Event): void {
    const archivo = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.archivoBiometrico = archivo && /\.(csv|xlsx)$/i.test(archivo.name) && archivo.size <= 5 * 1024 * 1024 ? archivo : null;
    this.csvTotalFilasDetectadas.set(0);
    this.csvFechaDetectada.set(null);
    this.estadoImportacion.set(null);
    this.ultimoResultadoImportacion.set(null);
    if (archivo && !this.archivoBiometrico) {
      this.etapaImportacion.set(1);
      this.error.set('Selecciona un CSV o XLSX de hasta 5 MB.');
    } else if (this.archivoBiometrico) {
      this.error.set(null);
      this.etapaImportacion.set(2);
      if (/\.csv$/i.test(this.archivoBiometrico.name)) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const texto = e.target?.result as string;
          if (texto) {
            const lineas = texto.split(/\r?\n/).filter(l => l.trim().length > 0);
            const filasDatos = lineas.filter(l => !l.toLowerCase().startsWith('dni'));
            this.csvTotalFilasDetectadas.set(filasDatos.length);
            const regexFecha = /(\d{4}-\d{2}-\d{2})/;
            for (const fila of filasDatos) {
              const match = regexFecha.exec(fila);
              if (match) {
                this.csvFechaDetectada.set(match[1]);
                break;
              }
            }
          }
        };
        reader.readAsText(this.archivoBiometrico.slice(0, 15000));
      }
    } else {
      this.etapaImportacion.set(1);
      this.error.set(null);
    }
  }

  descargarPlantillaCsv(): void {
    const cabecera = 'dni,fechaHora,dispositivoCodigo\r\n';
    const filaEjemplo1 = '74839201,2026-11-06T07:45:00-05:00,PUERTA-1\r\n';
    const filaEjemplo2 = '42839201,2026-11-06T08:15:00-05:00,PUERTA-1\r\n';
    const contenido = cabecera + filaEjemplo1 + filaEjemplo2;
    const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla_asistencia_biometrico.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  importarCsvBiometrico(): void {
    if (!this.puedeGestionarBiometria()) return;
    const archivo = this.archivoBiometrico;
    if (!archivo) return;
    this.error.set(null); this.mensaje.set(null); this.operando.set(true);
    this.etapaImportacion.set(3);
    const fechaDetectada = this.csvFechaDetectada();
    const autoAjustar = this.ajustarFechaAlImportar;
    this.asistenciaService.importarArchivoBiometrico(archivo).subscribe({
      next: res => this.seguirImportacion(res, fechaDetectada, autoAjustar, 'Archivo CSV importado'),
      error: err => { this.operando.set(false); this.error.set(err?.error?.message ?? 'No se pudo importar el CSV biométrico.'); }
    });
  }

  private seguirImportacion(
    importacion: ImportacionBiometricaResponseDto,
    fechaDetectada: string | null,
    autoAjustar: boolean,
    etiqueta: string
  ): void {
    this.estadoImportacion.set(importacion.estado);
    this.ultimoResultadoImportacion.set(importacion);
    if (importacion.estado === 'COMPLETADO' || importacion.estado === 'ERROR') {
      this.finalizarImportacion(importacion, fechaDetectada, autoAjustar, etiqueta);
      return;
    }
    this.mensaje.set(importacion.estado === 'EN_COLA'
      ? 'Importación recibida y en cola.'
      : 'La importación se está procesando.');
    timer(0, 2000).pipe(
      switchMap(() => this.asistenciaService.obtenerEstadoImportacion(importacion.id)),
      takeWhile(estado => estado.estado === 'EN_COLA' || estado.estado === 'PROCESANDO', true)
    ).subscribe({
      next: estado => {
        this.estadoImportacion.set(estado.estado);
        this.ultimoResultadoImportacion.set(estado);
        if (estado.estado === 'COMPLETADO' || estado.estado === 'ERROR') {
          this.finalizarImportacion(estado, fechaDetectada, autoAjustar, etiqueta);
        }
      },
      error: err => {
        this.operando.set(false);
        this.error.set(err?.error?.message ?? 'No se pudo consultar el estado de la importación.');
      }
    });
  }

  private finalizarImportacion(
    resultado: ImportacionBiometricaResponseDto,
    fechaDetectada: string | null,
    autoAjustar: boolean,
    etiqueta = 'Archivo CSV importado'
  ): void {
    this.operando.set(false);
    this.ultimoResultadoImportacion.set(resultado);
    if (resultado.estado === 'ERROR') {
      this.error.set(resultado.mensajeError ?? 'No se pudo procesar el archivo biométrico.');
      return;
    }
    this.cerrarDialogos();
    this.archivoBiometrico = null;
    if (autoAjustar && fechaDetectada) this.fechaSeleccionada = fechaDetectada;
    this.refrescarFechasConRegistros();
    this.mensaje.set(`${etiqueta}: ${resultado.marcasValidas} asistencia(s) reflejadas (${resultado.marcasErroneas} duplicadas o no identificadas).`);
    this.cargarAsistencia();
  }

  ejecutarConciliacion(): void {
    if (!this.puedeGestionarBiometria()) return;
    if (!this.anioId) { this.error.set('Indique el año lectivo antes de conciliar.'); return; }
    this.error.set(null);
    this.asistenciaService.conciliarAsistencia(this.anioId, this.fechaSeleccionada, true).subscribe({
      next: (res) => {
        this.refrescarFechasConRegistros(); this.mensaje.set('Conciliación ejecutada. Registros procesados: ' + (res?.length || 0));
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
    this.fechaBiometrico = '';
    this.horaBiometrico = '';
    this.etapaImportacion.set(this.archivoBiometrico ? 2 : 1);
    this.ultimoResultadoImportacion.set(null);
    this.biometricoDialog.nativeElement.showModal();
  }

  abrirDialogoJustificacion(id: number): void {
    this.error.set(null);
    this.mensaje.set(null);
    this.motivoJustificacion = '';
    this.archivoSustento = null;
    this.sustentoInput.nativeElement.value = '';
    this.justificacionId.set(id);
    this.asistenciaEnJustificacion.set(this.alumnos().find(asistencia => asistencia.id === id) ?? null);
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
