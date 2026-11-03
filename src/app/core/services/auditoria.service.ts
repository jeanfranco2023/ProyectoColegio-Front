import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CambioAuditoriaDto, PaginaAuditoriaDto } from '../models/auditoria.model';

@Injectable({ providedIn: 'root' })
export class AuditoriaService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/auditoria/accesos`;

  listar(page: number, size = 50): Observable<PaginaAuditoriaDto> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<PaginaAuditoriaDto>(this.url, { params });
  }

  listarCambios(limit = 100): Observable<CambioAuditoriaDto[]> {
    const params = new HttpParams().set('limite', limit);
    return this.http.get<CambioAuditoriaDto[]>(`${environment.apiUrl}/auditoria/cambios`, { params });
  }
}
