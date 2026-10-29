import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AsistenciaAulaResponseDto } from '../models/asistencia.model';
import { PeriodoResponseDto } from '../models/academico.model';
export interface HijoPortalDto {
    estudianteId: number;
    matriculaId: number;
    anioLectivoId: number;
    anio: number;
    seccionId: number;
    nombres: string;
    apellidoPaterno: string;
    apellidoMaterno: string;
    numeroDocumento: string;
    nivel: string;
    grado: string;
    seccion: string;
}
export interface CalificacionPortalDto {
    areaId: number;
    areaNombre: string;
    competenciaId: number;
    competenciaNombre: string;
    periodoId: number;
    periodoNombre: string;
    nota: 'AD' | 'A' | 'B' | 'C';
    conclusion: string | null;
}
export interface CalificacionRiesgoTutorDto {
    matriculaId: number;
    periodoId: number;
    nota: 'B' | 'C';
}
@Injectable({ providedIn: 'root' })
export class PortalFamiliarService {
    private readonly http = inject(HttpClient);
    private readonly url = `${environment.apiUrl}/portal-familiar`;
    hijos() { return this.http.get<HijoPortalDto[]>(`${this.url}/hijos`); }
    hijosPropios() { return this.http.get<HijoPortalDto[]>(`${this.url}/hijos-propios`); }
    alumnosSeguimiento() { return this.http.get<HijoPortalDto[]>(`${this.url}/alumnos-seguimiento`); }
    calificacionesRiesgoTutor() { return this.http.get<CalificacionRiesgoTutorDto[]>(`${this.url}/seguimiento/riesgo-calificaciones`); }
    periodos(id: number) { return this.http.get<PeriodoResponseDto[]>(`${this.url}/matriculas/${id}/periodos`); }
    periodosSeguimiento(anioId: number) { return this.http.get<PeriodoResponseDto[]>(`${this.url}/periodos-seguimiento`, { params: { anioId } }); }
    asistencia(id: number) { return this.http.get<AsistenciaAulaResponseDto[]>(`${this.url}/matriculas/${id}/asistencia`); }
    calificaciones(id: number) { return this.http.get<CalificacionPortalDto[]>(`${this.url}/matriculas/${id}/calificaciones`); }
}
