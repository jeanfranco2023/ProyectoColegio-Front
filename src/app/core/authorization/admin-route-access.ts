import { RolNombre } from '../models/auth.model';

/** Fuente única de permisos para las rutas y el menú del área autenticada. */
export const ADMIN_ROUTE_ACCESS = {
  dashboard: ['DIRECCION', 'SECRETARIA', 'ADMINISTRADOR', 'DOCENTE', 'AUXILIAR', 'TUTOR', 'APODERADO'],
  matriculas: ['DIRECCION', 'SECRETARIA', 'ADMINISTRADOR'],
  'solicitudes-matricula': ['DIRECCION', 'SECRETARIA', 'ADMINISTRADOR'],
  academico: ['DIRECCION', 'ADMINISTRADOR'],
  horarios: ['DIRECCION', 'DOCENTE', 'ADMINISTRADOR'],
  refuerzos: ['DIRECCION', 'DOCENTE', 'ADMINISTRADOR'],
  calificaciones: ['DIRECCION', 'DOCENTE', 'ADMINISTRADOR'],
  asistencia: ['DIRECCION', 'SECRETARIA', 'AUXILIAR', 'TUTOR', 'DOCENTE', 'ADMINISTRADOR'],
  convivencia: ['DIRECCION', 'SECRETARIA', 'AUXILIAR', 'TUTOR', 'ADMINISTRADOR'],
  tutoria: ['TUTOR'],
  'observaciones-conductuales': ['DIRECCION', 'TUTOR', 'AUXILIAR', 'ADMINISTRADOR'],
  tesoreria: ['DIRECCION', 'SECRETARIA', 'APODERADO', 'AUXILIAR', 'ADMINISTRADOR'],
  comunicados: ['DIRECCION', 'SECRETARIA', 'APODERADO', 'ADMINISTRADOR'],
  usuarios: ['DIRECCION', 'ADMINISTRADOR'],
  auditoria: ['ADMINISTRADOR'],
  'solicitudes-cambio': ['DIRECCION', 'ADMINISTRADOR'],
  'portal-apoderado': ['APODERADO'],
  suplencias: ['APODERADO'],
  'aprobacion-suplencias': ['DIRECCION', 'ADMINISTRADOR'],
  perfil: []
} as const satisfies Record<string, readonly RolNombre[]>;
