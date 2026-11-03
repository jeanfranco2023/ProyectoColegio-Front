import { RolNombre } from '../models/auth.model';

/** Fuente única de permisos para las rutas y el menú del área autenticada. */
export const ADMIN_ROUTE_ACCESS = {
  dashboard: ['DIRECCION', 'SECRETARIA'],
  matriculas: ['DIRECCION', 'SECRETARIA'],
  'solicitudes-matricula': ['DIRECCION', 'SECRETARIA'],
  academico: ['DIRECCION'],
  horarios: ['DIRECCION', 'DOCENTE'],
  refuerzos: ['DIRECCION', 'DOCENTE'],
  calificaciones: ['DIRECCION', 'DOCENTE'],
  asistencia: ['DIRECCION', 'SECRETARIA', 'AUXILIAR', 'TUTOR', 'DOCENTE'],
  convivencia: ['DIRECCION', 'SECRETARIA', 'AUXILIAR', 'TUTOR'],
  tutoria: ['TUTOR'],
  'observaciones-conductuales': ['DIRECCION', 'TUTOR', 'AUXILIAR'],
  tesoreria: ['DIRECCION', 'SECRETARIA', 'APODERADO'],
  comunicados: ['DIRECCION', 'SECRETARIA', 'APODERADO'],
  usuarios: ['DIRECCION'],
  auditoria: ['DIRECCION'],
  'portal-apoderado': ['APODERADO'],
  suplencias: ['APODERADO'],
  'aprobacion-suplencias': ['DIRECCION'],
  perfil: []
} as const satisfies Record<string, readonly RolNombre[]>;
