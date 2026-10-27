import { describe, expect, it } from 'vitest';
import { routes } from './app.routes';

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
