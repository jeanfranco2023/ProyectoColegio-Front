import { Component, inject, ViewEncapsulation } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { AuthStore } from '../../core/state/auth.store';

export type AdminMenuRole = 'DIRECCION' | 'SECRETARIA' | 'DOCENTE' | 'AUXILIAR' | 'TUTOR' | 'APODERADO';

export interface AdminMenuItem {
  label: string;
  route: string;
  roles: readonly AdminMenuRole[];
  section: 'Principal' | 'Vida académica' | 'Comunidad y gestión';
  icon: string;
}

const MANAGEMENT_ROLES: readonly AdminMenuRole[] = ['DIRECCION', 'SECRETARIA'];
const ACADEMIC_ROLES: readonly AdminMenuRole[] = ['DIRECCION', 'SECRETARIA', 'DOCENTE'];
const STUDENT_SUPPORT_ROLES: readonly AdminMenuRole[] = ['DIRECCION', 'SECRETARIA', 'AUXILIAR', 'TUTOR'];
const FAMILY_ROLES: readonly AdminMenuRole[] = ['DIRECCION', 'SECRETARIA', 'APODERADO'];
const ROLE_LABELS: Record<AdminMenuRole, string> = {
  DIRECCION: 'Dirección',
  SECRETARIA: 'Secretaría',
  DOCENTE: 'Docente',
  AUXILIAR: 'Auxiliar',
  TUTOR: 'Tutor',
  APODERADO: 'Apoderado'
};

// This is the single source for both desktop and mobile navigation.
export const ADMIN_MENU_ITEMS: readonly AdminMenuItem[] = [
  { label: 'Panel general', route: '/admin/dashboard', roles: MANAGEMENT_ROLES, section: 'Principal', icon: 'M3 3h8v8H3z M13 3h8v5h-8z M13 10h8v11h-8z M3 13h8v8H3z' },
  { label: 'Matrículas', route: '/admin/matriculas', roles: MANAGEMENT_ROLES, section: 'Vida académica', icon: 'M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 012 2v13a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z' },
  { label: 'Aulas y horarios', route: '/admin/academico', roles: MANAGEMENT_ROLES, section: 'Vida académica', icon: 'M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6M8 9h.01M16 9h.01' },
  { label: 'Malla horaria', route: '/admin/horarios', roles: ACADEMIC_ROLES, section: 'Vida académica', icon: 'M4 4h16v16H4zM4 10h16M10 4v16' },
  { label: 'Refuerzo académico', route: '/admin/refuerzos', roles: ACADEMIC_ROLES, section: 'Vida académica', icon: 'M12 3l9 5-9 5-9-5zM5 11v6l7 4 7-4v-6' },
  { label: 'Calificaciones', route: '/admin/calificaciones', roles: ACADEMIC_ROLES, section: 'Vida académica', icon: 'M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2zM7 8h2m4 0h4M7 12h2m4 0h4M7 16h2m4 0h4' },
  { label: 'Asistencia', route: '/admin/asistencia', roles: STUDENT_SUPPORT_ROLES, section: 'Vida académica', icon: 'M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11' },
  { label: 'Convivencia', route: '/admin/convivencia', roles: STUDENT_SUPPORT_ROLES, section: 'Vida académica', icon: 'M12 21s-8-4.5-8-11a4.5 4.5 0 018-2.8A4.5 4.5 0 0120 10c0 6.5-8 11-8 11z' },
  { label: 'Tutoría y seguimiento', route: '/admin/tutoria', roles: STUDENT_SUPPORT_ROLES, section: 'Vida académica', icon: 'M4 4h16v16H4zM8 8h8M8 12h8M8 16h5' },
  { label: 'Incidencias y faltas', route: '/admin/observaciones-conductuales', roles: STUDENT_SUPPORT_ROLES, section: 'Vida académica', icon: 'M12 9v2m0 4h.01M3 20h18L12 3z' },
  { label: 'Tesorería y pagos', route: '/admin/tesoreria', roles: FAMILY_ROLES, section: 'Comunidad y gestión', icon: 'M3 6h18v14H3zM3 10h18M7 15h4M6 3h12' },
  { label: 'Comunicados', route: '/admin/comunicados', roles: FAMILY_ROLES, section: 'Comunidad y gestión', icon: 'M4 4h16v16H4zM8 8h8M8 12h8M8 16h5' },
  { label: 'Usuarios y permisos', route: '/admin/usuarios', roles: MANAGEMENT_ROLES, section: 'Comunidad y gestión', icon: 'M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM20 8v6m3-3h-6' },
  { label: 'Portal familiar', route: '/admin/portal-apoderado', roles: FAMILY_ROLES, section: 'Comunidad y gestión', icon: 'M3 11l9-8 9 8M5 10v11h14V10' },
  { label: 'Designar suplente', route: '/admin/suplencias', roles: FAMILY_ROLES, section: 'Comunidad y gestión', icon: 'M4 21v-4h16v4M12 13a5 5 0 100-10 5 5 0 000 10z' },
  { label: 'Gestión de suplentes', route: '/admin/aprobacion-suplencias', roles: MANAGEMENT_ROLES, section: 'Comunidad y gestión', icon: 'M9 12l2 2 4-4M4 3v12l8 6 8-6V3z' },
  { label: 'Mi perfil', route: '/admin/perfil', roles: [], section: 'Comunidad y gestión', icon: 'M20 21a8 8 0 00-16 0M12 13a5 5 0 100-10 5 5 0 000 10z' }
];

export function visibleAdminMenuItems(roles: readonly string[]): readonly AdminMenuItem[] {
  return ADMIN_MENU_ITEMS.filter(item => item.roles.length === 0 || item.roles.some(role => roles.includes(role)));
}

@Component({
  selector: 'app-admin-layout',
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatButtonModule, MatMenuModule],
  template: `
    <div class="min-h-screen bg-ui-background font-sans text-ui-text lg:flex">
      <aside class="hidden w-[268px] shrink-0 flex-col border-r border-ui-border bg-ui-surface text-ui-text lg:sticky lg:top-0 lg:flex lg:h-screen">
        <a routerLink="/admin/dashboard" class="flex min-h-[102px] items-center gap-3 px-6 py-7 no-underline focus-visible:outline-[3px] focus-visible:outline-ui-focus focus-visible:outline-offset-2" aria-label="Inicio institucional">
          <img class="h-[42px] w-[42px] shrink-0 rounded-full bg-white object-contain" src="/images/shuji-kitamura-emblema.jpg" alt="Escudo de I.E.P. Shuji Kitamura">
          <span class="min-w-0">
            <span class="block truncate text-sm font-bold tracking-tight text-ui-text">Shuji Kitamura</span>
            <span class="mt-0.5 block text-[11px] font-medium tracking-[0.12em] text-ui-muted">GESTIÓN ESCOLAR</span>
          </span>
        </a>

        <nav class="flex flex-1 flex-col gap-[5px] overflow-y-auto px-4 pb-5" aria-label="Navegación principal">
          @for (item of visibleMenuItems; track item.route; let i = $index) {
            @if (i === 0 || visibleMenuItems[i - 1].section !== item.section) {
              <p class="mt-[19px] mb-[6px] px-3 text-[11px] font-bold leading-[1.4] tracking-[0.11em] text-ui-muted uppercase">{{ item.section }}</p>
            }
            <a [routerLink]="item.route" routerLinkActive="border-ui-accent bg-ui-surface-soft !text-ui-accent font-bold" class="flex min-h-11 items-center gap-3 rounded-[10px] border-l-2 border-transparent px-3 text-[13px] font-medium text-ui-muted no-underline transition-colors duration-[140ms] hover:bg-ui-surface-soft hover:text-ui-text focus-visible:outline-[3px] focus-visible:outline-ui-focus focus-visible:outline-offset-2" [attr.aria-label]="item.label">
              <svg class="h-[19px] w-[19px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" [attr.d]="item.icon" /></svg>
              <span>{{ item.label }}</span>
            </a>
          }
        </nav>

        <div class="mx-4 mb-4 rounded-2xl border border-ui-border bg-ui-surface-soft p-3.5">
          <div class="flex items-center gap-3">
            <span class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ui-accent text-[13px] font-bold text-ui-accent-text">{{ firstInitial }}</span>
            <span class="min-w-0 flex-1">
              <span class="block truncate text-xs font-semibold text-ui-text">{{ store.user()?.username || 'Usuario' }}</span>
              <span class="mt-0.5 block truncate text-[11px] text-ui-muted">{{ roleLabel }}</span>
            </span>
          </div>
          <button mat-button type="button" (click)="store.logout()" class="mt-3 w-full !min-h-11 !justify-start !rounded-xl !font-[inherit] !text-ui-text [&_.mdc-button__label]:!text-ui-text hover:bg-ui-surface hover:text-ui-accent">
            <span class="inline-flex items-center gap-2 whitespace-nowrap font-[inherit]"><svg class="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M10 17l5-5-5-5m5 5H3m9-9h6a2 2 0 012 2v14a2 2 0 01-2 2h-6" /></svg><span>Cerrar sesión</span></span>
          </button>
        </div>
      </aside>

      <main class="min-w-0 flex-1">
        <header class="sticky top-0 z-40 flex h-[72px] items-center justify-between border-b border-ui-border bg-ui-surface px-4 text-ui-text backdrop-blur-[12px] sm:px-7 xl:px-10 max-[639px]:grid max-[639px]:h-16 max-[639px]:grid-cols-[minmax(0,1fr)_112px] max-[639px]:gap-2 max-[639px]:px-3">
          <div class="flex min-w-0 items-center gap-3 max-[639px]:w-full max-[639px]:max-w-full">
            <button mat-icon-button type="button" [matMenuTriggerFor]="mobileNav" class="!flex !h-11 !w-11 !min-h-11 !min-w-11 !text-ui-text focus-visible:outline-[3px] focus-visible:outline-ui-focus focus-visible:outline-offset-2 lg:!hidden" aria-label="Abrir navegación" aria-haspopup="menu">
              <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <mat-menu #mobileNav="matMenu" class="admin-mobile-nav-panel mt-3 max-h-[calc(100dvh-24px)] overflow-y-auto" xPosition="after" yPosition="below">
              @for (item of visibleMenuItems; track item.route) {
                <a mat-menu-item class="admin-mobile-nav-item flex min-h-11 min-w-[220px] items-center gap-3 border-l-2 border-transparent px-3 text-[13px] leading-[1.35] text-ui-muted no-underline" [routerLink]="item.route" routerLinkActive="border-ui-accent bg-ui-surface-soft !text-ui-accent font-bold" [attr.aria-label]="item.label">
                  <svg class="h-[19px] w-[19px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" [attr.d]="item.icon" /></svg>
                  <span>{{ item.label }}</span>
                </a>
              }
              <div class="my-[6px] h-px bg-ui-border" role="separator"></div>
              <button mat-menu-item class="admin-mobile-nav-item flex min-h-11 min-w-[220px] items-center gap-3 px-3 text-[13px] leading-[1.35] text-ui-muted no-underline" type="button" (click)="store.logout()">
                <svg class="h-[19px] w-[19px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M10 17l5-5-5-5m5 5H3m9-9h6a2 2 0 012 2v14a2 2 0 01-2 2h-6" /></svg>
                <span>Cerrar sesión</span>
              </button>
            </mat-menu>
            <div class="min-w-0 max-w-full">
              <p class="whitespace-nowrap text-[11px] font-bold tracking-[0.16em] text-ui-muted uppercase max-[359px]:truncate max-[359px]:text-[10px] max-[359px]:leading-3 max-[359px]:tracking-[0.04em]">Portal institucional</p>
              <p class="whitespace-nowrap text-sm font-semibold text-ui-text max-[359px]:truncate max-[359px]:text-xs max-[359px]:leading-4">Shuji Kitamura <span class="font-normal text-ui-muted max-[639px]:hidden">/ Gestión escolar</span></p>
            </div>
          </div>

          <a routerLink="/admin/perfil" class="flex min-h-11 items-center gap-2.5 rounded-full border border-ui-border bg-ui-surface px-3 py-2 text-xs font-medium text-ui-muted no-underline hover:border-ui-control-border hover:bg-ui-surface-soft focus-visible:outline-[3px] focus-visible:outline-ui-focus focus-visible:outline-offset-2 max-[639px]:w-[112px] max-[639px]:max-w-[112px] max-[639px]:shrink-0 max-[639px]:gap-1.5 max-[639px]:py-2 max-[639px]:pr-[7px] max-[639px]:pl-1">
            <span class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ui-accent text-[13px] font-bold text-ui-accent-text max-[639px]:h-7 max-[639px]:w-7">{{ firstInitial }}</span>
            <span class="flex min-w-0 flex-col"><span class="block max-w-[180px] truncate font-semibold text-ui-text max-[639px]:max-w-[58px] max-[639px]:text-[11px]">{{ store.user()?.username || 'Usuario' }}</span><span class="block max-w-[180px] truncate text-[11px] text-ui-muted max-[639px]:max-w-[58px]">{{ roleLabel }}</span></span>
          </a>
        </header>

        <div class="mx-auto w-full max-w-[1560px] bg-ui-workspace p-4 text-ui-text sm:p-6 xl:p-9">
          <div class="min-h-[calc(100vh-140px)] w-full min-w-0 max-[639px]:min-h-[calc(100dvh-136px)] [&>router-outlet+*]:block [&>router-outlet+*]:min-w-0"><router-outlet /></div>
        </div>
        <footer class="px-5 pb-5 text-center text-[11px] tracking-wide text-ui-muted">© 2026 I.E.P. Shuji Kitamura · Excelencia, disciplina y saber</footer>
      </main>
    </div>
  `
})
export class AdminLayoutComponent {
  readonly store = inject(AuthStore);

  get visibleMenuItems(): readonly AdminMenuItem[] {
    return visibleAdminMenuItems(this.store.roles());
  }

  get roleLabel(): string {
    return this.store.roles().map(role => ROLE_LABELS[role] ?? role).join(' · ') || 'Usuario';
  }

  get firstInitial(): string {
    return (this.store.user()?.username || 'U').substring(0, 1).toUpperCase();
  }
}
