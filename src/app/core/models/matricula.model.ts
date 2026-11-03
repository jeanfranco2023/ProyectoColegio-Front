export type EstadoMatricula =
  | 'SOLICITADA'
  | 'RESERVADA_TEMPORAL'
  | 'PENDIENTE_ASIGNACION'
  | 'MATRICULADO'
  | 'TRASLADADO'
  | 'RETIRADO'
  | 'CANCELADA';

export type EstadoTerminalMatricula = 'TRASLADADO' | 'RETIRADO' | 'CANCELADA';
export type EstadoPagoMatricula = 'PAGADO' | 'PARCIAL' | 'PENDIENTE' | 'SIN_OBLIGACION';

export interface CambiarEstadoMatriculaRequestDto {
  estado: EstadoTerminalMatricula;
  motivo: string;
}

export interface MatriculaResponseDto {
  id: number;
  anioLectivoId: number;
  estudianteId: number;
  seccionId: number;
  fechaMatricula: string;
  estadoMatricula: EstadoMatricula;
  estadoPagoMatricula: EstadoPagoMatricula;
  reservaExpiraAt?: string;
  observaciones?: string;
}

export type TipoDocumento = 'DNI';
export type Genero = 'M' | 'F';

export interface ConsultaDniResponseDto {
  numeroDocumento: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
}

export interface RegistrarEstudianteRequestDto {
  tipoDocumento: TipoDocumento;
  numeroDocumento: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  fechaNacimiento: string;
  genero: Genero;
  grupoSanguineo?: string;
  alergiasCondiciones?: string;
}

export interface EstudianteResponseDto {
  id: number;
  codigoInterno?: string;
  tipoDocumento?: TipoDocumento;
  numeroDocumento: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  fechaNacimiento?: string;
  genero?: Genero;
  codigoEstudianteSiagie?: string;
  validadoReniec?: boolean;
  origenRegistro?: 'RENIEC_API' | 'MANUAL_CONTINGENCIA';
  grupoSanguineo?: string;
  alergiasCondiciones?: string;
  activo?: boolean;
  estado?: 'ACTIVO' | 'INACTIVO';
  createdAt?: string;
}

export interface ApoderadoResponseDto {
  id: number;
  usuarioId?: number;
  tipoDocumento?: TipoDocumento;
  numeroDocumento: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  celular?: string;
  email?: string;
  direccion?: string;
  ubigeoInei?: string;
  validadoReniec?: boolean;
  origenRegistro?: 'RENIEC_API' | 'MANUAL_CONTINGENCIA';
  createdAt?: string;
}

export interface ApoderadoFichaResponseDto {
  apoderado: ApoderadoResponseDto;
  parentesco: 'PADRE' | 'MADRE' | 'TUTOR_LEGAL' | 'ABUELO_A' | 'OTRO' | null;
  esResponsableEconomico: boolean;
}

export type ParentescoApoderado = Exclude<ApoderadoFichaResponseDto['parentesco'], null>;

export interface VincularApoderadoRequestDto {
  estudianteId: number;
  apoderadoId: number;
  parentesco: ParentescoApoderado;
  esResponsableEconomico: boolean;
  tieneCustodia: boolean;
  permiteRecojo: boolean;
}

export interface FichaMatriculaResponseDto {
  matricula: MatriculaResponseDto;
  estudiante: EstudianteResponseDto;
  apoderados: ApoderadoFichaResponseDto[];
  estadoPagoMatricula: 'PAGADO' | 'PARCIAL' | 'PENDIENTE' | 'SIN_OBLIGACION';
}

export interface SolicitarMatriculaRequestDto {
  anioLectivoId: number;
  estudianteId: number;
  seccionId: number;
  reservaExpiraAt?: string;
  observaciones?: string;
}
