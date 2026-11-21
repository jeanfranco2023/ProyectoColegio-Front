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
import { UserResponseDto, RolNombre, EstadoValidacionIa } from '../../core/models/auth.model';
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
          @if (store.hasRole('DIRECCION')) { <button mat-flat-button color="primary"
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
              <option value="DIRECCION">Dirección</option>
              <option value="SECRETARIA">Secretaría</option>
              <option value="DOCENTE">Docente</option>
              <option value="AUXILIAR">Auxiliar</option>
              <option value="TUTOR">Tutor</option>
              <option value="APODERADO">Apoderado</option>
            </select>
          </div>

          <div class="flex flex-col gap-1">
            <label for="filtro-especialidad-usuarios" class="text-xs !text-[11px] font-semibold text-ui-muted">Área / Especialidad</label>
            <select
              id="filtro-especialidad-usuarios"
              [ngModel]="filtroEspecialidad()"
              (ngModelChange)="filtroEspecialidad.set($event); paginaActual.set(1)"
              class="px-3 py-1.5 rounded-xl bg-ui-surface border border-ui-control-border text-ui-text text-xs !text-[11px] focus:outline-none focus:border-ui-focus min-w-0 !min-h-11 max-w-full transition-colors focus:shadow-[0_0_0_3px_var(--ui-focus-shadow)]"
            >
              <option value="">Todas las áreas</option>
              <option value="DOCENTE_PRIMARIA">Educación Primaria</option>
              <option value="DOCENTE_INICIAL">Educación Inicial</option>
              <option value="MATEMATICA">Matemática</option>
              <option value="COMUNICACION">Comunicación y Lenguaje</option>
              <option value="CIENCIAS_SOCIALES">Ciencias Sociales</option>
              <option value="CIENCIA_TECNOLOGIA">Ciencia y Tecnología</option>
              <option value="INGLES">Idioma Extranjero: Inglés</option>
              <option value="GESTION_ADMIN">Gestión Institucional / Administrativa</option>
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
          <table class="w-full min-w-[900px] max-[640px]:min-w-[820px] text-left text-sm font-medium text-ui-text [&_th:last-child]:static [&_th:last-child]:shadow-none [&_td:last-child]:static [&_td:last-child]:shadow-none [&_thead]:!bg-ui-surface-soft [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:!bg-ui-surface-soft/75" data-mobile-table-cards="">
            <thead class="bg-ui-surface-soft border-b border-ui-divider text-ui-action uppercase tracking-wider font-bold text-xs">
              <tr>
                <th class="px-5 py-3.5">ID</th>
                <th class="px-5 py-3.5">Usuario / Ficha Personal</th>
                <th class="px-5 py-3.5">Correo Electrónico</th>
                <th class="px-5 py-3.5">Roles & Especialidad</th>
                <th class="px-5 py-3.5">Estado en BD</th>
                <th class="px-5 py-3.5">Fecha Creación</th>
                <th class="px-5 py-3.5 text-right">Acción</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[var(--ui-divider)] text-ui-text">
              @if (cargando()) {
                <tr>
                  <td colspan="7" class="text-center py-10 text-ui-muted">
                    <span class="inline-block w-5 h-5 border-2 border-ui-action/30 border-t-ui-action rounded-full animate-spin mb-2"></span>
                    <p>Consultando usuarios en la base de datos...</p>
                  </td>
                </tr>
              } @else {
                @for (user of usuariosPaginados(); track user.id) {
                  <tr class="bg-ui-surface hover:bg-ui-surface-soft/75 transition-colors">
                    <td class="px-5 py-3.5 font-mono text-ui-muted" data-label="ID">{{ user.id }}</td>
                    <td class="px-5 py-3.5 font-bold text-ui-text" data-label="Usuario">
                      <div class="flex items-center gap-3">
                        <img
                          [src]="obtenerFotoUsuario(user)"
                          [alt]="user.nombreCompleto || user.username"
                          class="w-10 h-10 rounded-full object-cover border-2 border-slate-200 shrink-0 shadow-2xs"
                          loading="lazy"
                        />
                        <div class="min-w-0">
                          <div class="truncate text-ui-text font-bold">{{ user.nombreCompleto || user.username }}</div>
                          <small class="block font-normal text-ui-muted truncate">
                            {{ user.username }}@if (user.dni) { · DNI {{ user.dni }} }
                          </small>
                        </div>
                      </div>
                    </td>
                    <td class="px-5 py-3.5 text-ui-text" data-label="Correo Electrónico">{{ user.email }}</td>
                    <td class="px-5 py-3.5" data-label="Roles Asignados">
                      <div class="flex flex-wrap gap-1">
                        @for (r of user.roles; track r.codigo) {
                          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-ui-info-bg text-ui-info-text border border-ui-info-border">
                            {{ r.codigo }}
                            @if (store.hasRole('DIRECCION') && user.roles.length > 1) {
                              <button
                                type="button"
                                (click)="abrirModalRevocarRol(user, r)"
                                class="text-rose-500 hover:text-rose-700 ml-0.5 font-bold cursor-pointer transition hover:scale-110"
                                title="Revocar rol {{ r.codigo }}"
                                aria-label="Revocar rol"
                              >
                                ×
                              </button>
                            }
                          </span>
                        }
                        @if (user.especialidad) {
                          <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-900 border border-amber-200">
                            {{ user.especialidad }}
                          </span>
                        }
                      </div>
                    </td>
                    <td class="px-5 py-3.5" data-label="Estado en BD">
                      @if (user.activo) {
                        <span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-ui-success-bg border border-ui-success-border text-ui-success-text">
                          ACTIVO
                        </span>
                      } @else {
                        <span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-ui-error-bg border border-ui-error-border text-ui-error-text">
                          SUSPENDIDO
                        </span>
                      }
                    </td>
                    <td class="px-5 py-3.5 !text-ui-muted font-mono" data-label="Fecha Creación">{{ user.createdAt ? (user.createdAt | uiDatePe:true) : '-' }}</td>
                    <td class="px-5 py-3.5 text-right" data-label="Acción">
                      <div class="flex flex-wrap justify-end gap-1.5">
                        @if (store.hasRole('DIRECCION')) {
                          <button
                            type="button"
                            (click)="abrirModalCorregirDni(user)"
                            class="px-2.5 py-1 rounded-lg bg-white border border-[#cbd5e1] hover:bg-slate-100 text-[#34445d] font-semibold cursor-pointer text-xs box-border inline-flex items-center justify-center min-h-[38px]"
                            title="Corregir DNI o actualizar nombre desde RENIEC"
                          >
                            DNI / nombre
                          </button>
                        }
                        <button
                          type="button"
                          (click)="alternarEstado(user)"
                          [class]="user.activo ? 'text-red-700 hover:text-red-800' : 'text-emerald-700 hover:text-emerald-800'"
                          class="px-2.5 py-1 rounded-lg bg-ui-surface-soft border border-ui-divider text-ui-action hover:bg-ui-action hover:text-ui-surface transition font-semibold cursor-pointer text-xs !text-[11px] max-[640px]:w-full box-border inline-flex min-w-0 !min-h-[38px] items-center justify-center gap-2 font-sans text-sm leading-[1.25] text-center align-middle"
                        >
                          {{ user.activo ? 'Suspender' : 'Activar' }}
                        </button>
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr [hidden]="!!error()">
                    <td colspan="7" data-label="">
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
                      <option value="DOCENTE">Docente</option>
                      <option value="TUTOR">Tutor</option>
                      <option value="AUXILIAR">Auxiliar</option>
                      <option value="SECRETARIA">Secretaría</option>
                      <option value="DIRECCION">Dirección</option>
                      @if (store.hasRole('ADMINISTRADOR')) {
                        <option value="ADMINISTRADOR">Administrador</option>
                      }
                    </select>
                  </div>
                </div>

                <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label for="nuevo-especialidad" class="block text-xs font-semibold text-[#59677a] mb-1">Especialidad / Área</label>
                    <select
                      id="nuevo-especialidad"
                      [(ngModel)]="nuevoEspecialidad"
                      name="nuevoEspecialidad"
                      class="w-full h-11 px-3 text-xs rounded-xl border border-[#dce3ec] bg-white text-[#14213d] focus:outline-none focus:border-[#2563eb]"
                    >
                      <option value="DOCENTE_PRIMARIA">Educación Primaria</option>
                      <option value="DOCENTE_INICIAL">Educación Inicial</option>
                      <option value="MATEMATICA">Matemática</option>
                      <option value="COMUNICACION">Comunicación y Lenguaje</option>
                      <option value="CIENCIAS_SOCIALES">Ciencias Sociales</option>
                      <option value="CIENCIA_TECNOLOGIA">Ciencia y Tecnología</option>
                      <option value="INGLES">Idioma Extranjero: Inglés</option>
                      <option value="GESTION_ADMIN">Gestión Institucional / Administrativa</option>
                    </select>
                  </div>

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
                    <label for="nuevo-codigo-modular" class="block text-xs font-semibold text-[#59677a] mb-1">Código Modular / Colegiatura</label>
                    <input
                      id="nuevo-codigo-modular"
                      type="text"
                      [(ngModel)]="nuevoCodigoModular"
                      name="nuevoCodigoModular"
                      placeholder="ej. CM-10928374"
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
  private dialogRef?: MatDialogRef<unknown>;
  private estadoDialogRef?: MatDialogRef<unknown>;
  private revocarRolDialogRef?: MatDialogRef<unknown>;
  private corregirDniDialogRef?: MatDialogRef<unknown>;

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
  filtroRol = '';
  readonly filtroEspecialidad = signal('');
  readonly filtroEstado = signal<'' | 'ACTIVO' | 'SUSPENDIDO'>('');
  readonly usuariosFiltrados = computed(() => {
    const esp = this.filtroEspecialidad().trim();
    const est = this.filtroEstado();
    return this.usuarios().filter(u => {
      if (esp && (u.especialidad ?? '') !== esp) return false;
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
  nuevoEspecialidad = 'DOCENTE_PRIMARIA';
  nuevoCodigoModular = '';

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

  ngOnInit(): void {
    this.cargarUsuarios();
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
    this.nuevoEspecialidad = 'DOCENTE_PRIMARIA';
    this.nuevoCodigoModular = '';
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

    this.creando.set(true);
    const payload = {
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
      especialidad: this.nuevoEspecialidad,
      codigoModular: this.nuevoCodigoModular.trim() || undefined
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
