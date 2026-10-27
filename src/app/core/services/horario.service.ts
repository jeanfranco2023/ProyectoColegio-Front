import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
export interface HorarioDto {
    id: number;
    anioLectivoId: number;
    seccionId: number;
    docenteUsuarioId: number;
    asignacionDocenteId: number;
    diaSemana: number;
    bloqueHorarioId: number;
}
export interface BloqueHorarioDto {
    id: number;
    numeroBloque: number;
    horaInicio: string;
    horaFin: string;
    esRecreo: boolean;
}
export interface MallaHorariaDto {
    horarios: HorarioDto[];
}
export interface AsignacionHorarioOpcionDto {
    asignacionId: number;
    anioLectivoId: number;
    anio: number;
    seccionId: number;
    nivel: string;
    grado: string;
    letra: string;
    areaId: number;
    areaNombre: string;
    docenteUsuarioId: number;
    docenteNombre: string;
    aulaCodigo: string;
}
export type DiaHorario = 'LUNES' | 'MARTES' | 'MIERCOLES' | 'JUEVES' | 'VIERNES';
@Injectable({ providedIn: 'root' })
export class HorarioService {
    private readonly http = inject(HttpClient);
    private readonly url = `${environment.apiUrl}/horarios`;
    obtenerPorSeccion(id: number, anioId: number) { return this.http.get<MallaHorariaDto>(`${this.url}/seccion/${id}`, { params: { anioId } }); }
    obtenerPorDocente(id: number, anioId: number) { return this.http.get<MallaHorariaDto>(`${this.url}/docente/${id}`, { params: { anioId } }); }
    bloques() { return this.http.get<BloqueHorarioDto[]>(`${environment.apiUrl}/curriculo/bloques`); }
    catalogo() { return this.http.get<AsignacionHorarioOpcionDto[]>(`${this.url}/catalogo`); }
    programar(payload: {
        asignacionDocenteId: number;
        diaSemana: DiaHorario;
        bloqueHorarioId: number;
    }) { return this.http.post<HorarioDto>(this.url, payload); }
}
