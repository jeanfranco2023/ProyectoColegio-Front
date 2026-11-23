import { Component, inject, ViewEncapsulation } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet
} from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { AuthStore } from '../../core/state/auth.store';
import { LoadingIndicatorService } from '../../core/state/loading-indicator.service';
import { ADMIN_ROUTE_ACCESS } from '../../core/authorization/admin-route-access';

export type AdminMenuRole = 'DIRECCION' | 'SECRETARIA' | 'DOCENTE' | 'AUXILIAR' | 'TUTOR' | 'APODERADO' | 'ADMINISTRADOR';

export interface AdminMenuItem {
  label: string;
  route: string;
  roles: readonly AdminMenuRole[];
  section:
    | 'Principal'
    | 'Admisión y matrícula'
    | 'Gestión académica'
    | 'Convivencia y bienestar'
    | 'Tesorería y personal'
    | 'Administración y cuenta';
  icon: string;
}

const ROLE_LABELS: Record<AdminMenuRole, string> = {
  DIRECCION: 'Dirección',
  SECRETARIA: 'Secretaría',
  DOCENTE: 'Docente',
  AUXILIAR: 'Auxiliar',
  TUTOR: 'Tutor',
  APODERADO: 'Apoderado',
  ADMINISTRADOR: 'Administrador'
};

// This is the single source for both desktop and mobile navigation.
export const ADMIN_MENU_ITEMS: readonly AdminMenuItem[] = [
  { label: 'Panel general', route: '/admin/dashboard', roles: ADMIN_ROUTE_ACCESS.dashboard, section: 'Principal', icon: 'M3 3h8v8H3z M13 3h8v5h-8z M13 10h8v11h-8z M3 13h8v8H3z' },
  { label: 'Portal familiar', route: '/admin/portal-apoderado', roles: ADMIN_ROUTE_ACCESS['portal-apoderado'], section: 'Principal', icon: 'M3 11l9-8 9 8M5 10v11h14V10' },
  { label: 'Comunicados', route: '/admin/comunicados', roles: ADMIN_ROUTE_ACCESS.comunicados, section: 'Principal', icon: 'M4 4h16v16H4zM8 8h8M8 12h8M8 16h5' },
  { label: 'Solicitudes de matrícula', route: '/admin/solicitudes-matricula', roles: ADMIN_ROUTE_ACCESS['solicitudes-matricula'], section: 'Admisión y matrícula', icon: 'M7 3h7l5 5v13H7a2 2 0 01-2-2V5a2 2 0 012-2zM14 3v5h5M9 13h6M9 17h6' },
  { label: 'Matrículas', route: '/admin/matriculas', roles: ADMIN_ROUTE_ACCESS.matriculas, section: 'Admisión y matrícula', icon: 'M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 012 2v13a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z' },
  { label: 'Aulas y horarios', route: '/admin/academico', roles: ADMIN_ROUTE_ACCESS.academico, section: 'Admisión y matrícula', icon: 'M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6M8 9h.01M16 9h.01' },
  { label: 'Malla horaria', route: '/admin/horarios', roles: ADMIN_ROUTE_ACCESS.horarios, section: 'Gestión académica', icon: 'M4 4h16v16H4zM4 10h16M10 4v16' },
  { label: 'Calificaciones', route: '/admin/calificaciones', roles: ADMIN_ROUTE_ACCESS.calificaciones, section: 'Gestión académica', icon: 'M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2zM7 8h2m4 0h4M7 12h2m4 0h4M7 16h2m4 0h4' },
  { label: 'Refuerzo académico', route: '/admin/refuerzos', roles: ADMIN_ROUTE_ACCESS.refuerzos, section: 'Gestión académica', icon: 'M12 3l9 5-9 5-9-5zM5 11v6l7 4 7-4v-6' },
  { label: 'Asistencia', route: '/admin/asistencia', roles: ADMIN_ROUTE_ACCESS.asistencia, section: 'Gestión académica', icon: 'M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11' },
  { label: 'Tutoría y seguimiento', route: '/admin/tutoria', roles: ADMIN_ROUTE_ACCESS.tutoria, section: 'Convivencia y bienestar', icon: 'M4 4h16v16H4zM8 8h8M8 12h8M8 16h5' },
  { label: 'Convivencia', route: '/admin/convivencia', roles: ADMIN_ROUTE_ACCESS.convivencia, section: 'Convivencia y bienestar', icon: 'M12 21s-8-4.5-8-11a4.5 4.5 0 018-2.8A4.5 4.5 0 0120 10c0 6.5-8 11-8 11z' },
  { label: 'Incidencias y faltas', route: '/admin/observaciones-conductuales', roles: ADMIN_ROUTE_ACCESS['observaciones-conductuales'], section: 'Convivencia y bienestar', icon: 'M12 9v2m0 4h.01M3 20h18L12 3z' },
  { label: 'Tesorería y pagos', route: '/admin/tesoreria', roles: ADMIN_ROUTE_ACCESS.tesoreria, section: 'Tesorería y personal', icon: 'M3 6h18v14H3zM3 10h18M7 15h4M6 3h12' },
  { label: 'Designar suplente', route: '/admin/suplencias', roles: ADMIN_ROUTE_ACCESS.suplencias, section: 'Tesorería y personal', icon: 'M4 21v-4h16v4M12 13a5 5 0 100-10 5 5 0 000 10z' },
  { label: 'Gestión de suplentes', route: '/admin/aprobacion-suplencias', roles: ADMIN_ROUTE_ACCESS['aprobacion-suplencias'], section: 'Tesorería y personal', icon: 'M9 12l2 2 4-4M4 3v12l8 6 8-6V3z' },
  { label: 'Solicitudes de cambio', route: '/admin/solicitudes-cambio', roles: ADMIN_ROUTE_ACCESS['solicitudes-cambio'], section: 'Administración y cuenta', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
  { label: 'Usuarios y permisos', route: '/admin/usuarios', roles: ADMIN_ROUTE_ACCESS.usuarios, section: 'Administración y cuenta', icon: 'M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM20 8v6m3-3h-6' },
  { label: 'Acciones del sistema', route: '/admin/auditoria', roles: ADMIN_ROUTE_ACCESS.auditoria, section: 'Administración y cuenta', icon: 'M3 12a9 9 0 1018 0 9 9 0 00-18 0zm9-5v5l3 2' },
  { label: 'Mi perfil', route: '/admin/perfil', roles: [], section: 'Administración y cuenta', icon: 'M20 21a8 8 0 00-16 0M12 13a5 5 0 100-10 5 5 0 000 10z' }
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
    <a href="#main-content" class="skip-link">Saltar al contenido principal</a>
    <div class="school-admin-shell h-dvh max-h-dvh overflow-hidden bg-ui-background font-sans text-ui-text flex flex-col lg:flex-row">
      <aside class="school-admin-sidebar hidden w-[312px] shrink-0 flex-col border-r border-white/10 bg-[#0A192F] text-white lg:sticky lg:top-0 lg:self-start lg:flex lg:h-dvh lg:max-h-dvh lg:overflow-hidden">
        <a [routerLink]="store.homeRoute()" class="shrink-0 flex items-center gap-3.5 px-5 py-5 no-underline focus-visible:outline-[3px] focus-visible:outline-ui-focus focus-visible:outline-offset-2" aria-label="Inicio institucional">
          <img class="h-11 w-11 shrink-0 rounded-full bg-white object-contain p-1 ring-2 ring-white/25 shadow-xs" src="/images/shuji-kitamura-emblema.jpg" alt="Escudo de I.E.P. Shuji Kitamura">
          <span class="min-w-0">
            <span class="block truncate text-[18px] font-extrabold tracking-tight text-white">Shuji Kitamura</span>
            <span class="sidebar-kicker mt-0.5 block text-[11px] font-bold tracking-[0.16em] text-sky-200/80 uppercase">GESTIÓN ESCOLAR</span>
          </span>
        </a>

        <nav class="min-h-0 flex-1 overflow-y-auto overscroll-contain flex flex-col gap-1.5 px-3.5 py-4" aria-label="Navegación principal">
          @for (item of visibleMenuItems; track item.route; let i = $index) {
            @if (i === 0 || visibleMenuItems[i - 1].section !== item.section) {
              <p
                class="shrink-0 mb-1.5 px-3.5 text-[11.5px] font-bold leading-none tracking-[0.13em] text-slate-400 uppercase"
                [class.mt-1]="i === 0"
                [class.mt-4]="i > 0"
                [class.pt-3.5]="i > 0"
                [class.border-t]="i > 0"
                [class.border-white/10]="i > 0"
              >{{ item.section }}</p>
            }
            <a
              [routerLink]="item.route"
              routerLinkActive="router-link-active"
              class="shrink-0 flex min-h-[42px] items-center gap-3.5 rounded-xl border-l-[3px] border-transparent px-3.5 py-2.5 text-[15.5px] leading-[1.3] font-medium text-slate-200 no-underline transition-all duration-150 focus-visible:outline-[2px] focus-visible:outline-ui-focus focus-visible:outline-offset-1"
              [attr.aria-label]="item.label"
            >
              <svg class="h-5 w-5 shrink-0 opacity-85" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" [attr.d]="item.icon" /></svg>
              <span class="truncate">{{ item.label }}</span>
            </a>
          }
        </nav>
      </aside>

      <main id="main-content" tabindex="-1" class="relative flex h-dvh max-h-dvh min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#F1F5F9]">
        @if (loadingIndicator.activo()) {
          <div class="pointer-events-none fixed top-0 right-0 left-0 lg:left-[312px] z-[2500] h-1 overflow-hidden bg-slate-200/60" aria-hidden="true">
            <div class="shuji-route-bar h-full w-2/5 rounded-full bg-gradient-to-r from-[#0F294D] via-[#1D4ED8] to-[#0284C7]"></div>
          </div>
        }
        <header class="school-admin-topbar shrink-0 sticky top-0 z-40 flex h-[72px] items-center justify-between border-b border-slate-200 bg-white/95 px-4 text-slate-900 backdrop-blur-[12px] sm:px-7 xl:px-10 max-[639px]:grid max-[639px]:h-16 max-[639px]:grid-cols-[minmax(0,1fr)_auto] max-[639px]:gap-2 max-[639px]:px-3">
          <div class="flex min-w-0 flex-1 items-center gap-2.5 overflow-hidden sm:gap-3">
            <button mat-icon-button type="button" [matMenuTriggerFor]="mobileNav" class="!flex !h-11 !w-11 !min-h-11 !min-w-11 shrink-0 !text-[#0F294D] focus-visible:outline-[3px] focus-visible:outline-ui-focus focus-visible:outline-offset-2 lg:!hidden" aria-label="Abrir navegación" aria-haspopup="menu">
              <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <mat-menu #mobileNav="matMenu" class="admin-mobile-nav-panel mt-3 max-h-[calc(100dvh-24px)] overflow-y-auto" xPosition="after" yPosition="below">
              @for (item of visibleMenuItems; track item.route) {
                <a mat-menu-item class="admin-mobile-nav-item flex min-h-11 min-w-[220px] items-center gap-3 border-l-[3px] border-transparent px-3 text-[15.5px] leading-[1.3] text-slate-600 no-underline" [routerLink]="item.route" routerLinkActive="router-link-active border-[#1D4ED8] bg-slate-100 !text-[#0F294D] font-semibold" [attr.aria-label]="item.label">
                  <svg class="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" [attr.d]="item.icon" /></svg>
                  <span>{{ item.label }}</span>
                </a>
              }
            </mat-menu>
            <div class="school-admin-brand min-w-0 flex-1 overflow-hidden">
              <p class="m-0 truncate text-[10.5px] font-bold tracking-[0.14em] text-[#0F294D]/70 uppercase max-[420px]:hidden">Portal institucional</p>
              <p class="m-0 truncate text-sm font-bold text-slate-900">Shuji Kitamura <span class="font-medium text-slate-500 max-[639px]:hidden">/ Gestión escolar</span></p>
            </div>
          </div>

          <div class="flex shrink-0 items-center gap-2">
            <a routerLink="/admin/perfil" [title]="displayName" class="flex min-h-11 items-center gap-2.5 rounded-full border border-slate-200 bg-slate-100/90 px-3 py-1.5 text-xs font-medium text-slate-600 no-underline transition hover:border-slate-300 hover:bg-slate-200/70 focus-visible:outline-[3px] focus-visible:outline-ui-focus focus-visible:outline-offset-2 max-[439px]:p-1.5">
              <span class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0F294D] text-[13px] font-bold text-white shadow-2xs max-[639px]:h-7 max-[639px]:w-7">{{ firstInitial }}</span>
              <span class="flex min-w-0 flex-col max-[439px]:hidden"><span class="block max-w-[220px] truncate font-bold text-slate-900">{{ displayName }}</span><span class="block max-w-[220px] truncate text-[11px] font-medium text-slate-500">{{ roleLabel }}</span></span>
            </a>
            <button
              type="button"
              (click)="store.logout()"
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
              class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-[#0F294D] shadow-2xs transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 focus-visible:outline-[3px] focus-visible:outline-ui-focus focus-visible:outline-offset-2 cursor-pointer"
            >
              <svg class="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.9" d="M10 17l5-5-5-5m5 5H3m9-9h6a2 2 0 012 2v14a2 2 0 01-2 2h-6" /></svg>
              <span class="hidden sm:inline whitespace-nowrap">Cerrar sesión</span>
            </button>
          </div>
        </header>

        <div class="school-admin-main-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div class="school-admin-workspace relative mx-auto w-full max-w-[1560px] bg-ui-workspace p-4 text-ui-text sm:p-6 xl:p-9">
            @if (loadingIndicator.mostrarPanelCarga()) {
              <div
                role="status"
                aria-live="polite"
                class="pointer-events-none fixed top-[72px] right-0 bottom-0 left-0 lg:left-[312px] z-[1800] flex items-center justify-center overflow-hidden bg-slate-900/20 p-4 backdrop-blur-[3px] max-[639px]:top-16 animate-[fade-in_160ms_ease-out]"
              >
                <div class="shuji-modal-3d-enter w-full max-w-[380px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_60px_-12px_rgb(10_25_47_/_26%)]">
                  <div class="h-1.5 w-full bg-gradient-to-r from-[#0A192F] via-[#173B67] to-[#1D4ED8]" aria-hidden="true"></div>
                  <div class="flex items-center gap-4 px-6 py-5">
                    <span class="relative inline-flex h-11 w-11 shrink-0 items-center justify-center">
                      <span class="absolute inset-0 rounded-full border-[3px] border-slate-200 border-t-[#0F294D] border-r-[#2563EB] animate-spin"></span>
                      <span class="h-2.5 w-2.5 rounded-full bg-[#0F294D]"></span>
                    </span>
                    <div class="min-w-0 flex-1">
                      <p class="m-0 text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#0F294D]">Cambiando de panel</p>
                      <strong class="block truncate text-sm font-extrabold text-slate-900">Cargando {{ loadingIndicator.moduloDestino() }}…</strong>
                      <span class="block text-xs text-slate-500">Sincronizando datos institucionales</span>
                    </div>
                  </div>
                </div>
              </div>
            } @else if (loadingIndicator.mostrarPildoraCarga()) {
              <div
                role="status"
                aria-live="polite"
                class="pointer-events-none fixed right-5 bottom-5 z-[1800] flex items-center gap-2.5 rounded-full border border-[#1E3A8A]/40 bg-[#0F294D] px-4 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur-xs animate-[fade-in_150ms_ease-out]"
              >
                <span class="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" aria-hidden="true"></span>
                <span>Actualizando datos…</span>
              </div>
            }
            <div class="min-h-[calc(100vh-140px)] w-full min-w-0 max-[639px]:min-h-[calc(100dvh-136px)] [&>router-outlet+*]:block [&>router-outlet+*]:min-w-0"><router-outlet /></div>
          </div>
          <footer class="px-5 pb-5 text-center text-[11px] tracking-wide text-ui-muted">© 2026 I.E.P. Shuji Kitamura · Excelencia, disciplina y saber</footer>
        </div>
      </main>
    </div>
  `
})
export class AdminLayoutComponent {
  readonly store = inject(AuthStore);
  readonly loadingIndicator = inject(LoadingIndicatorService);
  private readonly router = inject(Router);

  constructor() {
    this.router.events.pipe(takeUntilDestroyed()).subscribe(evento => {
      if (evento instanceof NavigationStart) {
        this.loadingIndicator.iniciarNavegacion(this.nombreModuloRuta(evento.url));
      } else if (
        evento instanceof NavigationEnd ||
        evento instanceof NavigationCancel ||
        evento instanceof NavigationError
      ) {
        this.loadingIndicator.finalizarNavegacion();
      }
    });
  }

  private nombreModuloRuta(url: string): string {
    const limpia = (url || '').split('?')[0].split('#')[0];
    const coincidencia = ADMIN_MENU_ITEMS.find(item => limpia.startsWith(item.route));
    return coincidencia?.label ?? 'Módulo escolar';
  }

  get visibleMenuItems(): readonly AdminMenuItem[] {
    return visibleAdminMenuItems(this.store.roles());
  }

  get roleLabel(): string {
    return this.store.roles().map(role => ROLE_LABELS[role] ?? role).join(' · ') || 'Usuario';
  }

  get displayName(): string {
    const user = this.store.user();
    const full = user?.nombreCompleto?.trim();
    return full || user?.username || 'Usuario';
  }

  get firstInitial(): string {
    return (this.displayName || 'U').substring(0, 1).toUpperCase();
  }
}
