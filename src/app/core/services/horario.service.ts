import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
export interface HorarioDto {
    id: number;
    anioLectivoId: number;
    gradoId: number;
    areaCurricularId: number;
    diaSemana: number;
    bloqueHorarioId: number;
    activo: boolean;
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
    nivelId: number;
    gradoId: number;
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
    obtenerPorGrado(id: number, anioId: number) { return this.http.get<HorarioDto[]>(`${this.url}/grado/${id}`, { params: { anioId } }); }
    bloques() { return this.http.get<BloqueHorarioDto[]>(`${environment.apiUrl}/curriculo/bloques`); }
    catalogo() { return this.http.get<AsignacionHorarioOpcionDto[]>(`${this.url}/catalogo`); }
    programar(payload: {
        anioLectivoId: number;
        gradoId: number;
        areaCurricularId: number;
        diaSemana: DiaHorario;
        bloqueHorarioId: number;
    }) { return this.http.post<HorarioDto>(`${this.url}/grado`, payload); }
    actualizar(id: number, payload: { anioLectivoId: number; gradoId: number; areaCurricularId: number; diaSemana: DiaHorario; bloqueHorarioId: number }) {
        return this.http.put<HorarioDto>(`${this.url}/grado/${id}`, payload);
    }
    retirar(id: number) { return this.http.delete<HorarioDto>(`${this.url}/grado/${id}`); }
}
