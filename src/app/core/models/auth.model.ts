export type RolNombre = 'DIRECCION' | 'SECRETARIA' | 'DOCENTE' | 'AUXILIAR' | 'TUTOR' | 'APODERADO' | 'ADMINISTRADOR';

export interface RolResponseDto {
  id: number;
  codigo: RolNombre;
  nombre: string;
}

export interface UserResponseDto {
  id: number;
  username: string;
  nombreCompleto?: string | null;
  dni?: string | null;
  email: string;
  activo: boolean;
  especialidad?: string | null;
  roles: RolResponseDto[];
  createdAt: string;
  updatedAt: string;
}

export interface CrearUsuarioRequestDto {
  username: string;
  dni?: string;
  nombreCompleto?: string;
  email: string;
  password: string;
  roles: RolNombre[];
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
