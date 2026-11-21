import { FormatoEntradaDirective } from '../../shared/ui/formato-entrada.directive';
import { UiPaginacionComponent, paginarRegistros } from '../../shared/ui/ui-paginacion.component';
import { Component, computed, ElementRef, inject, signal, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AcademicoService } from '../../core/services/academico.service';
import { AnioLectivoResponseDto, AulaResponseDto, NivelResponseDto, SeccionResponseDto, GradoResponseDto } from '../../core/models/academico.model';
import { AuthStore } from '../../core/state/auth.store';

const AULA_CODE_PREFIXES: Record<string, string> = {
  INIC: 'INI',
  PRIM: 'PRI',
  SEC: 'SEC'
};

const ORDEN_GRADOS_INSTITUCIONAL = [
  'Inicial 3 años',
  'Inicial 4 años',
  'Inicial 5 años',
  '1° de Primaria',
  '2° de Primaria',
  '3° de Primaria',
  '4° de Primaria',
  '5° de Primaria',
  '6° de Primaria',
  '1° de Secundaria',
  '2° de Secundaria',
  '3° de Secundaria',
  '4° de Secundaria',
  '5° de Secundaria'
];

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

export interface AulaFila {
  id: number;
  codigo: string;
  nombre: string;
  ubicacion: string;
  capacidad: number | null;
  activa: boolean | null;
  grado: string;
  seccion: string;
  nivel: string;
  cuposOcupados: number;
  cupoMaximo: number;
  vacantesDisponibles: number;
}

@Component({
  selector: 'app-academico',
  standalone: true,
  imports: [FormatoEntradaDirective, CommonModule, FormsModule, UiPaginacionComponent],
  template: `
    <div class="space-y-6 min-w-0 text-ui-text [&_*:focus-visible]:outline-[3px] [&_*:focus-visible]:outline-ui-focus [&_*:focus-visible]:outline-offset-[3px]">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t-[3px] border-t-ui-divider pt-3">
        <div>
          <h2 class="text-2xl sm:text-3xl font-extrabold tracking-tight !text-ui-text tracking-[-.025em]">Estructura Académica, Aulas & Secciones</h2>
          <p class="text-sm !text-ui-muted mt-1">
            Control de cupos ocupados, cupo máximo (máx. 30) y vacantes disponibles por aula y sección.
          </p>
        </div>
        <div class="flex items-center gap-3">
          @if (authStore.hasRole('DIRECCION') || authStore.hasRole('ADMINISTRADOR')) {
          <button
            (click)="abrirModalNuevaAula()"
            class="px-4 py-2.5 rounded-xl bg-ui-action hover:bg-ui-action/90 text-ui-action-text font-semibold text-sm shadow-[var(--ui-card-shadow)] transition inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-center align-middle cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>Nueva Aula</span>
          </button>
          }
        </div>
      </div>

      @if (error()) { <p class="text-ui-error-text text-sm" role="alert">{{ error() }}</p> }

      <!-- Modal Registrar Nueva Aula -->
      @if (authStore.hasRole('DIRECCION') || authStore.hasRole('ADMINISTRADOR')) {
      <dialog #aulaDialog class="box-border w-[min(680px,calc(100vw-24px))] max-w-[calc(100vw-24px)] max-h-[calc(100dvh-24px)] overflow-hidden border border-ui-divider rounded-[22px] bg-ui-surface text-ui-text p-0 shadow-dialog backdrop:bg-[rgb(12_24_43_/_46%)] backdrop:backdrop-blur-[3px] max-[639px]:w-[calc(100vw-16px)] max-[639px]:max-w-[calc(100vw-16px)] max-[639px]:max-h-[calc(100dvh-16px)] max-[639px]:rounded-[18px]" aria-labelledby="aula-dialog-title">
        <div class="flex max-h-[calc(100dvh-24px)] min-h-0 flex-col">
          <header class="flex flex-[0_0_auto] items-center justify-between gap-4 border-b border-ui-divider px-6 py-5 [&_h3]:m-0 [&_h3]:text-ui-text [&_h3]:text-lg [&_h3]:leading-[27px] [&_h3]:font-[750] [&_p]:mb-0 [&_p]:mt-1 [&_p]:text-ui-muted [&_p]:text-xs [&_p]:leading-[1.5] max-[639px]:p-4">
            <div><h3 id="aula-dialog-title" class="tracking-[-.025em]">Registrar aula</h3><p>Completa los datos del ambiente escolar (cupo máximo reglamentario: 30 estudiantes).</p></div>
            <button type="button" class="min-h-9 rounded-xl border border-ui-divider bg-ui-surface-soft px-3 !font-[650] text-ui-action !grid !h-11 !w-11 !min-w-11 !min-h-11 !place-items-center !py-0" (click)="cerrarDialogoAula()" aria-label="Cerrar">✕</button>
          </header>
          <form (ngSubmit)="crearAula()" class="flex min-h-0 flex-[1_1_auto] flex-col">
            <div class="min-h-0 flex-[1_1_auto] overflow-auto overscroll-contain px-6 py-5 max-[639px]:p-4 space-y-4">
              @if (error()) { <p class="m-0 rounded-xl border border-ui-error-border bg-ui-error-bg px-3 py-[10px] text-xs text-ui-error-text" role="alert">{{ error() }}</p> }
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label for="aula-codigo" class="block min-w-0 text-xs font-semibold leading-normal text-ui-muted">Código de aula *</label>
                  <input id="aula-codigo" [(ngModel)]="codigo" name="codigo" required maxlength="30" placeholder="Ej. SEC-1-A" autocomplete="off" aria-describedby="aula-codigo-help" class="mt-[6px] block w-full min-w-0 !min-h-[44px] max-w-full border px-3 py-[10px] !border-ui-control-border rounded-xl !bg-ui-surface !text-ui-text transition-colors focus:border-ui-focus focus:outline-none focus:shadow-[0_0_0_3px_var(--ui-focus)] max-[639px]:text-base !font-[650]">
                  <span id="aula-codigo-help" class="mt-1 block text-[11px] text-ui-muted">Identificador único del aula.</span>
                </div>
                <div>
                  <label for="aula-nombre" class="block min-w-0 text-xs font-semibold leading-normal text-ui-muted">Nombre de aula *</label>
                  <input id="aula-nombre" [(ngModel)]="nombre" name="nombre" required maxlength="100" placeholder="Ej. Aula - 1° de Secundaria - Sección A" aria-describedby="aula-nombre-help" class="mt-[6px] block w-full min-w-0 !min-h-[44px] max-w-full border px-3 py-[10px] !border-ui-control-border rounded-xl !bg-ui-surface !text-ui-text transition-colors focus:border-ui-focus focus:outline-none focus:shadow-[0_0_0_3px_var(--ui-focus)] max-[639px]:text-base !font-[650]">
                  <span id="aula-nombre-help" class="mt-1 block text-[11px] text-ui-muted">Denominación institucional del ambiente.</span>
                </div>
                <div class="sm:col-span-2">
                  <label for="aula-ubicacion" class="block min-w-0 text-xs font-semibold leading-normal text-ui-muted">Ubicación</label>
                  <input id="aula-ubicacion" [(ngModel)]="ubicacion" name="ubicacion" maxlength="150" placeholder="Pabellón, piso u otra referencia" class="mt-[6px] block w-full min-w-0 !min-h-[44px] max-w-full border px-3 py-[10px] !border-ui-control-border rounded-xl !bg-ui-surface !text-ui-text transition-colors focus:border-ui-focus focus:outline-none focus:shadow-[0_0_0_3px_var(--ui-focus)] max-[639px]:text-base !font-[650]">
                </div>
                <div>
                  <label for="aula-capacidad" class="block min-w-0 text-xs font-semibold leading-normal text-ui-muted">Capacidad (cupo máximo, máx. 30) *</label>
                  <input id="aula-capacidad" appFormatoEntrada="entero" type="number" [(ngModel)]="capacidad" name="capacidad" min="1" max="30" required aria-describedby="aula-capacidad-help" class="mt-[6px] block w-full min-w-0 !min-h-[44px] max-w-full border px-3 py-[10px] !border-ui-control-border rounded-xl !bg-ui-surface !text-ui-text transition-colors focus:border-ui-focus focus:outline-none focus:shadow-[0_0_0_3px_var(--ui-focus)] max-[639px]:text-base !font-[650]">
                  <span id="aula-capacidad-help" class="mt-1 block text-[11px] text-ui-muted">Entre 1 y 30 vacantes por aula.</span>
                </div>
              </div>
            </div>
            <footer class="sticky bottom-0 z-[1] flex flex-[0_0_auto] flex-wrap justify-end gap-[10px] border-t border-ui-divider bg-ui-surface px-6 py-[14px] max-[639px]:px-4 max-[639px]:py-3 max-[639px]:[&>button]:flex-[1_1_auto]">
              <button type="button" class="rounded-xl border border-ui-divider bg-ui-surface-soft px-4 font-semibold text-ui-action max-[640px]:min-h-11 box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]" (click)="cerrarDialogoAula()">Cancelar</button>
              <button type="submit" [disabled]="guardando()" class="rounded-xl bg-ui-action px-[18px] font-bold text-ui-action-text shadow-card disabled:cursor-wait disabled:opacity-[.55] max-[640px]:min-h-11 box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]">{{ guardando() ? 'Guardando…' : 'Crear aula' }}</button>
            </footer>
          </form>
        </div>
      </dialog>
      }

      <!-- Modal 1: Detalles del Aula -->
      <dialog #detallesDialog class="box-border w-[min(540px,calc(100vw-24px))] max-w-[calc(100vw-24px)] overflow-hidden border border-ui-divider rounded-2xl bg-ui-surface text-ui-text p-0 shadow-dialog backdrop:bg-[rgb(12_24_43_/_46%)] backdrop:backdrop-blur-[3px]" aria-labelledby="detalles-dialog-title">
        <div class="flex flex-col">
          <header class="flex items-center justify-between border-b border-ui-divider px-6 py-4">
            <h3 id="detalles-dialog-title" class="text-lg font-bold text-ui-text m-0">Detalles del Aula: {{ aulaDetalle()?.codigo }}</h3>
            <button type="button" class="w-8 h-8 rounded-lg border border-ui-divider bg-ui-surface-soft text-ui-action grid place-items-center cursor-pointer" (click)="cerrarDetalles()" aria-label="Cerrar modal de detalles">✕</button>
          </header>
          <div class="p-6 space-y-4 text-sm">
            <div class="grid grid-cols-2 gap-4">
              <div class="p-3 rounded-xl bg-ui-surface-soft border border-ui-divider">
                <span class="text-xs text-ui-muted block font-semibold">Grado y Sección</span>
                <span class="text-sm font-bold text-ui-text mt-0.5 block">{{ aulaDetalle()?.grado }} · Sección {{ aulaDetalle()?.seccion }}</span>
              </div>
              <div class="p-3 rounded-xl bg-ui-surface-soft border border-ui-divider">
                <span class="text-xs text-ui-muted block font-semibold">Estado del aula</span>
                <div class="mt-1">
                  @if (aulaDetalle()?.activa === true) {
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Activa
                    </span>
                  } @else {
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                      Inactiva
                    </span>
                  }
                </div>
              </div>
            </div>

            <div class="grid grid-cols-3 gap-3">
              <div class="p-3 rounded-xl bg-ui-surface-soft border border-ui-divider text-center">
                <span class="text-xs text-ui-muted block font-semibold">Cupos Ocupados</span>
                <span class="text-base font-extrabold text-ui-text mt-1 block">{{ aulaDetalle()?.cuposOcupados }}</span>
              </div>
              <div class="p-3 rounded-xl bg-ui-surface-soft border border-ui-divider text-center">
                <span class="text-xs text-ui-muted block font-semibold">Cupo Máximo</span>
                <span class="text-base font-extrabold text-ui-text mt-1 block">{{ aulaDetalle()?.cupoMaximo }} (máx. 30)</span>
              </div>
              <div class="p-3 rounded-xl bg-ui-surface-soft border border-ui-divider text-center">
                <span class="text-xs text-ui-muted block font-semibold">Vacantes Libres</span>
                <span class="text-base font-extrabold text-emerald-600 mt-1 block">{{ aulaDetalle()?.vacantesDisponibles }}</span>
              </div>
            </div>

            <div class="p-3 rounded-xl bg-ui-surface-soft border border-ui-divider">
              <span class="text-xs text-ui-muted block font-semibold">Ubicación Física</span>
              <span class="text-sm text-ui-text mt-0.5 block">{{ aulaDetalle()?.ubicacion || 'Sin ubicación registrada' }}</span>
            </div>

            <div class="p-3 rounded-xl bg-ui-surface-soft border border-ui-divider">
              <span class="text-xs text-ui-muted block font-semibold">Nombre Institucional</span>
              <span class="text-sm text-ui-text mt-0.5 block">{{ aulaDetalle()?.nombre }}</span>
            </div>
          </div>
          <footer class="border-t border-ui-divider px-6 py-3 flex justify-end">
            <button type="button" class="px-4 py-2 rounded-xl bg-ui-surface-soft border border-ui-divider font-semibold text-ui-action cursor-pointer hover:bg-ui-divider transition" (click)="cerrarDetalles()">Cerrar</button>
          </footer>
        </div>
      </dialog>

      <!-- Modal 2: Editar Capacidad y Datos del Aula -->
      <dialog #editarDialog class="box-border w-[min(560px,calc(100vw-24px))] max-w-[calc(100vw-24px)] overflow-hidden border border-ui-divider rounded-2xl bg-ui-surface text-ui-text p-0 shadow-dialog backdrop:bg-[rgb(12_24_43_/_46%)] backdrop:backdrop-blur-[3px]" aria-labelledby="editar-dialog-title">
        <div class="flex flex-col">
          <header class="flex items-center justify-between border-b border-ui-divider px-6 py-4">
            <div>
              <h3 id="editar-dialog-title" class="text-lg font-bold text-ui-text m-0">Editar Aula: {{ aulaEditando()?.codigo }}</h3>
              <p class="text-xs text-ui-muted m-0 mt-0.5">Ajuste de cupo máximo reglamentario y denominación física.</p>
            </div>
            <button type="button" class="w-8 h-8 rounded-lg border border-ui-divider bg-ui-surface-soft text-ui-action grid place-items-center cursor-pointer" (click)="cerrarEditar()" aria-label="Cerrar modal de edición">✕</button>
          </header>
          <form (ngSubmit)="guardarEdicion()" class="p-6 space-y-4">
            <div>
              <label for="edit-capacidad" class="block text-xs font-semibold text-ui-muted">Capacidad del Aula (Cupo máximo, máx. 30) *</label>
              <input
                id="edit-capacidad"
                type="number"
                min="1"
                max="30"
                [(ngModel)]="editCapacidad"
                name="editCapacidad"
                required
                class="mt-1 block w-full border px-3 py-2 border-ui-control-border rounded-xl bg-ui-surface text-ui-text font-bold focus:border-ui-focus focus:outline-none"
              />
              <span class="mt-1 block text-[11px] text-ui-muted">Límite reglamentario institucional: hasta 30 estudiantes.</span>
            </div>

            <div>
              <label for="edit-nombre" class="block text-xs font-semibold text-ui-muted">Nombre de Aula *</label>
              <input
                id="edit-nombre"
                type="text"
                maxlength="100"
                [(ngModel)]="editNombre"
                name="editNombre"
                required
                class="mt-1 block w-full border px-3 py-2 border-ui-control-border rounded-xl bg-ui-surface text-ui-text font-semibold focus:border-ui-focus focus:outline-none"
              />
            </div>

            <div>
              <label for="edit-ubicacion" class="block text-xs font-semibold text-ui-muted">Ubicación Física</label>
              <input
                id="edit-ubicacion"
                type="text"
                maxlength="150"
                [(ngModel)]="editUbicacion"
                name="editUbicacion"
                placeholder="Pabellón, piso, etc."
                class="mt-1 block w-full border px-3 py-2 border-ui-control-border rounded-xl bg-ui-surface text-ui-text font-medium focus:border-ui-focus focus:outline-none"
              />
            </div>

            @if (errorEdicion()) {
              <p class="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg p-2">{{ errorEdicion() }}</p>
            }

            <footer class="border-t border-ui-divider pt-4 flex justify-end gap-3">
              <button type="button" class="px-4 py-2 rounded-xl bg-ui-surface-soft border border-ui-divider font-semibold text-ui-action cursor-pointer hover:bg-ui-divider transition" (click)="cerrarEditar()">Cancelar</button>
              <button type="submit" [disabled]="guardandoEdicion()" class="px-4 py-2 rounded-xl bg-ui-action text-ui-action-text font-bold cursor-pointer hover:opacity-90 disabled:opacity-50 transition shadow-sm">
                {{ guardandoEdicion() ? 'Guardando…' : 'Guardar Cambios' }}
              </button>
            </footer>
          </form>
        </div>
      </dialog>

      <!-- Modal 3: Confirmación Inhabilitar / Reactivar Aula -->
      <dialog #estadoDialog class="box-border w-[min(480px,calc(100vw-24px))] max-w-[calc(100vw-24px)] overflow-hidden border border-ui-divider rounded-2xl bg-ui-surface text-ui-text p-0 shadow-dialog backdrop:bg-[rgb(12_24_43_/_46%)] backdrop:backdrop-blur-[3px]" aria-labelledby="estado-dialog-title">
        <div class="flex flex-col">
          <header class="flex items-center justify-between border-b border-ui-divider px-6 py-4">
            <h3 id="estado-dialog-title" class="text-base font-bold text-ui-text m-0">
              {{ aulaEstado()?.activa ? 'Inhabilitar Aula' : 'Reactivar Aula' }}
            </h3>
            <button type="button" class="w-8 h-8 rounded-lg border border-ui-divider bg-ui-surface-soft text-ui-action grid place-items-center cursor-pointer" (click)="cerrarConfirmarEstado()" aria-label="Cerrar modal">✕</button>
          </header>
          <div class="p-6 space-y-3 text-sm">
            <p class="text-ui-text font-medium m-0">
              @if (aulaEstado()?.activa) {
                ¿Está seguro de que desea inhabilitar el aula <span class="font-bold text-ui-action">{{ aulaEstado()?.codigo }}</span> ({{ aulaEstado()?.grado }})?
              } @else {
                ¿Desea reactivar el aula <span class="font-bold text-ui-action">{{ aulaEstado()?.codigo }}</span> para nuevas asignaciones?
              }
            </p>
            <div class="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed">
              <span class="font-bold block mb-1">Nota reglamentaria:</span>
              Institucionalmente los registros y aulas nunca se eliminan físicamente de la base de datos; la inhabilitación marca el aula como inactiva preservando todo el historial académico.
            </div>
          </div>
          <footer class="border-t border-ui-divider px-6 py-3 flex justify-end gap-3">
            <button type="button" class="px-4 py-2 rounded-xl bg-ui-surface-soft border border-ui-divider font-semibold text-ui-action cursor-pointer hover:bg-ui-divider transition" (click)="cerrarConfirmarEstado()">Cancelar</button>
            <button
              type="button"
              [disabled]="guardandoEstado()"
              (click)="confirmarCambioEstado()"
              [class]="aulaEstado()?.activa ? 'px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer transition' : 'px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer transition'"
            >
              {{ guardandoEstado() ? 'Procesando…' : (aulaEstado()?.activa ? 'Confirmar Inhabilitación' : 'Reactivar Aula') }}
            </button>
          </footer>
        </div>
      </dialog>

      <!-- Level Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div class="p-6 rounded-2xl !bg-ui-surface border !border-ui-divider shadow-sm">
          <div class="flex items-center justify-between gap-2">
            <span class="text-sm leading-snug font-bold text-ui-muted uppercase tracking-wider">Nivel Inicial</span>
            <span class="px-3 py-1 rounded-lg text-sm !bg-ui-surface-soft !text-ui-text border !border-ui-divider font-semibold whitespace-nowrap">
              {{ contarAulasPorFiltro('INIC') }} Aulas
            </span>
          </div>
          <div class="text-2xl sm:text-3xl font-black !text-ui-text mt-3">{{ contarCapacidadPorFiltro('INIC') ?? '—' }} Capacidad</div>
          <p class="text-sm leading-relaxed !text-ui-muted mt-2 mb-0 font-medium">Aulas de 3, 4 y 5 años · Cupo máx. 30 por sección</p>
        </div>

        <div class="p-6 rounded-2xl !bg-ui-surface border !border-ui-divider shadow-sm">
          <div class="flex items-center justify-between gap-2">
            <span class="text-sm leading-snug font-bold text-ui-muted uppercase tracking-wider">Nivel Primaria</span>
            <span class="px-3 py-1 rounded-lg text-sm !bg-ui-surface-soft !text-ui-text border !border-ui-divider font-semibold whitespace-nowrap">
              {{ contarAulasPorFiltro('PRIM') }} Aulas
            </span>
          </div>
          <div class="text-2xl sm:text-3xl font-black !text-ui-text mt-3">{{ contarCapacidadPorFiltro('PRIM') ?? '—' }} Capacidad</div>
          <p class="text-sm leading-relaxed !text-ui-muted mt-2 mb-0 font-medium">De 1° a 6° de Primaria · Cupo máx. 30 por sección</p>
        </div>

        <div class="p-6 rounded-2xl !bg-ui-surface border !border-ui-divider shadow-sm">
          <div class="flex items-center justify-between gap-2">
            <span class="text-sm leading-snug font-bold text-ui-action uppercase tracking-wider">Nivel Secundaria</span>
            <span class="px-3 py-1 rounded-lg text-sm bg-ui-surface-soft text-ui-text border border-ui-divider font-semibold whitespace-nowrap">
              {{ contarAulasPorFiltro('SEC') }} Aulas
            </span>
          </div>
          <div class="text-2xl sm:text-3xl font-black !text-ui-text mt-3">{{ contarCapacidadPorFiltro('SEC') ?? '—' }} Capacidad</div>
          <p class="text-sm leading-relaxed !text-ui-muted mt-2 mb-0 font-medium">De 1° a 5° de Secundaria · Cupo máx. 30 por sección</p>
        </div>
      </div>

      <!-- Classrooms & Sections Directory -->
      <div class="rounded-2xl !bg-ui-surface border !border-ui-divider overflow-hidden shadow-sm">
        <div class="px-6 py-4 !bg-ui-surface border-b !border-ui-divider flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 class="text-base sm:text-lg font-bold !text-ui-text tracking-[-.025em] m-0">Directorio de Aulas Físicas y Secciones</h3>
            <p class="m-0 mt-1 text-sm text-ui-muted">Control de cupos ocupados, cupo máximo (máx. 30) y vacantes disponibles por aula y sección.</p>
          </div>
          <button
            (click)="cargarDatos()"
            class="px-4 py-2 rounded-xl !bg-ui-surface-soft hover:bg-ui-divider border border-ui-divider !text-ui-action text-sm font-semibold cursor-pointer inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-center align-middle"
          >
            Actualizar BD
          </button>
        </div>

        <!-- Filtros superiores por Año, Nivel, Grado y Sección -->
        <div class="p-4 bg-ui-surface-soft/60 border-b border-ui-divider flex flex-wrap items-center gap-4">
          @if (anios().length > 0) {
            <!-- Filtro Año Lectivo -->
            <div class="flex items-center gap-2 min-w-[165px]">
              <label for="filtro-anio-aulas" class="text-xs font-bold text-ui-muted uppercase tracking-wider">Año:</label>
              <select
                id="filtro-anio-aulas"
                [ngModel]="filtroAnioId()"
                (ngModelChange)="onAnioChange($event)"
                class="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-ui-control-border bg-ui-surface text-ui-text focus:border-ui-focus focus:outline-none"
              >
                @for (a of anios(); track a.id) {
                  <option [ngValue]="a.id">{{ a.anio }}{{ a.abierto ? ' (Activo)' : '' }}</option>
                }
              </select>
            </div>
          }

          <!-- Filtro Nivel -->
          <div class="flex items-center gap-2 min-w-[200px]">
            <label for="filtro-nivel" class="text-xs font-bold text-ui-muted uppercase tracking-wider">Nivel:</label>
            <select
              id="filtro-nivel"
              [ngModel]="filtroNivel()"
              (ngModelChange)="onNivelChange($event)"
              class="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-ui-control-border bg-ui-surface text-ui-text focus:border-ui-focus focus:outline-none"
            >
              <option value="TODOS">Todos los niveles</option>
              <option value="INICIAL">Inicial</option>
              <option value="PRIMARIA">Primaria</option>
              <option value="SECUNDARIA">Secundaria</option>
            </select>
          </div>

          <!-- Filtro Grado (ordenado institucionalmente) -->
          <div class="flex items-center gap-2 min-w-[220px]">
            <label for="filtro-grado" class="text-xs font-bold text-ui-muted uppercase tracking-wider">Grado:</label>
            <select
              id="filtro-grado"
              [ngModel]="filtroGrado()"
              (ngModelChange)="onGradoChange($event)"
              class="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-ui-control-border bg-ui-surface text-ui-text focus:border-ui-focus focus:outline-none"
            >
              <option value="TODOS">Todos los grados</option>
              @for (g of gradosDisponibles(); track g) {
                <option [value]="g">{{ g }}</option>
              }
            </select>
          </div>

          <!-- Filtro Sección (genérico A, B, C; sin D) -->
          <div class="flex items-center gap-2 min-w-[170px]">
            <label for="filtro-seccion" class="text-xs font-bold text-ui-muted uppercase tracking-wider">Sección:</label>
            <select
              id="filtro-seccion"
              [ngModel]="filtroSeccion()"
              (ngModelChange)="onSeccionChange($event)"
              class="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-ui-control-border bg-ui-surface text-ui-text focus:border-ui-focus focus:outline-none"
            >
              <option value="TODAS">Todas las secciones</option>
              <option value="A">Sección A</option>
              <option value="B">Sección B</option>
              <option value="C">Sección C</option>
            </select>
          </div>

        </div>

        <div class="overflow-x-auto">
          <table class="w-full min-w-[780px] text-left text-sm [&_thead]:!bg-ui-surface-soft [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:!bg-ui-surface-soft/75" data-mobile-table-cards="">
            <thead class="bg-ui-surface-soft border-b border-ui-divider text-ui-action uppercase tracking-wider font-bold">
              <tr>
                <th class="px-5 py-3.5">Código de Aula</th>
                <th class="px-5 py-3.5">Grado</th>
                <th class="px-5 py-3.5">Sección</th>
                <th class="px-5 py-3.5 text-center">Cupos Ocupados</th>
                <th class="px-5 py-3.5 text-center">Vacantes Disponibles</th>
                <th class="px-5 py-3.5 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[var(--ui-divider)] !text-ui-action">
              @if (cargando()) {
                <tr>
                  <td colspan="6" class="text-center py-10 !text-ui-muted">
                    <span class="inline-block w-5 h-5 border-2 border-ui-divider border-t-ui-action rounded-full animate-spin mb-2"></span>
                    <p>Consultando infraestructura escolar en la base de datos...</p>
                  </td>
                </tr>
              } @else {
                @for (aula of aulasPaginadas(); track aula.id) {
                  <tr class="bg-ui-surface hover:bg-ui-surface-soft/75 transition-colors">
                    <!-- Columna 1: Código de Aula limpio (sin texto redundante de sección) -->
                    <td class="px-5 py-3.5 font-mono text-ui-action font-bold text-xs" data-label="Código de Aula">
                      {{ aula.codigo }}
                    </td>

                    <!-- Columna 2: Grado -->
                    <td class="px-5 py-3.5 font-bold text-ui-text" data-label="Grado">
                      {{ aula.grado }}
                    </td>

                    <!-- Columna 3: Sección -->
                    <td class="px-5 py-3.5" data-label="Sección">
                      <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                        Sección {{ aula.seccion }}
                      </span>
                    </td>

                    <!-- Columna 4: Cupos Ocupados -->
                    <td class="px-5 py-3.5 text-center font-mono font-bold !text-ui-text" data-label="Cupos Ocupados">
                      {{ aula.cuposOcupados }} ocupados
                    </td>

                    <!-- Columna 5: Vacantes Disponibles -->
                    <td class="px-5 py-3.5 text-center font-mono font-bold" data-label="Vacantes Disponibles">
                      @if (aula.vacantesDisponibles > 0) {
                        <span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {{ aula.vacantesDisponibles }} disponibles
                        </span>
                      } @else {
                        <span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                          Aula completa (0 libres)
                        </span>
                      }
                    </td>

                    <!-- Columna 6: Acciones (3 botones con iconos) -->
                    <td class="px-5 py-3.5 text-center" data-label="Acciones">
                      <div class="inline-flex items-center gap-1.5 justify-center">
                        <!-- Botón 1: Detalles -->
                        <button
                          type="button"
                          (click)="abrirDetalles(aula)"
                          title="Ver detalles del aula"
                          aria-label="Ver detalles del aula"
                          class="w-8 h-8 rounded-lg border border-ui-divider bg-ui-surface hover:bg-ui-surface-soft text-ui-action grid place-items-center cursor-pointer transition shadow-xs"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>

                        <!-- Botón 2: Editar capacidad y datos -->
                        <button
                          type="button"
                          (click)="abrirEditar(aula)"
                          title="Editar capacidad y aula"
                          aria-label="Editar capacidad y aula"
                          class="w-8 h-8 rounded-lg border border-ui-divider bg-ui-surface hover:bg-ui-surface-soft text-blue-600 grid place-items-center cursor-pointer transition shadow-xs"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>

                        <!-- Botón 3: Inhabilitar / Reactivar -->
                        <button
                          type="button"
                          (click)="abrirConfirmarEstado(aula)"
                          [title]="aula.activa ? 'Inhabilitar aula' : 'Reactivar aula'"
                          [attr.aria-label]="aula.activa ? 'Inhabilitar aula' : 'Reactivar aula'"
                          [class]="aula.activa ? 'w-8 h-8 rounded-lg border border-ui-divider bg-ui-surface hover:bg-rose-50 text-rose-600 grid place-items-center cursor-pointer transition shadow-xs' : 'w-8 h-8 rounded-lg border border-ui-divider bg-ui-surface hover:bg-emerald-50 text-emerald-600 grid place-items-center cursor-pointer transition shadow-xs'"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>

        @if (!cargando() && aulasFiltradas().length === 0) {
          <div class="relative grid justify-items-center gap-2 w-full px-5 pt-[62px] pb-9 !text-ui-muted text-center whitespace-normal [overflow-wrap:anywhere]" data-illustration="crest">
            <svg aria-hidden="true" focusable="false" viewBox="0 0 48 48" fill="none" stroke="var(--ui-action)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="absolute top-3 left-1/2 h-[42px] w-[42px] -translate-x-1/2"><path d="M24 5 39 11v11c0 10-6.5 16-15 21C15.5 38 9 32 9 22V11z"/><path d="M15 18c3-1 6-.5 9 1.5v13c-3-2-6-2.5-9-1.5zM33 18c-3-1-6-.5-9 1.5v13c3-2 6-2.5 9-1.5z" stroke="var(--ui-action)"/></svg>
            <p class="m-0 max-w-full font-medium !text-ui-muted">No se encontraron aulas con los filtros seleccionados.</p>
          </div>
        }

        <!-- Paginación de la lista de aulas -->
        <ui-paginacion
          [totalRegistros]="aulasFiltradas().length"
          [paginaActual]="paginaActual()"
          [tamanoPagina]="tamanoPagina()"
          etiqueta="aulas"
          ariaLabel="Paginación de aulas"
          (cambioPagina)="cambiarPagina($event)"
        />
      </div>
    </div>
  `
})
export class AcademicoComponent implements OnInit {
  private readonly academicoService = inject(AcademicoService);
  readonly authStore = inject(AuthStore);
  readonly error = signal<string | null>(null);
  readonly guardando = signal(false);
  codigo = '';
  nombre = '';
  ubicacion = '';
  capacidad = 30;

  // Estados de carga y datos
  readonly cargando = signal(false);
  readonly anios = signal<AnioLectivoResponseDto[]>([]);
  readonly aulas = signal<AulaItem[]>([]);
  readonly niveles = signal<NivelItem[]>([]);
  readonly secciones = signal<SeccionResponseDto[]>([]);
  readonly grados = signal<GradoResponseDto[]>([]);

  // Filtros
  readonly filtroAnioId = signal<number>(0);
  readonly filtroNivel = signal<string>('TODOS');
  readonly filtroGrado = signal<string>('TODOS');
  readonly filtroSeccion = signal<string>('TODAS');

  // Paginación de aulas
  readonly paginaActual = signal<number>(1);
  readonly tamanoPagina = signal<number>(10);

  // Modales
  @ViewChild('aulaDialog') private aulaDialog!: ElementRef<HTMLDialogElement>;
  @ViewChild('detallesDialog') private detallesDialog!: ElementRef<HTMLDialogElement>;
  @ViewChild('editarDialog') private editarDialog!: ElementRef<HTMLDialogElement>;
  @ViewChild('estadoDialog') private estadoDialog!: ElementRef<HTMLDialogElement>;

  readonly aulaDetalle = signal<AulaFila | null>(null);
  readonly aulaEditando = signal<AulaFila | null>(null);
  readonly aulaEstado = signal<AulaFila | null>(null);

  editNombre = '';
  editUbicacion = '';
  editCapacidad = 30;
  readonly guardandoEdicion = signal(false);
  readonly errorEdicion = signal<string | null>(null);
  readonly guardandoEstado = signal(false);

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
          // Cargar grados de cada nivel
          res.forEach(n => {
            this.academicoService.listarGrados(n.id).subscribe({
              next: (gradosRes: GradoResponseDto[]) => {
                if (Array.isArray(gradosRes)) {
                  this.grados.update(prev => {
                    const ids = new Set(prev.map(g => g.id));
                    const nuevos = gradosRes.filter(g => !ids.has(g.id));
                    return [...prev, ...nuevos];
                  });
                }
              },
              error: () => {}
            });
          });
        } else {
          this.niveles.set([]);
        }
      },
      error: () => {
        this.niveles.set([]);
        this.error.set('No se pudieron cargar los niveles académicos.');
      }
    });

    this.academicoService.listarAnios?.().subscribe({
      next: anios => {
        const lista = Array.isArray(anios) ? anios : [];
        this.anios.set(lista);
        const anioActual = new Date().getFullYear();
        const seleccionado =
          lista.find(a => a.id === this.filtroAnioId())
          ?? lista.find(a => a.abierto && a.anio === anioActual)
          ?? lista.find(a => a.abierto)
          ?? lista[0];
        if (seleccionado?.id) {
          this.filtroAnioId.set(seleccionado.id);
          this.cargarSeccionesPorAnio(seleccionado.id);
        } else {
          this.secciones.set([]);
        }
      },
      error: () => {}
    });
  }

  private cargarSeccionesPorAnio(anioId: number): void {
    this.academicoService.listarSecciones?.(anioId).subscribe({
      next: (res: SeccionResponseDto[]) => {
        if (Array.isArray(res)) this.secciones.set(res);
      },
      error: () => {}
    });
  }

  onAnioChange(anioId: number): void {
    const id = Number(anioId);
    this.filtroAnioId.set(id);
    this.paginaActual.set(1);
    if (id) {
      this.cargarSeccionesPorAnio(id);
    }
  }

  seccionPorAula(aula: AulaItem): SeccionResponseDto | undefined {
    return this.secciones().find(s => s.aulaFisica === aula.codigo || s.aulaFisica === aula.nombre);
  }

  cuposOcupadosAula(aula: AulaItem): number {
    const sec = this.seccionPorAula(aula);
    return sec?.vacantesOcupadas ?? 0;
  }

  cupoMaximoAula(aula: AulaItem): number | null {
    const sec = this.seccionPorAula(aula);
    if (sec?.cupoMaximo != null) return Math.min(sec.cupoMaximo, 30);
    if (aula.capacidad == null) return null;
    return Math.min(aula.capacidad, 30);
  }

  vacantesDisponiblesAula(aula: AulaItem): number | null {
    const max = this.cupoMaximoAula(aula);
    if (max == null) return null;
    return Math.max(0, max - this.cuposOcupadosAula(aula));
  }

  resolverGradoYSeccion(aula: AulaItem): { grado: string; seccion: string; nivel: string } {
    let grado = '';
    let seccion = '';
    let nivel = '';

    // 1. Extraer desde aula.nombre si sigue el formato estándar "Aula - Inicial 5 años - Sección A"
    const matchNombre = aula.nombre?.match(/Aula\s*-\s*(.+?)\s*-\s*Secci[oó]n\s*([A-Z])/i);
    if (matchNombre) {
      grado = matchNombre[1].trim();
      seccion = matchNombre[2].trim().toUpperCase();
    }

    // 2. Corroborar con la sección vinculada en BD
    const sec = this.seccionPorAula(aula);
    if (sec) {
      if (!seccion && sec.letra) seccion = sec.letra.trim().toUpperCase();
      if (!grado && sec.gradoId) {
        const g = this.grados().find(gr => gr.id === sec.gradoId);
        if (g) grado = g.nombre;
      }
      if (sec.nivelId === 1) nivel = 'INICIAL';
      else if (sec.nivelId === 2) nivel = 'PRIMARIA';
      else if (sec.nivelId === 3) nivel = 'SECUNDARIA';
    }

    // 3. Fallback con prefijo de código (INI-3-A, PRI-6-B, SEC-5-C)
    if (!seccion && aula.codigo) {
      const partes = aula.codigo.split('-');
      if (partes.length >= 3) {
        seccion = partes[2].trim().toUpperCase();
      }
    }

    if (!grado && aula.codigo) {
      const c = aula.codigo.toUpperCase();
      if (c.startsWith('INI-3')) grado = 'Inicial 5 años';
      else if (c.startsWith('INI-2')) grado = 'Inicial 4 años';
      else if (c.startsWith('INI-1')) grado = 'Inicial 3 años';
      else if (c.startsWith('PRI-1')) grado = '1° de Primaria';
      else if (c.startsWith('PRI-2')) grado = '2° de Primaria';
      else if (c.startsWith('PRI-3')) grado = '3° de Primaria';
      else if (c.startsWith('PRI-4')) grado = '4° de Primaria';
      else if (c.startsWith('PRI-5')) grado = '5° de Primaria';
      else if (c.startsWith('PRI-6')) grado = '6° de Primaria';
      else if (c.startsWith('SEC-1')) grado = '1° de Secundaria';
      else if (c.startsWith('SEC-2')) grado = '2° de Secundaria';
      else if (c.startsWith('SEC-3')) grado = '3° de Secundaria';
      else if (c.startsWith('SEC-4')) grado = '4° de Secundaria';
      else if (c.startsWith('SEC-5')) grado = '5° de Secundaria';
    }

    if (!nivel) {
      const gLower = (grado || '').toLowerCase();
      const cUpper = (aula.codigo || '').toUpperCase();
      if (gLower.includes('inicial') || cUpper.startsWith('INI') || cUpper.startsWith('AULA_I')) nivel = 'INICIAL';
      else if (gLower.includes('primaria') || cUpper.startsWith('PRI') || cUpper.startsWith('AULA_P')) nivel = 'PRIMARIA';
      else if (gLower.includes('secundaria') || cUpper.startsWith('SEC') || cUpper.startsWith('AULA_S')) nivel = 'SECUNDARIA';
    }

    return {
      grado: grado || 'Sin grado asignado',
      seccion: seccion || '—',
      nivel: nivel || 'GENERAL'
    };
  }

  readonly todasAulasFilas = computed<AulaFila[]>(() => {
    return this.aulas().map(aula => {
      const { grado, seccion, nivel } = this.resolverGradoYSeccion(aula);
      const cuposOcupados = this.cuposOcupadosAula(aula);
      const cupoMaximo = this.cupoMaximoAula(aula) ?? (aula.capacidad ? Math.min(aula.capacidad, 30) : 30);
      const vacantesDisponibles = Math.max(0, cupoMaximo - cuposOcupados);
      return {
        id: aula.id,
        codigo: aula.codigo,
        nombre: aula.nombre,
        ubicacion: aula.ubicacion,
        capacidad: aula.capacidad,
        activa: aula.activa,
        grado,
        seccion,
        nivel,
        cuposOcupados,
        cupoMaximo,
        vacantesDisponibles
      };
    });
  });

  readonly aulasFiltradas = computed<AulaFila[]>(() => {
    const nivel = this.filtroNivel();
    const grado = this.filtroGrado();
    const seccion = this.filtroSeccion();

    return this.todasAulasFilas().filter(fila => {
      // Omitir sección D si no está contemplada en filtros del sistema
      if (fila.seccion === 'D' && seccion !== 'D') return false;
      if (nivel !== 'TODOS' && fila.nivel !== nivel) return false;
      if (grado !== 'TODOS' && fila.grado !== grado) return false;
      if (seccion !== 'TODAS' && fila.seccion !== seccion) return false;
      return true;
    });
  });

  readonly gradosDisponibles = computed<string[]>(() => {
    const nivel = this.filtroNivel();
    if (nivel === 'INICIAL') {
      return ORDEN_GRADOS_INSTITUCIONAL.filter(g => g.includes('Inicial'));
    } else if (nivel === 'PRIMARIA') {
      return ORDEN_GRADOS_INSTITUCIONAL.filter(g => g.includes('Primaria'));
    } else if (nivel === 'SECUNDARIA') {
      return ORDEN_GRADOS_INSTITUCIONAL.filter(g => g.includes('Secundaria'));
    }
    return ORDEN_GRADOS_INSTITUCIONAL;
  });

  readonly totalPaginas = computed(() => {
    return Math.ceil(this.aulasFiltradas().length / this.tamanoPagina()) || 1;
  });

  readonly aulasPaginadas = computed<AulaFila[]>(() =>
    paginarRegistros(this.aulasFiltradas(), this.paginaActual(), this.tamanoPagina())
  );

  onNivelChange(nivel: string): void {
    this.filtroNivel.set(nivel);
    // Si el grado seleccionado ya no corresponde al nivel, restablecer a TODOS
    const disponibles = this.gradosDisponibles();
    if (this.filtroGrado() !== 'TODOS' && !disponibles.includes(this.filtroGrado())) {
      this.filtroGrado.set('TODOS');
    }
    this.paginaActual.set(1);
  }

  onGradoChange(grado: string): void {
    this.filtroGrado.set(grado);
    this.paginaActual.set(1);
  }

  onSeccionChange(seccion: string): void {
    this.filtroSeccion.set(seccion);
    this.paginaActual.set(1);
  }

  cambiarPagina(nuevaPagina: number): void {
    if (nuevaPagina >= 1 && nuevaPagina <= this.totalPaginas()) {
      this.paginaActual.set(nuevaPagina);
    }
  }

  contarAulasPorFiltro(codigoPrefix: string): number {
    const prefix = AULA_CODE_PREFIXES[codigoPrefix] ?? codigoPrefix;
    return this.todasAulasFilas().filter(a => a.codigo && a.codigo.toUpperCase().startsWith(prefix)).length;
  }

  contarCapacidadPorFiltro(codigoPrefix: string): number | null {
    const prefix = AULA_CODE_PREFIXES[codigoPrefix] ?? codigoPrefix;
    const aulas = this.todasAulasFilas().filter(a => a.codigo && a.codigo.toUpperCase().startsWith(prefix));
    if (aulas.length === 0) return 0;
    return aulas.reduce((sum, a) => sum + (a.cupoMaximo ?? 30), 0);
  }

  // Acciones de Modales
  abrirDetalles(aula: AulaFila): void {
    this.aulaDetalle.set(aula);
    this.detallesDialog.nativeElement.showModal();
  }

  cerrarDetalles(): void {
    this.detallesDialog.nativeElement.close();
    this.aulaDetalle.set(null);
  }

  abrirEditar(aula: AulaFila): void {
    this.errorEdicion.set(null);
    this.aulaEditando.set(aula);
    this.editNombre = aula.nombre;
    this.editUbicacion = aula.ubicacion || '';
    this.editCapacidad = aula.capacidad ?? 30;
    this.editarDialog.nativeElement.showModal();
  }

  cerrarEditar(): void {
    this.editarDialog.nativeElement.close();
    this.aulaEditando.set(null);
    this.errorEdicion.set(null);
  }

  guardarEdicion(): void {
    const aula = this.aulaEditando();
    if (!aula) return;

    if (!this.editNombre.trim()) {
      this.errorEdicion.set('El nombre del aula es obligatorio.');
      return;
    }
    if (!Number.isInteger(this.editCapacidad) || this.editCapacidad < 1 || this.editCapacidad > 30) {
      this.errorEdicion.set('La capacidad del aula debe estar entre 1 y 30 estudiantes.');
      return;
    }

    this.guardandoEdicion.set(true);
    this.errorEdicion.set(null);

    this.academicoService.actualizarAula(aula.id, {
      nombre: this.editNombre.trim(),
      ubicacion: this.editUbicacion.trim(),
      capacidad: this.editCapacidad
    }).subscribe({
      next: () => {
        this.guardandoEdicion.set(false);
        this.cerrarEditar();
        this.cargarDatos();
      },
      error: err => {
        this.guardandoEdicion.set(false);
        this.errorEdicion.set(err?.error?.message ?? 'No se pudo actualizar el aula.');
      }
    });
  }

  abrirConfirmarEstado(aula: AulaFila): void {
    this.aulaEstado.set(aula);
    this.estadoDialog.nativeElement.showModal();
  }

  cerrarConfirmarEstado(): void {
    this.estadoDialog.nativeElement.close();
    this.aulaEstado.set(null);
  }

  confirmarCambioEstado(): void {
    const aula = this.aulaEstado();
    if (!aula) return;

    this.guardandoEstado.set(true);
    const nuevoEstado = !(aula.activa === true);

    this.academicoService.cambiarEstadoAula(aula.id, nuevoEstado).subscribe({
      next: () => {
        this.guardandoEstado.set(false);
        this.cerrarConfirmarEstado();
        this.cargarDatos();
      },
      error: () => {
        this.guardandoEstado.set(false);
        this.cerrarConfirmarEstado();
      }
    });
  }

  abrirModalNuevaAula(): void {
    if (!this.authStore.hasRole('DIRECCION') && !this.authStore.hasRole('ADMINISTRADOR')) return;
    this.error.set(null);
    this.codigo = '';
    this.nombre = '';
    this.ubicacion = '';
    this.capacidad = 30;
    this.aulaDialog.nativeElement.showModal();
  }

  cerrarDialogoAula(): void {
    this.aulaDialog.nativeElement.close();
  }

  crearAula(): void {
    if (!this.authStore.hasRole('DIRECCION') && !this.authStore.hasRole('ADMINISTRADOR')) return;
    if (!this.codigo.trim() || !this.nombre.trim()) { this.error.set('Completa el código y el nombre del aula.'); return; }
    if (!Number.isInteger(this.capacidad) || this.capacidad < 1 || this.capacidad > 30) {
      this.error.set('La capacidad del aula debe estar entre 1 y 30 estudiantes.');
      return;
    }
    this.guardando.set(true); this.error.set(null);
    this.academicoService.crearAula({ codigo: this.codigo.trim(), nombre: this.nombre.trim(), ubicacion: this.ubicacion.trim(), capacidad: this.capacidad }).subscribe({
      next: () => { this.guardando.set(false); this.cerrarDialogoAula(); this.error.set(null); this.cargarDatos(); },
      error: err => { this.guardando.set(false); this.error.set(err?.error?.message ?? 'No se pudo crear el aula.'); }
    });
  }
}
