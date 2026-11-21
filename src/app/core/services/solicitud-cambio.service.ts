import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CrearSolicitudCambioRequestDto,
  GestionarSolicitudCambioRequestDto,
  NotificacionCorreoSolicitudDto,
  ResponderInformacionRequestDto,
  SolicitudCambioDto
} from '../models/solicitud-cambio.model';

@Injectable({ providedIn: 'root' })
export class SolicitudCambioService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/solicitudes-cambio`;

  listarMias(): Observable<SolicitudCambioDto[]> {
    return this.http.get<SolicitudCambioDto[]>(`${this.url}/mias`);
  }

  listarTodas(): Observable<SolicitudCambioDto[]> {
    return this.http.get<SolicitudCambioDto[]>(this.url);
  }

  obtenerDetalle(id: number): Observable<SolicitudCambioDto> {
    return this.http.get<SolicitudCambioDto>(`${this.url}/${id}`);
  }

  crear(dto: CrearSolicitudCambioRequestDto): Observable<SolicitudCambioDto> {
    return this.http.post<SolicitudCambioDto>(this.url, dto);
  }

  responderInformacion(id: number, dto: ResponderInformacionRequestDto): Observable<SolicitudCambioDto> {
    return this.http.post<SolicitudCambioDto>(`${this.url}/${id}/informacion`, dto);
  }

  gestionar(id: number, dto: GestionarSolicitudCambioRequestDto): Observable<SolicitudCambioDto> {
    return this.http.patch<SolicitudCambioDto>(`${this.url}/${id}/gestion`, dto);
  }

  reintentarNotificacion(solicitudId: number, notificacionId: number): Observable<NotificacionCorreoSolicitudDto> {
    return this.http.post<NotificacionCorreoSolicitudDto>(
      `${this.url}/${solicitudId}/notificaciones/${notificacionId}/reintentar`,
      {}
    );
  }
}
