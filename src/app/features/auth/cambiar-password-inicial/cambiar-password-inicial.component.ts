import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { UsuarioService } from '../../../core/services/usuario.service';
import { AuthStore } from '../../../core/state/auth.store';

@Component({
  selector: 'app-cambiar-password-inicial',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <main class="min-h-screen bg-[#f4f6fb] flex items-center justify-center p-4 font-[Inter,ui-sans-serif,system-ui,sans-serif] text-[#172b4d]">
      <div class="w-full max-w-md mx-auto rounded-[28px] border border-[#e4eaf2] bg-white p-6 sm:p-9 shadow-[0_24px_70px_rgba(23,43,77,0.10)] scrollbar-hidden">
        <!-- Logo & Header -->
        <div class="flex items-center gap-3 mb-6">
          <img class="size-11 shrink-0 rounded-full border-2 border-[#c49a58] bg-white object-contain p-[2px]" src="/images/shuji-kitamura-emblema.jpg" alt="Escudo de Shuji Kitamura">
          <div>
            <span class="block text-sm font-bold text-[#14213d]">I.E.P. Shuji Kitamura</span>
            <span class="block text-[10px] font-semibold tracking-[0.14em] text-[#76551f] uppercase">Primer inicio de sesión</span>
          </div>
        </div>

        <div class="mb-6">
          <h1 class="text-2xl font-bold tracking-tight text-[#14213d]">Actualiza tu contraseña</h1>
          <p class="mt-2 text-xs leading-5 text-slate-500">
            Por política de seguridad institucional, debes cambiar la clave temporal asignada para activar tu cuenta de forma definitiva.
          </p>
        </div>

        @if (error()) {
          <div role="alert" class="mb-5 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800">
            <svg class="mt-0.5 size-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
            <span>{{ error() }}</span>
          </div>
        }

        @if (exito()) {
          <div role="status" class="mb-5 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800">
            <svg class="mt-0.5 size-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
            <div>
              <strong class="block font-semibold">¡Contraseña actualizada con éxito!</strong>
              <span class="text-[11px] text-emerald-700">Redirigiendo a tu espacio de trabajo institucional…</span>
            </div>
          </div>
        }

        <form (ngSubmit)="guardar()" class="space-y-4">
          <!-- Contraseña actual -->
          <div>
            <label for="passwordActual" class="block text-xs font-bold text-[#34445d] mb-1">
              Contraseña actual (temporal) <span class="text-[#c49a58]">*</span>
            </label>
            <div class="relative">
              <input
                id="passwordActual"
                [type]="verActual() ? 'text' : 'password'"
                [(ngModel)]="passwordActual"
                name="passwordActual"
                placeholder="Ingresa la clave temporal con la que accediste"
                required
                autocomplete="current-password"
                class="w-full h-11 px-3.5 pr-10 text-xs rounded-xl border border-[#dce3ec] focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 text-[#14213d]"
              />
              <button
                type="button"
                (click)="verActual.set(!verActual())"
                class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                [attr.aria-label]="verActual() ? 'Ocultar contraseña actual' : 'Ver contraseña actual'"
              >
                @if (verActual()) {
                  <svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"/></svg>
                } @else {
                  <svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                }
              </button>
            </div>
          </div>

          <!-- Nueva contraseña -->
          <div>
            <label for="passwordNuevo" class="block text-xs font-bold text-[#34445d] mb-1">
              Nueva contraseña <span class="text-[#c49a58]">*</span>
            </label>
            <div class="relative">
              <input
                id="passwordNuevo"
                [type]="verNuevo() ? 'text' : 'password'"
                [(ngModel)]="passwordNuevo"
                name="passwordNuevo"
                placeholder="Crea una contraseña segura"
                required
                autocomplete="new-password"
                class="w-full h-11 px-3.5 pr-10 text-xs rounded-xl border border-[#dce3ec] focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 text-[#14213d]"
              />
              <button
                type="button"
                (click)="verNuevo.set(!verNuevo())"
                class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                [attr.aria-label]="verNuevo() ? 'Ocultar nueva contraseña' : 'Ver nueva contraseña'"
              >
                @if (verNuevo()) {
                  <svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"/></svg>
                } @else {
                  <svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                }
              </button>
            </div>
          </div>

          <!-- Indicadores de robustez -->
          <div class="rounded-xl bg-[#f8fafc] border border-[#e2e8f0] p-3 text-[11px] space-y-1.5">
            <span class="block font-semibold text-slate-700 mb-1">Requisitos de la nueva clave:</span>
            <div class="flex items-center gap-2" [class.text-emerald-700]="tieneMinimo8()" [class.text-slate-400]="!tieneMinimo8()">
              <span class="size-3.5 inline-flex items-center justify-center rounded-full text-[9px] font-bold" [class.bg-emerald-100]="tieneMinimo8()" [class.bg-slate-200]="!tieneMinimo8()">
                {{ tieneMinimo8() ? '✓' : '•' }}
              </span>
              <span>Mínimo 8 caracteres</span>
            </div>
            <div class="flex items-center gap-2" [class.text-emerald-700]="tieneMayuscula()" [class.text-slate-400]="!tieneMayuscula()">
              <span class="size-3.5 inline-flex items-center justify-center rounded-full text-[9px] font-bold" [class.bg-emerald-100]="tieneMayuscula()" [class.bg-slate-200]="!tieneMayuscula()">
                {{ tieneMayuscula() ? '✓' : '•' }}
              </span>
              <span>Al menos una letra mayúscula (A-Z)</span>
            </div>
            <div class="flex items-center gap-2" [class.text-emerald-700]="tieneMinuscula()" [class.text-slate-400]="!tieneMinuscula()">
              <span class="size-3.5 inline-flex items-center justify-center rounded-full text-[9px] font-bold" [class.bg-emerald-100]="tieneMinuscula()" [class.bg-slate-200]="!tieneMinuscula()">
                {{ tieneMinuscula() ? '✓' : '•' }}
              </span>
              <span>Al menos una letra minúscula (a-z)</span>
            </div>
            <div class="flex items-center gap-2" [class.text-emerald-700]="tieneNumero()" [class.text-slate-400]="!tieneNumero()">
              <span class="size-3.5 inline-flex items-center justify-center rounded-full text-[9px] font-bold" [class.bg-emerald-100]="tieneNumero()" [class.bg-slate-200]="!tieneNumero()">
                {{ tieneNumero() ? '✓' : '•' }}
              </span>
              <span>Al menos un número (0-9)</span>
            </div>
          </div>

          <!-- Confirmar nueva contraseña -->
          <div>
            <label for="passwordConfirmacion" class="block text-xs font-bold text-[#34445d] mb-1">
              Confirmar nueva contraseña <span class="text-[#c49a58]">*</span>
            </label>
            <div class="relative">
              <input
                id="passwordConfirmacion"
                [type]="verConfirmacion() ? 'text' : 'password'"
                [(ngModel)]="passwordConfirmacion"
                name="passwordConfirmacion"
                placeholder="Repite la nueva contraseña exactamente"
                required
                autocomplete="new-password"
                class="w-full h-11 px-3.5 pr-10 text-xs rounded-xl border border-[#dce3ec] focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 text-[#14213d]"
              />
              <button
                type="button"
                (click)="verConfirmacion.set(!verConfirmacion())"
                class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                [attr.aria-label]="verConfirmacion() ? 'Ocultar confirmación' : 'Ver confirmación'"
              >
                @if (verConfirmacion()) {
                  <svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"/></svg>
                } @else {
                  <svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                }
              </button>
            </div>
            @if (passwordConfirmacion && !coinciden()) {
              <p class="mt-1 text-[11px] text-rose-600 font-medium">Las contraseñas no coinciden.</p>
            }
          </div>

          <button
            type="submit"
            [disabled]="guardando() || !formularioValido()"
            class="w-full h-11 mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-[#245dcc] hover:bg-[#1f52b6] text-white text-xs font-semibold shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            @if (guardando()) {
              <span class="inline-block size-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <span>Guardando nueva contraseña…</span>
            } @else {
              <span>Actualizar contraseña y acceder</span>
              <span>→</span>
            }
          </button>
        </form>

        <p class="mt-6 text-center text-[10px] text-slate-400">
          I.E.P. Shuji Kitamura · Seguridad y privacidad garantizadas
        </p>
      </div>
    </main>
  `
})
export class CambiarPasswordInicialComponent {
  private readonly usuarioService = inject(UsuarioService);
  private readonly store = inject(AuthStore);
  private readonly router = inject(Router);

  passwordActual = '';
  passwordNuevo = '';
  passwordConfirmacion = '';

  verActual = signal(false);
  verNuevo = signal(false);
  verConfirmacion = signal(false);

  guardando = signal(false);
  error = signal<string | null>(null);
  exito = signal(false);

  tieneMinimo8(): boolean {
    return this.passwordNuevo.length >= 8;
  }

  tieneMayuscula(): boolean {
    return /[A-Z]/.test(this.passwordNuevo);
  }

  tieneMinuscula(): boolean {
    return /[a-z]/.test(this.passwordNuevo);
  }

  tieneNumero(): boolean {
    return /[0-9]/.test(this.passwordNuevo);
  }

  coinciden(): boolean {
    return this.passwordNuevo === this.passwordConfirmacion && this.passwordConfirmacion.length > 0;
  }

  formularioValido(): boolean {
    return (
      !!this.passwordActual.trim() &&
      this.tieneMinimo8() &&
      this.tieneMayuscula() &&
      this.tieneMinuscula() &&
      this.tieneNumero() &&
      this.coinciden() &&
      this.passwordNuevo !== this.passwordActual
    );
  }

  guardar(): void {
    if (!this.formularioValido() || this.guardando()) return;

    this.error.set(null);
    this.guardando.set(true);

    this.usuarioService
      .cambiarPassword({
        passwordActual: this.passwordActual,
        passwordNuevo: this.passwordNuevo
      })
      .pipe(finalize(() => this.guardando.set(false)))
      .subscribe({
        next: () => {
          this.exito.set(true);
          this.store.marcarPasswordCambiado();
          setTimeout(() => {
            void this.router.navigateByUrl(this.store.homeRoute());
          }, 1200);
        },
        error: (err) => {
          const msg =
            err?.error?.message ||
            'No se pudo actualizar la contraseña. Verifica que tu contraseña actual sea la correcta.';
          this.error.set(msg);
        }
      });
  }
}
