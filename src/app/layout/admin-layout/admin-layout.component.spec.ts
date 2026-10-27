import { describe, expect, it } from 'vitest';
import { visibleAdminMenuItems } from './admin-layout.component';

const expectedMenuByRole = {
  DIRECCION: [
    ['Panel general', '/admin/dashboard'],
    ['Matrículas', '/admin/matriculas'],
    ['Aulas y horarios', '/admin/academico'],
    ['Calificaciones', '/admin/calificaciones'],
    ['Asistencia', '/admin/asistencia'],
    ['Convivencia', '/admin/convivencia'],
    ['Tesorería y pagos', '/admin/tesoreria'],
    ['Comunicados', '/admin/comunicados'],
    ['Usuarios y permisos', '/admin/usuarios'],
    ['Mi perfil', '/admin/perfil']
  ],
  SECRETARIA: [
    ['Panel general', '/admin/dashboard'],
    ['Matrículas', '/admin/matriculas'],
    ['Aulas y horarios', '/admin/academico'],
    ['Calificaciones', '/admin/calificaciones'],
    ['Asistencia', '/admin/asistencia'],
    ['Convivencia', '/admin/convivencia'],
    ['Tesorería y pagos', '/admin/tesoreria'],
    ['Comunicados', '/admin/comunicados'],
    ['Usuarios y permisos', '/admin/usuarios'],
    ['Mi perfil', '/admin/perfil']
  ],
  DOCENTE: [
    ['Calificaciones', '/admin/calificaciones'],
    ['Mi perfil', '/admin/perfil']
  ],
  AUXILIAR: [
    ['Asistencia', '/admin/asistencia'],
    ['Convivencia', '/admin/convivencia'],
    ['Mi perfil', '/admin/perfil']
  ],
  TUTOR: [
    ['Asistencia', '/admin/asistencia'],
    ['Convivencia', '/admin/convivencia'],
    ['Mi perfil', '/admin/perfil']
  ],
  APODERADO: [
    ['Tesorería y pagos', '/admin/tesoreria'],
    ['Comunicados', '/admin/comunicados'],
    ['Mi perfil', '/admin/perfil']
  ]
} as const;

describe('admin menu by role', () => {
  it.each(Object.entries(expectedMenuByRole))('shows the reference menu for %s', (role, expectedItems) => {
    const nuevasRutas = ['/admin/horarios','/admin/refuerzos','/admin/tutoria','/admin/observaciones-conductuales','/admin/portal-apoderado','/admin/suplencias','/admin/aprobacion-suplencias'];
    const actualItems = visibleAdminMenuItems([role]).filter(item => !nuevasRutas.includes(item.route)).map(({ label, route }) => [label, route]);
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
  });
});
