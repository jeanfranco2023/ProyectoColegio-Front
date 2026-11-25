import { Component, ElementRef, inject, signal, computed, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { forkJoin, of, catchError } from 'rxjs';
import { CargaPlanillaComponent } from '../../shared/ui/carga-planilla.component';
import { EvaluacionService } from '../../core/services/evaluacion.service';
import { AsignacionHorarioOpcionDto, HorarioService } from '../../core/services/horario.service';
import { AcademicoService } from '../../core/services/academico.service';
import { MatriculaService } from '../../core/services/matricula.service';
import { FichaMatriculaResponseDto } from '../../core/models/matricula.model';
import { obtenerFotoEstudiante } from '../../core/utils/avatar.util';
import { agruparCalificacionesPorCurso, CursoCalificacionGrupo } from '../../core/utils/catalogo-cneb.util';
import { fechaActualEnPeru } from '../../core/utils/fecha-nacimiento';
import { AuthStore } from '../../core/state/auth.store';
import { AsignacionDocenteResponseDto, CompetenciaResponseDto, PeriodoResponseDto } from '../../core/models/academico.model';
import { CuadroHonorResponseDto, CalificacionResponseDto, CalificacionCualitativa } from '../../core/models/evaluacion.model';
import { UiPaginacionComponent, paginarRegistros } from '../../shared/ui/ui-paginacion.component';

type NotaCNEB = 'AD' | 'A' | 'B' | 'C' | '-';

export interface CursoRiesgoDetalle {
  areaKey: string;
  areaNombre: string;
  totalNotasC: number;
  competencias: Array<{
    nombre: string;
    periodos: string[];
  }>;
}

export interface EvaluacionAlumno {
  matriculaId: number;
  numeroOrden: number;
  estudiante: string;
  c1: NotaCNEB;
  c2: NotaCNEB;
  c3: NotaCNEB;
  conclusionDescriptiva: string;
  requiereRefuerzo: boolean | null;
  competenciaId: number;
  sugerenciaIaUtilizada?: boolean;
}

@Component({
  selector: 'app-calificaciones',
  standalone: true,
  imports: [CommonModule, FormsModule, CargaPlanillaComponent, UiPaginacionComponent],
template: `
    <main class="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-[22px] text-ui-text max-[600px]:gap-4 max-[600px]:pb-1" aria-labelledby="calificaciones-title">
      <header class="flex items-end justify-between gap-6 border-t-[3px] border-ui-divider pt-3 max-[600px]:items-stretch max-[600px]:flex-col max-[600px]:gap-[14px]">
        <div class="min-w-0">
          <div class="mb-[6px] flex flex-wrap items-center gap-2"><p class="m-0 text-[#8b6425] text-[11px] font-extrabold tracking-[.14em] leading-[1.4] uppercase">{{ puedeEditar() ? 'Evaluación docente' : 'Consulta académica' }}</p><span class="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-900">Periodo activo: <strong>{{ periodoNombreActual() }}</strong></span>@if (cambiosPendientes()) { <span class="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-2.5 py-0.5 text-xs font-extrabold text-amber-950" role="status">● Cambios pendientes de guardar</span> }</div>
          <h1 id="calificaciones-title" class="m-0 text-[#172b4d] text-[clamp(24px,3vw,34px)] font-extrabold tracking-[-.035em] leading-[1.15] tracking-[-.025em]">Matriz de Calificaciones CNEB</h1>
          <p class="mt-2 max-w-[680px] text-[#56657c] text-sm leading-[1.6]">{{ puedeEditar() ? 'Registro y evaluación por competencias conectada con la base de datos oficial.' : 'Consulta de calificaciones por periodo, sección y competencia.' }}</p>
        </div>

        <div class="flex flex-[0_0_auto] items-center justify-end gap-3 max-[600px]:items-stretch max-[600px]:flex-col">
          @if (puedeEditar()) {
            <button
              type="button"
              (click)="guardarCalificaciones()"
              [disabled]="alumnos().length === 0 || !asignacionId || !competenciaId || guardando()"
              class="inline-flex items-center justify-center gap-2 rounded-xl border border-transparent px-5 py-2.5 text-center font-sans text-sm font-bold shadow-md transition-all duration-150 cursor-pointer disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 bg-[#1d4ed8] hover:bg-[#1e40af] text-white whitespace-nowrap min-h-[44px]"
            >
              @if (guardando()) {
                <span class="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                <span>Guardando en BD…</span>
              } @else {
                <svg class="h-4 w-4" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                <span>Guardar en BD</span>
              }
            </button>
          }
        </div>
      </header>

      <!-- Alertas de guardado y cambios pendientes -->
      @if (guardadoExitoso()) {
        <div class="flex items-center justify-between gap-3 rounded-2xl border border-[#b8dfcc] bg-[#edf9f3] p-4 text-[#146c45] shadow-sm animate-fade-in" role="status">
          <div class="flex items-center gap-3">
            <span class="grid h-8 w-8 place-items-center rounded-full bg-[#d8f0e3] text-sm font-black shrink-0">✓</span>
            <div>
              <p class="m-0 text-sm font-bold">¡Calificaciones CNEB guardadas exitosamente en la base de datos oficial!</p>
              <p class="m-0 mt-0.5 text-xs text-[#146c45]/90">Los registros fueron sincronizados en el servidor. La matriz de notas y el ranking se visualizan actualizados de inmediato.</p>
            </div>
          </div>
          <button type="button" (click)="guardadoExitoso.set(false)" class="text-xs font-bold text-[#146c45] hover:underline cursor-pointer">✕</button>
        </div>
      }

      @if (cambiosPendientes()) {
        <div class="flex items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900 text-xs shadow-xs" role="alert">
          <div class="flex items-center gap-2 font-medium">
            <span class="text-base">✏️</span>
            <span>Tienes evaluaciones modificadas pendientes de guardar en la base de datos oficial.</span>
          </div>
          <button type="button" (click)="guardarCalificaciones()" class="px-3.5 py-1.5 rounded-lg bg-[#2563eb] text-white font-bold hover:bg-[#1d4ed8] transition cursor-pointer shrink-0 shadow-2xs">Guardar ahora en BD</button>
        </div>
      }

      @if (error()) {
        <div class="flex items-start gap-3 rounded-lg border border-transparent px-4 py-3 font-sans text-base leading-6 border-[var(--ui-error-border)] bg-ui-error-bg text-ui-error-text m-0 text-[13px]" role="alert">{{ error() }}</div>
      }

      @if (puedeEditar()) {
        <app-carga-planilla [asignacionId]="+asignacionId" [periodoId]="+periodoId" [seccionId]="seccionActualId" [competenciaId]="+competenciaId" (completada)="cargarCalificaciones()" />
      }

      <!-- Selector de pestañas: matriz de calificaciones y ranking anual interno -->
      <div class="flex flex-wrap items-center gap-2 border-b border-ui-divider pb-3">
        <button
          type="button"
          (click)="pestanaActiva.set('matriz')"
          [class]="pestanaActiva() === 'matriz' ? 'border-ui-action bg-ui-surface-soft text-ui-action font-bold shadow-sm' : 'border-ui-divider bg-ui-surface text-ui-muted hover:bg-ui-surface-soft/60 font-semibold'"
          class="px-4 py-2 text-sm rounded-xl border transition-all cursor-pointer inline-flex items-center gap-2"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
          Matriz CNEB por Competencia
        </button>
        <button
          type="button"
          (click)="abrirRanking()"
          [class]="pestanaActiva() === 'ranking' ? 'border-ui-gold bg-ui-warning-bg text-ui-gold font-bold shadow-sm' : 'border-ui-divider bg-ui-surface text-ui-muted hover:bg-ui-surface-soft/60 font-semibold'"
          class="px-4 py-2 text-sm rounded-xl border transition-all cursor-pointer inline-flex items-center gap-2"
        >
          <svg class="w-4 h-4 text-[#c49a58]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/></svg>
          Ranking anual interno de la sección
        </button>
      </div>

      <section class="grid min-w-0 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[minmax(110px,.65fr)_minmax(150px,.9fr)_minmax(180px,1.1fr)_minmax(220px,1.35fr)_minmax(220px,1.35fr)_auto] items-end gap-4 rounded-2xl border border-ui-divider bg-ui-surface !p-[18px] shadow-[0_5px_16px_rgb(23_43_77_/_5%)] max-[600px]:gap-[13px] max-[600px]:!p-[15px]" aria-label="Filtros de calificaciones">
        <div class="grid gap-1 font-sans text-base leading-6 text-ui-text min-w-0 m-0">
          <label class="font-sans text-[13px] leading-[1.4] font-medium text-ui-text" for="anio-calificaciones">Año</label>
          <select id="anio-calificaciones" [ngModel]="anioFiltroId()" (ngModelChange)="seleccionarAnio($event)" [disabled]="!aniosDisponibles().length" class="box-border min-h-11 w-full rounded-lg border border-ui-divider bg-ui-surface px-3 py-2 font-sans text-base leading-6 text-ui-text placeholder:text-ui-muted focus-visible:outline-3 focus-visible:outline-ui-focus focus-visible:outline-offset-2 aria-[invalid=true]:border-ui-error-border max-[600px]:!text-sm min-[601px]:!text-[13px] !rounded-xl !border-ui-control-border !text-ui-text">
            @if (!aniosDisponibles().length) { <option [ngValue]="0">Sin años</option> } @for (anio of aniosDisponibles(); track anio.id) { <option [ngValue]="anio.id">{{ anio.label }}</option> }
          </select>
        </div>

        <div class="grid gap-1 font-sans text-base leading-6 text-ui-text min-w-0 m-0">
          <label class="font-sans text-[13px] leading-[1.4] font-medium text-ui-text" for="periodo-calificaciones">Periodo Académico</label>
          <select id="periodo-calificaciones" [(ngModel)]="periodoId" (change)="cargarCalificaciones()" [disabled]="!periodos().length" class="box-border min-h-11 w-full rounded-lg border border-ui-divider bg-ui-surface px-3 py-2 font-sans text-base leading-6 text-ui-text placeholder:text-ui-muted focus-visible:outline-3 focus-visible:outline-ui-focus focus-visible:outline-offset-2 aria-[invalid=true]:border-ui-error-border max-[600px]:!text-sm min-[601px]:!text-[13px] !rounded-xl !border-ui-control-border !text-ui-text">
            @if (!periodos().length) { <option [ngValue]="0">Sin periodos disponibles</option> } @for (periodo of periodos(); track periodo.id) { <option [ngValue]="periodo.id">{{ periodo.nombre }}</option> }
          </select>
        </div>

        <div class="grid gap-1 font-sans text-base leading-6 text-ui-text min-w-0 m-0">
          <label class="font-sans text-[13px] leading-[1.4] font-medium text-ui-text" for="grado-calificaciones">Grado</label>
          <select id="grado-calificaciones" [ngModel]="gradoFiltroKey()" (ngModelChange)="seleccionarGrado($event)" [disabled]="!gradosDisponibles().length" class="box-border min-h-11 w-full rounded-lg border border-ui-divider bg-ui-surface px-3 py-2 font-sans text-base leading-6 text-ui-text placeholder:text-ui-muted focus-visible:outline-3 focus-visible:outline-ui-focus focus-visible:outline-offset-2 aria-[invalid=true]:border-ui-error-border max-[600px]:!text-sm min-[601px]:!text-[13px] !rounded-xl !border-ui-control-border !text-ui-text">
            @if (!gradosDisponibles().length) { <option value="">Sin grados disponibles</option> } @for (g of gradosDisponibles(); track g.key) { <option [value]="g.key">{{ g.label }}</option> }
          </select>
        </div>

        <div class="grid gap-1 font-sans text-base leading-6 text-ui-text min-w-0 m-0">
          <label class="font-sans text-[13px] leading-[1.4] font-medium text-ui-text" for="asignacion-calificaciones">Sección</label>
          <select id="asignacion-calificaciones" [(ngModel)]="asignacionId" (change)="cambiarAsignacion()" [disabled]="!seccionesDisponibles().length" class="box-border min-h-11 w-full rounded-lg border border-ui-divider bg-ui-surface px-3 py-2 font-sans text-base leading-6 text-ui-text placeholder:text-ui-muted focus-visible:outline-3 focus-visible:outline-ui-focus focus-visible:outline-offset-2 aria-[invalid=true]:border-ui-error-border max-[600px]:!text-sm min-[601px]:!text-[13px] !rounded-xl !border-ui-control-border !text-ui-text">
            @if (!seccionesDisponibles().length) { <option [ngValue]="0">Sin secciones disponibles</option> } @for (item of seccionesDisponibles(); track item.id) { <option [ngValue]="item.id">{{ item.seccionLabel }}</option> }
          </select>
        </div>

        <div class="grid gap-1 font-sans text-base leading-6 text-ui-text min-w-0 m-0">
          <label class="font-sans text-[13px] leading-[1.4] font-medium text-ui-text" for="competencia-calificaciones">Competencia</label>
          <select id="competencia-calificaciones" [(ngModel)]="competenciaId" (change)="cargarCalificaciones()" [disabled]="!competencias().length" class="box-border min-h-11 w-full rounded-lg border border-ui-divider bg-ui-surface px-3 py-2 font-sans text-base leading-6 text-ui-text placeholder:text-ui-muted focus-visible:outline-3 focus-visible:outline-ui-focus focus-visible:outline-offset-2 aria-[invalid=true]:border-ui-error-border max-[600px]:!text-sm min-[601px]:!text-[13px] !rounded-xl !border-ui-control-border !text-ui-text">
            @if (!competencias().length) { <option [ngValue]="0">Sin competencias disponibles</option> } @for (c of competencias(); track c.id) { <option [ngValue]="c.id">{{ c.nombre }}</option> }
          </select>
        </div>

        <div class="min-w-0">
          <button type="button" (click)="cargarCalificaciones()" [disabled]="!asignacionId || !periodoId || !competenciaId" class="inline-flex items-center justify-center gap-2 rounded-lg border border-transparent px-4 py-2 text-center font-sans text-[15px] leading-[1.25] font-semibold no-underline transition-[background-color,border-color,color,box-shadow] duration-[140ms] [cursor:pointer] focus-visible:outline-3 focus-visible:outline-ui-focus focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:border-ui-divider disabled:bg-ui-surface-soft disabled:text-ui-muted aria-disabled:cursor-not-allowed aria-disabled:border-ui-divider aria-disabled:bg-ui-surface-soft aria-disabled:text-ui-muted !border-ui-divider bg-ui-surface text-ui-text hover:bg-ui-surface-soft w-full box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px] !text-sm !leading-[1.25] whitespace-nowrap">Consultar Registros</button>
        </div>
      </section>

      @if (pestanaActiva() === 'matriz') {
      <section class="min-w-0 overflow-hidden rounded-2xl border border-ui-divider bg-ui-surface !p-0 shadow-sm" aria-label="Matriz de calificaciones">
        <div class="flex min-h-16 items-center justify-between gap-[14px] border-b border-ui-divider px-[18px] py-[14px] max-[600px]:items-start max-[600px]:flex-col max-[600px]:px-[14px]">
          <div class="flex flex-wrap items-center gap-2 max-[600px]:gap-[6px]" aria-label="Escala CNEB">
            <span class="mr-1 text-ui-text text-xs font-extrabold tracking-[.06em] uppercase max-[600px]:mb-0.5 max-[600px]:w-full">Escala CNEB:</span>
            <span class="inline-flex min-h-[26px] items-center justify-center rounded-lg border border-ui-divider bg-ui-surface-soft px-[9px] py-[3px] text-xs font-extrabold leading-[1.3] text-ui-action whitespace-nowrap">AD</span>
            <span class="inline-flex min-h-[26px] items-center justify-center rounded-lg border border-ui-success-border bg-ui-success-bg px-[9px] py-[3px] text-xs font-extrabold leading-[1.3] text-ui-success-text whitespace-nowrap">A</span>
            <span class="inline-flex min-h-[26px] items-center justify-center rounded-lg border border-ui-warning-border bg-ui-warning-bg px-[9px] py-[3px] text-xs font-extrabold leading-[1.3] text-ui-warning-text whitespace-nowrap">B</span>
            <span class="inline-flex min-h-[26px] items-center justify-center rounded-lg border border-ui-divider bg-ui-surface-soft px-[9px] py-[3px] text-xs font-extrabold leading-[1.3] text-ui-text whitespace-nowrap">C</span>
          </div>
          <p class="m-0 text-ui-muted text-xs">Total en matriz: <strong class="text-ui-text text-[13px]">{{ alumnos().length }}</strong></p>
        </div>

        <div class="flex flex-wrap items-end gap-3 border-b border-ui-divider bg-ui-surface-soft p-4">
          <label for="buscar-calificacion-input" class="grid min-w-[240px] flex-1 gap-1 text-xs font-semibold text-[#475569]">Buscar estudiante
            <input id="buscar-calificacion-input" [ngModel]="busquedaAlumno()" (ngModelChange)="busquedaAlumno.set($event); pagina.set(0)" name="buscarCalificacion" type="search" placeholder="Nombre o apellido" class="min-h-11 rounded-xl border border-ui-control-border bg-ui-surface px-3 text-sm font-normal text-ui-text focus:outline-none focus:border-ui-focus" />
          </label>
          <label for="filtro-nota-select" class="grid min-w-[170px] gap-1 text-xs font-semibold text-[#475569]">Calificación
            <select id="filtro-nota-select" [ngModel]="filtroNota()" (ngModelChange)="filtroNota.set($event); pagina.set(0)" name="filtroNotaCalificacion" class="min-h-11 rounded-xl border border-ui-control-border bg-ui-surface px-3 text-sm font-normal text-ui-text focus:outline-none focus:border-ui-focus"><option value="TODOS">Todas</option><option value="SIN_CALIFICAR">Sin calificar</option><option value="AD">AD</option><option value="A">A</option><option value="B">B</option><option value="C">C</option></select>
          </label>
          <span class="pb-3 text-xs text-[#59677a]">{{ alumnosFiltrados().length }} estudiantes</span>
        </div>
        <div class="max-w-full overflow-x-auto rounded-2xl border border-ui-divider bg-ui-surface min-w-0">
          <table class="w-full border-collapse text-left font-sans text-base leading-6 text-ui-text [&_th]:px-4 [&_th]:py-3 [&_th]:align-middle [&_th]:border-b [&_th]:border-ui-divider [&_td]:px-4 [&_td]:py-3 [&_td]:align-middle [&_td]:border-b [&_td]:border-ui-divider [&_th]:bg-ui-surface-soft [&_th]:text-ui-action [&_th]:text-[13px] [&_th]:leading-[1.5] [&_th]:font-bold [&_tr:last-child_td]:border-b-0 [&_thead]:!bg-ui-surface-soft [&_tbody_tr]:bg-ui-surface [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:!bg-ui-surface-soft/75" data-mobile-table-scroll="">
            <thead>
              <tr>
                <th scope="col" class="w-16 text-center whitespace-nowrap">N°</th>
                <th scope="col" class="sticky left-0 z-[2] bg-ui-surface-soft text-ui-action whitespace-nowrap shadow-[4px_0_10px_rgb(23_43_77_/_6%)]">Estudiante / Matrícula</th>
                <th scope="col" class="whitespace-nowrap">Calificación</th>
                <th scope="col" class="whitespace-nowrap">Conclusión</th>
                <th scope="col" class="whitespace-nowrap">Refuerzo</th>
                <th scope="col" class="sticky right-0 z-[2] min-w-[128px] whitespace-nowrap bg-[#f6f8fb] text-right shadow-[-8px_0_12px_rgb(23_43_77_/_8%)]">{{ puedeEditar() ? 'Acciones' : 'Detalle' }}</th>
              </tr>
            </thead>
            <tbody>
              @if (cargando()) {
                <tr>
                  <td colspan="6">
                    <div class="grid min-h-[220px] content-center justify-items-center gap-2 p-6 text-center" role="status" aria-live="polite">
                      <span class="mb-1 h-[30px] w-[30px] rounded-full border-[3px] border-ui-divider border-t-[var(--ui-action)] animate-[grade-spin_.8s_linear_infinite]" aria-hidden="true"></span>
                      <span class="text-ui-text text-sm font-bold">Consultando calificaciones</span>
                      <span class="max-w-[48ch] text-ui-muted text-xs leading-[1.5]">Espera mientras se carga la matriz.</span>
                    </div>
                  </td>
                </tr>
              } @else {
                @for (alumno of alumnosPagina(); track alumno.matriculaId) {
                  <tr [ngClass]="alumno.c1 === '-' ? '[&>td]:bg-[#fffaf0] [&>td:first-child]:shadow-[inset_3px_0_#d4a239] [&>td:last-child]:bg-[#fffaf0]' : ''">
                    <td class="w-16 text-center text-[#64748b] tabular-nums" data-label="N°">{{ alumno.numeroOrden }}</td>
                    <td class="sticky left-0 z-[1] bg-white shadow-[4px_0_10px_rgb(23_43_77_/_6%)]" data-label="Estudiante / Matrícula">
                      <div class="inline-flex items-center gap-2.5 text-left">
                        <img [src]="obtenerFotoAlumnoFila(alumno)" [alt]="alumno.estudiante" class="w-8 h-8 rounded-full object-cover border border-slate-200 shadow-2xs shrink-0 bg-slate-100" />
                        <span class="font-bold text-ui-text text-sm leading-snug">{{ alumno.estudiante }}</span>
                      </div>
                    </td>
                    <td class="text-center" data-label="Calificación">
                      @if (alumno.c1 === '-') {
                        <span class="inline-flex min-h-[26px] items-center justify-center rounded-lg border border-ui-divider bg-ui-surface-soft px-[9px] py-[3px] text-xs font-extrabold leading-[1.3] text-ui-muted whitespace-nowrap">Sin calificar</span>
                      } @else {
                        <span class="inline-flex min-h-[26px] items-center justify-center rounded-lg border px-[9px] py-[3px] text-xs font-extrabold leading-[1.3] whitespace-nowrap" [ngClass]="{ 'border-ui-divider bg-ui-surface-soft text-ui-action': alumno.c1 === 'AD', 'border-[var(--ui-success-border)] bg-[var(--ui-success-bg)] text-[var(--ui-success-text)]': alumno.c1 === 'A', 'border-[var(--ui-warning-border)] bg-[var(--ui-warning-bg)] text-[var(--ui-warning-text)]': alumno.c1 === 'B', 'border-ui-divider bg-ui-surface-soft text-ui-text': alumno.c1 === 'C' }">{{ alumno.c1 }}</span>
                      }
                    </td>
                    <td class="max-w-[320px] overflow-hidden text-ellipsis whitespace-nowrap text-ui-muted" [title]="alumno.conclusionDescriptiva || 'Sin conclusión'" data-label="Conclusión">{{ alumno.conclusionDescriptiva || 'Sin conclusión' }}</td>
                    <td data-label="Refuerzo">
                      @if (alumno.requiereRefuerzo === true) {
                        @if (esPeriodoAplicableRefuerzo(periodoId)) {
                          <span class="inline-flex min-h-[26px] items-center justify-center rounded-lg border border-ui-error-border bg-ui-surface-soft px-[9px] py-[3px] text-xs font-[650] leading-[1.3] text-ui-text whitespace-nowrap">CNEB C</span>
                        } @else {
                          <span class="inline-flex min-h-[26px] items-center justify-center rounded-lg border border-ui-divider bg-ui-surface-soft px-[9px] py-[3px] text-xs font-[650] leading-[1.3] text-ui-muted whitespace-nowrap">No aplica (concluido)</span>
                        }
                      } @else if (alumno.requiereRefuerzo === false) {
                        <span class="inline-flex min-h-[26px] items-center justify-center rounded-lg border border-ui-divider bg-ui-surface-soft px-[9px] py-[3px] text-xs font-[650] leading-[1.3] text-ui-muted whitespace-nowrap">Normal</span>
                      } @else {
                        <span class="inline-flex min-h-[26px] items-center justify-center rounded-lg border border-ui-divider bg-ui-surface-soft px-[9px] py-[3px] text-xs font-[650] leading-[1.3] text-ui-muted whitespace-nowrap">Sin dato</span>
                      }
                    </td>
                    <td class="sticky right-0 z-[1] min-w-[128px] bg-white text-right shadow-[-8px_0_12px_rgb(23_43_77_/_8%)]" [attr.data-label]="puedeEditar() ? 'Acciones' : 'Detalle'">
                      <div class="inline-flex items-center gap-1.5 justify-end">
                        <button type="button" (click)="verMetricasAlumno(alumno)" class="rounded-lg border border-[#d9e1ec] bg-[#f8fafc] hover:bg-blue-50 hover:border-blue-300 text-[#173b67] px-2.5 py-1.5 text-xs font-semibold inline-flex items-center gap-1.5 shadow-2xs transition cursor-pointer whitespace-nowrap" title="Ver ficha y métricas de {{ alumno.estudiante }}">
                          <span>📊</span>
                          <span>Métricas</span>
                        </button>
                        @if (puedeEditar()) {
                          <button type="button" (click)="abrirEdicion(alumno)" class="inline-flex items-center justify-center gap-2 rounded-lg border border-ui-divider bg-ui-surface text-ui-action hover:bg-ui-surface-soft px-3 py-1.5 text-xs font-semibold box-border cursor-pointer">Editar</button>
                        }
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="6">
                      <div class="grid min-h-[220px] content-center justify-items-center gap-2 p-6 text-center">
                        <span class="grid h-[42px] w-[42px] place-items-center rounded-[14px] bg-ui-info-bg text-ui-info-text text-lg" aria-hidden="true">✓</span>
                        <span class="text-ui-text text-sm font-bold">No hay calificaciones para mostrar</span>
                        <span class="max-w-[48ch] text-ui-muted text-xs leading-[1.5]">Selecciona un periodo y una asignación con matrículas para consultar la matriz.</span>
                      </div>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
        <ui-paginacion
          [totalRegistros]="alumnosFiltrados().length"
          [paginaActual]="pagina() + 1"
          [tamanoPagina]="tamanoPagina()"
          etiqueta="estudiantes"
          ariaLabel="Paginación de calificaciones"
          (cambioPagina)="cambiarPagina($event)"
        />
      </section>
      }

      @if (pestanaActiva() === 'ranking') {
        <section class="space-y-6" aria-label="Ranking anual interno de la sección">
          @if (rankingError()) { <p class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">{{ rankingError() }}</p> }
          @if (rankingCargando()) { <p class="text-sm text-slate-600" role="status">Consultando el ranking anual interno de la sección…</p> }
          <!-- Podio para los tres primeros puestos devueltos por el servicio -->
          @if (rankingAlumnos().length >= 3) {
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <!-- 2do Puesto -->
              <div class="order-2 md:order-1 p-5 rounded-2xl border-2 border-slate-200 bg-gradient-to-b from-slate-50 to-white shadow-sm flex flex-col justify-between items-center text-center">
                <span class="w-10 h-10 rounded-full bg-slate-200 text-slate-700 font-extrabold flex items-center justify-center text-base mb-2">2°</span>
                <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">Puesto 2</span>
                <h3 class="text-base font-bold text-[#14213d] mt-1">{{ rankingAlumnos()[1].nombreCompleto }}</h3>
                <div class="mt-3 flex items-center gap-2">
                  <span class="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">Puntaje {{ rankingAlumnos()[1].puntajePromedioInterno | number:'1.2-2' }}</span>
                  <span class="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">{{ rankingAlumnos()[1].porcentajeAsistencia }}% Asist.</span>
                </div>
                <p class="text-[11px] text-slate-500 mt-2 font-medium">{{ rankingAlumnos()[1].totalIncidencias }} incidencias</p>
              </div>

              <!-- 1er Puesto (Oro / Destacado) -->
              <div class="order-1 md:order-2 p-6 rounded-2xl border-2 border-[#c49a58] bg-gradient-to-b from-[#fffbf2] to-white shadow-md flex flex-col justify-between items-center text-center scale-105">
                <span class="w-12 h-12 rounded-full bg-[#fceecf] text-[#936622] font-black flex items-center justify-center text-lg mb-2 shadow-inner">👑 1°</span>
                <span class="text-xs font-extrabold text-[#936622] uppercase tracking-wider">Puesto 1</span>
                <h3 class="text-lg font-extrabold text-[#14213d] mt-1">{{ rankingAlumnos()[0].nombreCompleto }}</h3>
                <div class="mt-3 flex items-center gap-2">
                  <span class="px-3 py-1 rounded-full text-xs font-black bg-[#fef3c7] text-[#92400e] border border-[#fde68a]">Puntaje {{ rankingAlumnos()[0].puntajePromedioInterno | number:'1.2-2' }}</span>
                  <span class="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">{{ rankingAlumnos()[0].porcentajeAsistencia }}% Asist.</span>
                </div>
                <span class="inline-block mt-2 px-3 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">{{ rankingAlumnos()[0].totalIncidencias }} incidencias registradas</span>
              </div>

              <!-- 3er Puesto -->
              <div class="order-3 md:order-3 p-5 rounded-2xl border-2 border-amber-200 bg-gradient-to-b from-amber-50/40 to-white shadow-sm flex flex-col justify-between items-center text-center">
                <span class="w-10 h-10 rounded-full bg-amber-100 text-amber-800 font-extrabold flex items-center justify-center text-base mb-2">3°</span>
                <span class="text-xs font-bold text-amber-700 uppercase tracking-wider">Puesto 3</span>
                <h3 class="text-base font-bold text-[#14213d] mt-1">{{ rankingAlumnos()[2].nombreCompleto }}</h3>
                <div class="mt-3 flex items-center gap-2">
                  <span class="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">Puntaje {{ rankingAlumnos()[2].puntajePromedioInterno | number:'1.2-2' }}</span>
                  <span class="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">{{ rankingAlumnos()[2].porcentajeAsistencia }}% Asist.</span>
                </div>
                <p class="text-[11px] text-slate-500 mt-2 font-medium">{{ rankingAlumnos()[2].totalIncidencias }} incidencias</p>
              </div>
            </div>
          }

          <!-- Tabla de ranking por sección -->
          <div class="rounded-2xl border border-ui-divider bg-ui-surface overflow-hidden shadow-sm">
            <div class="p-4 border-b border-ui-divider bg-ui-surface-soft flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 class="text-base font-bold text-ui-text m-0">Ranking anual interno de la sección</h3>
                <p class="text-xs text-[#59677a] m-0 mt-0.5">{{ rankingDisclaimer() }}</p>
              </div>
              <span class="px-3 py-1 rounded-lg text-xs font-semibold bg-ui-surface border border-ui-divider text-ui-text">{{ rankingAlumnos().length }} estudiantes evaluados</span>
            </div>

            <div class="overflow-x-auto scrollbar-hidden">
              <table class="w-full text-left text-sm">
                <thead class="bg-ui-surface-soft text-ui-action text-xs uppercase font-bold tracking-wider border-b border-ui-divider">
                  <tr>
                    <th scope="col" class="py-3 px-4 text-center w-16">Puesto</th>
                    <th scope="col" class="py-3 px-4">Estudiante</th>
                    <th scope="col" class="py-3 px-4 text-center">Puntaje interno</th>
                    <th scope="col" class="py-3 px-4 text-center">Asistencia (%)</th>
                    <th scope="col" class="py-3 px-4 text-center">Incidencias registradas</th>
                    <th scope="col" class="py-3 px-4 text-right">Mención</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-ui-divider bg-ui-surface [&_tr]:transition-colors [&_tr:hover]:bg-ui-surface-soft/75">
                  @for (item of rankingPaginado(); track item.matriculaId) {
                    <tr class="hover:bg-slate-50/80 transition-colors" [class.bg-amber-50]="item.puesto === 1" [class.bg-slate-50]="item.puesto === 2">
                      <td class="py-3 px-4 text-center">
                        @if (item.puesto === 1) {
                          <span class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 text-[#92400e] font-black text-xs">1°</span>
                        } @else if (item.puesto === 2) {
                          <span class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-200 text-slate-700 font-black text-xs">2°</span>
                        } @else if (item.puesto === 3) {
                          <span class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-200/60 text-amber-900 font-black text-xs">3°</span>
                        } @else {
                          <span class="text-slate-500 font-bold text-xs">{{ item.puesto }}</span>
                        }
                      </td>
                      <td class="py-3 px-4 font-bold text-ui-text">{{ item.nombreCompleto }}</td>
                      <td class="py-3 px-4 text-center">
                        <span class="px-2.5 py-1 rounded-md text-xs font-bold"
                          [class.bg-blue-100]="item.puntajePromedioInterno >= 3.5"
                          [class.text-blue-800]="item.puntajePromedioInterno >= 3.5"
                          [class.bg-emerald-100]="item.puntajePromedioInterno >= 2.5 && item.puntajePromedioInterno < 3.5"
                          [class.text-emerald-800]="item.puntajePromedioInterno >= 2.5 && item.puntajePromedioInterno < 3.5"
                          [class.bg-amber-100]="item.puntajePromedioInterno < 2.5"
                          [class.text-amber-800]="item.puntajePromedioInterno < 2.5">
                          {{ item.puntajePromedioInterno | number:'1.2-2' }}
                        </span>
                      </td>
                      <td class="py-3 px-4 text-center font-mono font-medium text-slate-700">{{ item.porcentajeAsistencia }}%</td>
                      <td class="py-3 px-4 text-center">{{ item.totalIncidencias }}</td>
                      <td class="py-3 px-4 text-right">
                        <span class="text-xs font-semibold text-ui-action">{{ item.mencionHonor }}</span>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="6" class="text-center py-10 text-slate-500">
                        <p class="font-medium text-slate-600 m-0">No hay alumnos matriculados con calificaciones para esta sección.</p>
                        <p class="text-xs text-slate-400 m-0 mt-1">Selecciona una sección asignada y vuelve a consultar.</p>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <ui-paginacion
              [totalRegistros]="rankingAlumnos().length"
              [paginaActual]="paginaRanking()"
              [tamanoPagina]="10"
              etiqueta="estudiantes"
              ariaLabel="Paginación de ranking anual"
              (cambioPagina)="paginaRanking.set($event)"
            />
          </div>

        </section>
      }

      @if (puedeEditar()) {
      <dialog #edicionDialog class="fixed inset-0 m-auto w-[min(620px,calc(100vw-24px))] max-w-[calc(100vw-24px)] max-h-[calc(100dvh-24px)] overflow-hidden rounded-[20px] border border-[#e1e8f1] bg-white p-0 text-[#172b4d] font-sans shadow-[0_24px_72px_rgb(15_31_57_/_24%)] backdrop:bg-[rgb(15_31_57_/_48%)] backdrop:backdrop-blur-[3px]" aria-labelledby="calificacion-dialog-title">
        <div class="flex min-h-0 max-h-[calc(100dvh-24px)] flex-col">
          <header class="flex flex-[0_0_auto] items-center justify-between gap-4 border-b border-ui-divider px-6 py-5 max-[600px]:px-4">
            <div><p class="m-0 mb-[6px] text-ui-muted text-[11px] font-extrabold tracking-[.14em] leading-[1.4] uppercase">Matriz CNEB</p><h2 id="calificacion-dialog-title" class="m-0 text-ui-text text-xl font-extrabold tracking-[-.025em]">Editar evaluación</h2><p class="mt-[5px] mb-0 text-ui-muted text-[13px]">{{ alumnoEditando()?.estudiante }}</p></div>
            <button type="button" class="grid h-11 w-11 min-h-11 min-w-11 flex-none place-items-center rounded-[11px] border border-ui-divider bg-ui-surface-soft text-ui-muted text-lg cursor-pointer !h-[38px] !w-[38px] !min-h-[38px] !min-w-[38px] !flex-[0_0_38px] !text-base !leading-6" (click)="cerrarEdicion()" aria-label="Cerrar">✕</button>
          </header>
          <form (ngSubmit)="aplicarEdicion()" class="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div class="grid min-h-0 flex-1 gap-[18px] overflow-auto px-6 py-[22px] max-[600px]:px-4">
              <label for="calif-evidencia-input" class="grid gap-2 text-sm">Evidencia de aprendizaje, sin nombres ni DNI
                <textarea id="calif-evidencia-input" [(ngModel)]="evidenciaObservada" name="evidencia" maxlength="300" rows="2" class="rounded-lg border p-3"></textarea>
              </label>
              <button type="button" class="min-h-11 rounded-lg border border-ui-info-border bg-ui-info-bg p-2 text-ui-info-text disabled:opacity-50" (click)="sugerirConclusionConIa()" [disabled]="generandoIa() || notaEditada === '-' || !evidenciaObservada.trim()">{{ generandoIa() ? 'Generando sugerencia…' : 'Sugerir conclusión con IA' }}</button>
              <p role="status" class="text-sm">{{ mensajeIa() }}</p>
              <label class="grid gap-1 font-sans text-base leading-6 text-ui-text m-0 gap-[7px]">
                <span class="font-sans text-[13px] leading-[1.4] font-medium text-ui-text">Calificación CNEB *</span>
                <select id="calif-nota-cneb-select" [(ngModel)]="notaEditada" name="nota" required class="box-border min-h-11 w-full rounded-lg border border-ui-divider bg-ui-surface px-3 py-2 font-sans text-base leading-6 text-ui-text placeholder:text-ui-muted focus-visible:outline-3 focus-visible:outline-ui-focus focus-visible:outline-offset-2 aria-[invalid=true]:border-ui-error-border box-border min-h-11 w-full rounded-lg border border-ui-divider bg-ui-surface px-3 py-2 font-sans text-base leading-6 text-ui-text focus-visible:outline-3 focus-visible:outline-ui-focus focus-visible:outline-offset-2 aria-[invalid=true]:border-ui-error-border !min-h-[46px] !text-sm max-[600px]:!text-base min-w-0 !min-h-[46px] max-w-full border px-3 py-[10px] !border-ui-control-border rounded-xl !bg-ui-surface !text-ui-text transition-colors focus:border-[var(--ui-focus)] focus:outline-none focus:shadow-[0_0_0_3px_var(--ui-focus-shadow)] max-[639px]:text-base !py-2">
                  <option value="-" disabled>Seleccione</option>
                  <option value="AD">AD · Logro destacado</option>
                  <option value="A">A · Logro esperado</option>
                  <option value="B">B · En proceso</option>
                  <option value="C">C · En inicio</option>
                </select>
              </label>
              <label class="grid gap-1 font-sans text-base leading-6 text-ui-text m-0 gap-[7px]">
                <span class="font-sans text-[13px] leading-[1.4] font-medium text-ui-text">Conclusión descriptiva</span>
                <textarea id="calif-conclusion-textarea" [(ngModel)]="conclusionEditada" name="conclusion" maxlength="4000" rows="5" placeholder="Describe los avances y aspectos por reforzar" class="box-border min-h-11 w-full rounded-lg border border-ui-divider bg-ui-surface px-3 py-2 font-sans text-base leading-6 text-ui-text placeholder:text-ui-muted focus-visible:outline-3 focus-visible:outline-ui-focus focus-visible:outline-offset-2 aria-[invalid=true]:border-ui-error-border !min-h-[130px] !text-sm !leading-5 max-[600px]:!text-base max-[600px]:!leading-6 resize-y min-w-0 !min-h-[44px] max-w-full border px-3 py-[10px] !border-ui-control-border rounded-xl !bg-ui-surface !text-ui-text transition-colors focus:border-[var(--ui-focus)] focus:outline-none focus:shadow-[0_0_0_3px_var(--ui-focus-shadow)] max-[639px]:text-base min-h-[100px] py-[10px] resize-y"></textarea>
              </label>
              @if (notaEditada === 'C') {
              <p class="m-0 -mt-[6px] rounded-[10px] border border-ui-divider bg-ui-warning-bg px-3 py-[10px] text-ui-warning-text text-xs leading-[1.5]">
                {{ esPeriodoAplicableRefuerzo(periodoId) ? 'Esta calificación marcará al estudiante para refuerzo en este bimestre.' : 'Este bimestre ya concluyó: se registra la nota C en el historial sin abrir reforzamiento.' }}
              </p>
            }
            </div>
            <footer class="sticky bottom-0 flex flex-[0_0_auto] justify-end gap-[10px] border-t border-ui-divider bg-ui-surface px-6 py-[14px] max-[600px]:flex-col-reverse max-[600px]:px-4 max-[600px]:py-3">
              <button type="button" class="inline-flex items-center justify-center gap-2 rounded-lg border border-transparent px-4 py-2 text-center font-sans !text-sm !leading-[1.25] !font-semibold no-underline transition-[background-color,border-color,color,box-shadow] duration-[140ms] [cursor:pointer] focus-visible:outline-3 focus-visible:outline-ui-focus focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:border-ui-divider disabled:bg-ui-surface-soft disabled:text-ui-muted aria-disabled:cursor-not-allowed aria-disabled:border-ui-divider aria-disabled:bg-ui-surface-soft aria-disabled:text-ui-muted border-ui-divider bg-ui-surface text-ui-text hover:bg-ui-surface-soft max-[600px]:w-full box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px] !border-ui-divider" (click)="cerrarEdicion()">Cancelar</button>
              <button type="submit" [disabled]="notaEditada === '-'" class="inline-flex items-center justify-center gap-2 rounded-lg border border-transparent px-4 py-2 text-center font-sans !text-sm !leading-[1.25] !font-semibold no-underline transition-[background-color,border-color,color,box-shadow] duration-[140ms] [cursor:pointer] focus-visible:outline-3 focus-visible:outline-ui-focus focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:border-ui-divider disabled:bg-ui-surface-soft disabled:text-ui-muted aria-disabled:cursor-not-allowed aria-disabled:border-ui-divider aria-disabled:bg-ui-surface-soft aria-disabled:text-ui-muted bg-ui-action text-ui-action-text hover:bg-ui-action !bg-ui-action max-[600px]:w-full box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]">Aplicar cambios</button>
            </footer>
          </form>
        </div>
      </dialog>
      }
    
      <!-- Modal de Métricas y Desempeño Individual del Estudiante -->
      <dialog #metricasDialog class="fixed inset-0 m-auto w-[min(780px,calc(100vw-24px))] max-w-[calc(100vw-24px)] max-h-[calc(100dvh-24px)] overflow-hidden rounded-[24px] border border-[#d9e1ec] bg-white p-0 text-[#172b4d] font-sans shadow-[0_28px_90px_rgb(15_31_57_/_28%)] backdrop:bg-[rgb(12_24_43_/_46%)] backdrop:backdrop-blur-[3px]" aria-labelledby="metricas-dialog-title">
        <div class="flex min-h-0 max-h-[calc(100dvh-24px)] flex-col">
          <!-- Cabecera Institucional -->
          <header class="flex flex-[0_0_auto] flex-wrap items-center justify-between gap-4 border-b border-[#e5eaf2] bg-[#f8faff] px-6 py-5 max-[639px]:p-4">
            <div class="flex items-center gap-3.5 min-w-0">
              <div class="relative shrink-0">
                <img
                  [src]="fotoAlumnoMetricas()"
                  [alt]="alumnoMetricas()?.estudiante"
                  class="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover border-2 border-white shadow-md bg-slate-100"
                />
                <span
                  class="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-black"
                  [class.bg-emerald-500]="!tieneProblemas()"
                  [class.bg-rose-500]="tieneProblemas()"
                  [class.text-white]="true"
                >
                  {{ tieneProblemas() ? '!' : '✓' }}
                </span>
              </div>
              <div class="min-w-0">
                <span class="text-[11px] font-black tracking-[.14em] text-[#c49a58] uppercase block">Ficha Integral de Desempeño CNEB</span>
                <h2 id="metricas-dialog-title" class="m-0 text-lg sm:text-xl font-extrabold text-[#172b4d] tracking-[-.025em] leading-tight truncate">
                  {{ alumnoMetricas()?.estudiante }}
                </h2>
                <div class="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-[#59677a]">
                  <span class="px-2 py-0.5 rounded-md font-semibold bg-blue-50 text-blue-900 border border-blue-200">
                    DNI: <strong class="font-bold text-[#172b4d]">{{ dniAlumnoMetricas() }}</strong>
                  </span>
                  <span class="px-2 py-0.5 rounded-md font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                    {{ gradoSeccionMetricas() }}
                  </span>
                  <span class="px-2 py-0.5 rounded-md font-semibold bg-amber-50 text-amber-900 border border-amber-200">
                    Alcance: <strong class="font-bold">{{ alcancePeriodoMetrica() === 'PERIODO_ACTUAL' && periodoId > 0 ? periodoNombreActual() : 'Año completo' }}</strong>
                  </span>
                </div>
              </div>
            </div>
            <div class="flex flex-wrap items-center gap-2 ml-auto">
              @if (periodoId > 0) {
                <span class="px-3 py-1.5 rounded-xl bg-[#173B67] text-white text-xs font-bold whitespace-nowrap shadow-2xs">
                  {{ periodoNombreActual() }}
                </span>
                @if (!esPeriodoAplicableRefuerzo(periodoId)) {
                  <span class="px-2.5 py-1 rounded-xl border border-slate-300 bg-slate-100 text-slate-700 text-[11px] font-bold whitespace-nowrap">
                    Bimestre concluido · Sin reforzamiento
                  </span>
                }
              }
              <button type="button" class="grid h-10 w-10 min-h-10 min-w-10 place-items-center rounded-xl border border-[#d9e1ec] bg-white text-[#64748b] hover:text-[#0f172a] hover:bg-slate-50 transition cursor-pointer shrink-0" (click)="cerrarMetricas()" aria-label="Cerrar">✕</button>
            </div>
          </header>

          <!-- Cuerpo con scroll -->
          <div class="min-h-0 flex-1 overflow-y-auto px-6 py-5 space-y-5 max-[639px]:p-4">
            <!-- 1. Banner superior de desempeño dinámico -->
            @if (tieneProblemas()) {
              <div class="rounded-2xl border-2 border-rose-300 bg-gradient-to-r from-rose-50 to-amber-50/40 p-4 sm:p-5 shadow-xs">
                <div class="flex items-start gap-3.5">
                  <div class="w-10 h-10 rounded-xl bg-rose-100 border border-rose-200 text-rose-700 flex items-center justify-center text-xl shrink-0 shadow-2xs">
                    ⚠️
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex flex-wrap items-center justify-between gap-2">
                      <div class="flex flex-wrap items-center gap-2">
                        <h4 class="font-extrabold text-sm text-[#991b1b] uppercase tracking-wide m-0">Alumno en Riesgo Académico</h4>
                        @if (esPeriodoAplicableRefuerzo(periodoId)) {
                          <span class="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-rose-600 text-white">Requiere Refuerzo Pedagógico</span>
                        } @else {
                          <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-200 text-slate-700">Bimestre concluido · Reforzamiento ya no aplica</span>
                        }
                      </div>
                      <span class="px-2.5 py-0.5 rounded-lg bg-white border border-rose-200 text-[11px] font-bold text-rose-800">
                        {{ cursosEnRiesgoDetalle().length }} área(s) con Nota C
                      </span>
                    </div>
                    <p class="text-xs text-[#7f1d1d] mt-1.5 leading-relaxed font-medium m-0">
                      Detalle consolidado por área curricular y competencias en inicio (<strong class="font-bold">Nota C</strong>):
                    </p>
                    <div class="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      @for (curso of cursosEnRiesgoDetalle(); track curso.areaKey) {
                        <div class="rounded-xl border border-rose-200 bg-white/95 p-3 shadow-2xs">
                          <div class="flex items-center justify-between gap-2 pb-1.5 border-b border-rose-100">
                            <div class="flex items-center gap-2 min-w-0">
                              <span class="w-2.5 h-2.5 rounded-full bg-rose-600 shrink-0"></span>
                              <span class="font-extrabold text-xs text-rose-950 truncate" [title]="curso.areaNombre">{{ curso.areaNombre }}</span>
                            </div>
                            <span class="shrink-0 px-2 py-0.5 rounded-md bg-rose-100 text-[10px] font-black text-rose-800">
                              Nota C · {{ curso.competencias.length }} comp.
                            </span>
                          </div>
                          <ul class="mt-2 space-y-1 text-[11px] text-rose-950/90 list-none p-0 m-0">
                            @for (comp of curso.competencias; track comp.nombre) {
                              <li class="flex items-start justify-between gap-2 leading-snug">
                                <span class="flex items-start gap-1.5">
                                  <span class="text-rose-500 font-bold">•</span>
                                  <span>{{ comp.nombre }}</span>
                                </span>
                                @if (alcancePeriodoMetrica() === 'ANIO_COMPLETO' && comp.periodos.length > 0) {
                                  <span class="shrink-0 px-1.5 py-0.5 rounded bg-rose-50 border border-rose-200 text-[10px] font-semibold text-rose-700">
                                    {{ comp.periodos.join(', ') }}
                                  </span>
                                }
                              </li>
                            }
                          </ul>
                        </div>
                      }
                    </div>
                    <p class="text-[11px] text-rose-800 mt-3 m-0 font-medium">
                      {{ esPeriodoAplicableRefuerzo(periodoId)
                        ? 'Acción institucional: Acompañamiento y sesiones de refuerzo generadas automáticamente según normativa CNEB para el bimestre pendiente.'
                        : 'Registro histórico del bimestre: este bimestre ya concluyó, por lo que su reforzamiento no aplica ni se acumula para el siguiente bimestre.' }}
                    </p>
                  </div>
                </div>
              </div>
            } @else if (esAlumnoDestacado()) {
              <div class="rounded-2xl border-2 border-[#c49a58] bg-gradient-to-r from-[#fffbf2] to-[#fef3c7]/60 p-4 shadow-xs">
                <div class="flex items-start gap-3.5">
                  <div class="w-10 h-10 rounded-xl bg-[#fceecf] border border-[#f3d99d] text-[#936622] flex items-center justify-center text-xl shrink-0 shadow-inner">
                    👑
                  </div>
                  <div>
                    <div class="flex flex-wrap items-center gap-2">
                      <h4 class="font-black text-sm text-[#92400e] uppercase tracking-wide m-0">Alumno Destacado</h4>
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#c49a58] text-white">Rendimiento Sobresaliente</span>
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">Logro Destacado AD / A</span>
                    </div>
                    <p class="text-xs text-[#78350f] mt-1.5 leading-relaxed font-medium m-0">
                      ¡Felicitaciones! El estudiante demuestra un dominio sobresaliente y autónomo de las competencias evaluadas, con calificaciones predominantes de Logro Esperado (A) y Logro Destacado (AD), sin presentar asignaturas en riesgo ni observaciones de refuerzo.
                    </p>
                  </div>
                </div>
              </div>
            } @else if (cantBMetrica() > 0 || totalCompetenciasMetrica() > 0) {
              <div class="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50/80 to-indigo-50/40 p-4 shadow-xs">
                <div class="flex items-start gap-3.5">
                  <div class="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center text-xl shrink-0">
                    📘
                  </div>
                  <div>
                    <div class="flex items-center gap-2">
                      <h4 class="font-extrabold text-sm text-blue-900 uppercase tracking-wide m-0">Desempeño Regular en Proceso</h4>
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-200/70 text-blue-900">En Proceso de Logro</span>
                    </div>
                    <p class="text-xs text-blue-800 mt-1.5 leading-relaxed m-0 font-medium">
                      El estudiante progresa continuamente en el desarrollo de las competencias previstas para el ciclo, consolidando los aprendizajes hacia el logro esperado.
                    </p>
                  </div>
                </div>
              </div>
            } @else {
              <div class="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-600 flex items-center gap-2">
                <span>ℹ️</span>
                <span>Evaluación en proceso de registro para este estudiante.</span>
              </div>
            }

            <!-- 2. Tarjetas Resumen CNEB -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div class="rounded-xl border border-[#173B67]/30 bg-gradient-to-b from-[#173B67] to-[#122844] p-3.5 text-center text-white shadow-xs">
                <span class="text-[11px] font-bold text-[#c49a58] uppercase tracking-wider block">Logro Destacado</span>
                <span class="text-2xl font-black text-white mt-1 block">{{ cantAdMetrica() }}</span>
                <span class="inline-block px-2 py-0.5 mt-1 rounded-md text-[10px] font-extrabold bg-[#c49a58]/20 text-[#fef3c7] border border-[#c49a58]/40">Nota AD · {{ porcentajeMetrica(cantAdMetrica()) }}%</span>
              </div>
              <div class="rounded-xl border border-[#b8dfcc] bg-[#edf9f3] p-3.5 text-center shadow-xs">
                <span class="text-[11px] font-bold text-[#146c45] uppercase tracking-wider block">Logro Esperado</span>
                <span class="text-2xl font-black text-[#146c45] mt-1 block">{{ cantAMetrica() }}</span>
                <span class="inline-block px-2 py-0.5 mt-1 rounded-md text-[10px] font-extrabold bg-[#d8f0e3] text-[#146c45]">Nota A · {{ porcentajeMetrica(cantAMetrica()) }}%</span>
              </div>
              <div class="rounded-xl border border-[#edca83] bg-[#fff7e7] p-3.5 text-center shadow-xs">
                <span class="text-[11px] font-bold text-[#805300] uppercase tracking-wider block">En Proceso</span>
                <span class="text-2xl font-black text-[#805300] mt-1 block">{{ cantBMetrica() }}</span>
                <span class="inline-block px-2 py-0.5 mt-1 rounded-md text-[10px] font-extrabold bg-[#ffedc5] text-[#805300]">Nota B · {{ porcentajeMetrica(cantBMetrica()) }}%</span>
              </div>
              <div class="rounded-xl border border-[#f2b7b0] bg-[#fff1ef] p-3.5 text-center shadow-xs">
                <span class="text-[11px] font-bold text-[#a43128] uppercase tracking-wider block">En Inicio</span>
                <span class="text-2xl font-black text-[#a43128] mt-1 block">{{ cantCMetrica() }}</span>
                <span class="inline-block px-2 py-0.5 mt-1 rounded-md text-[10px] font-extrabold bg-[#ffe0dc] text-[#a43128]">Nota C · {{ porcentajeMetrica(cantCMetrica()) }}%</span>
              </div>
            </div>

            <!-- 3. Acceso compacto al desglose completo por curso y bimestre -->
            <div class="rounded-2xl border border-ui-divider bg-ui-surface-soft/75 p-4 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
              <div>
                <h4 class="text-xs font-extrabold text-[#173B67] uppercase tracking-wide m-0">Detalle de calificaciones por curso</h4>
                @if (libretaCargando()) {
                  <p class="text-xs text-slate-500 m-0 mt-1 flex items-center gap-1.5">
                    <span class="inline-block w-3.5 h-3.5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></span>
                    <span>Cargando libreta del estudiante…</span>
                  </p>
                } @else {
                  <p class="text-xs text-slate-600 m-0 mt-1">
                    <strong>{{ cursosResumenMetricaActual().length }} curso(s)</strong> · <strong>{{ notasEstudianteMetrica().length }} competencia(s)</strong> evaluada(s) en {{ periodoNombreActual() }}.
                  </p>
                }
              </div>
              <button
                type="button"
                (click)="abrirDetalleNotasModal()"
                [disabled]="libretaCargando()"
                class="min-h-10 rounded-xl bg-[#173B67] hover:bg-[#1e4b82] text-white px-4 py-2 text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50 whitespace-nowrap"
              >
                Ver detalles de notas →
              </button>
            </div>
          </div>

          <!-- Footer con Acciones -->
          <footer class="flex flex-[0_0_auto] items-center justify-between gap-3 border-t border-[#e5eaf2] bg-[#f8fafc] px-6 py-4 max-[639px]:px-4">
            <button type="button" (click)="descargarLibretaPdfAlumno()" class="inline-flex items-center gap-1.5 rounded-xl border border-[#d9e1ec] bg-white hover:bg-slate-50 text-[#172b4d] px-3.5 py-2 text-xs font-bold transition shadow-2xs cursor-pointer">
              <svg class="w-4 h-4 text-rose-600" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"/></svg>
              <span>Descargar Libreta Oficial (PDF)</span>
            </button>
            <button type="button" (click)="cerrarMetricas()" class="rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-5 py-2 text-xs font-bold transition shadow-xs cursor-pointer">
              Cerrar
            </button>
          </footer>
        </div>
      </dialog>

      <!-- Segundo modal apilado: Detalle de Notas por Cursos y Bimestres -->
      <dialog
        #detalleNotasDialog
        (close)="alCerrarDetalleNotasDialogo()"
        class="fixed inset-0 m-auto w-[min(920px,calc(100vw-24px))] max-w-[calc(100vw-24px)] max-h-[calc(100dvh-24px)] overflow-hidden rounded-[22px] border border-[#cbd5e1] bg-white p-0 text-[#172b4d] font-sans shadow-[0_32px_100px_rgb(9_21_38_/_46%)] backdrop:bg-[rgb(9_21_38_/_58%)] backdrop:backdrop-blur-[3px]"
        aria-labelledby="detalle-notas-dialog-title"
      >
        <div class="shuji-modal-3d-enter flex min-h-0 max-h-[calc(100dvh-24px)] flex-col">
          <header class="shrink-0 flex items-start justify-between gap-4 border-b border-slate-200 border-t-4 border-t-amber-500 bg-white px-5 py-4">
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <span class="inline-flex items-center rounded-full bg-[#173B67] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white">
                  Boleta por cursos y bimestre
                </span>
                <span class="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-bold text-slate-700">
                  {{ obtenerNombrePeriodo(bimestreDetalleMetricaId() || periodoId) }}
                </span>
                @if (!esPeriodoAplicableRefuerzo(bimestreDetalleMetricaId() || periodoId)) {
                  <span class="inline-flex items-center rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-700">
                    Bimestre concluido · Sin reforzamiento
                  </span>
                }
              </div>
              <h3 id="detalle-notas-dialog-title" class="m-0 mt-1.5 text-lg font-extrabold text-[#14213d] leading-snug truncate">
                Detalle de calificaciones · {{ alumnoMetricas()?.estudiante }}
              </h3>
              <p class="m-0 mt-0.5 text-xs text-slate-500">DNI {{ dniAlumnoMetricas() }} · {{ gradoSeccionMetricas() }}</p>
            </div>
            <button
              type="button"
              (click)="cerrarDetalleNotasModal()"
              aria-label="Cerrar detalle de notas"
              class="h-10 w-10 shrink-0 rounded-xl border border-slate-200 bg-slate-50 text-base font-bold text-slate-700 hover:bg-slate-200 cursor-pointer"
            >
              ✕
            </button>
          </header>

          <div class="shrink-0 border-b border-slate-200 bg-[#f8fafc] px-5 py-3 flex flex-wrap items-center justify-between gap-2">
            <div class="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Bimestres del estudiante">
              @for (per of periodosDetalleMetrica(); track per.id) {
                <button
                  type="button"
                  role="tab"
                  [attr.aria-selected]="(bimestreDetalleMetricaId() || periodoId) === per.id"
                  (click)="seleccionarBimestreDetalleMetrica(per.id)"
                  [class]="(bimestreDetalleMetricaId() || periodoId) === per.id
                    ? 'bg-[#173B67] text-white border-[#173B67] shadow-2xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'"
                  class="min-h-9 rounded-xl border px-3 py-1.5 text-xs font-bold transition cursor-pointer"
                >
                  {{ per.nombre }}
                  @if (per.id === periodoVigenteId()) {
                    <span class="ml-1 rounded bg-white/20 px-1.5 py-0.5 text-[10px]">Actual</span>
                  }
                </button>
              }
            </div>
            <span class="text-xs font-semibold text-slate-600 tabular-nums">
              {{ cursosDetalleNotasMetrica().length }} curso(s) · {{ notasBimestreDetalleMetrica().length }} competencia(s)
            </span>
          </div>

          <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 bg-[#f8fafc] space-y-4">
            @let resDetMet = resumenBimestreDetalleMetrica();
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
              <div class="rounded-xl border border-emerald-200 bg-emerald-50 py-2">
                <span class="block text-[10px] font-bold text-emerald-800">AD · Destacado</span>
                <strong class="text-lg font-extrabold text-emerald-950 tabular-nums">{{ resDetMet.AD }}</strong>
              </div>
              <div class="rounded-xl border border-sky-200 bg-sky-50 py-2">
                <span class="block text-[10px] font-bold text-sky-800">A · Esperado</span>
                <strong class="text-lg font-extrabold text-sky-950 tabular-nums">{{ resDetMet.A }}</strong>
              </div>
              <div class="rounded-xl border border-amber-200 bg-amber-50 py-2">
                <span class="block text-[10px] font-bold text-amber-800">B · En proceso</span>
                <strong class="text-lg font-extrabold text-amber-950 tabular-nums">{{ resDetMet.B }}</strong>
              </div>
              <div class="rounded-xl border border-rose-200 bg-rose-50 py-2">
                <span class="block text-[10px] font-bold text-rose-800">C · En inicio</span>
                <strong class="text-lg font-extrabold text-rose-950 tabular-nums">{{ resDetMet.C }}</strong>
              </div>
            </div>

            @if (cursosDetalleNotasMetrica().length) {
              <div class="grid grid-cols-1 gap-3">
                @for (curso of cursosDetalleNotasMetrica(); track curso.areaKey) {
                  <article class="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                    <header class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/90 px-4 py-2.5">
                      <div class="flex items-center gap-2 min-w-0">
                        <span class="h-2.5 w-2.5 rounded-full bg-[#173B67] shrink-0"></span>
                        <h4 class="m-0 text-sm font-extrabold text-[#14213d] truncate">{{ curso.areaNombre }}</h4>
                      </div>
                      <div class="flex items-center gap-2">
                        <span class="text-[11px] font-semibold text-slate-500">{{ curso.competencias.length }} comp.</span>
                        <span
                          class="rounded-full px-2.5 py-0.5 text-[11px] font-extrabold border"
                          [ngClass]="{
                            'bg-emerald-50 border-emerald-200 text-emerald-800': curso.nivelLogroCurso === 'AD',
                            'bg-sky-50 border-sky-200 text-sky-800': curso.nivelLogroCurso === 'A',
                            'bg-amber-50 border-amber-200 text-amber-900': curso.nivelLogroCurso === 'B',
                            'bg-rose-50 border-rose-200 text-rose-800': curso.nivelLogroCurso === 'C'
                          }"
                        >
                          {{ curso.nivelLogroCurso }}
                        </span>
                      </div>
                    </header>
                    <div class="divide-y divide-slate-100">
                      @for (comp of curso.competencias; track comp.id + '-' + comp.competenciaId) {
                        <div class="px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                          <div class="min-w-0 flex-1">
                            <p class="m-0 font-bold text-[#14213d]">{{ comp.competenciaNombre }}</p>
                            <p class="m-0 mt-0.5 text-slate-600 leading-relaxed">{{ comp.conclusionDescriptiva }}</p>
                          </div>
                          <div class="flex items-center gap-2 shrink-0">
                            <span
                              class="inline-flex min-w-9 justify-center rounded-lg border px-2.5 py-1 text-xs font-black"
                              [ngClass]="{
                                'bg-emerald-50 border-emerald-200 text-emerald-800': comp.calificacion === 'AD',
                                'bg-sky-50 border-sky-200 text-sky-800': comp.calificacion === 'A',
                                'bg-amber-50 border-amber-200 text-amber-900': comp.calificacion === 'B',
                                'bg-rose-50 border-rose-200 text-rose-800': comp.calificacion === 'C'
                              }"
                            >
                              {{ comp.calificacion }}
                            </span>
                            @if (comp.requiereRefuerzo && esPeriodoAplicableRefuerzo(bimestreDetalleMetricaId() || periodoId)) {
                              <span class="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-800">
                                Refuerzo
                              </span>
                            }
                          </div>
                        </div>
                      }
                    </div>
                  </article>
                }
              </div>
            } @else {
              <div class="rounded-2xl border border-slate-200 bg-white p-8 text-center">
                <p class="m-0 text-sm font-semibold text-slate-700">Sin calificaciones registradas en {{ obtenerNombrePeriodo(bimestreDetalleMetricaId() || periodoId) }}.</p>
                <p class="m-0 mt-1 text-xs text-slate-500">Selecciona otro bimestre en la barra superior para revisar los cursos evaluados.</p>
              </div>
            }
          </div>

          <footer class="shrink-0 flex items-center justify-between gap-2 border-t border-slate-200 bg-white px-5 py-3">
            <span class="text-xs text-slate-500">La ficha general del estudiante permanece abierta detrás de esta ventana</span>
            <button
              type="button"
              (click)="cerrarDetalleNotasModal()"
              class="min-h-10 rounded-xl bg-[#173B67] px-4 py-2 text-xs font-bold text-white hover:bg-[#1e4b82] cursor-pointer"
            >
              Volver a la ficha
            </button>
          </footer>
        </div>
      </dialog>

    </main>
  `
})
export class CalificacionesComponent implements OnInit {
  readonly pestanaActiva = signal<'matriz' | 'ranking'>('matriz');
  readonly cuadroHonor = signal<CuadroHonorResponseDto | null>(null);
  readonly rankingAlumnos = computed(() => this.cuadroHonor()?.estudiantes ?? []);
  readonly rankingSeccion = computed(() => this.cuadroHonor()?.seccionLetra ?? '');
  readonly rankingDisclaimer = computed(() => this.cuadroHonor()?.disclaimer ?? 'Puntaje interno de referencia; no representa una escala oficial ni otorga beneficios institucionales.');
  readonly rankingError = signal<string | null>(null);
  readonly rankingCargando = signal(false);
  private solicitudRanking = 0;
  private readonly evaluacionService = inject(EvaluacionService);
  private readonly academicoService = inject(AcademicoService);
  private readonly matriculaService = inject(MatriculaService, { optional: true });
  private readonly authStore = inject(AuthStore);
  readonly fichaEstudianteMetricas = signal<FichaMatriculaResponseDto | null>(null);
  readonly guardando = signal(false);
  readonly cambiosPendientes = signal(false);
  readonly puedeEditar = computed(() => this.authStore.hasRole('DOCENTE'));
  @ViewChild('edicionDialog') private edicionDialog!: ElementRef<HTMLDialogElement>;

  @ViewChild('metricasDialog') private metricasDialog!: ElementRef<HTMLDialogElement>;
  @ViewChild('detalleNotasDialog') private detalleNotasDialog!: ElementRef<HTMLDialogElement>;
  readonly alumnoMetricas = signal<EvaluacionAlumno | null>(null);
  readonly libretaCargando = signal(false);
  readonly libretaCalificaciones = signal<CalificacionResponseDto[]>([]);
  readonly mostrarDetalleNotasModal = signal(false);
  readonly bimestreDetalleMetricaId = signal<number>(0);

  readonly dniAlumnoMetricas = computed(() => {
    const ficha = this.fichaEstudianteMetricas();
    if (ficha?.estudiante?.numeroDocumento) return ficha.estudiante.numeroDocumento;
    return 'DNI Registrado';
  });

  readonly fotoAlumnoMetricas = computed(() => {
    const ficha = this.fichaEstudianteMetricas();
    if (ficha?.estudiante) {
      return obtenerFotoEstudiante(ficha.estudiante);
    }
    const alumno = this.alumnoMetricas();
    return obtenerFotoEstudiante({ id: alumno?.matriculaId, nombres: alumno?.estudiante });
  });

  readonly gradoSeccionMetricas = computed(() => {
    const honor = this.cuadroHonor();
    if (honor?.gradoNombre && honor?.seccionLetra) {
      return `${honor.gradoNombre} "${honor.seccionLetra}" - ${honor.nivelNombre || 'Educación Regular'}`;
    }
    const asignacion = this.asignaciones().find(a => a.id === Number(this.asignacionId));
    if (asignacion) {
      return `Sección #${asignacion.seccionId}`;
    }
    return 'Sección Asignada';
  });

  obtenerFotoAlumnoFila(alumno: EvaluacionAlumno): string {
    return obtenerFotoEstudiante({ id: alumno.matriculaId, nombres: alumno.estudiante });
  }

  readonly alcancePeriodoMetrica = signal<'PERIODO_ACTUAL' | 'ANIO_COMPLETO'>('PERIODO_ACTUAL');
  readonly competenciasCatalogo = signal<CompetenciaResponseDto[]>([]);

  readonly notasEstudianteMetrica = computed(() => {
    const libreta = this.libretaCalificaciones();
    if (libreta.length > 0) {
      if (this.alcancePeriodoMetrica() === 'PERIODO_ACTUAL' && Number(this.periodoId) > 0) {
        return libreta.filter(n => n.periodoAcademicoId === Number(this.periodoId));
      }
      return libreta;
    }
    const alumno = this.alumnoMetricas();
    if (!alumno || alumno.c1 === '-') return [];
    return [{
      id: 0,
      matriculaId: alumno.matriculaId,
      anioLectivoId: 0,
      seccionId: this.seccionActualId,
      periodoAcademicoId: Number(this.periodoId),
      calificacionCualitativa: alumno.c1 as CalificacionCualitativa,
      conclusionDescriptiva: alumno.conclusionDescriptiva,
      requiereRefuerzo: alumno.requiereRefuerzo ?? false,
      competenciaId: alumno.competenciaId
    } as CalificacionResponseDto];
  });

  readonly paginaRanking = signal<number>(1);
  readonly paginaMetrica = signal<number>(1);
  readonly rankingPaginado = computed(() => paginarRegistros(this.rankingAlumnos(), this.paginaRanking(), 10));
  readonly notasMetricaPaginadas = computed(() => paginarRegistros(this.notasEstudianteMetrica(), this.paginaMetrica(), 10));
  readonly totalCompetenciasMetrica = computed(() => this.notasEstudianteMetrica().length);
  readonly cursosResumenMetricaActual = computed<CursoCalificacionGrupo[]>(() =>
    agruparCalificacionesPorCurso(
      this.notasEstudianteMetrica(),
      this.areas(),
      [...this.competencias(), ...this.competenciasCatalogo()]
    )
  );
  readonly periodosDetalleMetrica = computed<Array<{ id: number; nombre: string }>>(() => {
    const lista = [...this.periodos()].sort(
      (a, b) => (a.numeroPeriodo ?? 0) - (b.numeroPeriodo ?? 0) || a.id - b.id
    );
    if (lista.length > 0) {
      return lista.map(p => ({ id: p.id, nombre: p.nombre }));
    }
    const romanos: Record<number, string> = { 1: 'I Bimestre', 2: 'II Bimestre', 3: 'III Bimestre', 4: 'IV Bimestre' };
    const ids = Array.from(
      new Set(
        this.libretaCalificaciones()
          .map(n => n.periodoAcademicoId)
          .filter((id): id is number => Boolean(id))
      )
    ).sort((a, b) => a - b);
    return ids.map(id => ({ id, nombre: romanos[id] ?? `Bimestre #${id}` }));
  });
  readonly notasBimestreDetalleMetrica = computed(() => {
    const objetivo = Number(this.bimestreDetalleMetricaId() || this.periodoId || this.periodoVigenteId());
    const libreta = this.libretaCalificaciones();
    if (libreta.length > 0) {
      return objetivo > 0 ? libreta.filter(n => n.periodoAcademicoId === objetivo) : libreta;
    }
    return this.notasEstudianteMetrica();
  });
  readonly cursosDetalleNotasMetrica = computed<CursoCalificacionGrupo[]>(() =>
    agruparCalificacionesPorCurso(
      this.notasBimestreDetalleMetrica(),
      this.areas(),
      [...this.competencias(), ...this.competenciasCatalogo()]
    )
  );
  readonly resumenBimestreDetalleMetrica = computed(() => {
    const notas = this.notasBimestreDetalleMetrica();
    let AD = 0;
    let A = 0;
    let B = 0;
    let C = 0;
    for (const n of notas) {
      if (n.calificacionCualitativa === 'AD') AD++;
      else if (n.calificacionCualitativa === 'A') A++;
      else if (n.calificacionCualitativa === 'B') B++;
      else if (n.calificacionCualitativa === 'C') C++;
    }
    return { AD, A, B, C, total: notas.length };
  });
  readonly cantAdMetrica = computed(() => this.notasEstudianteMetrica().filter(n => n.calificacionCualitativa === 'AD').length);
  readonly cantAMetrica = computed(() => this.notasEstudianteMetrica().filter(n => n.calificacionCualitativa === 'A').length);
  readonly cantBMetrica = computed(() => this.notasEstudianteMetrica().filter(n => n.calificacionCualitativa === 'B').length);
  readonly cantCMetrica = computed(() => this.notasEstudianteMetrica().filter(n => n.calificacionCualitativa === 'C').length);

  readonly cursosEnRiesgoDetalle = computed<CursoRiesgoDetalle[]>(() => {
    const notas = this.notasEstudianteMetrica().filter(n => n.calificacionCualitativa === 'C');
    if (notas.length === 0) return [];
    const porArea = new Map<string, {
      areaKey: string;
      areaNombre: string;
      totalNotasC: number;
      competenciasMap: Map<string, Set<string>>;
    }>();

    for (const n of notas) {
      const areaNombre = n.areaCurricularId
        ? this.obtenerNombreArea(n.areaCurricularId)
        : (this.areas().find(a => a.id === this.competenciasCatalogo().find(c => c.id === n.competenciaId)?.areaId)?.nombre
          ?? 'Área Curricular');
      const areaKey = String(n.areaCurricularId ?? areaNombre);
      let grupo = porArea.get(areaKey);
      if (!grupo) {
        grupo = { areaKey, areaNombre, totalNotasC: 0, competenciasMap: new Map() };
        porArea.set(areaKey, grupo);
      }
      grupo.totalNotasC += 1;
      const compNombre = n.competenciaId
        ? this.obtenerNombreCompetencia(n.competenciaId)
        : 'Competencia evaluada';
      let periodosSet = grupo.competenciasMap.get(compNombre);
      if (!periodosSet) {
        periodosSet = new Set<string>();
        grupo.competenciasMap.set(compNombre, periodosSet);
      }
      if (n.periodoAcademicoId > 0) {
        periodosSet.add(this.obtenerNombrePeriodo(n.periodoAcademicoId));
      }
    }

    return Array.from(porArea.values()).map(grupo => ({
      areaKey: grupo.areaKey,
      areaNombre: grupo.areaNombre,
      totalNotasC: grupo.totalNotasC,
      competencias: Array.from(grupo.competenciasMap.entries()).map(([nombre, periodosSet]) => ({
        nombre,
        periodos: Array.from(periodosSet)
      }))
    }));
  });

  readonly cursosOCompetenciasConDificultad = computed(() =>
    this.cursosEnRiesgoDetalle().map(curso => {
      if (curso.competencias.length === 1) {
        const comp = curso.competencias[0].nombre;
        return comp !== 'Competencia evaluada' ? `${curso.areaNombre} (${comp})` : curso.areaNombre;
      }
      return `${curso.areaNombre} (${curso.competencias.length} competencias)`;
    })
  );

  readonly esAlumnoDestacado = computed(() => {
    const total = this.totalCompetenciasMetrica();
    if (total === 0) return false;
    const ad = this.cantAdMetrica();
    const a = this.cantAMetrica();
    const c = this.cantCMetrica();
    return c === 0 && (ad + a) > this.cantBMetrica() && (ad + a) >= 1;
  });

  readonly tieneProblemas = computed(() => this.cantCMetrica() > 0);

  periodoNombreActual(): string {
    return this.periodos().find(p => p.id === Number(this.periodoId))?.nombre ?? 'Periodo Regular';
  }

  obtenerNombrePeriodo(id?: number): string {
    if (!id) return 'Periodo';
    return this.periodos().find(p => p.id === id)?.nombre ?? `Periodo #${id}`;
  }

  porcentajeMetrica(cantidad: number): number {
    const total = this.totalCompetenciasMetrica();
    if (total <= 0) return 0;
    return Math.round((cantidad * 100) / total);
  }

  cambiarAlcanceMetrica(alcance: 'PERIODO_ACTUAL' | 'ANIO_COMPLETO'): void {
    this.alcancePeriodoMetrica.set(alcance);
    this.paginaMetrica.set(1);
  }

  periodoVigenteId(): number {
    const lista = [...this.periodos()].sort(
      (a, b) => (a.numeroPeriodo ?? 0) - (b.numeroPeriodo ?? 0) || a.id - b.id
    );
    if (!lista.length) return 0;
    const hoy = fechaActualEnPeru();
    const abiertoPorRango = lista.find(
      p => !p.cerrado && Boolean(p.fechaInicio) && Boolean(p.fechaFin) && p.fechaInicio <= hoy && hoy <= p.fechaFin
    );
    if (abiertoPorRango) return abiertoPorRango.id;
    const iniciados = lista.filter(p => !p.cerrado && Boolean(p.fechaInicio) && p.fechaInicio <= hoy);
    if (iniciados.length > 0) return iniciados[iniciados.length - 1].id;
    const primerAbierto = lista.find(p => !p.cerrado);
    return primerAbierto?.id ?? lista[lista.length - 1].id;
  }

  esPeriodoConcluido(p: PeriodoResponseDto | null | undefined): boolean {
    if (!p) return false;
    if (p.cerrado) return true;
    const vigenteId = this.periodoVigenteId();
    if (!vigenteId || vigenteId === p.id) return false;
    const vigente = this.periodos().find(item => item.id === vigenteId);
    if (vigente && p.numeroPeriodo != null && vigente.numeroPeriodo != null) {
      return p.numeroPeriodo < vigente.numeroPeriodo;
    }
    const hoy = fechaActualEnPeru();
    return Boolean(p.fechaFin) && p.fechaFin < hoy;
  }

  esPeriodoAplicableRefuerzo(periodoId?: number | null): boolean {
    if (!periodoId || !this.periodos().length) return true;
    const periodo = this.periodos().find(p => p.id === Number(periodoId));
    return !this.esPeriodoConcluido(periodo);
  }

  obtenerIniciales(nombre?: string): string {
    if (!nombre) return 'AL';
    const partes = nombre.trim().split(/\s+/);
    if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase();
    return (partes[0][0] + partes[1][0]).toUpperCase();
  }

  verMetricasAlumno(alumno: EvaluacionAlumno): void {
    this.paginaMetrica.set(1);
    this.alcancePeriodoMetrica.set('PERIODO_ACTUAL');
    this.mostrarDetalleNotasModal.set(false);
    this.bimestreDetalleMetricaId.set(0);
    this.alumnoMetricas.set(alumno);
    this.fichaEstudianteMetricas.set(null);
    this.libretaCalificaciones.set([]);
    this.libretaCargando.set(true);
    this.metricasDialog?.nativeElement?.showModal();

    const areasIds = this.areas().map(a => a.id);
    if (areasIds.length > 0) {
      this.precargarCompetenciasPorAreas(areasIds);
    }

    if (this.matriculaService) {
      this.matriculaService.consultarFicha(alumno.matriculaId).subscribe({
        next: ficha => this.fichaEstudianteMetricas.set(ficha),
        error: () => this.fichaEstudianteMetricas.set(null)
      });
    }

    this.evaluacionService.consultarLibreta(alumno.matriculaId).subscribe({
      next: res => {
        const calificaciones = res.calificaciones || [];
        this.libretaCalificaciones.set(calificaciones);
        const faltantes = calificaciones.map(c => c.areaCurricularId).filter((id): id is number => Boolean(id));
        if (faltantes.length > 0) {
          this.precargarCompetenciasPorAreas(faltantes);
        }
        this.libretaCargando.set(false);
      },
      error: () => {
        this.libretaCargando.set(false);
      }
    });
  }

  private precargarCompetenciasPorAreas(areaIds: number[]): void {
    const conocidas = new Set(this.competenciasCatalogo().map(c => c.areaId));
    const faltantes = [...new Set(areaIds.filter(id => id > 0 && !conocidas.has(id)))];
    if (faltantes.length === 0) return;
    forkJoin(
      faltantes.map(id => this.academicoService.listarCompetencias(id).pipe(catchError(() => of([] as CompetenciaResponseDto[]))))
    ).subscribe(listas => {
      const nuevas = listas.flat();
      if (nuevas.length === 0) return;
      this.competenciasCatalogo.update(prev => {
        const porId = new Map(prev.map(c => [c.id, c]));
        for (const item of nuevas) porId.set(item.id, item);
        return Array.from(porId.values());
      });
    });
  }

  cerrarMetricas(): void {
    this.cerrarDetalleNotasModal();
    this.metricasDialog?.nativeElement?.close();
    this.alumnoMetricas.set(null);
    this.libretaCalificaciones.set([]);
    this.alcancePeriodoMetrica.set('PERIODO_ACTUAL');
  }

  abrirDetalleNotasModal(): void {
    const lista = this.periodosDetalleMetrica();
    const inicial =
      Number(this.periodoId || this.periodoVigenteId()) ||
      lista[lista.length - 1]?.id ||
      0;
    this.bimestreDetalleMetricaId.set(inicial);
    this.mostrarDetalleNotasModal.set(true);
    this.detalleNotasDialog?.nativeElement?.showModal();
  }

  cerrarDetalleNotasModal(): void {
    if (this.detalleNotasDialog?.nativeElement?.open) {
      this.detalleNotasDialog.nativeElement.close();
    }
    this.mostrarDetalleNotasModal.set(false);
  }

  alCerrarDetalleNotasDialogo(): void {
    this.mostrarDetalleNotasModal.set(false);
  }

  seleccionarBimestreDetalleMetrica(periodoId: number): void {
    this.bimestreDetalleMetricaId.set(Number(periodoId));
  }

  descargarLibretaPdfAlumno(matriculaId?: number): void {
    const id = matriculaId ?? this.alumnoMetricas()?.matriculaId;
    if (!id) return;
    this.evaluacionService.descargarLibretaPdf(id).subscribe({
      next: blob => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `libreta_estudiante_${id}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => this.error.set('No se pudo descargar la libreta en PDF.')
    });
  }

  obtenerNombreCompetencia(id?: number): string {
    if (!id) return 'Competencia evaluada';
    return this.competencias().find(c => c.id === id)?.nombre
      ?? this.competenciasCatalogo().find(c => c.id === id)?.nombre
      ?? `Competencia #${id}`;
  }

  obtenerNombreArea(id?: number): string {
    if (!id) {
      const asignacion = this.asignaciones().find(a => a.id === Number(this.asignacionId));
      return this.areas().find(a => a.id === asignacion?.areaCurricularId)?.nombre ?? 'Área Curricular';
    }
    return this.areas().find(a => a.id === id)?.nombre ?? `Área #${id}`;
  }

  readonly alumnoEditando = signal<EvaluacionAlumno | null>(null);
  notaEditada: NotaCNEB = '-';
  conclusionEditada = '';
  evidenciaObservada = '';
  sugerenciaIaEditada = false;
  readonly generandoIa = signal(false);
  readonly mensajeIa = signal('');
  readonly areas = signal<Array<{id: number; nombre: string}>>([]);
  private solicitudIa = 0;
  private readonly horarioService = inject(HorarioService);
  private readonly ruta = inject(ActivatedRoute, { optional: true });
  private solicitudMatriz = 0;
  readonly catalogoAsignaciones = signal<AsignacionHorarioOpcionDto[]>([]);
  readonly anioFiltroId = signal<number>(0);
  readonly gradoFiltroKey = signal<string>('');

  periodoId = 0;
  asignacionId = 0;
  competenciaId = 0;
  readonly asignaciones = signal<AsignacionDocenteResponseDto[]>([]);
  readonly competencias = signal<CompetenciaResponseDto[]>([]);
  readonly periodos = signal<PeriodoResponseDto[]>([]);
  readonly error = signal<string | null>(null);
  guardadoExitoso = signal(false);
  cargando = signal(false);

  readonly asignacionesEnriquecidas = computed(() => {
    const porId = new Map(this.catalogoAsignaciones().map(item => [item.asignacionId, item]));
    return this.asignaciones().map(a => {
      const opcion = porId.get(a.id);
      return {
        id: a.id,
        anioLectivoId: a.anioLectivoId,
        anioLabel: opcion?.anio ? String(opcion.anio) : `Año #${a.anioLectivoId}`,
        anioOrden: opcion?.anio ?? a.anioLectivoId,
        nivelId: opcion?.nivelId ?? a.nivelId,
        gradoId: opcion?.gradoId ?? 0,
        gradoKey: opcion ? `${opcion.nivelId}:${opcion.gradoId}` : `nivel:${a.nivelId}`,
        gradoLabel: opcion ? `${opcion.grado} · ${opcion.nivel}` : `Nivel #${a.nivelId}`,
        letra: opcion?.letra ?? '',
        areaNombre: opcion?.areaNombre ?? '',
        seccionLabel: opcion
          ? `Sección ${opcion.letra} · ${opcion.areaNombre}${opcion.aulaCodigo ? ' · Aula ' + opcion.aulaCodigo : ''}`
          : `Sección ${a.seccionId} · Área ${a.areaCurricularId}`
      };
    });
  });

  readonly aniosDisponibles = computed(() => {
    const mapa = new Map<number, { id: number; label: string; orden: number }>();
    for (const item of this.asignacionesEnriquecidas()) {
      if (!mapa.has(item.anioLectivoId)) {
        mapa.set(item.anioLectivoId, {
          id: item.anioLectivoId,
          label: item.anioLabel,
          orden: item.anioOrden
        });
      }
    }
    return Array.from(mapa.values()).sort((a, b) => b.orden - a.orden || b.id - a.id);
  });

  readonly gradosDisponibles = computed(() => {
    const anio = this.anioFiltroId();
    const mapa = new Map<string, { key: string; label: string; nivelId: number; gradoId: number }>();
    for (const item of this.asignacionesEnriquecidas()) {
      if (anio && item.anioLectivoId !== anio) continue;
      if (!mapa.has(item.gradoKey)) {
        mapa.set(item.gradoKey, {
          key: item.gradoKey,
          label: item.gradoLabel,
          nivelId: item.nivelId,
          gradoId: item.gradoId
        });
      }
    }
    return Array.from(mapa.values()).sort(
      (a, b) => a.nivelId - b.nivelId || a.gradoId - b.gradoId || a.label.localeCompare(b.label, 'es')
    );
  });

  readonly seccionesDisponibles = computed(() => {
    const anio = this.anioFiltroId();
    const grado = this.gradoFiltroKey();
    return this.asignacionesEnriquecidas()
      .filter(item => (!anio || item.anioLectivoId === anio) && (!grado || item.gradoKey === grado))
      .sort((a, b) => a.letra.localeCompare(b.letra, 'es') || a.areaNombre.localeCompare(b.areaNombre, 'es'));
  });

  readonly alumnos = signal<EvaluacionAlumno[]>([]);
  readonly busquedaAlumno = signal('');
  readonly filtroNota = signal('TODOS');
  readonly pagina = signal(0);
  readonly tamanoPagina = signal(10);
  readonly alumnosFiltrados = computed(() => {
    const texto = this.busquedaAlumno().trim().toLocaleLowerCase('es-PE');
    const nota = this.filtroNota();
    return this.alumnos().filter(alumno =>
      (!texto || alumno.estudiante.toLocaleLowerCase('es-PE').includes(texto)) &&
      (nota === 'TODOS' || (nota === 'SIN_CALIFICAR' ? alumno.c1 === '-' : alumno.c1 === nota)));
  });
  readonly alumnosPagina = computed(() => paginarRegistros(this.alumnosFiltrados(), this.pagina() + 1, this.tamanoPagina()));
  get seccionActualId(): number { return this.asignaciones().find(a => a.id === Number(this.asignacionId))?.seccionId ?? 0; }

  etiquetaAsignacion(asignacion: AsignacionDocenteResponseDto): string {
    const opcion = this.catalogoAsignaciones().find(item => item.asignacionId === asignacion.id);
    return opcion
      ? `${opcion.anio} · ${opcion.nivel} ${opcion.grado} ${opcion.letra} · ${opcion.areaNombre} · Aula ${opcion.aulaCodigo}`
      : `Sección ${asignacion.seccionId} · Área ${asignacion.areaCurricularId}`;
  }

  abrirEdicion(alumno: EvaluacionAlumno): void {
    if (!this.puedeEditar()) return;
    this.alumnoEditando.set(alumno);
    this.notaEditada = alumno.c1;
    this.conclusionEditada = alumno.conclusionDescriptiva;
    this.sugerenciaIaEditada = alumno.sugerenciaIaUtilizada ?? false;
    this.evidenciaObservada = '';
    this.mensajeIa.set('');
    this.generandoIa.set(false);
    this.solicitudIa++;
    this.edicionDialog?.nativeElement?.showModal();
  }

  cerrarEdicion(): void { this.solicitudIa++; this.edicionDialog?.nativeElement?.close(); this.alumnoEditando.set(null); }

  sugerirConclusionConIa(): void {
    if (!this.puedeEditar()) return;
    const alumno = this.alumnoEditando();
    const asignacion = this.asignaciones().find(a => a.id === Number(this.asignacionId));
    const competencia = this.competencias().find(c => c.id === Number(this.competenciaId));
    const area = this.areas().find(a => a.id === asignacion?.areaCurricularId);
    if (!alumno || !competencia || !area || this.notaEditada === '-' || !this.evidenciaObservada.trim()) {
      this.mensajeIa.set('Selecciona una calificación e indica evidencia concreta de aprendizaje.'); return;
    }
    const solicitud = ++this.solicitudIa;
    const nota = this.notaEditada;
    const textoAntes = this.conclusionEditada;
    this.generandoIa.set(true); this.mensajeIa.set('');
    this.evaluacionService.sugerirConclusion({areaCurricular: area.nombre,
      competenciaDescripcion: competencia.nombre, nivelLogro: nota, desempenoObservado: this.evidenciaObservada.trim()}).subscribe({
      next: respuesta => {
        if (solicitud !== this.solicitudIa) return;
        this.generandoIa.set(false);
        if (nota !== this.notaEditada || textoAntes !== this.conclusionEditada) {
          this.mensajeIa.set('La evaluación cambió durante la consulta. Solicita una nueva sugerencia.'); return;
        }
        this.conclusionEditada = `${respuesta.conclusionDescriptiva}\nAspecto por mejorar: ${respuesta.aspectoMejora}\nRecomendación: ${respuesta.recomendacionApoderado}`;
        this.sugerenciaIaEditada = respuesta.generadoPorIa;
        this.mensajeIa.set('Sugerencia recibida. Revísala y ajústala antes de aplicar los cambios.');
      },
      error: err => { if (solicitud !== this.solicitudIa) return;
        this.generandoIa.set(false); this.mensajeIa.set(err?.error?.message ?? 'No se pudo generar la sugerencia. Puedes redactar la conclusión.'); }
    });
  }

  aplicarEdicion(): void {
    if (!this.puedeEditar()) return;
    const seleccionado = this.alumnoEditando();
    if (!seleccionado || this.notaEditada === '-') return;
    this.alumnos.update(lista => lista.map(alumno => alumno.matriculaId === seleccionado.matriculaId
      ? { ...alumno, c1: this.notaEditada, conclusionDescriptiva: this.conclusionEditada.trim(), requiereRefuerzo: this.notaEditada === 'C', sugerenciaIaUtilizada: this.sugerenciaIaEditada }
      : alumno));
    this.cerrarEdicion();
    this.cambiosPendientes.set(true);
    this.guardadoExitoso.set(false);
  }

  ngOnInit(): void {
    if (this.authStore.hasRole('SECRETARIA')) {
      this.error.set('El backend permite consultar la matriz a Dirección y Docencia; Secretaría no tiene acceso a esos endpoints.');
      return;
    }
    this.horarioService.catalogo().subscribe({
      next: catalogo => {
        this.catalogoAsignaciones.set(catalogo);
        if (this.asignacionId) {
          this.sincronizarFiltrosDesdeAsignacion(this.asignacionId);
        }
      },
      error: () => this.catalogoAsignaciones.set([])
    });
    this.academicoService.listarAsignaciones().subscribe({
      next: asignaciones => {
        this.asignaciones.set(asignaciones);
        const solicitada = Number(this.ruta?.snapshot.queryParamMap.get('asignacion'));
        this.asignacionId = asignaciones.find(asignacion => asignacion.id === solicitada)?.id
          ?? asignaciones[0]?.id ?? 0;
        this.cambiarAsignacion();
      },
      error: () => this.error.set('No se pudieron consultar las asignaciones docentes.')
    });
  }

  abrirRanking(): void {
    this.pestanaActiva.set('ranking');
    this.cargarRanking();
  }

  cargarRanking(): void {
    this.paginaRanking.set(1);
    const seccionId = this.seccionActualId;
    const solicitud = ++this.solicitudRanking;
    if (!seccionId) {
      this.cuadroHonor.set(null);
      this.rankingError.set(null);
      this.rankingCargando.set(false);
      return;
    }
    this.rankingError.set(null);
    this.rankingCargando.set(true);
    this.evaluacionService.consultarRankingSeccion(seccionId).subscribe({
      next: cuadro => {
        if (solicitud !== this.solicitudRanking || seccionId !== this.seccionActualId) return;
        this.cuadroHonor.set(cuadro);
        this.rankingCargando.set(false);
      },
      error: err => {
        if (solicitud !== this.solicitudRanking || seccionId !== this.seccionActualId) return;
        this.cuadroHonor.set(null);
        this.rankingCargando.set(false);
        this.rankingError.set(err?.error?.message ?? 'No se pudo consultar el ranking anual interno de la sección.');
      }
    });
  }

  private sincronizarFiltrosDesdeAsignacion(asignacionId: number): void {
    const item = this.asignacionesEnriquecidas().find(a => a.id === Number(asignacionId));
    if (!item) return;
    this.anioFiltroId.set(item.anioLectivoId);
    this.gradoFiltroKey.set(item.gradoKey);
  }

  seleccionarAnio(anioId: number): void {
    this.anioFiltroId.set(Number(anioId));
    const grados = this.gradosDisponibles();
    this.gradoFiltroKey.set(grados[0]?.key ?? '');
    const secciones = this.seccionesDisponibles();
    this.asignacionId = secciones[0]?.id ?? 0;
    this.cambiarAsignacion();
  }

  seleccionarGrado(gradoKey: string): void {
    this.gradoFiltroKey.set(gradoKey);
    const secciones = this.seccionesDisponibles();
    this.asignacionId = secciones[0]?.id ?? 0;
    this.cambiarAsignacion();
  }

  cambiarAsignacion(): void {
    this.solicitudRanking++;
    const solicitud = ++this.solicitudMatriz;
    this.cargando.set(false);
    this.alumnos.set([]);
    this.competencias.set([]);
    this.periodos.set([]);
    this.periodoId = 0;
    this.competenciaId = 0;
    this.pagina.set(0);
    this.rankingCargando.set(false);
    const asignacion = this.asignaciones().find(a => a.id === Number(this.asignacionId));
    if (!asignacion) {
      this.cuadroHonor.set(null);
      this.rankingError.set(null);
      this.rankingCargando.set(false);
      return;
    }
    this.sincronizarFiltrosDesdeAsignacion(asignacion.id);
    this.cuadroHonor.set(null);
    this.rankingError.set(null);
    this.error.set(null);
    if (this.pestanaActiva() === 'ranking') this.cargarRanking();
    this.areas.set([]);
    this.academicoService.listarAreas(asignacion.nivelId).subscribe({
      next: areas => {
        if (this.asignacionId === asignacion.id) {
          this.areas.set(areas);
          this.precargarCompetenciasPorAreas(areas.map(a => a.id));
        }
      }
    });
    this.cargando.set(true);
    forkJoin({
      competencias: this.academicoService.listarCompetencias(asignacion.areaCurricularId),
      periodos: this.academicoService.listarPeriodos(asignacion.anioLectivoId)
    }).subscribe({
      next: ({ competencias, periodos }) => {
        if (solicitud !== this.solicitudMatriz) return;
        this.competencias.set(competencias);
        this.periodos.set(periodos);
        this.competenciaId = competencias[0]?.id ?? 0;
        this.periodoId = periodos[0]?.id ?? 0;
        if (!this.competenciaId || !this.periodoId) {
          this.cargando.set(false);
          this.error.set('Configura un periodo y una competencia para consultar la lista del curso.');
          return;
        }
        this.cargarCalificaciones();
      },
      error: () => {
        if (solicitud !== this.solicitudMatriz) return;
        this.cargando.set(false);
        this.error.set('No se pudieron consultar los periodos o las competencias de la asignación.');
      }
    });
  }

  cargarCalificaciones(): void {
    if (!this.asignacionId || !this.periodoId || !this.competenciaId) return;
    const solicitud = ++this.solicitudMatriz;
    this.cargando.set(true);
    this.alumnos.set([]);
    forkJoin({matriz: this.evaluacionService.listarMatriz(Number(this.asignacionId), Number(this.periodoId), Number(this.competenciaId)),
      notas: this.evaluacionService.listarCalificaciones(Number(this.asignacionId), Number(this.periodoId))}).subscribe({
      next: ({matriz: res, notas}) => {
        if (solicitud !== this.solicitudMatriz) return;
        const origenIa = new Map(notas.map(n => [`${n.matriculaId}/${n.competenciaId}`, n.sugerenciaIaUtilizada ?? false]));
        this.cargando.set(false);
        if (Array.isArray(res)) {
          this.pagina.set(0);
          this.alumnos.set(
            res.map((c, idx) => ({
              matriculaId: c.matriculaId,
              numeroOrden: idx + 1,
              estudiante: c.nombreEstudiante || 'Estudiante sin datos',
              c1: c.calificacionCualitativa ?? '-',
              c2: '-',
              c3: '-',
              conclusionDescriptiva: c.conclusionDescriptiva || '',
              requiereRefuerzo: c.requiereRefuerzo ?? null,
              competenciaId: c.competenciaId
              ,sugerenciaIaUtilizada: origenIa.get(`${c.matriculaId}/${c.competenciaId}`) ?? false
            }))
          );
        } else {
          this.alumnos.set([]);
        }
        if (this.pestanaActiva() === 'ranking') this.cargarRanking();
      },
      error: (err) => {
        if (solicitud !== this.solicitudMatriz) return;
        this.cargando.set(false);
        this.alumnos.set([]);
        this.error.set(err?.error?.message ?? 'No se pudo consultar la matriz de calificaciones.');
      }
    });
  }

  cambiarPagina(pagina: number): void {
    this.pagina.set(Math.max(0, pagina - 1));
  }

  guardarCalificaciones(): void {
    if (!this.puedeEditar()) return;
    if (this.alumnos().length === 0 || !this.asignacionId || !this.competenciaId || !this.periodoId) return;
    if (this.alumnos().some(a => a.c1 === '-')) { this.error.set('Seleccione una calificación para cada estudiante.'); return; }
    this.error.set(null);
    this.guardando.set(true);
    const payload = {
      asignacionDocenteId: Number(this.asignacionId),
      periodoAcademicoId: Number(this.periodoId),
      calificaciones: this.alumnos().map(a => ({
        matriculaId: a.matriculaId,
        competenciaId: a.competenciaId,
        calificacionCualitativa: a.c1 as 'AD' | 'A' | 'B' | 'C',
        conclusionDescriptiva: a.conclusionDescriptiva,
        sugerenciaIaUtilizada: a.sugerenciaIaUtilizada ?? false
      }))
    };

    this.evaluacionService.registrarCalificaciones(payload).subscribe({
      next: () => {
        this.guardando.set(false);
        this.cambiosPendientes.set(false);
        this.guardadoExitoso.set(true);
        this.cargarCalificaciones();
        setTimeout(() => this.guardadoExitoso.set(false), 4500);
      },
      error: (err) => {
        this.guardando.set(false);
        this.guardadoExitoso.set(false);
        this.error.set(err?.error?.message ?? 'No se pudieron guardar las calificaciones.');
      }
    });
  }
}
