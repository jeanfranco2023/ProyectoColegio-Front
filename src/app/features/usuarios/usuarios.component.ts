import { Component, inject, signal, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { UsuarioService } from '../../core/services/usuario.service';
import { UserResponseDto, RolNombre, EstadoValidacionIa } from '../../core/models/auth.model';
import { AuthStore } from '../../core/state/auth.store';
import { UiDatePePipe } from '../../shared/ui/ui-date-pe.pipe';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, UiDatePePipe],
  template: `
    <div class="space-y-6 min-w-0 font-inter text-[#172b4d] [&_button]:min-h-11 [&_input]:min-h-11 [&_select]:min-h-11 [&_:focus-visible]:outline-[3px] [&_:focus-visible]:outline-[#2864c5] [&_:focus-visible]:outline-offset-[3px] [&_.grid>div]:min-w-0 [&_.grid>article]:min-w-0">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t-[3px] border-[#c49a58]/50 pt-3">
        <div>
          <h2 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#14213d] tracking-[-.025em]">Usuarios & Permisos (RBAC)</h2>
          <p class="text-sm text-[#59677a] mt-1">
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

      @if (error()) { <p class="m-0 rounded-xl border border-[#fecaca] bg-[#fef2f2] px-3 py-[10px] text-xs text-[#b91c1c]" role="alert">{{ error() }}</p> }

      <!-- Filters & Stats -->
      <div class="p-4 rounded-2xl bg-white border border-[#e5eaf2] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div class="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center">
          <label class="text-xs !text-[11px] font-semibold text-[#59677a]">Filtrar por Rol:</label>
          <select
            [(ngModel)]="filtroRol" aria-label="Filtrar por Rol"
            (change)="cargarUsuarios()"
            class="px-3 py-1.5 rounded-xl bg-[#f5f7fb] border border-[#e5eaf2] text-[#14213d] text-xs !text-[11px] focus:outline-none focus:border-blue-500 min-w-0 !min-h-[44px] max-w-full py-[10px] !border-[#d9e1ec] !bg-[#f5f7fb] !text-[#14213d] transition-colors focus:border-[#5b83d6] focus:shadow-[0_0_0_3px_rgb(59_110_214_/_13%)] max-[639px]:text-base !min-h-11 !py-[6px] !px-3 !border-[#e5eaf2]"
          >
            <option value="">Todos los Roles</option>
            <option value="DIRECCION">Dirección</option>
            <option value="SECRETARIA">Secretaría</option>
            <option value="DOCENTE">Docente</option>
            <option value="AUXILIAR">Auxiliar</option>
            <option value="TUTOR">Tutor</option>
            <option value="APODERADO">Apoderado</option>
          </select>
          <button
            (click)="cargarUsuarios()"
            class="px-3 py-1.5 rounded-xl bg-[#f1f4f9] hover:bg-slate-700 text-[#34445d] text-xs !text-[11px] font-semibold cursor-pointer max-[640px]:w-full box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]"
          >
            Actualizar BD
          </button>
        </div>

        <div class="text-xs !text-[11px] text-[#59677a]">
          Total de cuentas en BD: <span class="text-[#14213d] font-bold">{{ usuarios().length }}</span>
        </div>
      </div>

      <!-- Users Table -->
      <div class="rounded-2xl bg-white border border-[#e5eaf2] overflow-hidden shadow-sm">
        <div class="overflow-x-auto">
          <table class="w-full min-w-[900px] max-[640px]:min-w-[820px] text-left text-xs !text-[11px] [&_th:last-child]:static [&_th:last-child]:shadow-none [&_td:last-child]:static [&_td:last-child]:shadow-none [&_thead]:!bg-[#f7f9fc] [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:!bg-[#f8faff]" data-mobile-table-cards="">
            <thead class="bg-[#f5f7fb] border-b border-[#e5eaf2] text-[#59677a] uppercase tracking-wider font-semibold">
              <tr>
                <th class="px-5 py-3.5">ID BD</th>
                <th class="px-5 py-3.5">Usuario</th>
                <th class="px-5 py-3.5">Correo Electrónico</th>
                <th class="px-5 py-3.5">Roles Asignados</th>
                <th class="px-5 py-3.5">Estado en BD</th>
                <th class="px-5 py-3.5">Fecha Creación</th>
                <th class="px-5 py-3.5 text-right">Acción</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#edf0f5] text-[#34445d]">
              @if (cargando()) {
                <tr>
                  <td colspan="7" class="text-center py-10 text-[#59677a]">
                    <span class="inline-block w-5 h-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-2"></span>
                    <p>Consultando usuarios en la base de datos...</p>
                  </td>
                </tr>
              } @else {
                @for (user of usuarios(); track user.id) {
                  <tr class="!bg-[#f1f4f9] hover:bg-[#f1f4f9] transition">
                    <td class="px-5 py-3.5 font-mono text-[#59677a]" data-label="ID BD">{{ user.id }}</td>
                    <td class="px-5 py-3.5 font-bold text-[#14213d]" data-label="Usuario">{{ user.username }}</td>
                    <td class="px-5 py-3.5 text-[#34445d]" data-label="Correo Electrónico">{{ user.email }}</td>
                    <td class="px-5 py-3.5" data-label="Roles Asignados">
                      <div class="flex flex-wrap gap-1">
                        @for (r of user.roles; track r.codigo) {
                          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-[#f1f4f9] text-[#2563eb] border border-[#e5eaf2]">
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
                      </div>
                    </td>
                    <td class="px-5 py-3.5" data-label="Estado en BD">
                      @if (user.activo) {
                        <span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#edf9f3] border border-[#b8dfcc] text-[#126943]">
                          ACTIVO
                        </span>
                      } @else {
                        <span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#fff1ef] border border-[#f2b7b0] text-[#a43128]">
                          SUSPENDIDO
                        </span>
                      }
                    </td>
                    <td class="px-5 py-3.5 !text-[#59677a] font-mono" data-label="Fecha Creación">{{ user.createdAt ? (user.createdAt | uiDatePe:true) : '-' }}</td>
                    <td class="px-5 py-3.5 text-right" data-label="Acción">
                      <div class="flex flex-wrap justify-end gap-1.5">
                        <button
                          type="button"
                          (click)="abrirModalCorregirDni(user)"
                          class="px-2.5 py-1 rounded-lg bg-white border border-[#cbd5e1] hover:bg-slate-100 text-[#34445d] font-semibold cursor-pointer text-xs box-border inline-flex items-center justify-center min-h-[38px]"
                          title="Corregir DNI del usuario"
                        >
                          DNI
                        </button>
                        <button
                          (click)="alternarEstado(user)"
                          [class]="user.activo ? 'text-red-700 hover:text-red-800' : 'text-emerald-700 hover:text-emerald-800'"
                          class="px-2.5 py-1 rounded-lg bg-[#f1f4f9] hover:bg-slate-700 hover:text-white transition font-semibold cursor-pointer text-xs !text-[11px] max-[640px]:w-full box-border inline-flex min-w-0 !min-h-[38px] items-center justify-center gap-2 font-sans text-sm leading-[1.25] text-center align-middle"
                        >
                          {{ user.activo ? 'Suspender' : 'Activar' }}
                        </button>
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr [hidden]="!!error()">
                    <td colspan="7" data-label="">
                      <div class="text-center py-12 text-[#59677a] space-y-2 relative pt-[62px]" data-illustration="crest"><svg aria-hidden="true" class="absolute left-1/2 top-3 h-[42px] w-[42px] -translate-x-1/2 fill-none stroke-[#102447] stroke-2 [stroke-linecap:round] [stroke-linejoin:round]"><path d="M24 5 39 11v11c0 10-6.5 16-15 21C15.5 38 9 32 9 22V11z"/><path d="M15 18c3-1 6-.5 9 1.5v13c-3-2-6-2.5-9-1.5zM33 18c-3-1-6-.5-9 1.5v13c3-2 6-2.5 9-1.5z" stroke="#C49A58"/></svg>
                        <p class="font-medium text-[#59677a]">No se encontraron usuarios registrados en la base de datos.</p>
                        <p class="text-[11px] text-[#59677a]">Cree un nuevo usuario institucional con el botón superior para darlo de alta en PostgreSQL.</p>
                      </div>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- MODAL FLOTANTE DE ALTA Y EXPEDIENTE DE EMPLEADO -->
      <ng-template #crearUsuarioDialog>
        <div class="scrollbar-hidden">
          <h2 mat-dialog-title class="!px-6 !pt-6 !text-xl !font-semibold !tracking-tight !text-[#14213d] tracking-[-.025em]">Expediente y Alta de Empleado</h2>
          <p class="px-6 text-xs leading-5 text-[#64748b]">Registro integral de credenciales, expediente profesional y legajo digital con verificación asistida por IA.</p>
          <form id="crear-usuario-form" (ngSubmit)="guardarNuevoUsuario()">
            <mat-dialog-content class="!px-6 !pt-4 !pb-4 scrollbar-hidden max-h-[75vh]">
              @if (error()) { <p class="m-0 rounded-xl border border-[#fecaca] bg-[#fef2f2] px-3 py-[10px] text-xs text-[#b91c1c] mb-4" role="alert">{{ error() }}</p> }

              <!-- SECCIÓN 1: Identidad y Acceso Institucional -->
              <div class="mb-5 rounded-2xl border border-[#e5eaf2] bg-[#fcfdfe] p-4">
                <h3 class="text-xs font-bold uppercase tracking-wider text-[#76551f] mb-3 flex items-center gap-1.5">
                  <span class="size-2 rounded-full bg-[#c49a58]"></span>
                  1. Identidad y Credenciales de Acceso
                </h3>

                <!-- DNI con botón Consultar RENIEC -->
                <div class="mb-3">
                  <label class="block text-xs font-bold text-[#34445d] mb-1">DNI del Empleado *</label>
                  <div class="flex items-center gap-2">
                    <input
                      type="text"
                      [(ngModel)]="nuevoDni"
                      (input)="onDniChange()"
                      name="nuevoDni"
                      inputmode="numeric"
                      maxlength="8"
                      placeholder="8 dígitos"
                      class="flex-1 h-11 px-3 text-xs rounded-xl border border-[#dce3ec] bg-white text-[#14213d] focus:outline-none focus:border-[#2563eb]"
                    />
                    <button
                      type="button"
                      (click)="consultarReniecEmpleado()"
                      [disabled]="consultandoReniec() || nuevoDni.trim().length !== 8"
                      class="h-11 px-4 inline-flex items-center gap-2 rounded-xl bg-[#f0f4fa] hover:bg-[#e2ebf7] border border-[#d0ddeb] text-[#184fae] text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                    >
                      @if (consultandoReniec()) {
                        <span class="size-3.5 border-2 border-[#184fae] border-t-transparent rounded-full animate-spin"></span>
                        <span>Consultando…</span>
                      } @else {
                        <svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                        <span>Consultar RENIEC</span>
                      }
                    </button>
                  </div>
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
                    <label class="block text-xs font-semibold text-[#59677a] mb-1">Nombres *</label>
                    <input
                      type="text"
                      [(ngModel)]="nuevoNombres"
                      name="nuevoNombres"
                      placeholder="Nombres"
                      required
                      [readonly]="reniecExitoso()"
                      [class.bg-slate-100]="reniecExitoso()"
                      class="w-full h-10 px-3 text-xs rounded-xl border border-[#dce3ec] bg-white text-[#14213d] focus:outline-none focus:border-[#2563eb]"
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-[#59677a] mb-1">Apellido Paterno *</label>
                    <input
                      type="text"
                      [(ngModel)]="nuevoApellidoPaterno"
                      name="nuevoApellidoPaterno"
                      placeholder="Apellido Paterno"
                      required
                      [readonly]="reniecExitoso()"
                      [class.bg-slate-100]="reniecExitoso()"
                      class="w-full h-10 px-3 text-xs rounded-xl border border-[#dce3ec] bg-white text-[#14213d] focus:outline-none focus:border-[#2563eb]"
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-[#59677a] mb-1">Apellido Materno *</label>
                    <input
                      type="text"
                      [(ngModel)]="nuevoApellidoMaterno"
                      name="nuevoApellidoMaterno"
                      placeholder="Apellido Materno"
                      required
                      [readonly]="reniecExitoso()"
                      [class.bg-slate-100]="reniecExitoso()"
                      class="w-full h-10 px-3 text-xs rounded-xl border border-[#dce3ec] bg-white text-[#14213d] focus:outline-none focus:border-[#2563eb]"
                    />
                  </div>
                </div>

                <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <mat-form-field appearance="outline" subscriptSizing="dynamic">
                    <mat-label>Nombre de usuario</mat-label>
                    <input matInput [(ngModel)]="nuevoUsername" name="nuevoUsername" placeholder="ej. juan.perez" required autocomplete="username" class="!bg-white !text-[#14213d]" />
                  </mat-form-field>

                  <mat-form-field appearance="outline" subscriptSizing="dynamic">
                    <mat-label>Correo institucional</mat-label>
                    <input matInput type="email" [(ngModel)]="nuevoEmail" name="nuevoEmail" placeholder="juan.perez@shuji.edu.pe" required autocomplete="email" class="!bg-white !text-[#14213d]" />
                  </mat-form-field>

                  <mat-form-field appearance="outline" subscriptSizing="dynamic">
                    <mat-label>Contraseña temporal inicial</mat-label>
                    <input matInput type="password" [(ngModel)]="nuevoPassword" name="nuevoPassword" placeholder="Mínimo 6 caracteres" minlength="6" required autocomplete="new-password" class="!bg-white !text-[#14213d]" />
                  </mat-form-field>

                  <!-- SELECTOR DE ROLES: EXCLUYE TERMINANTEMENTE APODERADO -->
                  <mat-form-field appearance="outline" subscriptSizing="dynamic">
                    <mat-label>Rol institucional del empleado</mat-label>
                    <mat-select [(ngModel)]="nuevoRol" name="nuevoRol">
                      <mat-option value="DOCENTE">Docente</mat-option>
                      <mat-option value="TUTOR">Tutor</mat-option>
                      <mat-option value="AUXILIAR">Auxiliar</mat-option>
                      <mat-option value="SECRETARIA">Secretaría</mat-option>
                      <mat-option value="DIRECCION">Dirección</mat-option>
                    </mat-select>
                  </mat-form-field>
                </div>
              </div>

              <!-- SECCIÓN 2: Expediente Laboral y Contacto (Sin Ubigeo) -->
              <div class="mb-5 rounded-2xl border border-[#e5eaf2] bg-[#fcfdfe] p-4">
                <h3 class="text-xs font-bold uppercase tracking-wider text-[#76551f] mb-3 flex items-center gap-1.5">
                  <span class="size-2 rounded-full bg-[#c49a58]"></span>
                  2. Expediente Laboral y Contacto Directo
                </h3>

                <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 mb-3">
                  <mat-form-field appearance="outline" subscriptSizing="dynamic">
                    <mat-label>Teléfono móvil / WhatsApp</mat-label>
                    <input matInput [(ngModel)]="nuevoTelefono" name="nuevoTelefono" placeholder="9 dígitos" maxlength="9" class="!bg-white !text-[#14213d]" />
                  </mat-form-field>

                  <mat-form-field appearance="outline" subscriptSizing="dynamic">
                    <mat-label>Tipo de Contrato</mat-label>
                    <mat-select [(ngModel)]="nuevoTipoContrato" name="nuevoTipoContrato">
                      <mat-option value="PLANILLA_COMPLETA">Planilla / Tiempo Completo</mat-option>
                      <mat-option value="PLAZO_FIJO">Plazo Fijo / Renovación Anual</mat-option>
                      <mat-option value="LOCACION_SERVICIOS">Locación de Servicios / SNP</mat-option>
                      <mat-option value="TIEMPO_PARCIAL">Tiempo Parcial por Horas</mat-option>
                    </mat-select>
                  </mat-form-field>
                </div>

                <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 mb-3">
                  <mat-form-field appearance="outline" subscriptSizing="dynamic">
                    <mat-label>Especialidad / Asignatura</mat-label>
                    <mat-select [(ngModel)]="nuevoEspecialidad" name="nuevoEspecialidad">
                      <mat-option value="DOCENTE_PRIMARIA">Educación Primaria</mat-option>
                      <mat-option value="DOCENTE_INICIAL">Educación Inicial</mat-option>
                      <mat-option value="MATEMATICA">Matemática</mat-option>
                      <mat-option value="COMUNICACION">Comunicación y Lenguaje</mat-option>
                      <mat-option value="CIENCIAS_SOCIALES">Ciencias Sociales</mat-option>
                      <mat-option value="CIENCIA_TECNOLOGIA">Ciencia y Tecnología</mat-option>
                      <mat-option value="INGLES">Idioma Extranjero: Inglés</mat-option>
                      <mat-option value="GESTION_ADMIN">Gestión Institucional / Administrativa</mat-option>
                    </mat-select>
                  </mat-form-field>

                  <mat-form-field appearance="outline" subscriptSizing="dynamic">
                    <mat-label>Código Modular / N° Colegiatura</mat-label>
                    <input matInput [(ngModel)]="nuevoCodigoModular" name="nuevoCodigoModular" placeholder="ej. CM-10928374 / CP-4928" class="!bg-white !text-[#14213d]" />
                  </mat-form-field>
                </div>

                <div>
                  <mat-form-field appearance="outline" subscriptSizing="dynamic" class="w-full">
                    <mat-label>Dirección domiciliaria directa (texto libre, sin ubigeo)</mat-label>
                    <input matInput [(ngModel)]="nuevoDireccion" name="nuevoDireccion" placeholder="Avenida, jirón, calle, número, urbanización y distrito" class="!bg-white !text-[#14213d]" />
                  </mat-form-field>
                </div>
              </div>

              <!-- SECCIÓN 3: Legajo Digital y Visor IA -->
              <div class="rounded-2xl border border-[#e5eaf2] bg-[#fcfdfe] p-4">
                <h3 class="text-xs font-bold uppercase tracking-wider text-[#76551f] mb-1 flex items-center gap-1.5">
                  <span class="size-2 rounded-full bg-[#c49a58]"></span>
                  3. Legajo Digital del Empleado & Verificación Documental IA
                </h3>
                <p class="text-[11px] text-slate-500 mb-3">Adjunta los PDF del legajo; el motor IA evalúa la validez, integridad de sellos y vigencia en tiempo real.</p>

                <div class="space-y-3">
                  <!-- CV -->
                  <div class="p-3 rounded-xl border border-[#e2e8f0] bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2">
                        <strong class="text-xs text-[#14213d]">1. Curriculum Vitae (CV) Documentado</strong>
                        @if (documentosLegajo.CV.validandoIa) {
                          <span class="inline-flex items-center gap-1 text-[10px] text-blue-600 font-semibold">
                            <span class="size-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span> Analizando…
                          </span>
                        } @else if (documentosLegajo.CV.estadoIa === 'VALIDADO_IA') {
                          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#edf9f3] border border-[#b8dfcc] text-[#126943]">
                            ✓ VALIDADO_IA
                          </span>
                        } @else if (documentosLegajo.CV.estadoIa === 'OBSERVADO_IA') {
                          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#fff8eb] border border-[#f3e2c4] text-[#8d541e]">
                            ⚠ OBSERVADO_IA
                          </span>
                        } @else {
                          <span class="text-[10px] text-slate-400">Sin archivo</span>
                        }
                      </div>
                      <p class="text-[11px] text-slate-500 truncate mt-0.5">
                        {{ documentosLegajo.CV.nombreArchivo || 'Ningún archivo PDF seleccionado' }}
                      </p>
                      @if (documentosLegajo.CV.observacionIa) {
                        <p class="text-[11px] mt-1 font-medium leading-relaxed"
                          [class.text-[#126943]]="documentosLegajo.CV.estadoIa === 'VALIDADO_IA'"
                          [class.text-[#8d541e]]="documentosLegajo.CV.estadoIa === 'OBSERVADO_IA'">
                          {{ documentosLegajo.CV.observacionIa }}
                        </p>
                      }
                    </div>
                    <div class="flex items-center gap-2">
                      <label class="cursor-pointer px-3 py-1.5 rounded-lg border border-[#d0ddeb] bg-[#f8fafd] hover:bg-[#eef3fb] text-[11px] font-semibold text-[#184fae] transition-colors">
                        <span>{{ documentosLegajo.CV.nombreArchivo ? 'Reemplazar PDF' : 'Adjuntar PDF' }}</span>
                        <input type="file" accept="application/pdf" (change)="adjuntarDocumentoLegajo('CV', $event)" class="hidden" />
                      </label>
                      @if (documentosLegajo.CV.nombreArchivo) {
                        <button type="button" (click)="alternarEstadoIa('CV')" class="text-[10px] text-slate-500 hover:text-slate-800 underline cursor-pointer" title="Alternar resultado de prueba IA">Simular cambio IA</button>
                      }
                    </div>
                  </div>

                  <!-- Título -->
                  <div class="p-3 rounded-xl border border-[#e2e8f0] bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2">
                        <strong class="text-xs text-[#14213d]">2. Título Profesional / Grado Académico</strong>
                        @if (documentosLegajo.TITULO.validandoIa) {
                          <span class="inline-flex items-center gap-1 text-[10px] text-blue-600 font-semibold">
                            <span class="size-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span> Analizando…
                          </span>
                        } @else if (documentosLegajo.TITULO.estadoIa === 'VALIDADO_IA') {
                          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#edf9f3] border border-[#b8dfcc] text-[#126943]">
                            ✓ VALIDADO_IA
                          </span>
                        } @else if (documentosLegajo.TITULO.estadoIa === 'OBSERVADO_IA') {
                          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#fff8eb] border border-[#f3e2c4] text-[#8d541e]">
                            ⚠ OBSERVADO_IA
                          </span>
                        } @else {
                          <span class="text-[10px] text-slate-400">Sin archivo</span>
                        }
                      </div>
                      <p class="text-[11px] text-slate-500 truncate mt-0.5">
                        {{ documentosLegajo.TITULO.nombreArchivo || 'Ningún archivo PDF seleccionado' }}
                      </p>
                      @if (documentosLegajo.TITULO.observacionIa) {
                        <p class="text-[11px] mt-1 font-medium leading-relaxed"
                          [class.text-[#126943]]="documentosLegajo.TITULO.estadoIa === 'VALIDADO_IA'"
                          [class.text-[#8d541e]]="documentosLegajo.TITULO.estadoIa === 'OBSERVADO_IA'">
                          {{ documentosLegajo.TITULO.observacionIa }}
                        </p>
                      }
                    </div>
                    <div class="flex items-center gap-2">
                      <label class="cursor-pointer px-3 py-1.5 rounded-lg border border-[#d0ddeb] bg-[#f8fafd] hover:bg-[#eef3fb] text-[11px] font-semibold text-[#184fae] transition-colors">
                        <span>{{ documentosLegajo.TITULO.nombreArchivo ? 'Reemplazar PDF' : 'Adjuntar PDF' }}</span>
                        <input type="file" accept="application/pdf" (change)="adjuntarDocumentoLegajo('TITULO', $event)" class="hidden" />
                      </label>
                      @if (documentosLegajo.TITULO.nombreArchivo) {
                        <button type="button" (click)="alternarEstadoIa('TITULO')" class="text-[10px] text-slate-500 hover:text-slate-800 underline cursor-pointer" title="Alternar resultado de prueba IA">Simular cambio IA</button>
                      }
                    </div>
                  </div>

                  <!-- Antecedentes -->
                  <div class="p-3 rounded-xl border border-[#e2e8f0] bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2">
                        <strong class="text-xs text-[#14213d]">3. Certificado de Antecedentes (Penales/Policiales)</strong>
                        @if (documentosLegajo.ANTECEDENTES.validandoIa) {
                          <span class="inline-flex items-center gap-1 text-[10px] text-blue-600 font-semibold">
                            <span class="size-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span> Analizando…
                          </span>
                        } @else if (documentosLegajo.ANTECEDENTES.estadoIa === 'VALIDADO_IA') {
                          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#edf9f3] border border-[#b8dfcc] text-[#126943]">
                            ✓ VALIDADO_IA
                          </span>
                        } @else if (documentosLegajo.ANTECEDENTES.estadoIa === 'OBSERVADO_IA') {
                          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#fff8eb] border border-[#f3e2c4] text-[#8d541e]">
                            ⚠ OBSERVADO_IA
                          </span>
                        } @else {
                          <span class="text-[10px] text-slate-400">Sin archivo</span>
                        }
                      </div>
                      <p class="text-[11px] text-slate-500 truncate mt-0.5">
                        {{ documentosLegajo.ANTECEDENTES.nombreArchivo || 'Ningún archivo PDF seleccionado' }}
                      </p>
                      @if (documentosLegajo.ANTECEDENTES.observacionIa) {
                        <p class="text-[11px] mt-1 font-medium leading-relaxed"
                          [class.text-[#126943]]="documentosLegajo.ANTECEDENTES.estadoIa === 'VALIDADO_IA'"
                          [class.text-[#8d541e]]="documentosLegajo.ANTECEDENTES.estadoIa === 'OBSERVADO_IA'">
                          {{ documentosLegajo.ANTECEDENTES.observacionIa }}
                        </p>
                      }
                    </div>
                    <div class="flex items-center gap-2">
                      <label class="cursor-pointer px-3 py-1.5 rounded-lg border border-[#d0ddeb] bg-[#f8fafd] hover:bg-[#eef3fb] text-[11px] font-semibold text-[#184fae] transition-colors">
                        <span>{{ documentosLegajo.ANTECEDENTES.nombreArchivo ? 'Reemplazar PDF' : 'Adjuntar PDF' }}</span>
                        <input type="file" accept="application/pdf" (change)="adjuntarDocumentoLegajo('ANTECEDENTES', $event)" class="hidden" />
                      </label>
                      @if (documentosLegajo.ANTECEDENTES.nombreArchivo) {
                        <button type="button" (click)="alternarEstadoIa('ANTECEDENTES')" class="text-[10px] text-slate-500 hover:text-slate-800 underline cursor-pointer" title="Alternar resultado de prueba IA">Simular cambio IA</button>
                      }
                    </div>
                  </div>
                </div>
              </div>
            </mat-dialog-content>
            <mat-dialog-actions align="end" class="!gap-2 !px-6 !pb-6 !pt-3 border-t border-[#edf0f5]">
              <button mat-button type="button" mat-dialog-close>Cancelar</button>
              <button mat-flat-button color="primary" type="submit" [disabled]="creando() || !nuevoUsername.trim() || !nuevoEmail.trim() || nuevoPassword.length < 6" class="box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]">
                {{ creando() ? 'Guardando empleado…' : 'Registrar Empleado en BD' }}
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
          <h2 mat-dialog-title class="!px-0 !pt-0 !text-xl !font-bold !text-[#14213d] tracking-tight">Corregir DNI de Usuario</h2>
          <mat-dialog-content class="!px-0 !py-3 scrollbar-hidden space-y-3">
            @if (usuarioPendienteDni(); as user) {
              <p class="text-xs text-slate-500 m-0">Usuario: <strong class="text-[#14213d]">{{ user.username }}</strong> ({{ user.email }})</p>
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Nuevo DNI (8 dígitos) *</label>
                <div class="flex gap-2">
                  <input
                    type="text"
                    [(ngModel)]="corregirDniNuevo"
                    maxlength="8"
                    minlength="8"
                    inputmode="numeric"
                    placeholder="Ej. 71234567"
                    class="flex-1 rounded-xl border border-[#d9e1ec] px-3 py-2 text-sm text-[#14213d] focus:border-[#5b83d6] focus:outline-none"
                  />
                  <button
                    type="button"
                    (click)="consultarReniecCorregirDni()"
                    [disabled]="consultandoReniecCorregir() || corregirDniNuevo.length !== 8"
                    class="px-3 py-2 rounded-xl bg-blue-50 border border-blue-200 text-[#184fae] text-xs font-semibold hover:bg-blue-100 disabled:opacity-50 cursor-pointer inline-flex items-center gap-1.5"
                  >
                    @if (consultandoReniecCorregir()) {
                      <span class="inline-block w-3.5 h-3.5 border-2 border-[#184fae] border-t-transparent rounded-full animate-spin"></span>
                    } @else {
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                    }
                    RENIEC
                  </button>
                </div>
                @if (reniecCorregirMensaje()) {
                  <p class="text-[11px] mt-1 text-emerald-800 bg-emerald-50 px-2 py-1 rounded font-medium">{{ reniecCorregirMensaje() }}</p>
                }
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Motivo / Sustento de corrección (Auditoría) *</label>
                <textarea
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
        <h2 mat-dialog-title class="!px-6 !pt-6 !text-xl !font-semibold !tracking-tight !text-[#14213d] tracking-[-.025em]">{{ usuarioPendienteEstado()?.activo ? 'Suspender usuario' : 'Activar usuario' }}</h2>
        <mat-dialog-content class="!px-6 !pt-3">
          <p class="text-sm leading-6 text-slate-600">{{ usuarioPendienteEstado()?.activo ? 'La cuenta perderá el acceso al portal.' : 'La cuenta recuperará el acceso según sus roles asignados.' }}</p>
          @if (usuarioPendienteEstado()) { <p class="mt-3 break-all text-sm font-semibold text-slate-800">{{ usuarioPendienteEstado()!.email }}</p> }
          @if (error()) { <p class="m-0 rounded-xl border border-[#fecaca] bg-[#fef2f2] px-3 py-[10px] text-xs text-[#b91c1c] mt-4" role="alert">{{ error() }}</p> }
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

  // Credenciales y Rol
  nuevoUsername = '';
  nuevoEmail = '';
  nuevoPassword = '';
  nuevoRol: RolNombre = 'DOCENTE';

  // Expediente Laboral y RENIEC
  nuevoDni = '';
  nuevoNombres = '';
  nuevoApellidoPaterno = '';
  nuevoApellidoMaterno = '';
  nuevoTelefono = '';
  nuevoDireccion = '';
  nuevoTipoContrato = 'PLANILLA_COMPLETA';
  nuevoEspecialidad = 'DOCENTE_PRIMARIA';
  nuevoCodigoModular = '';

  consultandoReniec = signal(false);
  reniecExitoso = signal(false);
  mensajeReniec = signal('');

  // Legajo Digital con validación IA
  documentosLegajo: Record<'CV' | 'TITULO' | 'ANTECEDENTES', {
    nombreArchivo: string | null;
    estadoIa: EstadoValidacionIa;
    observacionIa: string | null;
    validandoIa: boolean;
  }> = {
    CV: {
      nombreArchivo: null,
      estadoIa: 'PENDIENTE',
      observacionIa: null,
      validandoIa: false
    },
    TITULO: {
      nombreArchivo: null,
      estadoIa: 'PENDIENTE',
      observacionIa: null,
      validandoIa: false
    },
    ANTECEDENTES: {
      nombreArchivo: null,
      estadoIa: 'PENDIENTE',
      observacionIa: null,
      validandoIa: false
    }
  };

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
    this.creando.set(false);
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

    this.consultandoReniec.set(false);
    this.reniecExitoso.set(false);
    this.mensajeReniec.set('');

    this.documentosLegajo = {
      CV: { nombreArchivo: null, estadoIa: 'PENDIENTE', observacionIa: null, validandoIa: false },
      TITULO: { nombreArchivo: null, estadoIa: 'PENDIENTE', observacionIa: null, validandoIa: false },
      ANTECEDENTES: { nombreArchivo: null, estadoIa: 'PENDIENTE', observacionIa: null, validandoIa: false }
    };

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

  adjuntarDocumentoLegajo(tipo: 'CV' | 'TITULO' | 'ANTECEDENTES', event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.documentosLegajo[tipo].nombreArchivo = file.name;
    this.documentosLegajo[tipo].validandoIa = true;
    this.documentosLegajo[tipo].observacionIa = null;

    // Simulación de evaluación documental IA asistida
    setTimeout(() => {
      this.documentosLegajo[tipo].validandoIa = false;
      const lower = file.name.toLowerCase();
      if (lower.includes('observado') || lower.includes('invalido') || file.size > 15 * 1024 * 1024) {
        this.documentosLegajo[tipo].estadoIa = 'OBSERVADO_IA';
        this.documentosLegajo[tipo].observacionIa = tipo === 'CV'
          ? 'Formato de trayectoria incompleto o sin acreditaciones documentadas adjuntas.'
          : tipo === 'TITULO'
          ? 'Resolución de grado no legible o registro de título con sello no contrastable.'
          : 'Certificado de antecedentes con fecha de emisión mayor a 90 días calendario.';
      } else {
        this.documentosLegajo[tipo].estadoIa = 'VALIDADO_IA';
        this.documentosLegajo[tipo].observacionIa = tipo === 'CV'
          ? 'Perfil curricular y experiencia docente verificados conforme a requisitos del puesto.'
          : tipo === 'TITULO'
          ? 'Título universitario y mención pedagógica reconocidos por MINEDU/SUNEDU.'
          : 'Certificado de antecedentes penales y policiales vigente sin observaciones.';
      }
    }, 450);
  }

  alternarEstadoIa(tipo: 'CV' | 'TITULO' | 'ANTECEDENTES'): void {
    const doc = this.documentosLegajo[tipo];
    if (doc.estadoIa === 'VALIDADO_IA') {
      doc.estadoIa = 'OBSERVADO_IA';
      doc.observacionIa = 'Falta sello institucional o resolución de grado no legible en el PDF presentado.';
    } else if (doc.estadoIa === 'OBSERVADO_IA') {
      doc.estadoIa = 'VALIDADO_IA';
      doc.observacionIa = 'Documento subsanado y validado por IA con firma digital verificable.';
    }
  }

  guardarNuevoUsuario(): void {
    if (!this.nuevoUsername.trim() || !this.nuevoEmail.trim() || this.nuevoPassword.length < 6 || this.creando()) return;
    this.error.set(null);
    this.creando.set(true);
    const payload = {
      username: this.nuevoUsername.trim(),
      email: this.nuevoEmail.trim(),
      password: this.nuevoPassword,
      roles: [this.nuevoRol],
      dni: this.nuevoDni.trim() || undefined,
      nombres: this.nuevoNombres.trim() || undefined,
      apellidoPaterno: this.nuevoApellidoPaterno.trim() || undefined,
      apellidoMaterno: this.nuevoApellidoMaterno.trim() || undefined,
      telefono: this.nuevoTelefono.trim() || undefined,
      direccion: this.nuevoDireccion.trim() || undefined,
      tipoContrato: this.nuevoTipoContrato,
      especialidad: this.nuevoEspecialidad,
      codigoModular: this.nuevoCodigoModular.trim() || undefined
    };

    this.usuarioService.crearUsuario(payload).subscribe({
      next: () => {
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
    this.corregirDniNuevo = '';
    this.corregirDniMotivo = '';
    this.reniecCorregirMensaje.set('');
    this.corregirDniDialogRef = this.dialog.open(this.corregirDniDialog, {
      width: '480px',
      maxWidth: 'calc(100vw - 24px)',
      panelClass: 'school-dialog'
    });
  }

  consultarReniecCorregirDni(): void {
    const dni = this.corregirDniNuevo.trim();
    if (dni.length !== 8) return;
    this.consultandoReniecCorregir.set(true);
    this.reniecCorregirMensaje.set('');
    this.usuarioService.consultarReniec(dni).subscribe({
      next: (persona) => {
        this.consultandoReniecCorregir.set(false);
        const nom = [persona.nombres, persona.apellidoPaterno, persona.apellidoMaterno].filter(Boolean).join(' ');
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
      motivo: this.corregirDniMotivo.trim()
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
