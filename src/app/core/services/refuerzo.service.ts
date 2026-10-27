import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
export interface SesionRefuerzoDto {
    id: number;
    anioLectivoId: number;
    periodoAcademicoId: number;
    areaCurricularId: number;
    docenteUsuarioId: number;
    tema: string;
    fechaProgramada: string;
    horaInicio: string;
    horaFin: string;
    aulaAsignada: string | null;
}
export type EstadoRefuerzo = 'PENDIENTE' | 'ASISTIO' | 'FALTO' | 'JUSTIFICADO';
export interface InscripcionRefuerzoDto {
    id: number;
    sesionRefuerzoId: number;
    estudianteId: number;
    calificacionOrigenId: number;
    estadoAsistencia: EstadoRefuerzo;
    observaciones: string | null;
    nombreEstudiante?: string;
}
@Injectable({ providedIn: 'root' })
export class RefuerzoService {
    private readonly http = inject(HttpClient);
    private readonly url = `${environment.apiUrl}/evaluacion/refuerzo`;
    listarSesiones(periodoId: number) { return this.http.get<SesionRefuerzoDto[]>(this.url, { params: { periodoId } }); }
    programar(payload: Omit<SesionRefuerzoDto, 'id'>) { return this.http.post<SesionRefuerzoDto>(this.url, payload); }
    derivarAutomatico(id: number) { return this.http.post<InscripcionRefuerzoDto[]>(`${this.url}/${id}/derivacion`, {}); }
    inscripciones(id: number) { return this.http.get<InscripcionRefuerzoDto[]>(`${this.url}/${id}/inscripciones`); }
    asistencia(payload: {
        inscripcionId: number;
        estadoAsistencia: EstadoRefuerzo;
        observaciones: string;
    }) { return this.http.post<InscripcionRefuerzoDto>(`${this.url}/asistencia`, payload); }
}
