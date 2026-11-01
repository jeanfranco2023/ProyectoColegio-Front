import { Component, ElementRef, inject, signal, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConvivenciaService } from '../../core/services/convivencia.service';
import { UiDatePePipe } from '../../shared/ui/ui-date-pe.pipe';
import { AuthStore } from '../../core/state/auth.store';
import { ActualizarEstadoIncidenciaRequestDto, EstadoIncidencia, HistorialEstadoIncidenciaResponseDto } from '../../core/models/convivencia.model';

export interface IncidenciaEscolar {
  id: number;
  matriculaId: number;
  nombreEstudiante?: string;
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
        @if (puedeRegistrar()) { <div class="flex items-center gap-3">
          <button
            (click)="nuevaIncidencia()"
            class="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs !text-[11px] sm:!text-[11px] shadow-lg shadow-blue-600/30 transition flex items-center gap-2 cursor-pointer max-[640px]:w-full box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>Registrar Incidencia en BD</span>
          </button>
        </div> } @else if (puedeGestionarEstados()) {
          <span class="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">Gestión de incidencias</span>
        } @else { <span class="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">Consulta</span> }
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
          </div><footer class="sticky bottom-0 z-[1] flex flex-[0_0_auto] flex-wrap justify-end gap-[10px] border-t border-[#e5eaf2] bg-white px-6 py-[14px] max-[639px]:px-4 max-[639px]:py-3 max-[639px]:[&>button]:flex-[1_1_auto]"><button type="button" class="rounded-xl border border-[#e5eaf2] bg-[#f5f7fb] px-4 font-semibold text-[#334155] max-[640px]:w-full box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]" (click)="cerrarDialogo()">Cancelar</button><button type="submit" [disabled]="guardando()" class="rounded-xl bg-[#2563eb] px-[18px] font-bold text-white shadow-[0_8px_18px_rgb(37_99_235_/_18%)] disabled:cursor-wait disabled:opacity-[.55] max-[640px]:w-full box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]">{{ guardando() ? 'Guardando…' : 'Registrar incidencia' }}</button></footer></form>
        </div>
      </dialog>

      <dialog #gestionDialog class="!fixed !left-1/2 !top-1/2 !m-0 !-translate-x-1/2 !-translate-y-1/2 box-border h-fit w-[min(620px,calc(100vw-32px))] max-w-[calc(100vw-32px)] max-h-[calc(100dvh-32px)] overflow-auto rounded-2xl border border-[#dce4ef] bg-white p-0 text-[#14213d] shadow-[0_24px_64px_rgb(15_31_57_/_22%)] backdrop:bg-[rgb(15_31_57_/_42%)] backdrop:backdrop-blur-[2px]" aria-labelledby="gestion-dialog-title">
        <form (ngSubmit)="confirmarGestion()" class="space-y-5 p-6 max-[639px]:space-y-4 max-[639px]:p-4">
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
          <label class="block text-sm font-semibold text-slate-800">
            {{ estadoNuevo() === 'CERRADA' ? 'Acción final realizada' : 'Acción realizada' }} *
            <span class="mt-1 block text-xs font-normal leading-relaxed text-slate-500">Describe la medida aplicada y cómo se llevó a cabo.</span>
            <textarea [(ngModel)]="observacionGestion" name="observacionGestion" required minlength="12" [attr.maxlength]="estadoNuevo() === 'CERRADA' ? 350 : 1000" rows="3" placeholder="Ej.: se realizó una conversación restaurativa y se acordaron medidas concretas." class="mt-2 block min-h-24 w-full resize-y rounded-xl border border-slate-300 p-3 font-normal leading-relaxed focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"></textarea>
            <span class="mt-1 block text-right text-xs font-normal text-slate-500">{{ observacionGestion.length }} / {{ estadoNuevo() === 'CERRADA' ? 350 : 1000 }} caracteres</span>
          </label>
          @if (estadoNuevo() === 'CERRADA') {
            <div class="space-y-4 border-t border-slate-100 pt-4">
              <label class="block text-sm font-semibold text-slate-800">Resultado verificado *
                <span class="mt-1 block text-xs font-normal leading-relaxed text-slate-500">¿Qué evidencia permite confirmar que el caso quedó resuelto?</span>
                <textarea [(ngModel)]="resultadoCierre" name="resultadoCierre" required minlength="15" maxlength="300" rows="3" placeholder="Describe el acuerdo cumplido, el cambio observado o la medida completada." class="mt-2 block min-h-24 w-full resize-y rounded-xl border border-slate-300 p-3 font-normal leading-relaxed focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"></textarea>
                <span class="mt-1 block text-right text-xs font-normal text-slate-500">{{ resultadoCierre.length }} / 300 caracteres</span>
              </label>
              <label class="block text-sm font-semibold text-slate-800">Participantes <span class="font-normal text-slate-500">(opcional)</span>
                <input [(ngModel)]="participantesCierre" name="participantesCierre" maxlength="120" placeholder="Ej.: auxiliar, tutor y estudiante" class="mt-2 block min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 font-normal focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100">
              </label>
              <label class="block text-sm font-semibold text-slate-800">
                {{ incidenciaSeleccionada()?.citacionPadre === true ? 'Constancia de comunicación con la familia *' : 'Comunicación con la familia (opcional)' }}
                <span class="mt-1 block text-xs font-normal leading-relaxed text-slate-500">Indica fecha, medio y resultado del contacto, si corresponde.</span>
                <textarea [(ngModel)]="comunicacionApoderadoCierre" name="comunicacionApoderadoCierre" [required]="incidenciaSeleccionada()?.citacionPadre === true" maxlength="130" rows="2" placeholder="Ej.: apoderado informado por llamada el 14/10; confirmó el acuerdo." class="mt-2 block min-h-20 w-full resize-y rounded-xl border border-slate-300 p-3 font-normal leading-relaxed focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"></textarea>
              </label>
            </div>
          }
          <footer class="flex justify-end gap-2 border-t border-slate-100 pt-4 max-[480px]:[&>button]:flex-1">
            <button type="button" class="min-h-11 rounded-xl border border-slate-200 px-4 font-semibold text-slate-700 hover:bg-slate-50" (click)="cerrarGestion()">Cancelar</button>
            <button type="submit" [disabled]="guardandoCambio()" class="min-h-11 rounded-xl bg-blue-700 px-4 font-semibold text-white hover:bg-blue-800 disabled:cursor-wait disabled:opacity-50">{{ guardandoCambio() ? 'Guardando…' : estadoNuevo() === 'CERRADA' ? 'Cerrar caso con auditoría' : 'Guardar atención' }}</button>
          </footer>
        </form>
      </dialog>

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
          <section aria-label="Resumen del caso" class="overflow-hidden rounded-xl border border-slate-200">
            <div class="border-b border-slate-200 bg-slate-50 px-4 py-3">
              <h4 class="m-0 text-sm font-semibold text-slate-800">Datos del caso</h4>
              <p class="mb-0 mt-1 text-xs text-slate-500">Información original registrada para esta incidencia.</p>
            </div>
            <dl class="grid grid-cols-2 divide-x divide-y divide-slate-100 sm:grid-cols-4">
              <div class="min-w-0 p-3">
                <dt class="text-[11px] font-medium text-slate-500">Tipo de falta</dt>
                <dd class="mt-1 m-0 text-sm font-semibold text-slate-800">{{ incidenciaHistorial()?.tipoFalta }}</dd>
              </div>
              <div class="min-w-0 p-3">
                <dt class="text-[11px] font-medium text-slate-500">Fecha del hecho</dt>
                <dd class="mt-1 m-0 text-sm font-semibold text-slate-800">{{ incidenciaHistorial()?.fecha | date:'dd/MM/yyyy' }}</dd>
              </div>
              <div class="min-w-0 p-3">
                <dt class="text-[11px] font-medium text-slate-500">Matrícula</dt>
                <dd class="mt-1 m-0 text-sm font-semibold text-slate-800">#{{ incidenciaHistorial()?.matriculaId }}</dd>
              </div>
              <div class="min-w-0 p-3">
                <dt class="text-[11px] font-medium text-slate-500">Citación a familia</dt>
                <dd class="mt-1 m-0 text-sm font-semibold text-slate-800">{{ incidenciaHistorial()?.citacionPadre === true ? 'Requerida' : incidenciaHistorial()?.citacionPadre === false ? 'No requerida' : 'Sin definir' }}</dd>
              </div>
            </dl>
            <div class="border-t border-slate-100 px-4 py-3">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <h5 class="m-0 text-xs font-semibold text-slate-600">Relato inicial</h5>
                <span class="text-xs text-slate-500">Reportado por {{ incidenciaHistorial()?.reportadoPor || 'No especificado' }}</span>
              </div>
              <p class="mb-0 mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{{ incidenciaHistorial()?.descripcion || 'No se registró una descripción.' }}</p>
            </div>
          </section>
          @if (cargandoHistorial()) {
            <p role="status" class="text-sm text-slate-600">Cargando historial…</p>
          } @else if (eventosHistorial().length === 0) {
            <p class="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">No hay eventos de auditoría disponibles para esta incidencia.</p>
          } @else {
            <div class="flex items-center justify-between gap-3">
              <div>
                <h4 class="m-0 text-sm font-semibold text-slate-800">Seguimiento y resolución</h4>
                <p class="mb-0 mt-1 text-xs text-slate-500">Acciones registradas en el sistema.</p>
              </div>
              <span class="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800">{{ eventosHistorial().length }} {{ eventosHistorial().length === 1 ? 'evento' : 'eventos' }}</span>
            </div>
            <ol aria-label="Cambios de estado" class="relative ms-2 space-y-3 border-s border-slate-200 ps-5">
              @for (evento of eventosHistorial(); track evento.id) {
                <li class="relative rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgb(15_31_57_/_5%)] max-[639px]:p-3">
                  <span aria-hidden="true" class="absolute -left-[26px] top-5 h-2.5 w-2.5 rounded-full border-2 border-white bg-blue-600 ring-1 ring-blue-200"></span>
                  <div class="flex flex-wrap items-center justify-between gap-2">
                    <div class="flex flex-wrap items-center gap-2">
                      <span class="grid h-7 w-7 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">{{ $index + 1 }}</span>
                      <strong class="text-sm font-semibold text-slate-800">{{ evento.estadoAnterior ? evento.estadoAnterior + ' → ' + evento.estadoNuevo : 'Estado inicial: ' + evento.estadoNuevo }}</strong>
                    </div>
                    <time class="text-xs tabular-nums text-slate-500">{{ evento.fechaCambio | date:'dd/MM/yyyy HH:mm' }}</time>
                  </div>
                  <dl class="mt-3 grid gap-3 border-t border-slate-100 pt-3 text-sm">
                    <div>
                      <dt class="text-xs font-medium text-slate-500">Responsable</dt>
                      <dd class="mt-1 m-0 font-semibold text-slate-800">{{ evento.nombreUsuario }} <span class="font-normal text-slate-500">· usuario #{{ evento.usuarioId }}</span></dd>
                    </div>
                    <div>
                      <dt class="text-xs font-medium text-slate-500">Detalle registrado</dt>
                      <dd class="mt-1 m-0 whitespace-pre-wrap leading-relaxed text-slate-700">{{ evento.observacion }}</dd>
                    </div>
                    @if (evento.resultadoVerificado) {
                      <div class="rounded-lg border border-emerald-100 bg-emerald-50/70 p-3">
                        <dt class="text-xs font-semibold text-emerald-800">Resultado verificado</dt>
                        <dd class="mt-1 m-0 whitespace-pre-wrap leading-relaxed text-slate-700">{{ evento.resultadoVerificado }}</dd>
                      </div>
                    }
                    @if (evento.participantes) {
                      <div>
                        <dt class="text-xs font-medium text-slate-500">Participantes</dt>
                        <dd class="mt-1 m-0 leading-relaxed text-slate-700">{{ evento.participantes }}</dd>
                      </div>
                    }
                    @if (evento.comunicacionApoderado) {
                      <div>
                        <dt class="text-xs font-medium text-slate-500">Comunicación con la familia</dt>
                        <dd class="mt-1 m-0 whitespace-pre-wrap leading-relaxed text-slate-700">{{ evento.comunicacionApoderado }}</dd>
                      </div>
                    }
                  </dl>
                </li>
              }
            </ol>
          }
          <footer class="flex justify-end border-t border-slate-100 pt-4"><button type="button" class="rounded-xl border border-slate-200 px-4 font-semibold text-slate-700 hover:bg-slate-50" (click)="cerrarHistorial()">Cerrar</button></footer>
        </section>
      </dialog>

      <!-- Incidents Table -->
      <div class="rounded-2xl bg-white border border-[#e5eaf2] overflow-hidden shadow-sm">
        <div class="px-4 py-4 sm:px-6 bg-white border-b border-[#e5eaf2] flex flex-wrap items-center justify-between gap-3">
          <h3 class="text-sm font-bold text-[#14213d] tracking-[-.025em]">Registro Formativo y Medidas Correctivas</h3>
          <button
            (click)="cargarIncidencias()"
            class="px-3 py-1.5 rounded-xl bg-[#f3f6fa] hover:bg-slate-700 text-[#34445d] text-xs !text-[11px] font-semibold cursor-pointer max-[640px]:w-full box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]"
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
                <th class="px-5 py-3.5">Gestión / auditoría</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#edf0f5] text-[#34445d]">
              @if (cargando()) {
                <tr>
                  <td colspan="8" class="text-center py-10 text-[#59677a]">
                    <span class="inline-block w-5 h-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-2"></span>
                    <p>Consultando incidencias formativas en la base de datos...</p>
                  </td>
                </tr>
              } @else {
                @for (item of incidencias(); track item.id) {
                  <tr class="!bg-[#f1f4f9] hover:bg-[#f1f4f9] transition">
                    <td class="px-5 py-3.5 font-mono text-[#59677a]" data-label="ID BD">{{ item.id }}</td>
                    <td class="px-5 py-3.5 font-bold text-[#14213d]" data-label="Estudiante">{{ item.nombreEstudiante || 'Estudiante sin datos' }}</td>
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
                    <td class="px-5 py-3.5" data-label="Gestión / auditoría">
                      <div class="flex flex-wrap items-center gap-2">
                        <button type="button" (click)="verHistorial(item)" class="rounded-lg border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-700">Historial</button>
                        @if (puedeGestionarEstados() && item.estado === 'ABIERTA') {
                          <button type="button" (click)="iniciarGestion(item, 'ATENDIDA')" class="rounded-lg bg-amber-600 px-3 py-2 font-semibold text-white">Atender</button>
                        } @else if (puedeGestionarEstados() && item.estado === 'ATENDIDA') {
                          <button type="button" (click)="iniciarGestion(item, 'CERRADA')" class="rounded-lg bg-emerald-700 px-3 py-2 font-semibold text-white">Cerrar</button>
                        }
                      </div>
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
  private readonly auth = inject(AuthStore);
  @ViewChild('incidenciaDialog') private incidenciaDialog!: ElementRef<HTMLDialogElement>;
  @ViewChild('gestionDialog') private gestionDialog!: ElementRef<HTMLDialogElement>;
  @ViewChild('historialDialog') private historialDialog!: ElementRef<HTMLDialogElement>;
  readonly error = signal<string | null>(null);
  readonly mensaje = signal<string | null>(null);
  readonly guardando = signal(false);
  readonly guardandoCambio = signal(false);
  matriculaId = 0;
  fechaIncidencia = new Date().toLocaleDateString('sv-SE');
  tipoFalta: 'LEVE' | 'GRAVE' | 'MUY_GRAVE' = 'LEVE';
  descripcion = '';
  requiereCitacion = false;

  cargando = signal(false);
  readonly incidencias = signal<IncidenciaEscolar[]>([]);
  readonly incidenciaSeleccionada = signal<IncidenciaEscolar | null>(null);
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
    if (!this.puedeRegistrar()) return;
    this.error.set(null);
    this.mensaje.set(null);
    this.matriculaId = 0;
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
      },
      error: err => {
        this.guardandoCambio.set(false);
        this.error.set(err?.error?.message ?? 'No se pudo guardar el cambio de estado.');
      }
    });
  }

  verHistorial(item: IncidenciaEscolar): void {
    this.incidenciaHistorial.set(item);
    this.eventosHistorial.set([]);
    this.errorHistorial.set(null);
    this.cargandoHistorial.set(true);
    this.historialDialog.nativeElement.showModal();
    this.convivenciaService.historialEstados(item.id).subscribe({
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

  cerrarHistorial(): void { this.historialDialog.nativeElement.close(); }

  registrar(): void {
    if (!this.matriculaId || !this.fechaIncidencia || !this.descripcion.trim()) { this.error.set('Complete matrícula, fecha y descripción.'); return; }
    this.guardando.set(true); this.error.set(null);
    this.convivenciaService.registrarIncidencia({ matriculaId: this.matriculaId, fechaIncidencia: this.fechaIncidencia, tipoFalta: this.tipoFalta, descripcion: this.descripcion.trim(), requiereCitacion: this.requiereCitacion }).subscribe({
      next: () => { this.guardando.set(false); this.cerrarDialogo(); this.error.set(null); this.mensaje.set('Incidencia registrada correctamente.'); this.descripcion = ''; this.cargarIncidencias(); },
      error: err => { this.guardando.set(false); this.error.set(err?.error?.message ?? 'No se pudo registrar la incidencia.'); }
    });
  }
}
