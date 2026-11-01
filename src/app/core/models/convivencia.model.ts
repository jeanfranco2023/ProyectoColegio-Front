export type TipoFalta = 'LEVE' | 'GRAVE' | 'MUY_GRAVE';
export type EstadoIncidencia = 'ABIERTA' | 'ATENDIDA' | 'CERRADA';

export interface ActualizarEstadoIncidenciaRequestDto {
  estado: EstadoIncidencia;
  observacionGestion: string;
  resultadoVerificado?: string;
  participantes?: string;
  comunicacionApoderado?: string;
}

export interface HistorialEstadoIncidenciaResponseDto {
  id: number;
  estadoAnterior: EstadoIncidencia | null;
  estadoNuevo: EstadoIncidencia;
  usuarioId: number;
  nombreUsuario: string;
  fechaCambio: string;
  observacion: string;
  resultadoVerificado: string | null;
  participantes: string | null;
  comunicacionApoderado: string | null;
}

export interface IncidenciaResponseDto {
  id: number;
  matriculaId: number;
  nombreEstudiante: string;
  fechaIncidencia: string;
  tipoFalta: TipoFalta;
  descripcion: string;
  reportadoPorUsuarioId: number;
  requiereCitacion: boolean | null;
  estado: EstadoIncidencia;
  createdAt?: string;
}

export interface RegistrarIncidenciaRequestDto {
  matriculaId: number;
  fechaIncidencia: string;
  tipoFalta: TipoFalta;
  descripcion: string;
  requiereCitacion: boolean;
}
