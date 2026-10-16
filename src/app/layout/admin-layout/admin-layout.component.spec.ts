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
    const actualItems = visibleAdminMenuItems([role]).map(({ label, route }) => [label, route]);
    expect(actualItems).toEqual(expectedItems);
  });
});
