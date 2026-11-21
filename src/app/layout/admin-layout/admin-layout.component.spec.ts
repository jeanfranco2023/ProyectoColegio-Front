import { describe, expect, it } from 'vitest';
import { ADMIN_MENU_ITEMS, visibleAdminMenuItems } from './admin-layout.component';
import { ADMIN_ROUTE_ACCESS } from '../../core/authorization/admin-route-access';
import { routes } from '../../app.routes';

const expectedMenuByRole = {
  DIRECCION: [
    ['Panel general', '/admin/dashboard'],
    ['Comunicados', '/admin/comunicados'],
    ['Solicitudes de matrícula', '/admin/solicitudes-matricula'],
    ['Matrículas', '/admin/matriculas'],
    ['Aulas y horarios', '/admin/academico'],
    ['Malla horaria', '/admin/horarios'],
    ['Calificaciones', '/admin/calificaciones'],
    ['Refuerzo académico', '/admin/refuerzos'],
    ['Asistencia', '/admin/asistencia'],
    ['Convivencia', '/admin/convivencia'],
    ['Incidencias y faltas', '/admin/observaciones-conductuales'],
    ['Tesorería y pagos', '/admin/tesoreria'],
    ['Gestión de suplentes', '/admin/aprobacion-suplencias'],
    ['Solicitudes de cambio', '/admin/solicitudes-cambio'],
    ['Usuarios y permisos', '/admin/usuarios'],
    ['Mi perfil', '/admin/perfil']
  ],
  ADMINISTRADOR: [
    ['Panel general', '/admin/dashboard'],
    ['Comunicados', '/admin/comunicados'],
    ['Solicitudes de matrícula', '/admin/solicitudes-matricula'],
    ['Matrículas', '/admin/matriculas'],
    ['Aulas y horarios', '/admin/academico'],
    ['Malla horaria', '/admin/horarios'],
    ['Calificaciones', '/admin/calificaciones'],
    ['Refuerzo académico', '/admin/refuerzos'],
    ['Asistencia', '/admin/asistencia'],
    ['Convivencia', '/admin/convivencia'],
    ['Incidencias y faltas', '/admin/observaciones-conductuales'],
    ['Tesorería y pagos', '/admin/tesoreria'],
    ['Gestión de suplentes', '/admin/aprobacion-suplencias'],
    ['Solicitudes de cambio', '/admin/solicitudes-cambio'],
    ['Usuarios y permisos', '/admin/usuarios'],
    ['Acciones del sistema', '/admin/auditoria'],
    ['Mi perfil', '/admin/perfil']
  ],
  SECRETARIA: [
    ['Panel general', '/admin/dashboard'],
    ['Comunicados', '/admin/comunicados'],
    ['Solicitudes de matrícula', '/admin/solicitudes-matricula'],
    ['Matrículas', '/admin/matriculas'],
    ['Asistencia', '/admin/asistencia'],
    ['Convivencia', '/admin/convivencia'],
    ['Tesorería y pagos', '/admin/tesoreria'],
    ['Mi perfil', '/admin/perfil']
  ],
  DOCENTE: [
    ['Panel general', '/admin/dashboard'],
    ['Malla horaria', '/admin/horarios'],
    ['Calificaciones', '/admin/calificaciones'],
    ['Refuerzo académico', '/admin/refuerzos'],
    ['Asistencia', '/admin/asistencia'],
    ['Mi perfil', '/admin/perfil']
  ],
  AUXILIAR: [
    ['Panel general', '/admin/dashboard'],
    ['Asistencia', '/admin/asistencia'],
    ['Convivencia', '/admin/convivencia'],
    ['Incidencias y faltas', '/admin/observaciones-conductuales'],
    ['Tesorería y pagos', '/admin/tesoreria'],
    ['Mi perfil', '/admin/perfil']
  ],
  TUTOR: [
    ['Panel general', '/admin/dashboard'],
    ['Asistencia', '/admin/asistencia'],
    ['Tutoría y seguimiento', '/admin/tutoria'],
    ['Convivencia', '/admin/convivencia'],
    ['Incidencias y faltas', '/admin/observaciones-conductuales'],
    ['Mi perfil', '/admin/perfil']
  ],
  APODERADO: [
    ['Panel general', '/admin/dashboard'],
    ['Portal familiar', '/admin/portal-apoderado'],
    ['Comunicados', '/admin/comunicados'],
    ['Tesorería y pagos', '/admin/tesoreria'],
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
    expect(secretaria).toContain('/admin/convivencia');
  });

  it('mantiene cada elemento del menú alineado con una ruta y su matriz de permisos', () => {
    const adminRoutes = routes.find(route => route.path === 'admin')!.children!;

    for (const item of ADMIN_MENU_ITEMS) {
      const routePath = item.route.replace('/admin/', '');
      expect(adminRoutes.some(route => route.path === routePath)).toBe(true);
      expect(item.roles).toEqual(ADMIN_ROUTE_ACCESS[routePath as keyof typeof ADMIN_ROUTE_ACCESS]);
    }
  });

  it('combina permisos solo cuando la cuenta tiene varios roles asignados', () => {
    const rolesMixtos = visibleAdminMenuItems(['SECRETARIA', 'DOCENTE']).map(item => item.route);
    expect(rolesMixtos).toContain('/admin/calificaciones');
    expect(visibleAdminMenuItems(['SECRETARIA']).some(item => item.route === '/admin/calificaciones')).toBe(false);
  });

  it('separa Solicitudes de cambio (Dirección y Administrador) de Acciones del sistema (exclusivo de Administrador)', () => {
    const direccionLabels = visibleAdminMenuItems(['DIRECCION']).map(item => item.label);
    expect(direccionLabels).toContain('Solicitudes de cambio');
    expect(direccionLabels).not.toContain('Acciones del sistema');

    const adminLabels = visibleAdminMenuItems(['ADMINISTRADOR']).map(item => item.label);
    expect(adminLabels).toContain('Solicitudes de cambio');
    expect(adminLabels).toContain('Acciones del sistema');
  });
});
