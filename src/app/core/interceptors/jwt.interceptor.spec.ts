import { HttpErrorResponse, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../services/auth.service';
import { AuthStore } from '../state/auth.store';
import { jwtInterceptor } from './jwt.interceptor';

describe('jwtInterceptor', () => {
  const store = { accessToken: () => 'access-token', setSession: vi.fn(), logout: vi.fn() };
  const auth = { refreshToken: vi.fn() };

  beforeEach(() => {
    localStorage.clear();
    store.logout.mockReset();
    auth.refreshToken.mockReset();
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthStore, useValue: store },
        { provide: AuthService, useValue: auth }
      ]
    });
  });

  afterEach(() => TestBed.resetTestingModule());

  it('does not log out or refresh the session for a forbidden role response (403)', async () => {
    const error = new HttpErrorResponse({ status: 403 });
    const next: HttpHandlerFn = () => throwError(() => error);
    const request = new HttpRequest('GET', '/api/v1/evaluacion/cneb');

    const receivedError = await new Promise<HttpErrorResponse>(resolve => {
      TestBed.runInInjectionContext(() => jwtInterceptor(request, next)).subscribe({ error: resolve });
    });

    expect(receivedError.status).toBe(403);
    expect(store.logout).not.toHaveBeenCalled();
    expect(auth.refreshToken).not.toHaveBeenCalled();
  });
});
