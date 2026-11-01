import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AuthStore } from './core/state/auth.store';
import { routes } from './app.routes';
import { ADMIN_ROUTE_ACCESS } from './core/authorization/admin-route-access';

const activeRoles = signal<string[]>([]);
const authenticated = signal(true);
const landingRoute = signal('/admin/perfil');

beforeEach(() => {
  TestBed.configureTestingModule({
    providers: [
      {
        provide: AuthStore,
        useValue: {
          isAuthenticated: () => authenticated(),
          hasAnyRole: (roles: string[]) => roles.some(role => activeRoles().includes(role)),
          homeRoute: () => landingRoute()
        }
      },
      { provide: Router, useValue: { parseUrl: (url: string) => `redirect:${url}` } }
    ]
  });
});

afterEach(() => TestBed.resetTestingModule());

describe('rutas Etapa 9', () => {
  it('registra las cinco pantallas de forma diferida y con guardas de rol dentro del área autenticada', async () => {
    const admin = routes.find(route => route.path === 'admin')!;
    expect(admin.canActivate?.length).toBeGreaterThan(0);
    for (const path of ['tutoria','observaciones-conductuales','suplencias','aprobacion-suplencias','portal-apoderado']) {
      const route = admin.children!.find(route => route.path === path)!;
      expect(route.canActivate?.length).toBeGreaterThan(0);
      expect(await route.loadComponent!()).toBeTruthy();
    }
  });
});

describe('acceso a rutas administrativas por rol', () => {
  const roles = ['DIRECCION', 'SECRETARIA', 'DOCENTE', 'AUXILIAR', 'TUTOR', 'APODERADO'];

  it('aplica el permiso esperado a cada ruta protegida para los seis roles', () => {
    const admin = routes.find(route => route.path === 'admin')!;
    const protectedRoutes = admin.children!.filter(route => route.path && route.canActivate?.length);

    for (const role of roles) {
      activeRoles.set([role]);
      for (const route of protectedRoutes) {
        const guard = route.canActivate![0] as CanActivateFn;
        const allowed: readonly string[] = ADMIN_ROUTE_ACCESS[route.path as keyof typeof ADMIN_ROUTE_ACCESS];
        const result = TestBed.runInInjectionContext(() =>
          guard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
        );
        expect(result).toBe(allowed.includes(role) ? true : `redirect:${landingRoute()}`);
      }
    }
  });

  it('redirige a Secretaría al panel y no al login si intenta abrir Calificaciones', () => {
    activeRoles.set(['SECRETARIA']);
    landingRoute.set('/admin/dashboard');
    const admin = routes.find(route => route.path === 'admin')!;
    const route = admin.children!.find(child => child.path === 'calificaciones')!;
    const guard = route.canActivate![0] as CanActivateFn;

    expect(TestBed.runInInjectionContext(() => guard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)))
      .toBe('redirect:/admin/dashboard');
  });

  it('envía usuarios no autenticados al login y deja el perfil tras la guarda de autenticación', () => {
    const admin = routes.find(route => route.path === 'admin')!;
    const authGuard = admin.canActivate![0] as CanActivateFn;
    authenticated.set(false);
    expect(TestBed.runInInjectionContext(() => authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)))
      .toBe('redirect:/auth/login');

    const perfil = admin.children!.find(route => route.path === 'perfil')!;
    expect(perfil.canActivate).toBeUndefined();
    expect(admin.canActivate).toHaveLength(1);
  });
});
