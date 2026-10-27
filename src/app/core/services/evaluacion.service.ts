import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  FilaCalificacionResponseDto,
  CalificacionResponseDto,
  EstudiantesEnRiesgoResponseDto,
  LibretaNotasResponseDto,
  RegistrarCalificacionesMasivasRequestDto
} from '../models/evaluacion.model';

@Injectable({
  providedIn: 'root'
})
export class EvaluacionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/evaluacion`;

  importarPlanilla(archivo: File, periodoId: number, seccionId: number, asignacionDocenteId: number, confirmar: boolean): Observable<ImportacionCneb> {
    const cuerpo = new FormData(); cuerpo.append('archivo', archivo);
    return this.http.post<ImportacionCneb>(`${this.baseUrl}/cneb/carga-masiva`, cuerpo,
      {params: {periodoId, seccionId, asignacionDocenteId, confirmar}});
  }

  descargarPlantilla(asignacionDocenteId: number, periodoId: number, competenciaId: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/cneb/plantilla`, {params: {asignacionDocenteId, periodoId, competenciaId}, responseType: 'blob'});
  }

  descargarLibretaPdf(matriculaId: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/libreta/${matriculaId}/pdf`, {responseType: 'blob'});
  }

  sugerirConclusion(payload: {areaCurricular: string; competenciaDescripcion: string; nivelLogro: string; desempenoObservado: string}): Observable<{conclusionDescriptiva: string; aspectoMejora: string; recomendacionApoderado: string; generadoPorIa: boolean}> {
    return this.http.post<{conclusionDescriptiva: string; aspectoMejora: string; recomendacionApoderado: string; generadoPorIa: boolean}>(`${this.baseUrl}/ia/sugerir-conclusion`, payload);
  }

  listarMatriz(asignacionDocenteId: number, periodoAcademicoId: number, competenciaId: number): Observable<FilaCalificacionResponseDto[]> {
    const params = new HttpParams().set('asignacionDocenteId', asignacionDocenteId).set('periodoAcademicoId', periodoAcademicoId).set('competenciaId', competenciaId);
    return this.http.get<FilaCalificacionResponseDto[]>(`${this.baseUrl}/cneb/matriz`, { params });
  }

  listarCalificaciones(asignacionDocenteId: number, periodoAcademicoId: number): Observable<CalificacionResponseDto[]> {
    const params = new HttpParams().set('asignacionDocenteId', asignacionDocenteId).set('periodoAcademicoId', periodoAcademicoId);
    return this.http.get<CalificacionResponseDto[]>(`${this.baseUrl}/cneb`, { params });
  }

  consultarEstudiantesEnRiesgo(periodoId: number): Observable<EstudiantesEnRiesgoResponseDto> {
    const params = new HttpParams().set('periodoId', periodoId.toString());
    return this.http.get<EstudiantesEnRiesgoResponseDto>(`${this.baseUrl}/riesgo`, { params });
  }

  registrarCalificaciones(payload: RegistrarCalificacionesMasivasRequestDto): Observable<CalificacionResponseDto[]> {
    return this.http.post<CalificacionResponseDto[]>(`${this.baseUrl}/cneb`, payload);
  }

  consultarLibreta(matriculaId: number): Observable<LibretaNotasResponseDto> {
    return this.http.get<LibretaNotasResponseDto>(`${this.baseUrl}/libreta/${matriculaId}`);
  }
}

export interface ImportacionCneb {
  filasValidadas: number; filasProcesadas: number;
  filas: Array<{fila: number; dni: string; estudiante: string; competenciaId: number; nota: string; conclusion: string}>;
}
