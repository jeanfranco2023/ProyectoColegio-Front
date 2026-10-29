import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AsistenciaAulaResponseDto,
  ConciliacionAsistenciaResponseDto,
  DiscrepanciaAlertaResponseDto,
  ImportarLoteBiometricoRequestDto,
  JustificarInasistenciaRequestDto,
  LoteBiometricoResponseDto,
  RegistrarAsistenciaAulaRequestDto,
  ReporteAsistenciaDiariaResponseDto
} from '../models/asistencia.model';

export interface MatriculaAsistenciaDocenteDto {
  matriculaId: number;
  estudiante: string;
}

export interface AsistenciaDocenteDto {
  id: number;
  matriculaId: number;
  estudiante: string;
  fechaSesion: string;
  horaRegistro?: string;
  estado: AsistenciaAulaResponseDto['estado'];
}

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

  obtenerMatriculasDocente(): Observable<MatriculaAsistenciaDocenteDto[]> {
    return this.http.get<MatriculaAsistenciaDocenteDto[]>(`${this.baseUrl}/aula/docente/matriculas`);
  }

  obtenerReporteDocente(fecha: string): Observable<AsistenciaDocenteDto[]> {
    const params = new HttpParams().set('fecha', fecha);
    return this.http.get<AsistenciaDocenteDto[]>(`${this.baseUrl}/aula/docente`, { params });
  }

  registrarAsistenciaAula(request: RegistrarAsistenciaAulaRequestDto): Observable<AsistenciaAulaResponseDto> {
    return this.http.post<AsistenciaAulaResponseDto>(`${this.baseUrl}/aula`, request);
  }

  justificarInasistencia(request: JustificarInasistenciaRequestDto, archivo: File): Observable<AsistenciaAulaResponseDto> {
    const form = new FormData();
    form.append('asistenciaId', request.asistenciaId.toString());
    form.append('motivo', request.motivo);
    form.append('archivo', archivo);
    return this.http.post<AsistenciaAulaResponseDto>(`${this.baseUrl}/aula/justificacion`, form);
  }

  obtenerUrlSustentoPrivado(asistenciaId: number): Observable<{ url: string }> {
    return this.http.get<{ url: string }>(`${this.baseUrl}/aula/${asistenciaId}/justificacion/documento`);
  }

  importarLoteBiometrico(request: ImportarLoteBiometricoRequestDto): Observable<LoteBiometricoResponseDto> {
    return this.http.post<LoteBiometricoResponseDto>(`${this.baseUrl}/biometrico/importar`, request);
  }

  importarArchivoBiometrico(archivo: File): Observable<LoteBiometricoResponseDto> {
    const form = new FormData();
    form.append('archivo', archivo);
    return this.http.post<LoteBiometricoResponseDto>(`${this.baseUrl}/biometrico/importar-csv`, form);
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
