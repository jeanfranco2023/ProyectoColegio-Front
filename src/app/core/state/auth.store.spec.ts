import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../services/auth.service';
import { AuthStore } from './auth.store';

describe('AuthStore - logout', () => {
  let authService: { logout: ReturnType<typeof vi.fn> };
  let router: { navigate: ReturnType<typeof vi.fn> };
  let store: AuthStore;

  beforeEach(() => {
    localStorage.clear();
    authService = {
      logout: vi.fn(() => of({ success: true, status: 200, data: null, message: 'OK' })),
    };
    router = {
      navigate: vi.fn(() => Promise.resolve(true)),
    };

    TestBed.configureTestingModule({
      providers: [
        AuthStore,
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
      ],
    });

    store = TestBed.inject(AuthStore);
  });

  it('llama al backend con el refresh token, limpia localStorage y navega al login', () => {
    localStorage.setItem('accessToken', 'mock-access-token');
    localStorage.setItem('refreshToken', 'mock-refresh-token');
    localStorage.setItem('user', JSON.stringify({ id: 1, username: 'admin' }));

    store.logout();

    expect(authService.logout).toHaveBeenCalledWith({ refreshToken: 'mock-refresh-token' });
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
  });

  it('si falla la red en logout, igualmente limpia la sesión y navega al login', () => {
    authService.logout = vi.fn(() => throwError(() => new Error('Error de red')));
    localStorage.setItem('accessToken', 'mock-access-token');
    localStorage.setItem('refreshToken', 'mock-refresh-token');

    store.logout();

    expect(authService.logout).toHaveBeenCalledWith({ refreshToken: 'mock-refresh-token' });
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
  });

  it('si no hay refresh token, limpia directamente y navega al login', () => {
    localStorage.setItem('accessToken', 'mock-access-token');

    store.logout();

    expect(authService.logout).not.toHaveBeenCalled();
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
  });
});
