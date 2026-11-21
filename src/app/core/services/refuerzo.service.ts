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
export type EstadoSesionRefuerzo =
  | 'SIN_DERIVADOS'
  | 'PENDIENTE_ASISTENCIA'
  | 'PROGRAMADA'
  | 'COMPLETADA';

export interface SesionRefuerzoDetalleDto extends SesionRefuerzoDto {
  periodoNombre: string | null;
  areaNombre: string | null;
  docenteNombre: string;
  seccionId: number | null;
  nivelNombre: string | null;
  gradoNombre: string | null;
  seccionLetra: string | null;
  gradoSeccion: string | null;
  totalInscritos: number;
  pendientes: number;
  asistieron: number;
  faltaron: number;
  justificados: number;
  casosC: number;
  casosB: number;
  estadoSesion: EstadoSesionRefuerzo;
}

export interface EstudianteRiesgoRefuerzoDto {
  calificacionId: number;
  matriculaId: number;
  estudianteId: number;
  nombreEstudiante: string;
  dniEstudiante: string | null;
  anioLectivoId: number;
  periodoAcademicoId: number;
  periodoNombre: string | null;
  seccionId: number | null;
  nivelNombre: string | null;
  gradoNombre: string | null;
  seccionLetra: string | null;
  gradoSeccion: string | null;
  areaCurricularId: number;
  areaNombre: string | null;
  docenteUsuarioId: number;
  docenteNombre: string;
  competenciaId: number;
  competenciaNombre: string | null;
  calificacionCualitativa: 'B' | 'C';
  conclusionDescriptiva: string | null;
  derivado: boolean;
  sesionRefuerzoId: number | null;
  sesionTema: string | null;
  estadoAsistencia: EstadoRefuerzo | null;
}

export interface TableroRefuerzoDto {
  anioLectivoId: number | null;
  periodoId: number | null;
  totalSesiones: number;
  totalInscripciones: number;
  pendientesAsistencia: number;
  asistieron: number;
  faltaron: number;
  justificados: number;
  estudiantesUnicosEnRefuerzo: number;
  evaluacionesRiesgoTotal: number;
  evaluacionesSinDerivar: number;
  sesiones: SesionRefuerzoDetalleDto[];
  riesgos: EstudianteRiesgoRefuerzoDto[];
}

export interface InscripcionRefuerzoDto {
  id: number;
  sesionRefuerzoId: number;
  estudianteId: number;
  calificacionOrigenId: number | null;
  estadoAsistencia: EstadoRefuerzo;
  observaciones: string | null;
  nombreEstudiante?: string;
  dniEstudiante?: string | null;
  gradoSeccion?: string | null;
  calificacionOrigen?: string | null;
  competenciaNombre?: string | null;
  conclusionOrigen?: string | null;
}

@Injectable({ providedIn: 'root' })
export class RefuerzoService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/evaluacion/refuerzo`;

  tablero(anioId?: number, periodoId?: number) {
    const params: Record<string, string | number> = {};
    if (anioId) params['anioId'] = anioId;
    if (periodoId) params['periodoId'] = periodoId;
    return this.http.get<TableroRefuerzoDto>(`${this.url}/tablero`, { params });
  }

  listarSesiones(periodoId: number) {
    return this.http.get<SesionRefuerzoDto[]>(this.url, { params: { periodoId } });
  }

  programar(payload: Omit<SesionRefuerzoDto, 'id'>) {
    return this.http.post<SesionRefuerzoDto>(this.url, payload);
  }

  derivarAutomatico(id: number) {
    return this.http.post<InscripcionRefuerzoDto[]>(`${this.url}/${id}/derivacion`, {});
  }

  inscripciones(id: number) {
    return this.http.get<InscripcionRefuerzoDto[]>(`${this.url}/${id}/inscripciones`);
  }

  asistencia(payload: {
    inscripcionId: number;
    estadoAsistencia: EstadoRefuerzo;
    observaciones: string;
  }) {
    return this.http.post<InscripcionRefuerzoDto>(`${this.url}/asistencia`, payload);
  }
}
