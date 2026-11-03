import { Component, ElementRef, inject, signal, computed, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { CargaPlanillaComponent } from '../../shared/ui/carga-planilla.component';
import { EvaluacionService } from '../../core/services/evaluacion.service';
import { AcademicoService } from '../../core/services/academico.service';
import { AuthStore } from '../../core/state/auth.store';
import { AsignacionDocenteResponseDto, CompetenciaResponseDto, PeriodoResponseDto } from '../../core/models/academico.model';
import { CuadroHonorResponseDto } from '../../core/models/evaluacion.model';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';

type NotaCNEB = 'AD' | 'A' | 'B' | 'C' | '-';

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
  imports: [CommonModule, FormsModule, CargaPlanillaComponent, MatPaginatorModule],
template: `
    <main class="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-[22px] text-ui-text max-[600px]:gap-4 max-[600px]:pb-1" aria-labelledby="calificaciones-title">
      <header class="flex items-end justify-between gap-6 border-t-[3px] border-ui-divider pt-3 max-[600px]:items-stretch max-[600px]:flex-col max-[600px]:gap-[14px]">
        <div class="min-w-0">
          <p class="m-0 mb-[6px] text-[#8b6425] text-[11px] font-extrabold tracking-[.14em] leading-[1.4] uppercase">{{ puedeEditar() ? 'Evaluación docente' : 'Consulta académica' }}</p>
          <h1 id="calificaciones-title" class="m-0 text-[#172b4d] text-[clamp(24px,3vw,34px)] font-extrabold tracking-[-.035em] leading-[1.15] tracking-[-.025em]">Matriz de Calificaciones CNEB</h1>
          <p class="mt-2 max-w-[680px] text-[#56657c] text-sm leading-[1.6]">{{ puedeEditar() ? 'Registro y evaluación por competencias conectada con la base de datos oficial.' : 'Consulta de calificaciones por periodo, sección y competencia.' }}</p>
        </div>

        <div class="flex flex-[0_0_auto] items-center justify-end gap-3 max-[600px]:items-stretch max-[600px]:flex-col">
          @if (guardadoExitoso()) {
            <span class="flex items-start gap-3 rounded-lg border border-transparent px-4 py-3 font-sans text-base leading-6 border-ui-success-border bg-ui-success-bg text-ui-success-text m-0 text-xs" role="status">
              <svg class="h-5 w-5 shrink-0" aria-hidden="true" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>
              Calificaciones guardadas en BD
            </span>
          }
          @if (puedeEditar()) {
            <button type="button" (click)="guardarCalificaciones()" [disabled]="alumnos().length === 0 || !asignacionId || !competenciaId" class="inline-flex items-center justify-center gap-2 rounded-lg border border-transparent px-4 py-2 text-center font-sans text-[15px] leading-[1.25] font-semibold no-underline transition-[background-color,border-color,color,box-shadow] duration-[140ms] [cursor:pointer] focus-visible:outline-3 focus-visible:outline-[rgb(37_99_235_/_35%)] focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:border-[#e2e8f0] disabled:bg-[#f1f5f9] disabled:text-[#64748b] aria-disabled:cursor-not-allowed aria-disabled:border-[#e2e8f0] aria-disabled:bg-[#f1f5f9] aria-disabled:text-[#64748b] bg-[#2563eb] text-white hover:bg-[#1d4ed8] whitespace-nowrap max-[600px]:w-full max-[600px]:justify-center box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px] !text-sm !leading-[1.25]">
              <svg class="h-[17px] w-[17px] flex-[0_0_17px]" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
              <span>Guardar en BD</span>
            </button>
          }
        </div>
      </header>

      @if (error()) {
        <div class="flex items-start gap-3 rounded-lg border border-transparent px-4 py-3 font-sans text-base leading-6 border-[var(--ui-error-border)] bg-ui-error-bg text-ui-error-text m-0 text-[13px]" role="alert">{{ error() }}</div>
      }

      @if (puedeEditar()) {
        <app-carga-planilla [asignacionId]="+asignacionId" [periodoId]="+periodoId" [seccionId]="seccionActualId" [competenciaId]="+competenciaId" (completada)="cargarCalificaciones()" />
      }

      <!-- Selector de pestañas: matriz de calificaciones y ranking anual interno -->
      <div class="flex flex-wrap items-center gap-2 border-b border-[#e1e8f1] pb-3">
        <button
          type="button"
          (click)="pestanaActiva.set('matriz')"
          [class]="pestanaActiva() === 'matriz' ? 'border-[#2563eb] text-[#2563eb] font-bold bg-blue-50/60 shadow-sm' : 'border-[#e2e8f0] text-[#59677a] hover:bg-slate-50 font-semibold'"
          class="px-4 py-2 text-sm rounded-xl border transition-all cursor-pointer inline-flex items-center gap-2"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
          Matriz CNEB por Competencia
        </button>
        <button
          type="button"
          (click)="abrirRanking()"
          [class]="pestanaActiva() === 'ranking' ? 'border-[#c49a58] text-[#936622] font-bold bg-amber-50/70 shadow-sm' : 'border-[#e2e8f0] text-[#59677a] hover:bg-slate-50 font-semibold'"
          class="px-4 py-2 text-sm rounded-xl border transition-all cursor-pointer inline-flex items-center gap-2"
        >
          <svg class="w-4 h-4 text-[#c49a58]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/></svg>
          Ranking anual interno de la sección
        </button>
      </div>

      <section class="grid min-w-0 grid-cols-[minmax(160px,.9fr)_minmax(240px,1.25fr)_minmax(310px,1.55fr)_minmax(150px,.8fr)] items-end gap-4 rounded-2xl border border-ui-divider bg-ui-surface !p-[18px] shadow-[0_5px_16px_rgb(23_43_77_/_5%)] max-[1399px]:grid-cols-2 max-[600px]:grid-cols-1 max-[600px]:gap-[13px] max-[600px]:!p-[15px]" aria-label="Filtros de calificaciones">
        <div class="grid gap-1 font-sans text-base leading-6 text-ui-text min-w-0 m-0">
          <label class="font-sans text-[13px] leading-[1.4] font-medium text-ui-text" for="periodo-calificaciones">Periodo Académico</label>
          <select id="periodo-calificaciones" [(ngModel)]="periodoId" (change)="cargarCalificaciones()" [disabled]="!periodos().length" class="box-border min-h-11 w-full rounded-lg border border-ui-divider bg-ui-surface px-3 py-2 font-sans text-base leading-6 text-ui-text placeholder:text-ui-muted focus-visible:outline-3 focus-visible:outline-ui-focus focus-visible:outline-offset-2 aria-[invalid=true]:border-ui-error-border box-border min-h-11 w-full rounded-lg border border-ui-divider bg-ui-surface px-3 py-2 font-sans text-base leading-6 text-ui-text focus-visible:outline-3 focus-visible:outline-ui-focus focus-visible:outline-offset-2 aria-[invalid=true]:border-ui-error-border max-[600px]:!text-sm min-[601px]:!text-[13px] !rounded-xl !border-ui-control-border !text-ui-text">
            @if (!periodos().length) { <option [ngValue]="0">Sin periodos disponibles</option> } @for (periodo of periodos(); track periodo.id) { <option [ngValue]="periodo.id">{{ periodo.nombre }}</option> }
          </select>
        </div>

        <div class="grid gap-1 font-sans text-base leading-6 text-ui-text min-w-0 m-0">
          <label class="font-sans text-[13px] leading-[1.4] font-medium text-ui-text" for="asignacion-calificaciones">Asignación docente y sección</label>
          <select id="asignacion-calificaciones" [(ngModel)]="asignacionId" (change)="cambiarAsignacion()" [disabled]="!asignaciones().length" class="box-border min-h-11 w-full rounded-lg border border-ui-divider bg-ui-surface px-3 py-2 font-sans text-base leading-6 text-ui-text placeholder:text-ui-muted focus-visible:outline-3 focus-visible:outline-ui-focus focus-visible:outline-offset-2 aria-[invalid=true]:border-ui-error-border box-border min-h-11 w-full rounded-lg border border-ui-divider bg-ui-surface px-3 py-2 font-sans text-base leading-6 text-ui-text focus-visible:outline-3 focus-visible:outline-ui-focus focus-visible:outline-offset-2 aria-[invalid=true]:border-ui-error-border max-[600px]:!text-sm min-[601px]:!text-[13px] !rounded-xl !border-ui-control-border !text-ui-text">
            @if (!asignaciones().length) { <option [ngValue]="0">Sin asignaciones disponibles</option> } @for (a of asignaciones(); track a.id) { <option [ngValue]="a.id">Sección {{ a.seccionId }} · Área {{ a.areaCurricularId }} · Asignación {{ a.id }}</option> }
          </select>
        </div>

        <div class="grid gap-1 font-sans text-base leading-6 text-ui-text min-w-0 m-0">
          <label class="font-sans text-[13px] leading-[1.4] font-medium text-ui-text" for="competencia-calificaciones">Competencia</label>
          <select id="competencia-calificaciones" [(ngModel)]="competenciaId" (change)="cargarCalificaciones()" [disabled]="!competencias().length" class="box-border min-h-11 w-full rounded-lg border border-ui-divider bg-ui-surface px-3 py-2 font-sans text-base leading-6 text-ui-text placeholder:text-ui-muted focus-visible:outline-3 focus-visible:outline-ui-focus focus-visible:outline-offset-2 aria-[invalid=true]:border-ui-error-border box-border min-h-11 w-full rounded-lg border border-ui-divider bg-ui-surface px-3 py-2 font-sans text-base leading-6 text-ui-text focus-visible:outline-3 focus-visible:outline-ui-focus focus-visible:outline-offset-2 aria-[invalid=true]:border-ui-error-border max-[600px]:!text-sm min-[601px]:!text-[13px] !rounded-xl !border-ui-control-border !text-ui-text">
            @if (!competencias().length) { <option [ngValue]="0">Sin competencias disponibles</option> } @for (c of competencias(); track c.id) { <option [ngValue]="c.id">{{ c.nombre }}</option> }
          </select>
        </div>

        <div class="min-w-0">
          <button type="button" (click)="cargarCalificaciones()" [disabled]="!asignacionId || !periodoId || !competenciaId" class="inline-flex items-center justify-center gap-2 rounded-lg border border-transparent px-4 py-2 text-center font-sans text-[15px] leading-[1.25] font-semibold no-underline transition-[background-color,border-color,color,box-shadow] duration-[140ms] [cursor:pointer] focus-visible:outline-3 focus-visible:outline-ui-focus focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:border-ui-divider disabled:bg-ui-surface-soft disabled:text-ui-muted aria-disabled:cursor-not-allowed aria-disabled:border-ui-divider aria-disabled:bg-ui-surface-soft aria-disabled:text-ui-muted !border-ui-divider bg-ui-surface text-ui-text hover:bg-ui-surface-soft w-full box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px] !text-sm !leading-[1.25]">Consultar Registros</button>
        </div>
      </section>

      @if (pestanaActiva() === 'matriz') {
      <section class="min-w-0 overflow-hidden rounded-2xl border border-[#e1e8f1] bg-white !p-0 shadow-[0_5px_16px_rgb(23_43_77_/_5%)]" aria-label="Matriz de calificaciones">
        <div class="flex min-h-16 items-center justify-between gap-[14px] border-b border-[#e5eaf2] px-[18px] py-[14px] max-[600px]:items-start max-[600px]:flex-col max-[600px]:px-[14px]">
          <div class="flex flex-wrap items-center gap-2 max-[600px]:gap-[6px]" aria-label="Escala CNEB">
            <span class="mr-1 text-ui-text text-xs font-extrabold tracking-[.06em] uppercase max-[600px]:mb-0.5 max-[600px]:w-full">Escala CNEB:</span>
            <span class="inline-flex min-h-[26px] items-center justify-center rounded-lg border border-ui-divider bg-ui-surface-soft px-[9px] py-[3px] text-xs font-extrabold leading-[1.3] text-ui-action whitespace-nowrap">AD</span>
            <span class="inline-flex min-h-[26px] items-center justify-center rounded-lg border border-ui-success-border bg-ui-success-bg px-[9px] py-[3px] text-xs font-extrabold leading-[1.3] text-ui-success-text whitespace-nowrap">A</span>
            <span class="inline-flex min-h-[26px] items-center justify-center rounded-lg border border-ui-warning-border bg-ui-warning-bg px-[9px] py-[3px] text-xs font-extrabold leading-[1.3] text-ui-warning-text whitespace-nowrap">B</span>
            <span class="inline-flex min-h-[26px] items-center justify-center rounded-lg border border-ui-divider bg-ui-surface-soft px-[9px] py-[3px] text-xs font-extrabold leading-[1.3] text-ui-text whitespace-nowrap">C</span>
          </div>
          <p class="m-0 text-ui-muted text-xs">Total en matriz: <strong class="text-ui-text text-[13px]">{{ alumnos().length }}</strong></p>
        </div>

        @if (puedeEditar()) {
          <p class="" data-grade-scroll-hint="">Desliza horizontalmente para consultar Conclusión, Refuerzo y Acciones.</p>
        } @else {
          <p class="" data-grade-scroll-hint="">Desliza horizontalmente para consultar Conclusión y Refuerzo.</p>
        }
        <div class="flex flex-wrap items-end gap-3 border-b border-[#e1e8f1] bg-white p-4">
          <label class="grid min-w-[240px] flex-1 gap-1 text-xs font-semibold text-[#475569]">Buscar estudiante
            <input [ngModel]="busquedaAlumno()" (ngModelChange)="busquedaAlumno.set($event); pagina.set(0)" name="buscarCalificacion" type="search" placeholder="Nombre o apellido" class="min-h-11 rounded-xl border border-[#d9e1ec] px-3 text-sm font-normal text-[#172b4d]" />
          </label>
          <label class="grid min-w-[170px] gap-1 text-xs font-semibold text-[#475569]">Calificación
            <select [ngModel]="filtroNota()" (ngModelChange)="filtroNota.set($event); pagina.set(0)" name="filtroNotaCalificacion" class="min-h-11 rounded-xl border border-[#d9e1ec] bg-white px-3 text-sm font-normal text-[#172b4d]"><option value="TODOS">Todas</option><option value="SIN_CALIFICAR">Sin calificar</option><option value="AD">AD</option><option value="A">A</option><option value="B">B</option><option value="C">C</option></select>
          </label>
          <span class="pb-3 text-xs text-[#59677a]">{{ alumnosFiltrados().length }} estudiantes</span>
        </div>
        <div class="max-w-full overflow-x-auto rounded-2xl border border-[#e2e8f0] bg-white min-w-0 overflow-x-auto">
          <table class="w-full border-collapse text-left font-sans text-base leading-6 text-[#1e293b] [&_th]:px-4 [&_th]:py-3 [&_th]:align-middle [&_th]:border-b [&_th]:border-[#e2e8f0] [&_td]:px-4 [&_td]:py-3 [&_td]:align-middle [&_td]:border-b [&_td]:border-[#e2e8f0] [&_th]:bg-[#f4f6fb] [&_th]:text-[13px] [&_th]:leading-[1.5] [&_th]:font-semibold [&_tr:last-child_td]:border-b-0 min-w-[790px] [&_thead]:!bg-[#f7f9fc] [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:!bg-[#f8faff]" data-mobile-table-scroll="">
            <thead>
              <tr>
                <th scope="col" class="w-16 text-center whitespace-nowrap">N°</th>
                <th scope="col" class="whitespace-nowrap">Estudiante / Matrícula</th>
                <th scope="col" class="whitespace-nowrap">Calificación</th>
                <th scope="col" class="whitespace-nowrap">Conclusión</th>
                <th scope="col" class="whitespace-nowrap">Refuerzo</th>
                @if (puedeEditar()) { <th scope="col" class="sticky right-0 z-[2] min-w-[88px] whitespace-nowrap bg-[#f6f8fb] shadow-[-8px_0_12px_rgb(23_43_77_/_8%)]">Acciones</th> }
              </tr>
            </thead>
            <tbody>
              @if (cargando()) {
                <tr>
                  <td [attr.colspan]="puedeEditar() ? 6 : 5">
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
                    <td data-label="Estudiante / Matrícula"><span class="inline-flex min-h-8 items-center rounded-[9px] border border-[#dfe7f2] bg-[#f7f9fc] px-[9px] py-[5px] text-xs font-bold text-[#34445d] whitespace-nowrap">{{ alumno.estudiante }}</span></td>
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
                        <span class="inline-flex min-h-[26px] items-center justify-center rounded-lg border border-ui-error-border bg-ui-surface-soft px-[9px] py-[3px] text-xs font-[650] leading-[1.3] text-ui-text whitespace-nowrap">CNEB C</span>
                      } @else if (alumno.requiereRefuerzo === false) {
                        <span class="inline-flex min-h-[26px] items-center justify-center rounded-lg border border-ui-divider bg-ui-surface-soft px-[9px] py-[3px] text-xs font-[650] leading-[1.3] text-ui-muted whitespace-nowrap">Normal</span>
                      } @else {
                        <span class="inline-flex min-h-[26px] items-center justify-center rounded-lg border border-ui-divider bg-ui-surface-soft px-[9px] py-[3px] text-xs font-[650] leading-[1.3] text-ui-muted whitespace-nowrap">Sin dato</span>
                      }
                    </td>
                    @if (puedeEditar()) { <td class="sticky right-0 z-[1] min-w-[88px] bg-white text-right shadow-[-8px_0_12px_rgb(23_43_77_/_8%)]" data-label="Acciones"><button type="button" (click)="abrirEdicion(alumno)" class="inline-flex items-center justify-center gap-2 rounded-lg border border-transparent px-4 py-2 text-center font-sans text-[15px] leading-[1.25] font-semibold no-underline transition-[background-color,border-color,color,box-shadow] duration-[140ms] [cursor:pointer] focus-visible:outline-3 focus-visible:outline-[rgb(37_99_235_/_35%)] focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:border-[#e2e8f0] disabled:bg-[#f1f5f9] disabled:text-[#64748b] aria-disabled:cursor-not-allowed aria-disabled:border-[#e2e8f0] aria-disabled:bg-[#f1f5f9] aria-disabled:text-[#64748b] !border-[#e2e8f0] bg-white text-[#102447] hover:bg-[#f4f6fb] !min-h-11 !px-3 !text-sm !font-semibold box-border inline-flex min-w-0 min-h-10 items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:min-h-11 !leading-5">Editar</button></td> }
                  </tr>
                } @empty {
                  <tr>
                    <td [attr.colspan]="puedeEditar() ? 6 : 5">
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
        <mat-paginator [length]="alumnosFiltrados().length" [pageIndex]="pagina()" [pageSize]="tamanoPagina()" [pageSizeOptions]="[10, 25, 50]" (page)="cambiarPagina($event)" aria-label="Paginación de calificaciones" />
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
          <div class="rounded-2xl border border-[#e1e8f1] bg-white overflow-hidden shadow-sm">
            <div class="p-4 border-b border-[#e1e8f1] bg-[#f8fafc] flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 class="text-base font-bold text-[#14213d] m-0">Ranking anual interno de la sección</h3>
                <p class="text-xs text-[#59677a] m-0 mt-0.5">{{ rankingDisclaimer() }}</p>
              </div>
              <span class="px-3 py-1 rounded-lg text-xs font-semibold bg-white border border-[#e2e8f0] text-slate-700">{{ rankingAlumnos().length }} estudiantes evaluados</span>
            </div>

            <div class="overflow-x-auto scrollbar-hidden">
              <table class="w-full text-left text-sm">
                <thead class="bg-[#f1f4f9] text-[#475569] text-xs uppercase font-bold tracking-wider border-b border-[#e2e8f0]">
                  <tr>
                    <th scope="col" class="py-3 px-4 text-center w-16">Puesto</th>
                    <th scope="col" class="py-3 px-4">Estudiante</th>
                    <th scope="col" class="py-3 px-4 text-center">Puntaje interno</th>
                    <th scope="col" class="py-3 px-4 text-center">Asistencia (%)</th>
                    <th scope="col" class="py-3 px-4 text-center">Incidencias registradas</th>
                    <th scope="col" class="py-3 px-4 text-right">Mención</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-[#e2e8f0]">
                  @for (item of rankingAlumnos(); track item.matriculaId) {
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
                      <td class="py-3 px-4 font-bold text-[#14213d]">{{ item.nombreCompleto }}</td>
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
                        <span class="text-xs font-semibold text-[#184fae]">{{ item.mencionHonor }}</span>
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
              <label class="grid gap-2 text-sm">Evidencia de aprendizaje, sin nombres ni DNI
                <textarea [(ngModel)]="evidenciaObservada" name="evidencia" maxlength="300" rows="2" class="rounded-lg border p-3"></textarea>
              </label>
              <button type="button" class="min-h-11 rounded-lg border border-ui-info-border bg-ui-info-bg p-2 text-ui-info-text disabled:opacity-50" (click)="sugerirConclusionConIa()" [disabled]="generandoIa() || notaEditada === '-' || !evidenciaObservada.trim()">{{ generandoIa() ? 'Generando sugerencia…' : 'Sugerir conclusión con IA' }}</button>
              <p role="status" class="text-sm">{{ mensajeIa() }}</p>
              <label class="grid gap-1 font-sans text-base leading-6 text-ui-text m-0 gap-[7px]">
                <span class="font-sans text-[13px] leading-[1.4] font-medium text-ui-text">Calificación CNEB *</span>
                <select [(ngModel)]="notaEditada" name="nota" required class="box-border min-h-11 w-full rounded-lg border border-ui-divider bg-ui-surface px-3 py-2 font-sans text-base leading-6 text-ui-text placeholder:text-ui-muted focus-visible:outline-3 focus-visible:outline-ui-focus focus-visible:outline-offset-2 aria-[invalid=true]:border-ui-error-border box-border min-h-11 w-full rounded-lg border border-ui-divider bg-ui-surface px-3 py-2 font-sans text-base leading-6 text-ui-text focus-visible:outline-3 focus-visible:outline-ui-focus focus-visible:outline-offset-2 aria-[invalid=true]:border-ui-error-border !min-h-[46px] !text-sm max-[600px]:!text-base min-w-0 !min-h-[46px] max-w-full border px-3 py-[10px] !border-ui-control-border rounded-xl !bg-ui-surface !text-ui-text transition-colors focus:border-[var(--ui-focus)] focus:outline-none focus:shadow-[0_0_0_3px_var(--ui-focus-shadow)] max-[639px]:text-base !py-2">
                  <option value="-" disabled>Seleccione</option>
                  <option value="AD">AD · Logro destacado</option>
                  <option value="A">A · Logro esperado</option>
                  <option value="B">B · En proceso</option>
                  <option value="C">C · En inicio</option>
                </select>
              </label>
              <label class="grid gap-1 font-sans text-base leading-6 text-ui-text m-0 gap-[7px]">
                <span class="font-sans text-[13px] leading-[1.4] font-medium text-ui-text">Conclusión descriptiva</span>
                <textarea [(ngModel)]="conclusionEditada" name="conclusion" maxlength="4000" rows="5" placeholder="Describe los avances y aspectos por reforzar" class="box-border min-h-11 w-full rounded-lg border border-ui-divider bg-ui-surface px-3 py-2 font-sans text-base leading-6 text-ui-text placeholder:text-ui-muted focus-visible:outline-3 focus-visible:outline-ui-focus focus-visible:outline-offset-2 aria-[invalid=true]:border-ui-error-border !min-h-[130px] !text-sm !leading-5 max-[600px]:!text-base max-[600px]:!leading-6 resize-y min-w-0 !min-h-[44px] max-w-full border px-3 py-[10px] !border-ui-control-border rounded-xl !bg-ui-surface !text-ui-text transition-colors focus:border-[var(--ui-focus)] focus:outline-none focus:shadow-[0_0_0_3px_var(--ui-focus-shadow)] max-[639px]:text-base min-h-[100px] py-[10px] resize-y"></textarea>
              </label>
              @if (notaEditada === 'C') { <p class="m-0 -mt-[6px] rounded-[10px] border border-ui-divider bg-ui-warning-bg px-3 py-[10px] text-ui-warning-text text-xs leading-[1.5]">Esta calificación marcará al estudiante para refuerzo.</p> }
            </div>
            <footer class="sticky bottom-0 flex flex-[0_0_auto] justify-end gap-[10px] border-t border-ui-divider bg-ui-surface px-6 py-[14px] max-[600px]:flex-col-reverse max-[600px]:px-4 max-[600px]:py-3">
              <button type="button" class="inline-flex items-center justify-center gap-2 rounded-lg border border-transparent px-4 py-2 text-center font-sans !text-sm !leading-[1.25] !font-semibold no-underline transition-[background-color,border-color,color,box-shadow] duration-[140ms] [cursor:pointer] focus-visible:outline-3 focus-visible:outline-ui-focus focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:border-ui-divider disabled:bg-ui-surface-soft disabled:text-ui-muted aria-disabled:cursor-not-allowed aria-disabled:border-ui-divider aria-disabled:bg-ui-surface-soft aria-disabled:text-ui-muted border-ui-divider bg-ui-surface text-ui-text hover:bg-ui-surface-soft max-[600px]:w-full box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px] !border-ui-divider" (click)="cerrarEdicion()">Cancelar</button>
              <button type="submit" [disabled]="notaEditada === '-'" class="inline-flex items-center justify-center gap-2 rounded-lg border border-transparent px-4 py-2 text-center font-sans !text-sm !leading-[1.25] !font-semibold no-underline transition-[background-color,border-color,color,box-shadow] duration-[140ms] [cursor:pointer] focus-visible:outline-3 focus-visible:outline-ui-focus focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:border-ui-divider disabled:bg-ui-surface-soft disabled:text-ui-muted aria-disabled:cursor-not-allowed aria-disabled:border-ui-divider aria-disabled:bg-ui-surface-soft aria-disabled:text-ui-muted bg-ui-action text-ui-action-text hover:bg-ui-action !bg-ui-action max-[600px]:w-full box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]">Aplicar cambios</button>
            </footer>
          </form>
        </div>
      </dialog>
      }
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
  private readonly authStore = inject(AuthStore);
  readonly puedeEditar = computed(() => this.authStore.hasRole('DOCENTE'));
  @ViewChild('edicionDialog') private edicionDialog!: ElementRef<HTMLDialogElement>;
  readonly alumnoEditando = signal<EvaluacionAlumno | null>(null);
  notaEditada: NotaCNEB = '-';
  conclusionEditada = '';
  evidenciaObservada = '';
  sugerenciaIaEditada = false;
  readonly generandoIa = signal(false);
  readonly mensajeIa = signal('');
  readonly areas = signal<Array<{id: number; nombre: string}>>([]);
  private solicitudIa = 0;

  periodoId = 0;
  asignacionId = 0;
  competenciaId = 0;
  readonly asignaciones = signal<AsignacionDocenteResponseDto[]>([]);
  readonly competencias = signal<CompetenciaResponseDto[]>([]);
  readonly periodos = signal<PeriodoResponseDto[]>([]);
  readonly error = signal<string | null>(null);
  guardadoExitoso = signal(false);
  cargando = signal(false);

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
  readonly alumnosPagina = computed(() => this.alumnosFiltrados().slice(
    this.pagina() * this.tamanoPagina(), this.pagina() * this.tamanoPagina() + this.tamanoPagina()
  ));
  get seccionActualId(): number { return this.asignaciones().find(a => a.id === Number(this.asignacionId))?.seccionId ?? 0; }

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
    this.edicionDialog.nativeElement.showModal();
  }

  cerrarEdicion(): void { this.solicitudIa++; this.edicionDialog.nativeElement.close(); this.alumnoEditando.set(null); }

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
    this.guardadoExitoso.set(false);
  }

  ngOnInit(): void {
    if (this.authStore.hasRole('SECRETARIA')) {
      this.error.set('El backend permite consultar la matriz a Dirección y Docencia; Secretaría no tiene acceso a esos endpoints.');
      return;
    }
    this.academicoService.listarAsignaciones().subscribe({
      next: asignaciones => {
        this.asignaciones.set(asignaciones);
        this.asignacionId = asignaciones[0]?.id ?? 0;
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

  cambiarAsignacion(): void {
    this.solicitudRanking++;
    this.rankingCargando.set(false);
    const asignacion = this.asignaciones().find(a => a.id === Number(this.asignacionId));
    if (!asignacion) {
      this.cuadroHonor.set(null);
      this.rankingError.set(null);
      this.rankingCargando.set(false);
      return;
    }
    this.periodoId = 0;
    this.competenciaId = 0;
    this.alumnos.set([]);
    this.cuadroHonor.set(null);
    this.rankingError.set(null);
    this.pagina.set(0);
    this.error.set(null);
    if (this.pestanaActiva() === 'ranking') this.cargarRanking();
    this.academicoService.listarAreas(asignacion.nivelId).subscribe({next: areas => this.areas.set(areas), error: () => this.areas.set([])});
    this.academicoService.listarCompetencias(asignacion.areaCurricularId).subscribe({
      next: competencias => { this.competencias.set(competencias); this.competenciaId = competencias[0]?.id ?? 0; this.cargarCalificaciones(); },
      error: () => this.error.set('No se pudieron consultar las competencias.')
    });
    this.academicoService.listarPeriodos(asignacion.anioLectivoId).subscribe({
      next: periodos => { this.periodos.set(periodos); this.periodoId = periodos[0]?.id ?? 0; this.cargarCalificaciones(); },
      error: () => this.error.set('No se pudieron consultar los periodos.')
    });
  }

  cargarCalificaciones(): void {
    this.cargando.set(true);
    if (!this.asignacionId || !this.periodoId || !this.competenciaId) { this.cargando.set(false); return; }
    forkJoin({matriz: this.evaluacionService.listarMatriz(Number(this.asignacionId), Number(this.periodoId), Number(this.competenciaId)),
      notas: this.evaluacionService.listarCalificaciones(Number(this.asignacionId), Number(this.periodoId))}).subscribe({
      next: ({matriz: res, notas}) => {
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
        this.cargando.set(false);
        this.alumnos.set([]);
        this.error.set(err?.error?.message ?? 'No se pudo consultar la matriz de calificaciones.');
      }
    });
  }

  cambiarPagina(event: PageEvent): void {
    this.pagina.set(event.pageIndex);
    this.tamanoPagina.set(event.pageSize);
  }

  guardarCalificaciones(): void {
    if (!this.puedeEditar()) return;
    if (this.alumnos().length === 0 || !this.asignacionId || !this.competenciaId || !this.periodoId) return;
    if (this.alumnos().some(a => a.c1 === '-')) { this.error.set('Seleccione una calificación para cada estudiante.'); return; }
    this.error.set(null);
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
        this.guardadoExitoso.set(true);
        this.cargarCalificaciones();
        setTimeout(() => this.guardadoExitoso.set(false), 3000);
      },
      error: (err) => {
        this.guardadoExitoso.set(false);
        this.error.set(err?.error?.message ?? 'No se pudieron guardar las calificaciones.');
      }
    });
  }
}
