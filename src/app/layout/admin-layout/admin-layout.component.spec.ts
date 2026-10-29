import { describe, expect, it } from 'vitest';
import { visibleAdminMenuItems } from './admin-layout.component';

const expectedMenuByRole = {
  DIRECCION: [
    ['Panel general', '/admin/dashboard'],
    ['Matrículas', '/admin/matriculas'],
    ['Solicitudes de matrícula', '/admin/solicitudes-matricula'],
    ['Aulas y horarios', '/admin/academico'],
    ['Malla horaria', '/admin/horarios'],
    ['Refuerzo académico', '/admin/refuerzos'],
    ['Calificaciones', '/admin/calificaciones'],
    ['Asistencia', '/admin/asistencia'],
    ['Convivencia', '/admin/convivencia'],
    ['Incidencias y faltas', '/admin/observaciones-conductuales'],
    ['Tesorería y pagos', '/admin/tesoreria'],
    ['Comunicados', '/admin/comunicados'],
    ['Usuarios y permisos', '/admin/usuarios'],
    ['Gestión de suplentes', '/admin/aprobacion-suplencias'],
    ['Mi perfil', '/admin/perfil']
  ],
  SECRETARIA: [
    ['Panel general', '/admin/dashboard'],
    ['Matrículas', '/admin/matriculas'],
    ['Solicitudes de matrícula', '/admin/solicitudes-matricula'],
    ['Asistencia', '/admin/asistencia'],
    ['Tesorería y pagos', '/admin/tesoreria'],
    ['Comunicados', '/admin/comunicados'],
    ['Mi perfil', '/admin/perfil']
  ],
  DOCENTE: [
    ['Malla horaria', '/admin/horarios'],
    ['Refuerzo académico', '/admin/refuerzos'],
    ['Calificaciones', '/admin/calificaciones'],
    ['Asistencia', '/admin/asistencia'],
    ['Mi perfil', '/admin/perfil']
  ],
  AUXILIAR: [
    ['Asistencia', '/admin/asistencia'],
    ['Convivencia', '/admin/convivencia'],
    ['Incidencias y faltas', '/admin/observaciones-conductuales'],
    ['Mi perfil', '/admin/perfil']
  ],
  TUTOR: [
    ['Asistencia', '/admin/asistencia'],
    ['Convivencia', '/admin/convivencia'],
    ['Tutoría y seguimiento', '/admin/tutoria'],
    ['Incidencias y faltas', '/admin/observaciones-conductuales'],
    ['Mi perfil', '/admin/perfil']
  ],
  APODERADO: [
    ['Tesorería y pagos', '/admin/tesoreria'],
    ['Comunicados', '/admin/comunicados'],
    ['Portal familiar', '/admin/portal-apoderado'],
    ['Designar suplente', '/admin/suplencias'],
    ['Mi perfil', '/admin/perfil']
  ]
} as const;

describe('admin menu by role', () => {
  it.each(Object.entries(expectedMenuByRole))('shows the reference menu for %s', (role, expectedItems) => {
    const actualItems = visibleAdminMenuItems([role]).map(({ label, route }) => [label, route]);
    expect(actualItems).toEqual(expectedItems);
  });

  it('permite solicitar suplentes al apoderado y reserva la aprobación a gestión', () => {
    const familia = visibleAdminMenuItems(['APODERADO']).map(item => item.route);
    expect(familia).toContain('/admin/portal-apoderado');
    expect(familia).toContain('/admin/suplencias');
    expect(familia).not.toContain('/admin/aprobacion-suplencias');
    expect(familia).not.toContain('/admin/tutoria');
    expect(visibleAdminMenuItems(['DIRECCION']).some(item => item.route === '/admin/aprobacion-suplencias')).toBe(true);
    expect(visibleAdminMenuItems(['DOCENTE']).some(item => item.route === '/admin/horarios')).toBe(true);
    expect(visibleAdminMenuItems(['DOCENTE']).some(item => item.route === '/admin/refuerzos')).toBe(true);
    expect(familia).not.toContain('/admin/refuerzos');
    expect(visibleAdminMenuItems(['DIRECCION']).some(item => item.route === '/admin/portal-apoderado')).toBe(false);
    expect(visibleAdminMenuItems(['SECRETARIA']).some(item => item.route === '/admin/portal-apoderado')).toBe(false);
    expect(visibleAdminMenuItems(['DIRECCION']).some(item => item.route === '/admin/tutoria')).toBe(false);
    expect(visibleAdminMenuItems(['AUXILIAR']).some(item => item.route === '/admin/tutoria')).toBe(false);
    expect(visibleAdminMenuItems(['TUTOR']).some(item => item.route === '/admin/tutoria')).toBe(true);
  });

  it('reserva configuración, usuarios y módulos pedagógicos operativos a Dirección y Docentes', () => {
    const secretaria = visibleAdminMenuItems(['SECRETARIA']).map(item => item.route);
    expect(secretaria).toContain('/admin/matriculas');
    expect(secretaria).toContain('/admin/solicitudes-matricula');
    expect(secretaria).toContain('/admin/asistencia');
    expect(secretaria).toContain('/admin/tesoreria');
    expect(secretaria).not.toContain('/admin/academico');
    expect(secretaria).not.toContain('/admin/usuarios');
    expect(secretaria).not.toContain('/admin/calificaciones');
    expect(secretaria).not.toContain('/admin/convivencia');
  });
});
