import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CatalogoMatriculaPublicaDto,
  CrearSolicitudMatriculaPublicaDto,
  PagoMatriculaPublicaDto,
  SolicitudMatriculaPublicaAdminDto,
  SolicitudMatriculaPublicaDto,
  TipoDocumentoSolicitud
} from '../models/matricula-publica.model';

@Injectable({ providedIn: 'root' })
export class MatriculaPublicaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/solicitudes-matricula`;

  catalogo(): Observable<CatalogoMatriculaPublicaDto> {
    return this.http.get<CatalogoMatriculaPublicaDto>(`${this.baseUrl}/public/catalogo`);
  }

  crear(payload: CrearSolicitudMatriculaPublicaDto): Observable<SolicitudMatriculaPublicaDto> {
    return this.http.post<SolicitudMatriculaPublicaDto>(`${this.baseUrl}/public`, payload);
  }

  consultar(id: string, token: string): Observable<SolicitudMatriculaPublicaDto> {
    return this.http.get<SolicitudMatriculaPublicaDto>(`${this.baseUrl}/public/${encodeURIComponent(id)}`, {
      headers: this.tokenHeaders(token)
    });
  }

  consultarPorToken(token: string): Observable<SolicitudMatriculaPublicaDto> {
    return this.http.get<SolicitudMatriculaPublicaDto>(
      `${this.baseUrl}/public/por-token/${encodeURIComponent(token)}`,
      { headers: this.tokenHeaders(token) }
    );
  }

  reenviarToken(
    numeroDocumentoEstudiante: string,
    anioLectivoId: number
  ): Observable<{ mensaje: string }> {
    return this.http.post<{ mensaje: string }>(
      `${this.baseUrl}/public/reenviar-token`,
      { numeroDocumentoEstudiante, anioLectivoId }
    );
  }

  subirDocumento(
    id: string,
    token: string,
    tipo: TipoDocumentoSolicitud,
    archivo: File
  ): Observable<SolicitudMatriculaPublicaDto> {
    const data = new FormData();
    data.append('archivo', archivo, archivo.name);
    return this.http.post<SolicitudMatriculaPublicaDto>(
      `${this.baseUrl}/public/${encodeURIComponent(id)}/documentos/${tipo}?token=${encodeURIComponent(token)}`,
      data,
      { headers: this.tokenHeaders(token) }
    );
  }

  crearPago(id: string, token: string): Observable<PagoMatriculaPublicaDto> {
    return this.http.post<PagoMatriculaPublicaDto>(`${this.baseUrl}/public/${encodeURIComponent(id)}/pago`, {}, {
      headers: this.tokenHeaders(token)
    });
  }

  consultarPago(id: string, token: string): Observable<SolicitudMatriculaPublicaDto> {
    return this.http.post<SolicitudMatriculaPublicaDto>(`${this.baseUrl}/public/${encodeURIComponent(id)}/consultar-pago`, {}, { headers: this.tokenHeaders(token) });
  }

  confirmarPago(id: string, token: string, paymentId: string): Observable<SolicitudMatriculaPublicaDto> {
    return this.http.post<SolicitudMatriculaPublicaDto>(
      `${this.baseUrl}/public/${encodeURIComponent(id)}/confirmar-pago`,
      { paymentId },
      { headers: this.tokenHeaders(token) }
    );
  }

  descargarComprobante(id: string, token: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/public/${encodeURIComponent(id)}/comprobante`, {
      headers: this.tokenHeaders(token),
      responseType: 'blob'
    });
  }

  descargarFicha(id: string, token: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/public/${encodeURIComponent(id)}/ficha`, {
      headers: this.tokenHeaders(token),
      responseType: 'blob'
    });
  }

  listarAdmin(): Observable<SolicitudMatriculaPublicaAdminDto[]> {
    return this.http.get<SolicitudMatriculaPublicaAdminDto[]>(`${this.baseUrl}/admin`);
  }

  observarAdmin(id: string, tipo: TipoDocumentoSolicitud, observacion: string): Observable<SolicitudMatriculaPublicaAdminDto> {
    return this.http.put<SolicitudMatriculaPublicaAdminDto>(`${this.baseUrl}/admin/${encodeURIComponent(id)}/observar`, {
      tipo, observacion
    });
  }

  rechazarAdmin(id: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/admin/${encodeURIComponent(id)}/rechazar`, {});
  }

  autorizarExcepcionEdad(id: string, motivo: string): Observable<SolicitudMatriculaPublicaAdminDto> {
    return this.http.post<SolicitudMatriculaPublicaAdminDto>(
      `${this.baseUrl}/admin/${encodeURIComponent(id)}/autorizar-excepcion-edad`, { motivo });
  }

  asignarSeccion(id: string, seccionId: number): Observable<SolicitudMatriculaPublicaAdminDto> {
    return this.http.put<SolicitudMatriculaPublicaAdminDto>(
      `${this.baseUrl}/admin/${encodeURIComponent(id)}/asignar-seccion`, { seccionId });
  }

  documentoAdminUrl(id: string, tipo: TipoDocumentoSolicitud): Observable<{ url: string; versionId: string }> {
    return this.http.get<{ url: string; versionId: string }>(`${this.baseUrl}/admin/${encodeURIComponent(id)}/documentos/${tipo}/url`);
  }

  private tokenHeaders(token: string): HttpHeaders {
    return new HttpHeaders({ 'X-Solicitud-Matricula-Token': token });
  }
}
