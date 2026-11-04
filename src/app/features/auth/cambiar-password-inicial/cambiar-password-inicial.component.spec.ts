import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../../core/services/auth.service';
import { AuthStore } from '../../../core/state/auth.store';
import { CambiarPasswordInicialComponent } from './cambiar-password-inicial.component';

describe('CambiarPasswordInicialComponent', () => {
  it('no envia si el formulario es invalido', () => {
    const authService = {
      cambiarPasswordInicial: vi.fn(),
    };
    const store = {
      marcarPasswordCambiado: vi.fn(),
      homeRoute: vi.fn(() => '/admin/dashboard'),
    };
    const router = {
      navigateByUrl: vi.fn(),
    };

    TestBed.configureTestingModule({
      imports: [CambiarPasswordInicialComponent],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: AuthStore, useValue: store },
        { provide: Router, useValue: router },
      ],
    });

    const fixture = TestBed.createComponent(CambiarPasswordInicialComponent);
    const component = fixture.componentInstance;
    component.passwordActual = 'Temp1234#';
    component.passwordNuevo = 'corta';
    component.passwordConfirmacion = 'corta';

    component.guardar();

    expect(authService.cambiarPasswordInicial).not.toHaveBeenCalled();
  });

  it('llama a authService.cambiarPasswordInicial con nuevoPassword y marca password cambiado', () => {
    const authService = {
      cambiarPasswordInicial: vi.fn(() => of({ success: true, status: 200, data: null, message: 'OK' })),
    };
    const store = {
      marcarPasswordCambiado: vi.fn(),
      homeRoute: vi.fn(() => '/admin/dashboard'),
    };
    const router = {
      navigateByUrl: vi.fn(),
    };

    TestBed.configureTestingModule({
      imports: [CambiarPasswordInicialComponent],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: AuthStore, useValue: store },
        { provide: Router, useValue: router },
      ],
    });

    const fixture = TestBed.createComponent(CambiarPasswordInicialComponent);
    const component = fixture.componentInstance;
    component.passwordActual = 'Temp1234#';
    component.passwordNuevo = 'NuevaPass2026!';
    component.passwordConfirmacion = 'NuevaPass2026!';

    expect(component.formularioValido()).toBe(true);

    component.guardar();

    expect(authService.cambiarPasswordInicial).toHaveBeenCalledWith({
      passwordActual: 'Temp1234#',
      nuevoPassword: 'NuevaPass2026!',
    });
    expect(component.exito()).toBe(true);
    expect(store.marcarPasswordCambiado).toHaveBeenCalled();
  });

  it('muestra el mensaje de error cuando el backend rechaza', () => {
    const authService = {
      cambiarPasswordInicial: vi.fn(() =>
        throwError(() => ({ error: { message: 'La contraseña actual no es correcta' } }))
      ),
    };
    const store = {
      marcarPasswordCambiado: vi.fn(),
      homeRoute: vi.fn(() => '/admin/dashboard'),
    };
    const router = {
      navigateByUrl: vi.fn(),
    };

    TestBed.configureTestingModule({
      imports: [CambiarPasswordInicialComponent],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: AuthStore, useValue: store },
        { provide: Router, useValue: router },
      ],
    });

    const fixture = TestBed.createComponent(CambiarPasswordInicialComponent);
    const component = fixture.componentInstance;
    component.passwordActual = 'Incorrecta1#';
    component.passwordNuevo = 'NuevaPass2026!';
    component.passwordConfirmacion = 'NuevaPass2026!';

    component.guardar();

    expect(authService.cambiarPasswordInicial).toHaveBeenCalled();
    expect(component.error()).toBe('La contraseña actual no es correcta');
    expect(store.marcarPasswordCambiado).not.toHaveBeenCalled();
  });
});
