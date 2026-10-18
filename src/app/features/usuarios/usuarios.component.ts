import { Component, inject, signal, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { UsuarioService } from '../../core/services/usuario.service';
import { UserResponseDto, RolNombre } from '../../core/models/auth.model';
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
            class="!h-11 !rounded-xl !px-4 !text-xs !font-semibold sm:!text-sm max-[640px]:w-full box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px] max-[639px]:!leading-4 min-[640px]:!leading-5 lg:!min-w-max lg:!w-auto lg:!shrink-0 lg:!whitespace-nowrap"
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
                          <span class="px-2 py-0.5 rounded text-[11px] font-bold bg-[#f1f4f9] text-[#2563eb] border border-[#e5eaf2]">
                            {{ r.codigo }}
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
                      <button
                        (click)="alternarEstado(user)"
                        [class]="user.activo ? 'text-red-700 hover:text-red-800' : 'text-emerald-700 hover:text-emerald-800'"
                        class="px-2.5 py-1 rounded-lg bg-[#f1f4f9] hover:bg-slate-700 transition font-semibold cursor-pointer text-xs !text-[11px] max-[640px]:w-full box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]"
                      >
                        {{ user.activo ? 'Suspender' : 'Activar' }}
                      </button>
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

      <ng-template #crearUsuarioDialog>
        <h2 mat-dialog-title class="!px-6 !pt-6 !text-xl !font-semibold !tracking-tight !text-[#14213d] tracking-[-.025em]">Nuevo usuario institucional</h2>
        <p class="px-6 text-xs leading-5 text-[#64748b]">Configura las credenciales y el rol de acceso de la cuenta.</p>
        <form id="crear-usuario-form" class="" (ngSubmit)="guardarNuevoUsuario()">
        <mat-dialog-content class="!px-6 !pt-5">
          @if (error()) { <p class="m-0 rounded-xl border border-[#fecaca] bg-[#fef2f2] px-3 py-[10px] text-xs text-[#b91c1c] mb-4" role="alert">{{ error() }}</p> }
          <div class="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
            <mat-form-field appearance="outline" subscriptSizing="dynamic" class="sm:col-span-2">
              <mat-label>Nombre de usuario</mat-label>
              <input matInput [(ngModel)]="nuevoUsername" name="nuevoUsername" placeholder="ej. tutor_secundaria" required autocomplete="username" class="!bg-white !text-[#14213d]" />
            </mat-form-field>
            <mat-form-field appearance="outline" subscriptSizing="dynamic" class="sm:col-span-2">
              <mat-label>Correo institucional</mat-label>
              <input matInput type="email" [(ngModel)]="nuevoEmail" name="nuevoEmail" placeholder="tutor@shuji.edu.pe" required autocomplete="email" class="!bg-white !text-[#14213d]" />
            </mat-form-field>
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Contraseña inicial</mat-label>
              <input matInput type="password" [(ngModel)]="nuevoPassword" name="nuevoPassword" placeholder="Mínimo 6 caracteres" minlength="6" required autocomplete="new-password" class="!bg-white !text-[#14213d]" />
            </mat-form-field>
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Rol institucional</mat-label>
              <mat-select [(ngModel)]="nuevoRol" name="nuevoRol">
                <mat-option value="DOCENTE">Docente</mat-option>
                <mat-option value="SECRETARIA">Secretaría</mat-option>
                <mat-option value="AUXILIAR">Auxiliar</mat-option>
                <mat-option value="TUTOR">Tutor</mat-option>
                <mat-option value="DIRECCION">Dirección</mat-option>
                <mat-option value="APODERADO">Apoderado</mat-option>
              </mat-select>
            </mat-form-field>
          </div>
        </mat-dialog-content>
        <mat-dialog-actions align="end" class="!gap-2 !px-6 !pb-6">
          <button mat-button type="button" mat-dialog-close>Cancelar</button>
          <button mat-flat-button color="primary" type="submit" [disabled]="creando() || !nuevoUsername.trim() || !nuevoEmail.trim() || nuevoPassword.length < 6" class="box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]">{{ creando() ? 'Creando…' : 'Crear Cuenta en BD' }}</button>
        </mat-dialog-actions>
        </form>
      </ng-template>

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
  private dialogRef?: MatDialogRef<unknown>;
  private estadoDialogRef?: MatDialogRef<unknown>;
  readonly error = signal<string | null>(null);
  readonly creando = signal(false);
  readonly actualizandoEstado = signal(false);
  readonly usuarioPendienteEstado = signal<UserResponseDto | null>(null);

  cargando = signal(false);
  readonly usuarios = signal<UserResponseDto[]>([]);
  filtroRol = '';
  nuevoUsername = '';
  nuevoEmail = '';
  nuevoPassword = '';
  nuevoRol: RolNombre = 'DOCENTE';

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
    this.dialogRef = this.dialog.open(this.crearUsuarioDialog, {
      width: '560px',
      maxWidth: 'calc(100vw - 28px)',
      panelClass: 'school-dialog',
      autoFocus: 'dialog',
      restoreFocus: true
    });
  }

  guardarNuevoUsuario(): void {
    if (!this.nuevoUsername.trim() || !this.nuevoEmail.trim() || this.nuevoPassword.length < 6 || this.creando()) return;
    this.error.set(null);
    this.creando.set(true);
    const payload = {
      username: this.nuevoUsername.trim(),
      email: this.nuevoEmail.trim(),
      password: this.nuevoPassword,
      roles: [this.nuevoRol]
    };

    this.usuarioService.crearUsuario(payload).subscribe({
      next: () => {
        this.creando.set(false);
        this.dialogRef?.close();
        this.cargarUsuarios();
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
        user.activo = actualizado ? actualizado.activo : nuevoEstado;
        this.estadoDialogRef?.close();
      },
      error: (err) => {
        this.actualizandoEstado.set(false);
        this.error.set(err?.error?.message || 'No se pudo cambiar el estado del usuario.');
      }
    });
  }
}
