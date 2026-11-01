import { Component, inject, signal, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { RouterLink } from '@angular/router';
import { MatriculaService } from '../../core/services/matricula.service';
import {
  FichaMatriculaResponseDto,
  MatriculaResponseDto,
  EstudianteResponseDto,
  RegistrarEstudianteRequestDto,
  TipoDocumento,
  Genero
} from '../../core/models/matricula.model';
import { AcademicoService } from '../../core/services/academico.service';
import { AnioLectivoResponseDto, SeccionResponseDto } from '../../core/models/academico.model';
import { UiDatePePipe } from '../../shared/ui/ui-date-pe.pipe';
import { AuthStore } from '../../core/state/auth.store';

export interface EstudianteMatriculadoItem {
  id: number;
  codigoMatricula: string;
  estudianteId: number;
  estado: string;
  fechaMatricula: string;
  observaciones?: string;
}

@Component({
  selector: 'app-matriculas',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatPaginatorModule, RouterLink, UiDatePePipe],
  template: `
    <div class="space-y-6 min-w-0 text-[#172b4d] max-[640px]:text-[13px] [&_*:focus-visible]:outline-[3px] [&_*:focus-visible]:outline-[#2864c5] [&_*:focus-visible]:outline-offset-[3px]">
      <!-- Top Banner / Alert -->
      @if (mensajeExito()) {
        <div class="p-4 rounded-2xl border-t-[3px] border-t-[#c49a58]/50 pt-3 bg-emerald-500/10 border border-emerald-500/30 text-[#047857] flex items-center justify-between shadow-lg shadow-emerald-950/20">
          <div class="flex items-center gap-3">
            <span class="p-1.5 rounded-lg bg-emerald-500/20 text-[#047857]">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </span>
            <div>
              <p class="font-bold text-sm text-[#047857]">Operación Exitosa</p>
              <p class="!text-[11px] text-[#047857]">{{ mensajeExito() }}</p>
            </div>
          </div>
          <button (click)="mensajeExito.set(null)" class="text-[#047857] hover:text-[#065f46] cursor-pointer !text-[11px] font-semibold px-2 py-1 max-[640px]:w-full box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]">
            ✕
          </button>
        </div>
      }

      @if (error()) {
        <div class="p-4 rounded-2xl border-t-[3px] border-t-[#c49a58]/50 pt-3 bg-rose-500/10 border border-rose-500/30 text-[#be123c] flex items-center justify-between shadow-lg shadow-rose-950/20">
          <div class="flex items-center gap-3">
            <span class="p-1.5 rounded-lg bg-rose-500/20 text-[#be123c]">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </span>
            <div>
              <p class="font-bold text-sm text-[#be123c]">Error</p>
              <p class="!text-[11px] text-[#be123c]">{{ error() }}</p>
            </div>
          </div>
          <button (click)="error.set(null)" class="text-[#be123c] hover:text-[#9f1239] cursor-pointer !text-[11px] font-semibold px-2 py-1 max-[640px]:w-full box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]">
            ✕
          </button>
        </div>
      }

      <!-- Page Header -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-t-[3px] border-t-[#c49a58]/50 pt-3">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/10 text-[#2563eb] border border-blue-500/20">
              Módulo Académico
            </span>
            <span class="!text-[11px] !text-[#59677a]">•</span>
            <span class="!text-[11px] !text-[#59677a] font-medium">Año Lectivo {{ anioActivoTexto() }}</span>
          </div>
          <h2 class="text-2xl sm:text-3xl font-extrabold tracking-tight !text-[#172b4d] tracking-[-.025em]">
            Padrón de Estudiantes & Matrículas
          </h2>
          <p class="text-sm !text-[#59677a] mt-1">
            Gestión centralizada de estudiantes, registro oficial y asignación de vacantes en secciones.
          </p>
        </div>

        <!-- Action Buttons -->
        <div class="flex flex-wrap items-center gap-3">
          @if (auth.hasRole('SECRETARIA')) {
          <button
            id="btn-abrir-registro-alumno"
            (click)="abrirModalNuevoAlumno()"
            class="inline-flex items-center justify-center gap-2 px-4 py-2 border border-[#c49a58] rounded-[10px] bg-[linear-gradient(110deg,#102447_0%,#1d365c_100%)] text-white font-semibold text-sm leading-tight text-center no-underline whitespace-nowrap cursor-pointer transition-colors duration-[140ms] ease-[ease] shadow-[inset_0_-2px_#c49a58] hover:bg-[linear-gradient(110deg,#173156_0%,#284b76_100%)] focus-visible:outline-[3px] focus-visible:outline-[#2864c5] focus-visible:outline-offset-[3px] max-[640px]:w-full box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-[18px] w-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            <span>Registrar Alumno</span>
          </button>

          <button
            id="btn-abrir-nueva-matricula"
            (click)="abrirModalNuevaMatricula()"
            class="inline-flex items-center justify-center gap-2 px-4 py-2 border border-[#e1e8f1] rounded-[10px] bg-white text-[#102447] font-semibold text-sm leading-tight text-center no-underline whitespace-nowrap cursor-pointer transition-colors duration-[140ms] ease-[ease] hover:bg-[#f4f7fb] focus-visible:outline-[3px] focus-visible:outline-[#2864c5] focus-visible:outline-offset-[3px] max-[640px]:w-full box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-[18px] w-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true" focusable="false">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Asignar Matrícula</span>
          </button>
          }
          <a
            routerLink="/admin/solicitudes-matricula"
            class="inline-flex min-h-11 items-center justify-center gap-2 px-4 py-2 border border-[#e1e8f1] rounded-[10px] bg-white text-[#102447] font-semibold text-sm leading-tight text-center no-underline whitespace-nowrap cursor-pointer transition-colors duration-[140ms] ease-[ease] hover:bg-[#f4f7fb] focus-visible:outline-[3px] focus-visible:outline-[#2864c5] focus-visible:outline-offset-[3px] max-[640px]:w-full"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-[18px] w-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true" focusable="false">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M7 4.75h7l4 4V19a1.25 1.25 0 0 1-1.25 1.25h-9.5A1.25 1.25 0 0 1 6 19V6a1.25 1.25 0 0 1 1-1.25Z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M14 5v4h4M9 13h6M9 16h6" />
            </svg>
            <span>Solicitudes públicas</span>
          </a>
        </div>
      </div>

      <!-- Main Navigation Tabs -->
      <div class="flex items-center gap-2 border-b !border-[#e1e8f1]">
        <button
          id="tab-estudiantes"
          (click)="pestanaActiva.set('estudiantes')"
          [class]="pestanaActiva() === 'estudiantes'
            ? 'px-4 py-3 border-b-2 border-blue-500 text-blue-700 font-bold text-sm flex items-center gap-2 transition cursor-pointer'
            : 'px-4 py-3 border-b-2 border-transparent !text-[#59677a] hover:!text-[#34445d] font-medium text-sm flex items-center gap-2 transition cursor-pointer'"
         class="max-[640px]:w-full box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <span>Padrón de Estudiantes</span>
          <span class="px-2 py-0.5 rounded-full !text-[11px] font-mono bg-[#f1f4f9] !text-[#34445d]">
            {{ listaEstudiantes().length }}
          </span>
        </button>

        <button
          id="tab-matriculas"
          (click)="pestanaActiva.set('matriculas'); cargarSecciones(true)"
          [class]="pestanaActiva() === 'matriculas'
            ? 'px-4 py-3 border-b-2 border-blue-500 text-blue-700 font-bold text-sm flex items-center gap-2 transition cursor-pointer'
            : 'px-4 py-3 border-b-2 border-transparent !text-[#59677a] hover:!text-[#34445d] font-medium text-sm flex items-center gap-2 transition cursor-pointer'"
         class="max-[640px]:w-full box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <span>Matrículas por Sección</span>
          <span class="px-2 py-0.5 rounded-full !text-[11px] font-mono bg-[#f1f4f9] !text-[#34445d]">
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
          <div class="p-4 rounded-2xl !bg-white border !border-[#e1e8f1] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div class="w-full sm:w-96 relative">
              <span class="absolute inset-y-0 left-3 z-[1] pl-3.5 flex items-center pointer-events-none !text-[#59677a]">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                id="input-filtro-estudiante" aria-label="Buscar estudiante"
                type="text"
                [(ngModel)]="busquedaEstudiante"
                (ngModelChange)="paginaPadron = 0"
                placeholder="Buscar por DNI, Nombres o Apellidos..."
                class="w-full !pl-11 pr-4 py-2 rounded-xl !bg-white border !border-[#e1e8f1] !text-[#172b4d] !text-[11px] placeholder-slate-500 focus:outline-none focus:border-blue-500 transition min-w-0 !min-h-[44px] max-w-full px-3 py-[10px] !border-[#d9e1ec] transition-colors focus:border-[#5b83d6] focus:shadow-[0_0_0_3px_rgb(59_110_214_/_13%)] max-[639px]:text-base !pr-3 !py-2"
              />
            </div>

            <div class="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button
                (click)="cargarEstudiantes()"
                class="px-3.5 py-2 rounded-xl bg-[#f1f4f9] hover:bg-slate-700 !text-[#34445d] !text-[11px] font-semibold transition cursor-pointer flex items-center gap-2 border !border-[#e1e8f1] max-[640px]:w-full box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 !text-[#59677a]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Actualizar Padrón</span>
              </button>
            </div>
          </div>

          <!-- Students Table -->
          <div class="rounded-2xl !bg-white border !border-[#e1e8f1] overflow-hidden shadow-sm">
            <div class="overflow-x-auto" data-enrollments-table-scroll="">
              <table id="tabla-estudiantes" class="w-full min-w-[1080px] text-left text-xs !text-[11px] [&>thead>tr>th:last-child]:static [&>tbody>tr>td:last-child]:static [&>thead>tr>th:last-child]:shadow-none [&>tbody>tr>td:last-child]:shadow-none [&>thead>tr>th:last-child]:px-3 [&>tbody>tr>td:last-child]:px-3 [&_thead]:!bg-[#f7f9fc] [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:!bg-[#f8faff]" data-mobile-table-cards="">
                <thead class="bg-[#f5f7fb] border-b !border-[#e1e8f1] !text-[#59677a] uppercase tracking-wider font-semibold">
                  <tr>
                    <th class="px-5 py-3.5">Código interno</th>
                    <th class="px-5 py-3.5">Documento</th>
                    <th class="px-5 py-3.5">Apellidos y Nombres</th>
                    <th class="px-5 py-3.5">F. Nacimiento</th>
                    <th class="px-5 py-3.5">Género</th>
                    <th class="px-5 py-3.5">SIAGIE oficial</th>
                    <th class="px-5 py-3.5">Grupo Sang.</th>
                    <th class="px-5 py-3.5">Estado BD</th>
                    <th class="px-5 py-3.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-[#edf0f5] !text-[#34445d]">
                  @if (cargandoEstudiantes()) {
                    <tr>
                      <td colspan="9" class="text-center py-12 !text-[#59677a]">
                        <span class="inline-block w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-2"></span>
                        <p class="font-medium !text-[11px]">Consultando estudiantes registrados en la base de datos...</p>
                      </td>
                    </tr>
                  } @else {
                    @for (est of estudiantesPaginados(); track est.id) {
                      <tr class="!bg-[#f1f4f9] hover:bg-[#f1f4f9] transition group">
                        <td class="px-5 py-3.5 font-mono font-semibold" data-label="Código interno">
                          <span class="text-[#172b4d]">{{ est.codigoInterno || codigoInterno(est.id) }}</span>
                          <span class="ml-1 text-[10px] font-normal text-[#718096]">ID #{{ est.id }}</span>
                        </td>
                        <td class="px-5 py-3.5 font-mono" data-label="Documento">
                          <span class="px-2 py-0.5 rounded !text-[11px] font-bold bg-[#f1f4f9] !text-[#34445d] border !border-[#e1e8f1] mr-1.5">
                            {{ est.tipoDocumento || 'DNI' }}
                          </span>
                          <span class="text-[#2563eb] font-semibold">{{ est.numeroDocumento }}</span>
                        </td>
                        <td class="px-5 py-3.5" data-label="Apellidos y Nombres">
                          <div class="font-semibold !text-[#172b4d]">
                            {{ est.apellidoPaterno }} {{ est.apellidoMaterno }}, {{ est.nombres }}
                          </div>
                          @if (est.alergiasCondiciones) {
                            <div class="!text-[11px] text-[#a16207] truncate max-w-xs mt-0.5">
                              ⚠️ {{ est.alergiasCondiciones }}
                            </div>
                          }
                        </td>
                        <td class="px-5 py-3.5 !text-[#59677a] font-mono" data-label="F. Nacimiento">{{ est.fechaNacimiento | uiDatePe }}</td>
                        <td class="px-5 py-3.5" data-label="Género">
                          @if (est.genero === 'M') {
                            <span class="px-2 py-0.5 rounded-full !text-[11px] font-medium bg-blue-500/10 text-[#2563eb] border border-blue-500/20">
                              Masculino
                            </span>
                          } @else if (est.genero === 'F') {
                            <span class="px-2 py-0.5 rounded-full !text-[11px] font-medium bg-pink-500/10 text-pink-700 border border-pink-500/20">
                              Femenino
                            </span>
                          } @else {
                            <span class="!text-[#59677a]">-</span>
                          }
                        </td>
                        <td class="px-5 py-3.5 font-mono !text-[#59677a]" data-label="SIAGIE oficial">{{ est.codigoEstudianteSiagie || 'Pendiente de asignación' }}</td>
                        <td class="px-5 py-3.5 font-mono !text-[#34445d]" data-label="Grupo Sang.">{{ est.grupoSanguineo || '-' }}</td>
                        <td class="px-5 py-3.5" data-label="Estado BD">
                          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full !text-[11px] font-bold !bg-[#edf9f3] !text-[#126943] border !border-[#b8dfcc]">
                            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            Activo
                          </span>
                        </td>
                        <td class="px-5 py-3.5 text-right" data-label="Acciones">
                          @if (cargandoMatriculasAnio() || !matriculasAnioVerificadas()) {
                            <button type="button" disabled class="inline-flex min-h-10 items-center justify-center rounded-[10px] border border-[#e1e8f1] bg-[#f1f4f9] px-4 text-sm font-semibold text-[#64748b]">
                              {{ cargandoMatriculasAnio() ? 'Verificando...' : 'No disponible' }}
                            </button>
                          } @else if (estaMatriculadoEnAnio(est.id)) {
                            <span class="inline-flex min-h-10 items-center justify-center rounded-[10px] border border-[#b8dfcc] bg-[#edf9f3] px-3 text-xs font-semibold text-[#126943]">
                              Matrícula registrada
                            </span>
                          } @else {
                          <button
                            type="button"
                            (click)="prepararMatriculaParaEstudiante(est)"
                            class="inline-flex min-h-10 w-auto min-w-[104px] items-center justify-center gap-2 px-4 py-2 border border-[#c3d6f5] rounded-[10px] bg-[#eff5ff] text-[#184fae] font-semibold leading-tight text-center no-underline cursor-pointer transition-colors duration-[140ms] ease-[ease] hover:border-[#8fb0e4] hover:bg-[#dce9ff] box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px] !text-[14px] !leading-[1.25]"
                          >
                            Matricular
                          </button>
                          }
                        </td>
                      </tr>
                    } @empty {
                      <tr [hidden]="!!error()">
                        <td colspan="9" class="text-center pt-3 pb-12 !text-[#59677a] space-y-2">
                          <svg aria-hidden="true" focusable="false" viewBox="0 0 48 48" fill="none" stroke="#102447" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="block h-[42px] w-[42px] mx-auto"><path d="M6 11.5c6-2 12-1 18 2.5v25c-6-3.5-12-4.5-18-2.5z"/><path d="M42 11.5c-6-2-12-1-18 2.5v25c6-3.5 12-4.5 18-2.5z"/><path d="M24 14v25" stroke="#C49A58"/><path d="M11 17c3-.5 6 .1 9 1.5M11 23c3-.5 6 .1 9 1.5M28 18.5c3-1.4 6-2 9-1.5M28 24.5c3-1.4 6-2 9-1.5" stroke="#C49A58"/></svg>
                          <p class="font-medium !text-[#59677a]">No se encontraron estudiantes registrados.</p>
                          <p class="text-[11px] !text-[#59677a]">Haz clic en "Registrar Alumno" para dar de alta al primer estudiante en la base de datos.</p>
                        </td>
                      </tr>
                    }
                  }
                </tbody>
              </table>
            </div>
            <mat-paginator
              aria-label="Paginación del padrón de estudiantes"
              [length]="estudiantesFiltradosPadron().length"
              [pageIndex]="paginaPadron"
              [pageSize]="tamanoPaginaPadron"
              [pageSizeOptions]="[10]"
              (page)="cambiarPaginaPadron($event)"
              hidePageSize
              showFirstLastButtons
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
          <div class="p-4 rounded-2xl !bg-white border !border-[#e1e8f1] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label class="block !text-[11px] font-semibold !text-[#59677a] mb-1">Año Lectivo</label>
              <select
                [(ngModel)]="anioLectivoId" aria-label="Año Lectivo"
                (change)="cargarSecciones()"
                class="w-full px-3 py-2 rounded-xl !bg-white border !border-[#e1e8f1] !text-[#172b4d] !text-[11px] focus:outline-none focus:border-blue-500 min-w-0 !min-h-[44px] max-w-full border px-3 py-[10px] !border-[#d9e1ec] rounded-xl !bg-white !text-[#14213d] transition-colors focus:border-[#5b83d6] focus:outline-none focus:shadow-[0_0_0_3px_rgb(59_110_214_/_13%)] max-[639px]:text-base"
              >
                @for (anio of anios(); track anio.id) {
                  <option [ngValue]="anio.id">{{ anio.anio }} {{ anio.abierto ? '(Activo)' : '' }}</option>
                }
              </select>
            </div>

            <div>
              <label class="block !text-[11px] font-semibold !text-[#59677a] mb-1">Sección en BD</label>
              <select
                [(ngModel)]="filtroSeccionId" aria-label="Sección en BD"
                (change)="cargarMatriculas()"
                class="w-full px-3 py-2 rounded-xl !bg-white border !border-[#e1e8f1] !text-[#172b4d] !text-[11px] focus:outline-none focus:border-blue-500 min-w-0 !min-h-[44px] max-w-full border px-3 py-[10px] !border-[#d9e1ec] rounded-xl !bg-white !text-[#14213d] transition-colors focus:border-[#5b83d6] focus:outline-none focus:shadow-[0_0_0_3px_rgb(59_110_214_/_13%)] max-[639px]:text-base"
              >
                <option [ngValue]="0">Todas las secciones</option>
                @for (seccion of secciones(); track seccion.id) {
                  <option [ngValue]="seccion.id">{{ obtenerNombreSeccion(seccion) }}</option>
                }
              </select>
            </div>

            <div>
              <label class="block !text-[11px] font-semibold !text-[#59677a] mb-1">Estado de Matrícula</label>
              <select
                [(ngModel)]="filtroEstado" aria-label="Estado de Matrícula"
                (ngModelChange)="paginaMatriculas = 0"
                class="w-full px-3 py-2 rounded-xl !bg-white border !border-[#e1e8f1] !text-[#172b4d] !text-[11px] focus:outline-none focus:border-blue-500 min-w-0 !min-h-[44px] max-w-full border px-3 py-[10px] !border-[#d9e1ec] rounded-xl !bg-white !text-[#14213d] transition-colors focus:border-[#5b83d6] focus:outline-none focus:shadow-[0_0_0_3px_rgb(59_110_214_/_13%)] max-[639px]:text-base"
              >
                <option value="TODOS">Todos los Estados</option>
                <option value="MATRICULADO">Matriculado</option>
                <option value="RESERVADA_TEMPORAL">Reserva temporal</option>
                <option value="SOLICITADA">Solicitada</option>
                <option value="TRASLADADO">Trasladado</option>
                <option value="RETIRADO">Retirado</option>
                <option value="CANCELADA">Cancelada</option>
              </select>
            </div>

            <div>
              <label class="block !text-[11px] font-semibold !text-[#59677a] mb-1">Buscar matrícula o estudiante</label>
              <input
                type="search"
                [(ngModel)]="busqueda"
                (ngModelChange)="paginaMatriculas = 0"
                aria-label="Buscar por nombre, documento o código de matrícula"
                placeholder="Nombre, DNI o código…"
                class="w-full px-3 py-2 rounded-xl !bg-white border !border-[#e1e8f1] !text-[#172b4d] !text-[11px] focus:outline-none focus:border-blue-500 min-w-0 !min-h-[44px]"
              />
            </div>

            <div class="flex items-end">
              <button
                (click)="cargarMatriculas()"
                class="w-full py-2 px-3 rounded-xl bg-[#f1f4f9] hover:bg-slate-700 !text-[#34445d] !text-[11px] font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 border !border-[#e1e8f1] max-[640px]:w-full box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Consultar BD</span>
              </button>
            </div>
          </div>

          <!-- Matriculas Table -->
          <div class="rounded-2xl !bg-white border !border-[#e1e8f1] overflow-hidden shadow-sm">
            <div class="overflow-x-auto" data-enrollments-table-scroll="">
              <table class="w-full min-w-[1080px] text-left text-xs !text-[11px] [&>thead>tr>th:last-child]:static [&>tbody>tr>td:last-child]:static [&>thead>tr>th:last-child]:shadow-none [&>tbody>tr>td:last-child]:shadow-none [&>thead>tr>th:last-child]:px-3 [&>tbody>tr>td:last-child]:px-3 [&_thead]:!bg-[#f7f9fc] [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:!bg-[#f8faff]" data-mobile-table-cards="">
                <thead class="bg-[#f5f7fb] border-b !border-[#e1e8f1] !text-[#59677a] uppercase tracking-wider font-semibold">
                  <tr>
                    <th class="px-5 py-3.5">ID BD</th>
                    <th class="px-5 py-3.5">Matrícula</th>
                    <th class="px-5 py-3.5">Estudiante</th>
                    <th class="px-5 py-3.5">Fecha Registro</th>
                    <th class="px-5 py-3.5">Estado en BD</th>
                    <th class="px-5 py-3.5">Observaciones</th>
                    <th class="px-5 py-3.5 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-[#edf0f5] !text-[#34445d]">
                  @if (cargando()) {
                    <tr>
                      <td colspan="7" class="text-center py-10 !text-[#59677a]">
                        <span class="inline-block w-5 h-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-2"></span>
                        <p>Consultando matrículas en la base de datos...</p>
                      </td>
                    </tr>
                  } @else {
                    @for (est of estudiantesPaginadosMatriculas(); track est.id) {
                      <tr class="!bg-[#f1f4f9] hover:bg-[#f1f4f9] transition">
                        <td class="px-5 py-3.5 font-mono !text-[#59677a]" data-label="ID BD">#{{ est.id }}</td>
                        <td class="px-5 py-3.5 font-mono text-[#2563eb] font-semibold" data-label="Matrícula">{{ est.codigoMatricula }}</td>
                        <td class="px-5 py-3.5 !text-[#172b4d]" data-label="Estudiante">
                          <div class="font-semibold">{{ nombreEstudiante(est.estudianteId) }}</div>
                          <div class="mt-0.5 font-mono text-[11px] !text-[#59677a]">DNI {{ documentoEstudiante(est.estudianteId) || '—' }}</div>
                        </td>
                        <td class="px-5 py-3.5 !text-[#59677a] font-mono" data-label="Fecha Registro">{{ est.fechaMatricula | uiDatePe }}</td>
                        <td class="px-5 py-3.5" data-label="Estado en BD">
                          <span class="px-2 py-1 rounded-full !text-[11px] font-bold !bg-[#eff5ff] !text-[#184fae] border !border-[#c3d6f5]">
                            {{ est.estado }}
                          </span>
                        </td>
                        <td class="px-5 py-3.5 !text-[#59677a] truncate max-w-xs" data-label="Observaciones">{{ est.observaciones || '-' }}</td>
                        <td class="px-5 py-3.5 text-right" data-label="Acción">
                          @if (est.estado === 'SOLICITADA' || est.estado === 'RESERVADA_TEMPORAL') {
                            <button
                              type="button"
                              (click)="confirmarMatricula(est.id)"
                              [disabled]="confirmandoMatricula() === est.id"
                              class="mr-2 rounded-lg bg-emerald-600 px-3 py-2 font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-wait disabled:opacity-60 max-[640px]:w-full box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]"
                            >
                              {{ confirmandoMatricula() === est.id ? 'Validando pago…' : 'Confirmar matrícula' }}
                            </button>
                          }
                          <button
                            type="button"
                            (click)="verFicha(est.id)"
                            class="rounded-lg bg-[#f1f4f9] px-3 py-2 font-medium !text-[#34445d] transition hover:bg-slate-700 hover:text-white max-[640px]:w-full box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]"
                          >
                            Ver Ficha
                          </button>
                        </td>
                      </tr>
                    } @empty {
                      <tr [hidden]="!!error()">
                        <td colspan="7" class="text-center pt-3 pb-12 !text-[#59677a] space-y-2">
                          <svg aria-hidden="true" focusable="false" viewBox="0 0 48 48" fill="none" stroke="#102447" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="block h-[42px] w-[42px] mx-auto"><path d="M6 11.5c6-2 12-1 18 2.5v25c-6-3.5-12-4.5-18-2.5z"/><path d="M42 11.5c-6-2-12-1-18 2.5v25c6-3.5 12-4.5 18-2.5z"/><path d="M24 14v25" stroke="#C49A58"/><path d="M11 17c3-.5 6 .1 9 1.5M11 23c3-.5 6 .1 9 1.5M28 18.5c3-1.4 6-2 9-1.5M28 24.5c3-1.4 6-2 9-1.5" stroke="#C49A58"/></svg>
                          <p class="font-medium !text-[#59677a]">No se encontraron matrículas en esta sección.</p>
                          <p class="text-[11px] !text-[#59677a]">Los registros generados se sincronizan directamente con PostgreSQL.</p>
                        </td>
                      </tr>
                    }
                  }
                </tbody>
              </table>
            </div>
            <mat-paginator
              aria-label="Paginación de matrículas por sección"
              [length]="estudiantesFiltrados().length"
              [pageIndex]="paginaMatriculas"
              [pageSize]="tamanoPaginaMatriculas"
              [pageSizeOptions]="[10]"
              (page)="cambiarPaginaMatriculas($event)"
              hidePageSize
              showFirstLastButtons
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
            <div class="flex flex-[0_0_auto] items-center justify-between gap-4 border-b border-[#e5eaf2] px-6 py-5 [&_h3]:m-0 [&_h3]:text-[#14213d] [&_h3]:text-lg [&_h3]:leading-[27px] [&_h3]:font-[750] [&_p]:mb-0 [&_p]:mt-1 [&_p]:text-[#64748b] [&_p]:text-xs [&_p]:leading-[1.5] max-[639px]:p-4 flex items-center justify-between border-b !border-[#e1e8f1] pb-4">
              <div class="flex items-center gap-3">
                <div class="p-2.5 rounded-xl bg-blue-600/20 text-[#2563eb] border border-blue-500/30">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
                <div>
                  <h3 class="text-lg leading-tight !leading-[1.25] font-bold !text-[#172b4d] tracking-[-.025em]">Registrar Nuevo Alumno</h3>
                  <p class="text-xs text-[#64748b]">El alumno será dado de alta directamente en la base de datos PostgreSQL.</p>
                </div>
              </div>
              <button
                id="btn-cerrar-modal-alumno"
                (click)="cerrarModalNuevoAlumno()"
                class="grid !h-11 !w-11 !min-h-11 !min-w-11 !shrink-0 place-items-center !p-0 !text-[#59677a] bg-[#f1f4f9] hover:text-white rounded-lg hover:bg-[#f1f4f9] transition cursor-pointer box-border inline-flex min-w-0 min-h-10 items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:min-h-11"
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
                  <label class="block text-xs font-semibold text-[#475569] mb-1">Tipo de Documento *</label>
                  <select
                    id="nuevo-alumno-tipo-doc" aria-label="Tipo de Documento *"
                    [(ngModel)]="nuevoAlumno.tipoDocumento"
                    name="tipoDoc"
                    required
                    class="w-full px-3 py-2.5 rounded-xl bg-[#f5f7fb] border border-[#e5eaf2] !text-[#172b4d] !text-base focus:outline-none focus:border-blue-500 min-w-0 !min-h-[44px] max-w-full border px-3 py-[10px] !border-[#d9e1ec] rounded-xl !bg-white !text-[#14213d] transition-colors focus:border-[#5b83d6] focus:outline-none focus:shadow-[0_0_0_3px_rgb(59_110_214_/_13%)] max-[639px]:text-base"
                  >
                    <option value="DNI">DNI (Perú)</option>
                  </select>
                </div>

                <div class="sm:col-span-2">
                  <label class="block text-xs font-semibold text-[#475569] mb-1">Número de Documento *</label>
                  <div class="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2"><input
                    id="nuevo-alumno-numero-doc" aria-label="Número de Documento *"
                    type="text"
                    [(ngModel)]="nuevoAlumno.numeroDocumento"
                    name="numeroDoc"
                    required
                    maxlength="8"
                    inputmode="numeric"
                    pattern="[0-9]{8}"
                    placeholder="Ej. 74839201"
                    class="min-w-0 flex-1 px-3 py-2.5 rounded-xl bg-[#f5f7fb] border border-[#e5eaf2] !text-[#172b4d] !text-base placeholder-slate-500 focus:outline-none focus:border-blue-500 min-w-0 !min-h-[44px] max-w-full border px-3 py-[10px] !border-[#d9e1ec] rounded-xl !bg-white !text-[#14213d] transition-colors focus:border-[#5b83d6] focus:outline-none focus:shadow-[0_0_0_3px_rgb(59_110_214_/_13%)] max-[639px]:text-base"
                  />
                  <button type="button" (click)="consultarDni()" [disabled]="consultandoDni() || nuevoAlumno.tipoDocumento !== 'DNI'" class="inline-flex items-center justify-center whitespace-nowrap px-2 py-2.5 rounded-xl bg-blue-600 text-white text-xs !text-[14px] font-semibold disabled:opacity-50 box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]">{{ consultandoDni() ? 'Consultando...' : 'Consultar DNI' }}</button></div>
                </div>
              </div>

              <p class="text-xs text-[#64748b]">Los datos del proveedor externo son referenciales. Revisa nombres y apellidos antes de guardar.</p>
              @if (error()) {
                <p class="!text-[11px] text-[#be123c]" role="alert">{{ error() }}</p>
              }

              <!-- Grid Row 2: Nombres y Apellidos -->
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label class="block text-xs font-semibold text-[#475569] mb-1">Nombres *</label>
                  <input
                    id="nuevo-alumno-nombres" aria-label="Nombres *"
                    type="text"
                    [(ngModel)]="nuevoAlumno.nombres"
                    name="nombres"
                    required
                    maxlength="100"
                    placeholder="Ej. Mateo Alejandro"
                    class="w-full px-3 py-2.5 rounded-xl bg-[#f5f7fb] border border-[#e5eaf2] !text-[#172b4d] !text-base placeholder-slate-500 focus:outline-none focus:border-blue-500 min-w-0 !min-h-[44px] max-w-full border px-3 py-[10px] !border-[#d9e1ec] rounded-xl !bg-white !text-[#14213d] transition-colors focus:border-[#5b83d6] focus:outline-none focus:shadow-[0_0_0_3px_rgb(59_110_214_/_13%)] max-[639px]:text-base"
                  />
                </div>

                <div>
                  <label class="block text-xs font-semibold text-[#475569] mb-1">Apellido Paterno *</label>
                  <input
                    id="nuevo-alumno-ape-paterno" aria-label="Apellido Paterno *"
                    type="text"
                    [(ngModel)]="nuevoAlumno.apellidoPaterno"
                    name="apellidoPaterno"
                    required
                    maxlength="80"
                    placeholder="Ej. Quispe"
                    class="w-full px-3 py-2.5 rounded-xl bg-[#f5f7fb] border border-[#e5eaf2] !text-[#172b4d] !text-base placeholder-slate-500 focus:outline-none focus:border-blue-500 min-w-0 !min-h-[44px] max-w-full border px-3 py-[10px] !border-[#d9e1ec] rounded-xl !bg-white !text-[#14213d] transition-colors focus:border-[#5b83d6] focus:outline-none focus:shadow-[0_0_0_3px_rgb(59_110_214_/_13%)] max-[639px]:text-base"
                  />
                </div>

                <div>
                  <label class="block text-xs font-semibold text-[#475569] mb-1">Apellido Materno *</label>
                  <input
                    id="nuevo-alumno-ape-materno" aria-label="Apellido Materno *"
                    type="text"
                    [(ngModel)]="nuevoAlumno.apellidoMaterno"
                    name="apellidoMaterno"
                    required
                    maxlength="80"
                    placeholder="Ej. Mendoza"
                    class="w-full px-3 py-2.5 rounded-xl bg-[#f5f7fb] border border-[#e5eaf2] !text-[#172b4d] !text-base placeholder-slate-500 focus:outline-none focus:border-blue-500 min-w-0 !min-h-[44px] max-w-full border px-3 py-[10px] !border-[#d9e1ec] rounded-xl !bg-white !text-[#14213d] transition-colors focus:border-[#5b83d6] focus:outline-none focus:shadow-[0_0_0_3px_rgb(59_110_214_/_13%)] max-[639px]:text-base"
                  />
                </div>
              </div>

              <!-- Grid Row 3: Nacimiento, Genero, Grupo Sanguineo -->
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label class="block text-xs font-semibold text-[#475569] mb-1">Fecha de Nacimiento *</label>
                  <input
                    id="nuevo-alumno-fecha-nac" aria-label="Fecha de Nacimiento *"
                    type="date"
                    [(ngModel)]="nuevoAlumno.fechaNacimiento"
                    name="fechaNacimiento"
                    required
                    class="w-full px-3 py-2.5 rounded-xl bg-[#f5f7fb] border border-[#e5eaf2] !text-[#172b4d] !text-base focus:outline-none focus:border-blue-500 min-w-0 !min-h-[44px] max-w-full border px-3 py-[10px] !border-[#d9e1ec] rounded-xl !bg-white !text-[#14213d] transition-colors focus:border-[#5b83d6] focus:outline-none focus:shadow-[0_0_0_3px_rgb(59_110_214_/_13%)] max-[639px]:text-base"
                  />
                </div>

                <div>
                  <label class="block text-xs font-semibold text-[#475569] mb-1">Género *</label>
                  <select
                    id="nuevo-alumno-genero" aria-label="Género *"
                    [(ngModel)]="nuevoAlumno.genero"
                    name="genero"
                    required
                    class="w-full px-3 py-2.5 rounded-xl bg-[#f5f7fb] border border-[#e5eaf2] !text-[#172b4d] !text-base focus:outline-none focus:border-blue-500 min-w-0 !min-h-[44px] max-w-full border px-3 py-[10px] !border-[#d9e1ec] rounded-xl !bg-white !text-[#14213d] transition-colors focus:border-[#5b83d6] focus:outline-none focus:shadow-[0_0_0_3px_rgb(59_110_214_/_13%)] max-[639px]:text-base"
                  >
                    <option value="M">Masculino</option>
                    <option value="F">Femenino</option>
                  </select>
                </div>

                <div>
                  <label class="block text-xs font-semibold text-[#475569] mb-1">Grupo Sanguíneo</label>
                  <select
                    id="nuevo-alumno-grupo-sang" aria-label="Grupo Sanguíneo"
                    [(ngModel)]="nuevoAlumno.grupoSanguineo"
                    name="grupoSanguineo"
                    class="w-full px-3 py-2.5 rounded-xl bg-[#f5f7fb] border border-[#e5eaf2] !text-[#172b4d] !text-base focus:outline-none focus:border-blue-500 min-w-0 !min-h-[44px] max-w-full border px-3 py-[10px] !border-[#d9e1ec] rounded-xl !bg-white !text-[#14213d] transition-colors focus:border-[#5b83d6] focus:outline-none focus:shadow-[0_0_0_3px_rgb(59_110_214_/_13%)] max-[639px]:text-base"
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
                  <label class="block text-xs font-semibold text-[#475569] mb-1">Alergias o Condiciones Médicas</label>
                  <input
                    id="nuevo-alumno-alergias" aria-label="Alergias o Condiciones Médicas"
                    type="text"
                    [(ngModel)]="nuevoAlumno.alergiasCondiciones"
                    name="alergias"
                    maxlength="4000"
                    placeholder="Ej. Ninguna alergia conocida / Alérgico a penicilina"
                    class="w-full px-3 py-2.5 rounded-xl bg-[#f5f7fb] border border-[#e5eaf2] !text-[#172b4d] !text-base placeholder-slate-500 focus:outline-none focus:border-blue-500 min-w-0 !min-h-[44px] max-w-full border px-3 py-[10px] !border-[#d9e1ec] rounded-xl !bg-white !text-[#14213d] transition-colors focus:border-[#5b83d6] focus:outline-none focus:shadow-[0_0_0_3px_rgb(59_110_214_/_13%)] max-[639px]:text-base"
                  />
                </div>
              </div>

              </div>
              <!-- Modal Footer -->
              <div class="sticky bottom-0 z-[1] flex flex-[0_0_auto] flex-wrap justify-end gap-[10px] border-t border-[#e5eaf2] bg-white px-6 py-[14px] max-[639px]:px-4 max-[639px]:py-3 max-[639px]:[&>button]:flex-[1_1_auto] flex items-center justify-end gap-3 pt-4 border-t !border-[#e1e8f1]">
                <button
                  type="button"
                  (click)="cerrarModalNuevoAlumno()"
                  class="px-4 py-2.5 rounded-xl bg-[#f1f4f9] hover:bg-slate-700 text-[#475569] text-xs !text-[14px] font-semibold transition cursor-pointer max-[640px]:w-full box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]"
                >
                  Cancelar
                </button>
                <button
                  id="btn-guardar-alumno"
                  type="submit"
                  [disabled]="guardandoAlumno() || consultandoDni()"
                  class="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs !text-[14px] font-semibold shadow-lg shadow-blue-600/30 transition flex items-center gap-2 cursor-pointer disabled:opacity-50 max-[640px]:w-full box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]"
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

      <!-- ============================================================== -->
      <!-- MODAL: ASIGNAR MATRICULA A SECCION                             -->
      <!-- ============================================================== -->
      <ng-template #solicitudDialog>
          <div class="flex max-h-[calc(100dvh-24px)] min-h-0 flex-col font-sans w-full max-w-lg p-1">
            <div class="flex flex-[0_0_auto] items-center justify-between gap-4 border-b border-[#e5eaf2] px-6 py-5 [&_h3]:m-0 [&_h3]:text-[#14213d] [&_h3]:text-lg [&_h3]:leading-[27px] [&_h3]:font-[750] [&_p]:mb-0 [&_p]:mt-1 [&_p]:text-[#64748b] [&_p]:text-xs [&_p]:leading-[1.5] max-[639px]:p-4 flex items-center justify-between border-b border-[#e5eaf2] pb-4">
              <h3 class="text-lg !leading-7 font-bold text-[#14213d] tracking-[-.025em]">Asignar Solicitud de Matrícula</h3>
              <button (click)="cerrarSolicitudDialog()" class="inline-flex h-11 min-h-11 w-11 min-w-11 shrink-0 items-center justify-center rounded p-2 text-base font-normal text-[#64748b] hover:text-[#475569]" aria-label="Cerrar diálogo">✕</button>
            </div>

            <form (ngSubmit)="solicitar()" class="flex min-h-0 flex-[1_1_auto] flex-col space-y-4">
              <div class="min-h-0 flex-[1_1_auto] overflow-auto overscroll-contain px-6 py-5 max-[639px]:p-4 space-y-4">
              <div>
                <label class="block text-xs font-semibold text-[#475569] mb-1">Año Lectivo</label>
                <select [(ngModel)]="anioLectivoId" aria-label="Año Lectivo" name="anio" (change)="cargarSecciones()" required class="w-full px-3 py-2.5 rounded-xl bg-[#f5f7fb] border border-[#e5eaf2] text-[#14213d] !text-base focus:outline-none focus:border-blue-500 min-w-0 !min-h-11 max-w-full border px-3 py-[10px] !border-[#d9e1ec] rounded-xl !bg-[#f5f7fb] !text-[#14213d] transition-colors focus:border-[#5b83d6] focus:outline-none focus:shadow-[0_0_0_3px_rgb(59_110_214_/_13%)] max-[639px]:text-base">
                  @for (anio of anios(); track anio.id) {
                    <option [ngValue]="anio.id">{{ anio.anio }} {{ anio.abierto ? '(Vigente)' : '' }}</option>
                  }
                </select>
              </div>

              <div>
                <label class="block text-xs font-semibold text-[#475569] mb-1">Estudiante Registrado *</label>
                <select [(ngModel)]="nuevoEstudianteId" aria-label="Estudiante Registrado *" name="estudiante" required class="w-full px-3 py-2.5 rounded-xl bg-[#f5f7fb] border border-[#e5eaf2] text-[#14213d] !text-base focus:outline-none focus:border-blue-500 min-w-0 !min-h-11 max-w-full border px-3 py-[10px] !border-[#d9e1ec] rounded-xl !bg-[#f5f7fb] !text-[#14213d] transition-colors focus:border-[#5b83d6] focus:outline-none focus:shadow-[0_0_0_3px_rgb(59_110_214_/_13%)] max-[639px]:text-base">
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
                      #{{ est.id }} - {{ est.numeroDocumento }} · {{ est.apellidoPaterno }} {{ est.apellidoMaterno }}, {{ est.nombres }}
                    </option>
                  }
                </select>
              </div>

              <div>
                <label class="block text-xs font-semibold text-[#475569] mb-1">Sección de Destino *</label>
                <select [(ngModel)]="seccionIdSeleccionada" aria-label="Sección de Destino *" name="seccion" required class="w-full px-3 py-2.5 rounded-xl bg-[#f5f7fb] border border-[#e5eaf2] text-[#14213d] !text-base focus:outline-none focus:border-blue-500 min-w-0 !min-h-11 max-w-full border px-3 py-[10px] !border-[#d9e1ec] rounded-xl !bg-[#f5f7fb] !text-[#14213d] transition-colors focus:border-[#5b83d6] focus:outline-none focus:shadow-[0_0_0_3px_rgb(59_110_214_/_13%)] max-[639px]:text-base">
                  @for (s of secciones(); track s.id) {
                    <option [ngValue]="s.id">{{ obtenerNombreSeccion(s) }}</option>
                  }
                </select>
              </div>

              <div>
                <label class="block text-xs font-semibold text-[#475569] mb-1">Observaciones</label>
                <textarea
                  [(ngModel)]="nuevasObservaciones" aria-label="Observaciones"
                  name="observaciones"
                  maxlength="4000"
                  rows="3"
                  placeholder="Observaciones de la matrícula..."
                  class="w-full px-3 py-2.5 rounded-xl bg-[#f5f7fb] border border-[#e5eaf2] text-[#14213d] text-xs placeholder-slate-500 focus:outline-none focus:border-blue-500 min-w-0 max-w-full border px-3 py-[10px] !border-[#d9e1ec] rounded-xl !bg-[#f5f7fb] !text-[#14213d] transition-colors focus:border-[#5b83d6] focus:outline-none focus:shadow-[0_0_0_3px_rgb(59_110_214_/_13%)] max-[639px]:text-base py-[10px] resize-y !min-h-[100px]"
                ></textarea>
              </div>

              </div>
              <div class="sticky bottom-0 z-[1] flex flex-[0_0_auto] flex-wrap justify-end gap-[10px] border-t border-[#e5eaf2] bg-white px-6 py-[14px] max-[639px]:px-4 max-[639px]:py-3 max-[639px]:[&>button]:flex-[1_1_auto] flex items-center justify-end gap-3 pt-4 border-t !border-[#e1e8f1]">
                <button type="button" (click)="cerrarSolicitudDialog()" class="px-4 py-2 rounded-xl bg-[#f1f4f9] text-[#475569] text-xs !text-sm font-semibold box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]">
                  Cancelar
                </button>
                <button type="submit" [disabled]="guardando()" class="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs !text-sm font-semibold disabled:opacity-50 box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]">
                  {{ guardando() ? 'Guardando...' : 'Asignar Matrícula' }}
                </button>
              </div>
            </form>
          </div>
      </ng-template>

      <!-- ============================================================== -->
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
                  <p class="m-0 text-[10px] font-bold uppercase tracking-[.14em] text-[#718096]">Código de matrícula</p>
                  <p class="mb-0 mt-1 font-mono text-lg font-bold text-[#14213d]">{{ codigoFicha(actual) }}</p>
                </div>
                <span class="rounded-full border border-[#d7e1ef] bg-[#f4f7fb] px-3 py-1.5 text-xs font-bold text-[#34445d]">{{ estadoFicha(actual.matricula.estadoMatricula) }}</span>
              </div>

              <section class="mb-5">
                <h4 class="mb-3 mt-0 border-l-[3px] border-[#c6a15b] pl-3 text-sm font-extrabold text-[#14213d]">Identificación del estudiante</h4>
                <div class="grid grid-cols-2 gap-x-6 gap-y-4 rounded-xl border border-[#e1e8f1] p-4 max-[639px]:grid-cols-1">
                  <div class="col-span-2 max-[639px]:col-span-1"><p class="ficha-label">Apellidos y nombres</p><p class="ficha-value">{{ actual.estudiante.apellidoPaterno }} {{ actual.estudiante.apellidoMaterno }}, {{ actual.estudiante.nombres }}</p></div>
                  <div><p class="ficha-label">Documento de identidad</p><p class="ficha-value">{{ actual.estudiante.tipoDocumento || 'DNI' }} {{ actual.estudiante.numeroDocumento }}</p></div>
                  <div><p class="ficha-label">Fecha de nacimiento</p><p class="ficha-value">{{ actual.estudiante.fechaNacimiento | uiDatePe }}</p></div>
                  <div><p class="ficha-label">Género</p><p class="ficha-value">{{ actual.estudiante.genero === 'F' ? 'Femenino' : actual.estudiante.genero === 'M' ? 'Masculino' : 'No registrado' }}</p></div>
                  <div><p class="ficha-label">Código interno</p><p class="ficha-value font-mono">{{ actual.estudiante.codigoInterno || codigoInterno(actual.estudiante.id) }}</p></div>
                  <div><p class="ficha-label">Código SIAGIE oficial</p><p class="ficha-value">{{ actual.estudiante.codigoEstudianteSiagie || 'Pendiente de asignación' }}</p></div>
                  <div><p class="ficha-label">Validación de identidad</p><p class="ficha-value">{{ actual.estudiante.validadoReniec ? 'Validada mediante RENIEC' : 'Pendiente o registro manual' }}</p></div>
                  <div><p class="ficha-label">Grupo sanguíneo</p><p class="ficha-value">{{ actual.estudiante.grupoSanguineo || 'No registrado' }}</p></div>
                </div>
              </section>

              <section class="mb-5">
                <h4 class="mb-3 mt-0 border-l-[3px] border-[#c6a15b] pl-3 text-sm font-extrabold text-[#14213d]">Datos de matrícula</h4>
                <div class="grid grid-cols-2 gap-x-6 gap-y-4 rounded-xl border border-[#e1e8f1] p-4 max-[639px]:grid-cols-1">
                  <div><p class="ficha-label">Año lectivo</p><p class="ficha-value">{{ anioDeFicha(actual) }}</p></div>
                  <div><p class="ficha-label">Grado y sección</p><p class="ficha-value">{{ seccionDeFicha(actual) }}</p></div>
                  <div><p class="ficha-label">Aula</p><p class="ficha-value">{{ aulaDeFicha(actual) }}</p></div>
                  <div><p class="ficha-label">Fecha de registro</p><p class="ficha-value">{{ actual.matricula.fechaMatricula | uiDatePe }}</p></div>
                  <div class="col-span-2 max-[639px]:col-span-1"><p class="ficha-label">Observaciones</p><p class="ficha-value whitespace-pre-wrap">{{ actual.matricula.observaciones || 'Sin observaciones registradas' }}</p></div>
                </div>
              </section>

              <section>
                <h4 class="mb-3 mt-0 border-l-[3px] border-[#c6a15b] pl-3 text-sm font-extrabold text-[#14213d]">Apoderado(s) registrado(s)</h4>
                @if (actual.apoderados.length) {
                  <div class="space-y-3">
                    @for (apoderado of actual.apoderados; track apoderado.id) {
                      <div class="grid grid-cols-2 gap-x-6 gap-y-3 rounded-xl border border-[#e1e8f1] p-4 max-[639px]:grid-cols-1">
                        <div class="col-span-2 max-[639px]:col-span-1"><p class="ficha-label">Apellidos y nombres</p><p class="ficha-value">{{ apoderado.apellidoPaterno }} {{ apoderado.apellidoMaterno }}, {{ apoderado.nombres }}</p></div>
                        <div><p class="ficha-label">Documento</p><p class="ficha-value">{{ apoderado.tipoDocumento || 'DNI' }} {{ apoderado.numeroDocumento }}</p></div>
                        <div><p class="ficha-label">Identidad</p><p class="ficha-value">{{ apoderado.validadoReniec ? 'Validada mediante RENIEC' : 'Pendiente o registro manual' }}</p></div>
                        <div><p class="ficha-label">Celular</p><p class="ficha-value">{{ apoderado.celular || 'No registrado' }}</p></div>
                        <div><p class="ficha-label">Correo</p><p class="ficha-value break-all">{{ apoderado.email || 'No registrado' }}</p></div>
                        <div class="col-span-2 max-[639px]:col-span-1"><p class="ficha-label">Dirección</p><p class="ficha-value">{{ apoderado.direccion || 'No registrada' }}</p></div>
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
              <p class="m-0 text-center text-[10px] text-[#94a3b8]">Documento informativo generado desde el registro institucional. No reemplaza constancias oficiales.</p>
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
    </div>
  `,
  styles: [`
    .ficha-label { margin: 0 0 .2rem; color: #718096; font-size: .68rem; font-weight: 700; letter-spacing: .035em; }
    .ficha-value { margin: 0; color: #172b4d; font-size: .82rem; font-weight: 600; line-height: 1.45; }
  `]
})
export class MatriculasComponent implements OnInit {
  readonly auth = inject(AuthStore);
  private readonly dialog = inject(MatDialog);
  private readonly matriculaService = inject(MatriculaService);
  private readonly academicoService = inject(AcademicoService);

  @ViewChild('nuevoAlumnoDialog') private nuevoAlumnoDialog!: TemplateRef<unknown>;
  @ViewChild('solicitudDialog') private solicitudDialog!: TemplateRef<unknown>;
  @ViewChild('fichaDialog') private fichaDialog!: TemplateRef<unknown>;
  private alumnoDialogRef?: MatDialogRef<unknown>;
  private solicitudDialogRef?: MatDialogRef<unknown>;
  private fichaDialogRef?: MatDialogRef<unknown>;

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
  readonly ficha = signal<FichaMatriculaResponseDto | null>(null);

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
  seccionIdSeleccionada = 0;
  filtroSeccionId = 0;
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

  obtenerNombreSeccion(s: SeccionResponseDto): string {
    const nombreGrado = this.gradosMap.get(s.gradoId) ?? `Grado ${s.gradoId}`;
    const aula = s.aulaFisica ? ` · ${s.aulaFisica}` : '';
    const vacantes = s.vacantesOcupadas == null || s.cupoMaximo == null
      ? ` \u00b7 \u2014`
      : ` \u00b7 ${s.vacantesOcupadas}/${s.cupoMaximo}`;
    return `${nombreGrado} - Sección ${s.letra}${aula}${vacantes}`;
  }

  estudiantesFiltradosPadron(): EstudianteResponseDto[] {
    const q = this.busquedaEstudiante.toLowerCase().trim();
    if (!q) return this.listaEstudiantes();

    return this.listaEstudiantes().filter(e => {
      const nombreCompleto = `${e.apellidoPaterno} ${e.apellidoMaterno}, ${e.nombres}`.toLowerCase();
      return e.numeroDocumento?.toLowerCase().includes(q) ||
        e.codigoEstudianteSiagie?.toLowerCase().includes(q) ||
        nombreCompleto.includes(q);
    });
  }

  estudiantesPaginados(): EstudianteResponseDto[] {
    const inicio = this.paginaPadron * this.tamanoPaginaPadron;
    return this.estudiantesFiltradosPadron().slice(inicio, inicio + this.tamanoPaginaPadron);
  }

  listaEstudiantesDisponibles(): EstudianteResponseDto[] {
    if (!this.matriculasAnioVerificadas() || this.cargandoMatriculasAnio()) return [];
    const matriculados = this.estudiantesMatriculadosPorAnio();
    return this.listaEstudiantes().filter(estudiante => !matriculados.has(estudiante.id));
  }

  estaMatriculadoEnAnio(estudianteId: number): boolean {
    return this.estudiantesMatriculadosPorAnio().has(estudianteId);
  }

  cambiarPaginaPadron(evento: PageEvent): void {
    this.paginaPadron = evento.pageIndex;
    this.tamanoPaginaPadron = evento.pageSize;
  }

  estudiantesFiltrados(): EstudianteMatriculadoItem[] {
    const q = this.busqueda.toLowerCase().trim();
    const estado = this.filtroEstado;

    return this.estudiantes().filter(e => {
      const datosEstudiante = this.estudiantesPorId.get(e.estudianteId);
      const matchQ =
        !q ||
        String(e.estudianteId).includes(q) ||
        (e.codigoMatricula && e.codigoMatricula.toLowerCase().includes(q)) ||
        Boolean(datosEstudiante?.numeroDocumento?.includes(q)) ||
        this.nombreEstudiante(e.estudianteId).toLowerCase().includes(q);
      const matchEstado = estado === 'TODOS' || e.estado === estado;
      return matchQ && matchEstado;
    });
  }

  estudiantesPaginadosMatriculas(): EstudianteMatriculadoItem[] {
    const inicio = this.paginaMatriculas * this.tamanoPaginaMatriculas;
    return this.estudiantesFiltrados().slice(inicio, inicio + this.tamanoPaginaMatriculas);
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

  cambiarPaginaMatriculas(evento: PageEvent): void {
    this.paginaMatriculas = evento.pageIndex;
    this.tamanoPaginaMatriculas = evento.pageSize;
  }

  ngOnInit(): void {
    this.cargarEstudiantes();
    this.cargarCatalogoGrados();
    this.academicoService.listarAnios().subscribe({
      next: anios => {
        this.anios.set(anios);
        const aniosOrdenados = [...anios].sort((a, b) => b.anio - a.anio);
        this.anioLectivoId = aniosOrdenados.find(a => a.abierto)?.id ?? aniosOrdenados[0]?.id ?? 0;
        this.cargarSecciones();
      },
      error: () => this.error.set('No se pudieron cargar los años lectivos.')
    });
  }

  cargarCatalogoGrados(): void {
    [1, 2, 3].forEach(nivelId => {
      this.academicoService.listarGrados(nivelId).subscribe({
        next: grados => {
          grados.forEach(g => this.gradosMap.set(g.id, g.nombre));
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

  cargarSecciones(preservarSeleccion = false): void {
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
        const seccionConservada = preservarSeleccion
          ? secciones.find(s => s.id === seccionSeleccionada)
          : undefined;
        const conAlumnos = secciones.find(s => (s.vacantesOcupadas ?? 0) > 0);
        this.seccionIdSeleccionada = seccionConservada?.id ?? conAlumnos?.id ?? secciones[0]?.id ?? 0;
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
    this.error.set(null);
    this.paginaMatriculas = 0;
    if (!this.filtroSeccionId) {
      this.cargando.set(true);
      this.matriculaService.listarPorAnio(this.anioLectivoId).subscribe({
        next: res => this.actualizarMatriculas(res),
        error: () => {
          this.cargando.set(false);
          this.estudiantes.set([]);
          this.error.set('No se pudieron cargar las matrículas del año lectivo.');
        }
      });
      return;
    }
    if (!this.seccionIdSeleccionada) {
      this.estudiantes.set([]);
      return;
    }
    this.cargando.set(true);
    this.matriculaService.listarPorSeccion(this.filtroSeccionId, 0, 50).subscribe({
      next: res => this.actualizarMatriculas(res),
      error: () => {
        this.cargando.set(false);
        this.estudiantes.set([]);
        this.error.set('No se pudieron cargar las matrículas de la sección.');
      }
    });
  }

  private actualizarMatriculas(res: MatriculaResponseDto[] | null): void {
    this.cargando.set(false);
    this.estudiantes.set((res ?? []).map(m => ({
      id: m.id,
      codigoMatricula: `MAT-${this.anios().find(a => a.id === m.anioLectivoId)?.anio ?? m.anioLectivoId}-${String(m.id).padStart(3, '0')}`,
      estudianteId: m.estudianteId,
      estado: m.estadoMatricula,
      fechaMatricula: m.fechaMatricula ? String(m.fechaMatricula).split('T')[0] : '-',
      observaciones: m.observaciones
    })));
  }

  confirmarMatricula(matriculaId: number): void {
    this.confirmandoMatricula.set(matriculaId);
    this.error.set(null);
    this.mensajeExito.set(null);
    this.matriculaService.confirmarMatricula(matriculaId).subscribe({
      next: matricula => {
        this.confirmandoMatricula.set(null);
        this.mensajeExito.set(`Matrícula #${matricula.id} confirmada; el pago fue validado.`);
        this.cargarSecciones(true);
      },
      error: err => {
        this.confirmandoMatricula.set(null);
        this.error.set(err?.error?.message ?? 'No se pudo confirmar. Verifica el pago de la cuota de matrícula.');
      }
    });
  }

  abrirModalNuevoAlumno(): void {
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
    if (!this.matriculasAnioVerificadas() || this.cargandoMatriculasAnio()) {
      this.error.set('Espera a que termine la verificación de matrículas del año.');
      return;
    }
    if (this.estaMatriculadoEnAnio(est.id)) {
      this.error.set('Este estudiante ya tiene matrícula en el año seleccionado. Revisa la matrícula existente.');
      return;
    }
    this.nuevoEstudianteId = est.id;
    this.abrirDialogoSolicitud();
  }

  abrirModalNuevaMatricula(): void {
    this.nuevoEstudianteId = 0;
    this.abrirDialogoSolicitud();
  }

  private abrirDialogoSolicitud(): void {
    this.error.set(null);
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
    if (!this.anioLectivoId || !this.seccionIdSeleccionada || !this.nuevoEstudianteId) {
      this.error.set('Complete año, sección y seleccione un estudiante registrado.');
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
        this.nuevasObservaciones = '';
        this.pestanaActiva.set('matriculas');
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
    const codigoInterno = estudiante.codigoInterno || this.codigoInterno(estudiante.id);
    const apoderados = ficha.apoderados.map(apoderado => `
      <section class="panel"><h2>Apoderado registrado</h2><div class="grid">
        <div class="wide"><label>Apellidos y nombres</label><strong>${seguro(`${apoderado.apellidoPaterno} ${apoderado.apellidoMaterno}, ${apoderado.nombres}`)}</strong></div>
        <div><label>Documento</label><strong>${seguro(apoderado.tipoDocumento || 'DNI')} ${seguro(apoderado.numeroDocumento)}</strong></div>
        <div><label>Validación de identidad</label><strong>${apoderado.validadoReniec ? 'Validada mediante RENIEC' : 'Pendiente o registro manual'}</strong></div>
        <div><label>Celular</label><strong>${seguro(apoderado.celular)}</strong></div>
        <div><label>Correo</label><strong>${seguro(apoderado.email)}</strong></div>
        <div class="wide"><label>Dirección</label><strong>${seguro(apoderado.direccion)}</strong></div>
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
        <div><label>Código interno</label><strong>${seguro(codigoInterno)}</strong></div>
        <div><label>Código SIAGIE oficial</label><strong>${seguro(estudiante.codigoEstudianteSiagie || 'Pendiente de asignación')}</strong></div>
        <div><label>Identidad</label><strong>${estudiante.validadoReniec ? 'Validada mediante RENIEC' : 'Pendiente o registro manual'}</strong></div>
        <div><label>Grupo sanguíneo</label><strong>${seguro(estudiante.grupoSanguineo)}</strong></div>
      </div></section>
      <section class="panel"><h2>Datos de matrícula</h2><div class="grid">
        <div><label>Año lectivo</label><strong>${seguro(this.anioDeFicha(ficha))}</strong></div>
        <div><label>Grado y sección</label><strong>${seguro(this.seccionDeFicha(ficha))}</strong></div>
        <div><label>Aula</label><strong>${seguro(this.aulaDeFicha(ficha))}</strong></div>
        <div><label>Fecha de registro</label><strong>${seguro(ficha.matricula.fechaMatricula)}</strong></div>
        <div class="wide"><label>Observaciones</label><strong>${seguro(ficha.matricula.observaciones || 'Sin observaciones registradas')}</strong></div>
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
}
