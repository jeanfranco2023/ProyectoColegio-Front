import { Component, TemplateRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthStore } from '../../../core/state/auth.store';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule
  ],
  host: { class: 'block min-h-screen bg-ui-background text-ui-text' },
  template: `
    <main class="ui-login-page grid min-h-screen bg-ui-canvas font-sans text-ui-text min-[851px]:grid-cols-[minmax(0,1.06fr)_minmax(400px,0.94fr)] motion-reduce:[&_*]:![animation-duration:.01ms] motion-reduce:[&_*]:![transition-duration:.01ms] motion-reduce:[&_*::before]:![animation-duration:.01ms] motion-reduce:[&_*::before]:![transition-duration:.01ms]">
      <section class="ui-login-cover relative hidden min-h-screen min-w-0 overflow-hidden border-r border-ui-border bg-ui-surface-soft p-[clamp(28px,5vw,72px)] text-ui-text before:absolute before:top-0 before:left-[clamp(28px,5vw,72px)] before:h-[5px] before:w-[74px] before:bg-ui-gold before:content-[''] min-[851px]:flex min-[851px]:flex-col min-[851px]:justify-between">
        <a routerLink="/auth/login" class="relative z-10 inline-flex w-fit items-center gap-3 text-ui-text no-underline focus-visible:outline-3 focus-visible:outline-ui-focus focus-visible:outline-offset-2" aria-label="I.E.P. Shuji Kitamura">
          <img class="block size-12 shrink-0 rounded-full border border-ui-border bg-white object-contain p-[3px]" src="/images/shuji-kitamura-emblema.jpg" alt="Escudo de Shuji Kitamura">
          <span>
            <span class="block text-sm font-semibold text-ui-text">I.E.P. Shuji Kitamura</span>
            <span class="mt-1 block text-[11px] font-semibold tracking-[0.1em] text-ui-muted">PORTAL INSTITUCIONAL</span>
          </span>
        </a>

        <div class="relative z-10 my-16 w-full max-w-[620px]">
          <p class="m-0 inline-flex items-center gap-2 rounded-full border border-ui-border bg-ui-surface-soft px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ui-action">
            <span class="h-1.5 w-1.5 rounded-full bg-ui-action"></span> Gestión educativa, con propósito
          </p>
          <h1 class="mt-5 mb-[15px] max-w-[570px] font-display text-[clamp(36px,4vw,58px)] font-medium leading-[1.04] tracking-[-0.035em] [text-wrap:balance] text-ui-text">
            Un espacio para aprender, crecer y avanzar.
          </h1>
          <p class="m-0 max-w-[450px] text-sm leading-[1.75] text-ui-muted">
            Accede a las herramientas académicas y administrativas de nuestra comunidad educativa desde un único lugar.
          </p>
          <div class="mt-6 flex items-center gap-[13px]">
            <span class="h-px w-12 bg-ui-gold"></span>
            <p class="m-0 text-xs font-semibold tracking-[0.06em] text-ui-text">Excelencia · Disciplina · Saber</p>
          </div>
        </div>

        <p class="relative z-10 m-0 text-[11px] tracking-wide text-ui-muted">© 2026 I.E.P. Shuji Kitamura · Todos los derechos reservados</p>
      </section>

      <section class="flex min-h-screen min-w-0 flex-col items-center justify-center bg-ui-canvas px-[clamp(24px,5vw,76px)] py-10 max-[850px]:items-stretch max-[850px]:justify-start max-[850px]:px-[18px] max-[850px]:pt-[22px] max-[850px]:pb-7 max-[420px]:px-[14px]">
        <div class="w-full min-w-0 max-w-[430px] max-[850px]:mx-auto">
          <a routerLink="/auth/login" class="mb-6 inline-flex items-center gap-3 text-ui-text no-underline min-[851px]:hidden" aria-label="I.E.P. Shuji Kitamura">
            <img class="block size-11 shrink-0 rounded-full border border-ui-border bg-white object-contain p-[3px]" src="/images/shuji-kitamura-emblema.jpg" alt="Escudo de Shuji Kitamura">
            <span>
              <span class="block text-sm font-semibold text-ui-text">I.E.P. Shuji Kitamura</span>
              <span class="mt-0.5 block text-[11px] font-semibold tracking-[0.15em] text-ui-muted">PORTAL INSTITUCIONAL</span>
            </span>
          </a>

          <div class="w-full min-w-0 rounded-[5px_20px_5px_5px] border border-ui-border bg-ui-surface p-[clamp(22px,3vw,38px)] shadow-[0_8px_22px_rgb(36_55_61_/_6%)] max-[850px]:mx-auto max-[850px]:w-[min(100%,480px)] max-[420px]:px-4 max-[420px]:py-5">
            <div class="mb-[26px]">
              <p class="m-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-ui-action">Acceso seguro</p>
              <h2 class="mt-[10px] mb-2 font-display text-[32px] font-medium tracking-[-0.025em] text-ui-text">Bienvenido de nuevo</h2>
              <p class="m-0 text-sm leading-[1.65] text-ui-muted">Ingresa tus credenciales para continuar al portal escolar.</p>
            </div>

            @if (store.error()) {
              <div role="alert" aria-live="polite" class="mb-5 flex gap-3 rounded-2xl border border-ui-error-border bg-ui-error-bg p-4 text-sm text-ui-error-text">
                <svg class="mt-0.5 h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 9v3m0 4h.01M10.3 3.86L1.82 18.5A2 2 0 003.55 21h16.9a2 2 0 001.73-3L13.7 3.86a2 2 0 00-3.4 0z"/></svg>
                <span><strong class="block text-xs font-bold">No se pudo iniciar sesión</strong><span class="mt-1 block text-xs leading-5">{{ store.error() }}</span></span>
              </div>
            }

            <form (ngSubmit)="submit()" class="grid gap-2">
              <mat-form-field appearance="outline" subscriptSizing="dynamic" class="mb-[5px] block w-full font-sans [--mdc-outlined-text-field-outline-color:var(--ui-control-border)] [--mdc-outlined-text-field-hover-outline-color:var(--ui-action)] [--mdc-outlined-text-field-focus-outline-color:var(--ui-action)] [--mdc-outlined-text-field-focus-label-text-color:var(--ui-action)] [--mdc-outlined-text-field-label-text-color:var(--ui-muted)] [--mdc-outlined-text-field-input-text-color:var(--ui-text)]">
                <mat-label>Usuario o correo institucional</mat-label>
                <input matInput id="username" type="text" name="username" [(ngModel)]="username" placeholder="usuario@shuji.edu.pe" required autocomplete="username" />
              </mat-form-field>

              <mat-form-field appearance="outline" subscriptSizing="dynamic" class="mb-[5px] block w-full font-sans [--mdc-outlined-text-field-outline-color:var(--ui-control-border)] [--mdc-outlined-text-field-hover-outline-color:var(--ui-action)] [--mdc-outlined-text-field-focus-outline-color:var(--ui-action)] [--mdc-outlined-text-field-focus-label-text-color:var(--ui-action)] [--mdc-outlined-text-field-label-text-color:var(--ui-muted)] [--mdc-outlined-text-field-input-text-color:var(--ui-text)]">
                <mat-label>Contraseña</mat-label>
                <input matInput id="password" [type]="showPassword() ? 'text' : 'password'" name="password" [(ngModel)]="password" required autocomplete="current-password" />
                <button mat-icon-button matSuffix type="button" (click)="togglePasswordVisibility()" [attr.aria-label]="showPassword() ? 'Ocultar contraseña' : 'Mostrar contraseña'">
                  @if (showPassword()) {
                    <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.9 5.2A10.8 10.8 0 0112 5c4.5 0 8.2 2.9 9.5 7a10.8 10.8 0 01-3 4.5M6.2 6.2A10.6 10.6 0 002.5 12c1.3 4.1 5 7 9.5 7 1 0 1.9-.1 2.8-.4"/></svg>
                  } @else {
                    <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" d="M2.5 12s3.4-7 9.5-7 9.5 7 9.5 7-3.4 7-9.5 7-9.5-7-9.5-7z"/><circle cx="12" cy="12" r="3" stroke-width="1.7"/></svg>
                  }
                </button>
              </mat-form-field>

              <div class="ui-login-options flex min-h-11 flex-wrap items-center justify-between gap-x-3.5 gap-y-2 py-0.5 pb-2 font-sans text-xs text-ui-text max-[420px]:items-start">
                <mat-checkbox [(ngModel)]="rememberMe" name="rememberMe" color="primary" class="text-xs text-ui-text [--mdc-checkbox-selected-icon-color:var(--ui-action)] [--mdc-checkbox-selected-hover-icon-color:var(--ui-action)] [--mdc-checkbox-selected-focus-icon-color:var(--ui-action)] [--mdc-checkbox-selected-pressed-icon-color:var(--ui-action)] [--mdc-checkbox-selected-checkmark-color:var(--ui-action-text)] [--mdc-checkbox-unselected-icon-color:var(--ui-control-border)]">Recordar este equipo</mat-checkbox>
                <button type="button" (click)="openPasswordHelp(passwordHelp)" class="min-h-11 cursor-pointer border-0 bg-transparent py-2 pl-2 font-sans text-xs font-semibold text-ui-action underline underline-offset-[3px] focus-visible:outline-3 focus-visible:outline-ui-focus focus-visible:outline-offset-2">¿Olvidaste tu clave?</button>
              </div>

              <button mat-flat-button color="primary" type="submit" [disabled]="store.isLoading() || !username || !password" [attr.aria-busy]="store.isLoading()" class="!min-h-12 !w-full !rounded-[3px] !bg-ui-action !font-sans !text-sm !font-semibold !text-ui-action-text !shadow-none focus-visible:outline-3 focus-visible:outline-ui-focus focus-visible:outline-offset-2">
                <span class="inline-flex items-center justify-center gap-2">
                  @if (store.isLoading()) {
                    <mat-spinner diameter="18" aria-label="Validando acceso"></mat-spinner>
                    <span>Validando acceso…</span>
                  } @else {
                    <span>Ingresar al portal</span>
                  }
                </span>
              </button>
            </form>

            <div class="mt-6 flex items-start gap-3 border border-ui-border bg-ui-surface-soft p-3.5">
              <span class="grid size-8 shrink-0 place-items-center border border-ui-action bg-ui-action text-ui-action-text">
                <svg class="size-[17px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 3l8 4v5c0 5-3.4 8-8 9-4.6-1-8-4-8-9V7l8-4z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 12l2 2 4-4"/></svg>
              </span>
              <p class="m-0 text-[11px] leading-[1.6] text-ui-muted"><strong class="mb-0.5 block text-xs font-semibold text-ui-text">Tu información está protegida</strong>El acceso está reservado a usuarios autorizados de la comunidad educativa.</p>
            </div>
          </div>

          <p class="mt-[18px] mb-0 text-center text-[11px] tracking-wide text-ui-muted">© 2026 I.E.P. Shuji Kitamura · Excelencia, disciplina y saber</p>
        </div>
      </section>

      <ng-template #passwordHelp>
        <h2 mat-dialog-title class="!text-xl !font-semibold !tracking-tight !text-ui-text">Recuperación de contraseña</h2>
        <mat-dialog-content class="!text-sm !leading-6 !text-ui-muted">
          Por políticas de seguridad institucional, solicita el restablecimiento de tu acceso en Secretaría o mediante la Dirección Académica.
        </mat-dialog-content>
        <mat-dialog-actions align="end" class="!px-6 !pb-5">
          <button mat-flat-button color="primary" mat-dialog-close class="!min-h-11 !bg-ui-action !text-ui-action-text">Entendido</button>
        </mat-dialog-actions>
      </ng-template>
    </main>
  `
})
export class LoginComponent {
  readonly store = inject(AuthStore);
  private readonly dialog = inject(MatDialog);

  username = '';
  password = '';
  rememberMe = true;
  showPassword = signal(false);

  togglePasswordVisibility(): void {
    this.showPassword.update(value => !value);
  }

  openPasswordHelp(template: TemplateRef<unknown>): void {
    this.dialog.open(template, {
      width: 'min(460px, calc(100vw - 32px))',
      maxWidth: '100vw',
      autoFocus: false
    });
  }

  submit(): void {
    if (!this.username || !this.password) return;

    this.store.login({
      username: this.username.trim(),
      password: this.password
    }).subscribe({
      next: () => {},
      error: () => {}
    });
  }
}
