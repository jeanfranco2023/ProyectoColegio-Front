import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AsistenciaAulaResponseDto,
  ConciliacionAsistenciaResponseDto,
  DiscrepanciaAlertaResponseDto,
  DocenteAsistenciaDiariaResponseDto,
  ImportarLoteBiometricoRequestDto,
  JustificarInasistenciaRequestDto,
  LoteBiometricoResponseDto,
  RegistrarAsistenciaAulaRequestDto,
  ReporteAsistenciaDiariaResponseDto
} from '../models/asistencia.model';

@Injectable({
  providedIn: 'root'
})
export class AsistenciaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/asistencia`;

  obtenerReporteDiario(fecha: string): Observable<ReporteAsistenciaDiariaResponseDto> {
    const params = new HttpParams().set('fecha', fecha);
    return this.http.get<ReporteAsistenciaDiariaResponseDto>(`${this.baseUrl}/aula`, { params });
  }

  obtenerReporteDocente(fecha: string): Observable<DocenteAsistenciaDiariaResponseDto[]> {
    const params = new HttpParams().set('fecha', fecha);
    return this.http.get<DocenteAsistenciaDiariaResponseDto[]>(`${this.baseUrl}/aula/docente`, { params });
  }

  registrarAsistenciaAula(request: RegistrarAsistenciaAulaRequestDto): Observable<AsistenciaAulaResponseDto> {
    return this.http.post<AsistenciaAulaResponseDto>(`${this.baseUrl}/aula`, request);
  }

  justificarInasistencia(request: JustificarInasistenciaRequestDto): Observable<AsistenciaAulaResponseDto> {
    const body = new FormData();
    body.append('asistenciaId', String(request.asistenciaId));
    body.append('motivo', request.motivo);
    body.append('archivo', request.archivo, request.archivo.name);
    return this.http.post<AsistenciaAulaResponseDto>(`${this.baseUrl}/aula/justificacion`, body);
  }

  importarLoteBiometrico(request: ImportarLoteBiometricoRequestDto): Observable<LoteBiometricoResponseDto> {
    return this.http.post<LoteBiometricoResponseDto>(`${this.baseUrl}/biometrico/importar`, request);
  }

  listarAlertasConciliacion(fecha: string): Observable<DiscrepanciaAlertaResponseDto[]> {
    const params = new HttpParams().set('fecha', fecha);
    return this.http.get<DiscrepanciaAlertaResponseDto[]>(`${this.baseUrl}/conciliacion/alertas`, { params });
  }

  conciliarAsistencia(
    anioId: number,
    fecha: string,
    turnoCerrado: boolean
  ): Observable<ConciliacionAsistenciaResponseDto[]> {
    const params = new HttpParams()
      .set('anioId', anioId.toString())
      .set('fecha', fecha)
      .set('turnoCerrado', turnoCerrado.toString());
    return this.http.post<ConciliacionAsistenciaResponseDto[]>(`${this.baseUrl}/conciliacion`, {}, { params });
  }
}
