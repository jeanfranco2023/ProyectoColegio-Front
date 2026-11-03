import { Component, ElementRef, inject, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthStore } from '../../core/state/auth.store';
import { UsuarioService } from '../../core/services/usuario.service';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatFormFieldModule, MatInputModule],
template: `
    <div class="max-w-4xl min-w-0 space-y-8 font-sans text-ui-text [&_button]:min-h-11 [&_input]:min-h-11 [&_:focus-visible]:outline-[3px] [&_:focus-visible]:outline-[var(--ui-action)] [&_:focus-visible]:outline-offset-[3px] [&_.grid>div]:min-w-0 [&_.grid>article]:min-w-0">
      <!-- Header -->
      <div class="border-t-[3px] border-[var(--ui-gold)]/50 pt-3">
        <h2 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-ui-text">Mi Perfil Institucional</h2>
        <p class="text-sm text-ui-muted mt-1">
          Información de la cuenta de usuario, credenciales de acceso y roles autorizados.
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- User Info Card -->
        <div class="md:col-span-1 p-6 rounded-2xl bg-ui-surface border border-ui-divider space-y-5 text-center">
          <div class="w-20 h-20 mx-auto rounded-3xl p-0.5 shadow-xl flex items-center justify-center">
            <div class="w-full h-full bg-ui-surface rounded-[22px] flex items-center justify-center font-black text-2xl text-ui-action">
              {{ (store.user()?.username || 'U').substring(0, 2) | uppercase }}
            </div>
          </div>

          <div>
            <h3 class="text-lg font-bold text-ui-text">{{ store.user()?.username }}</h3>
            <p class="text-xs !text-[11px] text-ui-muted font-mono">{{ store.user()?.email }}</p>
          </div>

          <div class="pt-4 border-t border-ui-divider text-left space-y-2">
            <span class="text-[11px] font-bold uppercase text-ui-muted tracking-wider">Roles Asignados</span>
            <div class="flex flex-wrap gap-1.5">
              @for (rol of store.roles(); track rol) {
                <span class="px-2.5 py-1 rounded-lg bg-ui-info-bg border border-ui-info-border text-xs !text-[11px] font-bold text-[var(--ui-action)]">
                  {{ rol }}
                </span>
              }
            </div>
          </div>
        </div>

        <!-- Security / Password Change -->
        <div class="md:col-span-2 p-6 sm:p-8 rounded-2xl bg-ui-surface border border-ui-divider space-y-6">
          <div>
            <h3 class="text-base font-bold text-ui-text">Seguridad de la Cuenta</h3>
            <p class="text-xs !text-[11px] text-ui-muted mt-0.5">
              Actualice periódicamente su contraseña para preservar la integridad de los datos CNEB.
            </p>
          </div>

          @if (mensajeExito()) {
            <div class="p-3.5 rounded-xl bg-ui-success-bg border border-ui-success-border text-xs !text-[11px] text-ui-success-text">
              ✓ Contraseña actualizada exitosamente.
            </div>
          }

          @if (mensajeError()) {
            <div class="p-3.5 rounded-xl bg-ui-error-bg border border-ui-error-border text-xs !text-[11px] text-ui-error-text">
              ✕ {{ mensajeError() }}
            </div>
          }

          <button mat-flat-button color="primary" type="button" (click)="abrirCambioPassword()" class="!rounded-xl !px-5 !text-xs !font-semibold max-[640px]:w-full !h-11 !min-h-11">Cambiar contraseña</button>
        </div>
      </div>

      <dialog #passwordDialog class="box-border !w-[min(520px,calc(100vw_-_24px))] !max-w-[calc(100vw_-_24px)] !max-h-[calc(100dvh_-_24px)] overflow-auto border border-ui-divider rounded-[22px] bg-ui-surface text-ui-text p-0 shadow-dialog backdrop:bg-[rgb(12_24_43_/_46%)] backdrop:backdrop-blur-[3px]" aria-labelledby="password-dialog-title">
        <div class="flex max-h-[calc(100dvh-24px)] min-h-0 flex-col"><header class="flex flex-[0_0_auto] items-center justify-between gap-4 border-b border-ui-divider px-6 py-5 max-[639px]:p-4"><div><h3 id="password-dialog-title" class="m-0 text-lg !leading-[27px] font-[750] text-ui-text tracking-[-.025em]">Cambiar contraseña</h3><p class="mb-0 mt-1 text-xs leading-[1.5] text-ui-muted">Usa una clave nueva y confirma que ambas coincidan.</p></div><button type="button" class="grid h-11 w-11 min-h-11 min-w-11 flex-none place-items-center rounded-xl border border-ui-divider bg-ui-surface-soft p-0 text-ui-text font-semibold !font-[650]" (click)="cerrarCambioPassword()" aria-label="Cerrar">✕</button></header>
          <form (ngSubmit)="cambiarPassword()" class="flex min-h-0 flex-[1_1_auto] flex-col"><div class="min-h-0 flex-[1_1_auto] overflow-auto overscroll-contain px-6 py-5 max-[639px]:p-4 space-y-4">
            @if (mensajeError()) { <p class="m-0 rounded-xl border border-ui-error-border bg-ui-error-bg px-3 py-[10px] text-xs text-ui-error-text" role="alert">{{ mensajeError() }}</p> }
            <label class="block min-w-0 text-xs leading-[1.5] font-[650] text-ui-muted [&_input]:mt-[6px] [&_input]:block [&_input]:w-full">Contraseña actual<input type="password" [(ngModel)]="passwordActual" name="passwordActual" required autocomplete="current-password" class="mt-[6px] block w-full min-w-0 min-h-[46px] max-w-full rounded-xl border border-ui-control-border bg-ui-surface px-3 py-[10px] text-ui-text transition-colors placeholder:text-ui-muted focus:border-[var(--ui-focus)] focus:outline-none focus:shadow-[0_0_0_3px_var(--ui-focus-shadow)] max-[639px]:text-base"></label>
            <label class="block min-w-0 text-xs leading-[1.5] font-[650] text-ui-muted [&_input]:mt-[6px] [&_input]:block [&_input]:w-full">Nueva contraseña<input type="password" [(ngModel)]="passwordNuevo" name="passwordNuevo" minlength="6" required autocomplete="new-password" placeholder="Mínimo 6 caracteres" class="mt-[6px] block w-full min-w-0 min-h-[46px] max-w-full rounded-xl border border-ui-control-border bg-ui-surface px-3 py-[10px] text-ui-text transition-colors placeholder:text-ui-muted focus:border-[var(--ui-focus)] focus:outline-none focus:shadow-[0_0_0_3px_var(--ui-focus-shadow)] max-[639px]:text-base"></label>
            <label class="block min-w-0 text-xs leading-[1.5] font-[650] text-ui-muted [&_input]:mt-[6px] [&_input]:block [&_input]:w-full">Confirmar nueva contraseña<input type="password" [(ngModel)]="confirmarPassword" name="confirmarPassword" minlength="6" required autocomplete="new-password" class="mt-[6px] block w-full min-w-0 min-h-[46px] max-w-full rounded-xl border border-ui-control-border bg-ui-surface px-3 py-[10px] text-ui-text transition-colors placeholder:text-ui-muted focus:border-[var(--ui-focus)] focus:outline-none focus:shadow-[0_0_0_3px_var(--ui-focus-shadow)] max-[639px]:text-base"></label>
          </div><footer class="sticky bottom-0 z-[1] flex flex-[0_0_auto] flex-wrap justify-end gap-[10px] border-t border-ui-divider bg-ui-surface px-6 py-[14px] max-[639px]:px-4 max-[639px]:py-3"><button type="button" class="box-border inline-flex min-w-0 min-h-11 items-center justify-center gap-2 rounded-xl border border-ui-divider bg-ui-surface-soft px-4 text-sm font-semibold leading-[1.25] text-center align-middle text-ui-text max-[640px]:w-full" (click)="cerrarCambioPassword()">Cancelar</button><button type="submit" [disabled]="guardando() || !passwordActual || passwordNuevo.length < 6 || passwordNuevo !== confirmarPassword" class="box-border inline-flex min-w-0 min-h-11 items-center justify-center gap-2 rounded-xl border-0 bg-ui-action px-[18px] text-sm font-semibold leading-[1.25] text-center align-middle text-ui-action-text shadow-card disabled:cursor-wait disabled:opacity-[.55] max-[640px]:w-full">{{ guardando() ? 'Actualizando…' : 'Actualizar contraseña' }}</button></footer></form>
        </div>
      </dialog>
    </div>
  `
})
export class PerfilComponent {
  readonly store = inject(AuthStore);
  private readonly usuarioService = inject(UsuarioService);
  @ViewChild('passwordDialog') private passwordDialog!: ElementRef<HTMLDialogElement>;

  passwordActual = '';
  passwordNuevo = '';
  confirmarPassword = '';
  mensajeExito = signal(false);
  mensajeError = signal<string | null>(null);
  guardando = signal(false);

  abrirCambioPassword(): void {
    this.mensajeError.set(null);
    this.passwordActual = '';
    this.passwordNuevo = '';
    this.confirmarPassword = '';
    this.passwordDialog.nativeElement.showModal();
  }

  cerrarCambioPassword(): void { this.passwordDialog.nativeElement.close(); }

  cambiarPassword(): void {
    if (this.passwordNuevo !== this.confirmarPassword) {
      this.mensajeError.set('Las contraseñas no coinciden.');
      return;
    }

    this.mensajeError.set(null);
    this.guardando.set(true);
    this.usuarioService.cambiarPassword({
      passwordActual: this.passwordActual,
      passwordNuevo: this.passwordNuevo
    }).subscribe({
      next: () => {
        this.guardando.set(false);
        this.cerrarCambioPassword();
        this.mensajeExito.set(true);
        this.passwordActual = '';
        this.passwordNuevo = '';
        this.confirmarPassword = '';
        setTimeout(() => this.mensajeExito.set(false), 4000);
      },
      error: (err) => {
        this.guardando.set(false);
        this.mensajeError.set(err?.error?.message || 'Error al actualizar contraseña en la base de datos.');
      }
    });
  }
}
