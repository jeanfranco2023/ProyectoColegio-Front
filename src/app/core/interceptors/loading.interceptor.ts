import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { LoadingIndicatorService } from '../state/loading-indicator.service';

/**
 * Registra peticiones GET hacia la API para activar el indicador visual de carga.
 */
export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  if (
    req.method !== 'GET' ||
    !req.url.includes('/api/v1/') ||
    req.url.includes('/api/v1/auth/refresh') ||
    req.url.includes('/actuator/health')
  ) {
    return next(req);
  }

  const indicator = inject(LoadingIndicatorService);
  indicator.incrementarPeticion();
  return next(req).pipe(finalize(() => indicator.decrementarPeticion()));
};
