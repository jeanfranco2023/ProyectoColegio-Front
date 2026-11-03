export type CalificacionCualitativa = 'AD' | 'A' | 'B' | 'C';
export interface FilaCalificacionResponseDto { matriculaId: number; nombreEstudiante: string; competenciaId: number; calificacionCualitativa: CalificacionCualitativa | null; conclusionDescriptiva: string | null; requiereRefuerzo: boolean | null; }

export interface CalificacionResponseDto {
  id: number;
  matriculaId: number;
  anioLectivoId: number;
  seccionId: number;
  periodoAcademicoId: number;
  asignacionDocenteId?: number;
  areaCurricularId?: number;
  docenteUsuarioId?: number;
  competenciaId?: number;
  calificacionCualitativa: CalificacionCualitativa;
  conclusionDescriptiva?: string;
  sugerenciaIaUtilizada?: boolean;
  requiereRefuerzo?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface EstudiantesEnRiesgoResponseDto {
  periodoId: number;
  calificaciones: CalificacionResponseDto[];
}

export interface CuadroHonorEstudianteDto {
  puesto: number;
  matriculaId: number;
  nombreCompleto: string;
  puntajePromedioInterno: number;
  porcentajeAsistencia: number;
  totalIncidencias: number;
  cantAd: number;
  cantA: number;
  cantB: number;
  cantC: number;
  mencionHonor: string;
  beneficioInstitucional: null;
}

export interface CuadroHonorResponseDto {
  anioLectivoId: number;
  gradoId: number;
  seccionId: number;
  nivelNombre: string;
  gradoNombre: string;
  seccionLetra: string;
  disclaimer: string;
  estudiantes: CuadroHonorEstudianteDto[];
}

export interface LibretaNotasResponseDto {
  matriculaId: number;
  calificaciones: CalificacionResponseDto[];
}

export interface ItemCalificacionRequestDto {
  matriculaId: number;
  competenciaId: number;
  calificacionCualitativa: CalificacionCualitativa;
  conclusionDescriptiva?: string;
  sugerenciaIaUtilizada: boolean;
}

export interface RegistrarCalificacionesMasivasRequestDto {
  periodoAcademicoId: number;
  asignacionDocenteId: number;
  calificaciones: ItemCalificacionRequestDto[];
}
