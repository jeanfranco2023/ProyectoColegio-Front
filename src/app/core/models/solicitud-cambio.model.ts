export type EstadoSolicitudCambio =
  | 'RECIBIDA'
  | 'EN_EVALUACION'
  | 'REQUIERE_INFORMACION'
  | 'APROBADA'
  | 'RECHAZADA'
  | 'EN_EJECUCION'
  | 'RESUELTA'
  | 'CERRADA';

export type PrioridadSolicitudCambio = 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';

export const MODULOS_SOLICITUD_CAMBIO: readonly string[] = [
  'Matrículas',
  'Solicitudes de matrícula',
  'Aulas y horarios',
  'Malla horaria',
  'Refuerzo académico',
  'Calificaciones',
  'Asistencia',
  'Convivencia',
  'Tesorería y pagos',
  'Comunicados',
  'Usuarios y permisos',
  'Portal familiar'
];

export const ESTADO_SOLICITUD_LABELS: Record<EstadoSolicitudCambio, string> = {
  RECIBIDA: 'Recibida',
  EN_EVALUACION: 'En evaluación',
  REQUIERE_INFORMACION: 'Requiere información',
  APROBADA: 'Aprobada',
  RECHAZADA: 'Rechazada',
  EN_EJECUCION: 'En ejecución',
  RESUELTA: 'Resuelta',
  CERRADA: 'Cerrada'
};

export interface EventoSolicitudCambioDto {
  id: number;
  actorNombre: string;
  actorRol: string;
  estadoAnterior: EstadoSolicitudCambio | null;
  estadoNuevo: EstadoSolicitudCambio | null;
  tipoEvento: string;
  comentario: string | null;
  visibleDireccion: boolean;
  evidenciaUrl: string | null;
  fechaEvento: string;
}

export interface NotificacionCorreoSolicitudDto {
  id: number;
  destinatarioEmail: string;
  asunto: string;
  cuerpoResumen: string;
  estadoEnvio: string;
  intentos: number;
  ultimoError: string | null;
  fechaIntento: string | null;
}

export interface SolicitudCambioDto {
  id: number;
  codigo: string;
  titulo: string;
  modulo: string;
  motivoProblema: string;
  resultadoEsperado: string;
  alcanceImpacto: string | null;
  evidenciaInicial: string | null;
  solicitanteId: number;
  solicitanteNombre: string;
  solicitanteEmail: string;
  estado: EstadoSolicitudCambio;
  prioridad: PrioridadSolicitudCambio;
  impactoEvaluado: string | null;
  responsableId: number | null;
  responsableNombre: string | null;
  aprobadorNombre: string | null;
  registradoDecisionPor: string | null;
  fechaDecision: string | null;
  motivoDecision: string | null;
  resumenCambio: string | null;
  enlaceEvidenciaTecnica: string | null;
  planReversion: string | null;
  pruebaPosterior: string | null;
  resultadoPrueba: string | null;
  verificacionCierre: string | null;
  cerradoPorNombre: string | null;
  fechaSolicitud: string;
  fechaActualizacion: string;
  fechaCierre: string | null;
  eventos: EventoSolicitudCambioDto[];
  notificaciones: NotificacionCorreoSolicitudDto[];
}

export interface CrearSolicitudCambioRequestDto {
  titulo: string;
  modulo: string;
  motivoProblema: string;
  resultadoEsperado: string;
  alcanceImpacto: string | null;
  evidenciaInicial: string | null;
  idempotencyKey: string;
}

export interface ResponderInformacionRequestDto {
  comentario: string;
  evidenciaUrl: string | null;
}

export interface GestionarSolicitudCambioRequestDto {
  nuevoEstado: EstadoSolicitudCambio;
  prioridad: PrioridadSolicitudCambio;
  impactoEvaluado: string | null;
  responsableNombre: string | null;
  aprobadorNombre: string | null;
  motivoDecision: string | null;
  resumenCambio: string | null;
  enlaceEvidenciaTecnica: string | null;
  planReversion: string | null;
  pruebaPosterior: string | null;
  resultadoPrueba: string | null;
  verificacionCierre: string | null;
  comentario: string | null;
  visibleDireccion: boolean;
}
