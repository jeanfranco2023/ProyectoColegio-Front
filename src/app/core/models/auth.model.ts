export type RolNombre = 'DIRECCION' | 'SECRETARIA' | 'DOCENTE' | 'AUXILIAR' | 'TUTOR' | 'APODERADO' | 'ADMINISTRADOR';

export interface RolResponseDto {
  id: number;
  codigo: RolNombre;
  nombre: string;
}

export interface AreaDocenteDto {
  id: number;
  nivelId: number;
  nivelNombre?: string | null;
  codigo: string;
  nombre: string;
}

export interface UserResponseDto {
  id: number;
  username: string;
  nombreCompleto?: string | null;
  dni?: string | null;
  email: string;
  activo: boolean;
  telefono?: string | null;
  direccion?: string | null;
  especialidad?: string | null;
  codigoModular?: string | null;
  numeroColegiatura?: string | null;
  tipoContrato?: string | null;
  estadoLaboral?: string | null;
  fechaIngreso?: string | null;
  roles: RolResponseDto[];
  areasCurriculares?: AreaDocenteDto[];
  createdAt: string;
  updatedAt: string;
}

export interface CrearUsuarioRequestDto {
  username: string;
  dni?: string;
  nombreCompleto?: string;
  email: string;
  password: string;
  telefono?: string;
  direccion?: string;
  especialidad?: string;
  codigoModular?: string;
  numeroColegiatura?: string;
  tipoContrato?: string;
  roles: RolNombre[];
  areaCurricularIds?: number[];
}

export interface ActualizarUsuarioAdminRequestDto {
  dni?: string;
  nombreCompleto?: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  especialidad?: string;
  codigoModular?: string;
  numeroColegiatura?: string;
  tipoContrato?: string;
  estadoLaboral?: 'ACTIVO' | 'SUSPENDIDO' | 'CESADO' | 'INACTIVO';
  passwordNuevo?: string;
  roles?: RolNombre[];
  areaCurricularIds?: number[];
}

export interface CambiarPasswordRequestDto {
  passwordActual: string;
  passwordNuevo: string;
}

export interface CambiarPasswordInicialRequestDto {
  passwordActual?: string;
  nuevoPassword: string;
}

export interface LoginRequestDto {
  username: string;
  password: string;
}

export interface RefreshTokenRequestDto {
  refreshToken: string;
}

export interface AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: UserResponseDto;
  debeCambiarPassword?: boolean;
}

export type EstadoValidacionIa = 'VALIDADO_IA' | 'OBSERVADO_IA' | 'PENDIENTE';

export interface DocumentoLegajoDto {
  tipoDocumento: 'CV' | 'TITULO_PROFESIONAL' | 'ANTECEDENTES_POLICIALES' | 'ANTECEDENTES_PENALES' | 'OTRO';
  nombreArchivo: string | null;
  estadoIa: EstadoValidacionIa;
  observacionesIa: string | null;
  fechaCreacion?: string | null;
}

export interface ExpedienteEmpleadoDto {
  dni: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  telefono: string;
  direccion: string;
  tipoContrato: string;
  especialidad: string;
  codigoModular?: string;
  documentosLegajo: DocumentoLegajoDto[];
}
