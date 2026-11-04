import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { AuthStore } from '../../core/state/auth.store';
import { UsuarioService } from '../../core/services/usuario.service';
import { PerfilComponent } from './perfil.component';

afterEach(() => TestBed.resetTestingModule());

describe('PerfilComponent', () => {
  it('rechaza cambio de contraseña si la nueva tiene menos de 8 caracteres', () => {
    const usuarioService = {
      cambiarPassword: vi.fn(() => of(void 0)),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: UsuarioService, useValue: usuarioService },
        { provide: AuthStore, useValue: { user: () => ({ username: 'admin', email: 'admin@colegio.edu.pe' }), roles: () => ['DIRECCION'] } },
      ],
    });

    const component = TestBed.runInInjectionContext(() => new PerfilComponent());
    component.passwordActual = 'Clave1234';
    component.passwordNuevo = '1234567'; // 7 caracteres
    component.confirmarPassword = '1234567';

    component.cambiarPassword();

    expect(component.mensajeError()).toBe('La nueva contraseña debe tener al menos 8 caracteres.');
    expect(usuarioService.cambiarPassword).not.toHaveBeenCalled();
  });

  it('rechaza cambio de contraseña si no coinciden', () => {
    const usuarioService = {
      cambiarPassword: vi.fn(() => of(void 0)),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: UsuarioService, useValue: usuarioService },
        { provide: AuthStore, useValue: { user: () => ({ username: 'admin', email: 'admin@colegio.edu.pe' }), roles: () => ['DIRECCION'] } },
      ],
    });

    const component = TestBed.runInInjectionContext(() => new PerfilComponent());
    component.passwordActual = 'Clave1234';
    component.passwordNuevo = 'PasswordSeguro1';
    component.confirmarPassword = 'PasswordSeguro2';

    component.cambiarPassword();

    expect(component.mensajeError()).toBe('Las contraseñas no coinciden.');
    expect(usuarioService.cambiarPassword).not.toHaveBeenCalled();
  });

  it('permite cambiar contraseña cuando cumple 8 o más caracteres y coinciden', () => {
    const usuarioService = {
      cambiarPassword: vi.fn(() => of(void 0)),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: UsuarioService, useValue: usuarioService },
        { provide: AuthStore, useValue: { user: () => ({ username: 'admin', email: 'admin@colegio.edu.pe' }), roles: () => ['DIRECCION'] } },
      ],
    });

    const component = TestBed.runInInjectionContext(() => new PerfilComponent());
    // Mock dialog element
    (component as unknown as { passwordDialog: { nativeElement: { close: () => void; showModal: () => void } } }).passwordDialog = {
      nativeElement: { close: vi.fn(), showModal: vi.fn() },
    };

    component.passwordActual = 'Clave1234';
    component.passwordNuevo = 'PasswordSeguro1';
    component.confirmarPassword = 'PasswordSeguro1';

    component.cambiarPassword();

    expect(component.mensajeError()).toBeNull();
    expect(usuarioService.cambiarPassword).toHaveBeenCalledWith({
      passwordActual: 'Clave1234',
      passwordNuevo: 'PasswordSeguro1',
    });
  });
});
