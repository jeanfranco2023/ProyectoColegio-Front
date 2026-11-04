import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { PaginaAuditoriaDto, PaginaCambiosAuditoriaDto } from '../models/auditoria.model';

@Injectable({ providedIn: 'root' })
export class AuditoriaService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/auditoria/accesos`;

  listar(page: number, size = 50): Observable<PaginaAuditoriaDto> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<PaginaAuditoriaDto>(this.url, { params });
  }

  listarCambios(
    page = 0,
    size = 50,
    filtros?: { fechaInicio?: string; fechaFin?: string; usuarioId?: number; tabla?: string }
  ): Observable<PaginaCambiosAuditoriaDto> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (filtros?.fechaInicio) {
      params = params.set('fechaInicio', filtros.fechaInicio);
    }
    if (filtros?.fechaFin) {
      params = params.set('fechaFin', filtros.fechaFin);
    }
    if (filtros?.usuarioId !== undefined && filtros?.usuarioId !== null && String(filtros.usuarioId).trim() !== '') {
      params = params.set('usuarioId', String(filtros.usuarioId).trim());
    }
    if (filtros?.tabla && filtros.tabla.trim() !== '') {
      params = params.set('tabla', filtros.tabla.trim());
    }

    return this.http.get<PaginaCambiosAuditoriaDto | any[]>(`${environment.apiUrl}/auditoria/cambios`, { params }).pipe(
      map(res => {
        if (Array.isArray(res)) {
          return {
            content: res,
            number: page,
            size,
            totalElements: res.length,
            totalPages: Math.max(1, Math.ceil(res.length / size))
          };
        }
        return res as PaginaCambiosAuditoriaDto;
      })
    );
  }
}
