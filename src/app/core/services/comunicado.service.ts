import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  BandejaApoderadoResponseDto,
  ComunicadoDestinatarioResponseDto,
  ComunicadoResponseDto,
  EmitirComunicadoRequestDto,
  MetricasLecturaResponseDto
} from '../models/comunicado.model';

@Injectable({
  providedIn: 'root'
})
export class ComunicadoService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/comunicados`;

  listarPublicados(): Observable<ComunicadoResponseDto[]> {
    return this.http.get<ComunicadoResponseDto[]>(this.baseUrl);
  }

  confirmarAcuse(id: number): Observable<ComunicadoDestinatarioResponseDto> {
    return this.http.post<ComunicadoDestinatarioResponseDto>(`${this.baseUrl}/${id}/acuse`, { confirmarAcuse: true });
  }

  consultarBandeja(page: number = 0, size: number = 20): Observable<BandejaApoderadoResponseDto> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    return this.http.get<BandejaApoderadoResponseDto>(`${this.baseUrl}/apoderado/bandeja`, { params });
  }

  publicarComunicado(payload: EmitirComunicadoRequestDto): Observable<ComunicadoResponseDto> {
    return this.http.post<ComunicadoResponseDto>(this.baseUrl, payload);
  }

  consultarMetricas(id: number): Observable<MetricasLecturaResponseDto> {
    return this.http.get<MetricasLecturaResponseDto>(`${this.baseUrl}/${id}/metricas`);
  }
}
