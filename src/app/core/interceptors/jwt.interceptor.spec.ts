import { HttpErrorResponse, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
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

  it('keeps the session when a refresh attempt fails temporarily (500)', async () => {
    localStorage.setItem('refreshToken', 'refresh-token');
    auth.refreshToken.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    const unauthorized = new HttpErrorResponse({ status: 401 });
    const next: HttpHandlerFn = () => throwError(() => unauthorized);
    const request = new HttpRequest('GET', '/api/v1/evaluacion/cneb');

    const receivedError = await new Promise<HttpErrorResponse>(resolve => {
      TestBed.runInInjectionContext(() => jwtInterceptor(request, next)).subscribe({ error: resolve });
    });

    expect(receivedError.status).toBe(500);
    expect(store.logout).not.toHaveBeenCalled();
    expect(auth.refreshToken).toHaveBeenCalledWith({ refreshToken: 'refresh-token' });
  });

  it('clears the session when the refresh token is rejected (401)', async () => {
    localStorage.setItem('refreshToken', 'refresh-token');
    auth.refreshToken.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 401 })));
    const unauthorized = new HttpErrorResponse({ status: 401 });
    const next: HttpHandlerFn = () => throwError(() => unauthorized);
    const request = new HttpRequest('GET', '/api/v1/evaluacion/cneb');

    const receivedError = await new Promise<HttpErrorResponse>(resolve => {
      TestBed.runInInjectionContext(() => jwtInterceptor(request, next)).subscribe({ error: resolve });
    });

    expect(receivedError.status).toBe(401);
    expect(store.logout).toHaveBeenCalledOnce();
  });

  it('clears the session when a retried request still returns 401', async () => {
    localStorage.setItem('refreshToken', 'refresh-token');
    auth.refreshToken.mockReturnValue(of({ data: { accessToken: 'new-access-token' } }));
    const unauthorized = new HttpErrorResponse({ status: 401 });
    let attempts = 0;
    const next: HttpHandlerFn = () => {
      attempts++;
      return throwError(() => unauthorized);
    };
    const request = new HttpRequest('GET', '/api/v1/evaluacion/cneb');

    const receivedError = await new Promise<HttpErrorResponse>(resolve => {
      TestBed.runInInjectionContext(() => jwtInterceptor(request, next)).subscribe({ error: resolve });
    });

    expect(receivedError.status).toBe(401);
    expect(attempts).toBe(2);
    expect(store.logout).toHaveBeenCalledOnce();
  });

  it('does not refresh or clear the user session for a 401 from public enrollment', async () => {
    const unauthorized = new HttpErrorResponse({ status: 401 });
    const next: HttpHandlerFn = () => throwError(() => unauthorized);
    const request = new HttpRequest('GET', '/api/v1/solicitudes-matricula/public/123');

    const receivedError = await new Promise<HttpErrorResponse>(resolve => {
      TestBed.runInInjectionContext(() => jwtInterceptor(request, next)).subscribe({ error: resolve });
    });

    expect(receivedError.status).toBe(401);
    expect(store.logout).not.toHaveBeenCalled();
    expect(auth.refreshToken).not.toHaveBeenCalled();
  });
});
