import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { EMPTY, expand, Observable, reduce } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  FichaMatriculaResponseDto,
  MatriculaResponseDto,
  SolicitarMatriculaRequestDto,
  RegistrarEstudianteRequestDto,
  EstudianteResponseDto,
  ConsultaDniResponseDto,
  ApoderadoResponseDto,
  VincularApoderadoRequestDto
} from '../models/matricula.model';
import { CambiarEstadoMatriculaRequestDto } from '../models/matricula.model';

@Injectable({
  providedIn: 'root'
})
export class MatriculaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/matriculas`;
  private readonly estudiantesUrl = `${environment.apiUrl}/estudiantes`;
  private readonly apoderadosUrl = `${environment.apiUrl}/apoderados`;

  listarPorSeccion(seccionId: number, page: number = 0, size: number = 20): Observable<MatriculaResponseDto[]> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    return this.http.get<MatriculaResponseDto[]>(`${this.baseUrl}/seccion/${seccionId}`, { params });
  }

  listarTodasPorSeccion(seccionId: number, size = 100): Observable<MatriculaResponseDto[]> {
    return this.listarPorSeccion(seccionId, 0, size).pipe(
      expand((pagina, indice) => pagina.length === size
        ? this.listarPorSeccion(seccionId, indice + 1, size)
        : EMPTY),
      reduce((acumuladas, pagina) => acumuladas.concat(pagina), [] as MatriculaResponseDto[])
    );
  }

  listarPorAnio(anioLectivoId: number): Observable<MatriculaResponseDto[]> {
    return this.http.get<MatriculaResponseDto[]>(`${this.baseUrl}/anio/${anioLectivoId}/registros`);
  }

  listarEstudianteIdsMatriculados(anioLectivoId: number): Observable<number[]> {
    return this.http.get<number[]>(`${this.baseUrl}/anio/${anioLectivoId}/estudiantes-matriculados`);
  }

  consultarFicha(id: number): Observable<FichaMatriculaResponseDto> {
    return this.http.get<FichaMatriculaResponseDto>(`${this.baseUrl}/${id}`);
  }

  solicitarMatricula(payload: SolicitarMatriculaRequestDto): Observable<MatriculaResponseDto> {
    return this.http.post<MatriculaResponseDto>(this.baseUrl, payload);
  }

  confirmarMatricula(matriculaId: number): Observable<MatriculaResponseDto> {
    return this.http.post<MatriculaResponseDto>(`${this.baseUrl}/confirmacion`, { matriculaId });
  }

  cambiarEstado(matriculaId: number, payload: CambiarEstadoMatriculaRequestDto): Observable<MatriculaResponseDto> {
    return this.http.patch<MatriculaResponseDto>(`${this.baseUrl}/${matriculaId}/estado`, payload);
  }

  registrarEstudiante(payload: RegistrarEstudianteRequestDto): Observable<EstudianteResponseDto> {
    return this.http.post<EstudianteResponseDto>(this.estudiantesUrl, payload);
  }

  consultarDni(dni: string): Observable<ConsultaDniResponseDto> {
    return this.http.get<ConsultaDniResponseDto>(`${this.estudiantesUrl}/dni/${encodeURIComponent(dni)}`);
  }

  listarEstudiantes(): Observable<EstudianteResponseDto[]> {
    return this.http.get<EstudianteResponseDto[]>(this.estudiantesUrl);
  }

  consultarEstudiante(id: number): Observable<EstudianteResponseDto> {
    return this.http.get<EstudianteResponseDto>(`${this.estudiantesUrl}/${id}`);
  }

  listarApoderados(): Observable<ApoderadoResponseDto[]> {
    return this.http.get<ApoderadoResponseDto[]>(this.apoderadosUrl);
  }

  vincularApoderado(payload: VincularApoderadoRequestDto): Observable<unknown> {
    return this.http.post<unknown>(`${this.estudiantesUrl}/apoderados`, payload);
  }

  corregirDniEstudiante(id: number, payload: { nuevoDni: string; motivo: string }): Observable<EstudianteResponseDto> {
    return this.http.patch<EstudianteResponseDto>(`${this.estudiantesUrl}/${id}/dni`, payload);
  }

  cambiarEstadoEstudiante(id: number, payload: { estado: string; motivo: string }): Observable<EstudianteResponseDto> {
    return this.http.patch<EstudianteResponseDto>(`${this.estudiantesUrl}/${id}/estado`, payload);
  }

  corregirDniApoderado(id: number, payload: { nuevoDni: string; motivo: string }): Observable<ApoderadoResponseDto> {
    return this.http.patch<ApoderadoResponseDto>(`${this.apoderadosUrl}/${id}/dni`, payload);
  }

  cambiarEstadoApoderado(id: number, payload: { estado: string; motivo: string }): Observable<ApoderadoResponseDto> {
    return this.http.patch<ApoderadoResponseDto>(`${this.apoderadosUrl}/${id}/estado`, payload);
  }

  consultarReniecPersona(dni: string): Observable<{ nombres?: string; apellidoPaterno?: string; apellidoMaterno?: string; numeroDocumento?: string }> {
    return this.http.get<{ nombres?: string; apellidoPaterno?: string; apellidoMaterno?: string; numeroDocumento?: string }>(
      `${environment.apiUrl}/personas/reniec/${encodeURIComponent(dni)}`
    );
  }
}
