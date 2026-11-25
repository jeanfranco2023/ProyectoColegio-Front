import { FormatoEntradaDirective } from '../../shared/ui/formato-entrada.directive';
import {
  esNombreValido,
  esDniValido,
  esCelularValido,
  esEmailValido,
  esDireccionValida
} from '../../core/utils/validaciones';
import { obtenerFotoUsuario } from '../../core/utils/avatar.util';
import { Component, computed, inject, signal, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize, forkJoin, map, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { UsuarioService } from '../../core/services/usuario.service';
import {
  ActualizarUsuarioAdminRequestDto,
  AreaDocenteDto,
  CrearUsuarioRequestDto,
  EstadoValidacionIa,
  RolNombre,
  UserResponseDto
} from '../../core/models/auth.model';
import { NivelResponseDto } from '../../core/models/academico.model';
import { AuthStore } from '../../core/state/auth.store';
import { UiDatePePipe } from '../../shared/ui/ui-date-pe.pipe';
import { UiPaginacionComponent, paginarRegistros } from '../../shared/ui/ui-paginacion.component';

export type TipoDocumentoLegajo = 'CV' | 'TITULO' | 'ANTECEDENTES';

export interface ItemLegajoLocal {
  tipo: TipoDocumentoLegajo;
  etiqueta: string;
  archivo: File | null;
  nombreArchivo: string | null;
  estado: 'SIN_ARCHIVO' | 'LISTO_PARA_SUBIR' | EstadoValidacionIa;
  observacion: string | null;
}

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [FormatoEntradaDirective, CommonModule, FormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, UiDatePePipe, UiPaginacionComponent],
  template: `
    <div class="space-y-6 min-w-0 font-inter text-[#172b4d] [&_button]:min-h-11 [&_input]:min-h-11 [&_select]:min-h-11 [&_:focus-visible]:outline-[3px] [&_:focus-visible]:outline-[#2864c5] [&_:focus-visible]:outline-offset-[3px] [&_.grid>div]:min-w-0 [&_.grid>article]:min-w-0">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t-[3px] border-[var(--ui-gold)]/50 pt-3">
        <div>
          <h2 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-ui-text tracking-[-.025em]">Usuarios & Permisos (RBAC)</h2>
          <p class="text-sm text-ui-muted mt-1">
            Administración de cuentas institucionales, asignación de roles y control de acceso sincronizado con PostgreSQL.
          </p>
        </div>
        <div class="flex items-center gap-3 lg:flex-none lg:min-w-max">
          @if (puedeCrearUsuarios()) { <button mat-flat-button color="primary"
            (click)="abrirModalCrear()"
            class="!h-11 !min-h-11 !min-w-max !shrink-0 !rounded-xl !px-4 !font-semibold !leading-5 max-[640px]:!w-full max-[640px]:!min-w-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            <span>Crear Usuario en BD</span>
          </button> }
        </div>
      </div>

      @if (error()) { <p class="m-0 rounded-xl border border-ui-error-border bg-ui-error-bg px-3 py-[10px] text-xs text-ui-error-text" role="alert">{{ error() }}</p> }

      <!-- Filters & Stats -->
      <div class="p-4 rounded-2xl bg-ui-surface-soft border border-ui-divider flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div class="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:flex lg:w-auto lg:flex-wrap lg:items-end">
          <div class="flex flex-col gap-1">
            <label for="filtro-rol-usuarios" class="text-xs !text-[11px] font-semibold text-ui-muted">Filtrar por Rol</label>
            <select
              id="filtro-rol-usuarios"
              [(ngModel)]="filtroRol"
              (change)="cargarUsuarios()"
              class="px-3 py-1.5 rounded-xl bg-ui-surface border border-ui-control-border text-ui-text text-xs !text-[11px] focus:outline-none focus:border-ui-focus min-w-0 !min-h-11 max-w-full transition-colors focus:shadow-[0_0_0_3px_var(--ui-focus-shadow)]"
            >
              <option value="">Todos los Roles</option>
              <option value="ADMINISTRADOR">Administrador</option>
              <option value="DIRECCION">Dirección</option>
              <option value="SECRETARIA">Secretaría</option>
              <option value="DOCENTE">Docente</option>
              <option value="AUXILIAR">Auxiliar</option>
              <option value="TUTOR">Tutor</option>
              <option value="APODERADO">Apoderado</option>
            </select>
          </div>

          <div class="flex flex-col gap-1">
            <label for="filtro-especialidad-usuarios" class="text-xs !text-[11px] font-semibold text-ui-muted">Curso / Especialidad</label>
            <select
              id="filtro-especialidad-usuarios"
              [ngModel]="filtroEspecialidad()"
              (ngModelChange)="filtroEspecialidad.set($event); paginaActual.set(1)"
              class="px-3 py-1.5 rounded-xl bg-ui-surface border border-ui-control-border text-ui-text text-xs !text-[11px] focus:outline-none focus:border-ui-focus min-w-0 !min-h-11 max-w-full transition-colors focus:shadow-[0_0_0_3px_var(--ui-focus-shadow)]"
            >
              <option value="">Todos los cursos / áreas</option>
              @for (esp of opcionesFiltroEspecialidad(); track esp) {
                <option [value]="esp">{{ esp }}</option>
              }
            </select>
          </div>

          <div class="flex flex-col gap-1">
            <label for="filtro-estado-usuarios" class="text-xs !text-[11px] font-semibold text-ui-muted">Estado en Directorio</label>
            <select
              id="filtro-estado-usuarios"
              [ngModel]="filtroEstado()"
              (ngModelChange)="filtroEstado.set($event); paginaActual.set(1)"
              class="px-3 py-1.5 rounded-xl bg-ui-surface border border-ui-control-border text-ui-text text-xs !text-[11px] focus:outline-none focus:border-ui-focus min-w-0 !min-h-11 max-w-full transition-colors focus:shadow-[0_0_0_3px_var(--ui-focus-shadow)]"
            >
              <option value="">Todos los estados</option>
              <option value="ACTIVO">Activos</option>
              <option value="SUSPENDIDO">Suspendidos</option>
            </select>
          </div>

          <button
            type="button"
            (click)="cargarUsuarios()"
            class="px-3 py-1.5 rounded-xl bg-ui-surface border border-ui-divider hover:bg-ui-action hover:text-ui-surface text-ui-action text-xs !text-[11px] font-semibold cursor-pointer transition-colors max-[640px]:w-full box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]"
          >
            Actualizar BD
          </button>
        </div>

        <div class="text-xs !text-[11px] text-ui-muted shrink-0">
          Mostrando <span class="text-ui-text font-bold">{{ usuariosFiltrados().length }}</span> de <span class="text-ui-text font-bold">{{ usuarios().length }}</span> cuentas en BD
        </div>
      </div>

      <!-- Users Table -->
      <div class="rounded-2xl bg-ui-surface border border-ui-divider overflow-hidden shadow-sm">
        <div class="overflow-x-auto">
          <table class="w-full table-fixed min-w-[760px] text-left text-sm font-medium text-ui-text [&_th:last-child]:static [&_th:last-child]:shadow-none [&_td:last-child]:static [&_td:last-child]:shadow-none [&_thead]:!bg-ui-surface-soft [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:!bg-ui-surface-soft/75" data-mobile-table-cards="">
            <thead class="bg-ui-surface-soft border-b border-ui-divider text-ui-action uppercase tracking-wider font-bold text-xs">
              <tr>
                <th class="w-[54px] px-3 py-3.5">ID</th>
                <th class="w-[27%] px-3 py-3.5">Usuario / Ficha Personal</th>
                <th class="w-[23%] px-3 py-3.5">Correo Electrónico</th>
                <th class="w-[14%] px-3 py-3.5">Roles</th>
                <th class="w-[10%] px-3 py-3.5">Estado en BD</th>
                <th class="w-[225px] px-3 py-3.5 text-right">Acción</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[var(--ui-divider)] text-ui-text">
              @if (cargando()) {
                <tr>
                  <td colspan="6" class="text-center py-10 text-ui-muted">
                    <span class="inline-block w-5 h-5 border-2 border-ui-action/30 border-t-ui-action rounded-full animate-spin mb-2"></span>
                    <p>Consultando usuarios en la base de datos...</p>
                  </td>
                </tr>
              } @else {
                @for (user of usuariosPaginados(); track user.id) {
                  <tr class="bg-ui-surface hover:bg-ui-surface-soft/75 transition-colors">
                    <td class="px-3 py-3 font-mono text-ui-muted truncate" data-label="ID">{{ user.id }}</td>
                    <td class="px-3 py-3 font-bold text-ui-text overflow-hidden" data-label="Usuario">
                      <div class="flex items-center gap-2.5 min-w-0">
                        <img
                          [src]="obtenerFotoUsuario(user)"
                          [alt]="user.nombreCompleto || user.username"
                          class="w-9 h-9 rounded-full object-cover border-2 border-slate-200 shrink-0 shadow-2xs"
                          loading="lazy"
                        />
                        <div class="min-w-0 flex-1 overflow-hidden">
                          <div class="truncate text-ui-text font-bold" [title]="user.nombreCompleto || user.username">{{ user.nombreCompleto || user.username }}</div>
                          <small class="block font-normal text-ui-muted truncate" [title]="user.username + (user.dni ? ' · DNI ' + user.dni : '')">
                            {{ user.username }}@if (user.dni) { · DNI {{ user.dni }} }
                          </small>
                        </div>
                      </div>
                    </td>
                    <td class="px-3 py-3 text-ui-text truncate" data-label="Correo Electrónico" [title]="user.email">{{ user.email }}</td>
                    <td class="px-3 py-3" data-label="Roles">
                      <div class="flex flex-wrap gap-1">
                        @for (r of user.roles; track r.codigo) {
                          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-ui-info-bg text-ui-info-text border border-ui-info-border">
                            {{ r.codigo }}
                            @if ((esAdmin() || esDireccion()) && puedeGestionarUsuario(user) && user.roles.length > 1) {
                              <button
                                type="button"
                                (click)="abrirModalRevocarRol(user, r)"
                                class="!min-h-0 text-rose-500 hover:text-rose-700 ml-0.5 font-bold cursor-pointer transition hover:scale-110"
                                title="Revocar rol {{ r.codigo }}"
                                aria-label="Revocar rol"
                              >
                                ×
                              </button>
                            }
                          </span>
                        }
                      </div>
                    </td>
                    <td class="px-3 py-3" data-label="Estado en BD">
                      @if (user.activo) {
                        <span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-ui-success-bg border border-ui-success-border text-ui-success-text whitespace-nowrap">
                          ACTIVO
                        </span>
                      } @else {
                        <span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-ui-error-bg border border-ui-error-border text-ui-error-text whitespace-nowrap">
                          SUSPENDIDO
                        </span>
                      }
                    </td>
                    <td class="px-3 py-3 text-right" data-label="Acción">
                      <div class="inline-flex flex-wrap sm:flex-nowrap items-center justify-end gap-1.5">
                        <button
                          type="button"
                          (click)="abrirModalDetalles(user)"
                          class="!min-h-[34px] px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold cursor-pointer text-[11px] whitespace-nowrap transition-colors"
                          title="Ver ficha completa del usuario"
                        >
                          Detalles
                        </button>
                        @if (puedeGestionarUsuario(user)) {
                          <button
                            type="button"
                            (click)="abrirModalEditarUsuario(user)"
                            class="!min-h-[34px] px-2.5 py-1 rounded-lg bg-blue-50/70 border border-blue-200 hover:bg-blue-100 text-[#1d4ed8] font-semibold cursor-pointer text-[11px] whitespace-nowrap transition-colors"
                            title="Editar datos completos, roles y cursos"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            (click)="alternarEstado(user)"
                            [class]="user.activo
                              ? 'bg-rose-50/80 border-rose-200 text-rose-700 hover:bg-rose-600 hover:text-white hover:border-rose-600'
                              : 'bg-emerald-50/80 border-emerald-200 text-emerald-700 hover:bg-emerald-600 hover:text-white hover:border-emerald-600'"
                            class="!min-h-[34px] px-2.5 py-1 rounded-lg border font-semibold cursor-pointer text-[11px] whitespace-nowrap transition-colors"
                          >
                            {{ user.activo ? 'Suspender' : 'Activar' }}
                          </button>
                        }
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr [hidden]="!!error()">
                    <td colspan="6" data-label="">
                      <div class="text-center py-12 text-ui-muted space-y-2 relative pt-[62px]" data-illustration="crest"><svg aria-hidden="true" class="absolute left-1/2 top-3 h-[42px] w-[42px] -translate-x-1/2 fill-none stroke-[var(--ui-action)] stroke-2 [stroke-linecap:round] [stroke-linejoin:round]"><path d="M24 5 39 11v11c0 10-6.5 16-15 21C15.5 38 9 32 9 22V11z"/><path d="M15 18c3-1 6-.5 9 1.5v13c-3-2-6-2.5-9-1.5zM33 18c-3-1-6-.5-9 1.5v13c3-2 6-2.5 9-1.5z" stroke="var(--ui-gold)"/></svg>
                        <p class="font-medium text-ui-muted">No se encontraron usuarios registrados en la base de datos.</p>
                        <p class="text-[11px] text-ui-muted">Cree un nuevo usuario institucional con el botón superior para darlo de alta en PostgreSQL.</p>
                      </div>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>

        <ui-paginacion
          [totalRegistros]="usuariosFiltrados().length"
          [paginaActual]="paginaActual()"
          [tamanoPagina]="tamanoPagina()"
          etiqueta="cuentas"
          ariaLabel="Paginación de usuarios"
          (cambioPagina)="cambiarPagina($event)"
        />
      </div>

      <!-- MODAL FLOTANTE DE ALTA Y EXPEDIENTE DE EMPLEADO -->
      <ng-template #crearUsuarioDialog>
        <div class="scrollbar-hidden">
          <h2 mat-dialog-title class="!px-6 !pt-6 !text-xl !font-semibold !tracking-tight !text-[#14213d] tracking-[-.025em]">Expediente y Alta de Empleado</h2>
          <p class="px-6 text-xs leading-5 text-[#64748b]">Completa la ficha personal, las asignaciones institucionales y, opcionalmente, el legajo documental.</p>
          <form id="crear-usuario-form" (ngSubmit)="guardarNuevoUsuario()" novalidate>
            <mat-dialog-content class="!px-6 !pt-4 !pb-4 scrollbar-hidden max-h-[75vh] space-y-4">
              @if (error()) { <p id="crear-usuario-form-error" class="m-0 rounded-xl border border-[#fecaca] bg-[#fef2f2] px-3 py-[10px] text-xs text-[#b91c1c]" role="alert">{{ error() }}</p> }

              <!-- SECCIÓN 1: Datos Personales e Identidad -->
              <section class="rounded-2xl border border-[#e5eaf2] bg-[#fcfdfe] p-4" aria-labelledby="sec-datos-personales">
                <h3 id="sec-datos-personales" class="text-xs font-bold uppercase tracking-wider text-[#76551f] mb-3 flex items-center gap-1.5">
                  <span class="size-2 rounded-full bg-[#c49a58]"></span>
                  1. Ficha Personal e Identidad (RENIEC)
                </h3>

                <!-- DNI con botón Consultar RENIEC -->
                <div class="mb-3">
                  <label for="nuevo-dni" class="block text-xs font-bold text-[#34445d] mb-1">
                    DNI del Empleado {{ esDniObligatorio() ? '* (Obligatorio para Docente / Personal)' : '' }}
                  </label>
                  <div class="flex items-center gap-2">
                    <input
                      id="nuevo-dni"
                      appFormatoEntrada="dni"
                      type="text"
                      [(ngModel)]="nuevoDni"
                      (input)="onDniChange()"
                      name="nuevoDni"
                      inputmode="numeric"
                      maxlength="8"
                      [required]="esDniObligatorio()"
                      [attr.aria-invalid]="!!dniError()"
                      aria-describedby="nuevo-dni-error"
                      placeholder="8 dígitos numéricos"
                      class="flex-1 h-11 px-3 text-xs rounded-xl border border-[#dce3ec] bg-white text-[#14213d] focus:outline-none focus:border-[#2563eb]"
                    />
                    <button
                      type="button"
                      (click)="consultarReniecEmpleado()"
                      [disabled]="consultandoReniec() || nuevoDni.trim().length !== 8"
                      title="Consultar datos en RENIEC"
                      aria-label="Consultar datos en RENIEC"
                      class="h-11 w-11 shrink-0 rounded-xl bg-gradient-to-b from-[#1c477d] to-[#173B67] hover:from-[#173B67] hover:to-[#112d50] text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer group active:scale-95"
                    >
                      @if (consultandoReniec()) {
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
                  @if (dniError()) {
                    <p id="nuevo-dni-error" class="mt-1 text-xs font-semibold text-[#b91c1c]" role="alert">{{ dniError() }}</p>
                  } @else {
                    <span id="nuevo-dni-error" class="sr-only">Ingrese los 8 dígitos del DNI del docente o empleado.</span>
                  }
                  @if (mensajeReniec()) {
                    <div class="mt-2 flex items-center justify-between text-[11px] px-3 py-1.5 rounded-lg"
                      [class.bg-emerald-50]="reniecExitoso()" [class.text-emerald-800]="reniecExitoso()" [class.border]="true" [class.border-emerald-200]="reniecExitoso()"
                      [class.bg-amber-50]="!reniecExitoso()" [class.text-amber-800]="!reniecExitoso()" [class.border-amber-200]="!reniecExitoso()">
                      <span>{{ mensajeReniec() }}</span>
                      @if (reniecExitoso()) {
                        <button type="button" class="underline text-slate-600 hover:text-slate-900 ml-2 cursor-pointer font-medium" (click)="habilitarEdicionNombres()">Editar nombres</button>
                      }
                    </div>
                  }
                </div>

                <div class="grid grid-cols-1 gap-3 sm:grid-cols-3 mb-3">
                  <div>
                    <label for="nuevo-nombres" class="block text-xs font-semibold text-[#59677a] mb-1">Nombres *</label>
                    <input
                      id="nuevo-nombres"
                      appFormatoEntrada="nombre"
                      type="text"
                      [(ngModel)]="nuevoNombres"
                      name="nuevoNombres"
                      placeholder="Nombres"
                      required
                      [readonly]="reniecExitoso()"
                      [class.bg-slate-100]="reniecExitoso()"
                      aria-describedby="nuevo-nombres-help"
                      class="w-full h-11 px-3 text-xs rounded-xl border border-[#dce3ec] bg-white text-[#14213d] focus:outline-none focus:border-[#2563eb]"
                    />
                    <span id="nuevo-nombres-help" class="sr-only">Nombres del empleado</span>
                  </div>
                  <div>
                    <label for="nuevo-apellido-paterno" class="block text-xs font-semibold text-[#59677a] mb-1">Apellido Paterno *</label>
                    <input
                      id="nuevo-apellido-paterno"
                      appFormatoEntrada="nombre"
                      type="text"
                      [(ngModel)]="nuevoApellidoPaterno"
                      name="nuevoApellidoPaterno"
                      placeholder="Apellido Paterno"
                      required
                      [readonly]="reniecExitoso()"
                      [class.bg-slate-100]="reniecExitoso()"
                      aria-describedby="nuevo-apellido-paterno-help"
                      class="w-full h-11 px-3 text-xs rounded-xl border border-[#dce3ec] bg-white text-[#14213d] focus:outline-none focus:border-[#2563eb]"
                    />
                    <span id="nuevo-apellido-paterno-help" class="sr-only">Apellido paterno del empleado</span>
                  </div>
                  <div>
                    <label for="nuevo-apellido-materno" class="block text-xs font-semibold text-[#59677a] mb-1">Apellido Materno *</label>
                    <input
                      id="nuevo-apellido-materno"
                      appFormatoEntrada="nombre"
                      type="text"
                      [(ngModel)]="nuevoApellidoMaterno"
                      name="nuevoApellidoMaterno"
                      placeholder="Apellido Materno"
                      required
                      [readonly]="reniecExitoso()"
                      [class.bg-slate-100]="reniecExitoso()"
                      aria-describedby="nuevo-apellido-materno-help"
                      class="w-full h-11 px-3 text-xs rounded-xl border border-[#dce3ec] bg-white text-[#14213d] focus:outline-none focus:border-[#2563eb]"
                    />
                    <span id="nuevo-apellido-materno-help" class="sr-only">Apellido materno del empleado</span>
                  </div>
                </div>

                <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label for="nuevo-telefono" class="block text-xs font-semibold text-[#59677a] mb-1">Teléfono móvil / WhatsApp</label>
                    <input
                      id="nuevo-telefono"
                      inputmode="numeric"
                      appFormatoEntrada="celular"
                      type="text"
                      [(ngModel)]="nuevoTelefono"
                      name="nuevoTelefono"
                      placeholder="9 dígitos"
                      maxlength="9"
                      aria-describedby="nuevo-telefono-help"
                      class="w-full h-11 px-3 text-xs rounded-xl border border-[#dce3ec] bg-white text-[#14213d] focus:outline-none focus:border-[#2563eb]"
                    />
                    <span id="nuevo-telefono-help" class="sr-only">Teléfono móvil de 9 dígitos</span>
                  </div>
                  <div>
                    <label for="nuevo-direccion" class="block text-xs font-semibold text-[#59677a] mb-1">Dirección domiciliaria directa</label>
                    <input
                      id="nuevo-direccion"
                      appFormatoEntrada="direccion"
                      type="text"
                      [(ngModel)]="nuevoDireccion"
                      name="nuevoDireccion"
                      placeholder="Avenida, jirón, calle, número y distrito"
                      aria-describedby="nuevo-direccion-help"
                      class="w-full h-11 px-3 text-xs rounded-xl border border-[#dce3ec] bg-white text-[#14213d] focus:outline-none focus:border-[#2563eb]"
                    />
                    <span id="nuevo-direccion-help" class="sr-only">Dirección domiciliaria en texto libre</span>
                  </div>
                </div>
              </section>

              <!-- SECCIÓN 2: Asignación Institucional y Credenciales -->
              <section class="rounded-2xl border border-[#e5eaf2] bg-[#fcfdfe] p-4" aria-labelledby="sec-asignacion-institucional">
                <h3 id="sec-asignacion-institucional" class="text-xs font-bold uppercase tracking-wider text-[#76551f] mb-3 flex items-center gap-1.5">
                  <span class="size-2 rounded-full bg-[#c49a58]"></span>
                  2. Asignación Institucional y Credenciales de Acceso
                </h3>

                <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 mb-3">
                  <div>
                    <label for="nuevo-username" class="block text-xs font-semibold text-[#59677a] mb-1">Nombre de usuario *</label>
                    <input
                      id="nuevo-username"
                      type="text"
                      [(ngModel)]="nuevoUsername"
                      name="nuevoUsername"
                      placeholder="ej. juan.perez"
                      required
                      autocomplete="username"
                      aria-describedby="nuevo-username-help"
                      class="w-full h-11 px-3 text-xs rounded-xl border border-[#dce3ec] bg-white text-[#14213d] focus:outline-none focus:border-[#2563eb]"
                    />
                    <span id="nuevo-username-help" class="sr-only">Mínimo 3 caracteres</span>
                  </div>

                  <div>
                    <label for="nuevo-email" class="block text-xs font-semibold text-[#59677a] mb-1">Correo institucional *</label>
                    <input
                      id="nuevo-email"
                      appFormatoEntrada="correo"
                      type="email"
                      [(ngModel)]="nuevoEmail"
                      name="nuevoEmail"
                      placeholder="juan.perez@shuji.edu.pe"
                      required
                      autocomplete="email"
                      aria-describedby="nuevo-email-help"
                      class="w-full h-11 px-3 text-xs rounded-xl border border-[#dce3ec] bg-white text-[#14213d] focus:outline-none focus:border-[#2563eb]"
                    />
                    <span id="nuevo-email-help" class="sr-only">Correo electrónico institucional válido</span>
                  </div>

                  <div>
                    <label for="nuevo-password" class="block text-xs font-semibold text-[#59677a] mb-1">Contraseña temporal inicial *</label>
                    <input
                      id="nuevo-password"
                      type="password"
                      [(ngModel)]="nuevoPassword"
                      name="nuevoPassword"
                      placeholder="Mínimo 8 caracteres"
                      minlength="8"
                      required
                      autocomplete="new-password"
                      aria-describedby="nuevo-password-help"
                      class="w-full h-11 px-3 text-xs rounded-xl border border-[#dce3ec] bg-white text-[#14213d] focus:outline-none focus:border-[#2563eb]"
                    />
                    <span id="nuevo-password-help" class="text-[11px] text-[#64748b]">Mínimo 8 caracteres.</span>
                  </div>

                  <!-- SELECTOR DE ROLES: EXCLUYE TERMINANTEMENTE APODERADO -->
                  <div>
                    <label for="nuevo-rol" class="block text-xs font-semibold text-[#59677a] mb-1">Rol institucional del empleado *</label>
                    <select
                      id="nuevo-rol"
                      [(ngModel)]="nuevoRol"
                      name="nuevoRol"
                      class="w-full h-11 px-3 text-xs rounded-xl border border-[#dce3ec] bg-white text-[#14213d] focus:outline-none focus:border-[#2563eb]"
                    >
                      @for (rolOpt of rolesPermitidosParaCrearOEditar(); track rolOpt.codigo) {
                        <option [value]="rolOpt.codigo">{{ rolOpt.nombre }}</option>
                      }
                    </select>
                  </div>
                </div>

                @if (nuevoRol === 'DOCENTE') {
                  <div class="rounded-xl border border-[#dbeafe] bg-[#f8fbff] p-3 space-y-3">
                    <div class="flex flex-wrap items-center justify-between gap-2">
                      <span class="text-xs font-bold text-[#1e3a8a]">Cursos reales del docente (desde Base de Datos) *</span>
                      <div class="flex items-center gap-2">
                        <span class="text-[11px] text-[#475569]">1. Nivel → 2. Curso</span>
                        <button
                          type="button"
                          (click)="abrirSelectorCursosMasivo('crear')"
                          class="!min-h-8 px-2.5 py-1 rounded-lg bg-white border border-[#93c5fd] text-[#1d4ed8] text-[11px] font-semibold hover:bg-[#eff6ff] cursor-pointer transition-colors"
                        >
                          Selección masiva
                        </button>
                      </div>
                    </div>
                    <div class="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1.5fr_auto] sm:items-end">
                      <div>
                        <label for="nuevo-doc-nivel" class="block text-[11px] font-semibold text-[#59677a] mb-1">1. Nivel educativo</label>
                        <select
                          id="nuevo-doc-nivel"
                          [ngModel]="nuevoDocNivelId()"
                          (ngModelChange)="onNivelDocenteChange($event, 'crear')"
                          name="nuevoDocNivelId"
                          class="w-full h-11 px-3 text-xs rounded-xl border border-[#dce3ec] bg-white text-[#14213d] focus:outline-none focus:border-[#2563eb]"
                        >
                          <option [ngValue]="0">Selecciona nivel</option>
                          @for (n of nivelesCatalogo(); track n.id) {
                            <option [ngValue]="n.id">{{ n.nombre }}</option>
                          }
                        </select>
                      </div>
                      <div>
                        <label for="nuevo-doc-curso" class="block text-[11px] font-semibold text-[#59677a] mb-1">2. Curso disponible</label>
                        <select
                          id="nuevo-doc-curso"
                          [(ngModel)]="nuevoAreaPendienteId"
                          name="nuevoAreaPendienteId"
                          [disabled]="!nuevoDocNivelId()"
                          class="w-full h-11 px-3 text-xs rounded-xl border border-[#dce3ec] bg-white text-[#14213d] focus:outline-none focus:border-[#2563eb] disabled:opacity-50"
                        >
                          <option [ngValue]="0">{{ cursosDisponiblesCrear().length ? 'Selecciona curso' : 'Todos los cursos del nivel agregados' }}</option>
                          @for (a of cursosDisponiblesCrear(); track a.id) {
                            <option [ngValue]="a.id">{{ a.nombre }}</option>
                          }
                        </select>
                      </div>
                      <button
                        type="button"
                        (click)="agregarCursoSeleccionado('crear')"
                        [disabled]="!nuevoAreaPendienteId"
                        class="h-11 px-3 rounded-xl bg-[#1d4ed8] text-white text-xs font-semibold hover:bg-[#1e40af] disabled:opacity-40 cursor-pointer"
                      >
                        + Agregar
                      </button>
                    </div>
                    @if (cursosCrearSeleccionados().length > 0) {
                      <div class="flex flex-wrap items-center gap-1.5 pt-1">
                        @for (curso of cursosCrearSeleccionados(); track curso.id) {
                          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white border border-[#bfdbfe] text-[#1e40af]">
                            {{ curso.nivelNombre ? curso.nivelNombre + ' · ' : '' }}{{ curso.nombre }}
                            <button
                              type="button"
                              (click)="quitarCursoSeleccionado(curso.id, 'crear')"
                              class="!min-h-0 !h-5 !w-5 rounded-full text-rose-600 hover:bg-rose-50 font-bold cursor-pointer inline-flex items-center justify-center"
                              aria-label="Quitar curso"
                            >×</button>
                          </span>
                        }
                        @if (cursosCrearSeleccionados().length > 1) {
                          <button
                            type="button"
                            (click)="limpiarCursosSeleccionados('crear')"
                            class="!min-h-0 px-2 py-0.5 text-[11px] font-semibold text-rose-600 hover:underline cursor-pointer"
                          >
                            Quitar todos
                          </button>
                        }
                      </div>
                    } @else {
                      <p class="m-0 text-[11px] text-[#64748b]">Selecciona el nivel y curso (o usa Selección masiva) para habilitar al docente.</p>
                    }
                  </div>
                }

                <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  @if (nuevoRol !== 'DOCENTE') {
                    <div>
                      <label for="nuevo-especialidad" class="block text-xs font-semibold text-[#59677a] mb-1">Área / Cargo (opcional)</label>
                      <input
                        id="nuevo-especialidad"
                        type="text"
                        [(ngModel)]="nuevoEspecialidad"
                        name="nuevoEspecialidad"
                        placeholder="ej. Gestión Institucional"
                        maxlength="100"
                        class="w-full h-11 px-3 text-xs rounded-xl border border-[#dce3ec] bg-white text-[#14213d] focus:outline-none focus:border-[#2563eb]"
                      />
                    </div>
                  }

                  <div>
                    <label for="nuevo-tipo-contrato" class="block text-xs font-semibold text-[#59677a] mb-1">Tipo de Contrato</label>
                    <select
                      id="nuevo-tipo-contrato"
                      [(ngModel)]="nuevoTipoContrato"
                      name="nuevoTipoContrato"
                      class="w-full h-11 px-3 text-xs rounded-xl border border-[#dce3ec] bg-white text-[#14213d] focus:outline-none focus:border-[#2563eb]"
                    >
                      <option value="PLANILLA_COMPLETA">Planilla / Tiempo Completo</option>
                      <option value="PLAZO_FIJO">Plazo Fijo / Renovación Anual</option>
                      <option value="LOCACION_SERVICIOS">Locación de Servicios / SNP</option>
                      <option value="TIEMPO_PARCIAL">Tiempo Parcial por Horas</option>
                    </select>
                  </div>

                  <div>
                    <label for="nuevo-codigo-modular" class="block text-xs font-semibold text-[#59677a] mb-1">Código Modular</label>
                    <input
                      id="nuevo-codigo-modular"
                      type="text"
                      [(ngModel)]="nuevoCodigoModular"
                      name="nuevoCodigoModular"
                      placeholder="ej. CM-10928374"
                      class="w-full h-11 px-3 text-xs rounded-xl border border-[#dce3ec] bg-white text-[#14213d] focus:outline-none focus:border-[#2563eb]"
                    />
                  </div>

                  <div>
                    <label for="nuevo-colegiatura" class="block text-xs font-semibold text-[#59677a] mb-1">N° Colegiatura (opcional)</label>
                    <input
                      id="nuevo-colegiatura"
                      type="text"
                      [(ngModel)]="nuevoNumeroColegiatura"
                      name="nuevoNumeroColegiatura"
                      maxlength="20"
                      placeholder="ej. CPPe-12345"
                      class="w-full h-11 px-3 text-xs rounded-xl border border-[#dce3ec] bg-white text-[#14213d] focus:outline-none focus:border-[#2563eb]"
                    />
                  </div>
                </div>
              </section>

              <!-- SECCIÓN 3: Documentación laboral opcional (Legajo real) -->
              <details class="rounded-2xl border border-[#e5eaf2] bg-[#fcfdfe] p-4">
                <summary class="cursor-pointer text-sm font-semibold text-[#14213d]">
                  3. Documentación laboral · Opcional (Expediente PDF)
                </summary>
                <p class="mt-2 text-xs leading-5 text-slate-600">
                  Puedes registrar al docente con el expediente vacío o adjuntar archivos PDF reales (máx. 10 MB) que se enviarán al servidor al guardar el alta.
                </p>
                <div class="mt-3 grid gap-3 sm:grid-cols-3">
                  @for (doc of listaDocumentosLegajo(); track doc.tipo) {
                    <div class="rounded-xl border border-[#e2e8f0] bg-white p-3 flex flex-col justify-between gap-2">
                      <div>
                        <label [attr.for]="'legajo-archivo-' + doc.tipo" class="block text-xs font-bold text-[#14213d]">
                          {{ doc.etiqueta }}
                        </label>
                        @if (doc.estado === 'LISTO_PARA_SUBIR') {
                          <span class="mt-1 inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                            Archivo listo para subir al guardar
                          </span>
                        } @else if (doc.estado === 'VALIDADO_IA') {
                          <span class="mt-1 inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                            ✓ Validado en servidor
                          </span>
                        } @else if (doc.estado === 'OBSERVADO_IA') {
                          <span class="mt-1 inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                            ⚠ Observado en servidor
                          </span>
                        } @else if (doc.estado === 'PENDIENTE') {
                          <span class="text-xs text-slate-600">Guardado. Revisión pendiente.</span>
                        } @else {
                          <span class="mt-1 inline-block text-[11px] text-slate-500">Sin archivo seleccionado</span>
                        }
                        @if (doc.nombreArchivo) {
                          <p class="m-0 mt-1 truncate text-[11px] font-medium text-slate-700" [title]="doc.nombreArchivo">{{ doc.nombreArchivo }}</p>
                        }
                        @if (doc.observacion) {
                          <p class="m-0 mt-1 text-[11px] text-slate-500">{{ doc.observacion }}</p>
                        }
                      </div>
                      <input
                        [id]="'legajo-archivo-' + doc.tipo"
                        type="file"
                        accept="application/pdf,.pdf"
                        (change)="adjuntarDocumentoLegajo(doc.tipo, $event)"
                        class="block w-full text-[11px] text-slate-600 file:mr-2 file:rounded-lg file:border file:border-[#d0ddeb] file:bg-[#f8fafd] file:px-2.5 file:py-1 file:text-[11px] file:font-semibold file:text-[#184fae] hover:file:bg-[#eef3fb] cursor-pointer"
                      />
                    </div>
                  }
                </div>
              </details>
            </mat-dialog-content>
            <mat-dialog-actions align="end" class="!gap-2 !px-6 !pb-6 !pt-3 border-t border-[#edf0f5]">
              <button mat-button type="button" mat-dialog-close [disabled]="creando()">{{ altaRegistradaId() ? 'Cerrar' : 'Cancelar' }}</button>
              <button mat-flat-button color="primary" type="submit" [disabled]="creando() || (!altaRegistradaId() && (!nuevoUsername.trim() || !nuevoEmail.trim() || nuevoPassword.length < 8 || (esDniObligatorio() && nuevoDni.trim().length !== 8)))" class="box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]">
                {{ creando() ? 'Guardando…' : altaRegistradaId() ? 'Reintentar archivos' : 'Registrar empleado' }}
              </button>
            </mat-dialog-actions>
          </form>
        </div>
      </ng-template>

      <!-- REVOCAR ROL DIALOG -->
      <ng-template #confirmarRevocarRolDialog>
        <div class="school-dialog-container w-full max-w-md mx-auto p-6 bg-white rounded-2xl scrollbar-hidden">
          <h2 mat-dialog-title class="!px-0 !pt-0 !text-xl !font-bold !text-[#14213d] tracking-tight">Revocar Rol de Usuario</h2>
          <mat-dialog-content class="!px-0 !py-3 scrollbar-hidden">
            @if (usuarioPendienteRevocar(); as item) {
              <p class="text-sm text-slate-600">
                ¿Estás seguro de revocar el rol <strong class="text-rose-600 font-bold">{{ item.rol.codigo }}</strong> al usuario <strong class="text-[#14213d]">{{ item.usuario.username }}</strong>?
              </p>
              <div class="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                ⚠️ Esta acción quitará los privilegios operativos asociados a este rol y quedará registrada en la auditoría transaccional.
              </div>
            }
            @if (error()) {
              <p class="mt-3 rounded-xl border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-xs text-[#b91c1c]" role="alert">{{ error() }}</p>
            }
          </mat-dialog-content>
          <mat-dialog-actions align="end" class="!gap-2 !px-0 !pb-0 !pt-4 border-t border-[#edf0f5]">
            <button mat-button type="button" mat-dialog-close [disabled]="revocandoRol()">Cancelar</button>
            <button mat-flat-button color="warn" type="button" (click)="confirmarRevocarRol()" [disabled]="revocandoRol()">
              {{ revocandoRol() ? 'Revocando…' : 'Revocar Rol' }}
            </button>
          </mat-dialog-actions>
        </div>
      </ng-template>

      <!-- CORREGIR DNI DIALOG -->
      <ng-template #corregirDniDialog>
        <div class="school-dialog-container w-full max-w-md mx-auto p-6 bg-white rounded-2xl scrollbar-hidden">
          <h2 mat-dialog-title class="!px-0 !pt-0 !text-xl !font-bold !text-[#14213d] tracking-tight">Actualizar datos por DNI</h2>
          <mat-dialog-content class="!px-0 !py-3 scrollbar-hidden space-y-3">
            @if (usuarioPendienteDni(); as user) {
              <p class="text-xs text-slate-500 m-0">Usuario: <strong class="text-[#14213d]">{{ user.username }}</strong> ({{ user.email }})</p>
              <div>
                <label for="corregir-dni-nuevo" class="block text-xs font-semibold text-slate-700 mb-1">Nuevo DNI (8 dígitos) *</label>
                <div class="flex gap-2">
                  <input
                    id="corregir-dni-nuevo"
                    appFormatoEntrada="dni"
                    type="text"
                    [(ngModel)]="corregirDniNuevo"
                    (input)="onCorregirDniChange()"
                    maxlength="8"
                    minlength="8"
                    inputmode="numeric"
                    placeholder="Ej. 71234567"
                    aria-describedby="corregir-dni-help"
                    class="flex-1 rounded-xl border border-[#d9e1ec] px-3 py-2 text-sm text-[#14213d] focus:border-[#5b83d6] focus:outline-none"
                  />
                  <button
                    type="button"
                    (click)="consultarReniecCorregirDni()"
                    [disabled]="consultandoReniecCorregir() || corregirDniNuevo.length !== 8"
                    title="Consultar datos en RENIEC"
                    aria-label="Consultar datos en RENIEC"
                    class="h-[42px] w-[42px] shrink-0 rounded-xl bg-gradient-to-b from-[#1c477d] to-[#173B67] hover:from-[#173B67] hover:to-[#112d50] text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer group active:scale-95"
                  >
                    @if (consultandoReniecCorregir()) {
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
                <p id="corregir-dni-help" class="text-[11px] mt-1 text-slate-500">Consulta este DNI en RENIEC; el nombre verificado se guardará junto al usuario.</p>
                @if (reniecCorregirMensaje()) {
                  <p class="text-[11px] mt-1 text-emerald-800 bg-emerald-50 px-2 py-1 rounded font-medium">{{ reniecCorregirMensaje() }}</p>
                }
              </div>
              <div>
                <label for="corregir-dni-motivo" class="block text-xs font-semibold text-slate-700 mb-1">Motivo / Sustento de corrección (Auditoría) *</label>
                <textarea
                  id="corregir-dni-motivo"
                  [(ngModel)]="corregirDniMotivo"
                  rows="3"
                  maxlength="500"
                  placeholder="Indica el motivo de corrección formal y el documento de sustento."
                  class="w-full rounded-xl border border-[#d9e1ec] px-3 py-2 text-sm text-[#14213d] focus:border-[#5b83d6] focus:outline-none resize-none"
                ></textarea>
              </div>
            }
            @if (error()) {
              <p class="m-0 rounded-xl border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-xs text-[#b91c1c]" role="alert">{{ error() }}</p>
            }
          </mat-dialog-content>
          <mat-dialog-actions align="end" class="!gap-2 !px-0 !pb-0 !pt-4 border-t border-[#edf0f5]">
            <button mat-button type="button" mat-dialog-close [disabled]="guardandoDni()">Cancelar</button>
            <button
              mat-flat-button
              color="primary"
              type="button"
              (click)="confirmarCorregirDni()"
              [disabled]="guardandoDni() || corregirDniNuevo.length !== 8 || !corregirDniMotivo.trim()"
            >
              {{ guardandoDni() ? 'Guardando…' : 'Guardar Corrección' }}
            </button>
          </mat-dialog-actions>
        </div>
      </ng-template>

      <!-- DETALLES DE USUARIO DIALOG -->
      <ng-template #detallesUsuarioDialog>
        @if (usuarioDetalle(); as u) {
          <div class="school-dialog-container w-full max-w-2xl mx-auto flex flex-col max-h-[85vh] bg-white rounded-2xl overflow-hidden shadow-2xl border border-[#edf0f5]">
            <div class="px-6 py-4 border-b border-[#edf0f5] bg-[#f8fafc] flex items-center justify-between gap-4 shrink-0">
              <div class="flex items-center gap-3 min-w-0">
                <img
                  [src]="obtenerFotoUsuario(u)"
                  [alt]="u.nombreCompleto || u.username"
                  class="w-12 h-12 rounded-full object-cover border-2 border-slate-200 shrink-0"
                />
                <div class="min-w-0">
                  <h2 mat-dialog-title class="!m-0 !p-0 !text-lg !font-bold !text-[#14213d] tracking-tight truncate">
                    {{ u.nombreCompleto || u.username }}
                  </h2>
                  <p class="m-0 text-xs text-slate-500 truncate">
                    @{{ u.username }} · ID #{{ u.id }}
                  </p>
                </div>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                @if (u.activo) {
                  <span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-ui-success-bg border border-ui-success-border text-ui-success-text">ACTIVO</span>
                } @else {
                  <span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-ui-error-bg border border-ui-error-border text-ui-error-text">SUSPENDIDO</span>
                }
                <button type="button" mat-dialog-close class="!min-h-0 h-9 w-9 rounded-full hover:bg-slate-200/70 text-slate-500 flex items-center justify-center transition-colors cursor-pointer" aria-label="Cerrar diálogo">✕</button>
              </div>
            </div>

            <mat-dialog-content class="!px-6 !py-5 !max-h-none flex-1 overflow-y-auto scrollbar-hidden space-y-4">
              <section class="rounded-xl border border-[#e5eaf2] bg-[#fcfdfe] p-4 space-y-3">
                <h3 class="m-0 text-xs font-bold uppercase tracking-wider text-[#1e3a8a]">Datos personales y contacto</h3>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span class="block text-[11px] font-semibold text-slate-500">DNI</span>
                    <strong class="text-[#14213d] font-mono">{{ u.dni || 'No registrado' }}</strong>
                  </div>
                  <div>
                    <span class="block text-[11px] font-semibold text-slate-500">Correo electrónico</span>
                    <strong class="text-[#14213d] break-all">{{ u.email }}</strong>
                  </div>
                  <div>
                    <span class="block text-[11px] font-semibold text-slate-500">Teléfono</span>
                    <strong class="text-[#14213d]">{{ u.telefono || 'No registrado' }}</strong>
                  </div>
                  <div>
                    <span class="block text-[11px] font-semibold text-slate-500">Dirección</span>
                    <strong class="text-[#14213d]">{{ u.direccion || 'No registrada' }}</strong>
                  </div>
                </div>
              </section>

              <section class="rounded-xl border border-[#e5eaf2] bg-[#fcfdfe] p-4 space-y-3">
                <h3 class="m-0 text-xs font-bold uppercase tracking-wider text-[#1e3a8a]">Ficha laboral y académica</h3>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span class="block text-[11px] font-semibold text-slate-500">Tipo de contrato</span>
                    <strong class="text-[#14213d]">{{ u.tipoContrato || 'Sin especificar' }}</strong>
                  </div>
                  <div>
                    <span class="block text-[11px] font-semibold text-slate-500">Estado laboral</span>
                    <strong class="text-[#14213d]">{{ u.estadoLaboral || (u.activo ? 'ACTIVO' : 'SUSPENDIDO') }}</strong>
                  </div>
                  <div>
                    <span class="block text-[11px] font-semibold text-slate-500">Código modular</span>
                    <strong class="text-[#14213d] font-mono">{{ u.codigoModular || 'No registrado' }}</strong>
                  </div>
                  <div>
                    <span class="block text-[11px] font-semibold text-slate-500">N° Colegiatura</span>
                    <strong class="text-[#14213d] font-mono">{{ u.numeroColegiatura || 'No registrado' }}</strong>
                  </div>
                  <div class="sm:col-span-2">
                    <span class="block text-[11px] font-semibold text-slate-500 mb-1">Roles asignados</span>
                    <div class="flex flex-wrap gap-1.5">
                      @for (r of u.roles; track r.codigo) {
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-ui-info-bg text-ui-info-text border border-ui-info-border">{{ r.codigo }}</span>
                      }
                    </div>
                  </div>
                  <div class="sm:col-span-2">
                    <span class="block text-[11px] font-semibold text-slate-500 mb-1">Especialidad / Cursos asignados</span>
                    @if ((u.areasCurriculares?.length ?? 0) > 0) {
                      <div class="flex flex-wrap gap-1.5">
                        @for (area of u.areasCurriculares!; track area.id) {
                          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-900 border border-amber-200">
                            {{ area.nivelNombre ? area.nivelNombre + ' · ' : '' }}{{ area.nombre }}
                          </span>
                        }
                      </div>
                    } @else {
                      <strong class="text-[#14213d]">{{ u.especialidad || 'Sin especialidad registrada' }}</strong>
                    }
                  </div>
                </div>
              </section>

              <section class="rounded-xl border border-[#e5eaf2] bg-[#f8fafc] p-4 space-y-2 text-xs">
                <h3 class="m-0 text-xs font-bold uppercase tracking-wider text-slate-600">Auditoría y seguridad</h3>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span class="block text-[11px] font-semibold text-slate-500">Fecha de creación</span>
                    <strong class="text-[#14213d] font-mono">{{ u.createdAt ? (u.createdAt | uiDatePe:true) : '-' }}</strong>
                  </div>
                  <div>
                    <span class="block text-[11px] font-semibold text-slate-500">Última actualización</span>
                    <strong class="text-[#14213d] font-mono">{{ u.updatedAt ? (u.updatedAt | uiDatePe:true) : '-' }}</strong>
                  </div>
                </div>
                <p class="m-0 pt-1 text-[11px] text-slate-500">
                  La contraseña se almacena cifrada en PostgreSQL; por seguridad no es visible y solo puede restablecerse desde "Editar".
                </p>
              </section>
            </mat-dialog-content>

            <mat-dialog-actions align="end" class="!gap-2 !px-6 !py-4 border-t border-[#edf0f5] bg-[#f8fafc] shrink-0">
              <button mat-button type="button" mat-dialog-close>Cerrar</button>
              @if (puedeGestionarUsuario(u)) {
                <button mat-flat-button color="primary" type="button" (click)="editarDesdeDetalles()">
                  Editar usuario
                </button>
              }
            </mat-dialog-actions>
          </div>
        }
      </ng-template>

      <!-- EDITAR USUARIO COMPLETO DIALOG -->
      <ng-template #editarUsuarioDialog>
        <div class="school-dialog-container w-full max-w-3xl mx-auto flex flex-col max-h-[85vh] bg-white rounded-2xl overflow-hidden shadow-2xl border border-[#edf0f5]">
          <div class="px-6 py-4 border-b border-[#edf0f5] bg-[#f8fafc] flex items-center justify-between shrink-0">
            <div>
              <h2 mat-dialog-title class="!m-0 !p-0 !text-lg !font-bold !text-[#14213d] tracking-tight">Editar Usuario Institucional</h2>
              @if (usuarioEditando(); as u) {
                <p class="m-0 text-xs text-slate-500">Usuario: <strong class="text-[#14213d]">{{ u.username }}</strong> · ID #{{ u.id }}</p>
              }
            </div>
            <button type="button" mat-dialog-close class="!min-h-0 h-9 w-9 rounded-full hover:bg-slate-200/70 text-slate-500 flex items-center justify-center transition-colors" aria-label="Cerrar diálogo">✕</button>
          </div>

          <mat-dialog-content class="!px-6 !py-4 !max-h-none flex-1 overflow-y-auto scrollbar-hidden space-y-4">
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label for="edit-dni" class="block text-xs font-semibold text-[#59677a] mb-1">
                  DNI (8 dígitos) {{ editRoles().includes('DOCENTE') ? '*' : '' }}
                </label>
                <div class="flex gap-2">
                  <input
                    id="edit-dni"
                    name="editDni"
                    appFormatoEntrada="dni"
                    type="text"
                    [(ngModel)]="editDni"
                    maxlength="8"
                    inputmode="numeric"
                    placeholder="8 dígitos"
                    class="flex-1 h-11 px-3 text-xs rounded-xl border border-[#dce3ec] bg-white text-[#14213d] focus:outline-none focus:border-[#2563eb]"
                  />
                  <button
                    type="button"
                    (click)="consultarReniecEditar()"
                    [disabled]="consultandoReniecEditar() || editDni.trim().length !== 8"
                    title="Consultar nombre en RENIEC"
                    class="h-11 px-3 rounded-xl bg-[#1c477d] text-white text-xs font-semibold hover:bg-[#15355e] disabled:opacity-40 cursor-pointer"
                  >
                    {{ consultandoReniecEditar() ? '...' : 'RENIEC' }}
                  </button>
                </div>
                @if (reniecEditarMensaje()) {
                  <p class="m-0 mt-1 text-[11px] text-emerald-700">{{ reniecEditarMensaje() }}</p>
                }
              </div>

              <div>
                <label for="edit-nombre" class="block text-xs font-semibold text-[#59677a] mb-1">Nombre completo *</label>
                <input
                  id="edit-nombre"
                  name="editNombreCompleto"
                  type="text"
                  [(ngModel)]="editNombreCompleto"
                  maxlength="200"
                  placeholder="Nombres y apellidos completos"
                  class="w-full h-11 px-3 text-xs rounded-xl border border-[#dce3ec] bg-white text-[#14213d] focus:outline-none focus:border-[#2563eb]"
                />
              </div>

              <div>
                <label for="edit-email" class="block text-xs font-semibold text-[#59677a] mb-1">Correo electrónico *</label>
                <input
                  id="edit-email"
                  name="editEmail"
                  type="email"
                  [(ngModel)]="editEmail"
                  maxlength="100"
                  placeholder="usuario@shuji.edu.pe"
                  class="w-full h-11 px-3 text-xs rounded-xl border border-[#dce3ec] bg-white text-[#14213d] focus:outline-none focus:border-[#2563eb]"
                />
              </div>

              <div>
                <label for="edit-telefono" class="block text-xs font-semibold text-[#59677a] mb-1">Teléfono</label>
                <input
                  id="edit-telefono"
                  name="editTelefono"
                  type="text"
                  [(ngModel)]="editTelefono"
                  maxlength="15"
                  placeholder="9 dígitos"
                  class="w-full h-11 px-3 text-xs rounded-xl border border-[#dce3ec] bg-white text-[#14213d] focus:outline-none focus:border-[#2563eb]"
                />
              </div>

              <div class="sm:col-span-2">
                <label for="edit-direccion" class="block text-xs font-semibold text-[#59677a] mb-1">Dirección</label>
                <input
                  id="edit-direccion"
                  name="editDireccion"
                  type="text"
                  [(ngModel)]="editDireccion"
                  maxlength="150"
                  placeholder="Dirección domiciliaria"
                  class="w-full h-11 px-3 text-xs rounded-xl border border-[#dce3ec] bg-white text-[#14213d] focus:outline-none focus:border-[#2563eb]"
                />
              </div>

              <div>
                <label for="edit-tipo-contrato" class="block text-xs font-semibold text-[#59677a] mb-1">Tipo de Contrato</label>
                <select
                  id="edit-tipo-contrato"
                  name="editTipoContrato"
                  [(ngModel)]="editTipoContrato"
                  class="w-full h-11 px-3 text-xs rounded-xl border border-[#dce3ec] bg-white text-[#14213d] focus:outline-none focus:border-[#2563eb]"
                >
                  <option value="">Sin especificar</option>
                  <option value="PLANILLA_COMPLETA">Planilla / Tiempo Completo</option>
                  <option value="PLAZO_FIJO">Plazo Fijo / Renovación Anual</option>
                  <option value="LOCACION_SERVICIOS">Locación de Servicios / SNP</option>
                  <option value="TIEMPO_PARCIAL">Tiempo Parcial por Horas</option>
                  @if (editTipoContrato && !['PLANILLA_COMPLETA', 'PLAZO_FIJO', 'LOCACION_SERVICIOS', 'TIEMPO_PARCIAL'].includes(editTipoContrato)) {
                    <option [value]="editTipoContrato">{{ editTipoContrato }}</option>
                  }
                </select>
              </div>

              <div>
                <label for="edit-estado-laboral" class="block text-xs font-semibold text-[#59677a] mb-1">Estado Laboral</label>
                <select
                  id="edit-estado-laboral"
                  name="editEstadoLaboral"
                  [(ngModel)]="editEstadoLaboral"
                  class="w-full h-11 px-3 text-xs rounded-xl border border-[#dce3ec] bg-white text-[#14213d] focus:outline-none focus:border-[#2563eb]"
                >
                  <option value="ACTIVO">ACTIVO</option>
                  <option value="SUSPENDIDO">SUSPENDIDO</option>
                  <option value="CESADO">CESADO</option>
                  <option value="INACTIVO">INACTIVO</option>
                </select>
              </div>

              <div>
                <label for="edit-codigo-modular" class="block text-xs font-semibold text-[#59677a] mb-1">Código Modular</label>
                <input
                  id="edit-codigo-modular"
                  name="editCodigoModular"
                  type="text"
                  [(ngModel)]="editCodigoModular"
                  maxlength="20"
                  placeholder="ej. CM-10928374"
                  class="w-full h-11 px-3 text-xs rounded-xl border border-[#dce3ec] bg-white text-[#14213d] focus:outline-none focus:border-[#2563eb]"
                />
              </div>

              <div>
                <label for="edit-colegiatura" class="block text-xs font-semibold text-[#59677a] mb-1">N° Colegiatura</label>
                <input
                  id="edit-colegiatura"
                  name="editNumeroColegiatura"
                  type="text"
                  [(ngModel)]="editNumeroColegiatura"
                  maxlength="20"
                  placeholder="ej. CPPe-12345"
                  class="w-full h-11 px-3 text-xs rounded-xl border border-[#dce3ec] bg-white text-[#14213d] focus:outline-none focus:border-[#2563eb]"
                />
              </div>

              <div class="sm:col-span-2">
                <label for="edit-password-nuevo" class="block text-xs font-semibold text-[#59677a] mb-1">Nueva contraseña (opcional · dejar vacío para mantener la actual)</label>
                <input
                  id="edit-password-nuevo"
                  name="editPasswordNuevo"
                  type="password"
                  [(ngModel)]="editPasswordNuevo"
                  autocomplete="new-password"
                  maxlength="100"
                  placeholder="Mínimo 8 caracteres solo si deseas restablecer clave"
                  class="w-full h-11 px-3 text-xs rounded-xl border border-[#dce3ec] bg-white text-[#14213d] focus:outline-none focus:border-[#2563eb]"
                />
              </div>
            </div>

            <div class="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3 space-y-2">
              <span class="block text-xs font-bold text-[#14213d]">Roles institucionales asignados *</span>
              <div class="flex flex-wrap gap-2">
                @for (rolOpt of rolesPermitidosParaCrearOEditar(); track rolOpt.codigo) {
                  <button
                    type="button"
                    (click)="toggleEditRol(rolOpt.codigo)"
                    [class]="editRoles().includes(rolOpt.codigo)
                      ? 'bg-[#1d4ed8] text-white border-[#1d4ed8]'
                      : 'bg-white text-[#334155] border-[#cbd5e1]'"
                    class="!min-h-9 px-3 py-1 rounded-full border text-xs font-semibold cursor-pointer transition-colors"
                  >
                    {{ editRoles().includes(rolOpt.codigo) ? '✓ ' : '' }}{{ rolOpt.nombre }}
                  </button>
                }
              </div>
            </div>

            @if (editRoles().includes('DOCENTE')) {
              <div class="rounded-xl border border-[#dbeafe] bg-[#f8fbff] p-3 space-y-3">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <span class="text-xs font-bold text-[#1e3a8a]">Cursos reales habilitados para el docente *</span>
                  <div class="flex items-center gap-2">
                    <span class="text-[11px] text-[#475569]">1. Nivel → 2. Curso</span>
                    <button
                      type="button"
                      (click)="abrirSelectorCursosMasivo('editar')"
                      class="!min-h-8 px-2.5 py-1 rounded-lg bg-white border border-[#93c5fd] text-[#1d4ed8] text-[11px] font-semibold hover:bg-[#eff6ff] cursor-pointer transition-colors"
                    >
                      Selección masiva
                    </button>
                  </div>
                </div>
                <div class="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1.5fr_auto] sm:items-end">
                  <div>
                    <label for="edit-doc-nivel" class="block text-[11px] font-semibold text-[#59677a] mb-1">1. Nivel educativo</label>
                    <select
                      id="edit-doc-nivel"
                      [ngModel]="editDocNivelId()"
                      (ngModelChange)="onNivelDocenteChange($event, 'editar')"
                      name="editDocNivelId"
                      class="w-full h-11 px-3 text-xs rounded-xl border border-[#dce3ec] bg-white text-[#14213d] focus:outline-none focus:border-[#2563eb]"
                    >
                      <option [ngValue]="0">Selecciona nivel</option>
                      @for (n of nivelesCatalogo(); track n.id) {
                        <option [ngValue]="n.id">{{ n.nombre }}</option>
                      }
                    </select>
                  </div>
                  <div>
                    <label for="edit-doc-curso" class="block text-[11px] font-semibold text-[#59677a] mb-1">2. Curso disponible</label>
                    <select
                      id="edit-doc-curso"
                      [(ngModel)]="editAreaPendienteId"
                      name="editAreaPendienteId"
                      [disabled]="!editDocNivelId()"
                      class="w-full h-11 px-3 text-xs rounded-xl border border-[#dce3ec] bg-white text-[#14213d] focus:outline-none focus:border-[#2563eb] disabled:opacity-50"
                    >
                      <option [ngValue]="0">{{ cursosDisponiblesEditar().length ? 'Selecciona curso' : 'Todos los cursos del nivel agregados' }}</option>
                      @for (a of cursosDisponiblesEditar(); track a.id) {
                        <option [ngValue]="a.id">{{ a.nombre }}</option>
                      }
                    </select>
                  </div>
                  <button
                    type="button"
                    (click)="agregarCursoSeleccionado('editar')"
                    [disabled]="!editAreaPendienteId"
                    class="h-11 px-3 rounded-xl bg-[#1d4ed8] text-white text-xs font-semibold hover:bg-[#1e40af] disabled:opacity-40 cursor-pointer"
                  >
                    + Agregar
                  </button>
                </div>
                @if (editCursosSeleccionados().length > 0) {
                  <div class="flex flex-wrap items-center gap-1.5 pt-1">
                    @for (curso of editCursosSeleccionados(); track curso.id) {
                      <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white border border-[#bfdbfe] text-[#1e40af]">
                        {{ curso.nivelNombre ? curso.nivelNombre + ' · ' : '' }}{{ curso.nombre }}
                        <button
                          type="button"
                          (click)="quitarCursoSeleccionado(curso.id, 'editar')"
                          class="!min-h-0 !h-5 !w-5 rounded-full text-rose-600 hover:bg-rose-50 font-bold cursor-pointer inline-flex items-center justify-center"
                          aria-label="Quitar curso"
                        >×</button>
                      </span>
                    }
                    @if (editCursosSeleccionados().length > 1) {
                      <button
                        type="button"
                        (click)="limpiarCursosSeleccionados('editar')"
                        class="!min-h-0 px-2 py-0.5 text-[11px] font-semibold text-rose-600 hover:underline cursor-pointer"
                      >
                        Quitar todos
                      </button>
                    }
                  </div>
                } @else {
                  <p class="m-0 text-[11px] text-amber-700">Agrega al menos un curso real (o usa Selección masiva) para el docente.</p>
                }
              </div>
            } @else {
              <div>
                <label for="edit-especialidad-texto" class="block text-xs font-semibold text-[#59677a] mb-1">Área / Especialidad (texto)</label>
                <input
                  id="edit-especialidad-texto"
                  type="text"
                  [(ngModel)]="editEspecialidad"
                  maxlength="100"
                  placeholder="ej. Gestión Institucional"
                  class="w-full h-11 px-3 text-xs rounded-xl border border-[#dce3ec] bg-white text-[#14213d] focus:outline-none focus:border-[#2563eb]"
                />
              </div>
            }

            @if (error()) {
              <p class="m-0 rounded-xl border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-xs text-[#b91c1c]" role="alert">{{ error() }}</p>
            }
          </mat-dialog-content>

          <mat-dialog-actions align="end" class="!gap-2 !px-6 !py-4 border-t border-[#edf0f5] bg-[#f8fafc] shrink-0">
            <button mat-button type="button" mat-dialog-close [disabled]="guardandoEdicion()">Cancelar</button>
            <button
              mat-flat-button
              color="primary"
              type="button"
              (click)="guardarEdicionUsuario()"
              [disabled]="guardandoEdicion()"
            >
              {{ guardandoEdicion() ? 'Guardando…' : 'Guardar cambios' }}
            </button>
          </mat-dialog-actions>
        </div>
      </ng-template>

      <!-- CONFIRMAR ESTADO DIALOG -->
      <ng-template #confirmarEstadoDialog>
        <h2 mat-dialog-title class="!px-6 !pt-6 !text-xl !font-semibold !tracking-tight !text-ui-text tracking-[-.025em]">{{ usuarioPendienteEstado()?.activo ? 'Suspender usuario' : 'Activar usuario' }}</h2>
        <mat-dialog-content class="!px-6 !pt-3">
          <p class="text-sm leading-6 text-ui-muted">{{ usuarioPendienteEstado()?.activo ? 'La cuenta perderá el acceso al portal.' : 'La cuenta recuperará el acceso según sus roles asignados.' }}</p>
          @if (usuarioPendienteEstado()) { <p class="mt-3 break-all text-sm font-semibold text-ui-text">{{ usuarioPendienteEstado()!.email }}</p> }
          @if (error()) { <p class="m-0 rounded-xl border border-ui-error-border bg-ui-error-bg px-3 py-[10px] text-xs text-ui-error-text mt-4" role="alert">{{ error() }}</p> }
        </mat-dialog-content>
        <mat-dialog-actions align="end" class="!gap-2 !px-6 !pb-6">
          <button mat-button type="button" mat-dialog-close [disabled]="actualizandoEstado()">Cancelar</button>
          <button mat-flat-button color="primary" type="button" (click)="confirmarCambioEstado()" [disabled]="actualizandoEstado()" class="box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]">{{ actualizandoEstado() ? 'Actualizando…' : 'Confirmar' }}</button>
        </mat-dialog-actions>
      </ng-template>

      <!-- MINI-MODAL SELECCIÓN MASIVA DE CURSOS -->
      <ng-template #selectorCursosDocenteDialog>
        <div class="school-dialog-container w-full max-w-2xl mx-auto flex flex-col max-h-[82vh] bg-white rounded-2xl overflow-hidden shadow-2xl border border-[#edf0f5]">
          <div class="px-5 py-4 border-b border-[#edf0f5] bg-[#f8fafc] flex items-center justify-between shrink-0">
            <div>
              <h2 mat-dialog-title class="!m-0 !p-0 !text-base !font-bold !text-[#14213d]">Selección masiva de cursos</h2>
              <p class="m-0 text-xs text-slate-500">Marca o desmarca todos los cursos que dictará el docente por nivel educativo.</p>
            </div>
            <button type="button" mat-dialog-close class="!min-h-0 h-8 w-8 rounded-full hover:bg-slate-200/70 text-slate-500 flex items-center justify-center cursor-pointer" aria-label="Cerrar selector">✕</button>
          </div>

          <mat-dialog-content class="!px-5 !py-4 !max-h-none flex-1 overflow-y-auto scrollbar-hidden space-y-4">
            <div class="flex flex-wrap gap-2">
              @for (nivel of nivelesCatalogo(); track nivel.id) {
                <button
                  type="button"
                  (click)="nivelTabMasivo.set(nivel.id)"
                  [class]="nivelTabMasivo() === nivel.id
                    ? 'bg-[#1d4ed8] text-white border-[#1d4ed8]'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'"
                  class="!min-h-9 px-3 py-1.5 rounded-full border text-xs font-semibold cursor-pointer transition-colors"
                >
                  {{ nivel.nombre }} · {{ conteoSeleccionadosPorNivel(nivel.id) }}/{{ areasDeNivel(nivel.id).length }}
                </button>
              }
            </div>

            @if (cargandoCursosMasivo()) {
              <div class="py-8 text-center text-xs text-slate-500">Cargando catálogo completo de cursos…</div>
            } @else {
              <div class="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2">
                <span class="text-xs font-semibold text-slate-700">Acciones rápidas del nivel</span>
                <div class="flex flex-wrap gap-2">
                  <button
                    type="button"
                    (click)="seleccionarTodosNivelMasivo()"
                    class="!min-h-8 px-2.5 py-1 rounded-lg bg-[#eff6ff] border border-[#bfdbfe] text-[#1d4ed8] text-[11px] font-semibold hover:bg-[#dbeafe] cursor-pointer"
                  >
                    Seleccionar todos del nivel
                  </button>
                  <button
                    type="button"
                    (click)="quitarTodosNivelMasivo()"
                    class="!min-h-8 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 text-[11px] font-semibold hover:bg-slate-100 cursor-pointer"
                  >
                    Quitar nivel
                  </button>
                  <button
                    type="button"
                    (click)="limpiarSeleccionMasiva()"
                    class="!min-h-8 px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-semibold hover:bg-rose-100 cursor-pointer"
                  >
                    Limpiar todo
                  </button>
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                @for (area of areasDeNivel(nivelTabMasivo()); track area.id) {
                  <button
                    type="button"
                    (click)="toggleCursoMasivo(area.id)"
                    [class]="seleccionMasivaIds().has(area.id)
                      ? 'bg-[#eff6ff] border-[#2563eb] text-[#1e3a8a]'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'"
                    class="!min-h-11 px-3 py-2 rounded-xl border text-left text-xs font-semibold flex items-center justify-between gap-2 cursor-pointer transition-colors"
                  >
                    <span class="truncate">{{ area.nombre }}</span>
                    <span
                      [class]="seleccionMasivaIds().has(area.id)
                        ? 'bg-[#1d4ed8] text-white border-[#1d4ed8]'
                        : 'bg-white text-transparent border-slate-300'"
                      class="h-5 w-5 rounded-md border flex items-center justify-center text-[11px] shrink-0"
                    >✓</span>
                  </button>
                } @empty {
                  <p class="col-span-full m-0 py-4 text-center text-xs text-slate-500">No hay cursos registrados para este nivel.</p>
                }
              </div>
            }
          </mat-dialog-content>

          <mat-dialog-actions align="end" class="!justify-between !gap-2 !px-5 !py-3.5 border-t border-[#edf0f5] bg-[#f8fafc] shrink-0">
            <span class="text-xs font-semibold text-slate-600">{{ seleccionMasivaIds().size }} curso(s) seleccionado(s)</span>
            <div class="flex items-center gap-2">
              <button mat-button type="button" mat-dialog-close>Cancelar</button>
              <button mat-flat-button color="primary" type="button" (click)="confirmarCursosMasivos()">
                Aplicar cursos
              </button>
            </div>
          </mat-dialog-actions>
        </div>
      </ng-template>
    </div>
  `
})
export class UsuariosComponent implements OnInit {
  readonly obtenerFotoUsuario = obtenerFotoUsuario;
  private readonly dialog = inject(MatDialog);
  private readonly usuarioService = inject(UsuarioService);
  readonly store = inject(AuthStore);

  @ViewChild('crearUsuarioDialog') private crearUsuarioDialog!: TemplateRef<unknown>;
  @ViewChild('confirmarEstadoDialog') private confirmarEstadoDialog!: TemplateRef<unknown>;
  @ViewChild('confirmarRevocarRolDialog') private confirmarRevocarRolDialog!: TemplateRef<unknown>;
  @ViewChild('corregirDniDialog') private corregirDniDialog!: TemplateRef<unknown>;
  @ViewChild('editarUsuarioDialog') private editarUsuarioDialog!: TemplateRef<unknown>;
  @ViewChild('detallesUsuarioDialog') private detallesUsuarioDialog!: TemplateRef<unknown>;
  @ViewChild('selectorCursosDocenteDialog') private selectorCursosDocenteDialog!: TemplateRef<unknown>;
  private dialogRef?: MatDialogRef<unknown>;
  private estadoDialogRef?: MatDialogRef<unknown>;
  private revocarRolDialogRef?: MatDialogRef<unknown>;
  private corregirDniDialogRef?: MatDialogRef<unknown>;
  private editarUsuarioDialogRef?: MatDialogRef<unknown>;
  private detallesUsuarioDialogRef?: MatDialogRef<unknown>;
  private selectorCursosDialogRef?: MatDialogRef<unknown>;

  readonly usuarioPendienteRevocar = signal<{ usuario: UserResponseDto; rol: { id: number; codigo: string } } | null>(null);
  readonly revocandoRol = signal(false);
  readonly usuarioPendienteDni = signal<UserResponseDto | null>(null);
  corregirDniNuevo = '';
  corregirDniMotivo = '';
  nombreCompletoCorregirDni = '';
  readonly consultandoReniecCorregir = signal(false);
  readonly reniecCorregirMensaje = signal('');
  readonly guardandoDni = signal(false);
  readonly error = signal<string | null>(null);
  readonly creando = signal(false);
  readonly actualizandoEstado = signal(false);
  readonly usuarioPendienteEstado = signal<UserResponseDto | null>(null);

  cargando = signal(false);
  readonly usuarios = signal<UserResponseDto[]>([]);
  readonly nivelesCatalogo = signal<NivelResponseDto[]>([]);
  readonly areasPorNivel = signal<Record<number, Array<{ id: number; nivelId: number; codigo: string; nombre: string }>>>({});

  readonly usuarioEditando = signal<UserResponseDto | null>(null);
  readonly usuarioDetalle = signal<UserResponseDto | null>(null);
  readonly guardandoEdicion = signal(false);
  readonly consultandoReniecEditar = signal(false);
  readonly reniecEditarMensaje = signal('');
  editDni = '';
  editNombreCompleto = '';
  editEmail = '';
  editTelefono = '';
  editDireccion = '';
  editTipoContrato = '';
  editEstadoLaboral: 'ACTIVO' | 'SUSPENDIDO' | 'CESADO' | 'INACTIVO' = 'ACTIVO';
  editCodigoModular = '';
  editNumeroColegiatura = '';
  editEspecialidad = '';
  editPasswordNuevo = '';
  readonly editRoles = signal<RolNombre[]>([]);
  readonly editDocNivelId = signal<number>(0);
  editAreaPendienteId = 0;
  readonly editCursosSeleccionados = signal<AreaDocenteDto[]>([]);

  readonly nuevoDocNivelId = signal<number>(0);
  nuevoAreaPendienteId = 0;
  readonly cursosCrearSeleccionados = signal<AreaDocenteDto[]>([]);

  readonly modoSelectorMasivo = signal<'crear' | 'editar'>('editar');
  readonly nivelTabMasivo = signal<number>(0);
  readonly seleccionMasivaIds = signal<Set<number>>(new Set());
  readonly cargandoCursosMasivo = signal(false);

  readonly cursosDisponiblesCrear = computed(() =>
    this.resolverCursosDisponibles(this.nuevoDocNivelId(), this.cursosCrearSeleccionados())
  );
  readonly cursosDisponiblesEditar = computed(() =>
    this.resolverCursosDisponibles(this.editDocNivelId(), this.editCursosSeleccionados())
  );

  filtroRol = '';
  readonly filtroEspecialidad = signal('');
  readonly filtroEstado = signal<'' | 'ACTIVO' | 'SUSPENDIDO'>('');
  readonly opcionesFiltroEspecialidad = computed(() => {
    const set = new Set<string>();
    for (const u of this.usuarios()) {
      for (const a of u.areasCurriculares ?? []) {
        if (a.nombre) set.add(a.nombre);
      }
      if (u.especialidad && u.especialidad.trim()) {
        set.add(u.especialidad.trim());
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
  });
  readonly usuariosFiltrados = computed(() => {
    const esp = this.filtroEspecialidad().trim();
    const est = this.filtroEstado();
    return this.usuarios().filter(u => {
      if (esp) {
        const matchEsp = (u.especialidad ?? '') === esp;
        const matchCurso = (u.areasCurriculares ?? []).some(a => a.nombre === esp || a.codigo === esp);
        if (!matchEsp && !matchCurso) return false;
      }
      if (est === 'ACTIVO' && !u.activo) return false;
      if (est === 'SUSPENDIDO' && u.activo) return false;
      return true;
    });
  });

  readonly paginaActual = signal<number>(1);
  readonly tamanoPagina = signal<number>(10);
  readonly usuariosPaginados = computed<UserResponseDto[]>(() =>
    paginarRegistros(this.usuariosFiltrados(), this.paginaActual(), this.tamanoPagina())
  );

  cambiarPagina(nuevaPagina: number): void {
    this.paginaActual.set(nuevaPagina);
  }

  // Credenciales y Rol
  nuevoUsername = '';
  nuevoEmail = '';
  nuevoPassword = '';
  nuevoRol: RolNombre = 'DOCENTE';
  readonly altaRegistradaId = signal<number | null>(null);

  // Expediente Laboral y RENIEC
  nuevoDni = '';
  readonly dniError = signal<string | null>(null);
  nuevoNombres = '';
  nuevoApellidoPaterno = '';
  nuevoApellidoMaterno = '';
  nuevoTelefono = '';
  nuevoDireccion = '';
  nuevoTipoContrato = 'PLANILLA_COMPLETA';
  nuevoEspecialidad = '';
  nuevoCodigoModular = '';
  nuevoNumeroColegiatura = '';

  readonly documentosLegajo = signal<Record<TipoDocumentoLegajo, ItemLegajoLocal>>({
    CV: { tipo: 'CV', etiqueta: 'Currículum vitae (PDF)', archivo: null, nombreArchivo: null, estado: 'SIN_ARCHIVO', observacion: null },
    TITULO: { tipo: 'TITULO', etiqueta: 'Título profesional (PDF)', archivo: null, nombreArchivo: null, estado: 'SIN_ARCHIVO', observacion: null },
    ANTECEDENTES: { tipo: 'ANTECEDENTES', etiqueta: 'Certificado de antecedentes (PDF)', archivo: null, nombreArchivo: null, estado: 'SIN_ARCHIVO', observacion: null }
  });
  readonly listaDocumentosLegajo = computed(() => [
    this.documentosLegajo().CV,
    this.documentosLegajo().TITULO,
    this.documentosLegajo().ANTECEDENTES
  ]);

  consultandoReniec = signal(false);
  reniecExitoso = signal(false);
  mensajeReniec = signal('');

  esDniObligatorio(): boolean {
    return this.nuevoRol === 'DOCENTE' || ['DOCENTE', 'TUTOR', 'AUXILIAR', 'SECRETARIA', 'DIRECCION'].includes(this.nuevoRol);
  }

  private reiniciarLegajo(): void {
    this.documentosLegajo.set({
      CV: { tipo: 'CV', etiqueta: 'Currículum vitae (PDF)', archivo: null, nombreArchivo: null, estado: 'SIN_ARCHIVO', observacion: null },
      TITULO: { tipo: 'TITULO', etiqueta: 'Título profesional (PDF)', archivo: null, nombreArchivo: null, estado: 'SIN_ARCHIVO', observacion: null },
      ANTECEDENTES: { tipo: 'ANTECEDENTES', etiqueta: 'Certificado de antecedentes (PDF)', archivo: null, nombreArchivo: null, estado: 'SIN_ARCHIVO', observacion: null }
    });
  }

  adjuntarDocumentoLegajo(tipo: TipoDocumentoLegajo, event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0] ?? null;
    if (!file) {
      this.documentosLegajo.update(actual => ({
        ...actual,
        [tipo]: { ...actual[tipo], archivo: null, nombreArchivo: null, estado: 'SIN_ARCHIVO', observacion: null }
      }));
      return;
    }
    const esPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    if (!esPdf || file.size > 10 * 1024 * 1024) {
      this.error.set('Adjunta un archivo PDF válido de hasta 10 MB.');
      if (input) input.value = '';
      return;
    }
    this.error.set(null);
    this.documentosLegajo.update(actual => ({
      ...actual,
      [tipo]: {
        ...actual[tipo],
        archivo: file,
        nombreArchivo: file.name,
        estado: 'LISTO_PARA_SUBIR',
        observacion: 'Archivo listo para subir al guardar'
      }
    }));
  }

  puedeCrearUsuarios(): boolean {
    return this.store.hasRole('ADMINISTRADOR') || this.store.hasRole('DIRECCION') || this.store.hasRole('SECRETARIA');
  }

  esAdmin(): boolean {
    return this.store.hasRole('ADMINISTRADOR');
  }

  esDireccion(): boolean {
    return this.store.hasRole('DIRECCION');
  }

  rolesPermitidosParaCrearOEditar(): Array<{ codigo: RolNombre; nombre: string }> {
    const roles: Array<{ codigo: RolNombre; nombre: string }> = [
      { codigo: 'DOCENTE', nombre: 'Docente' },
      { codigo: 'TUTOR', nombre: 'Tutor' },
      { codigo: 'AUXILIAR', nombre: 'Auxiliar' }
    ];
    if (this.esAdmin() || this.esDireccion()) {
      roles.push({ codigo: 'SECRETARIA', nombre: 'Secretaría' });
      roles.push({ codigo: 'DIRECCION', nombre: 'Dirección' });
    }
    if (this.esAdmin()) {
      roles.push({ codigo: 'ADMINISTRADOR', nombre: 'Administrador' });
    }
    return roles;
  }

  puedeGestionarUsuario(user: UserResponseDto): boolean {
    const codigos = (user.roles ?? []).map(r => r.codigo);
    if (this.esAdmin()) return true;
    if (this.esDireccion()) return !codigos.includes('ADMINISTRADOR');
    if (this.store.hasRole('SECRETARIA')) {
      return codigos.length > 0 && codigos.every(c => c === 'DOCENTE' || c === 'AUXILIAR' || c === 'TUTOR');
    }
    return false;
  }

  ngOnInit(): void {
    this.cargarUsuarios();
    this.cargarCatalogosCurriculares();
  }

  private cargarCatalogosCurriculares(): void {
    if (typeof this.usuarioService.listarNiveles !== 'function') {
      return;
    }
    this.usuarioService.listarNiveles().pipe(catchError(() => of([] as NivelResponseDto[]))).subscribe(niveles => {
      this.nivelesCatalogo.set(niveles);
      if (niveles.length > 0 && !this.nuevoDocNivelId()) {
        this.onNivelDocenteChange(niveles[0].id, 'crear');
      }
    });
  }

  onNivelDocenteChange(nivelId: number, modo: 'crear' | 'editar'): void {
    const id = Number(nivelId) || 0;
    if (modo === 'crear') {
      this.nuevoDocNivelId.set(id);
      this.nuevoAreaPendienteId = 0;
    } else {
      this.editDocNivelId.set(id);
      this.editAreaPendienteId = 0;
    }
    if (id && !this.areasPorNivel()[id] && typeof this.usuarioService.listarAreas === 'function') {
      this.usuarioService.listarAreas(id).pipe(catchError(() => of([]))).subscribe(areas => {
        this.areasPorNivel.update(prev => ({ ...prev, [id]: areas }));
      });
    }
  }

  private resolverCursosDisponibles(nivelId: number, seleccionados: AreaDocenteDto[]) {
    if (!nivelId) return [];
    const areas = this.areasPorNivel()[nivelId] ?? [];
    if (!seleccionados.length) return areas;
    const elegidos = new Set(seleccionados.map(c => c.id));
    return areas.filter(a => !elegidos.has(a.id));
  }

  limpiarCursosSeleccionados(modo: 'crear' | 'editar'): void {
    const sig = modo === 'crear' ? this.cursosCrearSeleccionados : this.editCursosSeleccionados;
    sig.set([]);
  }

  abrirSelectorCursosMasivo(modo: 'crear' | 'editar'): void {
    this.modoSelectorMasivo.set(modo);
    const actuales = modo === 'crear' ? this.cursosCrearSeleccionados() : this.editCursosSeleccionados();
    this.seleccionMasivaIds.set(new Set(actuales.map(c => c.id)));
    const niveles = this.nivelesCatalogo();
    const tabInicial = actuales[0]?.nivelId
      ?? (modo === 'crear' ? this.nuevoDocNivelId() : this.editDocNivelId())
      ?? niveles[0]?.id
      ?? 0;
    this.nivelTabMasivo.set(tabInicial);

    const faltantes = niveles.filter(n => !this.areasPorNivel()[n.id]);
    if (faltantes.length > 0 && typeof this.usuarioService.listarAreas === 'function') {
      this.cargandoCursosMasivo.set(true);
      forkJoin(
        faltantes.map(n =>
          this.usuarioService.listarAreas(n.id).pipe(
            catchError(() => of([])),
            map(areas => ({ nivelId: n.id, areas }))
          )
        )
      ).pipe(
        finalize(() => this.cargandoCursosMasivo.set(false))
      ).subscribe(resultados => {
        this.areasPorNivel.update(prev => {
          const next = { ...prev };
          for (const r of resultados) {
            next[r.nivelId] = r.areas;
          }
          return next;
        });
      });
    }

    this.selectorCursosDialogRef = this.dialog.open(this.selectorCursosDocenteDialog, {
      width: '640px',
      maxWidth: 'calc(100vw - 24px)',
      maxHeight: 'calc(100dvh - 32px)',
      panelClass: ['school-dialog', 'scrollbar-hidden'],
      autoFocus: 'dialog',
      restoreFocus: true
    });
  }

  toggleCursoMasivo(areaId: number): void {
    this.seleccionMasivaIds.update(actual => {
      const next = new Set(actual);
      if (next.has(areaId)) next.delete(areaId);
      else next.add(areaId);
      return next;
    });
  }

  seleccionarTodosNivelMasivo(): void {
    const nivelId = this.nivelTabMasivo();
    const areas = this.areasPorNivel()[nivelId] ?? [];
    this.seleccionMasivaIds.update(actual => {
      const next = new Set(actual);
      for (const a of areas) next.add(a.id);
      return next;
    });
  }

  quitarTodosNivelMasivo(): void {
    const nivelId = this.nivelTabMasivo();
    const areas = this.areasPorNivel()[nivelId] ?? [];
    this.seleccionMasivaIds.update(actual => {
      const next = new Set(actual);
      for (const a of areas) next.delete(a.id);
      return next;
    });
  }

  limpiarSeleccionMasiva(): void {
    this.seleccionMasivaIds.set(new Set());
  }

  conteoSeleccionadosPorNivel(nivelId: number): number {
    const ids = this.seleccionMasivaIds();
    return this.areasDeNivel(nivelId).filter(a => ids.has(a.id)).length;
  }

  areasDeNivel(nivelId: number): Array<{ id: number; nivelId: number; codigo: string; nombre: string }> {
    return this.areasPorNivel()[nivelId] ?? [];
  }

  confirmarCursosMasivos(): void {
    const modo = this.modoSelectorMasivo();
    const ids = this.seleccionMasivaIds();
    const nivelesPorId = new Map(this.nivelesCatalogo().map(n => [n.id, n.nombre]));
    const previos = modo === 'crear' ? this.cursosCrearSeleccionados() : this.editCursosSeleccionados();
    const porId = new Map<number, AreaDocenteDto>();

    for (const c of previos) {
      if (ids.has(c.id)) porId.set(c.id, c);
    }
    for (const areas of Object.values(this.areasPorNivel())) {
      for (const area of areas) {
        if (ids.has(area.id) && !porId.has(area.id)) {
          porId.set(area.id, {
            id: area.id,
            nivelId: area.nivelId,
            nivelNombre: nivelesPorId.get(area.nivelId) ?? null,
            codigo: area.codigo,
            nombre: area.nombre
          });
        }
      }
    }

    const lista = Array.from(porId.values());
    if (modo === 'crear') {
      this.cursosCrearSeleccionados.set(lista);
      this.nuevoAreaPendienteId = 0;
    } else {
      this.editCursosSeleccionados.set(lista);
      this.editAreaPendienteId = 0;
    }
    this.selectorCursosDialogRef?.close();
  }

  agregarCursoSeleccionado(modo: 'crear' | 'editar'): void {
    const areaId = Number(modo === 'crear' ? this.nuevoAreaPendienteId : this.editAreaPendienteId);
    const nivelId = modo === 'crear' ? this.nuevoDocNivelId() : this.editDocNivelId();
    if (!areaId || !nivelId) return;
    const area = (this.areasPorNivel()[nivelId] ?? []).find(a => a.id === areaId);
    if (!area) return;
    const nivelNombre = this.nivelesCatalogo().find(n => n.id === nivelId)?.nombre ?? null;
    const item: AreaDocenteDto = {
      id: area.id,
      nivelId: area.nivelId,
      nivelNombre,
      codigo: area.codigo,
      nombre: area.nombre
    };
    const sig = modo === 'crear' ? this.cursosCrearSeleccionados : this.editCursosSeleccionados;
    if (!sig().some(c => c.id === item.id)) {
      sig.update(lista => [...lista, item]);
    }
    if (modo === 'crear') {
      this.nuevoAreaPendienteId = 0;
    } else {
      this.editAreaPendienteId = 0;
    }
  }

  quitarCursoSeleccionado(areaId: number, modo: 'crear' | 'editar'): void {
    const sig = modo === 'crear' ? this.cursosCrearSeleccionados : this.editCursosSeleccionados;
    sig.update(lista => lista.filter(c => c.id !== areaId));
  }

  cargarUsuarios(): void {
    this.error.set(null);
    this.cargando.set(true);
    this.usuarioService.listarUsuarios(this.filtroRol).subscribe({
      next: (data) => {
        this.cargando.set(false);
        this.usuarios.set(data || []);
      },
      error: () => {
        this.cargando.set(false);
        this.usuarios.set([]);
        this.error.set('No se pudieron cargar los usuarios.');
      }
    });
  }

  abrirModalCrear(): void {
    this.error.set(null);
    this.dniError.set(null);
    this.creando.set(false);
    this.altaRegistradaId.set(null);
    this.nuevoUsername = '';
    this.nuevoEmail = '';
    this.nuevoPassword = '';
    this.nuevoRol = 'DOCENTE';

    this.nuevoDni = '';
    this.nuevoNombres = '';
    this.nuevoApellidoPaterno = '';
    this.nuevoApellidoMaterno = '';
    this.nuevoTelefono = '';
    this.nuevoDireccion = '';
    this.nuevoTipoContrato = 'PLANILLA_COMPLETA';
    this.nuevoEspecialidad = '';
    this.nuevoCodigoModular = '';
    this.nuevoNumeroColegiatura = '';
    this.cursosCrearSeleccionados.set([]);
    this.nuevoAreaPendienteId = 0;
    const primerNivel = this.nivelesCatalogo()[0]?.id;
    if (primerNivel) {
      this.onNivelDocenteChange(primerNivel, 'crear');
    }
    this.reiniciarLegajo();

    this.consultandoReniec.set(false);
    this.reniecExitoso.set(false);
    this.mensajeReniec.set('');

    this.dialogRef = this.dialog.open(this.crearUsuarioDialog, {
      width: '780px',
      maxWidth: 'calc(100vw - 24px)',
      maxHeight: 'calc(100dvh - 28px)',
      panelClass: ['school-dialog', 'scrollbar-hidden'],
      autoFocus: 'dialog',
      restoreFocus: true
    });
  }

  onDniChange(): void {
    this.dniError.set(null);
    this.reniecExitoso.set(false);
    this.mensajeReniec.set('');
  }

  habilitarEdicionNombres(): void {
    this.reniecExitoso.set(false);
  }

  consultarReniecEmpleado(): void {
    const dni = this.nuevoDni.trim();
    if (!/^\d{8}$/.test(dni)) {
      this.mensajeReniec.set('Ingresa un DNI de 8 dígitos para consultar.');
      return;
    }
    this.consultandoReniec.set(true);
    this.mensajeReniec.set('');
    this.usuarioService.consultarReniec(dni).pipe(
      finalize(() => this.consultandoReniec.set(false))
    ).subscribe({
      next: (data) => {
        if (data && (data.nombres || data.apellidoPaterno)) {
          this.nuevoNombres = (data.nombres ?? '').trim();
          this.nuevoApellidoPaterno = (data.apellidoPaterno ?? '').trim();
          this.nuevoApellidoMaterno = (data.apellidoMaterno ?? '').trim();
          this.reniecExitoso.set(true);
          this.mensajeReniec.set('✓ Identidad verificada con RENIEC');

          // Sugerir nombre de usuario y correo si están vacíos
          if (!this.nuevoUsername.trim() && this.nuevoApellidoPaterno) {
            const primerNombre = this.nuevoNombres.split(' ')[0].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            const apePaterno = this.nuevoApellidoPaterno.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            this.nuevoUsername = `${primerNombre}.${apePaterno}`;
          }
          if (!this.nuevoEmail.trim() && this.nuevoUsername) {
            this.nuevoEmail = `${this.nuevoUsername}@shuji.edu.pe`;
          }
        } else {
          this.reniecExitoso.set(false);
          this.mensajeReniec.set('No se encontraron registros en RENIEC. Ingrese los datos manualmente.');
        }
      },
      error: () => {
        this.reniecExitoso.set(false);
        this.mensajeReniec.set('No se pudo conectar con el servicio RENIEC. Puede ingresar los datos manualmente.');
      }
    });
  }

  guardarNuevoUsuario(): void {
    if (this.creando()) return;
    this.error.set(null);
    this.dniError.set(null);
    const existente = this.altaRegistradaId();
    if (existente !== null) {
      this.guardarLegajo(existente);
      return;
    }

    const username = this.nuevoUsername.trim();
    const email = this.nuevoEmail.trim();
    const dni = this.nuevoDni.trim();
    const nom = this.nuevoNombres.trim();
    const apePat = this.nuevoApellidoPaterno.trim();
    const apeMat = this.nuevoApellidoMaterno.trim();
    const tel = this.nuevoTelefono.trim();
    const dir = this.nuevoDireccion.trim();

    if (!username || username.length < 3) {
      this.error.set('El nombre de usuario debe tener al menos 3 caracteres.');
      return;
    }
    if (!email || !esEmailValido(email)) {
      this.error.set('Debe ingresar un correo electrónico institucional válido (ej. usuario@shuji.edu.pe).');
      return;
    }
    if (this.nuevoPassword.length < 8) {
      this.error.set('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (this.esDniObligatorio() && (!dni || !esDniValido(dni))) {
      const msg = 'El DNI de 8 dígitos numéricos es obligatorio para docentes y personal institucional.';
      this.dniError.set(msg);
      this.error.set(msg);
      return;
    }
    if (dni && !esDniValido(dni)) {
      const msg = 'El DNI debe tener exactamente 8 dígitos numéricos.';
      this.dniError.set(msg);
      this.error.set(msg);
      return;
    }
    if (nom && !esNombreValido(nom)) {
      this.error.set('Los nombres solo deben contener letras (sin números ni caracteres especiales).');
      return;
    }
    if (apePat && !esNombreValido(apePat)) {
      this.error.set('El apellido paterno solo debe contener letras.');
      return;
    }
    if (apeMat && !esNombreValido(apeMat)) {
      this.error.set('El apellido materno solo debe contener letras.');
      return;
    }
    if (tel && !esCelularValido(tel)) {
      this.error.set('El teléfono debe contener 9 dígitos numéricos.');
      return;
    }
    if (dir && !esDireccionValida(dir)) {
      this.error.set('La dirección no permite caracteres especiales extraños.');
      return;
    }

    if (this.nuevoRol === 'DOCENTE' && this.nuevoAreaPendienteId) {
      this.agregarCursoSeleccionado('crear');
    }
    const areaIdsDocente = this.cursosCrearSeleccionados().map(c => c.id);
    if (this.nuevoRol === 'DOCENTE' && this.nivelesCatalogo().length > 0 && areaIdsDocente.length === 0) {
      this.error.set('Selecciona al menos un curso real de la base de datos para el docente.');
      return;
    }

    this.creando.set(true);
    const payload: CrearUsuarioRequestDto & {
      nombres?: string;
      apellidoPaterno?: string;
      apellidoMaterno?: string;
    } = {
      username,
      email,
      password: this.nuevoPassword,
      roles: [this.nuevoRol],
      dni: dni || undefined,
      nombreCompleto: [nom, apePat, apeMat].filter(Boolean).join(' ').trim() || undefined,
      nombres: nom || undefined,
      apellidoPaterno: apePat || undefined,
      apellidoMaterno: apeMat || undefined,
      telefono: tel || undefined,
      direccion: dir || undefined,
      tipoContrato: this.nuevoTipoContrato,
      especialidad: this.nuevoRol === 'DOCENTE'
        ? (this.cursosCrearSeleccionados().map(c => c.nombre).join(', ').slice(0, 100) || undefined)
        : (this.nuevoEspecialidad.trim() || undefined),
      codigoModular: this.nuevoCodigoModular.trim() || undefined,
      numeroColegiatura: this.nuevoNumeroColegiatura.trim() || undefined,
      areaCurricularIds: this.nuevoRol === 'DOCENTE' ? areaIdsDocente : undefined
    };

    this.usuarioService.crearUsuario(payload).subscribe({
      next: (creado) => {
        if (creado?.id && this.listaDocumentosLegajo().some(d => d.archivo)) {
          this.altaRegistradaId.set(creado.id);
          this.usuarios.update(usuarios => [creado, ...usuarios.filter(u => u.id !== creado.id)]);
          this.guardarLegajo(creado.id);
          return;
        }
        this.creando.set(false);
        this.dialogRef?.close();
        queueMicrotask(() => this.cargarUsuarios());
      },
      error: (err) => {
        this.creando.set(false);
        this.error.set(err?.error?.message || 'No se pudo registrar el usuario. Verifique los datos y permisos.');
      }
    });
  }

  private guardarLegajo(usuarioId: number): void {
    const pendientes = this.listaDocumentosLegajo().filter(d => d.archivo !== null);
    if (!pendientes.length) {
      this.creando.set(false);
      this.dialogRef?.close();
      queueMicrotask(() => this.cargarUsuarios());
      return;
    }
    this.creando.set(true);
    forkJoin(pendientes.map(documento =>
      this.usuarioService.subirDocumentoLegajo(usuarioId, documento.tipo, documento.archivo!).pipe(
        map(resultado => ({ documento, resultado })),
        catchError(() => of({ documento, resultado: null }))
      )
    )).subscribe(resultados => {
      this.creando.set(false);
      const fallidos: string[] = [];
      this.documentosLegajo.update(legajo => {
        const actualizado = { ...legajo };
        for (const { documento, resultado } of resultados) {
          if (!resultado) {
            fallidos.push(documento.etiqueta);
            actualizado[documento.tipo] = { ...documento, observacion: 'La carga falló. Puedes reintentar.' };
          } else {
            actualizado[documento.tipo] = { ...documento, archivo: null,
              estado: resultado.estadoIa, observacion: resultado.observacionesIa };
          }
        }
        return actualizado;
      });
      if (fallidos.length) {
        this.error.set('La cuenta quedó registrada. Archivos por reintentar: ' + fallidos.join(', ') + '.');
        return;
      }
      this.dialogRef?.close();
      queueMicrotask(() => this.cargarUsuarios());
    });
  }

  alternarEstado(user: UserResponseDto): void {
    this.error.set(null);
    this.usuarioPendienteEstado.set(user);
    this.actualizandoEstado.set(false);
    this.estadoDialogRef = this.dialog.open(this.confirmarEstadoDialog, {
      width: '480px',
      maxWidth: 'calc(100vw - 24px)',
      panelClass: 'school-dialog',
      autoFocus: 'dialog',
      restoreFocus: true
    });
    this.estadoDialogRef.afterClosed().subscribe(() => this.usuarioPendienteEstado.set(null));
  }

  confirmarCambioEstado(): void {
    const user = this.usuarioPendienteEstado();
    if (!user || this.actualizandoEstado()) return;
    const nuevoEstado = !user.activo;
    this.error.set(null);
    this.actualizandoEstado.set(true);
    this.usuarioService.cambiarEstado(user.id, nuevoEstado).subscribe({
      next: (actualizado) => {
        this.actualizandoEstado.set(false);
        const activo = actualizado ? actualizado.activo : nuevoEstado;
        this.usuarios.update(lista => lista.map(u => u.id === user.id ? { ...u, activo } : u));
        this.estadoDialogRef?.close();
      },
      error: (err) => {
        this.actualizandoEstado.set(false);
        this.error.set(err?.error?.message || 'No se pudo cambiar el estado del usuario.');
      }
    });
  }

  abrirModalRevocarRol(usuario: UserResponseDto, rol: { id: number; codigo: string }): void {
    this.error.set(null);
    this.usuarioPendienteRevocar.set({ usuario, rol });
    this.revocarRolDialogRef = this.dialog.open(this.confirmarRevocarRolDialog, {
      width: '460px',
      maxWidth: 'calc(100vw - 24px)',
      panelClass: 'school-dialog'
    });
  }

  confirmarRevocarRol(): void {
    const pendiente = this.usuarioPendienteRevocar();
    if (!pendiente || this.revocandoRol()) return;
    this.revocandoRol.set(true);
    this.error.set(null);
    this.usuarioService.revocarRol(pendiente.usuario.id, pendiente.rol.id).subscribe({
      next: (usuarioActualizado) => {
        this.revocandoRol.set(false);
        this.usuarios.update(lista => lista.map(u => {
          if (u.id === pendiente.usuario.id) {
            return usuarioActualizado || { ...u, roles: u.roles.filter(r => r.id !== pendiente.rol.id) };
          }
          return u;
        }));
        this.revocarRolDialogRef?.close();
      },
      error: (err) => {
        this.revocandoRol.set(false);
        this.error.set(err?.error?.message || 'No se pudo revocar el rol del usuario.');
      }
    });
  }

  abrirModalDetalles(usuario: UserResponseDto): void {
    this.error.set(null);
    this.usuarioDetalle.set(usuario);
    this.detallesUsuarioDialogRef = this.dialog.open(this.detallesUsuarioDialog, {
      width: '680px',
      maxWidth: 'calc(100vw - 24px)',
      maxHeight: 'calc(100dvh - 28px)',
      panelClass: ['school-dialog', 'scrollbar-hidden'],
      autoFocus: 'dialog',
      restoreFocus: true
    });
  }

  editarDesdeDetalles(): void {
    const usuario = this.usuarioDetalle();
    this.detallesUsuarioDialogRef?.close();
    if (usuario) {
      this.abrirModalEditarUsuario(usuario);
    }
  }

  abrirModalEditarUsuario(usuario: UserResponseDto): void {
    this.error.set(null);
    this.usuarioEditando.set(usuario);
    this.guardandoEdicion.set(false);
    this.reniecEditarMensaje.set('');
    this.editDni = (usuario.dni ?? '').trim();
    this.editNombreCompleto = (usuario.nombreCompleto ?? '').trim();
    this.editEmail = (usuario.email ?? '').trim();
    this.editTelefono = (usuario.telefono ?? '').trim();
    this.editDireccion = (usuario.direccion ?? '').trim();
    this.editTipoContrato = (usuario.tipoContrato ?? '').trim();
    const est = (usuario.estadoLaboral ?? 'ACTIVO').toUpperCase();
    this.editEstadoLaboral = (['ACTIVO', 'SUSPENDIDO', 'CESADO', 'INACTIVO'].includes(est)
      ? est
      : 'ACTIVO') as 'ACTIVO' | 'SUSPENDIDO' | 'CESADO' | 'INACTIVO';
    this.editCodigoModular = (usuario.codigoModular ?? '').trim();
    this.editNumeroColegiatura = (usuario.numeroColegiatura ?? '').trim();
    this.editEspecialidad = (usuario.especialidad ?? '').trim();
    this.editPasswordNuevo = '';
    this.editRoles.set((usuario.roles ?? []).map(r => r.codigo));
    this.editCursosSeleccionados.set([...(usuario.areasCurriculares ?? [])]);
    this.editAreaPendienteId = 0;

    const nivelInicial = usuario.areasCurriculares?.[0]?.nivelId ?? this.nivelesCatalogo()[0]?.id ?? 0;
    if (nivelInicial) {
      this.onNivelDocenteChange(nivelInicial, 'editar');
    }

    this.editarUsuarioDialogRef = this.dialog.open(this.editarUsuarioDialog, {
      width: '780px',
      maxWidth: 'calc(100vw - 24px)',
      maxHeight: 'calc(100dvh - 28px)',
      panelClass: ['school-dialog', 'scrollbar-hidden'],
      autoFocus: 'dialog',
      restoreFocus: true
    });
  }

  toggleEditRol(codigo: RolNombre): void {
    this.editRoles.update(actual =>
      actual.includes(codigo) ? actual.filter(r => r !== codigo) : [...actual, codigo]
    );
  }

  consultarReniecEditar(): void {
    const dni = this.editDni.trim();
    if (!esDniValido(dni)) return;
    this.consultandoReniecEditar.set(true);
    this.reniecEditarMensaje.set('');
    this.usuarioService.consultarReniec(dni).pipe(
      finalize(() => this.consultandoReniecEditar.set(false))
    ).subscribe({
      next: (persona) => {
        const nom = [persona.nombres, persona.apellidoPaterno, persona.apellidoMaterno]
          .filter(Boolean)
          .join(' ')
          .trim();
        if (nom) {
          this.editNombreCompleto = nom;
          this.reniecEditarMensaje.set('✓ RENIEC: ' + nom);
        } else {
          this.reniecEditarMensaje.set('No encontrado en RENIEC; edita el nombre manualmente.');
        }
      },
      error: () => {
        this.reniecEditarMensaje.set('Consulta RENIEC no disponible; edita manualmente.');
      }
    });
  }

  guardarEdicionUsuario(): void {
    const user = this.usuarioEditando();
    if (!user || this.guardandoEdicion()) return;
    this.error.set(null);

    const nombre = this.editNombreCompleto.trim();
    const email = this.editEmail.trim();
    const dni = this.editDni.trim();
    const roles = this.editRoles();
    const esDocente = roles.includes('DOCENTE');

    if (!nombre) {
      this.error.set('El nombre completo es obligatorio.');
      return;
    }
    if (!email || !esEmailValido(email)) {
      this.error.set('Ingrese un correo electrónico válido.');
      return;
    }
    if (roles.length === 0) {
      this.error.set('Debe seleccionar al menos un rol institucional.');
      return;
    }
    if (esDocente && !esDniValido(dni)) {
      this.error.set('El DNI de 8 dígitos es obligatorio para usuarios con rol DOCENTE.');
      return;
    }
    if (!esDocente && dni && !esDniValido(dni)) {
      this.error.set('El DNI debe tener exactamente 8 dígitos numéricos.');
      return;
    }
    if (this.editPasswordNuevo && this.editPasswordNuevo.length < 8) {
      this.error.set('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (esDocente && this.editAreaPendienteId) {
      this.agregarCursoSeleccionado('editar');
    }
    const areaIds = this.editCursosSeleccionados().map(c => c.id);
    if (esDocente && this.nivelesCatalogo().length > 0 && areaIds.length === 0) {
      this.error.set('Debe asignar al menos un curso real para el docente.');
      return;
    }

    const payload: ActualizarUsuarioAdminRequestDto = {
      dni,
      nombreCompleto: nombre,
      email,
      telefono: this.editTelefono.trim(),
      direccion: this.editDireccion.trim(),
      tipoContrato: this.editTipoContrato.trim(),
      estadoLaboral: this.editEstadoLaboral,
      codigoModular: this.editCodigoModular.trim(),
      numeroColegiatura: this.editNumeroColegiatura.trim(),
      especialidad: esDocente
        ? (this.editCursosSeleccionados().map(c => c.nombre).join(', ').slice(0, 100) || undefined)
        : this.editEspecialidad.trim(),
      passwordNuevo: this.editPasswordNuevo ? this.editPasswordNuevo : undefined,
      roles,
      areaCurricularIds: esDocente ? areaIds : undefined
    };

    this.guardandoEdicion.set(true);
    this.usuarioService.actualizarUsuario(user.id, payload).pipe(
      finalize(() => this.guardandoEdicion.set(false))
    ).subscribe({
      next: (actualizado) => {
        this.usuarios.update(lista => lista.map(u => u.id === user.id ? (actualizado || u) : u));
        this.editarUsuarioDialogRef?.close();
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'No se pudo actualizar el usuario.');
      }
    });
  }

  abrirModalCorregirDni(usuario: UserResponseDto): void {
    this.error.set(null);
    this.usuarioPendienteDni.set(usuario);
    this.corregirDniNuevo = usuario.dni ?? '';
    this.corregirDniMotivo = '';
    this.nombreCompletoCorregirDni = '';
    this.reniecCorregirMensaje.set('');
    this.corregirDniDialogRef = this.dialog.open(this.corregirDniDialog, {
      width: '480px',
      maxWidth: 'calc(100vw - 24px)',
      panelClass: 'school-dialog'
    });
  }

  onCorregirDniChange(): void {
    this.nombreCompletoCorregirDni = '';
    this.reniecCorregirMensaje.set('');
  }

  consultarReniecCorregirDni(): void {
    const dni = this.corregirDniNuevo.trim();
    if (dni.length !== 8) return;
    this.consultandoReniecCorregir.set(true);
    this.reniecCorregirMensaje.set('');
    this.usuarioService.consultarReniec(dni).subscribe({
      next: (persona) => {
        this.consultandoReniecCorregir.set(false);
        const nom = [persona.nombres, persona.apellidoPaterno, persona.apellidoMaterno].filter(Boolean).join(' ').trim();
        this.nombreCompletoCorregirDni = nom;
        this.reniecCorregirMensaje.set(nom ? `RENIEC: ${nom}` : 'DNI verificado');
      },
      error: () => {
        this.consultandoReniecCorregir.set(false);
        this.reniecCorregirMensaje.set('Consulta no disponible. Se permite continuar');
      }
    });
  }

  confirmarCorregirDni(): void {
    const user = this.usuarioPendienteDni();
    if (!user || this.guardandoDni()) return;
    this.guardandoDni.set(true);
    this.error.set(null);
    this.usuarioService.corregirDni(user.id, {
      nuevoDni: this.corregirDniNuevo.trim(),
      motivo: this.corregirDniMotivo.trim(),
      nombreCompleto: this.nombreCompletoCorregirDni || undefined
    }).subscribe({
      next: (actualizado) => {
        this.guardandoDni.set(false);
        this.usuarios.update(lista => lista.map(u => u.id === user.id ? (actualizado || u) : u));
        this.corregirDniDialogRef?.close();
      },
      error: (err) => {
        this.guardandoDni.set(false);
        this.error.set(err?.error?.message || 'No se pudo corregir el DNI.');
      }
    });
  }
}
