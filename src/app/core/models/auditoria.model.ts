export interface AuditoriaAccesoDto {
  id: number;
  solicitudId: string;
  usuarioId: number | null;
  usuarioNombre: string | null;
  roles: string | null;
  metodo: string;
  ruta: string;
  estadoHttp: number;
  direccionIp: string | null;
  agenteUsuario: string | null;
  duracionMs: number;
  fechaEvento: string;
}

export interface PaginaAuditoriaDto {
  content: AuditoriaAccesoDto[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface CambioAuditoriaDto {
  id: number;
  tablaAfectada: string;
  registroId: number | null;
  registroClave: string;
  accion: string;
  datosAnteriores: string | null;
  datosNuevos: string | null;
  usuarioId: number | null;
  usuarioNombre: string | null;
  roles: string | null;
  contextoHistoricoSinSnapshot: boolean;
  fechaCreacion: string;
}
