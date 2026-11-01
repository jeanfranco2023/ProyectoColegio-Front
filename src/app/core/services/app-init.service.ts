import { inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';
import { AuthStore } from '../state/auth.store';

/**
 * App Initializer executed within Angular's EnvironmentInjector during bootstrap.
 * Restores user session if a valid refresh token exists in localStorage.
 * Always resolves so application bootstrap is never blocked or frozen.
 */
export function initAuthApp(): Promise<void> {
  const authService = inject(AuthService);
  const authStore = inject(AuthStore);
  const refreshToken = localStorage.getItem('refreshToken');

  if (!refreshToken) {
    return Promise.resolve();
  }

  return firstValueFrom(authService.refreshToken({ refreshToken }))
    .then((response) => {
      if (response && response.data) {
        authStore.setSession(response.data);
      }
    })
    .catch((error: HttpErrorResponse) => {
      // A rejected refresh means the stored session is no longer valid. Clear all
      // credentials together so the guards cannot mistake a stale access token for
      // an authenticated user. Keep tokens on network/server errors for retry.
      if (error.status >= 400 && error.status < 500) {
        authStore.clearSession();
      }
      return Promise.resolve();
    });
}
