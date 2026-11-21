import { FormatoEntradaDirective } from '../../shared/ui/formato-entrada.directive';
import { Component, computed, ElementRef, inject, signal, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConvivenciaService } from '../../core/services/convivencia.service';
import { HijoPortalDto, PortalFamiliarService } from '../../core/services/portal-familiar.service';
import { UiDatePePipe } from '../../shared/ui/ui-date-pe.pipe';
import { UiCalendarComponent } from '../../shared/ui/ui-calendar.component';
import { UiPaginacionComponent, paginarRegistros } from '../../shared/ui/ui-paginacion.component';
import { AuthStore } from '../../core/state/auth.store';
import { ActualizarEstadoIncidenciaRequestDto, EstadoIncidencia, HistorialEstadoIncidenciaResponseDto } from '../../core/models/convivencia.model';

export interface IncidenciaEscolar {
  id: number;
  matriculaId: number;
  nombreEstudiante?: string;
  seccionEtiqueta?: string;
  fecha: string;
  tipoFalta: string;
  descripcion: string;
  reportadoPor: string;
  citacionPadre: boolean | null;
  estado: EstadoIncidencia;
}

@Component({
  selector: 'app-convivencia',
  standalone: true,
  imports: [FormatoEntradaDirective, CommonModule, FormsModule, UiDatePePipe, UiCalendarComponent, UiPaginacionComponent],
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
        @if (puedeRegistrar()) {
          <div class="flex items-center gap-3">
            <button
              type="button"
              (click)="nuevaIncidencia()"
              class="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs !text-[11px] sm:!text-[11px] shadow-lg shadow-blue-600/30 transition flex items-center gap-2 cursor-pointer max-[640px]:w-full box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              <span>Registrar Incidencia en BD</span>
            </button>
          </div>
        } @else if (puedeGestionarEstados()) {
          <span class="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">Gestión de incidencias</span>
        } @else {
          <span class="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">Consulta</span>
        }
      </div>

      @if (error()) { <p class="text-[#b91c1c] text-sm rounded-xl border border-[#fecaca] bg-[#fef2f2] px-4 py-2.5 m-0" role="alert">{{ error() }}</p> }
      @if (mensaje()) { <p class="text-emerald-700 text-sm rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 m-0" role="status">{{ mensaje() }}</p> }

      <!-- DIALOG: REGISTRAR INCIDENCIA -->
      <dialog #incidenciaDialog class="box-border w-[min(680px,calc(100vw-24px))] max-w-[calc(100vw-24px)] max-h-[calc(100dvh-24px)] overflow-hidden border border-[#e4eaf3] rounded-[22px] bg-white text-[#14213d] p-0 shadow-[0_28px_90px_rgb(15_31_57_/_28%)] backdrop:bg-[rgb(12_24_43_/_46%)] backdrop:backdrop-blur-[3px] max-[639px]:w-[calc(100vw-16px)] max-[639px]:max-w-[calc(100vw-16px)] max-[639px]:max-h-[calc(100dvh-16px)] max-[639px]:rounded-[18px] !w-[min(640px,calc(100vw_-_24px))] !max-w-[calc(100vw_-_24px)] !max-h-[calc(100dvh_-_24px)] !overflow-auto" aria-labelledby="incidencia-dialog-title">
        <div class="flex max-h-[calc(100dvh-24px)] min-h-0 flex-col">
          <header class="flex flex-[0_0_auto] items-center justify-between gap-4 border-b border-[#e5eaf2] px-6 py-5 [&_h3]:m-0 [&_h3]:text-[#14213d] [&_h3]:text-lg [&_h3]:leading-[27px] [&_h3]:font-[750] [&_p]:mb-0 [&_p]:mt-1 [&_p]:text-[#64748b] [&_p]:text-xs [&_p]:leading-[1.5] max-[639px]:p-4">
            <div>
              <h3 id="incidencia-dialog-title" class="tracking-[-.025em]">Registrar incidencia escolar</h3>
              <p>Busca al estudiante por nombre o DNI, verifica su grado y sección y documenta el hecho.</p>
            </div>
            <button type="button" class="min-h-11 rounded-xl border border-[#e5eaf2] bg-[#f5f7fb] px-4 font-semibold text-[#334155] !grid !h-11 !w-11 !min-h-11 !min-w-11 !flex-none !place-items-center !p-0 !font-[650]" (click)="cerrarDialogo()" aria-label="Cerrar">✕</button>
          </header>
          <form (ngSubmit)="registrar()" class="flex min-h-0 flex-[1_1_auto] flex-col" novalidate>
            <div class="min-h-0 flex-[1_1_auto] overflow-auto overscroll-contain px-6 py-5 max-[639px]:p-4 space-y-4">
              @if (error()) { <p id="incidencia-form-error" class="m-0 rounded-xl border border-[#fecaca] bg-[#fef2f2] px-3 py-[10px] text-xs text-[#b91c1c]" role="alert">{{ error() }}</p> }

              <!-- Búsqueda de estudiante por nombre o DNI -->
              <div class="rounded-xl border border-[#dce4ef] bg-[#f8fafc] p-3.5 space-y-3">
                <div>
                  <label for="buscar-alumno-incidencia" class="block text-xs font-semibold text-[#475569] mb-1">Buscar estudiante por nombre o DNI</label>
                  <input
                    id="buscar-alumno-incidencia"
                    type="search"
                    [ngModel]="busquedaEstudianteModal()"
                    (ngModelChange)="busquedaEstudianteModal.set($event)"
                    name="buscarAlumnoIncidencia"
                    placeholder="Escribe apellidos, nombres o DNI (8 dígitos)"
                    aria-describedby="buscar-alumno-incidencia-help"
                    class="w-full min-h-[44px] rounded-xl border border-[#d9e1ec] bg-white px-3 py-2 text-xs text-[#14213d] focus:border-[#5b83d6] focus:outline-none"
                  />
                  <span id="buscar-alumno-incidencia-help" class="text-[11px] text-slate-500 mt-1 block">Selecciona un estudiante para autocompletar su matrícula, grado y sección.</span>
                </div>

                @if (estudiantesSugeridosModal().length > 0) {
                  <div class="max-h-36 overflow-y-auto rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
                    @for (al of estudiantesSugeridosModal(); track al.matriculaId) {
                      <button
                        type="button"
                        (click)="seleccionarEstudianteModal(al)"
                        class="w-full px-3 py-2 text-left text-xs hover:bg-blue-50 flex items-center justify-between gap-2 transition cursor-pointer"
                        [class.bg-blue-50]="matriculaId === al.matriculaId"
                      >
                        <span class="font-semibold text-[#14213d]">{{ al.nombres }} {{ al.apellidoPaterno }} {{ al.apellidoMaterno }} <span class="font-normal text-slate-500">· DNI {{ al.numeroDocumento }}</span></span>
                        <span class="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">{{ al.nivel }} · {{ al.grado }} "{{ al.seccion }}"</span>
                      </button>
                    }
                  </div>
                }

                @if (estudianteSeleccionadoModal(); as sel) {
                  <div class="rounded-xl border border-emerald-200 bg-emerald-50/90 px-3.5 py-2.5 text-xs text-emerald-950 flex flex-wrap items-center justify-between gap-2" role="status">
                    <div>
                      <span class="font-bold block">{{ sel.nombres }} {{ sel.apellidoPaterno }} {{ sel.apellidoMaterno }}</span>
                      <span class="text-[11px] text-emerald-800">DNI {{ sel.numeroDocumento }} · Matrícula #{{ sel.matriculaId }}</span>
                    </div>
                    <span class="rounded-lg bg-white border border-emerald-300 px-2.5 py-1 text-xs font-extrabold text-emerald-900">
                      {{ sel.nivel }} · {{ sel.grado }} "{{ sel.seccion }}"
                    </span>
                  </div>
                }
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label for="incidencia-matricula-id" class="block min-w-0 text-xs font-semibold leading-normal text-[#475569] mb-1">Matrícula ID *</label>
                  <input
                    id="incidencia-matricula-id"
                    appFormatoEntrada="entero"
                    type="number"
                    [(ngModel)]="matriculaId"
                    name="matricula"
                    min="1"
                    required
                    aria-describedby="incidencia-matricula-error"
                    class="w-full min-w-0 !min-h-[46px] max-w-full border px-3 py-[10px] !border-[#d9e1ec] rounded-xl !bg-white !text-[#14213d] transition-colors focus:border-[#5b83d6] focus:outline-none focus:shadow-[0_0_0_3px_rgb(59_110_214_/_13%)] max-[639px]:text-base !font-[650]"
                  />
                  @if (intentoEnvio() && (!matriculaId || matriculaId < 1)) {
                    <p id="incidencia-matricula-error" class="mt-1 text-xs font-semibold text-[#b91c1c]" role="alert">Seleccione un estudiante o indique un ID de matrícula válido.</p>
                  } @else {
                    <span id="incidencia-matricula-error" class="sr-only">Identificador numérico de la matrícula del alumno</span>
                  }
                </div>

                <div>
                  <label for="incidencia-fecha" class="block min-w-0 text-xs font-semibold leading-normal text-[#475569] mb-1">Fecha *</label>
                  <app-ui-calendar id="incidencia-fecha" [(ngModel)]="fechaIncidencia" name="fecha" [required]="true" aria-label="Fecha de incidencia"></app-ui-calendar>
                </div>

                <div class="sm:col-span-2">
                  <label for="incidencia-tipo-falta" class="block min-w-0 text-xs font-semibold leading-normal text-[#475569] mb-1">Tipo de falta *</label>
                  <select
                    id="incidencia-tipo-falta"
                    [(ngModel)]="tipoFalta"
                    name="tipoFalta"
                    class="w-full min-w-0 !min-h-[46px] max-w-full border px-3 py-[10px] !border-[#d9e1ec] rounded-xl !bg-white !text-[#14213d] transition-colors focus:border-[#5b83d6] focus:outline-none focus:shadow-[0_0_0_3px_rgb(59_110_214_/_13%)] max-[639px]:text-base !font-[650]"
                  >
                    <option value="LEVE">Leve</option>
                    <option value="GRAVE">Grave</option>
                    <option value="MUY_GRAVE">Muy grave</option>
                  </select>
                </div>

                <div class="sm:col-span-2">
                  <label for="incidencia-descripcion" class="block min-w-0 text-xs font-semibold leading-normal text-[#475569] mb-1">Descripción objetiva del hecho *</label>
                  <textarea
                    id="incidencia-descripcion"
                    [(ngModel)]="descripcion"
                    name="descripcion"
                    required
                    maxlength="10000"
                    rows="4"
                    placeholder="Describe lo ocurrido con lenguaje formativo y objetivo"
                    aria-describedby="incidencia-descripcion-error"
                    class="w-full min-w-0 max-w-full border px-3 py-[10px] !border-[#d9e1ec] rounded-xl !bg-white !text-[#14213d] transition-colors focus:border-[#5b83d6] focus:outline-none focus:shadow-[0_0_0_3px_rgb(59_110_214_/_13%)] max-[639px]:text-base resize-y !min-h-[110px] !font-[650]"
                  ></textarea>
                  @if (intentoEnvio() && !descripcion.trim()) {
                    <p id="incidencia-descripcion-error" class="mt-1 text-xs font-semibold text-[#b91c1c]" role="alert">Ingresa una descripción objetiva de la incidencia.</p>
                  } @else {
                    <span id="incidencia-descripcion-error" class="sr-only">Relato objetivo de la incidencia escolar</span>
                  }
                </div>

                <div class="sm:col-span-2">
                  <label for="incidencia-requiere-citacion" class="inline-flex items-center gap-3 text-sm text-slate-700 cursor-pointer">
                    <input id="incidencia-requiere-citacion" type="checkbox" class="w-[18px] accent-[#2563eb] !font-[650]" [(ngModel)]="requiereCitacion" name="requiereCitacion" />
                    <span>Requiere citación al apoderado</span>
                  </label>
                </div>
              </div>
            </div>
            <footer class="sticky bottom-0 z-[1] flex flex-[0_0_auto] flex-wrap justify-end gap-[10px] border-t border-[#e5eaf2] bg-white px-6 py-[14px] max-[639px]:px-4 max-[639px]:py-3 max-[639px]:[&>button]:flex-[1_1_auto]">
              <button type="button" class="rounded-xl border border-[#e5eaf2] bg-[#f5f7fb] px-4 font-semibold text-[#334155] max-[640px]:w-full box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]" (click)="cerrarDialogo()">Cancelar</button>
              <button type="submit" [disabled]="guardando()" class="rounded-xl bg-[#2563eb] px-[18px] font-bold text-white shadow-[0_8px_18px_rgb(37_99_235_/_18%)] disabled:cursor-wait disabled:opacity-[.55] max-[640px]:w-full box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]">{{ guardando() ? 'Guardando…' : 'Registrar incidencia' }}</button>
            </footer>
          </form>
        </div>
      </dialog>

      <!-- DIALOG: GESTIÓN DE ESTADO -->
      <dialog #gestionDialog class="!fixed !left-1/2 !top-1/2 !m-0 !-translate-x-1/2 !-translate-y-1/2 box-border h-fit w-[min(620px,calc(100vw-32px))] max-w-[calc(100vw-32px)] max-h-[calc(100dvh-32px)] overflow-auto rounded-2xl border border-[#dce4ef] bg-white p-0 text-[#14213d] shadow-[0_24px_64px_rgb(15_31_57_/_22%)] backdrop:bg-[rgb(15_31_57_/_42%)] backdrop:backdrop-blur-[2px]" aria-labelledby="gestion-dialog-title">
        <form (ngSubmit)="confirmarGestion()" class="space-y-5 p-6 max-[639px]:space-y-4 max-[639px]:p-4" novalidate>
          <header class="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
            <div class="min-w-0">
              <h3 id="gestion-dialog-title" class="m-0 text-lg font-bold tracking-tight text-[#14213d]">{{ estadoNuevo() === 'ATENDIDA' ? 'Registrar atención' : 'Cerrar caso' }}</h3>
              <p class="mb-0 mt-1 text-sm text-slate-600">{{ incidenciaSeleccionada()?.nombreEstudiante }} · Incidencia #{{ incidenciaSeleccionada()?.id }}</p>
            </div>
            <button type="button" class="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50" (click)="cerrarGestion()" aria-label="Cerrar">✕</button>
          </header>
          <div class="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm" aria-label="Transición de estado">
            <span class="rounded-full bg-white px-3 py-1 font-semibold text-slate-700">{{ incidenciaSeleccionada()?.estado }}</span>
            <span aria-hidden="true" class="text-slate-400">→</span>
            <span class="rounded-full bg-blue-50 px-3 py-1 font-semibold text-blue-800">{{ estadoNuevo() }}</span>
            <span class="ml-auto text-xs text-slate-500">Responsable y hora registrados automáticamente</span>
          </div>
          @if (estadoNuevo() === 'CERRADA') {
            <p class="m-0 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-relaxed text-emerald-900">
              Cierra el caso cuando el resultado esté comprobado. Si todavía requiere seguimiento, conserva el estado «ATENDIDA».
            </p>
          }
          @if (error()) { <p class="m-0 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">{{ error() }}</p> }
          <div>
            <label for="gestion-observacion" class="block text-sm font-semibold text-slate-800">
              {{ estadoNuevo() === 'CERRADA' ? 'Acción final realizada' : 'Acción realizada' }} *
            </label>
            <span id="gestion-observacion-help" class="mt-1 block text-xs font-normal leading-relaxed text-slate-500">Describe la medida aplicada y cómo se llevó a cabo (mínimo 12 caracteres).</span>
            <textarea
              id="gestion-observacion"
              [(ngModel)]="observacionGestion"
              name="observacionGestion"
              required
              minlength="12"
              [attr.maxlength]="estadoNuevo() === 'CERRADA' ? 350 : 1000"
              rows="3"
              aria-describedby="gestion-observacion-help"
              placeholder="Ej.: se realizó una conversación restaurativa y se acordaron medidas concretas."
              class="mt-2 block min-h-24 w-full resize-y rounded-xl border border-slate-300 p-3 font-normal leading-relaxed focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            ></textarea>
            <span class="mt-1 block text-right text-xs font-normal text-slate-500">{{ observacionGestion.length }} / {{ estadoNuevo() === 'CERRADA' ? 350 : 1000 }} caracteres</span>
          </div>
          @if (estadoNuevo() === 'CERRADA') {
            <div class="space-y-4 border-t border-slate-100 pt-4">
              <div>
                <label for="gestion-resultado-cierre" class="block text-sm font-semibold text-slate-800">Resultado verificado *</label>
                <span id="gestion-resultado-help" class="mt-1 block text-xs font-normal leading-relaxed text-slate-500">¿Qué evidencia permite confirmar que el caso quedó resuelto? (mínimo 15 caracteres)</span>
                <textarea
                  id="gestion-resultado-cierre"
                  [(ngModel)]="resultadoCierre"
                  name="resultadoCierre"
                  required
                  minlength="15"
                  maxlength="300"
                  rows="3"
                  aria-describedby="gestion-resultado-help"
                  placeholder="Describe el acuerdo cumplido, el cambio observado o la medida completada."
                  class="mt-2 block min-h-24 w-full resize-y rounded-xl border border-slate-300 p-3 font-normal leading-relaxed focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                ></textarea>
                <span class="mt-1 block text-right text-xs font-normal text-slate-500">{{ resultadoCierre.length }} / 300 caracteres</span>
              </div>
              <div>
                <label for="gestion-participantes" class="block text-sm font-semibold text-slate-800">Participantes <span class="font-normal text-slate-500">(opcional)</span></label>
                <input
                  id="gestion-participantes"
                  [(ngModel)]="participantesCierre"
                  name="participantesCierre"
                  maxlength="120"
                  placeholder="Ej.: auxiliar, tutor y estudiante"
                  class="mt-2 block min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 font-normal focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label for="gestion-comunicacion-apoderado" class="block text-sm font-semibold text-slate-800">
                  {{ incidenciaSeleccionada()?.citacionPadre === true ? 'Constancia de comunicación con la familia *' : 'Comunicación con la familia (opcional)' }}
                </label>
                <span id="gestion-comunicacion-help" class="mt-1 block text-xs font-normal leading-relaxed text-slate-500">Indica fecha, medio y resultado del contacto, si corresponde.</span>
                <textarea
                  id="gestion-comunicacion-apoderado"
                  [(ngModel)]="comunicacionApoderadoCierre"
                  name="comunicacionApoderadoCierre"
                  [required]="incidenciaSeleccionada()?.citacionPadre === true"
                  maxlength="130"
                  rows="2"
                  aria-describedby="gestion-comunicacion-help"
                  placeholder="Ej.: apoderado informado por llamada el 14/10; confirmó el acuerdo."
                  class="mt-2 block min-h-20 w-full resize-y rounded-xl border border-slate-300 p-3 font-normal leading-relaxed focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                ></textarea>
              </div>
            </div>
          }
          <footer class="flex justify-end gap-2 border-t border-slate-100 pt-4 max-[480px]:[&>button]:flex-1">
            <button type="button" class="min-h-11 rounded-xl border border-slate-200 px-4 font-semibold text-slate-700 hover:bg-slate-50" (click)="cerrarGestion()">Cancelar</button>
            <button type="submit" [disabled]="guardandoCambio()" class="min-h-11 rounded-xl bg-blue-700 px-4 font-semibold text-white hover:bg-blue-800 disabled:cursor-wait disabled:opacity-50">{{ guardandoCambio() ? 'Guardando…' : estadoNuevo() === 'CERRADA' ? 'Cerrar caso con auditoría' : 'Guardar atención' }}</button>
          </footer>
        </form>
      </dialog>

      <!-- DIALOGOS DE RESPALDO / MÓVIL -->
      <dialog #historialDialog class="!fixed !left-1/2 !top-1/2 !m-0 !-translate-x-1/2 !-translate-y-1/2 box-border h-fit w-[min(700px,calc(100vw-32px))] max-w-[calc(100vw-32px)] max-h-[calc(100dvh-32px)] overflow-auto rounded-2xl border border-[#dce4ef] bg-white p-0 text-[#14213d] shadow-[0_24px_64px_rgb(15_31_57_/_22%)] backdrop:bg-[rgb(15_31_57_/_42%)] backdrop:backdrop-blur-[2px]" aria-labelledby="historial-dialog-title">
        <section class="space-y-5 p-6 max-[639px]:space-y-4 max-[639px]:p-4">
          <header class="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
            <div class="min-w-0">
              <h3 id="historial-dialog-title" class="m-0 text-lg font-bold tracking-tight text-[#14213d]">Historial de la incidencia</h3>
              <div class="mt-2 flex flex-wrap items-center gap-2 text-sm">
                <span class="font-semibold text-slate-800">{{ incidenciaHistorial()?.nombreEstudiante }}</span>
                <span class="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">Incidencia #{{ incidenciaHistorial()?.id }}</span>
              </div>
            </div>
            <div class="flex shrink-0 items-start gap-3">
              <span class="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">{{ incidenciaHistorial()?.estado }}</span>
              <button type="button" class="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50" (click)="cerrarHistorial()" aria-label="Cerrar">✕</button>
            </div>
          </header>
          @if (errorHistorial()) { <p class="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">{{ errorHistorial() }}</p> }
          <footer class="flex justify-end border-t border-slate-100 pt-4"><button type="button" class="rounded-xl border border-slate-200 px-4 font-semibold text-slate-700 hover:bg-slate-50" (click)="cerrarHistorial()">Cerrar</button></footer>
        </section>
      </dialog>

      <dialog #detalleDialog class="!fixed !left-1/2 !top-1/2 !m-0 !-translate-x-1/2 !-translate-y-1/2 box-border w-[min(560px,calc(100vw-32px))] max-w-[calc(100vw-32px)] max-h-[calc(100dvh-32px)] overflow-auto rounded-2xl border border-[#dce4ef] bg-white p-0 text-[#14213d] shadow-[0_24px_64px_rgb(15_31_57_/_22%)] backdrop:bg-[rgb(15_31_57_/_42%)] backdrop:backdrop-blur-[2px]" aria-labelledby="detalle-dialog-title">
        <section class="space-y-4 p-6">
          <header class="border-b border-slate-100 pb-3">
            <h3 id="detalle-dialog-title" class="m-0 text-xl font-bold tracking-tight text-[#14213d]">Detalle formativo</h3>
          </header>
          <footer class="flex justify-end border-t border-slate-100 pt-3"><button type="button" class="min-h-11 rounded-xl border border-slate-200 px-5 font-semibold text-slate-700 hover:bg-slate-50" (click)="cerrarDetalle()">Cerrar</button></footer>
        </section>
      </dialog>

      <!-- Barra de Filtros con Contador de Casos -->
      <section class="rounded-2xl border border-ui-divider bg-ui-surface-soft p-4 shadow-sm space-y-3" aria-label="Filtros de incidencias">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <div>
            <label for="filtro-convivencia-busqueda" class="block text-xs font-semibold text-ui-muted mb-1">Buscar alumno</label>
            <input
              id="filtro-convivencia-busqueda"
              type="search"
              [ngModel]="busquedaTexto()"
              (ngModelChange)="busquedaTexto.set($event)"
              placeholder="Nombre o matrícula"
              class="w-full min-h-11 rounded-xl border border-ui-control-border bg-ui-surface px-3 text-xs text-ui-text focus:border-ui-focus focus:outline-none"
            />
          </div>

          <div>
            <label for="filtro-convivencia-seccion" class="block text-xs font-semibold text-ui-muted mb-1">Sección</label>
            <select
              id="filtro-convivencia-seccion"
              [ngModel]="filtroSeccion()"
              (ngModelChange)="filtroSeccion.set($event)"
              class="w-full min-h-11 rounded-xl border border-ui-control-border bg-ui-surface px-3 text-xs text-ui-text focus:border-ui-focus focus:outline-none"
            >
              <option value="TODAS">Todas las secciones</option>
              @for (sec of seccionesDisponibles(); track sec) {
                <option [value]="sec">{{ sec }}</option>
              }
            </select>
          </div>

          <div>
            <label for="filtro-convivencia-estado" class="block text-xs font-semibold text-ui-muted mb-1">Estado del caso</label>
            <select
              id="filtro-convivencia-estado"
              [ngModel]="filtroEstado()"
              (ngModelChange)="filtroEstado.set($event); paginaActual.set(1)"
              class="w-full min-h-11 rounded-xl border border-ui-control-border bg-ui-surface px-3 text-xs text-ui-text focus:border-ui-focus focus:outline-none"
            >
              <option value="TODOS">Todos los estados</option>
              <option value="ABIERTA">Abierta</option>
              <option value="ATENDIDA">Atendida</option>
              <option value="CERRADA">Cerrada</option>
            </select>
          </div>

          <div>
            <label for="filtro-convivencia-citacion" class="block text-xs font-semibold text-ui-muted mb-1">Citación familiar</label>
            <select
              id="filtro-convivencia-citacion"
              [ngModel]="filtroCitacion()"
              (ngModelChange)="filtroCitacion.set($event)"
              class="w-full min-h-11 rounded-xl border border-ui-control-border bg-ui-surface px-3 text-xs text-ui-text focus:border-ui-focus focus:outline-none"
            >
              <option value="TODAS">Todas</option>
              <option value="CON_CITACION">Con citación requerida</option>
              <option value="SIN_CITACION">Sin citación requerida</option>
            </select>
          </div>

          <div class="flex items-center justify-between lg:justify-end gap-2">
            <span class="rounded-xl border border-ui-divider bg-ui-surface px-3 py-2 text-xs font-bold text-ui-text" role="status">
              {{ incidenciasFiltradas().length }} de {{ incidencias().length }} casos
            </span>
            <button
              type="button"
              (click)="cargarIncidencias()"
              class="px-3 py-1.5 rounded-xl bg-ui-surface border border-ui-divider hover:bg-ui-action hover:text-ui-surface text-ui-action text-xs font-semibold cursor-pointer inline-flex !min-h-[44px] items-center justify-center transition-colors"
            >
              Actualizar BD
            </button>
          </div>
        </div>
      </section>

      <!-- Espacio de Trabajo: Tabla Compacta + Ficha Lateral Unificada -->
      <div class="grid grid-cols-1 gap-6 items-start" [class.lg:grid-cols-[minmax(0,1fr)_420px]]="!!incidenciaDetalle()">
        <!-- Incidents Compact Table -->
        <div class="rounded-2xl bg-ui-surface border border-ui-divider overflow-hidden shadow-sm min-w-0">
          <div class="px-4 py-3.5 sm:px-6 bg-ui-surface border-b border-ui-divider flex flex-wrap items-center justify-between gap-3">
            <h3 class="text-base sm:text-lg font-bold text-ui-text tracking-[-.025em] m-0">Registro Formativo y Medidas Correctivas</h3>
            <span class="text-xs text-ui-muted">Los filtros activos se conservan al abrir o cerrar el detalle</span>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full min-w-[680px] text-left text-sm [&_thead]:!bg-ui-surface-soft [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:!bg-ui-surface-soft/75" data-mobile-table-cards="">
              <thead class="bg-ui-surface-soft border-b border-ui-divider text-ui-action uppercase tracking-wider font-bold text-xs">
                <tr>
                  <th class="px-4 py-3">Alumno</th>
                  <th class="px-4 py-3">Fecha</th>
                  <th class="px-4 py-3">Tipo de falta</th>
                  <th class="px-4 py-3">Estado</th>
                  <th class="px-4 py-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-ui-divider text-ui-text">
                @if (cargando()) {
                  <tr>
                    <td colspan="5" class="text-center py-10 text-ui-muted">
                      <span class="inline-block w-5 h-5 border-2 border-ui-divider border-t-ui-action rounded-full animate-spin mb-2"></span>
                      <p>Consultando incidencias formativas en la base de datos...</p>
                    </td>
                  </tr>
                } @else {
                  @for (item of incidenciasPaginadas(); track item.id) {
                    <tr class="transition-colors hover:bg-ui-surface-soft/75" [class.!bg-ui-surface-soft]="incidenciaDetalle()?.id === item.id" [class.bg-ui-surface]="incidenciaDetalle()?.id !== item.id">
                      <td class="px-4 py-3 font-bold text-ui-text" data-label="Alumno">
                        <div>{{ item.nombreEstudiante || 'Estudiante sin datos' }}</div>
                        <small class="block font-normal text-xs text-ui-muted">
                          Matrícula #{{ item.matriculaId }}@if (item.seccionEtiqueta) { · {{ item.seccionEtiqueta }} }
                        </small>
                      </td>
                      <td class="px-4 py-3 text-ui-muted whitespace-nowrap" data-label="Fecha">{{ item.fecha | uiDatePe }}</td>
                      <td class="px-4 py-3" data-label="Tipo de falta">
                        <span class="inline-flex rounded-full border border-ui-divider bg-ui-surface-soft px-2.5 py-0.5 text-xs font-semibold text-ui-text">
                          {{ item.tipoFalta }}
                        </span>
                      </td>
                      <td class="px-4 py-3" data-label="Estado">
                        <span
                          class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold border"
                          [class.bg-amber-50]="item.estado === 'ABIERTA'"
                          [class.text-amber-900]="item.estado === 'ABIERTA'"
                          [class.border-amber-200]="item.estado === 'ABIERTA'"
                          [class.bg-blue-50]="item.estado === 'ATENDIDA'"
                          [class.text-blue-900]="item.estado === 'ATENDIDA'"
                          [class.border-blue-200]="item.estado === 'ATENDIDA'"
                          [class.bg-emerald-50]="item.estado === 'CERRADA'"
                          [class.text-emerald-900]="item.estado === 'CERRADA'"
                          [class.border-emerald-200]="item.estado === 'CERRADA'"
                        >
                          {{ item.estado }}
                        </span>
                      </td>
                      <td class="px-4 py-3 text-right" data-label="Acción">
                        <div class="flex flex-wrap items-center justify-end gap-1.5">
                          <button
                            type="button"
                            (click)="verDetalle(item)"
                            class="min-h-11 rounded-xl border border-blue-200 bg-blue-50 px-3.5 text-xs font-semibold text-blue-800 transition hover:bg-blue-100 cursor-pointer"
                            [attr.aria-label]="'Ver detalle formativo de ' + (item.nombreEstudiante || 'estudiante')"
                          >
                            Ver detalle
                          </button>
                          @if (puedeGestionarEstados() && item.estado === 'ABIERTA') {
                            <button type="button" (click)="iniciarGestion(item, 'ATENDIDA')" class="rounded-xl bg-amber-600 px-3 py-2 text-xs font-semibold text-white cursor-pointer">Atender</button>
                          } @else if (puedeGestionarEstados() && item.estado === 'ATENDIDA') {
                            <button type="button" (click)="iniciarGestion(item, 'CERRADA')" class="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-semibold text-white cursor-pointer">Cerrar</button>
                          }
                        </div>
                      </td>
                    </tr>
                  }
                }
              </tbody>
            </table>
          </div>
          @if (!cargando() && !error() && incidenciasFiltradas().length === 0) {
            <div class="grid w-full justify-items-center gap-2 p-[36px_20px] text-center text-[#59677a] whitespace-normal [overflow-wrap:anywhere] relative pt-[62px]">
              <p class="font-medium text-[#59677a]">No se encontraron incidencias para los filtros seleccionados.</p>
              <p class="text-[11px] text-[#59677a]">Ajusta los filtros o registra una nueva observación formativa.</p>
            </div>
          }
          <ui-paginacion
            [totalRegistros]="incidenciasFiltradas().length"
            [paginaActual]="paginaActual()"
            [tamanoPagina]="10"
            etiqueta="incidencias"
            ariaLabel="Paginación de incidencias formativas"
            (cambioPagina)="paginaActual.set($event)"
          />
        </div>

        <!-- Ficha Lateral Unificada de Detalle (Escritorio y Móvil) -->
        @if (incidenciaDetalle(); as detalle) {
          <aside class="rounded-2xl border border-[#dce4ef] bg-white p-5 shadow-md space-y-4 lg:sticky lg:top-4" aria-labelledby="ficha-lateral-incidencia-title">
            <header class="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div class="min-w-0">
                <span class="text-[11px] font-extrabold uppercase tracking-wider text-[#8b6425] block">Ficha Integral del Caso #{{ detalle.id }}</span>
                <h4 id="ficha-lateral-incidencia-title" class="m-0 mt-0.5 text-lg font-extrabold text-[#14213d] truncate">
                  {{ detalle.nombreEstudiante || 'Estudiante sin datos' }}
                </h4>
                <p class="m-0 mt-0.5 text-xs text-slate-500">
                  Matrícula #{{ detalle.matriculaId }}@if (detalle.seccionEtiqueta) { · {{ detalle.seccionEtiqueta }} } · {{ detalle.fecha | uiDatePe }}
                </p>
              </div>
              <button
                type="button"
                (click)="cerrarDetalle()"
                aria-label="Cerrar detalle"
                class="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </header>

            <!-- 1. Estado, Tipo de falta y Citación -->
            <div class="grid grid-cols-2 gap-2.5">
              <div class="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <span class="text-[11px] font-semibold text-slate-500 block">Estado y Falta</span>
                <span class="mt-1 inline-block text-xs font-extrabold text-[#14213d]">{{ detalle.estado }} · {{ detalle.tipoFalta }}</span>
              </div>
              <div class="rounded-xl border border-amber-200 bg-amber-50 p-3">
                <span class="text-[11px] font-semibold text-amber-900 block">Estado de citación</span>
                <span class="mt-1 inline-block text-xs font-extrabold text-amber-950">
                  {{ detalle.citacionPadre === true ? 'Citación requerida' : detalle.citacionPadre === false ? 'No requerida' : 'Sin dato' }}
                </span>
              </div>
            </div>

            <!-- 2. Detalle formativo -->
            <section class="rounded-xl border border-slate-200 bg-[#f8fafc] p-3.5" aria-label="Detalle formativo">
              <div class="flex items-center justify-between gap-2">
                <h5 class="m-0 text-xs font-bold uppercase tracking-wide text-slate-700">Detalle formativo</h5>
                <span class="text-[11px] text-slate-500">Reportado por {{ detalle.reportadoPor }}</span>
              </div>
              <p class="m-0 mt-2 whitespace-pre-wrap text-xs leading-relaxed text-slate-700">
                {{ detalle.descripcion || 'No se registró una descripción.' }}
              </p>
            </section>

            <!-- 3. Próxima acción -->
            <section class="rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 space-y-2" aria-label="Próxima acción">
              <h5 class="m-0 text-xs font-bold uppercase tracking-wide text-blue-950">Próxima acción recomendada</h5>
              @if (detalle.estado === 'ABIERTA') {
                <p class="m-0 text-xs text-blue-900">Realizar diálogo formativo con el estudiante y registrar la medida correctiva aplicada.</p>
                @if (puedeGestionarEstados()) {
                  <button type="button" (click)="iniciarGestion(detalle, 'ATENDIDA')" class="w-full rounded-xl bg-amber-600 hover:bg-amber-700 px-3 py-2 text-xs font-bold text-white cursor-pointer">
                    Registrar atención del caso
                  </button>
                }
              } @else if (detalle.estado === 'ATENDIDA') {
                <p class="m-0 text-xs text-blue-900">Verificar el cumplimiento del compromiso reparador y dejar constancia antes del cierre definitivo.</p>
                @if (puedeGestionarEstados()) {
                  <button type="button" (click)="iniciarGestion(detalle, 'CERRADA')" class="w-full rounded-xl bg-emerald-700 hover:bg-emerald-800 px-3 py-2 text-xs font-bold text-white cursor-pointer">
                    Verificar resultado y cerrar caso
                  </button>
                }
              } @else {
                <p class="m-0 text-xs text-emerald-900 font-medium">✓ Caso cerrado con seguimiento verificable en la auditoría.</p>
              }
            </section>

            <!-- 4. Historial del caso unificado -->
            <section class="space-y-2.5 border-t border-slate-100 pt-3" aria-label="Historial del caso">
              <div class="flex items-center justify-between">
                <h5 class="m-0 text-xs font-bold uppercase tracking-wide text-slate-700">Historial del caso</h5>
                <span class="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                  {{ eventosHistorial().length }} {{ eventosHistorial().length === 1 ? 'evento' : 'eventos' }}
                </span>
              </div>
              @if (cargandoHistorial()) {
                <p class="text-xs text-slate-500 m-0" role="status">Cargando historial del caso…</p>
              } @else if (errorHistorial()) {
                <p class="text-xs text-red-700 m-0" role="alert">{{ errorHistorial() }}</p>
              } @else if (eventosHistorial().length === 0) {
                <p class="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 m-0">
                  Sin transiciones registradas aún para esta incidencia.
                </p>
              } @else {
                <ol class="space-y-2 m-0 p-0 list-none max-h-60 overflow-y-auto">
                  @for (evento of eventosHistorial(); track evento.id) {
                    <li class="rounded-xl border border-slate-200 bg-white p-3 text-xs space-y-1">
                      <div class="flex items-center justify-between gap-2">
                        <strong class="font-bold text-slate-800">{{ evento.estadoAnterior ? evento.estadoAnterior + ' → ' + evento.estadoNuevo : evento.estadoNuevo }}</strong>
                        <time class="text-[11px] text-slate-500">{{ evento.fechaCambio | date:'dd/MM/yyyy HH:mm' }}</time>
                      </div>
                      <p class="m-0 text-slate-600">{{ evento.observacion }}</p>
                      @if (evento.resultadoVerificado) {
                        <p class="m-0 text-[11px] font-medium text-emerald-800">Resultado: {{ evento.resultadoVerificado }}</p>
                      }
                      <span class="block text-[10px] text-slate-400">Por {{ evento.nombreUsuario }}</span>
                    </li>
                  }
                </ol>
              }
            </section>
          </aside>
        }
      </div>
    </div>
  `
})
export class ConvivenciaComponent implements OnInit {
  private readonly convivenciaService = inject(ConvivenciaService);
  private readonly portalService = inject(PortalFamiliarService, { optional: true });
  private readonly auth = inject(AuthStore);
  @ViewChild('incidenciaDialog') private incidenciaDialog!: ElementRef<HTMLDialogElement>;
  @ViewChild('gestionDialog') private gestionDialog!: ElementRef<HTMLDialogElement>;
  @ViewChild('historialDialog') private historialDialog!: ElementRef<HTMLDialogElement>;
  @ViewChild('detalleDialog') private detalleDialog!: ElementRef<HTMLDialogElement>;
  readonly error = signal<string | null>(null);
  readonly mensaje = signal<string | null>(null);
  readonly guardando = signal(false);
  readonly guardandoCambio = signal(false);
  readonly intentoEnvio = signal(false);
  matriculaId = 0;
  fechaIncidencia = new Date().toLocaleDateString('sv-SE');
  tipoFalta: 'LEVE' | 'GRAVE' | 'MUY_GRAVE' = 'LEVE';
  descripcion = '';
  requiereCitacion = false;

  readonly directorioAlumnos = signal<HijoPortalDto[]>([]);
  readonly busquedaEstudianteModal = signal('');
  readonly estudianteSeleccionadoModal = computed(() =>
    this.directorioAlumnos().find(a => a.matriculaId === Number(this.matriculaId)) ?? null
  );
  readonly estudiantesSugeridosModal = computed(() => {
    const q = this.busquedaEstudianteModal().trim().toLocaleLowerCase('es-PE');
    const lista = this.directorioAlumnos();
    if (!q) return lista.slice(0, 8);
    return lista.filter(a =>
      `${a.nombres} ${a.apellidoPaterno} ${a.apellidoMaterno} ${a.numeroDocumento}`.toLocaleLowerCase('es-PE').includes(q)
    ).slice(0, 10);
  });

  cargando = signal(false);
  readonly incidencias = signal<IncidenciaEscolar[]>([]);
  readonly paginaActual = signal<number>(1);
  readonly filtroSeccion = signal<string>('TODAS');
  readonly filtroEstado = signal<EstadoIncidencia | 'TODOS'>('TODOS');
  readonly filtroCitacion = signal<'TODAS' | 'CON_CITACION' | 'SIN_CITACION'>('TODAS');
  readonly busquedaTexto = signal<string>('');

  readonly seccionesDisponibles = computed(() => {
    const set = new Set<string>();
    for (const inc of this.incidencias()) {
      if (inc.seccionEtiqueta) set.add(inc.seccionEtiqueta);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  });

  readonly incidenciasFiltradas = computed(() => {
    const sec = this.filtroSeccion();
    const est = this.filtroEstado();
    const cit = this.filtroCitacion();
    const q = this.busquedaTexto().trim().toLocaleLowerCase('es-PE');
    return this.incidencias().filter(item => {
      if (sec !== 'TODAS' && (item.seccionEtiqueta ?? '') !== sec) return false;
      if (est !== 'TODOS' && item.estado !== est) return false;
      if (cit === 'CON_CITACION' && item.citacionPadre !== true) return false;
      if (cit === 'SIN_CITACION' && item.citacionPadre === true) return false;
      if (q && !`${item.nombreEstudiante ?? ''} ${item.matriculaId} ${item.descripcion}`.toLocaleLowerCase('es-PE').includes(q)) return false;
      return true;
    });
  });

  readonly incidenciasPaginadas = computed(() =>
    paginarRegistros(this.incidenciasFiltradas(), this.paginaActual(), 10)
  );

  readonly incidenciaSeleccionada = signal<IncidenciaEscolar | null>(null);
  readonly incidenciaDetalle = signal<IncidenciaEscolar | null>(null);
  readonly estadoNuevo = signal<EstadoIncidencia | null>(null);
  readonly incidenciaHistorial = signal<IncidenciaEscolar | null>(null);
  readonly eventosHistorial = signal<HistorialEstadoIncidenciaResponseDto[]>([]);
  readonly cargandoHistorial = signal(false);
  readonly errorHistorial = signal<string | null>(null);
  observacionGestion = '';
  resultadoCierre = '';
  participantesCierre = '';
  comunicacionApoderadoCierre = '';

  puedeRegistrar(): boolean { return this.auth.hasRole('TUTOR'); }
  puedeGestionarEstados(): boolean {
    return (['AUXILIAR', 'SECRETARIA', 'DIRECCION'] as const)
      .some(rol => this.auth.hasRole(rol));
  }

  ngOnInit(): void {
    this.cargarDirectorioAlumnos();
    this.cargarIncidencias();
  }

  private cargarDirectorioAlumnos(): void {
    if (!this.portalService || typeof this.portalService.alumnosSeguimiento !== 'function') return;
    this.portalService.alumnosSeguimiento().subscribe({
      next: lista => {
        if (Array.isArray(lista)) {
          this.directorioAlumnos.set(lista);
          this.sincronizarSeccionesEnIncidencias();
        }
      },
      error: () => {}
    });
  }

  private sincronizarSeccionesEnIncidencias(): void {
    const mapa = new Map(this.directorioAlumnos().map(a => [a.matriculaId, `${a.grado} "${a.seccion}" · ${a.nivel}`]));
    if (mapa.size === 0) return;
    this.incidencias.update(actual => actual.map(item => ({
      ...item,
      seccionEtiqueta: mapa.get(item.matriculaId) ?? item.seccionEtiqueta
    })));
  }

  seleccionarEstudianteModal(alumno: HijoPortalDto): void {
    this.matriculaId = alumno.matriculaId;
    this.busquedaEstudianteModal.set(`${alumno.nombres} ${alumno.apellidoPaterno} (${alumno.numeroDocumento})`);
  }

  cargarIncidencias(): void {
    this.error.set(null);
    this.cargando.set(true);
    this.convivenciaService.listarIncidencias().subscribe({
      next: (res) => {
        this.cargando.set(false);
        const mapa = new Map(this.directorioAlumnos().map(a => [a.matriculaId, `${a.grado} "${a.seccion}" · ${a.nivel}`]));
        if (Array.isArray(res)) {
          const mapeadas: IncidenciaEscolar[] = res.map(i => ({
            id: i.id,
            matriculaId: i.matriculaId,
            nombreEstudiante: i.nombreEstudiante,
            seccionEtiqueta: mapa.get(i.matriculaId),
            fecha: i.fechaIncidencia ? String(i.fechaIncidencia) : '-',
            tipoFalta: i.tipoFalta || '—',
            descripcion: i.descripcion || '',
            reportadoPor: i.reportadoPorUsuarioId ? `Usuario #${i.reportadoPorUsuarioId}` : '—',
            citacionPadre: i.requiereCitacion ?? null,
            estado: i.estado
          }));
          this.incidencias.set(mapeadas);
          const detalleActual = this.incidenciaDetalle();
          if (detalleActual) {
            const actualizada = mapeadas.find(m => m.id === detalleActual.id) ?? null;
            this.incidenciaDetalle.set(actualizada);
          }
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
    if (!this.puedeRegistrar()) return;
    this.error.set(null);
    this.mensaje.set(null);
    this.intentoEnvio.set(false);
    this.matriculaId = 0;
    this.busquedaEstudianteModal.set('');
    this.fechaIncidencia = new Date().toLocaleDateString('sv-SE');
    this.descripcion = '';
    this.requiereCitacion = false;
    this.incidenciaDialog.nativeElement.showModal();
  }

  cerrarDialogo(): void { this.incidenciaDialog.nativeElement.close(); }

  iniciarGestion(item: IncidenciaEscolar, estado: EstadoIncidencia): void {
    if (!this.puedeGestionarEstados()) return;
    this.error.set(null);
    this.mensaje.set(null);
    this.incidenciaSeleccionada.set(item);
    this.estadoNuevo.set(estado);
    this.observacionGestion = '';
    this.resultadoCierre = '';
    this.participantesCierre = '';
    this.comunicacionApoderadoCierre = '';
    this.gestionDialog.nativeElement.showModal();
  }

  cerrarGestion(): void { this.gestionDialog.nativeElement.close(); }

  confirmarGestion(): void {
    const incidencia = this.incidenciaSeleccionada();
    const estado = this.estadoNuevo();
    const observacionGestion = this.observacionGestion.trim();
    if (!incidencia || !estado) return;
    if (observacionGestion.length < 12) {
      this.error.set('Describe la acción realizada con al menos 12 caracteres.');
      return;
    }
    const solicitud: ActualizarEstadoIncidenciaRequestDto = { estado, observacionGestion };
    if (estado === 'CERRADA') {
      const resultadoVerificado = this.resultadoCierre.trim();
      const participantes = this.participantesCierre.trim();
      const comunicacionApoderado = this.comunicacionApoderadoCierre.trim();
      if (observacionGestion.length > 350) {
        this.error.set('La acción final no puede superar 350 caracteres.');
        return;
      }
      if (resultadoVerificado.length < 15) {
        this.error.set('Describe un resultado verificable de al menos 15 caracteres.');
        return;
      }
      if (incidencia.citacionPadre === true && comunicacionApoderado.length < 12) {
        this.error.set('Registra la comunicación con la familia antes de cerrar este caso.');
        return;
      }
      solicitud.resultadoVerificado = resultadoVerificado;
      if (participantes) solicitud.participantes = participantes;
      if (comunicacionApoderado) solicitud.comunicacionApoderado = comunicacionApoderado;
    }
    this.guardandoCambio.set(true);
    this.error.set(null);
    this.convivenciaService.actualizarEstado(incidencia.id, solicitud).subscribe({
      next: () => {
        this.guardandoCambio.set(false);
        this.cerrarGestion();
        this.mensaje.set(`Incidencia ${estado.toLocaleLowerCase('es-PE')} y cambio auditado.`);
        this.cargarIncidencias();
        if (this.incidenciaDetalle()?.id === incidencia.id) {
          this.cargarHistorialDeIncidencia(incidencia.id);
        }
      },
      error: err => {
        this.guardandoCambio.set(false);
        this.error.set(err?.error?.message ?? 'No se pudo guardar el cambio de estado.');
      }
    });
  }

  private cargarHistorialDeIncidencia(id: number): void {
    if (typeof this.convivenciaService.historialEstados !== 'function') return;
    this.eventosHistorial.set([]);
    this.errorHistorial.set(null);
    this.cargandoHistorial.set(true);
    this.convivenciaService.historialEstados(id).subscribe({
      next: eventos => {
        this.eventosHistorial.set(eventos);
        this.cargandoHistorial.set(false);
      },
      error: err => {
        this.cargandoHistorial.set(false);
        this.errorHistorial.set(err?.error?.message ?? 'No se pudo cargar el historial auditado.');
      }
    });
  }

  verHistorial(item: IncidenciaEscolar): void {
    this.incidenciaHistorial.set(item);
    this.incidenciaDetalle.set(item);
    this.cargarHistorialDeIncidencia(item.id);
  }

  cerrarHistorial(): void { this.historialDialog?.nativeElement?.close(); }

  verDetalle(item: IncidenciaEscolar): void {
    this.incidenciaDetalle.set(item);
    this.incidenciaHistorial.set(item);
    this.cargarHistorialDeIncidencia(item.id);
  }

  cerrarDetalle(): void {
    if (this.detalleDialog?.nativeElement?.open) {
      this.detalleDialog.nativeElement.close();
    }
    this.incidenciaDetalle.set(null);
  }

  registrar(): void {
    this.intentoEnvio.set(true);
    if (!this.matriculaId || !this.fechaIncidencia || !this.descripcion.trim()) {
      this.error.set('Complete matrícula, fecha y descripción.');
      return;
    }
    this.guardando.set(true);
    this.error.set(null);
    this.convivenciaService.registrarIncidencia({
      matriculaId: this.matriculaId,
      fechaIncidencia: this.fechaIncidencia,
      tipoFalta: this.tipoFalta,
      descripcion: this.descripcion.trim(),
      requiereCitacion: this.requiereCitacion
    }).subscribe({
      next: () => {
        this.guardando.set(false);
        this.intentoEnvio.set(false);
        this.cerrarDialogo();
        this.error.set(null);
        this.mensaje.set('Incidencia registrada correctamente.');
        this.descripcion = '';
        this.cargarIncidencias();
      },
      error: err => {
        this.guardando.set(false);
        this.error.set(err?.error?.message ?? 'No se pudo registrar la incidencia.');
      }
    });
  }
}
