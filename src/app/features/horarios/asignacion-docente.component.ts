import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin, Subscription, timeout } from 'rxjs';
import { AnioLectivoResponseDto, DocenteOpcionDto, GradoResponseDto, NivelResponseDto, SeccionResponseDto } from '../../core/models/academico.model';
import { AcademicoService } from '../../core/services/academico.service';
import { AsignacionHorarioOpcionDto, BloqueHorarioDto, DiaHorario, HorarioSeccionDto, HorarioService } from '../../core/services/horario.service';
import { AuthStore } from '../../core/state/auth.store';
import { obtenerFotoUsuario } from '../../core/utils/avatar.util';
import { UiPaginacionComponent, paginarRegistros } from '../../shared/ui/ui-paginacion.component';

@Component({
  selector: 'app-asignacion-docente',
  standalone: true,
  imports: [FormsModule, RouterLink, UiPaginacionComponent],
  template: `
    <section class="grid min-w-0 gap-5" aria-labelledby="carga-docente-title">
      <header>
        <h2 id="carga-docente-title" class="m-0 text-xl font-bold text-slate-900">{{ esDireccion() ? 'Asignar docentes por sección' : 'Mis cursos y horarios' }}</h2>
        <p class="mt-1 text-sm text-slate-600">Cada asignación vincula un docente, un curso (área/especialidad), un nivel, grado, sección y su aula. Dirección puede revisar el resumen antes de guardar y programar los bloques semanales.</p>
      </header>

      @if (mensaje()) { <p role="status" aria-live="polite" class="m-0 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">{{ mensaje() }}</p> }

      @if (esDireccion()) {
        <section class="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" aria-label="Seleccionar sección y filtrar docentes">
          <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div class="grid gap-1">
              <label for="asig-anio" class="text-sm font-semibold text-slate-700">Año lectivo</label>
              <select id="asig-anio" class="min-h-11 rounded-xl border border-slate-200 bg-white px-3" [ngModel]="anioId()" (ngModelChange)="cambiarAnio($event)">
                @for (anio of anios(); track anio.id) { <option [ngValue]="anio.id">{{ anio.anio }}{{ anio.abierto ? ' · En curso' : '' }}</option> }
              </select>
            </div>
            <div class="grid gap-1">
              <label for="asig-nivel" class="text-sm font-semibold text-slate-700">Nivel educativo</label>
              <select id="asig-nivel" class="min-h-11 rounded-xl border border-slate-200 bg-white px-3" [ngModel]="nivelId()" (ngModelChange)="cambiarNivel($event)">
                @for (nivel of niveles(); track nivel.id) { <option [ngValue]="nivel.id">{{ nivel.nombre }}</option> }
              </select>
            </div>
            <div class="grid gap-1">
              <label for="asig-grado" class="text-sm font-semibold text-slate-700">Grado</label>
              <select id="asig-grado" class="min-h-11 rounded-xl border border-slate-200 bg-white px-3" [ngModel]="gradoId()" (ngModelChange)="cambiarGrado($event)">
                @for (grado of grados(); track grado.id) { <option [ngValue]="grado.id">{{ grado.nombre }}</option> }
              </select>
            </div>
            <div class="grid gap-1">
              <label for="asig-seccion" class="text-sm font-semibold text-slate-700">Sección</label>
              <select id="asig-seccion" class="min-h-11 rounded-xl border border-slate-200 bg-white px-3" [ngModel]="seccionId()" (ngModelChange)="cambiarSeccion($event)">
                @for (seccion of seccionesDelGrado(); track seccion.id) { <option [ngValue]="seccion.id">Sección {{ seccion.letra }}</option> }
              </select>
            </div>
          </div>

          <div class="grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-[minmax(190px,1fr)_minmax(190px,1fr)_auto] sm:items-end">
            <div class="grid gap-1">
              <label for="asig-curso" class="text-sm font-semibold text-slate-700">Área / Especialidad (Curso)</label>
              <select id="asig-curso" class="min-h-11 rounded-xl border border-slate-200 bg-white px-3" [ngModel]="areaId" (ngModelChange)="cambiarCurso($event)">
                <option [ngValue]="0">Selecciona un curso / área</option>
                @for (area of areas(); track area.id) { <option [ngValue]="area.id">{{ area.nombre }}</option> }
              </select>
            </div>
            <div class="grid min-w-0 gap-1 text-sm font-semibold text-slate-700">
              <span id="docente-campo">Docente (filtrado por especialidad y nivel)</span>
              <button #selectorDocente type="button" aria-labelledby="docente-campo docente-valor"
                [attr.aria-expanded]="selectorDocenteAbierto()" aria-controls="docente-opciones" [disabled]="!areaId"
                class="flex min-h-11 min-w-0 items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 text-left focus-visible:outline-2 focus-visible:outline-blue-700 disabled:opacity-60"
                (click)="selectorDocenteAbierto.set(!selectorDocenteAbierto())">
                <span id="docente-valor" class="truncate">{{ docenteSeleccionado()?.nombreCompleto || docenteSeleccionado()?.username || (areaId ? 'Buscar y elegir docente' : 'Elige un curso primero') }}</span>
                <svg class="size-4 shrink-0" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m5 8 5 5 5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </button>
            </div>
            <button type="button" class="min-h-11 rounded-xl bg-blue-700 px-5 font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50" [disabled]="guardando() || cargando() || !anioId() || !nivelId() || !gradoId() || !seccionId() || !docenteSeleccionado() || !areaId || cursoYaAsignado()" (click)="asignarDocente()">{{ cursoYaAsignado() ? 'Curso ya asignado' : 'Asignar docente' }}</button>
          </div>

          @if (selectorDocenteAbierto()) {
            <div id="docente-opciones" class="grid min-w-0 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3"
              (keydown.escape)="selectorDocenteAbierto.set(false); selectorDocente.focus()">
              <div class="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                <span>Filtro activo: <strong>{{ nivelNombreActual() }}</strong> · Especialidad: <strong>{{ areaNombreActual() }}</strong></span>
              </div>
              <div class="grid gap-1">
                <label for="asig-buscar-docente" class="text-sm font-semibold text-slate-700">Buscar docente</label>
                <input id="asig-buscar-docente" type="search" class="min-h-11 min-w-0 rounded-lg border border-slate-300 bg-white px-3 font-normal focus-visible:outline-2 focus-visible:outline-blue-700"
                  placeholder="Nombre, apellido o usuario" [ngModel]="busquedaDocente()" (ngModelChange)="busquedaDocente.set($event)" />
              </div>
              @if (cargandoDocentes()) {
                <p class="m-0 text-sm text-slate-600" role="status">Cargando docentes…</p>
              } @else if (errorDocentes()) {
                <div class="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-700" role="status">
                  <span>No se pudo cargar la lista de docentes.</span>
                  <button type="button" class="min-h-11 rounded-lg border border-slate-300 bg-white px-3 font-semibold" (click)="cargarDocentes()">Reintentar</button>
                </div>
              } @else {
                <p class="m-0 text-sm text-slate-600" role="status">
                  @if (docentesFiltrados().length) { {{ docentesFiltrados().length }} de {{ docentes().length }} docentes habilitados en el área }
                  @else if (docentes().length) { Ningún docente coincide con la búsqueda. }
                  @else { No hay docentes activos con especialidad aprobada para este curso. }
                </p>
                @if (docentesFiltrados().length) {
                  <fieldset class="m-0 grid max-h-60 min-w-0 gap-1 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1">
                    <legend class="sr-only">Selecciona un docente</legend>
                    @for (docente of docentesFiltrados(); track docente.id) {
                      <label class="flex min-h-12 cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 hover:bg-slate-50 focus-within:outline-2 focus-within:outline-blue-700"
                        [class.bg-blue-50]="docenteId() === docente.id">
                        <input type="radio" name="docente-asignacion" class="size-4 shrink-0 accent-blue-700"
                          [checked]="docenteId() === docente.id" (change)="docenteId.set(docente.id)" />
                        <span class="relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-slate-100 text-sm font-semibold text-slate-700" aria-hidden="true">
                          {{ (docente.nombreCompleto || docente.username).slice(0, 1).toUpperCase() }}
                          <img class="absolute inset-0 size-full object-cover" [src]="fotoDocente(docente)" alt="" loading="lazy"
                            width="36" height="36" (error)="$any($event.target).hidden = true" />
                        </span>
                        <span class="min-w-0">
                          <span class="block truncate text-sm font-semibold text-slate-900">{{ docente.nombreCompleto || docente.username }}</span>
                          <span class="block truncate text-xs text-slate-600">{{ docente.username }} · {{ areaNombreActual() }}</span>
                        </span>
                      </label>
                    }
                  </fieldset>
                }
              }
            </div>
          }

          <!-- Resumen de revisión de la asignación antes de guardar -->
          @if (areaId && docenteSeleccionado(); as docSel) {
            <div class="rounded-xl border border-blue-200 bg-blue-50/70 p-4 space-y-2" aria-label="Resumen de revisión de la asignación">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <span class="text-[11px] font-extrabold uppercase tracking-wider text-blue-800">Resumen de revisión antes de guardar</span>
                <span class="rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-blue-900 border border-blue-200">
                  {{ cursoYaAsignado() ? 'Curso ya cubierto en la sección' : 'Listo para asignar' }}
                </span>
              </div>
              <dl class="grid grid-cols-1 sm:grid-cols-4 gap-2.5 m-0 text-xs">
                <div class="rounded-lg bg-white p-2.5 border border-blue-100">
                  <dt class="text-[10px] font-bold uppercase text-slate-500">Nivel y Grado</dt>
                  <dd class="m-0 mt-0.5 font-bold text-slate-900">{{ nivelNombreActual() }} · {{ gradoNombreActual() }}</dd>
                </div>
                <div class="rounded-lg bg-white p-2.5 border border-blue-100">
                  <dt class="text-[10px] font-bold uppercase text-slate-500">Sección destino</dt>
                  <dd class="m-0 mt-0.5 font-bold text-slate-900">Sección {{ seccionLetraActual() }}</dd>
                </div>
                <div class="rounded-lg bg-white p-2.5 border border-blue-100">
                  <dt class="text-[10px] font-bold uppercase text-slate-500">Área / Especialidad</dt>
                  <dd class="m-0 mt-0.5 font-bold text-slate-900">{{ areaNombreActual() }}</dd>
                </div>
                <div class="rounded-lg bg-white p-2.5 border border-blue-100">
                  <dt class="text-[10px] font-bold uppercase text-slate-500">Docente seleccionado</dt>
                  <dd class="m-0 mt-0.5 font-bold text-slate-900">{{ docSel.nombreCompleto || docSel.username }}</dd>
                </div>
              </dl>
            </div>
          }

          @if (cursoYaAsignado()) { <p class="m-0 text-sm text-amber-800">Este curso ya tiene docente en la sección. Selecciona otra materia para evitar una asignación duplicada.</p> }
        </section>

        <section class="grid gap-3" aria-label="Cursos asignados a la sección">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h3 class="m-0 text-base font-bold text-slate-900">Asignaciones de la sección · Año {{ anioNumeroActual() }}</h3>
            <span class="text-sm text-slate-500">{{ asignacionesEnSeccion().length }} cursos</span>
          </div>
          @if (!asignacionesEnSeccion().length && !cargando()) {
            <p class="m-0 rounded-xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-600">
              Todavía no hay docentes asignados a esta sección para el año <strong>{{ anioNumeroActual() }}</strong>. Las asignaciones de cursos son independientes por cada año lectivo.
            </p>
          }
          <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            @for (asignacion of asignacionesEnSeccion(); track asignacion.asignacionId) {
              <div class="rounded-xl border p-4 transition flex flex-col justify-between gap-3"
                [class.border-blue-500]="asignacionSeleccionada() === asignacion.asignacionId"
                [class.bg-blue-50]="asignacionSeleccionada() === asignacion.asignacionId"
                [class.border-slate-200]="asignacionSeleccionada() !== asignacion.asignacionId"
                [class.bg-white]="asignacionSeleccionada() !== asignacion.asignacionId">
                <button type="button" class="w-full text-left cursor-pointer" (click)="seleccionarAsignacion(asignacion.asignacionId)">
                  <div class="flex items-center justify-between gap-2">
                    <span class="block font-bold text-slate-900">{{ asignacion.areaNombre }}</span>
                    <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">{{ asignacion.anio }}</span>
                  </div>
                  <span class="mt-1 block text-sm text-slate-700">{{ asignacion.docenteNombre }}</span>
                  <span class="mt-1.5 block text-xs text-slate-500">Sección {{ asignacion.letra }} · Aula {{ asignacion.aulaCodigo }}</span>
                </button>
                <div class="flex items-center justify-between gap-2 border-t border-slate-100 pt-2">
                  <button type="button" class="!min-h-8 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer" (click)="seleccionarAsignacion(asignacion.asignacionId)">Ver horario</button>
                  <button type="button" class="!min-h-8 rounded-lg border border-blue-200 bg-white px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50 cursor-pointer" (click)="abrirReasignacion(asignacion, $event)">Cambiar docente</button>
                </div>
              </div>
            }
          </div>

          @if (asignacionEditando(); as editAsig) {
            <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-[2px] p-4"
              (click)="cancelarReasignacion()" (keydown.escape)="cancelarReasignacion()">
              <div role="dialog" aria-modal="true" aria-labelledby="modal-reasignar-titulo"
                class="w-full max-w-lg max-h-[85vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden"
                (click)="$event.stopPropagation()">
                <div class="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-start justify-between gap-3 shrink-0">
                  <div class="min-w-0">
                    <h4 id="modal-reasignar-titulo" class="m-0 text-base font-bold text-slate-900">Cambiar docente de {{ editAsig.areaNombre }}</h4>
                    <p class="m-0 mt-1 text-xs text-slate-600">
                      Año {{ editAsig.anio }} · {{ editAsig.nivel }} · {{ editAsig.grado }} {{ editAsig.letra }} · Actual: <strong>{{ editAsig.docenteNombre }}</strong>
                    </p>
                  </div>
                  <button type="button" class="!min-h-8 h-8 w-8 rounded-full hover:bg-slate-200/70 text-slate-500 flex items-center justify-center cursor-pointer shrink-0" aria-label="Cerrar modal" (click)="cancelarReasignacion()">✕</button>
                </div>

                <div class="p-5 overflow-y-auto flex-1 space-y-3">
                  @if (errorReasignacion()) {
                    <p role="alert" class="m-0 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">{{ errorReasignacion() }}</p>
                  }

                  <div class="grid gap-1">
                    <label for="reasig-buscar-docente" class="text-xs font-semibold text-slate-700">Buscar nuevo docente habilitado en {{ editAsig.areaNombre }}</label>
                    <input id="reasig-buscar-docente" type="search" class="min-h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:border-blue-600"
                      placeholder="Nombre, apellido o usuario" [ngModel]="busquedaReasignacion()" (ngModelChange)="busquedaReasignacion.set($event)" />
                  </div>

                  @if (cargandoReasignacion()) {
                    <p class="m-0 py-6 text-center text-xs text-slate-600">Cargando docentes habilitados…</p>
                  } @else {
                    <fieldset class="m-0 grid max-h-60 gap-1 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/50 p-1.5">
                      <legend class="sr-only">Selecciona el nuevo docente</legend>
                      @for (docente of docentesReasignacionFiltrados(); track docente.id) {
                        <label class="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg bg-white px-3 py-2 border border-transparent hover:border-slate-200"
                          [class.!bg-blue-50]="nuevoDocenteId() === docente.id"
                          [class.!border-blue-200]="nuevoDocenteId() === docente.id">
                          <input type="radio" name="docente-reasignacion" class="size-4 shrink-0 accent-blue-700"
                            [checked]="nuevoDocenteId() === docente.id" (change)="nuevoDocenteId.set(docente.id)" />
                          <span class="relative grid size-8 shrink-0 place-items-center overflow-hidden rounded-full bg-slate-100 text-xs font-semibold text-slate-700" aria-hidden="true">
                            {{ (docente.nombreCompleto || docente.username).slice(0, 1).toUpperCase() }}
                            <img class="absolute inset-0 size-full object-cover" [src]="fotoDocente(docente)" alt="" loading="lazy"
                              width="32" height="32" (error)="$any($event.target).hidden = true" />
                          </span>
                          <span class="min-w-0 flex-1">
                            <span class="block truncate text-xs font-semibold text-slate-900">
                              {{ docente.nombreCompleto || docente.username }}
                              @if (docente.id === editAsig.docenteUsuarioId) { <span class="text-blue-700">(Actual)</span> }
                            </span>
                            <span class="block truncate text-[11px] text-slate-500">{{ docente.username }}</span>
                          </span>
                        </label>
                      } @empty {
                        <p class="m-0 p-4 text-center text-xs text-slate-500">No hay otros docentes habilitados para esta área.</p>
                      }
                    </fieldset>
                  }
                </div>

                <div class="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex flex-wrap justify-end gap-2 shrink-0">
                  <button type="button" class="min-h-10 rounded-xl border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer" [disabled]="guardandoReasignacion()" (click)="cancelarReasignacion()">Cancelar</button>
                  <button type="button" class="min-h-10 rounded-xl bg-blue-700 px-4 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-50 cursor-pointer"
                    [disabled]="guardandoReasignacion() || !nuevoDocenteId() || nuevoDocenteId() === editAsig.docenteUsuarioId"
                    (click)="confirmarReasignacion()">
                    {{ guardandoReasignacion() ? 'Guardando…' : 'Guardar cambio de docente' }}
                  </button>
                </div>
              </div>
            </div>
          }
        </section>
      } @else {
        <div class="grid gap-3 sm:grid-cols-[200px_1fr] max-w-3xl">
          <div class="grid gap-1">
            <label for="asig-anio-docente" class="text-sm font-semibold text-slate-700">Año lectivo</label>
            <select id="asig-anio-docente" class="min-h-11 rounded-xl border border-slate-200 bg-white px-3" [ngModel]="anioDocenteFiltro()" (ngModelChange)="cambiarAnioDocente($event)" [disabled]="!aniosCatalogoDocente().length">
              @for (anio of aniosCatalogoDocente(); track anio) { <option [ngValue]="anio">Año {{ anio }}</option> }
            </select>
          </div>
          <div class="grid gap-1">
            <label for="asig-catalogo-docente" class="text-sm font-semibold text-slate-700">Curso, sección y aula</label>
            <select id="asig-catalogo-docente" class="min-h-11 rounded-xl border border-slate-200 bg-white px-3" [ngModel]="asignacionSeleccionada()" (ngModelChange)="seleccionarAsignacion($event)" [disabled]="!catalogoDocenteFiltrado().length">
              @for (asignacion of catalogoDocenteFiltrado(); track asignacion.asignacionId) { <option [ngValue]="asignacion.asignacionId">{{ asignacion.anio }} · {{ asignacion.nivel }} · {{ asignacion.grado }} {{ asignacion.letra }} · {{ asignacion.areaNombre }} · Aula {{ asignacion.aulaCodigo }}</option> }
            </select>
          </div>
        </div>
        @if (!catalogoDocenteFiltrado().length && !cargando()) { <p class="m-0 rounded-xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-600">Aún no tienes cursos asignados en este año lectivo. Dirección puede asignarte desde esta sección.</p> }
      }

      @if (asignacionActual(); as seleccion) {
        <section class="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" aria-labelledby="horario-seccion-title">
          <header class="flex flex-wrap items-start justify-between gap-3">
            <div><h3 id="horario-seccion-title" class="m-0 text-base font-bold text-slate-900">Horario del curso</h3><p class="mt-1 text-sm text-slate-600">{{ seleccion.anio }} · {{ seleccion.nivel }} · {{ seleccion.grado }} {{ seleccion.letra }} · {{ seleccion.areaNombre }} · Aula {{ seleccion.aulaCodigo }} · {{ seleccion.docenteNombre }}</p></div>
            <a routerLink="/admin/calificaciones" [queryParams]="{ asignacion: seleccion.asignacionId }"
              class="rounded-lg border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-800">Ver alumnos de esta asignación</a>
            @if (esDireccion()) { <span class="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">Gestión de Dirección</span> }
          </header>
          @if (esDireccion()) {
            <div class="grid gap-3 border-y border-slate-100 py-4 sm:grid-cols-[minmax(170px,1fr)_minmax(200px,1fr)_auto] sm:items-end">
              <div class="grid gap-1">
                <label for="asig-dia-bloque" class="text-sm font-semibold text-slate-700">Día</label>
                <select id="asig-dia-bloque" class="min-h-11 rounded-xl border border-slate-200 bg-white px-3" [(ngModel)]="diaSeleccionado">
                  @for (dia of dias; track dia.codigo) { <option [ngValue]="dia.codigo">{{ dia.nombre }}</option> }
                </select>
              </div>
              <div class="grid gap-1">
                <label for="asig-bloque-horario" class="text-sm font-semibold text-slate-700">Bloque horario</label>
                <select id="asig-bloque-horario" class="min-h-11 rounded-xl border border-slate-200 bg-white px-3" [(ngModel)]="bloqueSeleccionado">
                  <option [ngValue]="0">Selecciona un bloque</option>
                  @for (bloque of bloquesDisponibles(); track bloque.id) { <option [ngValue]="bloque.id">Bloque {{ bloque.numeroBloque }} · {{ bloque.horaInicio.slice(0,5) }}–{{ bloque.horaFin.slice(0,5) }}</option> }
                </select>
              </div>
              <button type="button" class="min-h-11 rounded-xl bg-emerald-700 px-5 font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50" [disabled]="guardando() || cargando() || !bloqueSeleccionado" (click)="programarBloque()">Agregar bloque</button>
            </div>
            @if (!bloquesDisponibles().length) { <p class="m-0 text-sm text-amber-800">No hay bloques de clase configurados para el año lectivo.</p> }
          }
          <div class="overflow-x-auto">
            <table class="w-full min-w-[500px] border-collapse text-left text-sm [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-ui-surface-soft/75">
              <thead class="bg-ui-surface-soft border-b border-ui-divider text-xs uppercase tracking-wide text-ui-action font-bold"><tr><th class="p-3">Día</th><th class="p-3">Horario</th>@if (esDireccion()) { <th class="p-3">Acción</th> }</tr></thead>
              <tbody class="divide-y divide-ui-divider bg-ui-surface">
                @for (horario of horariosAsignacionPaginados(); track horario.id) {
                  <tr class="bg-ui-surface"><td class="p-3 font-semibold text-ui-text">{{ nombreDia(horario.diaSemana) }}</td><td class="p-3 text-ui-muted">{{ rangoBloque(horario.bloqueHorarioId) }}</td>
                    @if (esDireccion()) { <td class="p-3"><button type="button" class="min-h-9 rounded-lg border border-red-200 px-3 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50" [disabled]="guardando()" (click)="retirarBloque(horario)">Retirar</button></td> }
                  </tr>
                } @empty { <tr><td [attr.colspan]="esDireccion() ? 3 : 2" class="p-6 text-center text-slate-500">No hay bloques horarios para este curso.</td></tr> }
              </tbody>
            </table>
          </div>
          <ui-paginacion
            [totalRegistros]="horariosAsignacion().length"
            [paginaActual]="paginaHorarios()"
            [tamanoPagina]="10"
            etiqueta="bloques"
            ariaLabel="Paginación de bloques horarios"
            (cambioPagina)="paginaHorarios.set($event)"
          />
        </section>
      }
      @if (cargando()) { <p role="status" class="m-0 text-sm text-slate-500">Cargando asignaciones y horarios…</p> }
    </section>
  `
})
export class AsignacionDocenteComponent implements OnInit {
  private readonly academico = inject(AcademicoService);
  private readonly horariosService = inject(HorarioService);
  private readonly auth = inject(AuthStore);
  private readonly destroyRef = inject(DestroyRef);
  readonly esDireccion = computed(() => this.auth.hasAnyRole(['DIRECCION', 'ADMINISTRADOR']));
  readonly anios = signal<AnioLectivoResponseDto[]>([]);
  readonly niveles = signal<NivelResponseDto[]>([]);
  readonly grados = signal<GradoResponseDto[]>([]);
  readonly secciones = signal<SeccionResponseDto[]>([]);
  readonly areas = signal<Array<{ id: number; nombre: string }>>([]);
  readonly docentes = signal<DocenteOpcionDto[]>([]);
  readonly catalogo = signal<AsignacionHorarioOpcionDto[]>([]);
  readonly bloques = signal<BloqueHorarioDto[]>([]);
  readonly horarios = signal<HorarioSeccionDto[]>([]);
  readonly mensaje = signal('');
  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly anioId = signal(0);
  readonly nivelId = signal(0);
  readonly gradoId = signal(0);
  readonly seccionId = signal(0);
  readonly asignacionSeleccionada = signal(0);
  readonly docenteId = signal(0);
  readonly selectorDocenteAbierto = signal(false);
  readonly busquedaDocente = signal('');
  readonly cargandoDocentes = signal(false);
  readonly errorDocentes = signal(false);
  readonly fotoDocente = obtenerFotoUsuario;
  readonly anioDocenteFiltro = signal(0);
  readonly asignacionEditando = signal<AsignacionHorarioOpcionDto | null>(null);
  readonly docentesReasignacion = signal<DocenteOpcionDto[]>([]);
  readonly busquedaReasignacion = signal('');
  readonly nuevoDocenteId = signal(0);
  readonly cargandoReasignacion = signal(false);
  readonly guardandoReasignacion = signal(false);
  readonly errorReasignacion = signal('');
  areaId = 0;
  bloqueSeleccionado = 0;
  diaSeleccionado: DiaHorario = 'LUNES';
  private revisionFiltros = 0;
  private consultaDocentes?: Subscription;

  readonly aniosCatalogoDocente = computed(() =>
    Array.from(new Set(this.catalogo().map(c => c.anio))).sort((a, b) => b - a)
  );
  readonly catalogoDocenteFiltrado = computed(() => {
    const anio = this.anioDocenteFiltro();
    return anio ? this.catalogo().filter(c => c.anio === anio) : this.catalogo();
  });
  readonly docentesReasignacionFiltrados = computed(() => {
    const palabras = this.normalizarBusqueda(this.busquedaReasignacion()).split(/\s+/).filter(Boolean);
    return this.docentesReasignacion().filter(docente => {
      const nombre = this.normalizarBusqueda(`${docente.nombreCompleto ?? ''} ${docente.username}`);
      return palabras.every(palabra => nombre.includes(palabra));
    });
  });

  readonly docenteSeleccionado = computed(() => this.docentes().find(docente => docente.id === this.docenteId()));
  readonly docentesFiltrados = computed(() => {
    const palabras = this.normalizarBusqueda(this.busquedaDocente()).split(/\s+/).filter(Boolean);
    return this.docentes().filter(docente => {
      const nombre = this.normalizarBusqueda(`${docente.nombreCompleto ?? ''} ${docente.username}`);
      return palabras.every(palabra => nombre.includes(palabra));
    });
  });

  readonly seccionesDelGrado = computed(() => this.secciones().filter(seccion => seccion.gradoId === this.gradoId()));
  readonly asignacionesEnSeccion = computed(() => this.catalogo().filter(asignacion =>
    asignacion.anioLectivoId === this.anioId() && asignacion.nivelId === this.nivelId() && asignacion.seccionId === this.seccionId()));
  readonly asignacionActual = computed(() => this.catalogo().find(asignacion => asignacion.asignacionId === this.asignacionSeleccionada()) ?? null);
  readonly horariosAsignacion = computed(() => this.horarios().filter(horario =>
    horario.activo && horario.asignacionDocenteId === this.asignacionSeleccionada()));
  readonly paginaHorarios = signal<number>(1);
  readonly horariosAsignacionPaginados = computed(() =>
    paginarRegistros(this.horariosAsignacion(), this.paginaHorarios(), 10)
  );
  readonly bloquesDisponibles = computed(() => this.bloques().filter(bloque => !bloque.esRecreo));
  readonly dias: Array<{ codigo: DiaHorario; numero: number; nombre: string }> = [
    { codigo: 'LUNES', numero: 1, nombre: 'Lunes' },
    { codigo: 'MARTES', numero: 2, nombre: 'Martes' },
    { codigo: 'MIERCOLES', numero: 3, nombre: 'Miércoles' },
    { codigo: 'JUEVES', numero: 4, nombre: 'Jueves' },
    { codigo: 'VIERNES', numero: 5, nombre: 'Viernes' }
  ];

  anioNumeroActual(): number {
    return this.anios().find(a => a.id === this.anioId())?.anio ?? new Date().getFullYear();
  }

  nivelNombreActual(): string {
    return this.niveles().find(n => n.id === this.nivelId())?.nombre ?? 'Nivel';
  }

  gradoNombreActual(): string {
    return this.grados().find(g => g.id === this.gradoId())?.nombre ?? 'Grado';
  }

  seccionLetraActual(): string {
    return this.seccionesDelGrado().find(s => s.id === this.seccionId())?.letra ?? '—';
  }

  areaNombreActual(): string {
    return this.areas().find(a => a.id === Number(this.areaId))?.nombre ?? 'Área curricular';
  }

  ngOnInit(): void {
    this.cargando.set(true);
    if (!this.esDireccion()) {
      forkJoin({ catalogo: this.horariosService.catalogo(), bloques: this.horariosService.bloques() }).subscribe({
        next: ({ catalogo, bloques }) => {
          this.catalogo.set(catalogo);
          this.bloques.set(bloques);
          const aniosUnicos = Array.from(new Set(catalogo.map(c => c.anio))).sort((a, b) => b - a);
          const actual = new Date().getFullYear();
          const anioInicial = aniosUnicos.includes(actual) ? actual : (aniosUnicos[0] ?? 0);
          this.anioDocenteFiltro.set(anioInicial);
          const primera = (anioInicial ? catalogo.filter(c => c.anio === anioInicial) : catalogo)[0]?.asignacionId ?? 0;
          this.asignacionSeleccionada.set(primera);
          this.cargando.set(false);
          this.cargarHorario();
        },
        error: error => this.errorCarga(error)
      });
      return;
    }
    forkJoin({
      anios: this.academico.listarAnios(),
      niveles: this.academico.listarNiveles(),
      catalogo: this.horariosService.catalogo(),
      bloques: this.horariosService.bloques()
    }).subscribe({
      next: ({ anios, niveles, catalogo, bloques }) => {
        this.anios.set(anios);
        this.niveles.set(niveles);
        this.catalogo.set(catalogo);
        this.bloques.set(bloques);
        this.anioId.set(anios.find(anio => anio.abierto)?.id ?? anios[0]?.id ?? 0);
        this.nivelId.set(niveles[0]?.id ?? 0);
        this.cargando.set(false);
        this.cargarFiltros();
      },
      error: error => this.errorCarga(error)
    });
  }

  cargarDocentes(): void {
    if (!this.areaId || this.cargandoDocentes()) return;
    this.cargandoDocentes.set(true);
    this.errorDocentes.set(false);
    this.consultaDocentes = this.academico.listarDocentes(this.areaId).pipe(
      timeout(12000),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: docentes => {
        this.docentes.set(docentes);
        this.cargandoDocentes.set(false);
      },
      error: () => {
        this.errorDocentes.set(true);
        this.cargandoDocentes.set(false);
      }
    });
  }

  private normalizarBusqueda(texto: string): string {
    return texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('es');
  }

  cambiarAnioDocente(anio: number): void {
    const n = Number(anio) || 0;
    this.anioDocenteFiltro.set(n);
    const primera = this.catalogoDocenteFiltrado()[0]?.asignacionId ?? 0;
    this.asignacionSeleccionada.set(primera);
    this.cargarHorario();
  }

  cambiarAnio(id: number): void {
    this.anioId.set(Number(id) || 0);
    this.cambiarCurso(0);
    this.cancelarReasignacion();
    this.cargarFiltros();
  }

  abrirReasignacion(asignacion: AsignacionHorarioOpcionDto, event?: Event): void {
    event?.stopPropagation();
    this.asignacionSeleccionada.set(asignacion.asignacionId);
    this.asignacionEditando.set(asignacion);
    this.busquedaReasignacion.set('');
    this.nuevoDocenteId.set(asignacion.docenteUsuarioId);
    this.errorReasignacion.set('');
    this.docentesReasignacion.set([]);
    this.cargandoReasignacion.set(true);
    this.academico.listarDocentes(asignacion.areaId).pipe(
      timeout(12000),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: lista => {
        this.docentesReasignacion.set(lista);
        this.cargandoReasignacion.set(false);
      },
      error: () => {
        this.errorReasignacion.set('No se pudo cargar la lista de docentes habilitados.');
        this.cargandoReasignacion.set(false);
      }
    });
  }

  cancelarReasignacion(): void {
    this.asignacionEditando.set(null);
    this.docentesReasignacion.set([]);
    this.busquedaReasignacion.set('');
    this.nuevoDocenteId.set(0);
    this.errorReasignacion.set('');
    this.cargandoReasignacion.set(false);
    this.guardandoReasignacion.set(false);
  }

  confirmarReasignacion(): void {
    const asig = this.asignacionEditando();
    const docenteDestino = this.nuevoDocenteId();
    if (!this.esDireccion() || !asig || !docenteDestino || docenteDestino === asig.docenteUsuarioId || this.guardandoReasignacion()) {
      return;
    }
    this.guardandoReasignacion.set(true);
    this.errorReasignacion.set('');
    this.academico.reasignarDocente(asig.asignacionId, docenteDestino).subscribe({
      next: () => {
        this.guardandoReasignacion.set(false);
        this.cancelarReasignacion();
        this.mensaje.set(`Docente actualizado para ${asig.areaNombre} (Año ${asig.anio}).`);
        this.recargarCatalogo(asig.asignacionId);
      },
      error: error => {
        this.guardandoReasignacion.set(false);
        this.errorReasignacion.set(error?.error?.message ?? 'No se pudo reasignar el docente.');
      }
    });
  }
  cambiarNivel(id: number): void {
    this.nivelId.set(Number(id) || 0);
    this.areas.set([]);
    this.cambiarCurso(0);
    this.cargarFiltros();
  }

  cambiarCurso(id: number): void {
    this.consultaDocentes?.unsubscribe();
    this.areaId = Number(id) || 0;
    this.docentes.set([]);
    this.docenteId.set(0);
    this.busquedaDocente.set('');
    this.cargandoDocentes.set(false);
    this.errorDocentes.set(false);
    this.selectorDocenteAbierto.set(this.areaId > 0);
    this.cargarDocentes();
  }

  private cargarFiltros(): void {
    const anioId = this.anioId();
    const nivelId = this.nivelId();
    const revision = ++this.revisionFiltros;
    if (!anioId || !nivelId) {
      this.grados.set([]); this.secciones.set([]); this.areas.set([]);
      this.gradoId.set(0); this.seccionId.set(0); this.cambiarCurso(0);
      this.asignacionSeleccionada.set(0); this.horarios.set([]);
      return;
    }
    this.cargando.set(true);
    forkJoin({
      grados: this.academico.listarGrados(nivelId),
      secciones: this.academico.listarSecciones(anioId, nivelId),
      areas: this.academico.listarAreas(nivelId)
    }).subscribe({
      next: ({ grados, secciones, areas }) => {
        if (revision !== this.revisionFiltros) return;
        this.grados.set(grados);
        this.secciones.set(secciones);
        this.areas.set(areas);
        const gradoActual = grados.some(grado => grado.id === this.gradoId()) ? this.gradoId() : (grados[0]?.id ?? 0);
        this.gradoId.set(gradoActual);
        const seccionesGrado = secciones.filter(seccion => seccion.gradoId === gradoActual);
        const seccionActual = seccionesGrado.some(seccion => seccion.id === this.seccionId()) ? this.seccionId() : (seccionesGrado[0]?.id ?? 0);
        this.seccionId.set(seccionActual);
        if (!areas.some(area => area.id === this.areaId)) this.cambiarCurso(0);
        this.cargando.set(false);
        this.seleccionarAsignacionDeSeccion();
      },
      error: error => { if (revision === this.revisionFiltros) this.errorCarga(error); }
    });
  }

  cambiarGrado(id: number): void {
    this.gradoId.set(Number(id) || 0);
    const siguiente = this.seccionesDelGrado()[0]?.id ?? 0;
    this.seccionId.set(siguiente);
    this.seleccionarAsignacionDeSeccion();
  }

  cambiarSeccion(id: number): void {
    this.seccionId.set(Number(id) || 0);
    this.seleccionarAsignacionDeSeccion();
  }

  private seleccionarAsignacionDeSeccion(preferida?: number): void {
    const candidatas = this.asignacionesEnSeccion();
    const siguiente = candidatas.some(asignacion => asignacion.asignacionId === preferida)
      ? (preferida ?? 0)
      : (candidatas[0]?.asignacionId ?? 0);
    this.asignacionSeleccionada.set(siguiente);
    this.cargarHorario();
  }

  cursoYaAsignado(): boolean {
    return this.asignacionesEnSeccion().some(asignacion => asignacion.areaId === Number(this.areaId));
  }

  asignarDocente(): void {
    const docente = this.docenteSeleccionado();
    if (!this.esDireccion() || this.guardando() || !docente || !this.areaId || !this.seccionId()) return;
    if (this.cursoYaAsignado()) { this.mensaje.set('El curso ya tiene una asignación para esta sección.'); return; }
    this.guardando.set(true); this.mensaje.set('');
    this.academico.asignarDocente({
      docenteUsuarioId: docente.id, seccionId: this.seccionId(), anioLectivoId: this.anioId(),
      nivelId: this.nivelId(), areaCurricularId: Number(this.areaId)
    }).subscribe({
      next: asignacion => {
        this.guardando.set(false);
        this.selectorDocenteAbierto.set(false);
        this.mensaje.set('Docente asignado al curso y la sección. Ahora puedes agregar sus bloques horarios.');
        this.recargarCatalogo(asignacion.id);
      },
      error: error => { this.guardando.set(false); this.mensaje.set(error?.error?.message ?? 'No se pudo asignar el docente.'); }
    });
  }

  private recargarCatalogo(seleccionarId?: number): void {
    this.cargando.set(true);
    this.horariosService.catalogo().subscribe({
      next: catalogo => {
        this.catalogo.set(catalogo);
        this.cargando.set(false);
        this.seleccionarAsignacionDeSeccion(seleccionarId);
      },
      error: error => this.errorCarga(error)
    });
  }

  seleccionarAsignacion(id: number): void {
    this.asignacionSeleccionada.set(Number(id) || 0);
    this.mensaje.set('');
    this.cargarHorario();
  }

  private cargarHorario(): void {
    const asignacion = this.asignacionActual();
    if (!asignacion) { this.horarios.set([]); return; }
    this.cargando.set(true);
    this.horariosService.horariosPorSeccion(asignacion.seccionId, asignacion.anioLectivoId).subscribe({
      next: respuesta => { this.horarios.set(respuesta.horarios ?? []); this.cargando.set(false); },
      error: error => this.errorCarga(error)
    });
  }

  programarBloque(): void {
    const asignacion = this.asignacionActual();
    if (!this.esDireccion() || !asignacion || !this.bloqueSeleccionado || this.guardando()) return;
    this.guardando.set(true); this.mensaje.set('');
    this.horariosService.programarAsignacion({
      asignacionDocenteId: asignacion.asignacionId,
      diaSemana: this.diaSeleccionado,
      bloqueHorarioId: Number(this.bloqueSeleccionado)
    }).subscribe({
      next: () => { this.guardando.set(false); this.mensaje.set('Bloque horario guardado.'); this.cargarHorario(); },
      error: error => { this.guardando.set(false); this.mensaje.set(error?.error?.message ?? 'No se pudo guardar el bloque horario.'); }
    });
  }

  retirarBloque(horario: HorarioSeccionDto): void {
    if (!this.esDireccion() || this.guardando()) return;
    this.guardando.set(true); this.mensaje.set('');
    this.horariosService.retirarAsignacion(horario.id).subscribe({
      next: () => { this.guardando.set(false); this.mensaje.set('Bloque retirado del horario.'); this.cargarHorario(); },
      error: error => { this.guardando.set(false); this.mensaje.set(error?.error?.message ?? 'No se pudo retirar el bloque.'); }
    });
  }

  nombreDia(numero: number): string { return this.dias.find(dia => dia.numero === numero)?.nombre ?? `Día ${numero}`; }
  rangoBloque(id: number): string {
    const bloque = this.bloques().find(opcion => opcion.id === id);
    return bloque ? `${bloque.horaInicio.slice(0,5)}–${bloque.horaFin.slice(0,5)}` : 'Bloque sin configurar';
  }

  private errorCarga(error: any): void {
    this.cargando.set(false);
    this.mensaje.set(error?.error?.message ?? 'No se pudieron cargar los datos académicos.');
  }
}
