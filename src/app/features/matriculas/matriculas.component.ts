import { FormatoEntradaDirective } from '../../shared/ui/formato-entrada.directive';
import {
  esNombreValido,
  esDniValido,
  esCelularValido,
  esEmailValido,
  esDireccionValida
} from '../../core/utils/validaciones';
import { Component, inject, signal, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { obtenerFotoEstudiante, guardarFotoEstudiante } from '../../core/utils/avatar.util';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { UiPaginacionComponent, paginarRegistros } from '../../shared/ui/ui-paginacion.component';
import { MatriculaService } from '../../core/services/matricula.service';
import { UiCalendarComponent } from '../../shared/ui/ui-calendar.component';
import {
  FichaMatriculaResponseDto,
  MatriculaResponseDto,
  EstudianteResponseDto,
  RegistrarEstudianteRequestDto,
  EstadoTerminalMatricula,
  EstadoPagoMatricula,
  TipoDocumento,
  Genero,
  ApoderadoResponseDto,
  ApoderadoFichaResponseDto,
  ParentescoApoderado,
  MatriculaPresencialResponseDto,
  PagoPresencialEnLinea,
  EstadoPagoPresencial
} from '../../core/models/matricula.model';
import { catchError, forkJoin, of } from 'rxjs';
import { AcademicoService } from '../../core/services/academico.service';
import { AnioLectivoResponseDto, NivelResponseDto, SeccionResponseDto } from '../../core/models/academico.model';
import { MatriculaPublicaService } from '../../core/services/matricula-publica.service';
import { ModalidadIngreso, SolicitudMatriculaPublicaAdminDto } from '../../core/models/matricula-publica.model';
import { UiDatePePipe } from '../../shared/ui/ui-date-pe.pipe';
import { AuthStore } from '../../core/state/auth.store';
import { fechaActualEnPeru } from '../../core/utils/fecha-nacimiento';
import { compararGradosPorSecuenciaInstitucional } from '../../core/utils/ordenamiento-grados';
import { SimuladorCheckoutComponent, PagoSimuladoEvent } from '../../shared/ui/simulador-checkout.component';

export interface EstudianteMatriculadoItem {
  id: number;
  codigoMatricula: string;
  estudianteId: number;
  seccionId?: number;
  gradoId?: number;
  seccionLetra?: string;
  seccionNombre?: string;
  estado: string;
  estadoPagoMatricula: EstadoPagoMatricula;
  fechaMatricula: string;
  observaciones?: string;
  modalidadIngreso?: ModalidadIngreso;
  colegioProcedencia?: string | null;
}

@Component({
  selector: 'app-matriculas',
  standalone: true,
  imports: [FormatoEntradaDirective, CommonModule, FormsModule, MatDialogModule, MatButtonModule, UiPaginacionComponent, UiDatePePipe, UiCalendarComponent, SimuladorCheckoutComponent],
  template: `
    <div class="space-y-6 min-w-0 text-ui-text max-[640px]:text-[13px] [&_*:focus-visible]:outline-[3px] [&_*:focus-visible]:outline-[var(--ui-action)] [&_*:focus-visible]:outline-offset-[3px]">
      <!-- Top Banner / Alert -->
      @if (mensajeExito()) {
        <div class="p-4 rounded-2xl border-t-[3px] border-t-ui-success-border pt-3 bg-ui-success-bg border border-ui-success-border text-ui-success-text flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="p-1.5 rounded-lg bg-ui-success-bg text-ui-success-text">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </span>
            <div>
              <p class="font-bold text-sm text-ui-success-text">Operación Exitosa</p>
              <p class="!text-sm text-ui-success-text">{{ mensajeExito() }}</p>
            </div>
          </div>
          <button (click)="mensajeExito.set(null)" class="text-ui-success-text hover:text-ui-success-text cursor-pointer !text-sm font-semibold px-2 py-1 max-[640px]:w-full box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]">
            ✕
          </button>
        </div>
      }

      @if (error()) {
        <div class="p-4 rounded-2xl border-t-[3px] border-t-ui-error-border pt-3 bg-ui-error-bg border border-ui-error-border text-ui-error-text flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="p-1.5 rounded-lg bg-ui-error-bg text-ui-error-text">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </span>
            <div>
              <p class="font-bold text-sm text-ui-error-text">Error</p>
              <p class="!text-sm text-ui-error-text">{{ error() }}</p>
            </div>
          </div>
          <button (click)="error.set(null)" class="text-ui-error-text hover:text-ui-error-text cursor-pointer !text-sm font-semibold px-2 py-1 max-[640px]:w-full box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]">
            ✕
          </button>
        </div>
      }

      <!-- Page Header -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-t-[3px] border-t-ui-gold pt-3">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="px-2.5 py-0.5 rounded-full border border-ui-divider bg-ui-surface-soft text-xs font-bold uppercase tracking-wider text-ui-action">
              Módulo Académico
            </span>
            <span class="text-sm text-ui-muted">•</span>
            <span class="text-sm text-ui-muted font-medium">Año Lectivo {{ anioActivoTexto() }}</span>
          </div>
          <h2 class="text-2xl sm:text-3xl font-extrabold tracking-[-.025em] text-ui-text">
            Padrón de Estudiantes & Matrículas
          </h2>
          <p class="text-sm text-ui-muted mt-1">
            Gestión centralizada de estudiantes, registro oficial y asignación de vacantes en secciones.
          </p>
        </div>

        <!-- Action Buttons -->
        <div class="flex flex-wrap items-center gap-2.5">
          @if (auth.hasRole('SECRETARIA') || auth.hasRole('DIRECCION') || auth.hasRole('ADMINISTRADOR')) {
          <button
            id="btn-abrir-matricula-presencial"
            [disabled]="!anios().length"
            (click)="abrirModalMatriculaPresencial()"
            class="inline-flex min-h-11 items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#173B67] hover:bg-[#1e4b82] text-white font-semibold text-sm leading-tight whitespace-nowrap cursor-pointer disabled:cursor-wait disabled:opacity-60 transition shadow-sm max-[640px]:w-full"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0 text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Registrar matrícula</span>
          </button>
          <button
            id="btn-abrir-nueva-matricula"
            (click)="abrirModalNuevaMatricula()"
            title="Ratifica en un nuevo año o asigna sección a un estudiante ya existente o a una admisión online aprobada"
            class="inline-flex min-h-11 items-center justify-center gap-2 px-4 py-2 border border-[#173B67]/30 rounded-xl bg-white hover:bg-[#f0f5fb] text-[#173B67] font-semibold text-sm leading-tight whitespace-nowrap cursor-pointer transition shadow-2xs max-[640px]:w-full"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true" focusable="false">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Ratificar / asignar sección</span>
          </button>
          }
        </div>
      </div>

      <!-- Main Navigation Tabs -->
      <div class="flex flex-wrap items-center gap-1 border-b border-ui-divider">
        <button
          id="tab-estudiantes"
          (click)="pestanaActiva.set('estudiantes')"
          [class]="pestanaActiva() === 'estudiantes'
            ? 'px-5 py-3 border-b-2 border-[#173B67] text-[#173B67] font-bold text-sm flex items-center gap-2 transition cursor-pointer'
            : 'px-5 py-3 border-b-2 border-transparent text-slate-600 hover:text-[#173B67] font-semibold text-sm flex items-center gap-2 transition cursor-pointer'"
         class="max-[640px]:w-full inline-flex min-h-11 items-center justify-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <span>Padrón de estudiantes</span>
          <span class="px-2 py-0.5 rounded-full text-xs font-mono font-bold border border-[#173B67]/20 bg-[#f0f5fb] text-[#173B67]">
            {{ estudiantesEnPadron().length }}
          </span>
        </button>

        <button
          id="tab-matriculas"
          (click)="cambiarPestana('matriculas')"
          [class]="pestanaActiva() === 'matriculas'
            ? 'px-5 py-3 border-b-2 border-[#173B67] text-[#173B67] font-bold text-sm flex items-center gap-2 transition cursor-pointer'
            : 'px-5 py-3 border-b-2 border-transparent text-slate-600 hover:text-[#173B67] font-semibold text-sm flex items-center gap-2 transition cursor-pointer'"
         class="max-[640px]:w-full inline-flex min-h-11 items-center justify-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <span>Matrículas por sección</span>
          <span class="px-2 py-0.5 rounded-full text-xs font-mono font-bold border border-[#173B67]/20 bg-[#f0f5fb] text-[#173B67]">
            {{ estudiantes().length }}
          </span>
        </button>
      </div>

      <!-- ============================================================== -->
      <!-- TAB 1: PADRON DE ESTUDIANTES (LISTA COMPLETA DE ALUMNOS)       -->
      <!-- ============================================================== -->
      @if (pestanaActiva() === 'estudiantes') {
        <div class="space-y-4">
          <!-- Filter / Search Bar for Students -->
          <div class="p-3.5 rounded-xl bg-ui-surface-soft border border-ui-divider flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <label class="grid gap-1 w-full sm:max-w-md text-xs font-semibold text-ui-muted">
              Buscar en el padrón
              <span class="relative block">
                <span class="absolute inset-y-0 left-3 z-[1] flex items-center pointer-events-none text-ui-muted">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                <input
                  id="input-filtro-estudiante" aria-label="Buscar estudiante"
                  type="text"
                  [(ngModel)]="busquedaEstudiante"
                  (ngModelChange)="paginaPadron = 0"
                  placeholder="Buscar por DNI, nombres o apellidos..."
                  class="w-full min-h-10 !pl-9 pr-3 py-1.5 rounded-lg bg-ui-surface border border-ui-control-border text-ui-text text-sm font-medium placeholder:text-ui-muted focus:outline-none focus:border-ui-focus transition"
                />
              </span>
            </label>

            <div class="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button
                (click)="cargarEstudiantes()"
                class="btn-action-matricula px-4 py-2 rounded-lg bg-ui-action hover:opacity-95 text-ui-action-text text-sm font-semibold transition cursor-pointer inline-flex min-h-10 items-center justify-center gap-2 shadow-xs max-[640px]:w-full"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Actualizar Padrón</span>
              </button>
            </div>
          </div>

          <!-- Students Table -->
          <div class="rounded-xl bg-ui-surface border border-ui-divider overflow-hidden shadow-[var(--ui-card-shadow)]">
            <div class="overflow-x-auto" data-enrollments-table-scroll="">
              <table id="tabla-estudiantes" class="w-full min-w-[960px] border-collapse text-left text-sm text-ui-text" data-mobile-table-cards="">
                <thead class="bg-ui-surface-soft border-b border-ui-divider text-ui-action uppercase tracking-wider font-bold text-xs">
                  <tr>
                    <th class="px-4 py-3.5 text-left">Código</th>
                    <th class="px-4 py-3.5 text-left">DNI</th>
                    <th class="px-4 py-3.5 text-left">Apellidos y Nombres</th>
                    <th class="px-4 py-3.5 text-center">F. Nacimiento</th>
                    <th class="px-4 py-3.5 text-center">Género</th>
                    <th class="px-4 py-3.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-ui-divider bg-ui-surface">
                  @if (cargandoEstudiantes()) {
                    <tr>
                      <td colspan="6" class="text-center py-12 text-ui-muted">
                        <span class="inline-block w-6 h-6 border-2 border-ui-divider border-t-ui-action rounded-full animate-spin mb-2"></span>
                        <p class="font-medium text-sm">Consultando estudiantes registrados en la base de datos...</p>
                      </td>
                    </tr>
                  } @else {
                    @for (est of estudiantesPaginados(); track est.id) {
                      <tr class="bg-ui-surface hover:bg-ui-surface-soft/75 transition-colors">
                        <td class="px-4 py-3.5 font-mono font-bold text-sm text-ui-action whitespace-nowrap" data-label="Código de estudiante">
                          {{ codigoEstudianteVisible(est) }}
                        </td>
                        <td class="px-4 py-3.5 font-mono font-bold text-base text-ui-text whitespace-nowrap" data-label="DNI">
                          {{ est.numeroDocumento }}
                        </td>
                        <td class="px-4 py-3.5 text-left" data-label="Apellidos y Nombres">
                          <div class="flex items-center justify-start gap-3">
                            <img [src]="obtenerFotoEstudiante(est)" alt="Foto del estudiante" class="w-10 h-10 rounded-full object-cover border border-ui-divider shadow-2xs shrink-0" />
                            <div class="min-w-0">
                              <div class="font-bold text-base text-ui-text truncate">
                                {{ est.apellidoPaterno }} {{ est.apellidoMaterno }}, {{ est.nombres }}
                              </div>
                              @if (solicitudPendienteDeEstudiante(est.id); as solPendiente) {
                                <div class="mt-1 inline-flex items-center gap-1.5 rounded-full border border-ui-warning-border bg-ui-warning-bg px-2.5 py-0.5 text-xs font-bold text-ui-warning-text">
                                  <span>Matrícula pública · Sección pendiente ({{ nombreNivelDeGrado(solPendiente.gradoId) }} · {{ gradosMap.get(solPendiente.gradoId) ?? ('Grado ' + solPendiente.gradoId) }})</span>
                                </div>
                              }
                              @if (est.alergiasCondiciones) {
                                <div class="text-xs text-ui-warning-text font-semibold mt-0.5">
                                  ⚠️ {{ est.alergiasCondiciones }}
                                </div>
                              }
                            </div>
                          </div>
                        </td>
                        <td class="px-4 py-3.5 font-mono text-sm text-ui-text text-center whitespace-nowrap" data-label="F. Nacimiento">
                          {{ est.fechaNacimiento | uiDatePe }}
                        </td>
                        <td class="px-4 py-3.5 text-center" data-label="Género">
                          @if (est.genero === 'M') {
                            <span class="inline-flex items-center justify-center px-3 py-0.5 rounded-full border border-ui-divider bg-ui-surface-soft text-xs font-semibold text-ui-text">
                              Masculino
                            </span>
                          } @else if (est.genero === 'F') {
                            <span class="inline-flex items-center justify-center px-3 py-0.5 rounded-full border border-ui-divider bg-ui-surface-soft text-xs font-semibold text-ui-text">
                              Femenino
                            </span>
                          } @else {
                            <span class="text-ui-muted">-</span>
                          }
                        </td>
                        <td class="px-4 py-3.5 text-right" data-label="Acciones">
                          <div class="inline-flex items-center justify-end gap-2">
                            <!-- Botón Detalles (Icono ojo) -->
                            <button
                              type="button"
                              (click)="abrirModalDetallesEstudiante(est)"
                              class="h-9 w-9 rounded-lg border border-ui-success-border bg-ui-success-bg hover:opacity-85 text-ui-success-text flex items-center justify-center transition cursor-pointer"
                              title="Ver detalles completos y apoderado"
                              aria-label="Ver detalles"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>

                            <!-- Botón Editar (Icono lápiz) -->
                            @if (auth.hasRole('SECRETARIA') || auth.hasRole('DIRECCION') || auth.hasRole('ADMINISTRADOR')) {
                              <button
                                type="button"
                                (click)="abrirModalCorregirDniEstudiante(est)"
                                class="h-9 w-9 rounded-lg border border-ui-info-border bg-ui-info-bg hover:opacity-85 text-ui-info-text flex items-center justify-center transition cursor-pointer"
                                title="Editar estudiante / Corregir DNI"
                                aria-label="Editar estudiante"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                  <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>

                              <button
                                type="button"
                                (click)="abrirModalEstadoEstudiante(est)"
                                class="h-9 w-9 rounded-lg border border-ui-divider bg-ui-surface hover:bg-ui-surface-soft text-ui-muted flex items-center justify-center transition cursor-pointer"
                                title="Cambiar estado en BD"
                                aria-label="Cambiar estado"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                  <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                              </button>
                            }

                            <!-- Matricular o asignar sección si aún no tiene sección asignada -->
                            @if (!estaMatriculadoConSeccion(est.id) || solicitudPendienteDeEstudiante(est.id)) {
                              <button
                                type="button"
                                (click)="prepararMatriculaParaEstudiante(est)"
                                class="px-3 py-1.5 min-h-9 rounded-lg bg-ui-action hover:opacity-90 text-ui-action-text text-xs font-semibold inline-flex items-center gap-1 transition cursor-pointer"
                                [title]="solicitudPendienteDeEstudiante(est.id) ? 'Asignar sección a matrícula pública pagada' : 'Matricular estudiante'"
                              >
                                <span>{{ solicitudPendienteDeEstudiante(est.id) ? 'Asignar sección' : 'Matricular' }}</span>
                              </button>
                            }
                          </div>
                        </td>
                      </tr>
                    } @empty {
                      <tr [hidden]="!!error()">
                        <td colspan="6" class="text-center pt-4 pb-12 text-ui-muted space-y-2">
                          <svg aria-hidden="true" focusable="false" viewBox="0 0 48 48" fill="none" stroke="var(--ui-action)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="block h-[42px] w-[42px] mx-auto"><path d="M6 11.5c6-2 12-1 18 2.5v25c-6-3.5-12-4.5-18-2.5z"/><path d="M42 11.5c-6-2-12-1-18 2.5v25c6-3.5 12-4.5 18-2.5z"/><path d="M24 14v25" stroke="var(--ui-gold)"/><path d="M11 17c3-.5 6 .1 9 1.5M11 23c3-.5 6 .1 9 1.5M28 18.5c3-1.4 6-2 9-1.5M28 24.5c3-1.4 6-2 9-1.5" stroke="var(--ui-gold)"/></svg>
                          <p class="font-medium text-ui-muted">No se encontraron estudiantes registrados.</p>
                          @if (authStore.hasRole('SECRETARIA') || authStore.hasRole('ADMINISTRADOR')) {
                            <p class="text-sm text-ui-muted">Haz clic en "Registrar matrícula" para dar de alta y matricular al primer estudiante.</p>
                          } @else {
                            <p class="text-sm text-ui-muted">No hay estudiantes disponibles para consultar con este acceso.</p>
                          }
                        </td>
                      </tr>
                    }
                  }
                </tbody>
              </table>
            </div>
            <ui-paginacion
              [totalRegistros]="estudiantesFiltradosPadron().length"
              [paginaActual]="paginaPadron + 1"
              [tamanoPagina]="tamanoPaginaPadron"
              etiqueta="estudiantes"
              ariaLabel="Paginación del padrón de estudiantes"
              (cambioPagina)="cambiarPaginaPadron($event)"
            />
          </div>
        </div>
      }

      <!-- ============================================================== -->
      <!-- TAB 2: MATRICULAS POR SECCION                                  -->
      <!-- ============================================================== -->
      @if (pestanaActiva() === 'matriculas') {
        <div class="space-y-4">
          <!-- Filters Bar -->
          <div class="p-3.5 rounded-xl bg-ui-surface-soft border border-ui-divider grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
            <label class="grid gap-1 text-xs font-semibold text-ui-muted">
              Año Lectivo
              <select
                [(ngModel)]="anioLectivoId" aria-label="Año Lectivo"
                (change)="cargarSecciones()"
                class="w-full min-h-10 px-3 py-1.5 rounded-lg bg-ui-surface border border-ui-control-border text-ui-text text-sm font-medium focus:outline-none focus:border-ui-focus transition"
              >
                @for (anio of anios(); track anio.id) {
                  <option [ngValue]="anio.id">{{ anio.anio }} {{ anio.abierto ? '(Activo)' : '' }}</option>
                }
              </select>
            </label>

            <label class="grid gap-1 text-xs font-semibold text-ui-muted">
              Grado
              <select [(ngModel)]="filtroGradoId" aria-label="Grado" (ngModelChange)="cambiarFiltroGrado($event)" class="w-full min-h-10 px-3 py-1.5 rounded-lg bg-ui-surface border border-ui-control-border text-ui-text text-sm font-medium focus:outline-none focus:border-ui-focus transition">
                <option [ngValue]="0">Todos los grados</option>
                @for (grado of gradosOrdenadosDisponibles(); track grado.id) {
                  <option [ngValue]="grado.id">{{ grado.nombre }}</option>
                }
              </select>
            </label>

            <label class="grid gap-1 text-xs font-semibold text-ui-muted">
              Sección
              <select
                [(ngModel)]="filtroSeccionLetra" aria-label="Sección"
                (ngModelChange)="paginaMatriculas = 0"
                class="w-full min-h-10 px-3 py-1.5 rounded-lg bg-ui-surface border border-ui-control-border text-ui-text text-sm font-medium focus:outline-none focus:border-ui-focus transition"
              >
                <option value="TODAS">Todas las secciones</option>
                <option value="A">Sección A</option>
                <option value="B">Sección B</option>
                <option value="C">Sección C</option>
              </select>
            </label>

            <label class="grid gap-1 text-xs font-semibold text-ui-muted">
              Estado de Matrícula
              <select
                [(ngModel)]="filtroEstado" aria-label="Estado de Matrícula"
                (ngModelChange)="paginaMatriculas = 0"
                class="w-full min-h-10 px-3 py-1.5 rounded-lg bg-ui-surface border border-ui-control-border text-ui-text text-sm font-medium focus:outline-none focus:border-ui-focus transition"
              >
                <option value="TODOS">Todos los Estados</option>
                <option value="MATRICULADO">Matriculado</option>
                <option value="INGRESO_TRASLADO">Ingreso por traslado</option>
                <option value="RESERVADA_TEMPORAL">Reserva temporal</option>
                <option value="SOLICITADA">Solicitada</option>
                <option value="TRASLADADO">Trasladado (Baja a otra I.E.)</option>
                <option value="RETIRADO">Retirado</option>
                <option value="CANCELADA">Cancelada</option>
              </select>
            </label>

            <label class="grid gap-1 text-xs font-semibold text-ui-muted">
              Buscar matrícula o alumno
              <input
                type="search"
                [(ngModel)]="busqueda"
                (ngModelChange)="paginaMatriculas = 0"
                aria-label="Buscar por nombre, documento o código de matrícula"
                placeholder="Nombre, DNI o código…"
                class="w-full min-h-10 px-3 py-1.5 rounded-lg bg-ui-surface border border-ui-control-border text-ui-text text-sm font-medium focus:outline-none focus:border-ui-focus transition"
              />
            </label>

            <div>
              <button
                (click)="cargarMatriculas()"
                class="btn-action-matricula w-full min-h-10 py-2 px-4 rounded-lg bg-ui-action hover:opacity-95 text-ui-action-text text-sm font-semibold transition cursor-pointer inline-flex items-center justify-center gap-2 shadow-xs"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Consultar BD</span>
              </button>
            </div>
          </div>

          <!-- Matriculas Table -->
          <div class="rounded-xl bg-ui-surface border border-ui-divider overflow-hidden shadow-[var(--ui-card-shadow)]">
            <div class="overflow-x-auto" data-enrollments-table-scroll="">
              <table class="w-full min-w-[920px] border-collapse text-left text-sm text-ui-text" data-mobile-table-cards="">
                <thead class="bg-ui-surface-soft border-b border-ui-divider text-ui-action uppercase tracking-wider font-bold text-xs">
                  <tr>
                    <th class="px-4 py-3.5 text-left">Código de Matrícula</th>
                    <th class="px-4 py-3.5 text-left">Grado y Sección</th>
                    <th class="px-4 py-3.5 text-left">Estudiante</th>
                    <th class="px-4 py-3.5 text-center">Pago de matrícula</th>
                    <th class="px-4 py-3.5 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-ui-divider bg-ui-surface">
                  @if (cargando()) {
                    <tr>
                      <td colspan="5" class="text-center py-10 text-ui-muted">
                        <span class="inline-block w-5 h-5 border-2 border-ui-divider border-t-ui-action rounded-full animate-spin mb-2"></span>
                        <p>Consultando matrículas en la base de datos...</p>
                      </td>
                    </tr>
                  } @else {
                    @for (est of estudiantesPaginadosMatriculas(); track est.id) {
                      <tr class="bg-ui-surface hover:bg-ui-surface-soft/75 transition-colors">
                        <td class="px-4 py-3.5 font-mono font-bold text-base text-ui-action whitespace-nowrap" data-label="Código de Matrícula">
                          {{ est.codigoMatricula }}
                        </td>
                        <td class="px-4 py-3.5 text-left whitespace-nowrap" data-label="Grado y Sección">
                          <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-ui-surface-soft text-ui-action border border-ui-divider">
                            {{ est.seccionNombre || 'Sin asignar' }}
                          </span>
                        </td>
                        <td class="px-4 py-3.5 text-left" data-label="Estudiante">
                          <div class="flex items-center justify-start gap-3">
                            <img [src]="obtenerFotoEstudiantePorId(est.estudianteId)" alt="Foto del estudiante" class="w-10 h-10 rounded-full object-cover border border-ui-divider shadow-2xs shrink-0" />
                            <div class="min-w-0">
                              <div class="font-bold text-base text-ui-text truncate">{{ nombreEstudiante(est.estudianteId) }}</div>
                              <div class="mt-0.5 font-mono text-xs font-semibold text-ui-muted">DNI {{ documentoEstudiante(est.estudianteId) || '—' }}</div>
                              @if (est.modalidadIngreso === 'TRASLADO') {
                                <span class="inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                                  Ingreso por traslado{{ est.colegioProcedencia ? ' · ' + est.colegioProcedencia : '' }}
                                </span>
                              }
                            </div>
                          </div>
                        </td>
                        <td class="px-4 py-3.5 text-center whitespace-nowrap" data-label="Pago de matrícula">
                          <span class="px-3 py-1 rounded-full text-xs font-bold border inline-flex items-center justify-center gap-1.5"
                            [class.bg-ui-success-bg]="est.estadoPagoMatricula === 'PAGADO'"
                            [class.text-ui-success-text]="est.estadoPagoMatricula === 'PAGADO'"
                            [class.border-ui-success-border]="est.estadoPagoMatricula === 'PAGADO'"
                            [class.bg-ui-warning-bg]="est.estadoPagoMatricula !== 'PAGADO'"
                            [class.text-ui-warning-text]="est.estadoPagoMatricula !== 'PAGADO'"
                            [class.border-ui-warning-border]="est.estadoPagoMatricula !== 'PAGADO'">
                            <span class="w-2 h-2 rounded-full" [class.bg-emerald-600]="est.estadoPagoMatricula === 'PAGADO'" [class.bg-amber-600]="est.estadoPagoMatricula !== 'PAGADO'"></span>
                            {{ etiquetaEstadoPago(est.estadoPagoMatricula) }}
                          </span>
                        </td>
                        <td class="px-4 py-3.5 text-right whitespace-nowrap" data-label="Acción">
                          <div class="inline-flex items-center justify-end gap-2">
                            @if ((est.estado === 'SOLICITADA' || est.estado === 'RESERVADA_TEMPORAL') && est.estadoPagoMatricula === 'PAGADO') {
                              <button
                                type="button"
                                (click)="confirmarMatricula(est.id)"
                                [disabled]="confirmandoMatricula() === est.id"
                                class="rounded-lg bg-ui-success-bg border border-ui-success-border hover:opacity-85 text-ui-success-text px-3 py-1.5 min-h-9 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                                title="Confirmar matrícula con pago acreditado"
                              >
                                {{ confirmandoMatricula() === est.id ? 'Confirmando…' : 'Confirmar' }}
                              </button>
                            }

                            <!-- Botón Ver Ficha (Detalles) -->
                            <button
                              type="button"
                              (click)="verFicha(est.id)"
                              class="px-3.5 py-1.5 min-h-9 rounded-lg border border-ui-divider bg-ui-surface hover:bg-ui-surface-soft text-ui-action text-sm font-semibold inline-flex items-center gap-1.5 transition cursor-pointer"
                              title="Ver ficha y detalles completos de la matrícula"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <span>Ver Ficha</span>
                            </button>

                            <!-- Botón Icono Cancelar Matrícula -->
                            @if ((auth.hasRole('SECRETARIA') || auth.hasRole('ADMINISTRADOR')) && esEstadoGestionable(est.estado)) {
                              <button
                                type="button"
                                (click)="abrirDialogCambioEstado(est)"
                                class="h-9 w-9 rounded-lg border border-ui-error-border bg-ui-error-bg hover:opacity-85 text-ui-error-text flex items-center justify-center transition cursor-pointer"
                                [title]="textoAccionEstado(est.estado)"
                                aria-label="Cancelar o cambiar estado de solicitud"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                  <path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                </svg>
                              </button>
                            }
                          </div>
                        </td>
                      </tr>
                    } @empty {
                      <tr [hidden]="!!error()">
                        <td colspan="5" class="text-center pt-4 pb-12 text-ui-muted space-y-2">
                          <svg aria-hidden="true" focusable="false" viewBox="0 0 48 48" fill="none" stroke="var(--ui-action)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="block h-[42px] w-[42px] mx-auto"><path d="M6 11.5c6-2 12-1 18 2.5v25c-6-3.5-12-4.5-18-2.5z"/><path d="M42 11.5c-6-2-12-1-18 2.5v25c6-3.5 12-4.5 18-2.5z"/><path d="M24 14v25" stroke="var(--ui-gold)"/><path d="M11 17c3-.5 6 .1 9 1.5M11 23c3-.5 6 .1 9 1.5M28 18.5c3-1.4 6-2 9-1.5M28 24.5c3-1.4 6-2 9-1.5" stroke="var(--ui-gold)"/></svg>
                          <p class="font-medium text-ui-muted">No se encontraron matrículas para el filtro seleccionado.</p>
                          <p class="text-sm text-ui-muted">Los registros generados se sincronizan directamente con PostgreSQL.</p>
                        </td>
                      </tr>
                    }
                  }
                </tbody>
              </table>
            </div>
            <ui-paginacion
              [totalRegistros]="estudiantesFiltrados().length"
              [paginaActual]="paginaMatriculas + 1"
              [tamanoPagina]="tamanoPaginaMatriculas"
              etiqueta="matrículas"
              ariaLabel="Paginación de matrículas por sección"
              (cambioPagina)="cambiarPaginaMatriculas($event)"
            />
          </div>
        </div>
      }

      <!-- ============================================================== -->
      <!-- MODAL: REGISTRAR NUEVO ALUMNO EN BD (WEB FORM)                 -->
      <!-- ============================================================== -->
      <ng-template #nuevoAlumnoDialog>
          <div class="flex max-h-[calc(100dvh-24px)] min-h-0 flex-col font-sans w-full max-w-2xl p-1">
            <!-- Modal Header -->
            <div class="flex flex-[0_0_auto] items-center justify-between gap-4 border-b border-ui-border px-6 py-5 [&_h3]:m-0 [&_h3]:text-ui-text [&_h3]:text-lg [&_h3]:leading-[27px] [&_h3]:font-[750] [&_p]:mb-0 [&_p]:mt-1 [&_p]:text-ui-muted [&_p]:text-xs [&_p]:leading-[1.5] max-[639px]:p-4 flex items-center justify-between border-b !border-ui-border pb-4">
              <div class="flex items-center gap-3">
                <div class="p-2.5 rounded-xl bg-ui-action/10 text-ui-action border border-ui-action/30">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
                <div>
                  <h3 class="text-lg leading-tight !leading-[1.25] font-bold !text-ui-text tracking-[-.025em]">Registrar Nuevo Alumno</h3>
                  <p class="text-xs text-ui-muted">El alumno será dado de alta directamente en la base de datos PostgreSQL.</p>
                </div>
              </div>
              <button
                id="btn-cerrar-modal-alumno"
                (click)="cerrarModalNuevoAlumno()"
                class="grid !h-11 !w-11 !min-h-11 !min-w-11 !shrink-0 place-items-center !p-0 !text-ui-muted bg-ui-surface-soft hover:text-ui-action-text rounded-lg hover:bg-ui-surface-soft transition cursor-pointer box-border inline-flex min-w-0 min-h-10 items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:min-h-11"
              >
                ✕
              </button>
            </div>

            <!-- Modal Form -->
            <form id="form-registro-alumno" (ngSubmit)="guardarEstudiante()" class="flex min-h-0 flex-[1_1_auto] flex-col space-y-4">
              <div class="min-h-0 flex-[1_1_auto] overflow-auto overscroll-contain px-6 py-5 max-[639px]:p-4 space-y-4">
              <!-- Grid Row 1: Documento -->
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label class="block text-sm font-semibold text-ui-muted mb-1">Tipo de Documento *</label>
                  <select
                    id="nuevo-alumno-tipo-doc" aria-label="Tipo de Documento *"
                    [(ngModel)]="nuevoAlumno.tipoDocumento"
                    name="tipoDoc"
                    required
                    class="w-full px-3 py-2.5 rounded-xl bg-ui-surface-soft border border-ui-border !text-ui-text !text-base focus:outline-none focus:border-ui-action min-w-0 !min-h-[44px] max-w-full border px-3 py-[10px] !border-ui-control-border rounded-xl !bg-ui-surface !text-ui-text transition-colors focus:border-ui-action focus:outline-none focus:shadow-[0_0_0_3px_var(--ui-focus-shadow)] max-[639px]:text-base"
                  >
                    <option value="DNI">DNI (Perú)</option>
                  </select>
                </div>

                <div class="sm:col-span-2">
                  <label class="block text-sm font-semibold text-ui-muted mb-1">Número de Documento *</label>
                  <div class="flex items-center gap-2">
                    <input appFormatoEntrada="dni"
                      id="nuevo-alumno-numero-doc" aria-label="Número de Documento *"
                      type="text"
                      [(ngModel)]="nuevoAlumno.numeroDocumento"
                      name="numeroDoc"
                      required
                      maxlength="8"
                      inputmode="numeric"
                      pattern="[0-9]{8}"
                      placeholder="Ej. 74839201"
                      class="flex-1 min-w-0 px-3 py-2.5 rounded-xl bg-ui-surface-soft border border-ui-border !text-ui-text !text-base placeholder:text-ui-muted focus:outline-none focus:border-ui-action !min-h-[44px] max-w-full !border-ui-control-border !bg-ui-surface transition-colors focus:shadow-[0_0_0_3px_var(--ui-focus-shadow)] max-[639px]:text-base"
                    />
                    <button
                      type="button"
                      (click)="consultarDni()"
                      [disabled]="consultandoDni() || nuevoAlumno.tipoDocumento !== 'DNI'"
                      title="Consultar datos en RENIEC"
                      aria-label="Consultar DNI en RENIEC"
                      class="h-[44px] w-[44px] shrink-0 rounded-xl bg-gradient-to-b from-[#1c477d] to-[#173B67] hover:from-[#173B67] hover:to-[#112d50] text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer group active:scale-95"
                    >
                      @if (consultandoDni()) {
                        <svg class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                        </svg>
                      } @else {
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-white group-hover:scale-110 transition-transform duration-150" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                        </svg>
                      }
                    </button>
                  </div>
                </div>
              </div>

              <p class="text-xs text-ui-muted">Los datos del proveedor externo son referenciales. Revisa nombres y apellidos antes de guardar.</p>
              @if (error()) {
                <p class="!text-sm text-ui-error-text" role="alert">{{ error() }}</p>
              }

              <!-- Grid Row 2: Nombres y Apellidos -->
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label class="block text-sm font-semibold text-ui-muted mb-1">Nombres *</label>
                  <input appFormatoEntrada="nombre"
                    id="nuevo-alumno-nombres" aria-label="Nombres *"
                    type="text"
                    [(ngModel)]="nuevoAlumno.nombres"
                    name="nombres"
                    required
                    maxlength="100"
                    placeholder="Ej. Mateo Alejandro"
                    class="w-full px-3 py-2.5 rounded-xl bg-ui-surface-soft border border-ui-border !text-ui-text !text-base placeholder:text-ui-muted focus:outline-none focus:border-ui-action min-w-0 !min-h-[44px] max-w-full border px-3 py-[10px] !border-ui-control-border rounded-xl !bg-ui-surface !text-ui-text transition-colors focus:border-ui-action focus:outline-none focus:shadow-[0_0_0_3px_var(--ui-focus-shadow)] max-[639px]:text-base"
                  />
                </div>

                <div>
                  <label class="block text-sm font-semibold text-ui-muted mb-1">Apellido Paterno *</label>
                  <input appFormatoEntrada="nombre"
                    id="nuevo-alumno-ape-paterno" aria-label="Apellido Paterno *"
                    type="text"
                    [(ngModel)]="nuevoAlumno.apellidoPaterno"
                    name="apellidoPaterno"
                    required
                    maxlength="80"
                    placeholder="Ej. Quispe"
                    class="w-full px-3 py-2.5 rounded-xl bg-ui-surface-soft border border-ui-border !text-ui-text !text-base placeholder:text-ui-muted focus:outline-none focus:border-ui-action min-w-0 !min-h-[44px] max-w-full border px-3 py-[10px] !border-ui-control-border rounded-xl !bg-ui-surface !text-ui-text transition-colors focus:border-ui-action focus:outline-none focus:shadow-[0_0_0_3px_var(--ui-focus-shadow)] max-[639px]:text-base"
                  />
                </div>

                <div>
                  <label class="block text-sm font-semibold text-ui-muted mb-1">Apellido Materno *</label>
                  <input appFormatoEntrada="nombre"
                    id="nuevo-alumno-ape-materno" aria-label="Apellido Materno *"
                    type="text"
                    [(ngModel)]="nuevoAlumno.apellidoMaterno"
                    name="apellidoMaterno"
                    required
                    maxlength="80"
                    placeholder="Ej. Mendoza"
                    class="w-full px-3 py-2.5 rounded-xl bg-ui-surface-soft border border-ui-border !text-ui-text !text-base placeholder:text-ui-muted focus:outline-none focus:border-ui-action min-w-0 !min-h-[44px] max-w-full border px-3 py-[10px] !border-ui-control-border rounded-xl !bg-ui-surface !text-ui-text transition-colors focus:border-ui-action focus:outline-none focus:shadow-[0_0_0_3px_var(--ui-focus-shadow)] max-[639px]:text-base"
                  />
                </div>
              </div>

              <!-- Grid Row 3: Nacimiento, Genero, Grupo Sanguineo -->
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label class="block text-sm font-semibold text-ui-muted mb-1">Fecha de Nacimiento *</label>
                  <app-ui-calendar id="nuevo-alumno-fecha-nac" aria-label="Fecha de Nacimiento *" [(ngModel)]="nuevoAlumno.fechaNacimiento" name="fechaNacimiento" [required]="true"></app-ui-calendar>
                </div>

                <div>
                  <label class="block text-sm font-semibold text-ui-muted mb-1">Género *</label>
                  <select
                    id="nuevo-alumno-genero" aria-label="Género *"
                    [(ngModel)]="nuevoAlumno.genero"
                    name="genero"
                    required
                    class="w-full px-3 py-2.5 rounded-xl bg-ui-surface-soft border border-ui-border !text-ui-text !text-base focus:outline-none focus:border-ui-action min-w-0 !min-h-[44px] max-w-full border px-3 py-[10px] !border-ui-control-border rounded-xl !bg-ui-surface !text-ui-text transition-colors focus:border-ui-action focus:outline-none focus:shadow-[0_0_0_3px_var(--ui-focus-shadow)] max-[639px]:text-base"
                  >
                    <option value="M">Masculino</option>
                    <option value="F">Femenino</option>
                  </select>
                </div>

                <div>
                  <label class="block text-sm font-semibold text-ui-muted mb-1">Grupo Sanguíneo</label>
                  <select
                    id="nuevo-alumno-grupo-sang" aria-label="Grupo Sanguíneo"
                    [(ngModel)]="nuevoAlumno.grupoSanguineo"
                    name="grupoSanguineo"
                    class="w-full px-3 py-2.5 rounded-xl bg-ui-surface-soft border border-ui-border !text-ui-text !text-base focus:outline-none focus:border-ui-action min-w-0 !min-h-[44px] max-w-full border px-3 py-[10px] !border-ui-control-border rounded-xl !bg-ui-surface !text-ui-text transition-colors focus:border-ui-action focus:outline-none focus:shadow-[0_0_0_3px_var(--ui-focus-shadow)] max-[639px]:text-base"
                  >
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
              </div>

              <!-- Grid Row 4: Alergias -->
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div class="sm:col-span-3">
                  <label class="block text-sm font-semibold text-[#475569] mb-1">Alergias o Condiciones Médicas</label>
                  <input
                    id="nuevo-alumno-alergias" aria-label="Alergias o Condiciones Médicas"
                    type="text"
                    [(ngModel)]="nuevoAlumno.alergiasCondiciones"
                    name="alergias"
                    maxlength="4000"
                    placeholder="Ej. Ninguna alergia conocida / Alérgico a penicilina"
                    class="w-full px-3 py-2.5 rounded-xl bg-ui-surface-soft border border-ui-border !text-ui-text !text-base placeholder:text-ui-muted focus:outline-none focus:border-ui-action min-w-0 !min-h-[44px] max-w-full border px-3 py-[10px] !border-ui-control-border rounded-xl !bg-ui-surface !text-ui-text transition-colors focus:border-ui-action focus:outline-none focus:shadow-[0_0_0_3px_var(--ui-focus-shadow)] max-[639px]:text-base"
                  />
                </div>
              </div>

              </div>
              <!-- Modal Footer -->
              <div class="sticky bottom-0 z-[1] flex flex-[0_0_auto] flex-wrap justify-end gap-[10px] border-t border-ui-border bg-ui-surface px-6 py-[14px] max-[639px]:px-4 max-[639px]:py-3 max-[639px]:[&>button]:flex-[1_1_auto] flex items-center justify-end gap-3 pt-4 border-t !border-ui-border">
                <button
                  type="button"
                  (click)="cerrarModalNuevoAlumno()"
                  class="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 !text-slate-700 text-base font-semibold transition cursor-pointer max-[640px]:w-full box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans leading-[1.25] text-center align-middle border border-slate-300"
                >
                  Cancelar
                </button>
                <button
                  id="btn-guardar-alumno"
                  type="submit"
                  [disabled]="guardandoAlumno() || consultandoDni()"
                  class="px-5 py-2.5 rounded-xl bg-ui-action hover:bg-ui-action/90 text-ui-action-text text-xs !text-[14px] font-semibold shadow-lg shadow-none transition flex items-center gap-2 cursor-pointer disabled:opacity-50 max-[640px]:w-full box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]"
                >
                  @if (guardandoAlumno()) {
                    <span class="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    <span>Guardando en BD...</span>
                  } @else {
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Guardar y Registrar Alumno</span>
                  }
                </button>
              </div>
            </form>
          </div>
      </ng-template>

      <ng-template #vinculoApoderadoDialog>
        <div class="flex max-h-[calc(100dvh-24px)] min-h-0 flex-col font-sans w-full max-w-lg p-1">
          <div class="flex items-center justify-between gap-4 border-b border-[#e1e8f1] px-6 py-5">
            <div>
              <h3 class="m-0 text-lg font-bold text-[#14213d]">Vincular apoderado</h3>
              <p class="m-0 mt-1 text-xs text-[#64748b]">{{ estudianteParaVinculo()?.apellidoPaterno }} {{ estudianteParaVinculo()?.apellidoMaterno }}, {{ estudianteParaVinculo()?.nombres }}</p>
            </div>
            <button type="button" (click)="cerrarDialogoVinculoApoderado()" aria-label="Cerrar diálogo" class="grid h-11 w-11 min-h-11 min-w-11 place-items-center rounded-xl border border-[#e1e8f1] bg-[#f7f9fc] text-[#64748b]">✕</button>
          </div>
          <form (ngSubmit)="guardarVinculoApoderado()" class="space-y-4 px-6 py-5">
            @if (errorVinculoApoderado()) { <p class="m-0 rounded-xl border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-sm text-[#b91c1c]" role="alert">{{ errorVinculoApoderado() }}</p> }
            @if (cargandoApoderados()) { <p class="m-0 text-sm text-[#64748b]" role="status">Cargando apoderados...</p> }
            <label class="grid gap-2 text-xs font-semibold text-[#475569]">Apoderado
              <select [(ngModel)]="apoderadoIdSeleccionado" name="apoderadoId" required [disabled]="cargandoApoderados() || !apoderadosDisponibles().length" class="min-h-11 rounded-xl border border-[#d9e1ec] bg-white px-3 text-sm font-normal text-[#172b4d]">
                <option [ngValue]="0" disabled>Seleccione un apoderado</option>
                @for (apoderado of apoderadosDisponibles(); track apoderado.id) {
                  <option [ngValue]="apoderado.id">{{ apoderado.apellidoPaterno }} {{ apoderado.apellidoMaterno }}, {{ apoderado.nombres }} · DNI {{ apoderado.numeroDocumento }}</option>
                }
              </select>
            </label>
            <label class="grid gap-2 text-xs font-semibold text-[#475569]">Parentesco
              <select [(ngModel)]="parentescoApoderado" name="parentesco" required class="min-h-11 rounded-xl border border-[#d9e1ec] bg-white px-3 text-sm font-normal text-[#172b4d]">
                <option value="PADRE">Padre</option><option value="MADRE">Madre</option><option value="TUTOR_LEGAL">Tutor legal</option><option value="ABUELO_A">Abuelo/a</option><option value="OTRO">Otro</option>
              </select>
            </label>
            <div class="space-y-3 text-sm text-[#34445d]">
              <label class="flex items-center gap-2"><input [(ngModel)]="esResponsableEconomico" name="responsableEconomico" type="checkbox" /> Responsable económico</label>
              <label class="flex items-center gap-2"><input [(ngModel)]="tieneCustodia" name="custodia" type="checkbox" /> Tiene custodia</label>
              <label class="flex items-center gap-2"><input [(ngModel)]="permiteRecojo" name="permiteRecojo" type="checkbox" /> Autorizado para recoger</label>
            </div>
            <div class="flex flex-wrap justify-end gap-2 border-t border-[#e5eaf2] pt-4">
              <button type="button" (click)="cerrarDialogoVinculoApoderado()" class="min-h-11 rounded-xl border border-[#e5eaf2] bg-[#f5f7fb] px-4 text-sm font-semibold text-[#334155]">Cancelar</button>
              <button type="submit" [disabled]="guardandoVinculoApoderado() || cargandoApoderados() || !apoderadosDisponibles().length" class="min-h-11 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white disabled:opacity-50">{{ guardandoVinculoApoderado() ? 'Guardando...' : 'Guardar vínculo' }}</button>
            </div>
          </form>
        </div>
      </ng-template>

      <!-- ============================================================== -->
      <!-- MODAL: ASIGNAR MATRICULA A SECCION                             -->
      <!-- ============================================================== -->
      <ng-template #solicitudDialog>
          <div class="flex max-h-[calc(100dvh-24px)] min-h-0 flex-col font-sans w-full max-w-lg p-1">
            <div class="flex flex-[0_0_auto] items-center justify-between gap-4 border-b border-ui-border px-6 py-5 [&_h3]:m-0 [&_h3]:text-ui-text [&_h3]:text-lg [&_h3]:leading-[27px] [&_h3]:font-[750] [&_p]:mb-0 [&_p]:mt-1 [&_p]:text-ui-muted [&_p]:text-xs [&_p]:leading-[1.5] max-[639px]:p-4 flex items-center justify-between border-b border-ui-border pb-4">
              <div>
                <h3 class="text-lg !leading-7 font-bold text-[#173B67] tracking-[-.025em]">Ratificar matrícula / Asignar sección</h3>
                <p class="m-0 mt-0.5 text-xs text-slate-600">Para alumnos ya registrados en el padrón histórico o admisiones online pagadas con sección pendiente.</p>
              </div>
              <button (click)="cerrarSolicitudDialog()" class="inline-flex h-11 min-h-11 w-11 min-w-11 shrink-0 items-center justify-center rounded p-2 text-base font-normal text-ui-muted hover:text-ui-muted" aria-label="Cerrar diálogo">✕</button>
            </div>

            <form (ngSubmit)="solicitar()" class="flex min-h-0 flex-[1_1_auto] flex-col space-y-4">
              <div class="min-h-0 flex-[1_1_auto] overflow-auto overscroll-contain px-6 py-5 max-[639px]:p-4 space-y-4">
              <div>
                <label class="block text-sm font-semibold text-ui-muted mb-1">Año Lectivo</label>
                <select [(ngModel)]="anioLectivoId" aria-label="Año Lectivo" name="anio" (change)="cargarSecciones()" [disabled]="!!solicitudPendienteSeleccionada()" required class="w-full px-3 py-2.5 rounded-xl bg-ui-surface-soft border border-ui-border text-ui-text !text-base focus:outline-none focus:border-ui-action min-w-0 !min-h-11 max-w-full border px-3 py-[10px] !border-ui-control-border rounded-xl !bg-ui-surface-soft !text-ui-text transition-colors focus:border-ui-action focus:outline-none focus:shadow-[0_0_0_3px_var(--ui-focus-shadow)] max-[639px]:text-base disabled:opacity-75 disabled:cursor-not-allowed">
                  @for (anio of aniosAdmision(); track anio.id) {
                    <option [ngValue]="anio.id">{{ anio.anio }}{{ anio.anio > anioActualCalendario ? ' · Admisión ' + anio.anio : '' }}</option>
                  }
                </select>
              </div>

              <div>
                <label class="block text-sm font-semibold text-ui-muted mb-1">Estudiante Registrado *</label>
                <select [(ngModel)]="nuevoEstudianteId" (ngModelChange)="onEstudianteSeleccionadoAsignar($event)" aria-label="Estudiante Registrado *" name="estudiante" required class="w-full px-3 py-2.5 rounded-xl bg-ui-surface-soft border border-ui-border text-ui-text !text-base focus:outline-none focus:border-ui-action min-w-0 !min-h-11 max-w-full border px-3 py-[10px] !border-ui-control-border rounded-xl !bg-ui-surface-soft !text-ui-text transition-colors focus:border-ui-action focus:outline-none focus:shadow-[0_0_0_3px_var(--ui-focus-shadow)] max-[639px]:text-base">
                  <option [ngValue]="0" disabled>Seleccionar estudiante...</option>
                  @if (cargandoMatriculasAnio()) {
                    <option [ngValue]="0" disabled>Verificando matrículas del año...</option>
                  } @else if (!matriculasAnioVerificadas()) {
                    <option [ngValue]="0" disabled>
                      {{ errorCargaMatriculasAnio() ? 'No se pudieron verificar las matrículas' : 'Matrículas aún no disponibles' }}
                    </option>
                  } @else if (!listaEstudiantesDisponibles().length) {
                    <option [ngValue]="0" disabled>No hay estudiantes disponibles para este año</option>
                  }
                  @for (est of listaEstudiantesDisponibles(); track est.id) {
                    <option [ngValue]="est.id">
                      #{{ est.id }} - {{ est.numeroDocumento }} · {{ est.apellidoPaterno }} {{ est.apellidoMaterno }}, {{ est.nombres }}{{ solicitudPendienteDeEstudiante(est.id) ? ' (Público · sección pendiente)' : '' }}
                    </option>
                  }
                </select>
              </div>

              @if (solicitudPendienteSeleccionada()) {
                <div class="rounded-xl border border-ui-info-border bg-ui-info-bg px-3.5 py-2.5 text-xs text-ui-info-text">
                  <strong>Solicitud pública pagada:</strong> El <strong>Nivel</strong> y el <strong>Grado</strong> vienen asignados por defecto. Selecciona únicamente la <strong>Sección</strong> para confirmar la matrícula.
                </div>
              }

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label for="asignar-nivel" class="block text-sm font-semibold text-ui-muted mb-1">
                    Nivel * @if (solicitudPendienteSeleccionada()) { <span class="text-xs font-normal">(asignado)</span> }
                  </label>
                  <select id="asignar-nivel" [(ngModel)]="asignarNivelId" (ngModelChange)="alCambiarNivelAsignar()" name="asignarNivel" [disabled]="!!solicitudPendienteSeleccionada()" required class="w-full px-3 py-2.5 rounded-xl bg-ui-surface-soft border border-ui-border text-ui-text !text-sm focus:outline-none focus:border-ui-action min-w-0 !min-h-11 max-w-full border !border-ui-control-border disabled:opacity-75 disabled:cursor-not-allowed">
                    <option [ngValue]="null">Selecciona nivel...</option>
                    @for (n of listaNivelesParaAsignar(); track n.id) {
                      <option [ngValue]="n.id">{{ n.nombre }}</option>
                    }
                  </select>
                </div>

                <div>
                  <label for="asignar-grado" class="block text-sm font-semibold text-ui-muted mb-1">
                    Grado * @if (solicitudPendienteSeleccionada()) { <span class="text-xs font-normal">(asignado)</span> }
                  </label>
                  <select id="asignar-grado" [(ngModel)]="asignarGradoId" (ngModelChange)="alCambiarGradoAsignar()" name="asignarGrado" [disabled]="!!solicitudPendienteSeleccionada() || !asignarNivelId" required class="w-full px-3 py-2.5 rounded-xl bg-ui-surface-soft border border-ui-border text-ui-text !text-sm focus:outline-none focus:border-ui-action min-w-0 !min-h-11 max-w-full border !border-ui-control-border disabled:opacity-75 disabled:cursor-not-allowed">
                    <option [ngValue]="null">Selecciona grado...</option>
                    @for (g of listaGradosParaAsignar(); track g.id) {
                      <option [ngValue]="g.id">{{ g.nombre }}</option>
                    }
                  </select>
                </div>

                <div>
                  <label for="asignar-seccion" class="block text-sm font-semibold text-ui-muted mb-1">Sección *</label>
                  <select id="asignar-seccion" [(ngModel)]="seccionIdSeleccionada" aria-label="Sección de Destino *" name="seccion" [disabled]="!asignarGradoId" required class="w-full px-3 py-2.5 rounded-xl bg-ui-surface-soft border border-ui-border text-ui-text !text-sm focus:outline-none focus:border-ui-action min-w-0 !min-h-11 max-w-full border !border-ui-control-border disabled:opacity-75">
                    <option [ngValue]="0" disabled>Selecciona sección...</option>
                    @for (s of seccionesFiltradasParaAsignar(); track s.id) {
                      <option [ngValue]="s.id">Sección {{ s.letra }} ({{ vacantesLibresSeccion(s) }} vacantes libres)</option>
                    } @empty {
                      @if (asignarGradoId) {
                        <option [ngValue]="0" disabled>No hay secciones con vacantes</option>
                      }
                    }
                  </select>
                </div>
              </div>

              <div>
                <label class="block text-sm font-semibold text-ui-muted mb-1">Observaciones</label>
                <textarea
                  [(ngModel)]="nuevasObservaciones" aria-label="Observaciones"
                  name="observaciones"
                  maxlength="4000"
                  rows="3"
                  placeholder="Observaciones de la matrícula..."
                  class="w-full px-3 py-2.5 rounded-xl bg-ui-surface-soft border border-ui-border text-ui-text text-xs placeholder:text-ui-muted focus:outline-none focus:border-ui-action min-w-0 max-w-full border px-3 py-[10px] !border-ui-control-border rounded-xl !bg-ui-surface-soft !text-ui-text transition-colors focus:border-ui-action focus:outline-none focus:shadow-[0_0_0_3px_var(--ui-focus-shadow)] max-[639px]:text-base py-[10px] resize-y !min-h-[100px]"
                ></textarea>
              </div>

              </div>
              <div class="sticky bottom-0 z-[1] flex flex-[0_0_auto] flex-wrap justify-end gap-[10px] border-t border-ui-border bg-ui-surface px-6 py-[14px] max-[639px]:px-4 max-[639px]:py-3 max-[639px]:[&>button]:flex-[1_1_auto] flex items-center justify-end gap-3 pt-4 border-t !border-ui-border">
                <button type="button" (click)="cerrarSolicitudDialog()" class="px-4 py-2 rounded-xl bg-ui-surface-soft text-ui-muted text-xs !text-sm font-semibold box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]">
                  Cancelar
                </button>
                <button type="submit" [disabled]="guardando()" class="px-5 py-2 rounded-xl bg-[#173B67] hover:bg-[#1e4b82] text-white text-xs !text-sm font-semibold disabled:opacity-50 box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]">
                  {{ guardando() ? 'Guardando...' : (solicitudPendienteSeleccionada() ? 'Confirmar sección' : 'Confirmar ratificación / sección') }}
                </button>
              </div>
            </form>
          </div>
      </ng-template>

      <!-- ============================================================== -->

      <!-- ============================================================== -->
      <!-- MODAL: DETALLES INTEGRALES DEL ESTUDIANTE                      -->
      <!-- ============================================================== -->
      <ng-template #detallesEstudianteDialog>
        @if (estudianteDetalle(); as est) {
          <div class="flex max-h-[calc(100dvh-24px)] min-h-0 w-full max-w-2xl flex-col bg-white font-sans text-[#172b4d] rounded-2xl overflow-hidden shadow-2xl">
            <!-- Header -->
            <div class="flex shrink-0 items-start justify-between gap-4 border-b border-[#e1e8f1] bg-[#f8fafd] px-6 py-4">
              <div class="flex items-center gap-3">
                <div class="relative group">
                  <img [src]="obtenerFotoEstudiante(est)" alt="Foto de {{ est.nombres }}" class="w-16 h-16 rounded-2xl object-cover border-2 border-[#184fae]/20 shadow-md" />
                  <label class="absolute -bottom-1 -right-1 p-1 bg-[#184fae] text-white rounded-lg shadow cursor-pointer hover:bg-[#14213d] transition-colors" title="Cargar foto del estudiante">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path stroke-linecap="round" stroke-linejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <input type="file" accept="image/*" (change)="onFotoEstudianteSeleccionada(est.id, $event)" class="hidden" />
                  </label>
                </div>
                <div>
                  <span class="text-xs font-bold tracking-wider text-[#a27a35] uppercase">Ficha Integral de Estudiante</span>
                  <h3 class="text-lg font-black text-[#14213d] m-0">{{ est.apellidoPaterno }} {{ est.apellidoMaterno }}, {{ est.nombres }}</h3>
                  <div class="flex items-center gap-2 mt-0.5">
                    <span class="font-mono text-xs text-[#184fae] font-bold">DNI {{ est.numeroDocumento }}</span>
                    <span class="text-xs text-slate-400">·</span>
                    <span class="font-mono text-xs text-slate-600">{{ codigoEstudianteVisible(est) }}</span>
                  </div>
                </div>
              </div>
              <button (click)="cerrarModalDetallesEstudiante()" class="h-9 w-9 rounded-xl border border-[#e1e8f1] bg-white hover:bg-slate-100 text-slate-500 flex items-center justify-center font-bold cursor-pointer" aria-label="Cerrar modal">✕</button>
            </div>

            <!-- Body scroll -->
            <div class="min-h-0 flex-1 overflow-y-auto px-6 py-5 space-y-5">
              <!-- Bloque 1: Datos Clínicos y Académicos -->
              <div>
                <h4 class="text-xs font-bold uppercase tracking-wider text-[#14213d] mb-3 border-l-2 border-[#184fae] pl-2">Datos Académicos y de Salud</h4>
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div class="p-3 rounded-xl border border-slate-200 bg-[#f8fafd]">
                    <span class="text-xs text-slate-500 font-bold block uppercase">Grupo Sanguíneo</span>
                    <span class="text-sm font-black text-[#14213d] font-mono">{{ est.grupoSanguineo || 'No registrado' }}</span>
                  </div>
                  <div class="p-3 rounded-xl border border-slate-200 bg-[#f8fafd]">
                    <span class="text-xs text-slate-500 font-bold block uppercase">Género</span>
                    <span class="text-sm font-semibold text-[#14213d]">{{ est.genero === 'F' ? 'Femenino' : est.genero === 'M' ? 'Masculino' : '-' }}</span>
                  </div>
                  <div class="p-3 rounded-xl border border-slate-200 bg-[#f8fafd]">
                    <span class="text-xs text-slate-500 font-bold block uppercase">Fecha Nacimiento</span>
                    <span class="text-sm font-semibold text-[#14213d] font-mono">{{ est.fechaNacimiento | uiDatePe }}</span>
                  </div>
                  <div class="p-3 rounded-xl border border-slate-200 bg-[#f8fafd]">
                    <span class="text-xs text-slate-500 font-bold block uppercase">Estado en BD</span>
                    <span class="inline-flex items-center gap-1 text-xs font-bold" [class.text-[#126943]]="est.estado === 'ACTIVO' || est.activo" [class.text-rose-700]="est.estado === 'INACTIVO' || est.activo === false">
                      <span class="size-2 rounded-full" [class.bg-[#126943]]="est.estado === 'ACTIVO' || est.activo" [class.bg-rose-600]="est.estado === 'INACTIVO' || est.activo === false"></span>
                      {{ est.estado || (est.activo ? 'ACTIVO' : 'INACTIVO') }}
                    </span>
                  </div>
                  <div class="col-span-2 p-3 rounded-xl border border-slate-200 bg-[#f8fafd]">
                    <span class="text-xs text-slate-500 font-bold block uppercase">Estado de Matrícula</span>
                    @if (estaMatriculadoConSeccion(est.id)) {
                      <span class="inline-flex items-center gap-1.5 text-xs font-bold text-[#126943]">
                        ✓ Matrícula Oficial Registrada con Sección Asignada
                      </span>
                    } @else {
                      <span class="text-xs text-amber-700 font-semibold">Pendiente de asignación de aula</span>
                    }
                  </div>
                </div>
                @if (est.alergiasCondiciones) {
                  <div class="mt-3 p-3 rounded-xl border border-amber-200 bg-amber-50/60 text-xs text-amber-900">
                    <strong class="font-bold">Alergias / Restricciones Médicas:</strong> {{ est.alergiasCondiciones }}
                  </div>
                }
              </div>

              <!-- Bloque 2: Apoderado Responsable Asociado -->
              <div>
                <div class="flex items-center justify-between mb-3 border-l-2 border-[#126943] pl-2">
                  <h4 class="text-xs font-bold uppercase tracking-wider text-[#14213d] m-0">Apoderado Responsable Asociado</h4>
                  @if (cargandoApoderadosEstudiante()) {
                    <span class="text-sm text-slate-500 flex items-center gap-1">
                      <span class="size-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></span> Consultando apoderado…
                    </span>
                  }
                </div>

                @if (apoderadosEstudiante().length > 0) {
                  <div class="space-y-3">
                    @for (vinculo of apoderadosEstudiante(); track vinculo.apoderado.id) {
                      <div class="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2">
                        <div class="flex items-center justify-between">
                          <div class="flex items-center gap-2">
                            <span class="px-2 py-0.5 rounded-full text-xs font-bold bg-[#edf9f3] text-[#126943] border border-[#b8dfcc]">
                              {{ vinculo.parentesco || 'APODERADO' }}
                            </span>
                            <strong class="text-sm font-bold text-[#14213d]">
                              {{ vinculo.apoderado.apellidoPaterno }} {{ vinculo.apoderado.apellidoMaterno }}, {{ vinculo.apoderado.nombres }}
                            </strong>
                          </div>
                          <span class="font-mono text-xs font-bold text-slate-600">DNI {{ vinculo.apoderado.numeroDocumento }}</span>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100">
                          <div>
                            <span class="text-slate-500 text-xs block">Celular:</span>
                            <a [href]="'tel:' + vinculo.apoderado.celular" class="font-semibold text-[#184fae] hover:underline">{{ vinculo.apoderado.celular || 'No registrado' }}</a>
                          </div>
                          <div>
                            <span class="text-slate-500 text-xs block">Correo Electrónico:</span>
                            <span class="font-semibold text-slate-700 truncate block">{{ vinculo.apoderado.email || 'No registrado' }}</span>
                          </div>
                          <div class="sm:col-span-2">
                            <span class="text-slate-500 text-xs block">Dirección Domiciliaria:</span>
                            <span class="text-slate-700">{{ vinculo.apoderado.direccion || 'No registrada' }}</span>
                          </div>
                        </div>
                      </div>
                    }
                  </div>
                } @else if (!cargandoApoderadosEstudiante()) {
                  <div class="p-4 rounded-xl border border-slate-200 bg-slate-50 text-center text-xs text-slate-500">
                    No se encontró apoderado registrado para este estudiante.
                  </div>
                }
              </div>
            </div>

            <!-- Footer -->
            <div class="flex items-center justify-end gap-2 border-t border-[#e1e8f1] bg-[#f8fafd] px-6 py-3">
              <button type="button" (click)="cerrarModalDetallesEstudiante()" class="px-4 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer">Cerrar</button>
              @if (!estaMatriculadoEnAnio(est.id)) {
                <button type="button" (click)="cerrarModalDetallesEstudiante(); prepararMatriculaParaEstudiante(est)" class="px-4 py-2 rounded-xl bg-[#184fae] hover:bg-[#14213d] text-white text-xs font-bold cursor-pointer transition">
                  Iniciar Matrícula
                </button>
              }
            </div>
          </div>
        }
      </ng-template>

      <!-- MODAL: FICHA DE MATRICULA DETALLADA                            -->
      <!-- ============================================================== -->
      <ng-template #fichaDialog>
        @if (ficha(); as actual) {
          <div class="flex max-h-[calc(100dvh-24px)] min-h-0 w-full max-w-4xl flex-col bg-white font-sans text-[#172b4d]">
            <div class="flex shrink-0 items-start justify-between gap-4 border-b border-[#e1e8f1] px-6 py-4 max-[639px]:px-4">
              <div>
                <p class="m-0 text-xs font-bold tracking-[.12em] text-[#a27a35]">I.E.P. SHUJI KITAMURA</p>
                <h3 class="mb-0 mt-1 text-xl font-extrabold tracking-[-.03em] text-[#14213d]">Ficha de matrícula</h3>
                <p class="mb-0 mt-1 text-xs text-[#64748b]">Registro académico del estudiante</p>
              </div>
              <button (click)="cerrarFichaDialog()" class="grid h-11 w-11 min-h-11 min-w-11 flex-none place-items-center rounded-xl border border-[#e1e8f1] bg-[#f7f9fc] p-0 text-[#64748b] hover:bg-[#eef3fa]" aria-label="Cerrar ficha">✕</button>
            </div>

            <div class="min-h-0 flex-1 overflow-y-auto px-6 py-5 max-[639px]:px-4">
              <div class="mb-5 flex flex-wrap items-center justify-between gap-3 border-b-2 border-[#c6a15b] pb-4">
                <div>
                  <p class="m-0 text-xs font-bold uppercase tracking-[.14em] text-[#718096]">Código de matrícula</p>
                  <p class="mb-0 mt-1 font-mono text-lg font-bold text-[#14213d]">{{ codigoFicha(actual) }}</p>
                </div>
                <span class="rounded-full border border-[#d7e1ef] bg-[#f4f7fb] px-3 py-1.5 text-xs font-bold text-[#34445d]">{{ estadoFicha(actual.matricula.estadoMatricula) }}</span>
              </div>

              <section class="mb-5">
                <div class="flex items-center gap-4 mb-3 border-l-[3px] border-[#c6a15b] pl-3">
                  <img [src]="obtenerFotoEstudiante(actual.estudiante)" [alt]="actual.estudiante.nombres" class="w-14 h-14 rounded-2xl object-cover border-2 border-[#c6a15b] shadow-xs shrink-0" />
                  <div>
                    <h4 class="m-0 text-sm font-extrabold text-[#14213d]">Identificación del estudiante</h4>
                    <p class="m-0 text-xs text-[#64748b]">{{ actual.estudiante.apellidoPaterno }} {{ actual.estudiante.apellidoMaterno }}, {{ actual.estudiante.nombres }}</p>
                  </div>
                </div>
                <div class="grid grid-cols-2 gap-x-6 gap-y-4 rounded-xl border border-[#e1e8f1] p-4 max-[639px]:grid-cols-1">
                  <div class="col-span-2 max-[639px]:col-span-1"><p class="mb-1 text-xs font-extrabold uppercase tracking-wider text-slate-600">Apellidos y nombres</p><p class="m-0 text-base font-bold leading-snug text-slate-900">{{ actual.estudiante.apellidoPaterno }} {{ actual.estudiante.apellidoMaterno }}, {{ actual.estudiante.nombres }}</p></div>
                  <div><p class="mb-1 text-xs font-extrabold uppercase tracking-wider text-slate-600">Documento de identidad</p><p class="m-0 text-base font-bold leading-snug text-slate-900">{{ actual.estudiante.tipoDocumento || 'DNI' }} {{ actual.estudiante.numeroDocumento }}</p></div>
                  <div><p class="mb-1 text-xs font-extrabold uppercase tracking-wider text-slate-600">Fecha de nacimiento</p><p class="m-0 text-base font-bold leading-snug text-slate-900">{{ actual.estudiante.fechaNacimiento | uiDatePe }}</p></div>
                  <div><p class="mb-1 text-xs font-extrabold uppercase tracking-wider text-slate-600">Género</p><p class="m-0 text-base font-bold leading-snug text-slate-900">{{ actual.estudiante.genero === 'F' ? 'Femenino' : actual.estudiante.genero === 'M' ? 'Masculino' : 'No registrado' }}</p></div>
                  <div><p class="mb-1 text-xs font-extrabold uppercase tracking-wider text-slate-600">Código de estudiante</p><p class="m-0 text-base font-bold leading-snug text-slate-900 font-mono">{{ codigoEstudianteVisible(actual.estudiante) }}</p></div>
                  <div><p class="mb-1 text-xs font-extrabold uppercase tracking-wider text-slate-600">Estado de identidad</p><p class="m-0 text-base font-bold leading-snug text-slate-900">{{ estadoIdentidad(actual.estudiante) }}</p></div>
                  <div><p class="mb-1 text-xs font-extrabold uppercase tracking-wider text-slate-600">Grupo sanguíneo</p><p class="m-0 text-base font-bold leading-snug text-slate-900">{{ actual.estudiante.grupoSanguineo || 'No registrado' }}</p></div>
                </div>
              </section>

              <section class="mb-5">
                <h4 class="mb-3 mt-0 border-l-[3px] border-[#c6a15b] pl-3 text-sm font-extrabold text-[#14213d]">Datos de matrícula</h4>
                <div class="grid grid-cols-2 gap-x-6 gap-y-4 rounded-xl border border-[#e1e8f1] p-4 max-[639px]:grid-cols-1">
                  <div><p class="mb-1 text-xs font-extrabold uppercase tracking-wider text-slate-600">Año lectivo</p><p class="m-0 text-base font-bold leading-snug text-slate-900">{{ anioDeFicha(actual) }}</p></div>
                  <div><p class="mb-1 text-xs font-extrabold uppercase tracking-wider text-slate-600">Grado y sección</p><p class="m-0 text-base font-bold leading-snug text-slate-900">{{ seccionDeFicha(actual) }}</p></div>
                  <div><p class="mb-1 text-xs font-extrabold uppercase tracking-wider text-slate-600">Aula</p><p class="m-0 text-base font-bold leading-snug text-slate-900">{{ aulaDeFicha(actual) }}</p></div>
                  <div><p class="mb-1 text-xs font-extrabold uppercase tracking-wider text-slate-600">Fecha de registro</p><p class="m-0 text-base font-bold leading-snug text-slate-900">{{ actual.matricula.fechaMatricula | uiDatePe }}</p></div>
                  <div><p class="mb-1 text-xs font-extrabold uppercase tracking-wider text-slate-600">Estado en BD</p><p class="m-0 text-base font-bold leading-snug text-slate-900"><span class="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">{{ actual.matricula.estadoMatricula }}</span></p></div>
                  <div><p class="mb-1 text-xs font-extrabold uppercase tracking-wider text-slate-600">Pago de matrícula</p><p class="m-0 text-base font-bold leading-snug text-slate-900">{{ estadoPagoFicha(actual) }}</p></div>
                  <div><p class="mb-1 text-xs font-extrabold uppercase tracking-wider text-slate-600">Modalidad de ingreso</p><p class="m-0 text-base font-bold leading-snug text-slate-900">{{ actual.matricula.modalidadIngreso === 'TRASLADO' ? 'Ingreso por Traslado' : 'Ingreso Regular' }}</p></div>
                  @if (actual.matricula.modalidadIngreso === 'TRASLADO') {
                    <div><p class="mb-1 text-xs font-extrabold uppercase tracking-wider text-slate-600">Colegio de procedencia</p><p class="m-0 text-base font-bold leading-snug text-slate-900">{{ actual.matricula.colegioProcedencia || 'No registrado' }}</p></div>
                  }
                  <div class="col-span-2 max-[639px]:col-span-1"><p class="mb-1 text-xs font-extrabold uppercase tracking-wider text-slate-600">Observaciones</p><p class="m-0 text-base font-bold leading-snug text-slate-900 whitespace-pre-wrap">{{ observacionesFicha(actual) }}</p></div>
                </div>
              </section>

              <section>
                <h4 class="mb-3 mt-0 border-l-[3px] border-[#c6a15b] pl-3 text-sm font-extrabold text-[#14213d]">Apoderado(s) registrado(s)</h4>
                @if (actual.apoderados.length) {
                  <div class="space-y-3">
                    @for (vinculo of actual.apoderados; track vinculo.apoderado.id) {
                      <div class="grid grid-cols-2 gap-x-6 gap-y-3 rounded-xl border border-[#e1e8f1] p-4 max-[639px]:grid-cols-1">
                        <div class="col-span-2 max-[639px]:col-span-1"><p class="mb-1 text-xs font-extrabold uppercase tracking-wider text-slate-600">Apellidos y nombres</p><p class="m-0 text-base font-bold leading-snug text-slate-900">{{ vinculo.apoderado.apellidoPaterno }} {{ vinculo.apoderado.apellidoMaterno }}, {{ vinculo.apoderado.nombres }}</p></div>
                        <div>
                          <p class="mb-1 text-xs font-extrabold uppercase tracking-wider text-slate-600">Documento</p>
                          <div class="flex items-center gap-2">
                            <p class="m-0 text-base font-bold leading-snug text-slate-900">{{ vinculo.apoderado.tipoDocumento || 'DNI' }} {{ vinculo.apoderado.numeroDocumento }}</p>
                            @if (auth.hasRole('SECRETARIA') || auth.hasRole('DIRECCION') || auth.hasRole('ADMINISTRADOR')) {
                              <button type="button" (click)="abrirModalCorregirDniApoderado(vinculo.apoderado)" class="text-sm font-bold text-[#184fae] hover:underline cursor-pointer">
                                Corregir DNI
                              </button>
                            }
                          </div>
                        </div>
                        <div><p class="mb-1 text-xs font-extrabold uppercase tracking-wider text-slate-600">Parentesco</p><p class="m-0 text-base font-bold leading-snug text-slate-900">{{ parentescoLabel(vinculo.parentesco) }}</p></div>
                        <div><p class="mb-1 text-xs font-extrabold uppercase tracking-wider text-slate-600">Celular</p><p class="m-0 text-base font-bold leading-snug text-slate-900">{{ vinculo.apoderado.celular || 'No registrado' }}</p></div>
                        <div><p class="mb-1 text-xs font-extrabold uppercase tracking-wider text-slate-600">Correo</p><p class="m-0 text-base font-bold leading-snug text-slate-900 break-all">{{ vinculo.apoderado.email || 'No registrado' }}</p></div>
                        <div class="col-span-2 max-[639px]:col-span-1"><p class="mb-1 text-xs font-extrabold uppercase tracking-wider text-slate-600">Dirección</p><p class="m-0 text-base font-bold leading-snug text-slate-900">{{ vinculo.apoderado.direccion || 'No registrada' }}</p></div>
                        @if (vinculo.esResponsableEconomico) {
                          <div class="col-span-2 max-[639px]:col-span-1"><p class="mb-1 text-xs font-extrabold uppercase tracking-wider text-slate-600">Responsabilidad económica</p><p class="m-0 text-base font-bold leading-snug text-slate-900">Responsable de pago</p></div>
                        }
                      </div>
                    }
                  </div>
                } @else {
                  <p class="m-0 rounded-xl border border-dashed border-[#cbd5e1] p-4 text-sm text-[#64748b]">No hay apoderados asociados en el registro.</p>
                }
              </section>

              <div class="mt-8 grid grid-cols-2 gap-10 px-4 pb-3 text-center text-xs text-[#475569] max-[639px]:grid-cols-1">
                <div class="border-t border-[#94a3b8] pt-2">Firma del apoderado</div>
                <div class="border-t border-[#94a3b8] pt-2">Secretaría académica</div>
              </div>
              <p class="m-0 text-center text-xs text-[#94a3b8]">Documento informativo generado desde el registro institucional. No reemplaza constancias oficiales.</p>
            </div>

            <div class="flex shrink-0 flex-wrap justify-end gap-2 border-t border-[#e1e8f1] bg-[#f8fafc] px-6 py-4 max-[639px]:px-4">
              <button type="button" (click)="cerrarFichaDialog()" class="min-h-11 rounded-xl border border-[#d8e1ed] bg-white px-4 text-sm font-semibold text-[#475569] hover:bg-[#f1f5f9]">Cerrar</button>
              <button type="button" (click)="exportarFichaPdf()" class="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#14213d] px-5 text-sm font-bold text-white shadow-sm hover:bg-[#20365f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2864c5]">
                <span aria-hidden="true">⇩</span> Exportar ficha a PDF
              </button>
            </div>
          </div>
        }
      </ng-template>

      <ng-template #estadoDialog>
        @if (matriculaSeleccionadaEstado(); as actual) {
          <div class="w-full max-w-xl bg-white font-sans text-[#172b4d]">
            <div class="border-b border-[#e1e8f1] px-6 py-4">
              <p class="m-0 text-xs font-bold uppercase tracking-[.12em] text-[#a27a35]">Gestión de matrícula</p>
              <h2 mat-dialog-title class="!mb-1 !px-0 !pt-1 !text-xl !font-extrabold !text-[#14213d]">Registrar salida o cancelación</h2>
              <p class="m-0 text-sm text-[#64748b]">{{ nombreEstudiante(actual.estudianteId) }} · Matrícula #{{ actual.id }}</p>
            </div>
            <mat-dialog-content class="!max-h-none !px-6 !py-5">
              <label for="estado-destino" class="mb-1 block text-xs font-semibold text-[#475569]">Estado final</label>
              <select id="estado-destino" name="estadoDestino" [(ngModel)]="estadoDestino" class="mb-4 w-full rounded-xl border border-[#d9e1ec] bg-[#f7f9fc] px-3 py-3 text-sm text-[#14213d] focus:border-[#5b83d6] focus:outline-none">
                @for (opcion of opcionesCambioEstado(); track opcion.estado) {
                  <option [ngValue]="opcion.estado">{{ opcion.etiqueta }}</option>
                }
              </select>
              <label for="motivo-estado" class="mb-1 block text-xs font-semibold text-[#475569]">Motivo y sustento <span class="text-rose-600">*</span></label>
              <textarea id="motivo-estado" name="motivoEstado" [(ngModel)]="motivoCambioEstado" maxlength="500" rows="4" placeholder="Registra el motivo comunicado por la familia y el documento o sustento recibido." class="w-full resize-y rounded-xl border border-[#d9e1ec] bg-[#f7f9fc] px-3 py-3 text-sm text-[#14213d] placeholder:text-[#8b98aa] focus:border-[#5b83d6] focus:outline-none"></textarea>
              <div class="mt-2 flex items-start gap-2 rounded-lg bg-[#f1f5f9] p-3 text-xs text-[#59677a]">
                <span aria-hidden="true">ⓘ</span>
                <p class="m-0">El estado, el motivo y el usuario que registra la acción quedarán en la auditoría. La vacante se actualizará automáticamente.</p>
              </div>
            </mat-dialog-content>
            <mat-dialog-actions align="end" class="!border-t !border-[#e1e8f1] !px-6 !py-4">
              <button mat-button type="button" (click)="cerrarDialogCambioEstado()" [disabled]="guardandoCambioEstado()">Cancelar</button>
              <button mat-flat-button color="primary" type="button" (click)="guardarCambioEstado()" [disabled]="guardandoCambioEstado() || !motivoCambioEstado.trim()">
                {{ guardandoCambioEstado() ? 'Guardando…' : 'Guardar cambio' }}
              </button>
            </mat-dialog-actions>
          </div>
        }
      </ng-template>

      <!-- MODAL: CORREGIR DNI ESTUDIANTE -->
      <ng-template #corregirDniEstudianteDialog>
        <div class="w-full max-w-lg bg-white rounded-2xl p-6 font-sans text-[#172b4d] scrollbar-hidden">
          <h2 mat-dialog-title class="!m-0 !p-0 !text-xl !font-bold !text-[#14213d]">Corregir DNI de Estudiante</h2>
          <mat-dialog-content class="!px-0 !py-4 scrollbar-hidden space-y-3">
            @if (estudianteSeleccionadoDni(); as est) {
              <p class="text-xs text-slate-500 m-0">Estudiante: <strong class="text-[#14213d]">{{ est.apellidoPaterno }} {{ est.apellidoMaterno }}, {{ est.nombres }}</strong> (DNI Actual: {{ est.numeroDocumento }})</p>
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1">Nuevo DNI (8 dígitos) *</label>
                <div class="flex gap-2">
                  <input appFormatoEntrada="dni"
                    type="text"
                    [(ngModel)]="nuevoDniEstudiante"
                    maxlength="8"
                    minlength="8"
                    inputmode="numeric"
                    placeholder="Ej. 71234567"
                    class="flex-1 rounded-xl border border-[#d9e1ec] px-3 py-2 text-sm text-[#14213d] focus:border-[#5b83d6] focus:outline-none"
                  />
                  <button
                    type="button"
                    (click)="consultarReniecEstudiante()"
                    [disabled]="consultandoReniecEstudiante() || nuevoDniEstudiante.length !== 8"
                    title="Consultar datos en RENIEC"
                    aria-label="Consultar datos en RENIEC"
                    class="h-[44px] w-[44px] shrink-0 rounded-xl bg-gradient-to-b from-[#1c477d] to-[#173B67] hover:from-[#173B67] hover:to-[#112d50] text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer group active:scale-95"
                  >
                    @if (consultandoReniecEstudiante()) {
                      <svg class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                      </svg>
                    } @else {
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-white group-hover:scale-110 transition-transform duration-150" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                      </svg>
                    }
                  </button>
                </div>
                @if (reniecEstudianteMensaje()) {
                  <p class="text-sm mt-1 text-emerald-800 bg-emerald-50 px-2 py-1 rounded font-medium">{{ reniecEstudianteMensaje() }}</p>
                }
              </div>
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1">Motivo / Sustento de corrección *</label>
                <textarea
                  [(ngModel)]="motivoDniEstudiante"
                  rows="3"
                  maxlength="500"
                  placeholder="Indica el motivo de corrección y el documento formal recibido."
                  class="w-full rounded-xl border border-[#d9e1ec] px-3 py-2 text-sm text-[#14213d] focus:border-[#5b83d6] focus:outline-none resize-none"
                ></textarea>
              </div>
            }
          </mat-dialog-content>
          <mat-dialog-actions align="end" class="!px-0 !pb-0 !pt-4 border-t border-[#edf0f5]">
            <button mat-button type="button" mat-dialog-close [disabled]="guardandoDniEstudiante()">Cancelar</button>
            <button mat-flat-button color="primary" type="button" (click)="confirmarCorregirDniEstudiante()" [disabled]="guardandoDniEstudiante() || nuevoDniEstudiante.length !== 8 || !motivoDniEstudiante.trim()">
              {{ guardandoDniEstudiante() ? 'Guardando…' : 'Guardar Corrección' }}
            </button>
          </mat-dialog-actions>
        </div>
      </ng-template>

      <!-- MODAL: ESTADO BORRADO LOGICO ESTUDIANTE -->
      <ng-template #estadoEstudianteDialog>
        <div class="w-full max-w-lg bg-white rounded-2xl p-6 font-sans text-[#172b4d] scrollbar-hidden">
          <h2 mat-dialog-title class="!m-0 !p-0 !text-xl !font-bold !text-[#14213d]">Cambiar Estado de Estudiante</h2>
          <mat-dialog-content class="!px-0 !py-4 scrollbar-hidden space-y-3">
            @if (estudianteSeleccionadoEstado(); as est) {
              <p class="text-xs text-slate-500 m-0">Estudiante: <strong class="text-[#14213d]">{{ est.apellidoPaterno }} {{ est.apellidoMaterno }}, {{ est.nombres }}</strong></p>
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1">Nuevo Estado *</label>
                <select [(ngModel)]="estadoEstudianteDestino" class="w-full rounded-xl border border-[#d9e1ec] bg-[#f8fafc] px-3 py-2.5 text-sm text-[#14213d] focus:border-[#5b83d6] focus:outline-none">
                  <option value="ACTIVO">ACTIVO · Estudiante regular matriculado</option>
                  <option value="SUSPENDIDO">SUSPENDIDO · Suspensión temporal</option>
                  <option value="RETIRADO">RETIRADO · Retiro voluntario o definitivo</option>
                  <option value="TRASLADADO">TRASLADADO · Traslado a otra institución</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1">Motivo / Sustento de cambio de estado *</label>
                <textarea
                  [(ngModel)]="motivoEstadoEstudiante"
                  rows="3"
                  maxlength="500"
                  placeholder="Describe la justificación, resolución o solicitud del apoderado."
                  class="w-full rounded-xl border border-[#d9e1ec] px-3 py-2 text-sm text-[#14213d] focus:border-[#5b83d6] focus:outline-none resize-none"
                ></textarea>
              </div>
              <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
                ⓘ Borrado lógico formal: el estudiante no se elimina físicamente de la base de datos para preservar el historial académico y la trazabilidad institucional.
              </div>
            }
          </mat-dialog-content>
          <mat-dialog-actions align="end" class="!px-0 !pb-0 !pt-4 border-t border-[#edf0f5]">
            <button mat-button type="button" mat-dialog-close [disabled]="guardandoEstadoEstudiante()">Cancelar</button>
            <button mat-flat-button color="primary" type="button" (click)="confirmarEstadoEstudiante()" [disabled]="guardandoEstadoEstudiante() || !motivoEstadoEstudiante.trim()">
              {{ guardandoEstadoEstudiante() ? 'Guardando…' : 'Actualizar Estado' }}
            </button>
          </mat-dialog-actions>
        </div>
      </ng-template>

      <!-- MODAL: CORREGIR DNI APODERADO -->
      <ng-template #corregirDniApoderadoDialog>
        <div class="w-full max-w-lg bg-white rounded-2xl p-6 font-sans text-[#172b4d] scrollbar-hidden">
          <h2 mat-dialog-title class="!m-0 !p-0 !text-xl !font-bold !text-[#14213d]">Corregir DNI de Apoderado</h2>
          <mat-dialog-content class="!px-0 !py-4 scrollbar-hidden space-y-3">
            @if (apoderadoSeleccionadoDni(); as apo) {
              <p class="text-xs text-slate-500 m-0">Apoderado: <strong class="text-[#14213d]">{{ apo.apellidoPaterno }} {{ apo.apellidoMaterno }}, {{ apo.nombres }}</strong> (DNI Actual: {{ apo.numeroDocumento }})</p>
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1">Nuevo DNI (8 dígitos) *</label>
                <div class="flex gap-2">
                  <input appFormatoEntrada="dni"
                    type="text"
                    [(ngModel)]="nuevoDniApoderado"
                    maxlength="8"
                    minlength="8"
                    inputmode="numeric"
                    placeholder="Ej. 71234567"
                    class="flex-1 rounded-xl border border-[#d9e1ec] px-3 py-2 text-sm text-[#14213d] focus:border-[#5b83d6] focus:outline-none"
                  />
                  <button
                    type="button"
                    (click)="consultarReniecApoderado()"
                    [disabled]="consultandoReniecApoderado() || nuevoDniApoderado.length !== 8"
                    title="Consultar datos en RENIEC"
                    aria-label="Consultar datos en RENIEC"
                    class="h-[44px] w-[44px] shrink-0 rounded-xl bg-gradient-to-b from-[#1c477d] to-[#173B67] hover:from-[#173B67] hover:to-[#112d50] text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer group active:scale-95"
                  >
                    @if (consultandoReniecApoderado()) {
                      <svg class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                      </svg>
                    } @else {
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-white group-hover:scale-110 transition-transform duration-150" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                      </svg>
                    }
                  </button>
                </div>
                @if (reniecApoderadoMensaje()) {
                  <p class="text-sm mt-1 text-emerald-800 bg-emerald-50 px-2 py-1 rounded font-medium">{{ reniecApoderadoMensaje() }}</p>
                }
              </div>
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1">Motivo / Sustento de corrección *</label>
                <textarea
                  [(ngModel)]="motivoDniApoderado"
                  rows="3"
                  maxlength="500"
                  placeholder="Indica el motivo de corrección y el documento formal recibido."
                  class="w-full rounded-xl border border-[#d9e1ec] px-3 py-2 text-sm text-[#14213d] focus:border-[#5b83d6] focus:outline-none resize-none"
                ></textarea>
              </div>
            }
          </mat-dialog-content>
          <mat-dialog-actions align="end" class="!px-0 !pb-0 !pt-4 border-t border-[#edf0f5]">
            <button mat-button type="button" mat-dialog-close [disabled]="guardandoDniApoderado()">Cancelar</button>
            <button mat-flat-button color="primary" type="button" (click)="confirmarCorregirDniApoderado()" [disabled]="guardandoDniApoderado() || nuevoDniApoderado.length !== 8 || !motivoDniApoderado.trim()">
              {{ guardandoDniApoderado() ? 'Guardando…' : 'Guardar Corrección' }}
            </button>
          </mat-dialog-actions>
        </div>
      </ng-template>

      <!-- ============================================================== -->
      <!-- MODAL: MATRÍCULA PRESENCIAL CON EVIDENCIAS Y COBRO EN EFECTIVO -->
      <!-- ============================================================== -->
      <ng-template #matriculaPresencialDialog>
        <div class="flex max-h-[calc(100dvh-28px)] min-h-0 w-full flex-col overflow-hidden rounded-xl bg-white font-sans">
          <header class="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
            <h3 class="m-0 text-lg font-semibold text-[#173B67]" id="matricula-presencial-titulo">Registrar matrícula</h3>
            <button type="button" (click)="cerrarModalMatriculaPresencial()" aria-label="Cerrar registro de matrícula"
              class="grid size-10 shrink-0 place-items-center rounded-lg text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-[#173B67]">
              <svg aria-hidden="true" class="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" d="m6 6 12 12M18 6 6 18"/></svg>
            </button>
          </header>
          <nav aria-label="Pasos de matrícula" class="shrink-0 border-b border-slate-200 px-4 sm:px-5">
            <ol class="m-0 grid list-none grid-cols-4 gap-1 p-0 sm:gap-3">
              @for (paso of ['Datos', 'Documentos', 'Pago', 'Cierre']; track paso; let i = $index) {
                <li [attr.aria-current]="etapaPresencial() === i + 1 ? 'step' : null"
                  class="flex items-center gap-1.5 border-b-2 px-0.5 py-2.5 text-xs font-medium text-slate-600 sm:text-sm"
                  [class.border-[#173B67]]="etapaPresencial() === i + 1" [class.border-transparent]="etapaPresencial() !== i + 1"
                  [class.text-[#173B67]]="etapaPresencial() === i + 1">
                  <span aria-hidden="true" class="hidden size-5 shrink-0 place-items-center rounded-full bg-slate-100 text-xs sm:grid">{{ etapaPresencial() > i + 1 ? '✓' : i + 1 }}</span>
                  {{ paso }}
                </li>
              }
            </ol>
          </nav>

          <!-- Modal Body with Scroll -->
          <div class="min-h-0 flex-1 overflow-y-auto bg-slate-50/60 px-4 py-4 sm:px-5">
            @if (errorPresencial()) {
              <div class="p-4 rounded-xl border border-rose-200 bg-rose-50/90 text-rose-900 text-xs flex items-start gap-3 shadow-xs">
                <span class="text-rose-600 font-bold text-base leading-none">⚠️</span>
                <div class="flex-1 font-medium leading-relaxed">{{ errorPresencial() }}</div>
              </div>
            }

            <!-- ========================================== -->
            <!-- PASO 1: DATOS GENERALES Y ASIGNACIÓN AULA -->
            <!-- ========================================== -->
            @if (etapaPresencial() === 1) {
              <div class="space-y-3">
                <!-- Bloque 1: Asignación Académica -->
                <div class="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                  <h4 class="m-0 border-b border-slate-100 pb-2 text-sm font-semibold text-[#173B67]">Datos académicos</h4>
                  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <label for="presencial-anio" class="block text-sm font-medium text-slate-700 mb-1">Año lectivo *</label>
                      <select id="presencial-anio" [(ngModel)]="presencialAnioId" (ngModelChange)="actualizarSeccionesPresencial()" class="w-full min-h-10 px-3 py-2 rounded-lg bg-white border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-[#173B67] focus:ring-2 focus:ring-[#173B67]/20">
                        @for (a of aniosAdmision(); track a.id) {
                          <option [ngValue]="a.id">{{ a.anio }}{{ a.anio > anioActualCalendario ? ' · Admisión ' + a.anio : ' (En curso)' }}</option>
                        }
                      </select>
                    </div>
                    <div>
                      <label for="presencial-nivel" class="block text-sm font-medium text-slate-700 mb-1">Nivel *</label>
                      <select id="presencial-nivel" [(ngModel)]="presencialNivelId" (ngModelChange)="alCambiarNivelPresencial()" class="w-full min-h-10 px-3 py-2 rounded-lg bg-white border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-[#173B67] focus:ring-2 focus:ring-[#173B67]/20">
                        <option [ngValue]="null">Selecciona nivel...</option>
                        @for (n of listaNivelesPresencial(); track n.id) {
                          <option [ngValue]="n.id">{{ n.nombre }}</option>
                        }
                      </select>
                    </div>
                    <div>
                      <label for="presencial-grado" class="block text-sm font-medium text-slate-700 mb-1">Grado *</label>
                      <select id="presencial-grado" [(ngModel)]="presencialGradoId" (ngModelChange)="alCambiarGradoPresencial()" [disabled]="!presencialNivelId" class="w-full min-h-10 px-3 py-2 rounded-lg bg-white border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-[#173B67] focus:ring-2 focus:ring-[#173B67]/20 disabled:bg-slate-100 disabled:text-slate-500">
                        <option [ngValue]="null">Selecciona grado...</option>
                        @for (g of listaGradosPresencial(); track g.id) {
                          <option [ngValue]="g.id">{{ g.nombre }}</option>
                        }
                      </select>
                    </div>
                    <div>
                      <label for="presencial-seccion" class="block text-sm font-medium text-slate-700 mb-1">Sección *</label>
                      <select id="presencial-seccion" [(ngModel)]="presencialSeccionId" [disabled]="!presencialGradoId" class="w-full min-h-10 px-3 py-2 rounded-lg bg-white border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-[#173B67] focus:ring-2 focus:ring-[#173B67]/20 disabled:bg-slate-100 disabled:text-slate-500">
                        <option [ngValue]="null">Selecciona sección...</option>
                        @for (s of seccionesFiltradasPresencial(); track s.id) {
                          <option [ngValue]="s.id">Sección {{ s.letra }} ({{ vacantesLibresSeccion(s) }} vacantes libres)</option>
                        } @empty {
                          @if (presencialGradoId) {
                            <option [ngValue]="null" disabled>No hay secciones con vacantes disponibles</option>
                          }
                        }
                      </select>
                    </div>
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label for="presencial-modalidad" class="block text-sm font-medium text-slate-700 mb-1">Modalidad de ingreso *</label>
                      <select id="presencial-modalidad" [(ngModel)]="presencialModalidadIngreso" class="w-full min-h-10 px-3 py-2 rounded-lg bg-white border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-[#173B67] focus:ring-2 focus:ring-[#173B67]/20">
                        <option value="REGULAR">Ingreso regular / Estudiante nuevo</option>
                        <option value="TRASLADO">Traslado desde otra institución</option>
                      </select>
                    </div>
                    @if (presencialModalidadIngreso === 'TRASLADO') {
                      <div>
                        <label for="presencial-colegio-procedencia" class="block text-sm font-medium text-slate-700 mb-1">Colegio de procedencia *</label>
                        <input id="presencial-colegio-procedencia" type="text" [(ngModel)]="presencialColegioProcedencia" maxlength="150" placeholder="Ej. I.E. Santa Rosa de Lima" class="w-full min-h-10 px-3 py-2 rounded-lg bg-white border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-[#173B67] focus:ring-2 focus:ring-[#173B67]/20" />
                      </div>
                    }
                  </div>
                  <p class="m-0 text-xs text-slate-600">
                    Mostrando únicamente grados y secciones con vacantes libres disponibles para el ciclo lectivo <strong>{{ obtenerAnioPresencialTexto() }}</strong>.
                    @if (presencialModalidadIngreso === 'TRASLADO') {
                      <span class="block mt-1 font-semibold text-indigo-800">Al ser ingreso por traslado, en el Paso 2 se solicitará el Certificado de Estudios o Libreta de Notas que acredite el grado.</span>
                    }
                  </p>
                </div>

                <!-- Bloque Principal: Dos Columnas Balanceadas (Estudiante y Apoderado) -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">

                  <!-- Columna Izquierda: Datos y Fotografía del Estudiante -->
                  <div class="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                    <h4 class="m-0 border-b border-slate-100 pb-2 text-sm font-semibold text-[#173B67]">Estudiante</h4>

                    <!-- Tarjeta de Fotografía del Estudiante -->
                    <div
                      class="rounded-xl p-3 transition"
                      [class]="presencialFotoBase64()
                        ? 'border-2 border-emerald-500 bg-emerald-50/60'
                        : 'border-2 border-dashed border-[#173B67]/45 bg-slate-100/80 hover:border-[#0F294D] hover:bg-slate-200/70'"
                    >
                      <div class="flex items-center gap-3.5">
                        <div class="relative shrink-0">
                          <img [src]="obtenerPreviewFotoPresencial()" alt="Rostro del estudiante" class="size-16 rounded-xl object-cover border border-slate-200 bg-white shadow-2xs" />
                          @if (presencialFotoBase64()) {
                            <span class="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-white rounded-full flex items-center justify-center text-white text-[10px] font-bold">✓</span>
                          }
                        </div>
                        <div class="min-w-0 flex-1 space-y-1.5">
                          <div class="flex flex-wrap items-center gap-2">
                            <span class="text-sm font-bold text-[#173B67]">Foto del estudiante *</span>
                            @if (presencialFotoBase64()) {
                              <span class="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">✓ Imagen cargada</span>
                            } @else {
                              <span class="text-[11px] font-semibold text-[#173B67] bg-white/90 border border-[#CBD5E1] px-2 py-0.5 rounded-full">Subir imagen aquí</span>
                            }
                          </div>
                          <p class="m-0 text-xs text-slate-600 leading-snug">
                            {{ presencialFotoBase64() ? 'Fotografía lista para el carné escolar.' : 'Haz clic en «Cargar imagen» para subir la foto oficial del estudiante (JPG, PNG o WebP).' }}
                          </p>

                          <div class="pt-0.5 flex flex-wrap items-center gap-2">
                            <label class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#173B67] hover:bg-[#112d50] text-white text-xs font-bold cursor-pointer shadow-2xs transition">
                              <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span>{{ presencialFotoBase64() ? 'Cambiar imagen' : 'Cargar imagen' }}</span>
                              <input type="file" accept="image/*" class="sr-only" (change)="seleccionarArchivoPresencial('foto', $event)" />
                            </label>
                            @if (presencialFotoBase64()) {
                              <button type="button" (click)="quitarArchivoPresencial('foto', $event)" class="text-xs font-semibold text-rose-600 hover:text-rose-800 hover:underline cursor-pointer">
                                Quitar
                              </button>
                            }
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- Campos del Estudiante -->
                    <div class="space-y-3">
                      <div>
                        <label for="presencial-dni-estudiante" class="block text-sm font-medium text-slate-700 mb-1">DNI *</label>
                        <div class="flex items-center gap-2">
                          <input id="presencial-dni-estudiante" inputmode="numeric" appFormatoEntrada="dni"
                            type="text"
                            [(ngModel)]="presencialDniEstudiante"
                            maxlength="8"
                            (keydown.enter)="presencialDniEstudiante.length === 8 && !consultandoDniPresencialEstudiante() && consultarDniPresencial('estudiante')"
                            placeholder="Ej. 74839201"
                            class="flex-1 min-w-0 min-h-10 px-3 py-2 rounded-lg bg-white border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-[#173B67] focus:ring-2 focus:ring-[#173B67]/20"
                          />
                          <button
                            type="button"
                            (click)="consultarDniPresencial('estudiante')"
                            [disabled]="consultandoDniPresencialEstudiante() || presencialDniEstudiante.length !== 8"
                            title="Consultar datos en RENIEC"
                            aria-label="Consultar DNI del estudiante en RENIEC"
                            class="h-10 w-10 shrink-0 rounded-lg bg-[#173B67] hover:bg-[#112d50] text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                          >
                            @if (consultandoDniPresencialEstudiante()) {
                              <svg class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                              </svg>
                            } @else {
                              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-white group-hover:scale-110 transition-transform duration-150" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                              </svg>
                            }
                          </button>
                        </div>
                      </div>

                      <div>
                        <label for="presencial-nombres-estudiante" class="block text-sm font-medium text-slate-700 mb-1">Nombres *</label>
                        <input id="presencial-nombres-estudiante" appFormatoEntrada="nombre"
                          type="text"
                          [(ngModel)]="presencialNombresEstudiante"
                          maxlength="20"
                          placeholder="Ej. Mateo Alejandro"
                          class="w-full min-h-10 px-3 py-2 rounded-lg bg-white border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-[#173B67] focus:ring-2 focus:ring-[#173B67]/20"
                        />
                      </div>

                      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label for="presencial-paterno-estudiante" class="block text-sm font-medium text-slate-700 mb-1">Apellido paterno *</label>
                          <input id="presencial-paterno-estudiante" appFormatoEntrada="nombre"
                            type="text"
                            [(ngModel)]="presencialApePaternoEstudiante"
                            maxlength="20"
                            placeholder="Ej. Quispe"
                            class="w-full min-h-10 px-3 py-2 rounded-lg bg-white border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-[#173B67] focus:ring-2 focus:ring-[#173B67]/20"
                          />
                        </div>
                        <div>
                          <label for="presencial-materno-estudiante" class="block text-sm font-medium text-slate-700 mb-1">Apellido materno *</label>
                          <input id="presencial-materno-estudiante" appFormatoEntrada="nombre"
                            type="text"
                            [(ngModel)]="presencialApeMaternoEstudiante"
                            maxlength="20"
                            placeholder="Ej. Mendoza"
                            class="w-full min-h-10 px-3 py-2 rounded-lg bg-white border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-[#173B67] focus:ring-2 focus:ring-[#173B67]/20"
                          />
                        </div>
                      </div>

                      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label class="block text-sm font-medium text-slate-700 mb-1">Fecha de Nacimiento *</label>
                          <app-ui-calendar [(ngModel)]="presencialNacimientoEstudiante" aria-label="Fecha de nacimiento"></app-ui-calendar>
                        </div>
                        <div>
                          <label class="block text-sm font-medium text-slate-700 mb-1">Género *</label>
                          <select [(ngModel)]="presencialGeneroEstudiante" class="w-full min-h-10 px-3 py-2 rounded-lg bg-white border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-[#173B67] focus:ring-2 focus:ring-[#173B67]/20">
                            <option value="M">Masculino</option>
                            <option value="F">Femenino</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Columna Derecha: Datos del Apoderado Responsable -->
                  <div class="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                    <h4 class="m-0 border-b border-slate-100 pb-2 text-sm font-semibold text-[#173B67]">Apoderado</h4>

                    <div class="space-y-3">
                      <div>
                        <label for="presencial-dni-apoderado" class="block text-sm font-medium text-slate-700 mb-1">DNI *</label>
                        <div class="flex items-center gap-2">
                          <input id="presencial-dni-apoderado" inputmode="numeric" appFormatoEntrada="dni"
                            type="text"
                            [(ngModel)]="presencialDniApoderado"
                            maxlength="8"
                            (keydown.enter)="presencialDniApoderado.length === 8 && !consultandoDniPresencialApoderado() && consultarDniPresencial('apoderado')"
                            placeholder="Ej. 42839201"
                            class="flex-1 min-w-0 min-h-10 px-3 py-2 rounded-lg bg-white border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-[#173B67] focus:ring-2 focus:ring-[#173B67]/20"
                          />
                          <button
                            type="button"
                            (click)="consultarDniPresencial('apoderado')"
                            [disabled]="consultandoDniPresencialApoderado() || presencialDniApoderado.length !== 8"
                            title="Consultar datos en RENIEC"
                            aria-label="Consultar DNI del apoderado en RENIEC"
                            class="h-10 w-10 shrink-0 rounded-lg bg-[#173B67] hover:bg-[#112d50] text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                          >
                            @if (consultandoDniPresencialApoderado()) {
                              <svg class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                              </svg>
                            } @else {
                              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-white group-hover:scale-110 transition-transform duration-150" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                              </svg>
                            }
                          </button>
                        </div>
                      </div>

                      <div>
                        <label for="presencial-nombres-apoderado" class="block text-sm font-medium text-slate-700 mb-1">Nombres *</label>
                        <input id="presencial-nombres-apoderado" appFormatoEntrada="nombre"
                          type="text"
                          [(ngModel)]="presencialNombresApoderado"
                          maxlength="20"
                          placeholder="Ej. Carlos Alberto"
                          class="w-full min-h-10 px-3 py-2 rounded-lg bg-white border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-[#173B67] focus:ring-2 focus:ring-[#173B67]/20"
                        />
                      </div>

                      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label for="presencial-paterno-apoderado" class="block text-sm font-medium text-slate-700 mb-1">Apellido paterno *</label>
                          <input id="presencial-paterno-apoderado" appFormatoEntrada="nombre"
                            type="text"
                            [(ngModel)]="presencialApePaternoApoderado"
                            maxlength="20"
                            placeholder="Ej. Quispe"
                            class="w-full min-h-10 px-3 py-2 rounded-lg bg-white border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-[#173B67] focus:ring-2 focus:ring-[#173B67]/20"
                          />
                        </div>
                        <div>
                          <label for="presencial-materno-apoderado" class="block text-sm font-medium text-slate-700 mb-1">Apellido materno *</label>
                          <input id="presencial-materno-apoderado" appFormatoEntrada="nombre"
                            type="text"
                            [(ngModel)]="presencialApeMaternoApoderado"
                            maxlength="20"
                            placeholder="Ej. Fernandez"
                            class="w-full min-h-10 px-3 py-2 rounded-lg bg-white border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-[#173B67] focus:ring-2 focus:ring-[#173B67]/20"
                          />
                        </div>
                      </div>

                      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label for="presencial-parentesco" class="block text-sm font-medium text-slate-700 mb-1">Parentesco *</label>
                          <select id="presencial-parentesco" [(ngModel)]="presencialParentesco" class="w-full min-h-10 px-3 py-2 rounded-lg bg-white border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-[#173B67] focus:ring-2 focus:ring-[#173B67]/20">
                            <option value="MADRE">Madre</option>
                            <option value="PADRE">Padre</option>
                            <option value="TUTOR_LEGAL">Tutor(a) Legal</option>
                          </select>
                        </div>
                        <div>
                          <label for="presencial-celular" class="block text-sm font-medium text-slate-700 mb-1">Celular *</label>
                          <input id="presencial-celular" inputmode="numeric" appFormatoEntrada="celular"
                            type="text"
                            [(ngModel)]="presencialCelularApoderado"
                            maxlength="9"
                            placeholder="Ej. 987654321"
                            class="w-full min-h-10 px-3 py-2 rounded-lg bg-white border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-[#173B67] focus:ring-2 focus:ring-[#173B67]/20"
                          />
                        </div>
                      </div>

                      <div>
                        <label for="presencial-correo" class="block text-sm font-medium text-slate-700 mb-1">Correo electrónico *</label>
                        <input id="presencial-correo" appFormatoEntrada="correo"
                          type="email"
                          [(ngModel)]="presencialEmailApoderado"
                          maxlength="100"
                          placeholder="apoderado@gmail.com"
                          class="w-full min-h-10 px-3 py-2 rounded-lg bg-white border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-[#173B67] focus:ring-2 focus:ring-[#173B67]/20"
                        />
                      </div>

                      <div>
                        <label for="presencial-domicilio" class="block text-sm font-medium text-slate-700 mb-1">Dirección de domicilio *</label>
                        <input id="presencial-domicilio" appFormatoEntrada="direccion"
                          type="text"
                          [(ngModel)]="presencialDireccionApoderado"
                          maxlength="150"
                          placeholder="Ej. Av. Los Próceres 450"
                          class="w-full min-h-10 px-3 py-2 rounded-lg bg-white border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-[#173B67] focus:ring-2 focus:ring-[#173B67]/20"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            }

            <!-- ========================================== -->
            <!-- PASO 2: DOCUMENTOS DE EVIDENCIA            -->
            <!-- ========================================== -->
            @if (etapaPresencial() === 2) {
              <div class="space-y-5">
                <p class="m-0 text-sm text-slate-600">Adjunta los documentos del expediente del estudiante.</p>

                <!-- Cuadrícula Simétrica de las 3 Evidencias -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3" [class.lg:grid-cols-4]="presencialModalidadIngreso === 'TRASLADO'" [class.lg:grid-cols-3]="presencialModalidadIngreso !== 'TRASLADO'">
                  <!-- Evidencia 1: Partida de Nacimiento -->
                  <div class="p-3 rounded-xl border bg-white flex flex-col justify-between h-full"
                       [class.border-emerald-500]="presencialArchivos.partida"
                       [class.ring-2]="presencialArchivos.partida"
                       [class.ring-emerald-500/20]="presencialArchivos.partida"
                       [class.border-slate-200]="!presencialArchivos.partida">
                    <div>
                      <div class="flex items-center justify-between mb-3">

                        @if (presencialArchivos.partida) {
                          <span class="inline-flex items-center gap-1 text-emerald-800 bg-emerald-100 text-xs font-bold px-2 py-0.5 rounded-full">
                            ✓ Adjuntado
                          </span>
                        } @else {
                          <span class="text-amber-700 bg-amber-50 text-xs font-semibold px-2 py-0.5 rounded-full">
                            Pendiente
                          </span>
                        }
                      </div>

                      <div class="flex items-center gap-2 mb-1.5">
                        <span class="text-xl">📜</span>
                        <h5 class="text-sm font-bold text-slate-900 m-0">Partida de Nacimiento *</h5>
                      </div>
                      <p class="text-xs text-slate-500 m-0 mb-4 leading-relaxed">
                        Acta de nacimiento oficial emitida por RENIEC o municipalidad (imagen o PDF).
                      </p>
                    </div>

                    <div>
                      @if (presencialArchivos.partida) {
                        <div class="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-2">
                          <div class="flex items-center justify-between gap-2">
                            <span class="text-xs font-bold text-emerald-950 truncate block flex-1" [title]="presencialArchivos.partida.name">
                              {{ presencialArchivos.partida.name }}
                            </span>
                            <button
                              type="button"
                              (click)="quitarArchivoPresencial('partida', $event)"
                              class="text-slate-400 hover:text-rose-600 text-xs font-bold cursor-pointer p-0.5"
                              title="Quitar archivo"
                            >
                              ✕
                            </button>
                          </div>
                          <div class="flex items-center justify-between text-sm text-emerald-800">
                            <span>{{ obtenerTamanoArchivo(presencialArchivos.partida) }}</span>
                            <label class="text-[#173B67] hover:underline font-bold cursor-pointer">
                              Cambiar
                              <input type="file" accept="image/*,application/pdf" class="hidden" (change)="seleccionarArchivoPresencial('partida', $event)" />
                            </label>
                          </div>
                        </div>
                      } @else {
                        <label class="block w-full text-center px-4 py-5 rounded-xl border-2 border-dashed border-[#173B67]/45 hover:border-[#173B67] bg-slate-100/70 hover:bg-slate-200/70 text-slate-700 cursor-pointer transition">
                          <input type="file" accept="image/*,application/pdf" class="hidden" (change)="seleccionarArchivoPresencial('partida', $event)" />
                          <svg xmlns="http://www.w3.org/2000/svg" class="w-7 h-7 mx-auto mb-1.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <span class="block text-sm font-bold text-[#173B67]">Subir Partida</span>
                          <span class="block text-xs text-slate-400 mt-0.5">JPG, PNG o PDF (máx. 5MB)</span>
                        </label>
                      }
                    </div>
                  </div>

                  <!-- Evidencia 2: DNI del Estudiante -->
                  <div class="p-3 rounded-xl border bg-white flex flex-col justify-between h-full"
                       [class.border-emerald-500]="presencialArchivos.dni"
                       [class.ring-2]="presencialArchivos.dni"
                       [class.ring-emerald-500/20]="presencialArchivos.dni"
                       [class.border-slate-200]="!presencialArchivos.dni">
                    <div>
                      <div class="flex items-center justify-between mb-3">

                        @if (presencialArchivos.dni) {
                          <span class="inline-flex items-center gap-1 text-emerald-800 bg-emerald-100 text-xs font-bold px-2 py-0.5 rounded-full">
                            ✓ Adjuntado
                          </span>
                        } @else {
                          <span class="text-amber-700 bg-amber-50 text-xs font-semibold px-2 py-0.5 rounded-full">
                            Pendiente
                          </span>
                        }
                      </div>

                      <div class="flex items-center gap-2 mb-1.5">
                        <span class="text-xl">🪪</span>
                        <h5 class="text-sm font-bold text-slate-900 m-0">DNI o C4 del Estudiante *</h5>
                      </div>
                      <p class="text-xs text-slate-500 m-0 mb-4 leading-relaxed">
                        Copia de documento nacional de identidad o C4 del menor (ambas caras).
                      </p>
                    </div>

                    <div>
                      @if (presencialArchivos.dni) {
                        <div class="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-2">
                          <div class="flex items-center justify-between gap-2">
                            <span class="text-xs font-bold text-emerald-950 truncate block flex-1" [title]="presencialArchivos.dni.name">
                              {{ presencialArchivos.dni.name }}
                            </span>
                            <button
                              type="button"
                              (click)="quitarArchivoPresencial('dni', $event)"
                              class="text-slate-400 hover:text-rose-600 text-xs font-bold cursor-pointer p-0.5"
                              title="Quitar archivo"
                            >
                              ✕
                            </button>
                          </div>
                          <div class="flex items-center justify-between text-sm text-emerald-800">
                            <span>{{ obtenerTamanoArchivo(presencialArchivos.dni) }}</span>
                            <label class="text-[#173B67] hover:underline font-bold cursor-pointer">
                              Cambiar
                              <input type="file" accept="image/*,application/pdf" class="hidden" (change)="seleccionarArchivoPresencial('dni', $event)" />
                            </label>
                          </div>
                        </div>
                      } @else {
                        <label class="block w-full text-center px-4 py-5 rounded-xl border-2 border-dashed border-[#173B67]/45 hover:border-[#173B67] bg-slate-100/70 hover:bg-slate-200/70 text-slate-700 cursor-pointer transition">
                          <input type="file" accept="image/*,application/pdf" class="hidden" (change)="seleccionarArchivoPresencial('dni', $event)" />
                          <svg xmlns="http://www.w3.org/2000/svg" class="w-7 h-7 mx-auto mb-1.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <span class="block text-sm font-bold text-[#173B67]">Subir DNI / C4</span>
                          <span class="block text-xs text-slate-400 mt-0.5">JPG, PNG o PDF (máx. 5MB)</span>
                        </label>
                      }
                    </div>
                  </div>

                  <!-- Evidencia 3: Recibo de Luz o Agua -->
                  <div class="p-3 rounded-xl border bg-white flex flex-col justify-between h-full"
                       [class.border-emerald-500]="presencialArchivos.recibo"
                       [class.ring-2]="presencialArchivos.recibo"
                       [class.ring-emerald-500/20]="presencialArchivos.recibo"
                       [class.border-slate-200]="!presencialArchivos.recibo">
                    <div>
                      <div class="flex items-center justify-between mb-3">

                        @if (presencialArchivos.recibo) {
                          <span class="inline-flex items-center gap-1 text-emerald-800 bg-emerald-100 text-xs font-bold px-2 py-0.5 rounded-full">
                            ✓ Adjuntado
                          </span>
                        } @else {
                          <span class="text-amber-700 bg-amber-50 text-xs font-semibold px-2 py-0.5 rounded-full">
                            Pendiente
                          </span>
                        }
                      </div>

                      <div class="flex items-center gap-2 mb-1.5">
                        <span class="text-xl">🏠</span>
                        <h5 class="text-sm font-bold text-slate-900 m-0">Recibo de Luz o Agua *</h5>
                      </div>
                      <p class="text-xs text-slate-500 m-0 mb-4 leading-relaxed">
                        Constancia de servicios domiciliarios (Enel, Sedapal o similar) de los últimos 3 meses.
                      </p>
                    </div>

                    <div>
                      @if (presencialArchivos.recibo) {
                        <div class="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-2">
                          <div class="flex items-center justify-between gap-2">
                            <span class="text-xs font-bold text-emerald-950 truncate block flex-1" [title]="presencialArchivos.recibo.name">
                              {{ presencialArchivos.recibo.name }}
                            </span>
                            <button
                              type="button"
                              (click)="quitarArchivoPresencial('recibo', $event)"
                              class="text-slate-400 hover:text-rose-600 text-xs font-bold cursor-pointer p-0.5"
                              title="Quitar archivo"
                            >
                              ✕
                            </button>
                          </div>
                          <div class="flex items-center justify-between text-sm text-emerald-800">
                            <span>{{ obtenerTamanoArchivo(presencialArchivos.recibo) }}</span>
                            <label class="text-[#173B67] hover:underline font-bold cursor-pointer">
                              Cambiar
                              <input type="file" accept="image/*,application/pdf" class="hidden" (change)="seleccionarArchivoPresencial('recibo', $event)" />
                            </label>
                          </div>
                        </div>
                      } @else {
                        <label class="block w-full text-center px-4 py-5 rounded-xl border-2 border-dashed border-[#173B67]/45 hover:border-[#173B67] bg-slate-100/70 hover:bg-slate-200/70 text-slate-700 cursor-pointer transition">
                          <input type="file" accept="image/*,application/pdf" class="hidden" (change)="seleccionarArchivoPresencial('recibo', $event)" />
                          <svg xmlns="http://www.w3.org/2000/svg" class="w-7 h-7 mx-auto mb-1.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <span class="block text-sm font-bold text-[#173B67]">Subir Recibo</span>
                          <span class="block text-xs text-slate-400 mt-0.5">JPG, PNG o PDF (máx. 5MB)</span>
                        </label>
                      }
                    </div>
                  </div>

                  <!-- Evidencia 4 (Solo Traslados): Certificado de Estudios o Libreta de Notas -->
                  @if (presencialModalidadIngreso === 'TRASLADO') {
                    <div class="p-3 rounded-xl border bg-white flex flex-col justify-between h-full"
                         [class.border-emerald-500]="presencialArchivos.certificadoEstudios"
                         [class.ring-2]="presencialArchivos.certificadoEstudios"
                         [class.ring-emerald-500/20]="presencialArchivos.certificadoEstudios"
                         [class.border-indigo-200]="!presencialArchivos.certificadoEstudios">
                      <div>
                        <div class="flex items-center justify-between mb-3">
                          @if (presencialArchivos.certificadoEstudios) {
                            <span class="inline-flex items-center gap-1 text-emerald-800 bg-emerald-100 text-xs font-bold px-2 py-0.5 rounded-full">
                              ✓ Adjuntado
                            </span>
                          } @else {
                            <span class="text-indigo-800 bg-indigo-50 text-xs font-semibold px-2 py-0.5 rounded-full">
                              Obligatorio traslado
                            </span>
                          }
                        </div>

                        <div class="flex items-center gap-2 mb-1.5">
                          <span class="text-xl">🎓</span>
                          <h5 class="text-sm font-bold text-slate-900 m-0">Certificado o Notas *</h5>
                        </div>
                        <p class="text-xs text-slate-500 m-0 mb-4 leading-relaxed">
                          Certificado de estudios, ficha SIAGIE o libreta de notas que acredite el grado previo.
                        </p>
                      </div>

                      <div>
                        @if (presencialArchivos.certificadoEstudios) {
                          <div class="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-2">
                            <div class="flex items-center justify-between gap-2">
                              <span class="text-xs font-bold text-emerald-950 truncate block flex-1" [title]="presencialArchivos.certificadoEstudios.name">
                                {{ presencialArchivos.certificadoEstudios.name }}
                              </span>
                              <button
                                type="button"
                                (click)="quitarArchivoPresencial('certificadoEstudios', $event)"
                                class="text-slate-400 hover:text-rose-600 text-xs font-bold cursor-pointer p-0.5"
                                title="Quitar archivo"
                              >
                                ✕
                              </button>
                            </div>
                            <div class="flex items-center justify-between text-sm text-emerald-800">
                              <span>{{ obtenerTamanoArchivo(presencialArchivos.certificadoEstudios) }}</span>
                              <label class="text-[#173B67] hover:underline font-bold cursor-pointer">
                                Cambiar
                                <input type="file" accept="image/*,application/pdf" class="hidden" (change)="seleccionarArchivoPresencial('certificadoEstudios', $event)" />
                              </label>
                            </div>
                          </div>
                        } @else {
                          <label class="block w-full text-center px-4 py-5 rounded-xl border-2 border-dashed border-indigo-400 hover:border-indigo-700 bg-indigo-50/40 hover:bg-indigo-50/80 text-slate-700 cursor-pointer transition">
                            <input type="file" accept="image/*,application/pdf" class="hidden" (change)="seleccionarArchivoPresencial('certificadoEstudios', $event)" />
                            <svg xmlns="http://www.w3.org/2000/svg" class="w-7 h-7 mx-auto mb-1.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            <span class="block text-sm font-bold text-indigo-900">Subir Certificado / Notas</span>
                            <span class="block text-xs text-slate-400 mt-0.5">JPG, PNG o PDF (máx. 5MB)</span>
                          </label>
                        }
                      </div>
                    </div>
                  }
                </div>
              </div>
            }

            <!-- ========================================== -->
            <!-- PASO 3: CAJA Y PAGO EN EFECTIVO            -->
            <!-- ========================================== -->
            @if (etapaPresencial() === 3) {
              <div class="space-y-4">
                <!-- Resumen previo de Matrícula -->
                <div class="p-4 rounded-2xl border border-slate-200 bg-white space-y-3 text-xs shadow-xs" aria-label="Resumen de revisión antes de confirmar">
                  <div class="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span class="text-xs font-extrabold uppercase tracking-wider text-[#173B67]">Resumen de revisión antes de confirmar</span>
                    <span class="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">Paso 3 de 3</span>
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div class="space-y-1">
                      <span class="text-slate-400 uppercase font-bold text-xs tracking-wider block">Estudiante</span>
                      <strong class="text-sm text-slate-900 block">{{ presencialNombresEstudiante }} {{ presencialApePaternoEstudiante }} {{ presencialApeMaternoEstudiante }}</strong>
                      <span class="text-slate-600 block text-xs"><span class="font-semibold text-slate-700">DNI:</span> {{ presencialDniEstudiante }}</span>
                    </div>
                    <div class="space-y-1 sm:border-l sm:border-slate-100 sm:pl-4">
                      <span class="text-slate-400 uppercase font-bold text-xs tracking-wider block">Apoderado</span>
                      <strong class="text-sm text-slate-900 block">{{ presencialNombresApoderado }} {{ presencialApePaternoApoderado }} {{ presencialApeMaternoApoderado }}</strong>
                      <span class="text-slate-600 block text-xs truncate"><span class="font-semibold text-slate-700">DNI:</span> {{ presencialDniApoderado }} · {{ presencialEmailApoderado }}</span>
                    </div>
                    <div class="space-y-1 lg:border-l lg:border-slate-100 lg:pl-4">
                      <span class="text-slate-400 uppercase font-bold text-xs tracking-wider block">Aula / Sección</span>
                      <strong class="text-sm text-slate-900 block">{{ obtenerNombreSeccionResumen() }}</strong>
                      <span class="text-slate-600 block text-xs">Año lectivo {{ obtenerAnioPresencialTexto() }}</span>
                    </div>
                    <div class="space-y-1 sm:border-l sm:border-slate-100 sm:pl-4">
                      <span class="text-slate-400 uppercase font-bold text-xs tracking-wider block">Total a cobrar</span>
                      <strong class="text-sm text-[#173B67] block">{{ presencialMontoEfectivo() !== null ? ('S/ ' + (presencialMontoEfectivo() | number:'1.2-2')) : 'Por calcular en caja' }}</strong>
                      <span class="text-slate-600 block text-xs">Medio: {{ presencialMetodoPago === 'EFECTIVO' ? 'Efectivo en ventanilla' : 'Mercado Pago' }}</span>
                    </div>
                  </div>
                </div>

                <fieldset class="m-0 min-w-0 rounded-xl border border-slate-200 bg-white p-4">
                  <legend class="px-1 text-sm font-semibold text-[#173B67]">Medio de pago</legend>
                  <div class="mb-4 grid gap-2 sm:grid-cols-2">
                    <label class="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 p-3 text-sm">
                      <input type="radio" name="medioPresencial" value="EFECTIVO" [(ngModel)]="presencialMetodoPago" [disabled]="guardandoPresencial()"> Efectivo
                    </label>
                    <label class="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 p-3 text-sm">
                      <input type="radio" name="medioPresencial" value="MERCADO_PAGO" [(ngModel)]="presencialMetodoPago" [disabled]="guardandoPresencial()"> Mercado Pago
                    </label>
                  </div>
                  @if (presencialMetodoPago === 'EFECTIVO') {
                    <div class="mb-4 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-1.5">
                      <p class="m-0 text-sm font-semibold text-slate-700">Total a cobrar en caja / ventanilla</p>
                      @if (presencialMontoEfectivo(); as importe) {
                        <p id="presencial-monto" class="m-0 text-2xl font-extrabold text-[#173B67]">S/ {{ importe | number:'1.2-2' }}</p>
                        <p class="m-0 text-xs text-slate-600">Se emitirá la boleta/constancia electrónica automáticamente al confirmar. No requiere subir imagen del voucher.</p>
                      } @else if (cargandoTarifaPresencial()) {
                        <p class="m-0 text-sm text-slate-600" role="status">Cargando importe…</p>
                      } @else {
                        <button type="button" (click)="cargarTarifaPresencial()" class="text-sm font-semibold text-[#173B67] underline">Volver a cargar el importe</button>
                      }
                    </div>
                  } @else {
                    <div class="mb-4 rounded-xl border border-blue-200 bg-blue-50/60 p-4 text-sm text-slate-700 space-y-1">
                      <p class="m-0 font-bold text-[#173B67]">Checkout digital en línea (Tarjeta, Yape, Plin, PagoEfectivo o Transferencia)</p>
                      <p class="m-0 text-xs text-slate-600">Al continuar se habilitará la interfaz de pago en línea para procesar o simular el cobro al instante.</p>
                    </div>
                  }

                  <div>
                    <label for="presencial-observaciones" class="block text-sm font-bold text-slate-700 mb-1.5">Observaciones (opcional)</label>
                    <input id="presencial-observaciones"
                      type="text"
                      [(ngModel)]="presencialObservaciones"
                      maxlength="250"
                      placeholder="Ej. Cobro en ventanilla en efectivo conforme. Matrícula ciclo escolar 2026."
                      class="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#173B67] transition shadow-2xs"
                    />
                  </div>

                </fieldset>
              </div>
            }

            <!-- ========================================== -->
            <!-- PASO 4: VOUCHER EMITIDO Y FINALIZACIÓN     -->
            <!-- ========================================== -->
            @if (etapaPresencial() === 4 && presencialPagoEnLinea(); as pago) {
              <div class="mx-auto max-w-2xl space-y-4 py-3 text-center" (window:focus)="actualizarEstadoPagoPresencial()">
                @if (presencialEstadoPago()?.comprobanteCodigo; as comprobante) {
                  <div class="rounded-2xl border border-emerald-200 bg-white p-6 space-y-3 shadow-sm">
                    <div class="w-14 h-14 mx-auto rounded-full bg-emerald-600 text-white text-2xl font-extrabold flex items-center justify-center">✓</div>
                    <h3 class="text-2xl font-extrabold text-slate-900 m-0">¡Pago en línea confirmado!</h3>
                    <p class="text-sm text-slate-700 m-0">Constancia <strong class="font-mono text-[#173B67]">{{ comprobante }}</strong> · S/ {{ pago.monto | number:'1.2-2' }}</p>
                    @if (presencialEstadoPago()?.estado === 'PAGO_CONFIRMADO_PENDIENTE_ASIGNACION') {
                      <p class="text-sm text-slate-700 m-0">La asignación de sección quedó pendiente. Puedes completarla en Solicitudes de matrícula.</p>
                    }
                  </div>
                } @else {
                  <app-simulador-checkout
                    [monto]="pago.monto"
                    [enlaceExterno]="pago.enlacePago"
                    [procesando]="guardandoPresencial()"
                    titulo="Gestionar pago de matrícula en línea"
                    (pagoSimulado)="simularPagoPresencial($event)"
                  />
                  <div class="flex flex-wrap justify-center gap-2 pt-1">
                    <button type="button" [disabled]="guardandoPresencial()" (click)="actualizarEstadoPagoPresencial()" class="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer">Ya pagué externamente · verificar estado</button>
                  </div>
                }
                <button type="button" (click)="cerrarModalMatriculaPresencial()" class="rounded-xl bg-[#173B67] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#112d50] cursor-pointer">Finalizar y cerrar</button>
              </div>
            } @else if (etapaPresencial() === 4) {
              <div class="text-center py-6 space-y-5">
                <div class="w-16 h-16 mx-auto rounded-full bg-emerald-600 text-white text-3xl font-extrabold flex items-center justify-center shadow-lg shadow-emerald-600/30">
                  ✓
                </div>
                <div>
                  <span class="text-sm font-extrabold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                    Trámite Presencial Concluido con Éxito
                  </span>
                  <h3 class="text-2xl font-extrabold text-slate-900 m-0 mt-2">¡Matrícula y Cobro Registrados!</h3>
                  <p class="text-xs text-slate-500 m-0 mt-1 max-w-md mx-auto leading-relaxed">
                    La matrícula y el pago se registraron. La constancia del apoderado se procesa por correo.
                  </p>
                </div>

                <div class="max-w-md mx-auto p-5 rounded-2xl border border-slate-200 bg-white text-left text-xs space-y-2.5 shadow-sm">
                  <div class="flex justify-between items-center border-b border-slate-100 pb-2">
                    <span class="text-slate-500">Comprobante Oficial:</span>
                    <strong class="text-[#173B67] font-mono text-sm bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200">
                      {{ resultadoPresencial()?.comprobanteCodigo }}
                    </strong>
                  </div>
                  <div class="flex justify-between items-center border-b border-slate-100 pb-2">
                    <span class="text-slate-500">Código de Matrícula:</span>
                    <strong class="text-slate-900 font-mono">FIC-MAT-{{ resultadoPresencial()?.matriculaId }}</strong>
                  </div>
                  <div class="flex justify-between items-center border-b border-slate-100 pb-2">
                    <span class="text-slate-500">Monto Cobrado:</span>
                    <strong class="text-emerald-700 font-bold text-sm">S/ {{ resultadoPresencial()?.montoCobrado | number:'1.2-2' }} (Efectivo)</strong>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-slate-500">Correo del apoderado:</span>
                    <strong class="text-slate-900 truncate max-w-[220px]" [title]="resultadoPresencial()?.emailApoderado || ''">
                      {{ resultadoPresencial()?.emailApoderado }}
                    </strong>
                  </div>
                </div>

                <div class="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    (click)="descargarVoucherPresencial()"
                    class="px-6 py-3 rounded-xl bg-[#173B67] hover:bg-[#112d50] text-white text-xs font-bold cursor-pointer shadow-md inline-flex items-center gap-2 transition"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span>Descargar constancia PDF</span>
                  </button>
                  <button
                    type="button"
                    (click)="cerrarModalMatriculaPresencial()"
                    class="px-5 py-3 rounded-xl bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 text-xs font-bold cursor-pointer transition shadow-2xs"
                  >
                    Finalizar y Ver Padrón
                  </button>
                </div>
              </div>
            }
          </div>

          <!-- Modal Footer with Step Navigation Buttons -->
          @if (etapaPresencial() < 4) {
            <div class="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-white px-4 py-3 sm:px-5">
              <button
                type="button"
                (click)="retrocederEtapaPresencial()"
                [disabled]="etapaPresencial() === 1 || guardandoPresencial()"
                class="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold hover:bg-slate-200 disabled:opacity-40 cursor-pointer transition"
              >
                Anterior
              </button>

              <div class="flex items-center gap-3">
                <button
                  type="button"
                  (click)="cerrarModalMatriculaPresencial()"
                  [disabled]="guardandoPresencial()"
                  class="px-4 py-2.5 rounded-xl bg-transparent text-slate-500 hover:text-slate-800 text-xs font-bold cursor-pointer transition"
                >
                  Cancelar
                </button>

                @if (etapaPresencial() === 1) {
                  <button
                    type="button"
                    (click)="avanzarAPaso2Presencial()"
                    class="px-5 py-2.5 rounded-xl bg-[#173B67] hover:bg-[#112d50] text-white text-xs font-bold cursor-pointer shadow-sm transition inline-flex items-center gap-1.5"
                  >
                    <span>Continuar a documentos</span>
                    <span>→</span>
                  </button>
                }

                @if (etapaPresencial() === 2) {
                  <button
                    type="button"
                    (click)="avanzarAPaso3Presencial()"
                    class="px-5 py-2.5 rounded-xl bg-[#173B67] hover:bg-[#112d50] text-white text-xs font-bold cursor-pointer shadow-sm transition inline-flex items-center gap-1.5"
                  >
                    <span>Continuar al pago</span>
                    <span>→</span>
                  </button>
                }

                @if (etapaPresencial() === 3) {
                  <button
                    type="button"
                    (click)="confirmarMatriculaPresencial()"
                    [disabled]="guardandoPresencial() || (presencialMetodoPago === 'EFECTIVO' && !presencialMontoEfectivo())"
                    class="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer shadow-md inline-flex items-center gap-2 disabled:opacity-50 transition"
                  >
                    @if (guardandoPresencial()) {
                      <span class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>Registrando…</span>
                    } @else {
                      <span>{{ presencialMetodoPago === 'EFECTIVO' ? 'Confirmar matrícula y pago' : 'Ir al checkout en línea' }}</span>
                    }
                  </button>
                }
              </div>
            </div>
          }
        </div>
      </ng-template>

    </div>
  `
})
export class MatriculasComponent implements OnInit {
  readonly auth = inject(AuthStore);
  private readonly dialog = inject(MatDialog);
  private readonly matriculaService = inject(MatriculaService);
  private readonly academicoService = inject(AcademicoService);
  private readonly matriculaPublicaService = inject(MatriculaPublicaService, { optional: true });
  readonly authStore = inject(AuthStore);

  @ViewChild('detallesEstudianteDialog') private detallesEstudianteDialog!: TemplateRef<unknown>;
  private detallesEstudianteDialogRef?: MatDialogRef<unknown>;
  readonly estudianteDetalle = signal<EstudianteResponseDto | null>(null);
  readonly apoderadosEstudiante = signal<ApoderadoFichaResponseDto[]>([]);
  readonly cargandoApoderadosEstudiante = signal(false);
  readonly obtenerFotoEstudiante = obtenerFotoEstudiante;

  obtenerFotoEstudiantePorId(estudianteId: number): string {
    const est = this.estudiantesPorId.get(estudianteId);
    return obtenerFotoEstudiante(est || { id: estudianteId });
  }

  abrirModalDetallesEstudiante(est: EstudianteResponseDto): void {
    this.estudianteDetalle.set(est);
    this.apoderadosEstudiante.set([]);
    this.cargandoApoderadosEstudiante.set(true);
    this.matriculaService.listarApoderadosPorEstudiante(est.id).subscribe({
      next: (data) => {
        this.apoderadosEstudiante.set(data || []);
        this.cargandoApoderadosEstudiante.set(false);
      },
      error: () => {
        this.cargandoApoderadosEstudiante.set(false);
      }
    });
    this.detallesEstudianteDialogRef = this.dialog.open(this.detallesEstudianteDialog, {
      width: '680px',
      maxWidth: 'calc(100vw - 24px)',
      maxHeight: 'calc(100dvh - 28px)',
      panelClass: 'school-dialog',
      autoFocus: 'dialog',
      restoreFocus: true
    });
    this.detallesEstudianteDialogRef.afterClosed().subscribe(() => {
      this.estudianteDetalle.set(null);
    });
  }

  cerrarModalDetallesEstudiante(): void {
    this.detallesEstudianteDialogRef?.close();
    this.estudianteDetalle.set(null);
  }

  onFotoEstudianteSeleccionada(estudianteId: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      if (base64) {
        guardarFotoEstudiante(estudianteId, base64);
        this.cargarEstudiantes();
      }
    };
    reader.readAsDataURL(file);
  }

  @ViewChild('nuevoAlumnoDialog') private nuevoAlumnoDialog!: TemplateRef<unknown>;
  @ViewChild('vinculoApoderadoDialog') private vinculoApoderadoDialog!: TemplateRef<unknown>;
  @ViewChild('solicitudDialog') private solicitudDialog!: TemplateRef<unknown>;
  @ViewChild('fichaDialog') private fichaDialog!: TemplateRef<unknown>;
  @ViewChild('estadoDialog') private estadoDialog!: TemplateRef<unknown>;
  @ViewChild('corregirDniEstudianteDialog') private corregirDniEstudianteDialog!: TemplateRef<unknown>;
  @ViewChild('estadoEstudianteDialog') private estadoEstudianteDialog!: TemplateRef<unknown>;
  @ViewChild('corregirDniApoderadoDialog') private corregirDniApoderadoDialog!: TemplateRef<unknown>;
  @ViewChild('matriculaPresencialDialog') private matriculaPresencialDialog!: TemplateRef<unknown>;
  private matriculaPresencialDialogRef?: MatDialogRef<unknown>;
  private alumnoDialogRef?: MatDialogRef<unknown>;

  // Wizard Matrícula Presencial (Secretaría / Dirección)
  readonly etapaPresencial = signal<1 | 2 | 3 | 4>(1);
  readonly errorPresencial = signal<string | null>(null);
  readonly guardandoPresencial = signal(false);
  readonly consultandoDniPresencialEstudiante = signal(false);
  readonly consultandoDniPresencialApoderado = signal(false);
  readonly resultadoPresencial = signal<MatriculaPresencialResponseDto | null>(null);
  readonly nivelesCatalogo = signal<NivelResponseDto[]>([
    { id: 1, codigo: 'INICIAL', nombre: 'Inicial' },
    { id: 2, codigo: 'PRIMARIA', nombre: 'Primaria' },
    { id: 3, codigo: 'SECUNDARIA', nombre: 'Secundaria' }
  ]);
  readonly catalogoGradosPresencial = signal<Array<{ id: number; nombre: string; nivelId: number }>>([]);
  readonly seccionesPresencial = signal<SeccionResponseDto[]>([]);
  readonly aulasInactivasCodigos = signal<Set<string>>(new Set());
  readonly estudiantesConSeccionAsignada = signal<ReadonlySet<number>>(new Set<number>());
  readonly solicitudesPublicasPendientes = signal<SolicitudMatriculaPublicaAdminDto[]>([]);
  readonly anioActualCalendario = new Date().getFullYear();

  asignarNivelId: number | null = null;
  asignarGradoId: number | null = null;
  presencialAnioId: number | null = null;
  presencialNivelId: number | null = null;
  presencialGradoId: number | null = null;
  presencialSeccionId: number | null = null;
  presencialDniEstudiante = '';
  presencialNombresEstudiante = '';
  presencialApePaternoEstudiante = '';
  presencialApeMaternoEstudiante = '';
  presencialNacimientoEstudiante = '';
  presencialGeneroEstudiante: 'M' | 'F' = 'M';
  presencialDniApoderado = '';
  presencialNombresApoderado = '';
  presencialApePaternoApoderado = '';
  presencialApeMaternoApoderado = '';
  presencialParentesco: 'MADRE' | 'PADRE' | 'TUTOR_LEGAL' = 'MADRE';
  presencialCelularApoderado = '';
  presencialEmailApoderado = '';
  presencialDireccionApoderado = '';

  presencialMetodoPago: 'EFECTIVO' | 'MERCADO_PAGO' = 'EFECTIVO';
  presencialModalidadIngreso: ModalidadIngreso = 'REGULAR';
  presencialColegioProcedencia = '';
  presencialArchivos: {
    partida: File | null;
    dni: File | null;
    recibo: File | null;
    foto: File | null;
    certificadoEstudios: File | null;
  } = {
    partida: null,
    dni: null,
    recibo: null,
    foto: null,
    certificadoEstudios: null
  };
  readonly presencialFotoBase64 = signal<string | null>(null);
  readonly presencialMontoEfectivo = signal<number | null>(null);
  readonly cargandoTarifaPresencial = signal(false);
  readonly presencialConstancia = signal<File | null>(null);
  readonly presencialConstanciaPreview = signal<string | null>(null);
  readonly presencialPagoEnLinea = signal<PagoPresencialEnLinea | null>(null);
  readonly presencialEstadoPago = signal<EstadoPagoPresencial | null>(null);
  presencialObservaciones = '';
  private vinculoApoderadoDialogRef?: MatDialogRef<unknown>;
  private solicitudDialogRef?: MatDialogRef<unknown>;
  private fichaDialogRef?: MatDialogRef<unknown>;
  private estadoDialogRef?: MatDialogRef<unknown>;
  private corregirDniEstudianteDialogRef?: MatDialogRef<unknown>;
  private estadoEstudianteDialogRef?: MatDialogRef<unknown>;
  private corregirDniApoderadoDialogRef?: MatDialogRef<unknown>;

  readonly estudianteSeleccionadoDni = signal<EstudianteResponseDto | null>(null);
  nuevoDniEstudiante = '';
  motivoDniEstudiante = '';
  readonly consultandoReniecEstudiante = signal(false);
  readonly reniecEstudianteMensaje = signal('');
  readonly guardandoDniEstudiante = signal(false);

  readonly estudianteSeleccionadoEstado = signal<EstudianteResponseDto | null>(null);
  estadoEstudianteDestino = 'ACTIVO';
  motivoEstadoEstudiante = '';
  readonly guardandoEstadoEstudiante = signal(false);

  readonly apoderadoSeleccionadoDni = signal<ApoderadoResponseDto | null>(null);
  nuevoDniApoderado = '';
  motivoDniApoderado = '';
  readonly consultandoReniecApoderado = signal(false);
  readonly reniecApoderadoMensaje = signal('');
  readonly guardandoDniApoderado = signal(false);

  readonly anios = signal<AnioLectivoResponseDto[]>([]);
  readonly secciones = signal<SeccionResponseDto[]>([]);
  readonly pestanaActiva = signal<'estudiantes' | 'matriculas'>('estudiantes');

  readonly mostrarModalNuevoAlumno = signal(false);
  readonly guardandoAlumno = signal(false);
  readonly consultandoDni = signal(false);

  readonly mostrarSolicitud = signal(false);
  readonly guardando = signal(false);
  readonly cargando = signal(false);
  readonly cargandoEstudiantes = signal(false);

  readonly error = signal<string | null>(null);
  readonly mensajeExito = signal<string | null>(null);
  readonly confirmandoMatricula = signal<number | null>(null);
  readonly matriculaSeleccionadaEstado = signal<EstudianteMatriculadoItem | null>(null);
  readonly guardandoCambioEstado = signal(false);
  readonly ficha = signal<FichaMatriculaResponseDto | null>(null);
  readonly estudianteParaVinculo = signal<EstudianteResponseDto | null>(null);
  readonly apoderadosDisponibles = signal<ApoderadoResponseDto[]>([]);
  readonly cargandoApoderados = signal(false);
  readonly guardandoVinculoApoderado = signal(false);
  readonly errorVinculoApoderado = signal<string | null>(null);
  apoderadoIdSeleccionado = 0;
  parentescoApoderado: ParentescoApoderado = 'PADRE';
  esResponsableEconomico = true;
  tieneCustodia = false;
  permiteRecojo = true;
  estadoDestino: EstadoTerminalMatricula = 'TRASLADADO';
  motivoCambioEstado = '';

  readonly listaEstudiantes = signal<EstudianteResponseDto[]>([]);
  readonly estudiantesMatriculadosPorAnio = signal<ReadonlySet<number>>(new Set<number>());
  readonly cargandoMatriculasAnio = signal(false);
  readonly matriculasAnioVerificadas = signal(false);
  readonly errorCargaMatriculasAnio = signal(false);
  private solicitudMatriculasAnio = 0;
  readonly estudiantes = signal<EstudianteMatriculadoItem[]>([]);
  private estudiantesPorId = new Map<number, EstudianteResponseDto>();

  busqueda = '';
  busquedaEstudiante = '';
  paginaPadron = 0;
  tamanoPaginaPadron = 10;
  paginaMatriculas = 0;
  tamanoPaginaMatriculas = 10;
  private revisionCargaMatriculas = 0;
  seccionIdSeleccionada = 0;
  filtroSeccionId = 0;
  filtroSeccionLetra = 'TODAS';
  filtroGradoId = 0;
  anioLectivoId = 0;
  nuevoEstudianteId = 0;
  nuevasObservaciones = '';
  filtroEstado = 'TODOS';
  readonly gradosMap = new Map<number, string>();

  nuevoAlumno: RegistrarEstudianteRequestDto = {
    tipoDocumento: 'DNI',
    numeroDocumento: '',
    nombres: '',
    apellidoPaterno: '',
    apellidoMaterno: '',
    fechaNacimiento: '2012-05-15',
    genero: 'M',
    grupoSanguineo: 'O+',
    alergiasCondiciones: ''
  };

  anioActivoTexto(): string {
    const a = this.anios().find(x => x.id === this.anioLectivoId);
    return a ? String(a.anio) : '—';
  }

  gradosDisponiblesEnSecciones(): number[] {
    return [...new Set(this.secciones().filter(s => s.letra !== 'D').map(seccion => seccion.gradoId))];
  }

  gradosOrdenadosDisponibles(): Array<{ id: number; nombre: string }> {
    const ids = this.gradosDisponiblesEnSecciones();
    const lista = ids.map(id => ({ id, nombre: this.gradosMap.get(id) ?? `Grado ${id}` }));
    return lista.sort((a, b) => compararGradosPorSecuenciaInstitucional(a.nombre, b.nombre));
  }

  esAulaSeccionActiva(seccion: SeccionResponseDto): boolean {
    const codigo = seccion.aulaFisica?.trim().toUpperCase();
    return !codigo || !this.aulasInactivasCodigos().has(codigo);
  }

  vacantesLibresSeccion(seccion: SeccionResponseDto): number {
    return Math.max(0, Number(seccion.cupoMaximo ?? 0) - Number(seccion.vacantesOcupadas ?? 0));
  }

  tieneVacantesDisponibles(seccion: SeccionResponseDto): boolean {
    return seccion.letra !== 'D'
      && this.esAulaSeccionActiva(seccion)
      && this.vacantesLibresSeccion(seccion) > 0;
  }

  seccionesPresencialDisponibles(): SeccionResponseDto[] {
    return this.secciones()
      .filter(s => s.letra !== 'D')
      .sort((a, b) => {
        const nombreA = this.gradosMap.get(a.gradoId) ?? `Grado ${a.gradoId}`;
        const nombreB = this.gradosMap.get(b.gradoId) ?? `Grado ${b.gradoId}`;
        const cmp = compararGradosPorSecuenciaInstitucional(nombreA, nombreB);
        if (cmp !== 0) return cmp;
        return a.letra.localeCompare(b.letra);
      });
  }

  solicitudPendienteDeEstudiante(estudianteId: number): SolicitudMatriculaPublicaAdminDto | undefined {
    if (!estudianteId) return undefined;
    return this.solicitudesPublicasPendientes().find(s => s.estudianteId === estudianteId);
  }

  solicitudPendienteSeleccionada(): SolicitudMatriculaPublicaAdminDto | undefined {
    return this.solicitudPendienteDeEstudiante(this.nuevoEstudianteId);
  }

  estaMatriculadoConSeccion(estudianteId: number): boolean {
    if (this.solicitudPendienteDeEstudiante(estudianteId)) return false;
    return this.estudiantesConSeccionAsignada().has(estudianteId);
  }

  nombreNivelDeGrado(gradoId: number): string {
    const g = this.catalogoGradosPresencial().find(item => item.id === gradoId);
    const nivelId = g?.nivelId ?? this.secciones().find(s => s.gradoId === gradoId)?.nivelId;
    return this.nivelesCatalogo().find(n => n.id === nivelId)?.nombre ?? '';
  }

  nivelIdDeGrado(gradoId: number): number | null {
    const g = this.catalogoGradosPresencial().find(item => item.id === gradoId);
    if (g?.nivelId) return g.nivelId;
    return this.secciones().find(s => s.gradoId === gradoId)?.nivelId
      ?? this.seccionesPresencial().find(s => s.gradoId === gradoId)?.nivelId
      ?? null;
  }

  seccionesDisponiblesParaAsignar(): SeccionResponseDto[] {
    return this.seccionesPresencialDisponibles().filter(s => this.tieneVacantesDisponibles(s));
  }

  listaNivelesParaAsignar(): NivelResponseDto[] {
    const disponibles = this.seccionesDisponiblesParaAsignar();
    const ids = new Set(disponibles.map(s => s.nivelId));
    const sol = this.solicitudPendienteSeleccionada();
    const nivelSol = sol ? this.nivelIdDeGrado(sol.gradoId) : null;
    if (nivelSol) ids.add(nivelSol);
    return this.nivelesCatalogo().filter(n => ids.has(n.id));
  }

  listaGradosParaAsignar(): Array<{ id: number; nombre: string; nivelId: number }> {
    const disponibles = this.seccionesDisponiblesParaAsignar();
    const gradoIds = new Set(disponibles.map(s => s.gradoId));
    const sol = this.solicitudPendienteSeleccionada();
    if (sol?.gradoId) gradoIds.add(sol.gradoId);

    const nivelId = this.asignarNivelId;
    const base = this.catalogoGradosPresencial().length
      ? this.catalogoGradosPresencial()
      : [...gradoIds].map(id => ({
          id,
          nombre: this.gradosMap.get(id) ?? `Grado ${id}`,
          nivelId: disponibles.find(s => s.gradoId === id)?.nivelId ?? 1
        }));

    return this.ordenarGradosPresencial(
      base.filter(g => gradoIds.has(g.id) && (!nivelId || g.nivelId === nivelId))
    );
  }

  seccionesFiltradasParaAsignar(): SeccionResponseDto[] {
    return this.seccionesDisponiblesParaAsignar().filter(s =>
      (!this.asignarNivelId || s.nivelId === this.asignarNivelId) &&
      (!this.asignarGradoId || s.gradoId === this.asignarGradoId)
    );
  }

  alCambiarNivelAsignar(): void {
    const grados = this.listaGradosParaAsignar();
    if (!grados.some(g => g.id === this.asignarGradoId)) {
      this.asignarGradoId = grados[0]?.id ?? null;
    }
    this.alCambiarGradoAsignar();
  }

  alCambiarGradoAsignar(): void {
    const secciones = this.seccionesFiltradasParaAsignar();
    if (!secciones.some(s => s.id === this.seccionIdSeleccionada)) {
      this.seccionIdSeleccionada = secciones[0]?.id ?? 0;
    }
  }

  onEstudianteSeleccionadoAsignar(estudianteId: number): void {
    this.nuevoEstudianteId = Number(estudianteId) || 0;
    const sol = this.solicitudPendienteSeleccionada();
    if (sol) {
      this.anioLectivoId = sol.anioLectivoId;
      this.asignarNivelId = this.nivelIdDeGrado(sol.gradoId);
      this.asignarGradoId = sol.gradoId;
      if (!this.secciones().length || this.secciones()[0]?.anioLectivoId !== sol.anioLectivoId) {
        this.cargarSecciones(false, true);
      } else {
        this.alCambiarGradoAsignar();
      }
      return;
    }
    this.sincronizarSelectoresAsignar();
  }

  private sincronizarSelectoresAsignar(): void {
    const sol = this.solicitudPendienteSeleccionada();
    if (sol) {
      this.asignarNivelId = this.nivelIdDeGrado(sol.gradoId);
      this.asignarGradoId = sol.gradoId;
      this.alCambiarGradoAsignar();
      return;
    }
    const niveles = this.listaNivelesParaAsignar();
    if (this.asignarNivelId && !niveles.some(n => n.id === this.asignarNivelId)) {
      this.asignarNivelId = null;
    }
    if (!this.asignarNivelId) {
      this.asignarGradoId = null;
      this.seccionIdSeleccionada = 0;
      return;
    }
    const grados = this.listaGradosParaAsignar();
    if (!grados.some(g => g.id === this.asignarGradoId)) {
      this.asignarGradoId = grados[0]?.id ?? null;
    }
    this.alCambiarGradoAsignar();
  }

  seccionesFiltradasPorGrado(): SeccionResponseDto[] {
    return this.seccionesPresencialDisponibles().filter(s => !this.filtroGradoId || s.gradoId === Number(this.filtroGradoId));
  }

  cambiarFiltroGrado(gradoId: number): void {
    this.filtroGradoId = Number(gradoId);
    this.paginaMatriculas = 0;
  }

  estudiantesEnPadron(): EstudianteResponseDto[] {
    const conSeccion = this.estudiantesConSeccionAsignada();
    return this.listaEstudiantes().filter(e =>
      !conSeccion.has(e.id) || Boolean(this.solicitudPendienteDeEstudiante(e.id))
    );
  }

  estudiantesFiltradosPadron(): EstudianteResponseDto[] {
    const q = this.busquedaEstudiante.toLowerCase().trim();
    const base = this.estudiantesEnPadron();
    if (!q) return base;

    return base.filter(e => {
      const nombreCompleto = `${e.apellidoPaterno} ${e.apellidoMaterno}, ${e.nombres}`.toLowerCase();
      return e.numeroDocumento?.toLowerCase().includes(q) ||
        e.codigoEstudianteSiagie?.toLowerCase().includes(q) ||
        nombreCompleto.includes(q);
    });
  }

  estudiantesPaginados(): EstudianteResponseDto[] {
    return paginarRegistros(this.estudiantesFiltradosPadron(), this.paginaPadron + 1, this.tamanoPaginaPadron);
  }

  listaEstudiantesDisponibles(): EstudianteResponseDto[] {
    if (!this.matriculasAnioVerificadas() || this.cargandoMatriculasAnio()) return [];
    const matriculados = this.estudiantesMatriculadosPorAnio();
    return this.listaEstudiantes().filter(estudiante =>
      Boolean(this.solicitudPendienteDeEstudiante(estudiante.id)) || !matriculados.has(estudiante.id)
    );
  }

  estaMatriculadoEnAnio(estudianteId: number): boolean {
    return this.estudiantesMatriculadosPorAnio().has(estudianteId);
  }

  cambiarPestana(pestana: 'estudiantes' | 'matriculas'): void {
    this.pestanaActiva.set(pestana);
    if (pestana === 'matriculas' && this.estudiantes().length === 0) {
      this.cargarSecciones(true);
    }
  }

  cambiarPaginaPadron(pagina: number): void {
    this.paginaPadron = Math.max(0, pagina - 1);
  }

  estudiantesFiltrados(): EstudianteMatriculadoItem[] {
    const q = this.busqueda.toLowerCase().trim();
    const estado = this.filtroEstado;
    const gradoId = Number(this.filtroGradoId);
    const seccionLetra = this.filtroSeccionLetra;

    return this.estudiantes().filter(e => {
      // Excluir sección D que no existe formalmente en el sistema
      if (e.seccionLetra === 'D') return false;

      // Filtro por grado seleccionado
      if (gradoId > 0 && e.gradoId !== gradoId) return false;

      // Filtro por sección genérica (A, B, C)
      if (seccionLetra !== 'TODAS' && e.seccionLetra !== seccionLetra) return false;

      const datosEstudiante = this.estudiantesPorId.get(e.estudianteId);
      const matchQ =
        !q ||
        String(e.estudianteId).includes(q) ||
        (e.codigoMatricula && e.codigoMatricula.toLowerCase().includes(q)) ||
        Boolean(datosEstudiante?.numeroDocumento?.includes(q)) ||
        this.nombreEstudiante(e.estudianteId).toLowerCase().includes(q);
      const matchEstado = estado === 'TODOS'
        || (estado === 'INGRESO_TRASLADO' ? e.modalidadIngreso === 'TRASLADO' : e.estado === estado);
      return matchQ && matchEstado;
    });
  }

  estudiantesPaginadosMatriculas(): EstudianteMatriculadoItem[] {
    return paginarRegistros(this.estudiantesFiltrados(), this.paginaMatriculas + 1, this.tamanoPaginaMatriculas);
  }

  nombreEstudiante(estudianteId: number): string {
    const estudiante = this.estudiantesPorId.get(estudianteId);
    return estudiante
      ? `${estudiante.apellidoPaterno} ${estudiante.apellidoMaterno}, ${estudiante.nombres}`
      : 'Estudiante no disponible';
  }

  documentoEstudiante(estudianteId: number): string {
    return this.estudiantesPorId.get(estudianteId)?.numeroDocumento ?? '';
  }

  cambiarPaginaMatriculas(pagina: number): void {
    this.paginaMatriculas = Math.max(0, pagina - 1);
  }

  ngOnInit(): void {
    this.cargarEstudiantes();
    this.cargarCatalogoGrados();
    this.cargarAulasEstado();
    this.academicoService.listarAnios().subscribe({
      next: anios => {
        this.anios.set(anios);
        const anioActual = new Date().getFullYear();
        const anioActualAbierto = anios.find(a => a.abierto && a.anio === anioActual);
        const aniosAbiertos = anios.filter(a => a.abierto).sort((a, b) => Math.abs(a.anio - anioActual) - Math.abs(b.anio - anioActual));
        const anioPorDefecto = anioActualAbierto ?? aniosAbiertos[0] ?? anios[0];
        this.anioLectivoId = anioPorDefecto?.id ?? 0;
        this.cargarEstadoGlobalMatriculas();
        this.cargarSecciones();
      },
      error: () => this.error.set('No se pudieron cargar los años lectivos.')
    });
  }

  private cargarEstadoGlobalMatriculas(): void {
    const aniosAbiertos = this.anios().filter(a => a.abierto);
    const fuenteAnios = aniosAbiertos.length ? aniosAbiertos : this.anios();
    if (fuenteAnios.length && typeof this.matriculaService.listarPorAnio === 'function') {
      forkJoin(
        fuenteAnios.map(a => this.matriculaService.listarPorAnio(a.id).pipe(catchError(() => of([] as MatriculaResponseDto[]))))
      ).subscribe({
        next: listas => {
          const conSeccion = new Set<number>();
          for (const lista of listas) {
            for (const m of (lista ?? [])) {
              if (m.seccionId && m.estadoMatricula !== 'CANCELADA' && m.estadoMatricula !== 'PENDIENTE_ASIGNACION') {
                conSeccion.add(m.estudianteId);
              }
            }
          }
          this.estudiantesConSeccionAsignada.set(conSeccion);
        },
        error: () => {}
      });
    }

    this.matriculaPublicaService?.listarAdmin?.().subscribe({
      next: solicitudes => {
        if (!Array.isArray(solicitudes)) return;
        this.solicitudesPublicasPendientes.set(
          solicitudes.filter(s => s.estado === 'PAGO_CONFIRMADO_PENDIENTE_ASIGNACION' && s.estudianteId != null)
        );
        if (this.mostrarSolicitud() && this.solicitudPendienteSeleccionada()) {
          this.sincronizarSelectoresAsignar();
        }
      },
      error: () => {}
    });
  }

  private cargarAulasEstado(): void {
    this.academicoService.listarAulas?.().subscribe({
      next: aulas => {
        if (!Array.isArray(aulas)) return;
        const inactivas = new Set(
          aulas
            .filter(a => a.activa === false && a.codigo)
            .map(a => a.codigo.trim().toUpperCase())
        );
        this.aulasInactivasCodigos.set(inactivas);
      },
      error: () => {}
    });
  }

  cargarCatalogoGrados(): void {
    this.academicoService.listarNiveles?.().subscribe({
      next: niveles => {
        if (Array.isArray(niveles) && niveles.length) {
          this.nivelesCatalogo.set(niveles);
        }
      },
      error: () => {}
    });
    const acumulados: Array<{ id: number; nombre: string; nivelId: number }> = [];
    [1, 2, 3].forEach(nivelId => {
      this.academicoService.listarGrados(nivelId).subscribe({
        next: grados => {
          grados.forEach(g => {
            this.gradosMap.set(g.id, g.nombre);
            if (!acumulados.some(x => x.id === g.id)) {
              acumulados.push({ id: g.id, nombre: g.nombre, nivelId: (g as any).nivelId ?? nivelId });
            }
          });
          this.catalogoGradosPresencial.set([...acumulados]);
        }
      });
    });
  }

  cargarEstudiantes(): void {
    this.error.set(null);
    this.cargandoEstudiantes.set(true);
    this.matriculaService.listarEstudiantes().subscribe({
      next: (estudiantes) => {
        this.cargandoEstudiantes.set(false);
        const registros = estudiantes || [];
        this.estudiantesPorId = new Map(registros.map(estudiante => [estudiante.id, estudiante]));
        this.listaEstudiantes.set(registros);
        this.paginaPadron = 0;
      },
      error: () => {
        this.cargandoEstudiantes.set(false);
        this.listaEstudiantes.set([]);
        this.error.set('No se pudieron cargar los estudiantes.');
      }
    });
  }

  cargarSecciones(preservarSeleccion = false, preservarFiltrosAsignar = false): void {
    if (!this.anioLectivoId) return;
    const anioConsultado = this.anioLectivoId;
    this.cargarEstudiantesMatriculados(anioConsultado);
    const seccionSeleccionada = this.seccionIdSeleccionada;
    this.academicoService.listarSecciones(anioConsultado).subscribe({
      next: secciones => {
        if (anioConsultado !== this.anioLectivoId) return;
        this.secciones.set(secciones);
        this.filtroSeccionId = preservarSeleccion && secciones.some(s => s.id === this.filtroSeccionId)
          ? this.filtroSeccionId
          : 0;
        this.filtroGradoId = preservarSeleccion ? this.filtroGradoId : 0;
        this.filtroSeccionLetra = preservarSeleccion ? this.filtroSeccionLetra : 'TODAS';
        if (preservarFiltrosAsignar) {
          this.sincronizarSelectoresAsignar();
        } else {
          const seccionConservada = preservarSeleccion
            ? secciones.find(s => s.id === seccionSeleccionada && this.tieneVacantesDisponibles(s))
            : undefined;
          const primeraDisponible = secciones.find(s => this.tieneVacantesDisponibles(s));
          this.seccionIdSeleccionada = seccionConservada?.id ?? primeraDisponible?.id ?? 0;
        }
        this.cargarMatriculas();
      },
      error: () => this.error.set('No se pudieron cargar las secciones.')
    });
  }

  private cargarEstudiantesMatriculados(anioLectivoId: number): void {
    const solicitud = ++this.solicitudMatriculasAnio;
    this.cargandoMatriculasAnio.set(true);
    this.matriculasAnioVerificadas.set(false);
    this.errorCargaMatriculasAnio.set(false);
    this.matriculaService.listarEstudianteIdsMatriculados(anioLectivoId).subscribe({
      next: ids => {
        if (solicitud !== this.solicitudMatriculasAnio) return;
        this.estudiantesMatriculadosPorAnio.set(new Set(ids ?? []));
        this.matriculasAnioVerificadas.set(true);
        this.cargandoMatriculasAnio.set(false);
      },
      error: () => {
        if (solicitud !== this.solicitudMatriculasAnio) return;
        this.estudiantesMatriculadosPorAnio.set(new Set());
        this.errorCargaMatriculasAnio.set(true);
        this.cargandoMatriculasAnio.set(false);
        this.error.set('No se pudo verificar qué estudiantes ya tienen matrícula en este año.');
      }
    });
  }

  cargarMatriculas(): void {
    const revision = ++this.revisionCargaMatriculas;
    this.error.set(null);
    this.paginaMatriculas = 0;
    if (this.estudiantes().length === 0) { this.cargando.set(true); }
    this.matriculaService.listarPorAnio(this.anioLectivoId).subscribe({
      next: res => { if (revision === this.revisionCargaMatriculas) this.actualizarMatriculas(res); },
      error: () => {
        if (revision !== this.revisionCargaMatriculas) return;
        this.cargando.set(false);
        this.estudiantes.set([]);
        this.error.set('No se pudieron cargar las matrículas del año lectivo.');
      }
    });
  }

  private actualizarMatriculas(res: MatriculaResponseDto[] | null): void {
    this.cargando.set(false);
    const seccionesMap = new Map(this.secciones().map(s => [s.id, s]));
    const conSeccionAsignada = (res ?? []).filter(m =>
      Boolean(m.seccionId) && m.estadoMatricula !== 'PENDIENTE_ASIGNACION'
    );
    this.estudiantes.set(conSeccionAsignada.map(m => {
      const seccion = seccionesMap.get(m.seccionId);
      const gradoNombre = seccion ? (this.gradosMap.get(seccion.gradoId) ?? `Grado ${seccion.gradoId}`) : '';
      const seccionLetra = seccion ? seccion.letra : '';
      const seccionNombre = seccion ? `${gradoNombre} - Sección ${seccionLetra}` : (m.seccionId ? `Sección ${m.seccionId}` : '—');
      return {
        id: m.id,
        codigoMatricula: `MAT-${this.anios().find(a => a.id === m.anioLectivoId)?.anio ?? m.anioLectivoId}-${String(m.id).padStart(3, '0')}`,
        estudianteId: m.estudianteId,
        seccionId: m.seccionId,
        gradoId: seccion?.gradoId ?? 0,
        gradoNombre,
        seccionLetra,
        seccionNombre,
        estado: m.estadoMatricula,
        estadoPagoMatricula: m.estadoPagoMatricula,
        fechaMatricula: m.fechaMatricula ? String(m.fechaMatricula).split('T')[0] : '-',
        observaciones: m.observaciones,
        modalidadIngreso: m.modalidadIngreso,
        colegioProcedencia: m.colegioProcedencia
      };
    }));
  }

  confirmarMatricula(matriculaId: number): void {
    const matricula = this.estudiantes().find(est => est.id === matriculaId);
    if (matricula && matricula.estadoPagoMatricula !== 'PAGADO') {
      this.error.set(this.siguientePasoPago(matricula.estadoPagoMatricula));
      return;
    }
    this.confirmandoMatricula.set(matriculaId);
    this.error.set(null);
    this.mensajeExito.set(null);
    this.matriculaService.confirmarMatricula(matriculaId).subscribe({
      next: matricula => {
        this.confirmandoMatricula.set(null);
        this.mensajeExito.set(`Matrícula #${matricula.id} confirmada; el pago fue validado.`);
        this.cargarMatriculas();
        this.cargarSecciones(true);
      },
      error: err => {
        this.confirmandoMatricula.set(null);
        this.error.set(err?.error?.message ?? 'No se pudo confirmar. Verifica el pago de la cuota de matrícula.');
      }
    });
  }

  etiquetaEstadoPago(estado: EstadoPagoMatricula): string {
    const etiquetas: Record<EstadoPagoMatricula, string> = {
      PAGADO: 'Pagado',
      PARCIAL: 'En espera de pago',
      PENDIENTE: 'En espera de pago',
      SIN_OBLIGACION: 'En espera de pago'
    };
    return etiquetas[estado] ?? 'No disponible';
  }

  siguientePasoPago(estado: EstadoPagoMatricula): string {
    const siguientes: Record<EstadoPagoMatricula, string> = {
      PAGADO: 'Pago validado; disponible para confirmar',
      PARCIAL: 'Completar el pago en Tesorería',
      PENDIENTE: 'Pendiente de pago en Tesorería',
      SIN_OBLIGACION: 'En espera de pago en Tesorería'
    };
    return siguientes[estado] ?? 'Verificar el estado del pago en Tesorería';
  }

  esEstadoGestionable(estado: string): boolean {
    return estado === 'MATRICULADO' || estado === 'RESERVADA_TEMPORAL' || estado === 'SOLICITADA';
  }

  textoAccionEstado(estado: string): string {
    return estado === 'MATRICULADO' ? 'Registrar traslado o retiro' : 'Cancelar solicitud';
  }

  opcionesCambioEstado(): { estado: EstadoTerminalMatricula; etiqueta: string }[] {
    const estado = this.matriculaSeleccionadaEstado()?.estado;
    if (estado === 'MATRICULADO') {
      return [
        { estado: 'TRASLADADO', etiqueta: 'Trasladado a otra institución' },
        { estado: 'RETIRADO', etiqueta: 'Retiro del estudiante' }
      ];
    }
    return estado === 'SOLICITADA' || estado === 'RESERVADA_TEMPORAL'
      ? [{ estado: 'CANCELADA', etiqueta: 'Solicitud cancelada' }]
      : [];
  }

  abrirDialogCambioEstado(matricula: EstudianteMatriculadoItem): void {
    if (!this.auth.hasRole('SECRETARIA') && !this.auth.hasRole('ADMINISTRADOR')) return;
    this.matriculaSeleccionadaEstado.set(matricula);
    this.estadoDestino = this.opcionesCambioEstado()[0]?.estado ?? 'CANCELADA';
    this.motivoCambioEstado = '';
    this.estadoDialogRef = this.dialog.open(this.estadoDialog, {
      width: '560px',
      maxWidth: 'calc(100vw - 24px)',
      panelClass: 'school-dialog',
      autoFocus: 'dialog',
      restoreFocus: true
    });
    this.estadoDialogRef.afterClosed().subscribe(() => {
      this.matriculaSeleccionadaEstado.set(null);
      this.motivoCambioEstado = '';
    });
  }

  cerrarDialogCambioEstado(): void {
    this.estadoDialogRef?.close();
  }

  guardarCambioEstado(): void {
    const seleccionada = this.matriculaSeleccionadaEstado();
    const motivo = this.motivoCambioEstado.trim();
    if (!seleccionada || !motivo || this.guardandoCambioEstado()) return;
    this.guardandoCambioEstado.set(true);
    this.error.set(null);
    this.matriculaService.cambiarEstado(seleccionada.id, { estado: this.estadoDestino, motivo }).subscribe({
      next: matricula => {
        this.guardandoCambioEstado.set(false);
        this.estadoDialogRef?.close();
        this.mensajeExito.set(`Matrícula #${matricula.id}: ${this.estadoFicha(matricula.estadoMatricula)}. Motivo registrado en auditoría.`);
        this.cargarMatriculas();
        this.cargarSecciones(true);
      },
      error: err => {
        this.guardandoCambioEstado.set(false);
        this.error.set(err?.error?.message ?? 'No se pudo actualizar el estado de la matrícula.');
      }
    });
  }

  abrirModalNuevoAlumno(): void {
    if (!this.authStore.hasRole('SECRETARIA') && !this.authStore.hasRole('DIRECCION') && !this.authStore.hasRole('ADMINISTRADOR')) return;
    this.error.set(null);
    this.mensajeExito.set(null);
    this.nuevoAlumno = {
      tipoDocumento: 'DNI',
      numeroDocumento: '',
      nombres: '',
      apellidoPaterno: '',
      apellidoMaterno: '',
      fechaNacimiento: '2012-05-15',
      genero: 'M',
      grupoSanguineo: 'O+',
      alergiasCondiciones: ''
    };
    this.mostrarModalNuevoAlumno.set(true);
    this.alumnoDialogRef = this.dialog.open(this.nuevoAlumnoDialog, {
      width: '900px',
      maxWidth: 'calc(100vw - 24px)',
      panelClass: 'school-dialog',
      autoFocus: 'dialog',
      restoreFocus: true
    });
    this.alumnoDialogRef.afterClosed().subscribe(() => this.mostrarModalNuevoAlumno.set(false));
  }

  cerrarModalNuevoAlumno(): void {
    this.mostrarModalNuevoAlumno.set(false);
    this.alumnoDialogRef?.close();
  }

  consultarDni(): void {
    const dni = this.nuevoAlumno.numeroDocumento.trim();
    if (this.nuevoAlumno.tipoDocumento !== 'DNI' || !/^[0-9]{8}$/.test(dni)) {
      this.error.set('Ingrese un DNI de ocho dígitos para consultar.');
      return;
    }
    this.error.set(null);
    this.consultandoDni.set(true);
    this.matriculaService.consultarDni(dni).subscribe({
      next: identidad => {
        this.consultandoDni.set(false);
        if (this.nuevoAlumno.numeroDocumento.trim() !== dni) return;
        this.nuevoAlumno.nombres = identidad.nombres;
        this.nuevoAlumno.apellidoPaterno = identidad.apellidoPaterno;
        this.nuevoAlumno.apellidoMaterno = identidad.apellidoMaterno;
      },
      error: () => {
        this.consultandoDni.set(false);
        this.error.set('No se pudo consultar el DNI. Puede completar los datos manualmente.');
      }
    });
  }

  guardarEstudiante(): void {
    if (!this.authStore.hasRole('SECRETARIA') && !this.authStore.hasRole('DIRECCION') && !this.authStore.hasRole('ADMINISTRADOR')) return;
    if (!this.nuevoAlumno.numeroDocumento || !this.nuevoAlumno.nombres || !this.nuevoAlumno.apellidoPaterno || !this.nuevoAlumno.apellidoMaterno || !this.nuevoAlumno.fechaNacimiento) {
      this.error.set('Por favor complete todos los campos obligatorios del estudiante.');
      return;
    }

    this.guardandoAlumno.set(true);
    this.error.set(null);

    this.matriculaService.registrarEstudiante(this.nuevoAlumno).subscribe({
      next: (estudianteCreado) => {
        this.guardandoAlumno.set(false);
        this.cerrarModalNuevoAlumno();
        this.mensajeExito.set(
          `¡Estudiante ${estudianteCreado.nombres} ${estudianteCreado.apellidoPaterno} registrado exitosamente con ID #${estudianteCreado.id}!`
        );
        this.pestanaActiva.set('estudiantes');
        this.cargarEstudiantes();
      },
      error: (err) => {
        this.guardandoAlumno.set(false);
        const backendMsg = err?.error?.message ?? err?.error?.error ?? 'Error al registrar el estudiante en la base de datos.';
        this.error.set(backendMsg);
      }
    });
  }

  prepararMatriculaParaEstudiante(est: EstudianteResponseDto): void {
    this.error.set(null);
    const sol = this.solicitudPendienteDeEstudiante(est.id);
    if (!sol && this.estaMatriculadoConSeccion(est.id)) {
      this.error.set('Este estudiante ya tiene matrícula registrada con sección asignada.');
      return;
    }
    this.nuevoEstudianteId = est.id;
    this.abrirDialogoSolicitud();
  }

  abrirDialogoVinculoApoderado(estudiante: EstudianteResponseDto): void {
    this.estudianteParaVinculo.set(estudiante);
    this.apoderadoIdSeleccionado = 0;
    this.parentescoApoderado = 'PADRE';
    this.esResponsableEconomico = true;
    this.tieneCustodia = false;
    this.permiteRecojo = true;
    this.errorVinculoApoderado.set(null);
    this.apoderadosDisponibles.set([]);
    this.cargandoApoderados.set(true);
    this.vinculoApoderadoDialogRef = this.dialog.open(this.vinculoApoderadoDialog, {
      width: '600px',
      maxWidth: 'calc(100vw - 24px)',
      panelClass: 'school-dialog',
      autoFocus: 'dialog',
      restoreFocus: true
    });
    this.vinculoApoderadoDialogRef.afterClosed().subscribe(() => this.estudianteParaVinculo.set(null));
    this.matriculaService.listarApoderados().subscribe({
      next: apoderados => {
        this.cargandoApoderados.set(false);
        this.apoderadosDisponibles.set(apoderados);
        if (!apoderados.length) this.errorVinculoApoderado.set('No hay apoderados registrados para vincular.');
      },
      error: err => {
        this.cargandoApoderados.set(false);
        this.errorVinculoApoderado.set(err?.error?.message ?? 'No se pudo cargar el catálogo de apoderados.');
      }
    });
  }

  cerrarDialogoVinculoApoderado(): void {
    this.vinculoApoderadoDialogRef?.close();
  }

  guardarVinculoApoderado(): void {
    const estudiante = this.estudianteParaVinculo();
    if (!estudiante || !this.apoderadoIdSeleccionado) {
      this.errorVinculoApoderado.set('Seleccione un apoderado para vincular.');
      return;
    }
    this.guardandoVinculoApoderado.set(true);
    this.errorVinculoApoderado.set(null);
    this.matriculaService.vincularApoderado({
      estudianteId: estudiante.id,
      apoderadoId: this.apoderadoIdSeleccionado,
      parentesco: this.parentescoApoderado,
      esResponsableEconomico: this.esResponsableEconomico,
      tieneCustodia: this.tieneCustodia,
      permiteRecojo: this.permiteRecojo
    }).subscribe({
      next: () => {
        this.guardandoVinculoApoderado.set(false);
        this.vinculoApoderadoDialogRef?.close();
        this.mensajeExito.set('Apoderado vinculado al estudiante.');
      },
      error: err => {
        this.guardandoVinculoApoderado.set(false);
        this.errorVinculoApoderado.set(err?.error?.message ?? 'No se pudo vincular el apoderado.');
      }
    });
  }

  abrirModalNuevaMatricula(): void {
    this.nuevoEstudianteId = 0;
    this.asignarNivelId = null;
    this.asignarGradoId = null;
    this.seccionIdSeleccionada = 0;
    this.abrirDialogoSolicitud();
  }

  aniosAdmision(): AnioLectivoResponseDto[] {
    const hoy = fechaActualEnPeru();
    const anioMinimo = hoy >= '2026-11-09' ? Math.max(2027, Number(hoy.slice(0, 4))) : 0;
    const filtrados = this.anios().filter(a => a.abierto && a.anio >= anioMinimo)
      .sort((a, b) => a.anio - b.anio);
    return filtrados.length ? filtrados : this.anios().filter(a => a.abierto).sort((a, b) => a.anio - b.anio);
  }

  private abrirDialogoSolicitud(): void {
    this.error.set(null);
    this.cargarAulasEstado();
    this.cargarEstadoGlobalMatriculas();
    const sol = this.solicitudPendienteSeleccionada();
    const anios = this.aniosAdmision();
    if (sol) {
      this.anioLectivoId = sol.anioLectivoId;
      this.asignarNivelId = this.nivelIdDeGrado(sol.gradoId);
      this.asignarGradoId = sol.gradoId;
      this.seccionIdSeleccionada = 0;
      this.cargarSecciones(false, true);
    } else if (!anios.some(a => a.id === this.anioLectivoId)) {
      this.anioLectivoId = anios[0]?.id ?? 0;
      this.asignarNivelId = null;
      this.asignarGradoId = null;
      this.seccionIdSeleccionada = 0;
      this.cargarSecciones(false, true);
    } else if (!this.secciones().length || this.secciones()[0]?.anioLectivoId !== this.anioLectivoId) {
      this.cargarSecciones(false, true);
    } else {
      this.sincronizarSelectoresAsignar();
    }
    this.mostrarSolicitud.set(true);
    this.solicitudDialogRef = this.dialog.open(this.solicitudDialog, {
      width: '600px',
      maxWidth: 'calc(100vw - 24px)',
      panelClass: 'school-dialog',
      autoFocus: 'dialog',
      restoreFocus: true
    });
    this.solicitudDialogRef.afterClosed().subscribe(() => this.mostrarSolicitud.set(false));
  }

  cerrarSolicitudDialog(): void {
    this.mostrarSolicitud.set(false);
    this.solicitudDialogRef?.close();
  }

  solicitar(): void {
    if (!this.authStore.hasRole('SECRETARIA') && !this.authStore.hasRole('DIRECCION') && !this.authStore.hasRole('ADMINISTRADOR')) return;
    if (!this.anioLectivoId || !this.seccionIdSeleccionada || !this.nuevoEstudianteId) {
      this.error.set('Complete año, nivel, grado, sección y seleccione un estudiante registrado.');
      return;
    }
    const seccionSel = this.secciones().find(s => s.id === this.seccionIdSeleccionada);
    if (seccionSel && !this.esAulaSeccionActiva(seccionSel)) {
      this.error.set('El aula asignada a la sección seleccionada se encuentra inhabilitada. Elige otra sección disponible.');
      return;
    }
    if (seccionSel && (seccionSel.cupoMaximo ?? 0) <= (seccionSel.vacantesOcupadas ?? 0)) {
      this.error.set('La sección seleccionada está llena (sin vacantes disponibles). No se puede asignar matrícula a un aula con cupo completo.');
      return;
    }

    const solPendiente = this.solicitudPendienteSeleccionada();
    if (solPendiente && this.matriculaPublicaService) {
      this.guardando.set(true);
      this.error.set(null);
      this.matriculaPublicaService.asignarSeccion(solPendiente.id, this.seccionIdSeleccionada).subscribe({
        next: updated => {
          this.guardando.set(false);
          this.cerrarSolicitudDialog();
          this.mensajeExito.set(`¡Sección asignada y matrícula confirmada para ${updated.nombreEstudiante}!`);
          this.anioLectivoId = solPendiente.anioLectivoId;
          this.nuevoEstudianteId = 0;
          this.asignarNivelId = null;
          this.asignarGradoId = null;
          this.nuevasObservaciones = '';
          this.pestanaActiva.set('matriculas');
          this.cargarEstadoGlobalMatriculas();
          this.cargarEstudiantes();
          this.cargarSecciones(true);
        },
        error: err => {
          this.guardando.set(false);
          this.error.set(err?.error?.message ?? 'No se pudo asignar la sección a la solicitud.');
        }
      });
      return;
    }

    if (!this.matriculasAnioVerificadas() || this.cargandoMatriculasAnio()) {
      this.error.set('Espera a que termine la verificación de matrículas del año.');
      return;
    }
    if (this.estaMatriculadoEnAnio(this.nuevoEstudianteId)) {
      this.error.set('Este estudiante ya tiene matrícula en el año seleccionado. Revisa la matrícula existente.');
      return;
    }
    this.guardando.set(true);
    this.error.set(null);
    this.matriculaService.solicitarMatricula({
      anioLectivoId: this.anioLectivoId,
      seccionId: this.seccionIdSeleccionada,
      estudianteId: this.nuevoEstudianteId,
      observaciones: this.nuevasObservaciones
    }).subscribe({
      next: (m) => {
        this.guardando.set(false);
        this.cerrarSolicitudDialog();
        this.mensajeExito.set(`¡Matrícula #${m.id} solicitada exitosamente para ${this.nombreEstudiante(m.estudianteId)}!`);
        this.nuevoEstudianteId = 0;
        this.asignarNivelId = null;
        this.asignarGradoId = null;
        this.nuevasObservaciones = '';
        this.pestanaActiva.set('matriculas');
        this.cargarEstadoGlobalMatriculas();
        this.cargarSecciones(true);
      },
      error: err => {
        this.guardando.set(false);
        this.error.set(err?.error?.message ?? 'No se pudo solicitar la matrícula.');
      }
    });
  }

  codigoFicha(ficha: FichaMatriculaResponseDto): string {
    const anio = this.anios().find(item => item.id === ficha.matricula.anioLectivoId)?.anio ?? ficha.matricula.anioLectivoId;
    return `MAT-${anio}-${String(ficha.matricula.id).padStart(3, '0')}`;
  }

  codigoInterno(estudianteId: number): string {
    return `ALU-${String(estudianteId).padStart(6, '0')}`;
  }

  codigoEstudianteVisible(estudiante: EstudianteResponseDto): string {
    return estudiante.codigoEstudianteSiagie || estudiante.codigoInterno || this.codigoInterno(estudiante.id);
  }

  estadoIdentidad(identidad: { validadoReniec?: boolean }): string {
    return identidad.validadoReniec
      ? 'Coincidencia confirmada en consulta de identidad'
      : 'Datos de identidad registrados';
  }

  estadoPagoFicha(ficha: FichaMatriculaResponseDto): string {
    const estados = {
      PAGADO: 'Pagado',
      PARCIAL: 'En espera de pago',
      PENDIENTE: 'En espera de pago',
      SIN_OBLIGACION: 'En espera de pago'
    } as const;
    return estados[ficha.estadoPagoMatricula] ?? 'Estado de pago no disponible';
  }

  parentescoLabel(parentesco: FichaMatriculaResponseDto['apoderados'][number]['parentesco']): string {
    const etiquetas = {
      PADRE: 'Padre', MADRE: 'Madre', TUTOR_LEGAL: 'Tutor legal', ABUELO_A: 'Abuelo/a', OTRO: 'Otro'
    } as const;
    return parentesco ? etiquetas[parentesco] : 'No especificado';
  }

  observacionesFicha(ficha: FichaMatriculaResponseDto): string {
    const observaciones = ficha.matricula.observaciones?.trim();
    if (!observaciones) return 'Sin observaciones registradas';
    const normalizadas = observaciones.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().trim();
    let fin = normalizadas.length;
    while (fin > 0 && '.!;:,'.includes(normalizadas[fin - 1])) fin--;
    const marcador = normalizadas.slice(0, fin).trim();
    return ['pendiente de pago', 'pago pendiente', 'matricula pendiente de pago', 'pendiente de pago de matricula'].includes(marcador)
      ? 'Sin observaciones registradas'
      : observaciones;
  }

  anioDeFicha(ficha: FichaMatriculaResponseDto): string {
    return String(this.anios().find(item => item.id === ficha.matricula.anioLectivoId)?.anio ?? ficha.matricula.anioLectivoId);
  }

  seccionDeFicha(ficha: FichaMatriculaResponseDto): string {
    const seccion = this.secciones().find(item => item.id === ficha.matricula.seccionId);
    if (!seccion) return `Sección ID ${ficha.matricula.seccionId}`;
    return `${this.gradosMap.get(seccion.gradoId) ?? `Grado ${seccion.gradoId}`} · Sección ${seccion.letra}`;
  }

  aulaDeFicha(ficha: FichaMatriculaResponseDto): string {
    return this.secciones().find(item => item.id === ficha.matricula.seccionId)?.aulaFisica || 'Pendiente de asignación';
  }

  estadoFicha(estado: string): string {
    const etiquetas: Record<string, string> = {
      SOLICITADA: 'Solicitud registrada',
      RESERVADA_TEMPORAL: 'Vacante reservada',
      PENDIENTE_ASIGNACION: 'Pendiente de aula',
      MATRICULADO: 'Matrícula confirmada',
      TRASLADADO: 'Trasladado',
      RETIRADO: 'Retirado',
      CANCELADA: 'Cancelada'
    };
    return etiquetas[estado] ?? estado;
  }

  exportarFichaPdf(): void {
    const ficha = this.ficha();
    if (!ficha) return;

    const ventana = window.open('', '_blank', 'width=900,height=850');
    if (!ventana) {
      this.error.set('Permite ventanas emergentes para exportar la ficha a PDF.');
      return;
    }

    const seguro = (valor: unknown): string => String(valor ?? 'No registrado').replace(/[&<>"']/g, caracter => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[caracter] ?? caracter);
    const estudiante = ficha.estudiante;
    const codigo = this.codigoFicha(ficha);
    const apoderados = ficha.apoderados.map(vinculo => `
      <section class="panel"><h2>Apoderado registrado</h2><div class="grid">
        <div class="wide"><label>Apellidos y nombres</label><strong>${seguro(`${vinculo.apoderado.apellidoPaterno} ${vinculo.apoderado.apellidoMaterno}, ${vinculo.apoderado.nombres}`)}</strong></div>
        <div><label>Documento</label><strong>${seguro(vinculo.apoderado.tipoDocumento || 'DNI')} ${seguro(vinculo.apoderado.numeroDocumento)}</strong></div>
        <div><label>Parentesco</label><strong>${seguro(this.parentescoLabel(vinculo.parentesco))}</strong></div>
        <div><label>Responsabilidad económica</label><strong>${vinculo.esResponsableEconomico ? 'Responsable de pago' : 'No responsable de pago'}</strong></div>
        <div><label>Celular</label><strong>${seguro(vinculo.apoderado.celular)}</strong></div>
        <div><label>Correo</label><strong>${seguro(vinculo.apoderado.email)}</strong></div>
        <div class="wide"><label>Dirección</label><strong>${seguro(vinculo.apoderado.direccion)}</strong></div>
      </div></section>`).join('');
    const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${seguro(codigo)}</title>
      <style>
        @page{size:A4;margin:16mm}*{box-sizing:border-box}body{margin:0;color:#172b4d;font:12px Arial,sans-serif}
        header{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #c6a15b;padding:0 0 14px;margin-bottom:18px}
        .brand{font-size:12px;font-weight:800;letter-spacing:.12em;color:#a27a35}.subtitle{margin-top:5px;color:#64748b;font-size:11px}
        h1{margin:7px 0 0;font-size:24px;color:#14213d}.code{text-align:right;font-size:11px;color:#718096}.code strong{display:block;margin-top:6px;font:700 17px monospace;color:#14213d}
        .status{display:inline-block;margin:0 0 16px;padding:6px 10px;border:1px solid #d7e1ef;border-radius:20px;background:#f4f7fb;font-size:10px;font-weight:bold}
        .panel{margin:0 0 14px;border:1px solid #dbe3ed;border-radius:8px;padding:12px 14px;break-inside:avoid}h2{margin:0 0 11px;padding-left:9px;border-left:3px solid #c6a15b;font-size:13px;color:#14213d}
        .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 18px}.wide{grid-column:1/-1}label{display:block;margin-bottom:3px;color:#718096;font-size:9px;font-weight:bold;text-transform:uppercase;letter-spacing:.04em}strong{font-size:11px;font-weight:600;line-height:1.4;overflow-wrap:anywhere}
        .signatures{display:grid;grid-template-columns:1fr 1fr;gap:42px;margin:38px 14px 18px;text-align:center}.signature{border-top:1px solid #718096;padding-top:7px;color:#475569;font-size:10px}footer{border-top:1px solid #dbe3ed;padding-top:8px;text-align:center;color:#94a3b8;font-size:9px}
      </style></head><body>
      <header><div><div class="brand">I.E.P. SHUJI KITAMURA</div><h1>Ficha de matrícula</h1><div class="subtitle">Registro académico del estudiante</div></div><div class="code">Código de matrícula<strong>${seguro(codigo)}</strong></div></header>
      <div class="status">${seguro(this.estadoFicha(ficha.matricula.estadoMatricula))}</div>
      <section class="panel"><h2>Identificación del estudiante</h2><div class="grid">
        <div class="wide"><label>Apellidos y nombres</label><strong>${seguro(`${estudiante.apellidoPaterno} ${estudiante.apellidoMaterno}, ${estudiante.nombres}`)}</strong></div>
        <div><label>Documento</label><strong>${seguro(estudiante.tipoDocumento || 'DNI')} ${seguro(estudiante.numeroDocumento)}</strong></div>
        <div><label>Fecha de nacimiento</label><strong>${seguro(estudiante.fechaNacimiento)}</strong></div>
        <div><label>Género</label><strong>${seguro(estudiante.genero === 'F' ? 'Femenino' : estudiante.genero === 'M' ? 'Masculino' : 'No registrado')}</strong></div>
        <div><label>Código de estudiante</label><strong>${seguro(this.codigoEstudianteVisible(estudiante))}</strong></div>
        <div><label>Estado de identidad</label><strong>${seguro(this.estadoIdentidad(estudiante))}</strong></div>
        <div><label>Grupo sanguíneo</label><strong>${seguro(estudiante.grupoSanguineo)}</strong></div>
      </div></section>
      <section class="panel"><h2>Datos de matrícula</h2><div class="grid">
        <div><label>Año lectivo</label><strong>${seguro(this.anioDeFicha(ficha))}</strong></div>
        <div><label>Grado y sección</label><strong>${seguro(this.seccionDeFicha(ficha))}</strong></div>
        <div><label>Aula</label><strong>${seguro(this.aulaDeFicha(ficha))}</strong></div>
        <div><label>Fecha de registro</label><strong>${seguro(ficha.matricula.fechaMatricula)}</strong></div>
        <div><label>Pago de matrícula</label><strong>${seguro(this.estadoPagoFicha(ficha))}</strong></div>
        <div class="wide"><label>Observaciones</label><strong>${seguro(this.observacionesFicha(ficha))}</strong></div>
      </div></section>
      ${apoderados || '<section class="panel"><h2>Apoderados</h2><strong>No hay apoderados asociados en el registro.</strong></section>'}
      <div class="signatures"><div class="signature">Firma del apoderado</div><div class="signature">Secretaría académica</div></div>
      <footer>Documento informativo generado desde el registro institucional. No reemplaza constancias oficiales.</footer>
      </body></html>`;

    ventana.document.open();
    ventana.document.write(html);
    ventana.document.close();
    ventana.document.title = codigo;
    ventana.focus();
    window.setTimeout(() => ventana.print(), 250);
  }

  verFicha(matriculaId: number): void {
    this.matriculaService.consultarFicha(matriculaId).subscribe({
      next: (ficha) => {
        this.ficha.set(ficha);
        this.fichaDialogRef = this.dialog.open(this.fichaDialog, {
          width: '920px',
          maxWidth: 'calc(100vw - 24px)',
          panelClass: 'school-dialog',
          autoFocus: 'dialog',
          restoreFocus: true
        });
        this.fichaDialogRef.afterClosed().subscribe(() => this.ficha.set(null));
      },
      error: () => {
        this.error.set('No se pudo recuperar la ficha de la matrícula ID: ' + matriculaId);
      }
    });
  }

  cerrarFichaDialog(): void {
    this.ficha.set(null);
    this.fichaDialogRef?.close();
  }

  abrirModalCorregirDniEstudiante(est: EstudianteResponseDto): void {
    this.estudianteSeleccionadoDni.set(est);
    this.nuevoDniEstudiante = '';
    this.motivoDniEstudiante = '';
    this.reniecEstudianteMensaje.set('');
    this.corregirDniEstudianteDialogRef = this.dialog.open(this.corregirDniEstudianteDialog, {
      width: '480px',
      maxWidth: 'calc(100vw - 24px)',
      panelClass: 'school-dialog'
    });
  }

  consultarReniecEstudiante(): void {
    const dni = this.nuevoDniEstudiante.trim();
    if (dni.length !== 8) return;
    this.consultandoReniecEstudiante.set(true);
    this.reniecEstudianteMensaje.set('');
    this.matriculaService.consultarReniecPersona(dni).subscribe({
      next: (persona) => {
        this.consultandoReniecEstudiante.set(false);
        const nom = [persona.nombres, persona.apellidoPaterno, persona.apellidoMaterno].filter(Boolean).join(' ');
        this.reniecEstudianteMensaje.set(nom ? `RENIEC: ${nom}` : 'DNI verificado');
      },
      error: () => {
        this.consultandoReniecEstudiante.set(false);
        this.reniecEstudianteMensaje.set('Consulta no disponible');
      }
    });
  }

  confirmarCorregirDniEstudiante(): void {
    const est = this.estudianteSeleccionadoDni();
    if (!est || this.guardandoDniEstudiante()) return;
    this.guardandoDniEstudiante.set(true);
    this.matriculaService.corregirDniEstudiante(est.id, {
      nuevoDni: this.nuevoDniEstudiante.trim(),
      motivo: this.motivoDniEstudiante.trim()
    }).subscribe({
      next: () => {
        this.guardandoDniEstudiante.set(false);
        this.listaEstudiantes.update(lista => lista.map(e => e.id === est.id ? { ...e, numeroDocumento: this.nuevoDniEstudiante.trim() } : e));
        this.mensajeExito.set('DNI del estudiante corregido exitosamente.');
        this.corregirDniEstudianteDialogRef?.close();
      },
      error: (err) => {
        this.guardandoDniEstudiante.set(false);
        this.error.set(err?.error?.message || 'No se pudo corregir el DNI del estudiante.');
      }
    });
  }

  abrirModalEstadoEstudiante(est: EstudianteResponseDto): void {
    this.estudianteSeleccionadoEstado.set(est);
    this.estadoEstudianteDestino = (est as any).estado || 'ACTIVO';
    this.motivoEstadoEstudiante = '';
    this.estadoEstudianteDialogRef = this.dialog.open(this.estadoEstudianteDialog, {
      width: '480px',
      maxWidth: 'calc(100vw - 24px)',
      panelClass: 'school-dialog'
    });
  }

  confirmarEstadoEstudiante(): void {
    const est = this.estudianteSeleccionadoEstado();
    if (!est || this.guardandoEstadoEstudiante()) return;
    this.guardandoEstadoEstudiante.set(true);
    this.matriculaService.cambiarEstadoEstudiante(est.id, {
      estado: this.estadoEstudianteDestino,
      motivo: this.motivoEstadoEstudiante.trim()
    }).subscribe({
      next: () => {
        this.guardandoEstadoEstudiante.set(false);
        this.mensajeExito.set(`Estado del estudiante actualizado a ${this.estadoEstudianteDestino} (borrado lógico formal).`);
        this.estadoEstudianteDialogRef?.close();
      },
      error: (err) => {
        this.guardandoEstadoEstudiante.set(false);
        this.error.set(err?.error?.message || 'No se pudo cambiar el estado del estudiante.');
      }
    });
  }

  abrirModalCorregirDniApoderado(apo: ApoderadoResponseDto): void {
    this.apoderadoSeleccionadoDni.set(apo);
    this.nuevoDniApoderado = '';
    this.motivoDniApoderado = '';
    this.reniecApoderadoMensaje.set('');
    this.corregirDniApoderadoDialogRef = this.dialog.open(this.corregirDniApoderadoDialog, {
      width: '480px',
      maxWidth: 'calc(100vw - 24px)',
      panelClass: 'school-dialog'
    });
  }

  consultarReniecApoderado(): void {
    const dni = this.nuevoDniApoderado.trim();
    if (dni.length !== 8) return;
    this.consultandoReniecApoderado.set(true);
    this.reniecApoderadoMensaje.set('');
    this.matriculaService.consultarReniecPersona(dni).subscribe({
      next: (persona) => {
        this.consultandoReniecApoderado.set(false);
        const nom = [persona.nombres, persona.apellidoPaterno, persona.apellidoMaterno].filter(Boolean).join(' ');
        this.reniecApoderadoMensaje.set(nom ? `RENIEC: ${nom}` : 'DNI verificado');
      },
      error: () => {
        this.consultandoReniecApoderado.set(false);
        this.reniecApoderadoMensaje.set('Consulta no disponible');
      }
    });
  }

  confirmarCorregirDniApoderado(): void {
    const apo = this.apoderadoSeleccionadoDni();
    if (!apo || this.guardandoDniApoderado()) return;
    this.guardandoDniApoderado.set(true);
    this.matriculaService.corregirDniApoderado(apo.id, {
      nuevoDni: this.nuevoDniApoderado.trim(),
      motivo: this.motivoDniApoderado.trim()
    }).subscribe({
      next: () => {
        this.guardandoDniApoderado.set(false);
        this.mensajeExito.set('DNI del apoderado corregido exitosamente.');
        this.corregirDniApoderadoDialogRef?.close();
      },
      error: (err) => {
        this.guardandoDniApoderado.set(false);
        this.error.set(err?.error?.message || 'No se pudo corregir el DNI del apoderado.');
      }
    });
  }

  ordenarGradosPresencial(grados: Array<{ id: number; nombre: string; nivelId: number }>): Array<{ id: number; nombre: string; nivelId: number }> {
    const nivelPeso = (nivelId: number, nombre: string): number => {
      const n = (nombre || '').toUpperCase();
      if (nivelId === 1 || n.includes('INICIAL') || n.includes('ANITOS') || n.includes('AÑITOS')) return 100;
      if (nivelId === 2 || n.includes('PRIMARIA')) return 200;
      if (nivelId === 3 || n.includes('SECUNDARIA')) return 300;
      return 400;
    };
    const extraerNumero = (gradoNombre: string): number => {
      const g = (gradoNombre || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (g.includes('tres') || g.includes('3 an')) return 3;
      if (g.includes('cuatro') || g.includes('4 an')) return 4;
      if (g.includes('cinco') || g.includes('5 an')) return 5;
      if (g.includes('primer') || g.includes('1er') || g.includes('1ro') || g.includes('1°')) return 1;
      if (g.includes('segund') || g.includes('2do') || g.includes('2°')) return 2;
      if (g.includes('tercer') || g.includes('3er') || g.includes('3ro') || g.includes('3°')) return 3;
      if (g.includes('cuart') || g.includes('4to') || g.includes('4°')) return 4;
      if (g.includes('quint') || g.includes('5to') || g.includes('5°')) return 5;
      if (g.includes('sext') || g.includes('6to') || g.includes('6°')) return 6;
      const match = g.match(/\d+/);
      return match ? parseInt(match[0], 10) : 0;
    };
    return [...grados].sort((a, b) => {
      const pesoA = nivelPeso(a.nivelId, a.nombre);
      const pesoB = nivelPeso(b.nivelId, b.nombre);
      if (pesoA !== pesoB) return pesoA - pesoB;
      const numA = extraerNumero(a.nombre);
      const numB = extraerNumero(b.nombre);
      if (numA !== numB) return numA - numB;
      return a.nombre.localeCompare(b.nombre, 'es', { numeric: true });
    });
  }

  listaNivelesPresencial(): NivelResponseDto[] {
    const secs = this.seccionesPresencial().filter(s => this.tieneVacantesDisponibles(s));
    const nivelesDisponibles = new Set<number>(secs.map(s => s.nivelId));
    return this.nivelesCatalogo().filter(n => nivelesDisponibles.has(n.id));
  }

  listaGradosPresencial(): Array<{ id: number; nombre: string; nivelId: number }> {
    const secs = this.seccionesPresencial();
    // Excluir grados cuyas aulas estén completamente llenas, inactivas o solo correspondan a sección D
    const gradosConVacantes = new Set<number>(
      secs.filter(s => this.tieneVacantesDisponibles(s)).map(s => s.gradoId)
    );
    const filtroNivel = this.presencialNivelId;
    const disponibles = this.catalogoGradosPresencial().filter(
      g => gradosConVacantes.has(g.id) && (!filtroNivel || g.nivelId === filtroNivel)
    );
    if (disponibles.length > 0) {
      return this.ordenarGradosPresencial(disponibles);
    }
    const idsVistos = new Set<number>();
    const grados: Array<{ id: number; nombre: string; nivelId: number }> = [];
    for (const s of secs) {
      const nivelSeccion = s.nivelId ?? 1;
      if (this.tieneVacantesDisponibles(s) && (!filtroNivel || nivelSeccion === filtroNivel) && !idsVistos.has(s.gradoId)) {
        idsVistos.add(s.gradoId);
        grados.push({
          id: s.gradoId,
          nombre: this.gradosMap.get(s.gradoId) ?? ('Grado ' + s.gradoId),
          nivelId: nivelSeccion
        });
      }
    }
    return this.ordenarGradosPresencial(grados);
  }

  seccionesFiltradasPresencial(): SeccionResponseDto[] {
    const secs = this.seccionesPresencial();
    if (!this.presencialGradoId) return [];
    return secs
      .filter(s => s.gradoId === this.presencialGradoId && this.tieneVacantesDisponibles(s))
      .sort((a, b) => a.letra.localeCompare(b.letra));
  }

  alCambiarNivelPresencial(): void {
    const disponibles = this.listaGradosPresencial();
    if (!disponibles.some(g => g.id === this.presencialGradoId)) {
      this.presencialGradoId = null;
      this.presencialSeccionId = null;
    } else {
      this.alCambiarGradoPresencial();
    }
  }

  alCambiarGradoPresencial(): void {
    const disponibles = this.seccionesFiltradasPresencial();
    if (!disponibles.some(s => s.id === this.presencialSeccionId)) {
      this.presencialSeccionId = disponibles[0]?.id ?? null;
    }
  }

  actualizarSeccionesPresencial(): void {
    if (!this.presencialAnioId) {
      this.seccionesPresencial.set([]);
      this.presencialNivelId = null;
      this.presencialGradoId = null;
      this.presencialSeccionId = null;
      return;
    }
    this.academicoService.listarSecciones(this.presencialAnioId).subscribe({
      next: (secs) => {
        const registros = secs || [];
        this.seccionesPresencial.set(registros);
        const disponiblesNiveles = this.listaNivelesPresencial();
        if (this.presencialNivelId && !disponiblesNiveles.some(n => n.id === this.presencialNivelId)) {
          this.presencialNivelId = null;
          this.presencialGradoId = null;
          this.presencialSeccionId = null;
          return;
        }
        const disponiblesGrados = this.listaGradosPresencial();
        if (this.presencialGradoId && !disponiblesGrados.some(g => g.id === this.presencialGradoId)) {
          this.presencialGradoId = null;
          this.presencialSeccionId = null;
        } else if (this.presencialGradoId) {
          const seccionesConVacante = this.seccionesFiltradasPresencial();
          if (!seccionesConVacante.some(s => s.id === this.presencialSeccionId)) {
            this.presencialSeccionId = seccionesConVacante[0]?.id ?? null;
          }
        }
      },
      error: () => this.seccionesPresencial.set([])
    });
  }

  obtenerPreviewFotoPresencial(): string {
    if (this.presencialFotoBase64()) return this.presencialFotoBase64()!;
    return obtenerFotoEstudiante({
      numeroDocumento: this.presencialDniEstudiante,
      genero: this.presencialGeneroEstudiante,
      nombres: this.presencialNombresEstudiante
    });
  }

  obtenerNombreSeccionResumen(): string {
    const sec = this.seccionesPresencial().find(s => s.id === this.presencialSeccionId);
    if (!sec) return 'No seleccionada';
    const nombreGrado = this.gradosMap.get(sec.gradoId) ?? ('Grado ' + sec.gradoId);
    return nombreGrado + ' - Sección ' + sec.letra;
  }

  obtenerAnioPresencialTexto(): string {
    const anio = this.anios().find(a => a.id === this.presencialAnioId);
    return anio ? String(anio.anio) : this.anioActivoTexto();
  }

  abrirModalMatriculaPresencial(): void {
    this.etapaPresencial.set(1);
    this.errorPresencial.set(null);
    this.resultadoPresencial.set(null);
    this.presencialMetodoPago = 'EFECTIVO';
    this.presencialModalidadIngreso = 'REGULAR';
    this.presencialColegioProcedencia = '';
    this.presencialArchivos = { partida: null, dni: null, recibo: null, foto: null, certificadoEstudios: null };
    this.presencialFotoBase64.set(null);
    this.presencialMontoEfectivo.set(null);
    this.presencialConstancia.set(null);
    this.presencialConstanciaPreview.set(null);
    this.presencialPagoEnLinea.set(null);
    this.presencialEstadoPago.set(null);

    this.cargarAulasEstado();
    this.presencialAnioId = this.aniosAdmision()[0]?.id ?? null;
    this.presencialNivelId = null;
    this.presencialGradoId = null;
    this.presencialSeccionId = null;

    this.actualizarSeccionesPresencial();

    this.matriculaPresencialDialogRef = this.dialog.open(this.matriculaPresencialDialog, {
      width: '980px',
      maxWidth: 'calc(100vw - 32px)',
      maxHeight: '94vh',
      panelClass: 'school-dialog',
      disableClose: true,
      ariaLabelledBy: 'matricula-presencial-titulo'
    });
  }

  cerrarModalMatriculaPresencial(): void {
    this.matriculaPresencialDialogRef?.close();
    if (this.resultadoPresencial() || this.presencialEstadoPago()?.estado === 'MATRICULADA') {
      if (this.presencialAnioId) {
        this.anioLectivoId = this.presencialAnioId;
      }
      this.pestanaActiva.set('matriculas');
      this.cargarEstudiantes();
      this.cargarEstadoGlobalMatriculas();
      if (this.anioLectivoId) {
        this.cargarSecciones(true);
      }
    }
  }

  retrocederEtapaPresencial(): void {
    const actual = this.etapaPresencial();
    if (actual > 1 && actual < 4) {
      this.errorPresencial.set(null);
      this.etapaPresencial.set((actual - 1) as 1 | 2 | 3);
    }
  }

  consultarDniPresencial(tipo: 'estudiante' | 'apoderado'): void {
    const dni = (tipo === 'estudiante' ? this.presencialDniEstudiante : this.presencialDniApoderado).trim();
    if (dni.length !== 8) {
      this.errorPresencial.set('El DNI debe tener exactamente 8 dígitos.');
      return;
    }
    this.errorPresencial.set(null);
    const loadingSignal = tipo === 'estudiante' ? this.consultandoDniPresencialEstudiante : this.consultandoDniPresencialApoderado;
    loadingSignal.set(true);

    this.matriculaService.consultarReniecPersona(dni).subscribe({
      next: (persona) => {
        loadingSignal.set(false);
        if (tipo === 'estudiante') {
          if (persona.nombres) this.presencialNombresEstudiante = persona.nombres;
          if (persona.apellidoPaterno) this.presencialApePaternoEstudiante = persona.apellidoPaterno;
          if (persona.apellidoMaterno) this.presencialApeMaternoEstudiante = persona.apellidoMaterno;
        } else {
          if (persona.nombres) this.presencialNombresApoderado = persona.nombres;
          if (persona.apellidoPaterno) this.presencialApePaternoApoderado = persona.apellidoPaterno;
          if (persona.apellidoMaterno) this.presencialApeMaternoApoderado = persona.apellidoMaterno;
        }
      },
      error: () => {
        loadingSignal.set(false);
      }
    });
  }

  avanzarAPaso2Presencial(): void {
    this.errorPresencial.set(null);

    if (!this.presencialAnioId) {
      this.errorPresencial.set('Debe seleccionar el año lectivo.');
      return;
    }
    if (!this.presencialGradoId) {
      this.errorPresencial.set('Debe seleccionar el grado escolar.');
      return;
    }
    if (!this.presencialSeccionId) {
      this.errorPresencial.set('Debe seleccionar la sección de destino.');
      return;
    }
    const seccionSel = this.seccionesPresencial().find(s => s.id === this.presencialSeccionId);
    if (seccionSel && !this.esAulaSeccionActiva(seccionSel)) {
      this.errorPresencial.set('El aula seleccionada se encuentra inhabilitada. Elige otra sección disponible.');
      return;
    }
    if (seccionSel && (seccionSel.cupoMaximo ?? 0) <= (seccionSel.vacantesOcupadas ?? 0)) {
      this.errorPresencial.set('El aula seleccionada se encuentra llena (sin vacantes disponibles). No se puede matricular en una sección sin cupo.');
      return;
    }

    const dniEst = this.presencialDniEstudiante.trim();
    const nomEst = this.presencialNombresEstudiante.trim();
    const apePatEst = this.presencialApePaternoEstudiante.trim();
    const apeMatEst = this.presencialApeMaternoEstudiante.trim();

    if (!esDniValido(dniEst)) {
      this.errorPresencial.set('El DNI del estudiante debe contener exactamente 8 dígitos numéricos.');
      return;
    }
    if (!esNombreValido(nomEst)) {
      this.errorPresencial.set('Revisa los nombres del estudiante.');
      return;
    }
    if (!esNombreValido(apePatEst)) {
      this.errorPresencial.set('Revisa el apellido paterno del estudiante.');
      return;
    }
    if (!esNombreValido(apeMatEst)) {
      this.errorPresencial.set('Revisa el apellido materno del estudiante.');
      return;
    }
    if (!this.presencialNacimientoEstudiante) {
      this.errorPresencial.set('Debe registrar la fecha de nacimiento del estudiante.');
      return;
    }

    const dniApo = this.presencialDniApoderado.trim();
    const nomApo = this.presencialNombresApoderado.trim();
    const apePatApo = this.presencialApePaternoApoderado.trim();
    const apeMatApo = this.presencialApeMaternoApoderado.trim();
    const celApo = this.presencialCelularApoderado.trim();
    const emailApo = this.presencialEmailApoderado.trim();
    const dirApo = this.presencialDireccionApoderado.trim();

    if (!esDniValido(dniApo)) {
      this.errorPresencial.set('El DNI del apoderado debe contener exactamente 8 dígitos numéricos.');
      return;
    }
    if (!esNombreValido(nomApo)) {
      this.errorPresencial.set('Revisa los nombres del apoderado.');
      return;
    }
    if (!esNombreValido(apePatApo)) {
      this.errorPresencial.set('Revisa el apellido paterno del apoderado.');
      return;
    }
    if (!esNombreValido(apeMatApo)) {
      this.errorPresencial.set('Revisa el apellido materno del apoderado.');
      return;
    }
    if (!esCelularValido(celApo) || !celApo.startsWith('9')) {
      this.errorPresencial.set('El celular del apoderado debe tener 9 dígitos y empezar por 9.');
      return;
    }
    if (!esEmailValido(emailApo)) {
      this.errorPresencial.set('Revisa el correo electrónico del apoderado.');
      return;
    }
    if (!dirApo || dirApo.length < 5 || !esDireccionValida(dirApo)) {
      this.errorPresencial.set('Revisa la dirección de domicilio del apoderado.');
      return;
    }
    if (this.presencialModalidadIngreso === 'TRASLADO' && this.presencialColegioProcedencia.trim().length < 3) {
      this.errorPresencial.set('En matrículas por traslado debe registrar el colegio de procedencia.');
      return;
    }
    if (!this.presencialArchivos.foto && !this.presencialFotoBase64()) {
      this.errorPresencial.set('Debe adjuntar la fotografía oficial del estudiante antes de continuar.');
      return;
    }

    this.etapaPresencial.set(2);
  }

  seleccionarArchivoPresencial(tipo: 'partida' | 'dni' | 'recibo' | 'foto' | 'certificadoEstudios', event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      this.errorPresencial.set('El archivo no debe exceder 5 MB.');
      input.value = '';
      return;
    }

    if (tipo === 'foto') {
      if (!file.type.startsWith('image/')) {
        this.errorPresencial.set('La fotografía debe ser una imagen válida (JPG, PNG o WebP).');
        input.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        this.presencialFotoBase64.set(dataUrl);
        if (this.presencialDniEstudiante && this.presencialDniEstudiante.length === 8) {
          guardarFotoEstudiante(this.presencialDniEstudiante.trim(), dataUrl);
        }
      };
      reader.readAsDataURL(file);
    }

    this.errorPresencial.set(null);
    this.presencialArchivos[tipo] = file;
  }

  avanzarAPaso3Presencial(): void {
    this.errorPresencial.set(null);
    if (!this.presencialArchivos.partida) {
      this.errorPresencial.set('Debe adjuntar la partida de nacimiento como evidencia.');
      return;
    }
    if (!this.presencialArchivos.dni) {
      this.errorPresencial.set('Debe adjuntar el DNI del estudiante como evidencia.');
      return;
    }
    if (!this.presencialArchivos.recibo) {
      this.errorPresencial.set('Debe adjuntar el recibo de luz o agua como evidencia.');
      return;
    }
    if (this.presencialModalidadIngreso === 'TRASLADO' && !this.presencialArchivos.certificadoEstudios) {
      this.errorPresencial.set('Debe adjuntar el certificado oficial de estudios o libreta de notas para traslado.');
      return;
    }
    this.etapaPresencial.set(3);
    this.cargarTarifaPresencial();
  }

  cargarTarifaPresencial(): void {
    if (this.cargandoTarifaPresencial()) return;
    this.errorPresencial.set(null);
    this.presencialMontoEfectivo.set(null);
    this.cargandoTarifaPresencial.set(true);
    this.matriculaService.importeEfectivoPresencial().subscribe({
      next: importe => {
        this.presencialMontoEfectivo.set(importe);
        this.cargandoTarifaPresencial.set(false);
      },
      error: () => {
        this.errorPresencial.set('No se pudo cargar el importe de la matrícula.');
        this.cargandoTarifaPresencial.set(false);
      }
    });
  }

  confirmarMatriculaPresencial(): void {
    this.errorPresencial.set(null);
    if (this.guardandoPresencial()) return;
    const enEfectivo = this.presencialMetodoPago === 'EFECTIVO';
    const constancia = this.presencialConstancia();
    const importe = this.presencialMontoEfectivo();
    if (enEfectivo && !importe) {
      this.errorPresencial.set('Carga el importe de la matrícula antes de confirmar el pago.');
      return;
    }
    const seccionConfirmar = this.seccionesPresencial().find(s => s.id === this.presencialSeccionId);
    if (seccionConfirmar && !this.esAulaSeccionActiva(seccionConfirmar)) {
      this.errorPresencial.set('El aula seleccionada se encuentra inhabilitada. No se puede registrar la matrícula.');
      return;
    }
    if (seccionConfirmar && (seccionConfirmar.cupoMaximo ?? 0) <= (seccionConfirmar.vacantesOcupadas ?? 0)) {
      this.errorPresencial.set('El aula seleccionada se encuentra llena (sin vacantes disponibles). No se puede registrar la matrícula.');
      return;
    }
    this.guardandoPresencial.set(true);

    const fd = new FormData();
    fd.append('anioLectivoId', String(this.presencialAnioId));
    fd.append('gradoId', String(this.presencialGradoId));
    fd.append('seccionId', String(this.presencialSeccionId));
    fd.append('modalidadIngreso', this.presencialModalidadIngreso);
    if (this.presencialModalidadIngreso === 'TRASLADO' && this.presencialColegioProcedencia.trim()) {
      fd.append('colegioProcedencia', this.presencialColegioProcedencia.trim());
    }

    fd.append('numeroDocumentoEstudiante', this.presencialDniEstudiante.trim());
    fd.append('nombresEstudiante', this.presencialNombresEstudiante.trim());
    fd.append('apellidoPaternoEstudiante', this.presencialApePaternoEstudiante.trim());
    fd.append('apellidoMaternoEstudiante', this.presencialApeMaternoEstudiante.trim());
    fd.append('fechaNacimientoEstudiante', this.presencialNacimientoEstudiante);
    fd.append('generoEstudiante', this.presencialGeneroEstudiante);

    fd.append('numeroDocumentoApoderado', this.presencialDniApoderado.trim());
    fd.append('nombresApoderado', this.presencialNombresApoderado.trim());
    fd.append('apellidoPaternoApoderado', this.presencialApePaternoApoderado.trim());
    fd.append('apellidoMaternoApoderado', this.presencialApeMaternoApoderado.trim());
    fd.append('parentesco', this.presencialParentesco);
    fd.append('celularApoderado', this.presencialCelularApoderado.trim());
    fd.append('emailApoderado', this.presencialEmailApoderado.trim());
    fd.append('direccionApoderado', this.presencialDireccionApoderado.trim());

    if (enEfectivo) {
      fd.append('montoEfectivo', String(importe));
      if (constancia) {
        fd.append('constanciaPago', constancia);
      }
    }
    if (this.presencialObservaciones.trim()) {
      fd.append('observaciones', this.presencialObservaciones.trim());
    }

    if (this.presencialArchivos.partida) {
      fd.append('partida', this.presencialArchivos.partida);
    }
    if (this.presencialArchivos.dni) {
      fd.append('dni', this.presencialArchivos.dni);
    }
    if (this.presencialArchivos.recibo) {
      fd.append('recibo', this.presencialArchivos.recibo);
    }
    if (this.presencialFotoBase64() && this.presencialDniEstudiante.trim()) {
      guardarFotoEstudiante(this.presencialDniEstudiante.trim(), this.presencialFotoBase64()!);
    }
    if (this.presencialArchivos.foto) {
      fd.append('foto', this.presencialArchivos.foto);
    }
    if (this.presencialModalidadIngreso === 'TRASLADO' && this.presencialArchivos.certificadoEstudios) {
      fd.append('certificadoEstudios', this.presencialArchivos.certificadoEstudios);
    }

    if (!enEfectivo) {
      this.matriculaService.iniciarPagoPresencialEnLinea(fd).subscribe({
        next: pago => {
          this.guardandoPresencial.set(false);
          this.presencialPagoEnLinea.set(pago);
          this.etapaPresencial.set(4);
        },
        error: err => {
          this.guardandoPresencial.set(false);
          this.errorPresencial.set(err?.error?.detail || err?.error?.message || 'No se pudo preparar el pago en línea.');
        }
      });
      return;
    }
    this.matriculaService.registrarPresencial(fd).subscribe({
      next: (resp) => {
        this.guardandoPresencial.set(false);
        this.resultadoPresencial.set(resp);
        if (resp.estudianteId && this.presencialFotoBase64()) {
          guardarFotoEstudiante(resp.estudianteId, this.presencialFotoBase64()!);
        }
        this.etapaPresencial.set(4);
        this.mensajeExito.set(resp.mensaje);
        if (this.presencialAnioId) {
          this.anioLectivoId = this.presencialAnioId;
        }
        this.cargarEstudiantes();
        this.cargarEstadoGlobalMatriculas();
        if (this.anioLectivoId) {
          this.cargarSecciones(true);
        }
      },
      error: (err) => {
        this.guardandoPresencial.set(false);
        const errores: Record<string, string> | undefined = err?.error?.validationErrors;
        const detalle = errores ? Object.values(errores).join('. ') : null;
        this.errorPresencial.set(detalle || err?.error?.detail || err?.error?.message || 'No se pudo registrar el pago en efectivo.');
      }
    });
  }

  seleccionarConstanciaPresencial(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];
    if (!archivo) return;
    this.presencialConstancia.set(null);
    this.presencialConstanciaPreview.set(null);
    this.errorPresencial.set(null);
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(archivo.type) || archivo.size > 5 * 1024 * 1024 || !archivo.size) {
      this.errorPresencial.set('Elige una imagen JPG, PNG o WebP de hasta 5 MB.');
      input.value = '';
      return;
    }
    this.presencialConstancia.set(archivo);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        this.presencialConstanciaPreview.set(reader.result);
      }
    };
    reader.readAsDataURL(archivo);
  }

  quitarConstanciaPresencial(): void {
    this.presencialConstancia.set(null);
    this.presencialConstanciaPreview.set(null);
    const input = document.getElementById('presencial-constancia') as HTMLInputElement | null;
    if (input) input.value = '';
  }

  simularPagoPresencial(evento: PagoSimuladoEvent): void {
    const pago = this.presencialPagoEnLinea();
    if (!pago || this.guardandoPresencial()) return;
    this.errorPresencial.set(null);
    this.guardandoPresencial.set(true);
    this.matriculaService.simularPagoPresencialEnLinea(
      pago.solicitudId, evento.metodoPago, evento.referenciaOperacion
    ).subscribe({
      next: estado => {
        this.presencialEstadoPago.set(estado);
        this.guardandoPresencial.set(false);
        this.mensajeExito.set('Pago en línea confirmado y matrícula registrada.');
        if (this.presencialAnioId) {
          this.anioLectivoId = this.presencialAnioId;
        }
        this.cargarEstudiantes();
        this.cargarEstadoGlobalMatriculas();
        if (this.anioLectivoId) {
          this.cargarSecciones(true);
        }
      },
      error: err => {
        this.errorPresencial.set(err?.error?.detail || err?.error?.message || 'No se pudo procesar el pago simulado.');
        this.guardandoPresencial.set(false);
      }
    });
  }

  actualizarEstadoPagoPresencial(): void {
    const pago = this.presencialPagoEnLinea();
    if (!pago || this.guardandoPresencial() || this.presencialEstadoPago()?.comprobanteCodigo) return;
    this.errorPresencial.set(null);
    this.guardandoPresencial.set(true);
    this.matriculaService.estadoPagoPresencial(pago.solicitudId).subscribe({
      next: estado => {
        this.presencialEstadoPago.set(estado);
        this.guardandoPresencial.set(false);
        if (estado.estado === 'MATRICULADA') {
          if (this.presencialAnioId) {
            this.anioLectivoId = this.presencialAnioId;
          }
          this.cargarEstudiantes();
          this.cargarEstadoGlobalMatriculas();
          if (this.anioLectivoId) {
            this.cargarSecciones(true);
          }
        }
      },
      error: () => {
        this.errorPresencial.set('No se pudo consultar el estado del pago. Intenta de nuevo.');
        this.guardandoPresencial.set(false);
      }
    });
  }

  descargarVoucherPresencial(): void {
    const res = this.resultadoPresencial();
    if (!res || !res.voucherPdfBase64) return;

    const byteCharacters = atob(res.voucherPdfBase64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Constancia_Matricula_' + (res.comprobanteCodigo || 'B001') + '.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }


  obtenerTamanoArchivo(file: File | null): string {
    if (!file) return '';
    const kb = file.size / 1024;
    if (kb < 1024) {
      return kb.toFixed(1) + ' KB';
    }
    return (kb / 1024).toFixed(2) + ' MB';
  }

  quitarArchivoPresencial(tipo: 'partida' | 'dni' | 'recibo' | 'foto' | 'certificadoEstudios', event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.presencialArchivos[tipo] = null;
    if (tipo === 'foto') {
      this.presencialFotoBase64.set(null);
    }
  }

}
