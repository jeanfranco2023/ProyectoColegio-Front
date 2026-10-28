import { Component, ElementRef, inject, signal, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { CargaPlanillaComponent } from '../../shared/ui/carga-planilla.component';
import { EvaluacionService } from '../../core/services/evaluacion.service';
import { AcademicoService } from '../../core/services/academico.service';
import { AsignacionDocenteResponseDto, CompetenciaResponseDto, PeriodoResponseDto } from '../../core/models/academico.model';

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
  imports: [CommonModule, FormsModule, CargaPlanillaComponent],
template: `
    <main class="grid min-w-0 gap-[22px] text-ui-text max-[600px]:gap-4 max-[600px]:pb-1" aria-labelledby="calificaciones-title">
      <header class="flex items-end justify-between gap-6 border-t-[3px] border-ui-divider pt-3 max-[600px]:items-stretch max-[600px]:flex-col max-[600px]:gap-[14px]">
        <div class="min-w-0">
          <p class="m-0 mb-[6px] text-ui-muted text-[11px] font-extrabold tracking-[.14em] leading-[1.4] uppercase">Evaluación docente</p>
          <h1 id="calificaciones-title" class="m-0 text-ui-text text-[clamp(24px,3vw,34px)] font-extrabold tracking-[-.035em] leading-[1.15] tracking-[-.025em]">Matriz de Calificaciones CNEB</h1>
          <p class="mt-2 max-w-[680px] text-ui-muted text-sm leading-[1.6]">Registro y evaluación por competencias conectada con la base de datos oficial.</p>
        </div>

        <div class="flex flex-[0_0_auto] items-center justify-end gap-3 max-[600px]:items-stretch max-[600px]:flex-col">
          @if (guardadoExitoso()) {
            <span class="flex items-start gap-3 rounded-lg border border-transparent px-4 py-3 font-sans text-base leading-6 border-[#86efac] bg-[#dcfce7] text-[#14532d] m-0 text-xs" role="status">
              <svg class="h-5 w-5 shrink-0" aria-hidden="true" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>
              Calificaciones guardadas en BD
            </span>
          }
          <button type="button" (click)="guardarCalificaciones()" [disabled]="alumnos().length === 0 || !asignacionId || !competenciaId" class="inline-flex items-center justify-center gap-2 rounded-lg border border-transparent px-4 py-2 text-center font-sans text-[15px] leading-[1.25] font-semibold no-underline transition-[background-color,border-color,color,box-shadow] duration-[140ms] [cursor:pointer] focus-visible:outline-3 focus-visible:outline-ui-focus focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:border-ui-divider disabled:bg-ui-surface-soft disabled:text-ui-muted aria-disabled:cursor-not-allowed aria-disabled:border-ui-divider aria-disabled:bg-ui-surface-soft aria-disabled:text-ui-muted bg-ui-action text-ui-action-text hover:bg-ui-action whitespace-nowrap max-[600px]:w-full max-[600px]:justify-center box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px] !text-sm !leading-[1.25]">
            <svg class="h-[17px] w-[17px] flex-[0_0_17px]" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
            <span>Guardar en BD</span>
          </button>
        </div>
      </header>

      @if (error()) {
        <div class="flex items-start gap-3 rounded-lg border border-transparent px-4 py-3 font-sans text-base leading-6 border-[#fca5a5] bg-[#fee2e2] text-[#7f1d1d] m-0 text-[13px]" role="alert">{{ error() }}</div>
      }

      <app-carga-planilla [asignacionId]="+asignacionId" [periodoId]="+periodoId" [seccionId]="seccionActualId" [competenciaId]="+competenciaId" (completada)="cargarCalificaciones()" />

      <section class="grid min-w-0 grid-cols-[minmax(160px,.9fr)_minmax(240px,1.25fr)_minmax(310px,1.55fr)_minmax(150px,.8fr)] items-end gap-4 rounded-2xl border border-ui-divider bg-ui-surface !p-[18px] shadow-[0_5px_16px_rgb(23_43_77_/_5%)] max-[1399px]:grid-cols-2 max-[600px]:grid-cols-1 max-[600px]:gap-[13px] max-[600px]:!p-[15px]" aria-label="Filtros de calificaciones">
        <div class="grid gap-1 font-sans text-base leading-6 text-ui-text min-w-0 m-0">
          <label class="font-sans text-[13px] leading-[1.4] font-medium text-ui-text" for="periodo-calificaciones">Periodo Académico</label>
          <select id="periodo-calificaciones" [(ngModel)]="periodoId" (change)="cargarCalificaciones()" [disabled]="!periodos().length" class="box-border min-h-11 w-full rounded-lg border border-ui-divider bg-ui-surface px-3 py-2 font-sans text-base leading-6 text-ui-text placeholder:text-ui-muted focus-visible:outline-3 focus-visible:outline-ui-focus focus-visible:outline-offset-2 aria-[invalid=true]:border-[#7f1d1d] box-border min-h-11 w-full rounded-lg border border-ui-divider bg-ui-surface px-3 py-2 font-sans text-base leading-6 text-ui-text focus-visible:outline-3 focus-visible:outline-ui-focus focus-visible:outline-offset-2 aria-[invalid=true]:border-[#7f1d1d] max-[600px]:!text-sm min-[601px]:!text-[13px]   !rounded-xl !border-ui-control-border !text-ui-text">
            @if (!periodos().length) { <option [ngValue]="0">Sin periodos disponibles</option> } @for (periodo of periodos(); track periodo.id) { <option [ngValue]="periodo.id">{{ periodo.nombre }}</option> }
          </select>
        </div>

        <div class="grid gap-1 font-sans text-base leading-6 text-ui-text min-w-0 m-0">
          <label class="font-sans text-[13px] leading-[1.4] font-medium text-ui-text" for="asignacion-calificaciones">Asignación docente y sección</label>
          <select id="asignacion-calificaciones" [(ngModel)]="asignacionId" (change)="cambiarAsignacion()" [disabled]="!asignaciones().length" class="box-border min-h-11 w-full rounded-lg border border-ui-divider bg-ui-surface px-3 py-2 font-sans text-base leading-6 text-ui-text placeholder:text-ui-muted focus-visible:outline-3 focus-visible:outline-ui-focus focus-visible:outline-offset-2 aria-[invalid=true]:border-[#7f1d1d] box-border min-h-11 w-full rounded-lg border border-ui-divider bg-ui-surface px-3 py-2 font-sans text-base leading-6 text-ui-text focus-visible:outline-3 focus-visible:outline-ui-focus focus-visible:outline-offset-2 aria-[invalid=true]:border-[#7f1d1d] max-[600px]:!text-sm min-[601px]:!text-[13px]   !rounded-xl !border-ui-control-border !text-ui-text">
            @if (!asignaciones().length) { <option [ngValue]="0">Sin asignaciones disponibles</option> } @for (a of asignaciones(); track a.id) { <option [ngValue]="a.id">Sección {{ a.seccionId }} · Área {{ a.areaCurricularId }} · Asignación {{ a.id }}</option> }
          </select>
        </div>

        <div class="grid gap-1 font-sans text-base leading-6 text-ui-text min-w-0 m-0">
          <label class="font-sans text-[13px] leading-[1.4] font-medium text-ui-text" for="competencia-calificaciones">Competencia</label>
          <select id="competencia-calificaciones" [(ngModel)]="competenciaId" (change)="cargarCalificaciones()" [disabled]="!competencias().length" class="box-border min-h-11 w-full rounded-lg border border-ui-divider bg-ui-surface px-3 py-2 font-sans text-base leading-6 text-ui-text placeholder:text-ui-muted focus-visible:outline-3 focus-visible:outline-ui-focus focus-visible:outline-offset-2 aria-[invalid=true]:border-[#7f1d1d] box-border min-h-11 w-full rounded-lg border border-ui-divider bg-ui-surface px-3 py-2 font-sans text-base leading-6 text-ui-text focus-visible:outline-3 focus-visible:outline-ui-focus focus-visible:outline-offset-2 aria-[invalid=true]:border-[#7f1d1d] max-[600px]:!text-sm min-[601px]:!text-[13px]   !rounded-xl !border-ui-control-border !text-ui-text">
            @if (!competencias().length) { <option [ngValue]="0">Sin competencias disponibles</option> } @for (c of competencias(); track c.id) { <option [ngValue]="c.id">{{ c.nombre }}</option> }
          </select>
        </div>

        <div class="min-w-0">
          <button type="button" (click)="cargarCalificaciones()" [disabled]="!asignacionId || !periodoId || !competenciaId" class="inline-flex items-center justify-center gap-2 rounded-lg border border-transparent px-4 py-2 text-center font-sans text-[15px] leading-[1.25] font-semibold no-underline transition-[background-color,border-color,color,box-shadow] duration-[140ms] [cursor:pointer] focus-visible:outline-3 focus-visible:outline-ui-focus focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:border-ui-divider disabled:bg-ui-surface-soft disabled:text-ui-muted aria-disabled:cursor-not-allowed aria-disabled:border-ui-divider aria-disabled:bg-ui-surface-soft aria-disabled:text-ui-muted !border-ui-divider bg-ui-surface text-ui-text hover:bg-ui-surface-soft w-full box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px] !text-sm !leading-[1.25]">Consultar Registros</button>
        </div>
      </section>

      <section class="min-w-0 overflow-hidden rounded-2xl border border-ui-divider bg-ui-surface !p-0 shadow-[0_5px_16px_rgb(23_43_77_/_5%)]" aria-label="Matriz de calificaciones">
        <div class="flex min-h-16 items-center justify-between gap-[14px] border-b border-ui-divider px-[18px] py-[14px] max-[600px]:items-start max-[600px]:flex-col max-[600px]:px-[14px]">
          <div class="flex flex-wrap items-center gap-2 max-[600px]:gap-[6px]" aria-label="Escala CNEB">
            <span class="mr-1 text-ui-text text-xs font-extrabold tracking-[.06em] uppercase max-[600px]:mb-0.5 max-[600px]:w-full">Escala CNEB:</span>
            <span class="inline-flex min-h-[26px] items-center justify-center rounded-lg border border-ui-divider bg-ui-surface-soft px-[9px] py-[3px] text-xs font-extrabold leading-[1.3] text-ui-action whitespace-nowrap">AD</span>
            <span class="inline-flex min-h-[26px] items-center justify-center rounded-lg border border-[#9bd8bf] bg-[#edf9f3] px-[9px] py-[3px] text-xs font-extrabold leading-[1.3] text-[#126943] whitespace-nowrap">A</span>
            <span class="inline-flex min-h-[26px] items-center justify-center rounded-lg border border-[#edca83] bg-[#fff7e7] px-[9px] py-[3px] text-xs font-extrabold leading-[1.3] text-[#805300] whitespace-nowrap">B</span>
            <span class="inline-flex min-h-[26px] items-center justify-center rounded-lg border border-ui-divider bg-ui-surface-soft px-[9px] py-[3px] text-xs font-extrabold leading-[1.3] text-ui-text whitespace-nowrap">C</span>
          </div>
          <p class="m-0 text-ui-muted text-xs">Total en matriz: <strong class="text-ui-text text-[13px]">{{ alumnos().length }}</strong></p>
        </div>

        <p class="" data-grade-scroll-hint="">Desliza horizontalmente para consultar Conclusión, Refuerzo y Acciones.</p>
        <div class="max-w-full overflow-x-auto rounded-2xl border border-ui-divider bg-ui-surface min-w-0 overflow-x-auto">
          <table class="w-full border-collapse text-left font-sans text-base leading-6 text-ui-text [&_th]:px-4 [&_th]:py-3 [&_th]:align-middle [&_th]:border-b [&_th]:border-ui-divider [&_td]:px-4 [&_td]:py-3 [&_td]:align-middle [&_td]:border-b [&_td]:border-ui-divider [&_th]:bg-ui-surface-soft [&_th]:text-[13px] [&_th]:leading-[1.5] [&_th]:font-semibold [&_tr:last-child_td]:border-b-0 min-w-[790px] [&_thead]:!bg-ui-surface-soft [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:!bg-ui-surface-soft" data-mobile-table-scroll="">
            <thead>
              <tr>
                <th scope="col" class="w-16 text-center whitespace-nowrap">N°</th>
                <th scope="col" class="whitespace-nowrap">Estudiante / Matrícula</th>
                <th scope="col" class="whitespace-nowrap">Calificación</th>
                <th scope="col" class="whitespace-nowrap">Conclusión</th>
                <th scope="col" class="whitespace-nowrap">Refuerzo</th>
                <th scope="col" class="sticky right-0 z-[2] min-w-[88px] whitespace-nowrap bg-ui-surface-soft shadow-[-8px_0_12px_rgb(23_43_77_/_8%)]">Acciones</th>
              </tr>
            </thead>
            <tbody>
              @if (cargando()) {
                <tr>
                  <td colspan="6">
                    <div class="grid min-h-[220px] content-center justify-items-center gap-2 p-6 text-center" role="status" aria-live="polite">
                      <span class="mb-1 h-[30px] w-[30px] rounded-full border-[3px] border-ui-divider border-t-[#2864c5] animate-[grade-spin_.8s_linear_infinite]" aria-hidden="true"></span>
                      <span class="text-ui-text text-sm font-bold">Consultando calificaciones</span>
                      <span class="max-w-[48ch] text-ui-muted text-xs leading-[1.5]">Espera mientras se carga la matriz.</span>
                    </div>
                  </td>
                </tr>
              } @else {
                @for (alumno of alumnos(); track alumno.matriculaId) {
                  <tr [ngClass]="alumno.c1 === '-' ? '[&>td]:bg-[#fffaf0] dark:[&>td]:bg-[#443821] dark:[&>td]:text-ui-text [&>td:first-child]:shadow-[inset_3px_0_var(--ui-control-border)] [&>td:last-child]:bg-[#fffaf0] dark:[&>td:last-child]:bg-[#443821]' : ''">
                    <td class="w-16 text-center text-ui-muted tabular-nums" data-label="N°">{{ alumno.numeroOrden }}</td>
                    <td data-label="Estudiante / Matrícula"><span class="inline-flex min-h-8 items-center rounded-[9px] border border-ui-divider bg-ui-surface-soft px-[9px] py-[5px] text-xs font-bold text-ui-text whitespace-nowrap">{{ alumno.estudiante }}</span></td>
                    <td class="text-center" data-label="Calificación">
                      @if (alumno.c1 === '-') {
                        <span class="inline-flex min-h-[26px] items-center justify-center rounded-lg border border-ui-divider bg-ui-surface-soft px-[9px] py-[3px] text-xs font-extrabold leading-[1.3] text-ui-muted whitespace-nowrap">Sin calificar</span>
                      } @else {
                        <span class="inline-flex min-h-[26px] items-center justify-center rounded-lg border px-[9px] py-[3px] text-xs font-extrabold leading-[1.3] whitespace-nowrap" [ngClass]="{ 'border-ui-divider bg-ui-surface-soft text-ui-action': alumno.c1 === 'AD', 'border-[#9bd8bf] bg-[#edf9f3] text-[#126943]': alumno.c1 === 'A', 'border-[#edca83] bg-[#fff7e7] text-[#805300]': alumno.c1 === 'B', 'border-ui-divider bg-ui-surface-soft text-ui-text': alumno.c1 === 'C' }">{{ alumno.c1 }}</span>
                      }
                    </td>
                    <td class="max-w-[320px] overflow-hidden text-ellipsis whitespace-nowrap text-ui-muted" [title]="alumno.conclusionDescriptiva || 'Sin conclusión'" data-label="Conclusión">{{ alumno.conclusionDescriptiva || 'Sin conclusión' }}</td>
                    <td data-label="Refuerzo">
                      @if (alumno.requiereRefuerzo === true) {
                        <span class="inline-flex min-h-[26px] items-center justify-center rounded-lg border border-[#f1c7bf] bg-ui-surface-soft px-[9px] py-[3px] text-xs font-[650] leading-[1.3] text-ui-text whitespace-nowrap">CNEB C</span>
                      } @else if (alumno.requiereRefuerzo === false) {
                        <span class="inline-flex min-h-[26px] items-center justify-center rounded-lg border border-ui-divider bg-ui-surface-soft px-[9px] py-[3px] text-xs font-[650] leading-[1.3] text-ui-muted whitespace-nowrap">Normal</span>
                      } @else {
                        <span class="inline-flex min-h-[26px] items-center justify-center rounded-lg border border-ui-divider bg-ui-surface-soft px-[9px] py-[3px] text-xs font-[650] leading-[1.3] text-ui-muted whitespace-nowrap">Sin dato</span>
                      }
                    </td>
                    <td class="sticky right-0 z-[1] min-w-[88px] bg-ui-surface text-right shadow-[-8px_0_12px_rgb(23_43_77_/_8%)]" data-label="Acciones"><button type="button" (click)="abrirEdicion(alumno)" class="inline-flex items-center justify-center gap-2 rounded-lg border border-transparent px-4 py-2 text-center font-sans text-[15px] leading-[1.25] font-semibold no-underline transition-[background-color,border-color,color,box-shadow] duration-[140ms] [cursor:pointer] focus-visible:outline-3 focus-visible:outline-ui-focus focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:border-ui-divider disabled:bg-ui-surface-soft disabled:text-ui-muted aria-disabled:cursor-not-allowed aria-disabled:border-ui-divider aria-disabled:bg-ui-surface-soft aria-disabled:text-ui-muted !border-ui-divider bg-ui-surface text-ui-text hover:bg-ui-surface-soft !min-h-11 !px-3 !text-sm !font-semibold box-border inline-flex min-w-0 min-h-10 items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:min-h-11 !leading-5">Editar</button></td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="6">
                      <div class="grid min-h-[220px] content-center justify-items-center gap-2 p-6 text-center">
                        <span class="grid h-[42px] w-[42px] place-items-center rounded-[14px] bg-[#eff4fb] text-[#51719e] text-lg" aria-hidden="true">✓</span>
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
      </section>

      <dialog #edicionDialog class="fixed inset-0 m-auto w-[min(620px,calc(100vw-24px))] max-w-[calc(100vw-24px)] max-h-[calc(100dvh-24px)] overflow-hidden rounded-[20px] border border-ui-divider bg-ui-surface p-0 text-ui-text font-sans shadow-[0_24px_72px_rgb(15_31_57_/_24%)] backdrop:bg-[rgb(15_31_57_/_48%)] backdrop:backdrop-blur-[3px]" aria-labelledby="calificacion-dialog-title">
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
              <button type="button" class="min-h-11 rounded-lg border border-indigo-200 bg-indigo-50 p-2 text-indigo-800 disabled:opacity-50" (click)="sugerirConclusionConIa()" [disabled]="generandoIa() || notaEditada === '-' || !evidenciaObservada.trim()">{{ generandoIa() ? 'Generando sugerencia…' : 'Sugerir conclusión con IA' }}</button>
              <p role="status" class="text-sm">{{ mensajeIa() }}</p>
              <label class="grid gap-1 font-sans text-base leading-6 text-ui-text m-0 gap-[7px]">
                <span class="font-sans text-[13px] leading-[1.4] font-medium text-ui-text">Calificación CNEB *</span>
                <select [(ngModel)]="notaEditada" name="nota" required class="box-border min-h-11 w-full rounded-lg border border-ui-divider bg-ui-surface px-3 py-2 font-sans text-base leading-6 text-ui-text placeholder:text-ui-muted focus-visible:outline-3 focus-visible:outline-ui-focus focus-visible:outline-offset-2 aria-[invalid=true]:border-[#7f1d1d] box-border min-h-11 w-full rounded-lg border border-ui-divider bg-ui-surface px-3 py-2 font-sans text-base leading-6 text-ui-text focus-visible:outline-3 focus-visible:outline-ui-focus focus-visible:outline-offset-2 aria-[invalid=true]:border-[#7f1d1d] !min-h-[46px] !text-sm max-[600px]:!text-base min-w-0 !min-h-[46px] max-w-full border px-3 py-[10px] !border-ui-control-border rounded-xl !bg-ui-surface !text-ui-text transition-colors focus:border-[#5b83d6] focus:outline-none focus:shadow-[0_0_0_3px_rgb(59_110_214_/_13%)] max-[639px]:text-base !py-2">
                  <option value="-" disabled>Seleccione</option>
                  <option value="AD">AD · Logro destacado</option>
                  <option value="A">A · Logro esperado</option>
                  <option value="B">B · En proceso</option>
                  <option value="C">C · En inicio</option>
                </select>
              </label>
              <label class="grid gap-1 font-sans text-base leading-6 text-ui-text m-0 gap-[7px]">
                <span class="font-sans text-[13px] leading-[1.4] font-medium text-ui-text">Conclusión descriptiva</span>
                <textarea [(ngModel)]="conclusionEditada" name="conclusion" maxlength="4000" rows="5" placeholder="Describe los avances y aspectos por reforzar" class="box-border min-h-11 w-full rounded-lg border border-ui-divider bg-ui-surface px-3 py-2 font-sans text-base leading-6 text-ui-text placeholder:text-ui-muted focus-visible:outline-3 focus-visible:outline-ui-focus focus-visible:outline-offset-2 aria-[invalid=true]:border-[#7f1d1d] !min-h-[130px] !text-sm !leading-5 max-[600px]:!text-base max-[600px]:!leading-6 resize-y min-w-0 !min-h-[44px] max-w-full border px-3 py-[10px] !border-ui-control-border rounded-xl !bg-ui-surface !text-ui-text transition-colors focus:border-[#5b83d6] focus:outline-none focus:shadow-[0_0_0_3px_rgb(59_110_214_/_13%)] max-[639px]:text-base min-h-[100px] py-[10px] resize-y"></textarea>
              </label>
              @if (notaEditada === 'C') { <p class="m-0 -mt-[6px] rounded-[10px] border border-ui-divider bg-[#fff8e9] px-3 py-[10px] text-[#76500a] text-xs leading-[1.5]">Esta calificación marcará al estudiante para refuerzo.</p> }
            </div>
            <footer class="sticky bottom-0 flex flex-[0_0_auto] justify-end gap-[10px] border-t border-ui-divider bg-ui-surface px-6 py-[14px] max-[600px]:flex-col-reverse max-[600px]:px-4 max-[600px]:py-3">
              <button type="button" class="inline-flex items-center justify-center gap-2 rounded-lg border border-transparent px-4 py-2 text-center font-sans !text-sm !leading-[1.25] !font-semibold no-underline transition-[background-color,border-color,color,box-shadow] duration-[140ms] [cursor:pointer] focus-visible:outline-3 focus-visible:outline-ui-focus focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:border-ui-divider disabled:bg-ui-surface-soft disabled:text-ui-muted aria-disabled:cursor-not-allowed aria-disabled:border-ui-divider aria-disabled:bg-ui-surface-soft aria-disabled:text-ui-muted border-ui-divider bg-ui-surface text-ui-text hover:bg-ui-surface-soft max-[600px]:w-full box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px] !border-ui-divider" (click)="cerrarEdicion()">Cancelar</button>
              <button type="submit" [disabled]="notaEditada === '-'" class="inline-flex items-center justify-center gap-2 rounded-lg border border-transparent px-4 py-2 text-center font-sans !text-sm !leading-[1.25] !font-semibold no-underline transition-[background-color,border-color,color,box-shadow] duration-[140ms] [cursor:pointer] focus-visible:outline-3 focus-visible:outline-ui-focus focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:border-ui-divider disabled:bg-ui-surface-soft disabled:text-ui-muted aria-disabled:cursor-not-allowed aria-disabled:border-ui-divider aria-disabled:bg-ui-surface-soft aria-disabled:text-ui-muted bg-ui-action text-ui-action-text hover:bg-ui-action !bg-ui-action max-[600px]:w-full box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]">Aplicar cambios</button>
            </footer>
          </form>
        </div>
      </dialog>
    </main>
  `
})
export class CalificacionesComponent implements OnInit {
  private readonly evaluacionService = inject(EvaluacionService);
  private readonly academicoService = inject(AcademicoService);
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
  get seccionActualId(): number { return this.asignaciones().find(a => a.id === Number(this.asignacionId))?.seccionId ?? 0; }

  abrirEdicion(alumno: EvaluacionAlumno): void {
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
    const seleccionado = this.alumnoEditando();
    if (!seleccionado || this.notaEditada === '-') return;
    this.alumnos.update(lista => lista.map(alumno => alumno.matriculaId === seleccionado.matriculaId
      ? { ...alumno, c1: this.notaEditada, conclusionDescriptiva: this.conclusionEditada.trim(), requiereRefuerzo: this.notaEditada === 'C', sugerenciaIaUtilizada: this.sugerenciaIaEditada }
      : alumno));
    this.cerrarEdicion();
    this.guardadoExitoso.set(false);
  }

  ngOnInit(): void {
    this.academicoService.listarAsignaciones().subscribe({
      next: asignaciones => {
        this.asignaciones.set(asignaciones);
        this.asignacionId = asignaciones[0]?.id ?? 0;
        this.cambiarAsignacion();
      },
      error: () => this.error.set('No se pudieron consultar las asignaciones docentes.')
    });
  }

  cambiarAsignacion(): void {
    const asignacion = this.asignaciones().find(a => a.id === Number(this.asignacionId));
    if (!asignacion) return;
    this.periodoId = 0;
    this.competenciaId = 0;
    this.alumnos.set([]);
    this.error.set(null);
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
          this.alumnos.set(
            res.map((c, idx) => ({
              matriculaId: c.matriculaId,
              numeroOrden: idx + 1,
              estudiante: `Matrícula #${c.matriculaId}`,
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
      },
      error: (err) => {
        this.cargando.set(false);
        this.alumnos.set([]);
        this.error.set(err?.error?.message ?? 'No se pudo consultar la matriz de calificaciones.');
      }
    });
  }

  guardarCalificaciones(): void {
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
