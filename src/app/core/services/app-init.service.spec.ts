import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service';
import { AuthStore } from '../state/auth.store';
import { initAuthApp } from './app-init.service';

describe('initAuthApp', () => {
  const refreshToken = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    refreshToken.mockReset();
    TestBed.configureTestingModule({
      providers: [
        AuthStore,
        { provide: AuthService, useValue: { refreshToken } },
        { provide: Router, useValue: { navigate: vi.fn() } }
      ]
    });
  });

  afterEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  it('clears the complete stale session when the refresh token is rejected', async () => {
    localStorage.setItem('accessToken', 'expired-access');
    localStorage.setItem('refreshToken', 'revoked-refresh');
    localStorage.setItem('user', JSON.stringify({ id: 1, roles: [] }));
    refreshToken.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 401 })));

    await TestBed.runInInjectionContext(() => initAuthApp());

    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('preserves credentials during a temporary network/server failure so the interceptor can retry', async () => {
    localStorage.setItem('accessToken', 'current-access');
    localStorage.setItem('refreshToken', 'current-refresh');
    localStorage.setItem('user', JSON.stringify({ id: 1, roles: [] }));
    refreshToken.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })));

    await TestBed.runInInjectionContext(() => initAuthApp());

    expect(localStorage.getItem('accessToken')).toBe('current-access');
    expect(localStorage.getItem('refreshToken')).toBe('current-refresh');
    expect(localStorage.getItem('user')).not.toBeNull();
  });
});
