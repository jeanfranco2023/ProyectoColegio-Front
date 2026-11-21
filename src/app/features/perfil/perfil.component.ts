import { Component, ElementRef, inject, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthStore } from '../../core/state/auth.store';
import { UsuarioService } from '../../core/services/usuario.service';
import { obtenerFotoUsuario } from '../../core/utils/avatar.util';
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
        <p class="m-0 text-[11px] font-extrabold uppercase tracking-[.12em] text-ui-muted">Ficha Personal Institucional</p>
        <h2 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-ui-text">Mi Perfil Institucional</h2>
        <p class="text-sm text-ui-muted mt-1">
          Consulta los datos de tu cuenta institucional, datos de contacto y gestiona la seguridad de tu contraseña.
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- Sección 1: Ficha Personal y Datos de la Cuenta -->
        <section class="md:col-span-2 p-6 sm:p-8 rounded-2xl bg-ui-surface border border-ui-divider space-y-6" aria-labelledby="datos-cuenta-title">
          <div class="flex flex-col sm:flex-row sm:items-center gap-4 border-b border-ui-divider pb-5">
            <div class="relative w-20 h-20 shrink-0 rounded-3xl p-0.5 shadow-md flex items-center justify-center overflow-hidden bg-ui-surface-soft border border-ui-divider">
              <span class="font-black text-2xl text-ui-action">
                {{ ((store.user()?.nombreCompleto || store.user()?.username) || 'U').substring(0, 2) | uppercase }}
              </span>
              @if (store.user()) {
                <img
                  [src]="fotoPerfil()"
                  [alt]="store.user()?.nombreCompleto || store.user()?.username || 'Avatar de usuario'"
                  class="absolute inset-0 w-full h-full object-cover rounded-[22px]"
                  (error)="$any($event.target).hidden = true"
                />
              }
            </div>

            <div class="min-w-0 flex-1">
              <span class="text-[11px] font-bold uppercase tracking-wider text-ui-muted block">1. Datos de la cuenta</span>
              <h3 id="datos-cuenta-title" class="text-xl font-extrabold text-ui-text m-0 mt-0.5 truncate">
                {{ store.user()?.nombreCompleto || store.user()?.username || 'Usuario Institucional' }}
              </h3>
              <p class="text-xs text-ui-muted font-mono m-0 mt-1">@{{ store.user()?.username }} · {{ store.user()?.email || 'Sin correo registrado' }}</p>
              <div class="mt-2.5 flex flex-wrap gap-1.5" aria-label="Roles institucionales">
                @for (rol of store.roles(); track rol) {
                  <span class="px-2.5 py-1 rounded-lg bg-ui-info-bg border border-ui-info-border text-xs !text-[11px] font-bold text-[var(--ui-action)]">
                    {{ rol }}
                  </span>
                }
              </div>
            </div>
          </div>

          <dl class="grid grid-cols-1 sm:grid-cols-2 gap-4 m-0 text-sm">
            <div class="rounded-xl border border-ui-divider bg-ui-surface-soft p-3.5">
              <dt class="text-[11px] font-bold uppercase tracking-wider text-ui-muted">Nombre completo</dt>
              <dd class="m-0 mt-1 font-bold text-ui-text">{{ store.user()?.nombreCompleto || store.user()?.username || 'No especificado' }}</dd>
            </div>
            <div class="rounded-xl border border-ui-divider bg-ui-surface-soft p-3.5">
              <dt class="text-[11px] font-bold uppercase tracking-wider text-ui-muted">Correo electrónico de contacto</dt>
              <dd class="m-0 mt-1 font-mono font-semibold text-ui-text break-all">{{ store.user()?.email || 'No registrado' }}</dd>
            </div>
            <div class="rounded-xl border border-ui-divider bg-ui-surface-soft p-3.5">
              <dt class="text-[11px] font-bold uppercase tracking-wider text-ui-muted">Documento de identidad (DNI)</dt>
              <dd class="m-0 mt-1 font-mono font-semibold text-ui-text">{{ store.user()?.dni || 'Registrado en legajo' }}</dd>
            </div>
            <div class="rounded-xl border border-ui-divider bg-ui-surface-soft p-3.5">
              <dt class="text-[11px] font-bold uppercase tracking-wider text-ui-muted">Área / Especialidad institucional</dt>
              <dd class="m-0 mt-1 font-semibold text-ui-text">{{ store.user()?.especialidad || 'Gestión Académica / Institucional' }}</dd>
            </div>
          </dl>
        </section>

        <!-- Sección 2: Seguridad (Cambio de contraseña) -->
        <section class="md:col-span-1 p-6 rounded-2xl bg-ui-surface border border-ui-divider space-y-5 flex flex-col justify-between" aria-labelledby="seguridad-cuenta-title">
          <div class="space-y-3">
            <span class="text-[11px] font-bold uppercase tracking-wider text-ui-muted block">2. Seguridad (cambio de contraseña)</span>
            <h3 id="seguridad-cuenta-title" class="text-base font-bold text-ui-text m-0">Seguridad de la Cuenta</h3>
            <p class="text-xs !text-[11px] text-ui-muted leading-relaxed m-0">
              Actualice periódicamente su contraseña para preservar la integridad de los datos CNEB y su sesión institucional.
            </p>

            @if (mensajeExito()) {
              <div class="p-3.5 rounded-xl bg-ui-success-bg border border-ui-success-border text-xs !text-[11px] text-ui-success-text" role="status">
                ✓ Contraseña actualizada exitosamente.
              </div>
            }

            @if (mensajeError()) {
              <div class="p-3.5 rounded-xl bg-ui-error-bg border border-ui-error-border text-xs !text-[11px] text-ui-error-text" role="alert">
                ✕ {{ mensajeError() }}
              </div>
            }
          </div>

          <button mat-flat-button color="primary" type="button" (click)="abrirCambioPassword()" class="!rounded-xl !px-5 !text-xs !font-semibold w-full !h-11 !min-h-11">
            Cambiar contraseña
          </button>
        </section>
      </div>

      <dialog #passwordDialog class="box-border !w-[min(520px,calc(100vw_-_24px))] !max-w-[calc(100vw_-_24px)] !max-h-[calc(100dvh_-_24px)] overflow-auto border border-ui-divider rounded-[22px] bg-ui-surface text-ui-text p-0 shadow-dialog backdrop:bg-[rgb(12_24_43_/_46%)] backdrop:backdrop-blur-[3px]" aria-labelledby="password-dialog-title">
        <div class="flex max-h-[calc(100dvh-24px)] min-h-0 flex-col">
          <header class="flex flex-[0_0_auto] items-center justify-between gap-4 border-b border-ui-divider px-6 py-5 max-[639px]:p-4">
            <div>
              <h3 id="password-dialog-title" class="m-0 text-lg !leading-[27px] font-[750] text-ui-text tracking-[-.025em]">Cambiar contraseña</h3>
              <p class="mb-0 mt-1 text-xs leading-[1.5] text-ui-muted">Usa una clave nueva de al menos 8 caracteres y confirma que ambas coincidan.</p>
            </div>
            <button type="button" class="grid h-11 w-11 min-h-11 min-w-11 flex-none place-items-center rounded-xl border border-ui-divider bg-ui-surface-soft p-0 text-ui-text font-semibold !font-[650]" (click)="cerrarCambioPassword()" aria-label="Cerrar">✕</button>
          </header>
          <form (ngSubmit)="cambiarPassword()" class="flex min-h-0 flex-[1_1_auto] flex-col">
            <div class="min-h-0 flex-[1_1_auto] overflow-auto overscroll-contain px-6 py-5 max-[639px]:p-4 space-y-4">
              @if (mensajeError()) {
                <p class="m-0 rounded-xl border border-ui-error-border bg-ui-error-bg px-3 py-[10px] text-xs text-ui-error-text" role="alert">{{ mensajeError() }}</p>
              }
              <div>
                <label for="perfil-password-actual" class="block min-w-0 text-xs leading-[1.5] font-[650] text-ui-muted">Contraseña actual *</label>
                <input id="perfil-password-actual" type="password" [(ngModel)]="passwordActual" name="passwordActual" required autocomplete="current-password" aria-describedby="perfil-password-actual-help" class="mt-[6px] block w-full min-w-0 min-h-[46px] max-w-full rounded-xl border border-ui-control-border bg-ui-surface px-3 py-[10px] text-ui-text transition-colors placeholder:text-ui-muted focus:border-[var(--ui-focus)] focus:outline-none focus:shadow-[0_0_0_3px_var(--ui-focus-shadow)] max-[639px]:text-base">
                <span id="perfil-password-actual-help" class="mt-1 block text-[11px] text-ui-muted">Ingresa tu clave vigente para autorizar el cambio.</span>
              </div>

              <div>
                <label for="perfil-password-nuevo" class="block min-w-0 text-xs leading-[1.5] font-[650] text-ui-muted">Nueva contraseña *</label>
                <input id="perfil-password-nuevo" type="password" [(ngModel)]="passwordNuevo" name="passwordNuevo" minlength="8" required autocomplete="new-password" placeholder="Mínimo 8 caracteres" aria-describedby="perfil-password-nuevo-error" class="mt-[6px] block w-full min-w-0 min-h-[46px] max-w-full rounded-xl border border-ui-control-border bg-ui-surface px-3 py-[10px] text-ui-text transition-colors placeholder:text-ui-muted focus:border-[var(--ui-focus)] focus:outline-none focus:shadow-[0_0_0_3px_var(--ui-focus-shadow)] max-[639px]:text-base">
                @if (passwordNuevo && passwordNuevo.length < 8) {
                  <span id="perfil-password-nuevo-error" class="mt-1 block text-xs font-semibold text-ui-error-text" role="alert">La nueva contraseña debe tener al menos 8 caracteres.</span>
                }
              </div>

              <div>
                <label for="perfil-password-confirmar" class="block min-w-0 text-xs leading-[1.5] font-[650] text-ui-muted">Confirmar nueva contraseña *</label>
                <input id="perfil-password-confirmar" type="password" [(ngModel)]="confirmarPassword" name="confirmarPassword" minlength="8" required autocomplete="new-password" placeholder="Mínimo 8 caracteres" aria-describedby="perfil-password-confirmar-error" class="mt-[6px] block w-full min-w-0 min-h-[46px] max-w-full rounded-xl border border-ui-control-border bg-ui-surface px-3 py-[10px] text-ui-text transition-colors placeholder:text-ui-muted focus:border-[var(--ui-focus)] focus:outline-none focus:shadow-[0_0_0_3px_var(--ui-focus-shadow)] max-[639px]:text-base">
                @if (confirmarPassword && passwordNuevo !== confirmarPassword) {
                  <span id="perfil-password-confirmar-error" class="mt-1 block text-xs font-semibold text-ui-error-text" role="alert">Las contraseñas no coinciden.</span>
                }
              </div>
            </div>
            <footer class="sticky bottom-0 z-[1] flex flex-[0_0_auto] flex-wrap justify-end gap-[10px] border-t border-ui-divider bg-ui-surface px-6 py-[14px] max-[639px]:px-4 max-[639px]:py-3">
              <button type="button" class="box-border inline-flex min-w-0 min-h-11 items-center justify-center gap-2 rounded-xl border border-ui-divider bg-ui-surface-soft px-4 text-sm font-semibold leading-[1.25] text-center align-middle text-ui-text max-[640px]:w-full" (click)="cerrarCambioPassword()">Cancelar</button>
              <button type="submit" [disabled]="guardando() || !passwordActual || passwordNuevo.length < 8 || passwordNuevo !== confirmarPassword" class="box-border inline-flex min-w-0 min-h-11 items-center justify-center gap-2 rounded-xl border-0 bg-ui-action px-[18px] text-sm font-semibold leading-[1.25] text-center align-middle text-ui-action-text shadow-card disabled:cursor-wait disabled:opacity-[.55] max-[640px]:w-full">{{ guardando() ? 'Actualizando…' : 'Actualizar contraseña' }}</button>
            </footer>
          </form>
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

  fotoPerfil(): string {
    return obtenerFotoUsuario(this.store.user() ?? {});
  }

  abrirCambioPassword(): void {
    this.mensajeError.set(null);
    this.passwordActual = '';
    this.passwordNuevo = '';
    this.confirmarPassword = '';
    this.passwordDialog?.nativeElement?.showModal();
  }

  cerrarCambioPassword(): void {
    this.passwordDialog?.nativeElement?.close();
  }

  cambiarPassword(): void {
    if (this.passwordNuevo.length < 8) {
      this.mensajeError.set('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }
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
