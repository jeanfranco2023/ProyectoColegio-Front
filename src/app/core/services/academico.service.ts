import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, shareReplay, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AsignacionDocenteResponseDto,
  AnioLectivoResponseDto,
  CompetenciaResponseDto,
  DocenteOpcionDto,
  AulaResponseDto,
  GradoResponseDto,
  NivelResponseDto,
  PeriodoResponseDto,
  SeccionResponseDto
} from '../models/academico.model';

@Injectable({
  providedIn: 'root'
})
export class AcademicoService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/academico`;
  private readonly cache = new Map<string, { expira: number; obs: Observable<unknown> }>();
  private readonly ttlMs = 60_000;

  private cached<T>(clave: string, peticion: () => Observable<T>, ttl = this.ttlMs): Observable<T> {
    const ahora = Date.now();
    const existente = this.cache.get(clave);
    if (existente && existente.expira > ahora) {
      return existente.obs as Observable<T>;
    }
    const obs = peticion().pipe(shareReplay({ bufferSize: 1, refCount: false }));
    this.cache.set(clave, { expira: ahora + ttl, obs });
    return obs;
  }

  limpiarCache(): void {
    this.cache.clear();
  }

  listarAreas(nivelId: number): Observable<Array<{id: number; nombre: string}>> {
    return this.cached(`areas:${nivelId}`, () =>
      this.http.get<Array<{id: number; nombre: string}>>(`${environment.apiUrl}/curriculo/areas`, {params: {nivelId}})
    );
  }

  listarAsignaciones(): Observable<AsignacionDocenteResponseDto[]> {
    return this.http.get<AsignacionDocenteResponseDto[]>(`${environment.apiUrl}/curriculo/asignaciones`);
  }

  listarDocentes(areaId: number): Observable<DocenteOpcionDto[]> {
    return this.cached(`docentes:${areaId}`, () =>
      this.http.get<DocenteOpcionDto[]>(`${environment.apiUrl}/curriculo/docentes`, { params: { areaId } }),
      30_000
    );
  }

  asignarDocente(payload: {
    docenteUsuarioId: number;
    seccionId: number;
    anioLectivoId: number;
    nivelId: number;
    areaCurricularId: number;
  }): Observable<AsignacionDocenteResponseDto> {
    return this.http.post<AsignacionDocenteResponseDto>(`${environment.apiUrl}/curriculo/asignaciones`, payload).pipe(
      tap(() => this.limpiarCache())
    );
  }

  reasignarDocente(asignacionId: number, docenteUsuarioId: number): Observable<AsignacionDocenteResponseDto> {
    return this.http.put<AsignacionDocenteResponseDto>(
      `${environment.apiUrl}/curriculo/asignaciones/${asignacionId}/docente`,
      { docenteUsuarioId }
    ).pipe(
      tap(() => this.limpiarCache())
    );
  }

  listarAnios(): Observable<AnioLectivoResponseDto[]> {
    return this.cached('anios', () => this.http.get<AnioLectivoResponseDto[]>(`${this.baseUrl}/anios`));
  }

  listarCompetencias(areaId: number): Observable<CompetenciaResponseDto[]> {
    return this.cached(`competencias:${areaId}`, () =>
      this.http.get<CompetenciaResponseDto[]>(`${environment.apiUrl}/curriculo/competencias`, { params: new HttpParams().set('areaId', areaId) })
    );
  }

  listarAulas(): Observable<AulaResponseDto[]> {
    return this.cached('aulas', () => this.http.get<AulaResponseDto[]>(`${this.baseUrl}/aulas`));
  }

  crearAula(payload: { codigo: string; nombre: string; ubicacion?: string; capacidad: number }): Observable<AulaResponseDto> {
    return this.http.post<AulaResponseDto>(`${this.baseUrl}/aulas`, payload).pipe(tap(() => this.limpiarCache()));
  }

  actualizarAula(id: number, payload: { nombre?: string; ubicacion?: string; capacidad: number }): Observable<AulaResponseDto> {
    return this.http.put<AulaResponseDto>(`${this.baseUrl}/aulas/${id}`, payload).pipe(tap(() => this.limpiarCache()));
  }

  cambiarEstadoAula(id: number, activa: boolean): Observable<AulaResponseDto> {
    return this.http.put<AulaResponseDto>(`${this.baseUrl}/aulas/${id}/estado`, { activa }).pipe(tap(() => this.limpiarCache()));
  }

  listarNiveles(): Observable<NivelResponseDto[]> {
    return this.cached('niveles', () => this.http.get<NivelResponseDto[]>(`${this.baseUrl}/niveles`));
  }

  listarSecciones(anioId: number, nivelId?: number): Observable<SeccionResponseDto[]> {
    let params = new HttpParams().set('anioId', anioId.toString());
    if (nivelId !== undefined && nivelId !== null) {
      params = params.set('nivelId', nivelId.toString());
    }
    return this.http.get<SeccionResponseDto[]>(`${this.baseUrl}/secciones`, { params });
  }

  listarPeriodos(anioId: number): Observable<PeriodoResponseDto[]> {
    const params = new HttpParams().set('anioId', anioId.toString());
    return this.cached(`periodos:${anioId}`, () =>
      this.http.get<PeriodoResponseDto[]>(`${this.baseUrl}/periodos`, { params })
    );
  }

  crearAnio(payload: { anio: number; fechaInicio: string; fechaFin: string }): Observable<AnioLectivoResponseDto> {
    return this.http.post<AnioLectivoResponseDto>(`${this.baseUrl}/anios`, payload).pipe(tap(() => this.limpiarCache()));
  }

  listarGrados(nivelId: number): Observable<GradoResponseDto[]> {
    const params = new HttpParams().set('nivelId', nivelId.toString());
    return this.cached(`grados:${nivelId}`, () =>
      this.http.get<GradoResponseDto[]>(`${this.baseUrl}/grados`, { params })
    );
  }

  crearGrado(payload: { nivelId: number; numeroGrado: number; nombre: string }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/grados`, payload).pipe(tap(() => this.limpiarCache()));
  }

  crearSeccion(payload: {
    anioLectivoId: number;
    gradoId: number;
    nivelId: number;
    letra: string;
    cupoMaximo: number;
    aulaFisica: string;
  }): Observable<SeccionResponseDto> {
    return this.http.post<SeccionResponseDto>(`${this.baseUrl}/secciones`, payload).pipe(tap(() => this.limpiarCache()));
  }
}
