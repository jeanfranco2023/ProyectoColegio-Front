import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthStore } from '../../core/state/auth.store';
import { AcademicoService } from '../../core/services/academico.service';
import {
  EstudianteRiesgoRefuerzoDto,
  EstadoSesionRefuerzo,
  InscripcionRefuerzoDto,
  RefuerzoService,
  SesionRefuerzoDetalleDto,
  SesionRefuerzoDto,
  TableroRefuerzoDto
} from '../../core/services/refuerzo.service';
import {
  AnioLectivoResponseDto,
  AsignacionDocenteResponseDto,
  AulaResponseDto,
  PeriodoResponseDto
} from '../../core/models/academico.model';
import { fechaActualEnPeru } from '../../core/utils/fecha-nacimiento';
import { AsignacionHorarioOpcionDto, HorarioService } from '../../core/services/horario.service';
import { UiCalendarComponent } from '../../shared/ui/ui-calendar.component';
import { UiPaginacionComponent, paginarRegistros } from '../../shared/ui/ui-paginacion.component';

@Component({
  selector: 'app-refuerzos',
  standalone: true,
  imports: [FormsModule, UiCalendarComponent, UiPaginacionComponent],
  template: `
    <section class="grid gap-5 text-ui-text" aria-labelledby="refuerzos-title">
      <header class="flex flex-wrap items-start justify-between gap-4 border-b border-ui-divider pb-4">
        <div class="grid gap-1.5">
          <p class="m-0 text-xs font-bold uppercase tracking-[0.12em] text-ui-muted">Acompañamiento pedagógico</p>
          <h1 id="refuerzos-title" class="m-0 font-display text-2xl font-bold text-[#173B67]">Refuerzo académico y seguimiento CNEB</h1>
          <p class="m-0 max-w-3xl text-sm text-ui-muted">
            Control centralizado de sesiones de nivelación para estudiantes con logro <strong>C</strong> (En inicio) y <strong>B</strong> (En proceso), derivación por sección y registro de asistencia formativa.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            class="min-h-11 rounded-xl border border-ui-control-border bg-ui-surface px-4 py-2 text-sm font-semibold text-ui-text transition hover:bg-ui-surface-soft disabled:opacity-50"
            [disabled]="ocupado()"
            (click)="cargarTablero()"
          >
            Actualizar tablero
          </button>
          <button
            type="button"
            class="min-h-11 rounded-xl bg-[#173B67] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
            (click)="toggleFormulario()"
          >
            {{ mostrarFormulario() ? 'Ocultar formulario' : '+ Programar sesión' }}
          </button>
        </div>
      </header>

      @if (mensaje()) {
        <div
          role="status"
          class="flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm font-medium"
          [class.border-rose-300]="esError()"
          [class.bg-rose-50]="esError()"
          [class.text-rose-900]="esError()"
          [class.border-emerald-300]="!esError()"
          [class.bg-emerald-50]="!esError()"
          [class.text-emerald-950]="!esError()"
        >
          <span>{{ mensaje() }}</span>
          <button type="button" class="rounded-lg px-2 py-1 text-xs font-bold underline" (click)="mensaje.set('')">Cerrar</button>
        </div>
      }

      <!-- Indicadores clave -->
      <section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Resumen de refuerzo académico">
        <article class="rounded-2xl border border-ui-divider bg-ui-surface p-4 shadow-sm">
          <p class="m-0 text-xs font-bold uppercase tracking-wider text-ui-muted">Sesiones en vista</p>
          <p class="m-0 mt-1.5 font-display text-3xl font-bold text-[#173B67]">{{ kpis().sesiones }}</p>
          <p class="m-0 mt-1 text-xs text-ui-muted">
            {{ kpis().pendientesAsistencia }} con asistencia pendiente · {{ kpis().completadas }} completadas
          </p>
        </article>

        <article class="rounded-2xl border border-ui-divider bg-ui-surface p-4 shadow-sm">
          <p class="m-0 text-xs font-bold uppercase tracking-wider text-ui-muted">Inscripciones activas</p>
          <p class="m-0 mt-1.5 font-display text-3xl font-bold text-[#173B67]">{{ kpis().inscritos }}</p>
          <p class="m-0 mt-1 text-xs text-ui-muted">
            {{ kpis().casosC }} por logro C · {{ kpis().casosB }} por logro B
          </p>
        </article>

        <article class="rounded-2xl border border-ui-divider bg-ui-surface p-4 shadow-sm">
          <p class="m-0 text-xs font-bold uppercase tracking-wider text-ui-muted">Asistencia registrada</p>
          <p class="m-0 mt-1.5 font-display text-3xl font-bold text-emerald-700">{{ kpis().porcentajeAsistencia }}%</p>
          <p class="m-0 mt-1 text-xs text-ui-muted">
            {{ kpis().asistieron }} asistieron · {{ kpis().faltaron }} faltaron · {{ kpis().justificados }} justif.
          </p>
        </article>

        <article class="rounded-2xl border border-ui-divider bg-ui-surface p-4 shadow-sm">
          <p class="m-0 text-xs font-bold uppercase tracking-wider text-ui-muted">Evaluaciones en riesgo (B / C)</p>
          <p class="m-0 mt-1.5 font-display text-3xl font-bold text-rose-700">{{ kpis().riesgosTotal }}</p>
          <p class="m-0 mt-1 text-xs font-semibold" [class.text-amber-700]="kpis().riesgosCSinDerivar > 0 || kpis().riesgosSinDerivar > 0" [class.text-emerald-700]="kpis().riesgosCSinDerivar === 0 && kpis().riesgosSinDerivar === 0">
            {{ kpis().riesgosCSinDerivar === 0 ? 'Logro C cubierto en automático' : kpis().riesgosCSinDerivar + ' logro C sin asignar' }}
            @if (kpis().riesgosSinDerivar > 0) {
              · {{ kpis().riesgosSinDerivar }} B preventivos sin sesión
            }
          </p>
        </article>
      </section>

      <!-- Programar nueva sesión -->
      @if (mostrarFormulario()) {
        <section class="rounded-2xl border-2 border-[#173B67]/25 bg-ui-surface p-5 shadow-sm" aria-label="Programar sesión de refuerzo">
          <div class="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-ui-divider pb-3">
            <div>
              <h2 class="m-0 font-display text-lg font-bold text-[#173B67]">Programar sesión adicional / preventiva</h2>
              <p class="m-0 mt-0.5 text-sm text-ui-muted">Los estudiantes con logro C reciben sesión y tema en automático sin aprobación de Dirección. Usa este formulario solo para sesiones extra o preventivas (B).</p>
            </div>
            <button type="button" class="rounded-lg border border-ui-control-border px-3 py-1.5 text-sm font-semibold" (click)="mostrarFormulario.set(false)">Cancelar</button>
          </div>

          <form (ngSubmit)="programar()" class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div class="grid gap-1.5 text-sm font-semibold md:col-span-2">
              <label for="refuerzo-asignacion-select">Sección · Área · Docente *</label>
              <select
                id="refuerzo-asignacion-select"
                name="asignacionId"
                class="min-h-11 rounded-lg border border-ui-control-border bg-ui-surface px-3 py-2 text-ui-text focus-visible:outline-2 focus-visible:outline-ui-focus"
                [(ngModel)]="asignacionId"
                (ngModelChange)="cambiarAsignacion($event)"
              >
                @for (opt of opcionesCatalogoOrdenadas(); track opt.asignacionId) {
                  <option [ngValue]="opt.asignacionId">
                    {{ opt.grado }} {{ opt.nivel }} · {{ opt.letra }} — {{ opt.areaNombre }} — {{ opt.docenteNombre }}
                  </option>
                } @empty {
                  @for (a of asignaciones(); track a.id) {
                    <option [ngValue]="a.id">{{ descripcion(a.id) }}</option>
                  }
                }
              </select>
            </div>

            <div class="grid gap-1.5 text-sm font-semibold">
              <label for="refuerzo-form-periodo-select">Periodo académico *</label>
              <select
                id="refuerzo-form-periodo-select"
                name="formPeriodoId"
                class="min-h-11 rounded-lg border border-ui-control-border bg-ui-surface px-3 py-2 text-ui-text focus-visible:outline-2 focus-visible:outline-ui-focus"
                [(ngModel)]="formPeriodoId"
              >
                @for (p of periodos(); track p.id) {
                  <option [ngValue]="p.id">{{ p.nombre }}</option>
                }
              </select>
            </div>

            <div class="grid gap-1.5 text-sm font-semibold md:col-span-2">
              <div class="flex items-center justify-between">
                <label for="refuerzo-tema-input">Tema de intervención *</label>
                <span class="text-xs font-normal text-ui-muted">{{ tema.length }}/40</span>
              </div>
              <input
                id="refuerzo-tema-input"
                class="min-h-11 rounded-lg border border-ui-control-border bg-ui-surface px-3 py-2 text-ui-text focus-visible:outline-2 focus-visible:outline-ui-focus"
                name="tema"
                [(ngModel)]="tema"
                maxlength="40"
                placeholder="Ej: Refuerzo en fracciones y ecuaciones"
                required
              />
            </div>

            <div class="grid gap-1.5 text-sm font-semibold">
              <label for="refuerzo-aula-select">Aula asignada *</label>
              <select
                id="refuerzo-aula-select"
                class="min-h-11 rounded-lg border border-ui-control-border bg-ui-surface px-3 py-2 text-ui-text focus-visible:outline-2 focus-visible:outline-ui-focus"
                name="aula"
                [(ngModel)]="aula"
                required
              >
                <option value="">Selecciona aula</option>
                @for (a of aulas(); track a.id) {
                  <option [value]="a.codigo">{{ a.codigo }} · {{ a.nombre }}</option>
                }
              </select>
            </div>

            <div class="grid gap-1.5 text-sm font-semibold">
              <label for="refuerzo-fecha-input">Fecha programada *</label>
              <app-ui-calendar id="refuerzo-fecha-input" name="fecha" [(ngModel)]="fecha" [min]="hoy" [required]="true" aria-label="Fecha de la sesión" />
            </div>

            <div class="grid gap-1.5 text-sm font-semibold">
              <label for="refuerzo-inicio-input">Hora de inicio *</label>
              <input id="refuerzo-inicio-input" class="min-h-11 rounded-lg border border-ui-control-border bg-ui-surface px-3 py-2 text-ui-text focus-visible:outline-2 focus-visible:outline-ui-focus" type="time" name="inicio" [(ngModel)]="inicio" required />
            </div>

            <div class="grid gap-1.5 text-sm font-semibold">
              <label for="refuerzo-fin-input">Hora de fin *</label>
              <input id="refuerzo-fin-input" class="min-h-11 rounded-lg border border-ui-control-border bg-ui-surface px-3 py-2 text-ui-text focus-visible:outline-2 focus-visible:outline-ui-focus" type="time" name="fin" [(ngModel)]="fin" required />
            </div>

            <div class="flex flex-wrap items-center justify-between gap-3 md:col-span-2 lg:col-span-3 pt-1">
              <label class="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-ui-text">
                <input type="checkbox" name="derivarAlGuardar" [(ngModel)]="derivarAlGuardar" class="h-4 w-4 rounded border-ui-control-border accent-[#173B67]" />
                <span>Derivar automáticamente a estudiantes con logro C y B al guardar</span>
              </label>
              <button
                class="min-h-11 rounded-xl bg-[#173B67] px-6 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
                [disabled]="ocupado() || !formPeriodoId"
                type="submit"
              >
                Guardar y programar sesión
              </button>
            </div>
          </form>
        </section>
      }

      <!-- Barra de filtros -->
      <section class="rounded-2xl border border-ui-divider bg-ui-surface p-4 shadow-sm" aria-label="Filtros de acompañamiento">
        <div class="grid gap-3 md:grid-cols-2 lg:grid-cols-6">
          <div class="grid gap-1 text-sm font-semibold">
            <label for="refuerzo-periodo-select">Periodo</label>
            <select
              id="refuerzo-periodo-select"
              class="min-h-11 rounded-lg border border-ui-control-border bg-ui-surface px-3 py-2 text-ui-text"
              [ngModel]="filtroPeriodoSig()"
              (ngModelChange)="onCambioPeriodo($event)"
            >
              <option [ngValue]="0">Todos los periodos</option>
              @for (p of periodos(); track p.id) {
                <option [ngValue]="p.id">{{ p.nombre }}</option>
              }
            </select>
          </div>

          <div class="grid gap-1 text-sm font-semibold">
            <label for="filtro-grado-seccion">Grado / Sección</label>
            <select
              id="filtro-grado-seccion"
              class="min-h-11 rounded-lg border border-ui-control-border bg-ui-surface px-3 py-2 text-ui-text"
              [ngModel]="filtroGradoSeccion()"
              (ngModelChange)="setFiltroGradoSeccion($event)"
            >
              <option value="">Todas las secciones</option>
              @for (gs of opcionesGradoSeccion(); track gs) {
                <option [value]="gs">{{ gs }}</option>
              }
            </select>
          </div>

          <div class="grid gap-1 text-sm font-semibold">
            <label for="filtro-area">Área curricular</label>
            <select
              id="filtro-area"
              class="min-h-11 rounded-lg border border-ui-control-border bg-ui-surface px-3 py-2 text-ui-text"
              [ngModel]="filtroArea()"
              (ngModelChange)="setFiltroArea($event)"
            >
              <option value="">Todas las áreas</option>
              @for (area of opcionesArea(); track area) {
                <option [value]="area">{{ area }}</option>
              }
            </select>
          </div>

          <div class="grid gap-1 text-sm font-semibold">
            <label for="filtro-docente">Docente</label>
            <select
              id="filtro-docente"
              class="min-h-11 rounded-lg border border-ui-control-border bg-ui-surface px-3 py-2 text-ui-text"
              [ngModel]="filtroDocente()"
              (ngModelChange)="setFiltroDocente($event)"
            >
              <option value="">Todos los docentes</option>
              @for (doc of opcionesDocente(); track doc) {
                <option [value]="doc">{{ doc }}</option>
              }
            </select>
          </div>

          @if (vistaActiva() === 'sesiones') {
            <div class="grid gap-1 text-sm font-semibold">
              <label for="filtro-estado-sesion">Estado de sesión</label>
              <select
                id="filtro-estado-sesion"
                class="min-h-11 rounded-lg border border-ui-control-border bg-ui-surface px-3 py-2 text-ui-text"
                [ngModel]="filtroEstadoSesion()"
                (ngModelChange)="setFiltroEstadoSesion($event)"
              >
                <option value="">Todos los estados</option>
                <option value="PENDIENTE_ASISTENCIA">Pendiente de asistencia</option>
                <option value="PROGRAMADA">Programada (próxima)</option>
                <option value="COMPLETADA">Asistencia completada</option>
                <option value="SIN_DERIVADOS">Sin estudiantes derivados</option>
              </select>
            </div>
          } @else {
            <div class="grid gap-1 text-sm font-semibold">
              <label for="filtro-logro-riesgo">Nivel / Derivación</label>
              <select
                id="filtro-logro-riesgo"
                class="min-h-11 rounded-lg border border-ui-control-border bg-ui-surface px-3 py-2 text-ui-text"
                [ngModel]="filtroLogroRiesgo()"
                (ngModelChange)="setFiltroLogroRiesgo($event)"
              >
                <option value="">Todos (C y B)</option>
                <option value="C">Solo logro C (Obligatorio · Auto)</option>
                <option value="B">Solo logro B (En proceso · Preventivo)</option>
                <option value="SIN_DERIVAR">Preventivos (B) sin sesión adicional</option>
                <option value="DERIVADO">Con sesión y tema asignado</option>
              </select>
            </div>
          }

          <div class="grid gap-1 text-sm font-semibold">
            <label for="filtro-busqueda">Buscar</label>
            <input
              id="filtro-busqueda"
              type="search"
              class="min-h-11 rounded-lg border border-ui-control-border bg-ui-surface px-3 py-2 text-ui-text"
              [ngModel]="busqueda()"
              (ngModelChange)="setBusqueda($event)"
              placeholder="Tema, aula, DNI o estudiante…"
            />
          </div>
        </div>

        @if (hayFiltrosActivos()) {
          <div class="mt-3 flex items-center justify-end">
            <button type="button" class="text-sm font-semibold text-[#173B67] underline" (click)="limpiarFiltros()">Limpiar filtros</button>
          </div>
        }
      </section>

      <!-- Pestañas principales -->
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-ui-divider pb-2" role="tablist" aria-label="Vistas de refuerzo académico">
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            role="tab"
            [attr.aria-selected]="vistaActiva() === 'sesiones'"
            class="min-h-11 rounded-xl px-4 py-2 text-sm font-bold transition"
            [class.bg-[#173B67]]="vistaActiva() === 'sesiones'"
            [class.text-white]="vistaActiva() === 'sesiones'"
            [class.bg-ui-surface]="vistaActiva() !== 'sesiones'"
            [class.text-ui-text]="vistaActiva() !== 'sesiones'"
            [class.border]="vistaActiva() !== 'sesiones'"
            [class.border-ui-divider]="vistaActiva() !== 'sesiones'"
            (click)="vistaActiva.set('sesiones')"
          >
            Sesiones de refuerzo ({{ sesionesFiltradas().length }})
          </button>

          <button
            type="button"
            role="tab"
            [attr.aria-selected]="vistaActiva() === 'riesgos'"
            class="min-h-11 rounded-xl px-4 py-2 text-sm font-bold transition"
            [class.bg-[#173B67]]="vistaActiva() === 'riesgos'"
            [class.text-white]="vistaActiva() === 'riesgos'"
            [class.bg-ui-surface]="vistaActiva() !== 'riesgos'"
            [class.text-ui-text]="vistaActiva() !== 'riesgos'"
            [class.border]="vistaActiva() !== 'riesgos'"
            [class.border-ui-divider]="vistaActiva() !== 'riesgos'"
            (click)="vistaActiva.set('riesgos')"
          >
            Estudiantes en riesgo B / C ({{ riesgosFiltrados().length }})
          </button>
        </div>
      </div>

      <!-- TAB 1: SESIONES DE REFUERZO -->
      @if (vistaActiva() === 'sesiones') {
        <div class="grid gap-3">
          @for (s of sesionesPaginadas(); track s.id) {
            <article
              class="rounded-2xl border bg-ui-surface p-4 shadow-sm transition"
              [class.border-2]="seleccionada()?.id === s.id"
              [class.border-[#173B67]]="seleccionada()?.id === s.id"
              [class.bg-blue-50/30]="seleccionada()?.id === s.id"
              [class.border-ui-divider]="seleccionada()?.id !== s.id"
            >
              <div class="flex flex-wrap items-start justify-between gap-4">
                <div class="grid gap-2">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="rounded-full px-2.5 py-1 text-xs font-bold" [class]="badgeEstadoClase(s.estadoSesion)">
                      {{ etiquetaEstadoSesion(s.estadoSesion) }}
                    </span>
                    <span class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-[#173B67]">
                      {{ s.gradoSeccion || s.aulaAsignada || 'Aula libre' }}
                    </span>
                    @if (s.periodoNombre) {
                      <span class="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-900">
                        {{ s.periodoNombre }}
                      </span>
                    }
                    <span class="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900">
                      {{ s.areaNombre || 'Área #' + s.areaCurricularId }}
                    </span>
                  </div>

                  <h2 class="m-0 font-display text-lg font-bold text-ui-text">{{ s.tema }}</h2>

                  <p class="m-0 text-sm text-ui-muted">
                    <strong>Docente:</strong> {{ s.docenteNombre }} ·
                    <strong>Fecha:</strong> {{ s.fechaProgramada }} ({{ s.horaInicio }} - {{ s.horaFin }}) ·
                    <strong>Aula:</strong> {{ s.aulaAsignada || 'Sin aula' }}
                  </p>

                  <div class="flex flex-wrap items-center gap-2 pt-0.5 text-xs font-semibold">
                    <span class="rounded-md bg-slate-100 px-2.5 py-1 text-slate-800">
                      Inscritos: {{ s.totalInscritos }}
                    </span>
                    <span class="rounded-md bg-rose-50 px-2.5 py-1 text-rose-800">
                      Logro C: {{ s.casosC }}
                    </span>
                    <span class="rounded-md bg-amber-50 px-2.5 py-1 text-amber-800">
                      Logro B: {{ s.casosB }}
                    </span>
                    <span class="rounded-md bg-emerald-50 px-2.5 py-1 text-emerald-800">
                      Asistió: {{ s.asistieron }}
                    </span>
                    <span class="rounded-md bg-rose-50 px-2.5 py-1 text-rose-800">
                      Faltó: {{ s.faltaron }}
                    </span>
                    <span class="rounded-md bg-sky-50 px-2.5 py-1 text-sky-800">
                      Justif.: {{ s.justificados }}
                    </span>
                    @if (s.pendientes > 0) {
                      <span class="rounded-md bg-amber-100 px-2.5 py-1 text-amber-950">
                        Pendientes: {{ s.pendientes }}
                      </span>
                    }
                  </div>
                </div>

                <div class="flex flex-wrap items-center gap-2">
                  <button
                    class="min-h-11 rounded-xl px-4 py-2 text-sm font-semibold transition"
                    [class.bg-[#173B67]]="seleccionada()?.id === s.id"
                    [class.text-white]="seleccionada()?.id === s.id"
                    [class.border]="seleccionada()?.id !== s.id"
                    [class.border-[#173B67]]="seleccionada()?.id !== s.id"
                    [class.text-[#173B67]]="seleccionada()?.id !== s.id"
                    [class.bg-white]="seleccionada()?.id !== s.id"
                    type="button"
                    [disabled]="ocupado()"
                    (click)="seleccionar(s)"
                  >
                    {{ seleccionada()?.id === s.id ? 'Ficha abierta' : 'Abrir ficha y lista' }}
                  </button>
                  <button
                    class="min-h-11 rounded-xl border border-ui-control-border bg-ui-surface px-4 py-2 text-sm font-semibold text-ui-text transition hover:bg-ui-surface-soft disabled:opacity-50"
                    type="button"
                    [disabled]="ocupado()"
                    (click)="derivar(s)"
                  >
                    Sincronizar B/C faltantes
                  </button>
                </div>
              </div>
            </article>
          } @empty {
            <div class="rounded-2xl border border-dashed border-ui-divider bg-ui-surface p-6 text-center text-sm text-ui-muted">
              No se encontraron sesiones de refuerzo con los filtros actuales. Prueba seleccionando otro periodo o limpia los filtros.
            </div>
          }

          <ui-paginacion
            [totalRegistros]="sesionesFiltradas().length"
            [paginaActual]="paginaSesiones()"
            [tamanoPagina]="6"
            etiqueta="sesiones"
            ariaLabel="Paginación de sesiones de refuerzo"
            (cambioPagina)="paginaSesiones.set($event)"
          />
        </div>
      }

      <!-- TAB 2: ESTUDIANTES EN RIESGO B / C -->
      @if (vistaActiva() === 'riesgos') {
        <section class="rounded-2xl border border-ui-divider bg-ui-surface p-4 shadow-sm" aria-label="Listado de evaluaciones B y C">
          <div class="overflow-auto">
            <table class="w-full text-left text-sm [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-ui-surface-soft/75">
              <thead class="border-b border-ui-divider bg-ui-surface-soft text-xs font-bold uppercase text-[#173B67]">
                <tr>
                  <th class="p-3">Estudiante / DNI</th>
                  <th class="p-3">Sección / Periodo</th>
                  <th class="p-3">Área y competencia</th>
                  <th class="p-3">Logro</th>
                  <th class="p-3">Estado en refuerzo</th>
                  <th class="p-3">Acción</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-ui-divider bg-ui-surface">
                @for (r of riesgosPaginados(); track r.calificacionId) {
                  <tr>
                    <td class="p-3">
                      <div class="font-semibold text-ui-text">{{ r.nombreEstudiante }}</div>
                      <div class="text-xs text-ui-muted">DNI {{ r.dniEstudiante || '—' }} · Doc: {{ r.docenteNombre }}</div>
                    </td>
                    <td class="p-3">
                      <div class="font-semibold text-[#173B67]">{{ r.gradoSeccion || 'Sin sección' }}</div>
                      <div class="text-xs text-ui-muted">{{ r.periodoNombre || 'Periodo #' + r.periodoAcademicoId }}</div>
                    </td>
                    <td class="p-3 max-w-xs">
                      <div class="font-semibold text-ui-text">{{ r.areaNombre || 'Área #' + r.areaCurricularId }}</div>
                      <div class="text-xs text-ui-muted line-clamp-2" [title]="r.competenciaNombre || ''">{{ r.competenciaNombre || 'Competencia CNEB' }}</div>
                    </td>
                    <td class="p-3">
                      <span
                        class="inline-flex rounded-full px-2.5 py-1 text-xs font-bold"
                        [class.bg-rose-100]="r.calificacionCualitativa === 'C'"
                        [class.text-rose-900]="r.calificacionCualitativa === 'C'"
                        [class.bg-amber-100]="r.calificacionCualitativa === 'B'"
                        [class.text-amber-950]="r.calificacionCualitativa === 'B'"
                      >
                        {{ r.calificacionCualitativa === 'C' ? 'C · En inicio' : 'B · En proceso' }}
                      </span>
                      @if (r.conclusionDescriptiva) {
                        <p class="m-0 mt-1 max-w-xs text-xs text-ui-muted line-clamp-2" [title]="r.conclusionDescriptiva">
                          {{ r.conclusionDescriptiva }}
                        </p>
                      }
                    </td>
                    <td class="p-3">
                      @if (r.derivado) {
                        <span class="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-900">
                          {{ r.calificacionCualitativa === 'C' ? 'Asignado auto (Obligatorio)' : 'En sesión' }} · {{ r.estadoAsistencia || 'PENDIENTE' }}
                        </span>
                        <div class="mt-1 text-xs font-medium text-ui-text">Tema: {{ r.sesionTema }}</div>
                      } @else if (r.calificacionCualitativa === 'C') {
                        <span class="inline-flex rounded-full bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-900">
                          Logro C · Asignación automática pendiente
                        </span>
                      } @else {
                        <span class="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-950">
                          Preventivo (B) · Opcional
                        </span>
                      }
                    </td>
                    <td class="p-3">
                      @if (r.derivado && r.sesionRefuerzoId) {
                        <button type="button" class="min-h-10 rounded-lg border border-[#173B67] px-3 py-1.5 text-xs font-bold text-[#173B67]" (click)="abrirSesionPorId(r.sesionRefuerzoId)">
                          Ver sesión y ficha
                        </button>
                      } @else {
                        <button type="button" class="min-h-10 rounded-lg bg-[#173B67] px-3 py-1.5 text-xs font-bold text-white" (click)="prepararSesionDesdeRiesgo(r)">
                          {{ r.calificacionCualitativa === 'C' ? 'Asignar sesión C' : 'Programar sesión B' }}
                        </button>
                      }
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="6" class="p-6 text-center text-sm text-ui-muted">
                      No hay evaluaciones B o C que coincidan con los filtros seleccionados.
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <div class="mt-3">
            <ui-paginacion
              [totalRegistros]="riesgosFiltrados().length"
              [paginaActual]="paginaRiesgos()"
              [tamanoPagina]="10"
              etiqueta="evaluaciones"
              ariaLabel="Paginación de evaluaciones en riesgo B y C"
              (cambioPagina)="paginaRiesgos.set($event)"
            />
          </div>
        </section>
      }

      <!-- FICHA DE SEGUIMIENTO DE LA SESIÓN SELECCIONADA -->
      @if (seleccionada(); as sesion) {
        <section class="grid gap-4 rounded-2xl border-2 border-[#173B67] bg-white p-5 shadow-md" aria-label="Ficha de seguimiento e intervenciones de la sesión">
          <div class="flex flex-wrap items-start justify-between gap-3 border-b border-ui-divider pb-3">
            <div class="grid gap-1">
              <span class="text-xs font-bold uppercase tracking-wider text-[#173B67]">Ficha de seguimiento pedagógico</span>
              <h2 class="m-0 font-display text-xl font-bold text-ui-text">{{ sesion.tema }}</h2>
              @if (detalleSeleccionada(); as det) {
                <p class="m-0 text-sm text-ui-muted">
                  {{ det.gradoSeccion || det.aulaAsignada }} · {{ det.areaNombre }} · Docente: <strong>{{ det.docenteNombre }}</strong> · {{ det.fechaProgramada }} ({{ det.horaInicio }} - {{ det.horaFin }})
                </p>
              } @else {
                <p class="m-0 text-sm text-ui-muted">{{ sesion.fechaProgramada }} ({{ sesion.horaInicio }} - {{ sesion.horaFin }}) · Aula {{ sesion.aulaAsignada || 'Sin aula' }}</p>
              }
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <button
                type="button"
                class="min-h-10 rounded-xl border border-ui-control-border px-3 py-1.5 text-sm font-semibold"
                [disabled]="ocupado()"
                (click)="derivar(sesion)"
              >
                Derivar B/C faltantes
              </button>
              <button
                type="button"
                class="min-h-10 rounded-xl border border-ui-control-border px-3 py-1.5 text-sm font-semibold"
                (click)="seleccionada.set(null)"
              >
                Cerrar ficha
              </button>
            </div>
          </div>

          @if (inscritos().length === 0) {
            <div class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
              <span>Esta sesión aún no tiene estudiantes derivados.</span>
              <button type="button" class="min-h-10 rounded-lg bg-[#173B67] px-4 py-2 text-sm font-semibold text-white" [disabled]="ocupado()" (click)="derivar(sesion)">
                Derivar estudiantes C y B ahora
              </button>
            </div>
          } @else {
            <div class="overflow-auto">
              <table class="w-full text-left text-sm [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-ui-surface-soft/75">
                <thead class="border-b border-ui-divider bg-ui-surface-soft text-xs font-bold uppercase text-[#173B67]">
                  <tr>
                    <th class="p-3">Estudiante</th>
                    <th class="p-3">Motivo de derivación (CNEB)</th>
                    <th class="p-3">Asistencia</th>
                    <th class="p-3">Observaciones formativas y próxima acción</th>
                    <th class="p-3">Acción</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-ui-divider bg-ui-surface">
                  @for (i of inscritosPaginados(); track i.id) {
                    <tr>
                      <td class="p-3">
                        <div class="font-semibold text-ui-text">{{ i.nombreEstudiante || 'Estudiante #' + i.estudianteId }}</div>
                        <div class="text-xs text-ui-muted">
                          {{ i.dniEstudiante ? 'DNI ' + i.dniEstudiante : '' }}
                          {{ i.gradoSeccion ? '· ' + i.gradoSeccion : '' }}
                        </div>
                      </td>
                      <td class="p-3 max-w-xs">
                        @if (i.calificacionOrigen) {
                          <span
                            class="inline-flex rounded-full px-2 py-0.5 text-xs font-bold"
                            [class.bg-rose-100]="i.calificacionOrigen === 'C'"
                            [class.text-rose-900]="i.calificacionOrigen === 'C'"
                            [class.bg-amber-100]="i.calificacionOrigen === 'B'"
                            [class.text-amber-950]="i.calificacionOrigen === 'B'"
                          >
                            Logro {{ i.calificacionOrigen }}
                          </span>
                        }
                        <div class="mt-1 text-xs font-semibold text-ui-text">{{ i.competenciaNombre || 'Competencia del área' }}</div>
                        @if (i.conclusionOrigen) {
                          <div class="text-xs text-ui-muted line-clamp-2" [title]="i.conclusionOrigen">{{ i.conclusionOrigen }}</div>
                        }
                      </td>
                      <td class="p-3">
                        @if (puedeRegistrarAsistencia()) {
                          <label [attr.for]="'estado-asist-' + i.id" class="sr-only">Estado de asistencia de {{ i.nombreEstudiante || 'Estudiante #' + i.estudianteId }}</label>
                          <select [attr.id]="'estado-asist-' + i.id" class="min-h-11 rounded-lg border border-ui-control-border bg-white p-2 text-sm" [ngModel]="i.estadoAsistencia" (ngModelChange)="i.estadoAsistencia = $event">
                            <option value="PENDIENTE">PENDIENTE</option>
                            <option value="ASISTIO">ASISTIO</option>
                            <option value="FALTO">FALTO</option>
                            <option value="JUSTIFICADO">JUSTIFICADO</option>
                          </select>
                        } @else {
                          <span class="font-semibold">{{ i.estadoAsistencia }}</span>
                        }
                      </td>
                      <td class="p-3">
                        @if (puedeRegistrarAsistencia()) {
                          <label [attr.for]="'obs-formativa-' + i.id" class="sr-only">Observación formativa del estudiante {{ i.estudianteId }}</label>
                          <input
                            [attr.id]="'obs-formativa-' + i.id"
                            class="min-h-11 w-full rounded-lg border border-ui-control-border bg-white p-2 text-sm"
                            maxlength="500"
                            placeholder="Registra intervención, avance y próxima acción…"
                            [ngModel]="i.observaciones"
                            (ngModelChange)="i.observaciones = $event"
                            [attr.aria-label]="'Avance del estudiante ' + i.estudianteId"
                          />
                        } @else {
                          <span>{{ i.observaciones || '—' }}</span>
                        }
                      </td>
                      <td class="p-3">
                        @if (puedeRegistrarAsistencia()) {
                          <button
                            class="min-h-11 rounded-lg border border-[#173B67] px-3 py-2 text-sm font-semibold text-[#173B67] transition hover:bg-[#173B67] hover:text-white disabled:opacity-40"
                            type="button"
                            [disabled]="ocupado() || !puedeTomarAsistencia() || i.estadoAsistencia === 'PENDIENTE' || (i.estadoAsistencia === 'JUSTIFICADO' && !i.observaciones?.trim())"
                            (click)="guardarAsistencia(i)"
                          >
                            Guardar
                          </button>
                        } @else {
                          <span class="text-xs text-slate-500">Solo lectura</span>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <ui-paginacion
              [totalRegistros]="inscritos().length"
              [paginaActual]="paginaInscritos()"
              [tamanoPagina]="10"
              etiqueta="estudiantes"
              ariaLabel="Paginación de estudiantes en sesión de refuerzo"
              (cambioPagina)="paginaInscritos.set($event)"
            />
          }
        </section>
      }
    </section>
  `,
  styles: `
    :host { display: block; min-width: 0; max-width: 100%; }
    :host > section { grid-template-columns: minmax(0, 1fr); }
    .grid > *, .flex > * { min-width: 0; }
    select, input[type='search'], input[type='text'], input[type='time'], input:not([type='checkbox']) {
      box-sizing: border-box;
      width: 100%;
      min-width: 0;
      max-width: 100%;
    }
    .overflow-auto { min-width: 0; max-width: 100%; overflow-x: auto; }
    table { min-width: 720px; }
    h1, h2, p { overflow-wrap: anywhere; }
  `
})
export class RefuerzosComponent implements OnInit {
  private readonly auth = inject(AuthStore);
  readonly puedeRegistrarAsistencia = computed(
    () =>
      this.auth.hasRole('DOCENTE') ||
      this.auth.hasRole('DIRECCION') ||
      this.auth.hasRole('ADMINISTRADOR')
  );
  private readonly academico = inject(AcademicoService);
  private readonly servicio = inject(RefuerzoService);
  private readonly horarios = inject(HorarioService);

  readonly anios = signal<AnioLectivoResponseDto[]>([]);
  readonly anioLectivoId = signal<number>(0);
  readonly catalogo = signal<AsignacionHorarioOpcionDto[]>([]);
  readonly asignaciones = signal<AsignacionDocenteResponseDto[]>([]);
  readonly periodos = signal<PeriodoResponseDto[]>([]);
  readonly aulas = signal<AulaResponseDto[]>([]);

  readonly tableroData = signal<TableroRefuerzoDto | null>(null);
  readonly sesionesDetalle = signal<SesionRefuerzoDetalleDto[]>([]);
  readonly riesgos = signal<EstudianteRiesgoRefuerzoDto[]>([]);
  readonly sesiones = signal<SesionRefuerzoDto[]>([]);
  readonly inscritos = signal<InscripcionRefuerzoDto[]>([]);
  readonly seleccionada = signal<SesionRefuerzoDto | SesionRefuerzoDetalleDto | null>(null);

  readonly vistaActiva = signal<'sesiones' | 'riesgos'>('sesiones');
  readonly mostrarFormulario = signal(false);
  readonly mensaje = signal('');
  readonly esError = signal(false);
  readonly ocupado = signal(false);
  readonly hoy = fechaActualEnPeru();

  readonly filtroPeriodoSig = signal<number>(0);
  readonly filtroGradoSeccion = signal<string>('');
  readonly filtroArea = signal<string>('');
  readonly filtroDocente = signal<string>('');
  readonly filtroEstadoSesion = signal<string>('');
  readonly filtroLogroRiesgo = signal<string>('');
  readonly busqueda = signal<string>('');

  readonly paginaSesiones = signal<number>(1);
  readonly paginaRiesgos = signal<number>(1);
  readonly paginaInscritos = signal<number>(1);

  readonly opcionesCatalogoOrdenadas = computed(() =>
    [...this.catalogo()].sort((a, b) =>
      `${a.nivel} ${a.grado} ${a.letra} ${a.areaNombre}`.localeCompare(
        `${b.nivel} ${b.grado} ${b.letra} ${b.areaNombre}`,
        'es'
      )
    )
  );

  readonly opcionesGradoSeccion = computed(() => {
    const vals = new Set<string>();
    this.sesionesDetalle().forEach(s => {
      if (s.gradoSeccion) vals.add(s.gradoSeccion);
    });
    this.riesgos().forEach(r => {
      if (r.gradoSeccion) vals.add(r.gradoSeccion);
    });
    return [...vals].sort((a, b) => a.localeCompare(b, 'es'));
  });

  readonly opcionesArea = computed(() => {
    const vals = new Set<string>();
    this.sesionesDetalle().forEach(s => {
      if (s.areaNombre) vals.add(s.areaNombre);
    });
    this.riesgos().forEach(r => {
      if (r.areaNombre) vals.add(r.areaNombre);
    });
    this.catalogo().forEach(c => {
      if (c.areaNombre) vals.add(c.areaNombre);
    });
    return [...vals].sort((a, b) => a.localeCompare(b, 'es'));
  });

  readonly opcionesDocente = computed(() => {
    const vals = new Set<string>();
    this.sesionesDetalle().forEach(s => {
      if (s.docenteNombre) vals.add(s.docenteNombre);
    });
    this.riesgos().forEach(r => {
      if (r.docenteNombre) vals.add(r.docenteNombre);
    });
    this.catalogo().forEach(c => {
      if (c.docenteNombre) vals.add(c.docenteNombre);
    });
    return [...vals].sort((a, b) => a.localeCompare(b, 'es'));
  });

  readonly sesionesFiltradas = computed(() => {
    const gs = this.filtroGradoSeccion();
    const area = this.filtroArea();
    const doc = this.filtroDocente();
    const est = this.filtroEstadoSesion();
    const q = this.busqueda().trim().toLowerCase();
    return this.sesionesDetalle().filter(s => {
      if (gs && s.gradoSeccion !== gs) return false;
      if (area && s.areaNombre !== area) return false;
      if (doc && s.docenteNombre !== doc) return false;
      if (est && s.estadoSesion !== est) return false;
      if (q) {
        const hay = `${s.tema} ${s.aulaAsignada ?? ''} ${s.gradoSeccion ?? ''} ${s.areaNombre ?? ''} ${s.docenteNombre}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  });

  readonly riesgosFiltrados = computed(() => {
    const gs = this.filtroGradoSeccion();
    const area = this.filtroArea();
    const doc = this.filtroDocente();
    const logro = this.filtroLogroRiesgo();
    const q = this.busqueda().trim().toLowerCase();
    return this.riesgos().filter(r => {
      if (gs && r.gradoSeccion !== gs) return false;
      if (area && r.areaNombre !== area) return false;
      if (doc && r.docenteNombre !== doc) return false;
      if (logro === 'C' && r.calificacionCualitativa !== 'C') return false;
      if (logro === 'B' && r.calificacionCualitativa !== 'B') return false;
      if (logro === 'SIN_DERIVAR' && r.derivado) return false;
      if (logro === 'DERIVADO' && !r.derivado) return false;
      if (q) {
        const hay = `${r.nombreEstudiante} ${r.dniEstudiante ?? ''} ${r.gradoSeccion ?? ''} ${r.areaNombre ?? ''} ${r.competenciaNombre ?? ''} ${r.docenteNombre} ${r.sesionTema ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  });

  readonly sesionesPaginadas = computed(() =>
    paginarRegistros(this.sesionesFiltradas(), this.paginaSesiones(), 6)
  );
  readonly riesgosPaginados = computed(() =>
    paginarRegistros(this.riesgosFiltrados(), this.paginaRiesgos(), 10)
  );
  readonly inscritosPaginados = computed(() =>
    paginarRegistros(this.inscritos(), this.paginaInscritos(), 10)
  );

  readonly kpis = computed(() => {
    const ses = this.sesionesFiltradas();
    const ries = this.riesgosFiltrados();
    const inscritos = ses.reduce((acc, s) => acc + s.totalInscritos, 0);
    const asistieron = ses.reduce((acc, s) => acc + s.asistieron, 0);
    const faltaron = ses.reduce((acc, s) => acc + s.faltaron, 0);
    const justificados = ses.reduce((acc, s) => acc + s.justificados, 0);
    const evaluados = asistieron + faltaron + justificados;
    const porcentajeAsistencia = evaluados > 0 ? Math.round((asistieron / evaluados) * 100) : 0;
    return {
      sesiones: ses.length,
      pendientesAsistencia: ses.filter(s => s.estadoSesion === 'PENDIENTE_ASISTENCIA').length,
      completadas: ses.filter(s => s.estadoSesion === 'COMPLETADA').length,
      inscritos,
      casosC: ses.reduce((acc, s) => acc + s.casosC, 0),
      casosB: ses.reduce((acc, s) => acc + s.casosB, 0),
      asistieron,
      faltaron,
      justificados,
      porcentajeAsistencia,
      riesgosTotal: ries.length,
      riesgosSinDerivar: ries.filter(r => !r.derivado).length,
      riesgosCSinDerivar: ries.filter(r => r.calificacionCualitativa === 'C' && !r.derivado).length
    };
  });

  readonly detalleSeleccionada = computed<SesionRefuerzoDetalleDto | null>(() => {
    const sel = this.seleccionada();
    if (!sel) return null;
    return this.sesionesDetalle().find(s => s.id === sel.id) ?? null;
  });

  readonly hayFiltrosActivos = computed(
    () =>
      !!this.filtroGradoSeccion() ||
      !!this.filtroArea() ||
      !!this.filtroDocente() ||
      !!this.filtroEstadoSesion() ||
      !!this.filtroLogroRiesgo() ||
      !!this.busqueda().trim()
  );

  asignacionId = 0;
  periodoId = 0;
  formPeriodoId = 0;
  tema = '';
  fecha = this.hoy;
  inicio = '15:00';
  fin = '16:00';
  aula = '';
  derivarAlGuardar = true;
  private revision = 0;
  private tableroRevision = 0;

  ngOnInit() {
    this.horarios?.catalogo?.()?.subscribe({
      next: datos => {
        this.catalogo.set(datos);
        if (!this.asignacionId && datos.length > 0) {
          this.asignacionId = datos[0].asignacionId;
          this.sincronizarAulaDesdeCatalogo(this.asignacionId);
        }
      },
      error: () => this.mostrarError('No se pudo cargar el catálogo docente.')
    });

    this.academico?.listarAsignaciones?.()?.subscribe({
      next: datos => {
        this.asignaciones.set(datos);
        if (!this.asignacionId && datos.length > 0) {
          this.asignacionId = datos[0].id;
        }
      },
      error: () => this.mostrarError('No se pudieron cargar las asignaciones.')
    });

    this.academico?.listarAulas?.()?.subscribe({
      next: aulas => this.aulas.set(aulas.filter(a => a.activa)),
      error: () => this.mostrarError('No se pudieron cargar las aulas.')
    });

    this.academico?.listarAnios?.()?.subscribe({
      next: lista => {
        this.anios.set(lista);
        const abierto = lista.find(a => a.abierto) ?? lista[0];
        if (abierto) {
          this.anioLectivoId.set(abierto.id);
          this.cargarPeriodosInicial(abierto.id);
        } else {
          this.cargarTablero();
        }
      },
      error: () => this.cargarTablero()
    });
  }

  private cargarPeriodosInicial(anioId: number) {
    this.academico?.listarPeriodos?.(anioId)?.subscribe({
      next: datos => {
        this.periodos.set(datos);
        const actual =
          datos.find(p => p.fechaInicio <= this.hoy && this.hoy <= p.fechaFin) ??
          datos.find(p => !p.cerrado) ??
          datos[datos.length - 1];
        const inicial = actual?.id ?? 0;
        this.periodoId = inicial;
        this.formPeriodoId = inicial || (datos[0]?.id ?? 0);
        this.filtroPeriodoSig.set(inicial);
        this.cargarTablero();
      },
      error: () => this.cargarTablero()
    });
  }

  cambiarAsignacion(nuevoId?: number) {
    if (nuevoId !== undefined) this.asignacionId = Number(nuevoId);
    this.sincronizarAulaDesdeCatalogo(this.asignacionId);

    // Mantiene compatibilidad si un test unitario sin catalogo() llama cambiarAsignacion() manualmente.
    if (typeof this.servicio?.tablero !== 'function') {
      const a = this.asignaciones().find(a => a.id === Number(this.asignacionId));
      this.periodoId = 0;
      this.sesiones.set([]);
      this.seleccionada.set(null);
      const revision = ++this.revision;
      if (!a) return;
      this.academico?.listarPeriodos?.(a.anioLectivoId)?.subscribe({
        next: datos => {
          if (revision !== this.revision) return;
          this.periodos.set(datos);
          const actual =
            datos.find(p => p.fechaInicio <= this.hoy && this.hoy <= p.fechaFin) ?? datos[0];
          this.periodoId = actual?.id ?? 0;
          this.cargar();
        },
        error: () => this.mostrarError('No se pudieron cargar los periodos.')
      });
    }
  }

  private sincronizarAulaDesdeCatalogo(asigId: number) {
    const opt = this.catalogo().find(c => c.asignacionId === Number(asigId));
    if (opt?.aulaCodigo && this.aulas().some(a => a.codigo === opt.aulaCodigo)) {
      this.aula = opt.aulaCodigo;
    }
  }

  onCambioPeriodo(periodo: number) {
    const id = Number(periodo) || 0;
    this.periodoId = id;
    this.filtroPeriodoSig.set(id);
    if (id > 0) this.formPeriodoId = id;
    this.paginaSesiones.set(1);
    this.paginaRiesgos.set(1);
    this.cargar();
  }

  cargar() {
    if (typeof this.servicio?.tablero === 'function') {
      this.cargarTablero();
      return;
    }
    this.seleccionada.set(null);
    this.inscritos.set([]);
    this.sesiones.set([]);
    const periodo = Number(this.periodoId);
    const asignacionId = Number(this.asignacionId);
    const asignacion = this.asignaciones().find(a => a.id === asignacionId);
    if (!periodo || !asignacion) return;
    this.servicio.listarSesiones(periodo).subscribe({
      next: datos => {
        if (periodo !== Number(this.periodoId) || asignacionId !== Number(this.asignacionId)) return;
        this.sesiones.set(
          datos.filter(
            s =>
              s.anioLectivoId === asignacion.anioLectivoId &&
              s.areaCurricularId === asignacion.areaCurricularId &&
              s.docenteUsuarioId === asignacion.docenteUsuarioId
          )
        );
      },
      error: error => {
        if (periodo === Number(this.periodoId) && asignacionId === Number(this.asignacionId))
          this.mostrarError(error?.error?.message ?? 'No se pudieron cargar las sesiones.');
      }
    });
  }

  cargarTablero() {
    if (typeof this.servicio?.tablero !== 'function') return;
    const rev = ++this.tableroRevision;
    const anio = this.anioLectivoId() || undefined;
    const per = this.filtroPeriodoSig() > 0 ? this.filtroPeriodoSig() : undefined;
    this.ocupado.set(true);
    this.servicio.tablero(anio, per).subscribe({
      next: data => {
        if (rev !== this.tableroRevision) return;
        this.ocupado.set(false);
        this.tableroData.set(data);
        this.sesionesDetalle.set(data.sesiones);
        this.riesgos.set(data.riesgos);
        this.sesiones.set(data.sesiones);
        if (data.anioLectivoId && !this.anioLectivoId()) {
          this.anioLectivoId.set(data.anioLectivoId);
        }
      },
      error: error => {
        if (rev !== this.tableroRevision) return;
        this.ocupado.set(false);
        this.mostrarError(error?.error?.message ?? 'No se pudo cargar el tablero de refuerzos.');
      }
    });
  }

  programar() {
    const opt = this.catalogo().find(c => c.asignacionId === Number(this.asignacionId));
    const asig = this.asignaciones().find(a => a.id === Number(this.asignacionId));
    const ctx = opt
      ? {
          anioLectivoId: opt.anioLectivoId,
          areaCurricularId: opt.areaId,
          docenteUsuarioId: opt.docenteUsuarioId
        }
      : asig;
    const targetPeriodo = Number(this.formPeriodoId || this.periodoId);
    if (!ctx || !targetPeriodo || this.ocupado()) return;

    if (
      !this.tema.trim() ||
      this.tema.length > 40 ||
      !this.aula ||
      this.fecha < this.hoy ||
      !this.inicio ||
      !this.fin ||
      this.fin <= this.inicio
    ) {
      this.mostrarError('Revisa el tema, aula, fecha y rango horario antes de guardar.');
      return;
    }

    this.ocupado.set(true);
    this.servicio
      .programar({
        anioLectivoId: ctx.anioLectivoId,
        periodoAcademicoId: targetPeriodo,
        areaCurricularId: ctx.areaCurricularId,
        docenteUsuarioId: ctx.docenteUsuarioId,
        tema: this.tema.trim(),
        fechaProgramada: this.fecha,
        horaInicio: this.inicio,
        horaFin: this.fin,
        aulaAsignada: this.aula
      })
      .subscribe({
        next: creada => {
          this.tema = '';
          this.mostrarFormulario.set(false);
          if (this.derivarAlGuardar) {
            this.servicio.derivarAutomatico(creada.id).subscribe({
              next: derivadas => {
                this.ocupado.set(false);
                this.mostrarExito(
                  `Sesión programada con ${derivadas.length} estudiante(s) derivado(s) automáticamente.`
                );
                this.cargarTablero();
                this.seleccionar(creada);
              },
              error: () => {
                this.ocupado.set(false);
                this.mostrarExito('Sesión programada. Puedes derivar estudiantes manualmente desde la tarjeta.');
                this.cargarTablero();
              }
            });
          } else {
            this.ocupado.set(false);
            this.mostrarExito('Sesión programada correctamente.');
            this.cargarTablero();
          }
        },
        error: e => this.fallo(e)
      });
  }

  seleccionar(s: SesionRefuerzoDto) {
    this.seleccionada.set(s);
    this.paginaInscritos.set(1);
    this.inscritos.set([]);
    this.servicio.inscripciones(s.id).subscribe({
      next: datos => {
        if (this.seleccionada()?.id === s.id) this.inscritos.set(datos);
      },
      error: e => this.fallo(e)
    });
  }

  derivar(s: SesionRefuerzoDto) {
    if (this.ocupado()) return;
    this.ocupado.set(true);
    this.servicio.derivarAutomatico(s.id).subscribe({
      next: datos => {
        this.ocupado.set(false);
        this.mostrarExito(
          datos.length > 0
            ? `Derivación completada: ${datos.length} estudiante(s) incorporado(s) a la sesión.`
            : 'No había nuevos estudiantes con B/C pendientes de derivar en esta sección.'
        );
        this.cargarTablero();
        this.seleccionar(s);
      },
      error: e => this.fallo(e)
    });
  }

  guardarAsistencia(i: InscripcionRefuerzoDto) {
    if (this.ocupado()) return;
    this.ocupado.set(true);
    this.servicio
      .asistencia({
        inscripcionId: i.id,
        estadoAsistencia: i.estadoAsistencia,
        observaciones: i.observaciones ?? ''
      })
      .subscribe({
        next: actualizada => {
          this.ocupado.set(false);
          this.inscritos.update(filas =>
            filas.map(fila =>
              fila.id === actualizada.id
                ? {
                    ...fila,
                    estadoAsistencia: actualizada.estadoAsistencia,
                    observaciones: actualizada.observaciones
                  }
                : fila
            )
          );
          this.mostrarExito('Asistencia y observación formativa guardadas.');
          this.cargarTablero();
        },
        error: e => this.fallo(e)
      });
  }

  abrirSesionPorId(sesionId: number) {
    const objetivo = this.sesionesDetalle().find(s => s.id === sesionId);
    if (!objetivo) return;
    this.vistaActiva.set('sesiones');
    this.seleccionar(objetivo);
  }

  prepararSesionDesdeRiesgo(r: EstudianteRiesgoRefuerzoDto) {
    const opt =
      this.catalogo().find(
        c =>
          c.seccionId === r.seccionId &&
          c.areaId === r.areaCurricularId &&
          c.docenteUsuarioId === r.docenteUsuarioId
      ) ??
      this.catalogo().find(
        c => c.areaId === r.areaCurricularId && c.docenteUsuarioId === r.docenteUsuarioId
      );
    if (opt) {
      this.asignacionId = opt.asignacionId;
      this.sincronizarAulaDesdeCatalogo(opt.asignacionId);
    }
    if (r.periodoAcademicoId) {
      this.formPeriodoId = r.periodoAcademicoId;
    }
    this.tema = `Refuerzo ${r.areaNombre ?? 'CNEB'}`.slice(0, 40);
    this.mostrarFormulario.set(true);
    this.mostrarExito(`Formulario prellenado para ${r.nombreEstudiante} (${r.gradoSeccion ?? ''}).`);
  }

  toggleFormulario() {
    const siguiente = !this.mostrarFormulario();
    this.mostrarFormulario.set(siguiente);
    if (siguiente && !this.formPeriodoId) {
      this.formPeriodoId = this.filtroPeriodoSig() || (this.periodos()[0]?.id ?? 0);
    }
  }

  setFiltroGradoSeccion(v: string) {
    this.filtroGradoSeccion.set(v);
    this.paginaSesiones.set(1);
    this.paginaRiesgos.set(1);
  }

  setFiltroArea(v: string) {
    this.filtroArea.set(v);
    this.paginaSesiones.set(1);
    this.paginaRiesgos.set(1);
  }

  setFiltroDocente(v: string) {
    this.filtroDocente.set(v);
    this.paginaSesiones.set(1);
    this.paginaRiesgos.set(1);
  }

  setFiltroEstadoSesion(v: string) {
    this.filtroEstadoSesion.set(v);
    this.paginaSesiones.set(1);
  }

  setFiltroLogroRiesgo(v: string) {
    this.filtroLogroRiesgo.set(v);
    this.paginaRiesgos.set(1);
  }

  setBusqueda(v: string) {
    this.busqueda.set(v);
    this.paginaSesiones.set(1);
    this.paginaRiesgos.set(1);
  }

  limpiarFiltros() {
    this.filtroGradoSeccion.set('');
    this.filtroArea.set('');
    this.filtroDocente.set('');
    this.filtroEstadoSesion.set('');
    this.filtroLogroRiesgo.set('');
    this.busqueda.set('');
    this.paginaSesiones.set(1);
    this.paginaRiesgos.set(1);
  }

  etiquetaEstadoSesion(estado: EstadoSesionRefuerzo): string {
    switch (estado) {
      case 'COMPLETADA':
        return 'Asistencia completada';
      case 'PENDIENTE_ASISTENCIA':
        return 'Pendiente de asistencia';
      case 'PROGRAMADA':
        return 'Programada';
      case 'SIN_DERIVADOS':
        return 'Sin derivados';
    }
  }

  badgeEstadoClase(estado: EstadoSesionRefuerzo): string {
    switch (estado) {
      case 'COMPLETADA':
        return 'bg-emerald-100 text-emerald-900';
      case 'PENDIENTE_ASISTENCIA':
        return 'bg-amber-100 text-amber-950';
      case 'PROGRAMADA':
        return 'bg-sky-100 text-sky-900';
      case 'SIN_DERIVADOS':
        return 'bg-slate-200 text-slate-800';
    }
  }

  puedeTomarAsistencia() {
    return (
      this.puedeRegistrarAsistencia() &&
      !!this.seleccionada() &&
      this.seleccionada()!.fechaProgramada <= this.hoy
    );
  }

  private mostrarExito(texto: string) {
    this.esError.set(false);
    this.mensaje.set(texto);
  }

  private mostrarError(texto: string) {
    this.esError.set(true);
    this.mensaje.set(texto);
  }

  private fallo(error: { error?: { message?: string } }) {
    this.ocupado.set(false);
    this.mostrarError(error?.error?.message ?? 'No se pudo completar la operación.');
  }

  descripcion(id: number) {
    const a = this.catalogo().find(opt => opt.asignacionId === id);
    return a ? `${a.grado} ${a.nivel} · ${a.letra} — ${a.areaNombre} — ${a.docenteNombre}` : 'Asignación docente';
  }
}
