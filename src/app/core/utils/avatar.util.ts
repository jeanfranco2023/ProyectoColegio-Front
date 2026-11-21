/**
 * Sistema de Fotografía y Avatares de Rostro Humano Realista
 * Para estudiantes, docentes, directores, secretarias y apoderados.
 * Soporta carga directa de fotos en base64 con persistencia en localStorage.
 */

const FOTOS_ESTUDIANTES_VARONES = [
  'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=160&h=160&q=80',
  'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=160&h=160&q=80',
  'https://images.unsplash.com/photo-1595454223600-91fb55977a4a?auto=format&fit=crop&w=160&h=160&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=160&h=160&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=160&h=160&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=160&h=160&q=80',
  'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=160&h=160&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=160&h=160&q=80'
];

const FOTOS_ESTUDIANTES_MUJERES = [
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=160&h=160&q=80',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=160&h=160&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&h=160&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&h=160&q=80',
  'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=160&h=160&q=80',
  'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=160&h=160&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=160&h=160&q=80',
  'https://images.unsplash.com/photo-1526080652727-5b778b538713?auto=format&fit=crop&w=160&h=160&q=80'
];

const FOTOS_USUARIOS_HOMBRES = [
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=160&h=160&q=80',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=160&h=160&q=80',
  'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=160&h=160&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=160&h=160&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=160&h=160&q=80'
];

const FOTOS_USUARIOS_MUJERES = [
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=160&h=160&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=160&h=160&q=80',
  'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=160&h=160&q=80',
  'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?auto=format&fit=crop&w=160&h=160&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&h=160&q=80'
];

/** Caché ultra-rápida en memoria para evitar llamadas redundantes a localStorage en ciclos de renderizado */
const cacheFotoEstudiante = new Map<string, string>();
const cacheFotoUsuario = new Map<string, string>();

/**
 * Obtiene la fotografía de rostro para un estudiante.
 * Prioriza imagen cargada manualmente en localStorage y cachea en memoria.
 */
export function obtenerFotoEstudiante(estudiante: {
  id?: number | null;
  genero?: string | null;
  numeroDocumento?: string | null;
  nombres?: string | null;
}): string {
  if (!estudiante) return FOTOS_ESTUDIANTES_VARONES[0];
  
  const idKey = String(estudiante.id || estudiante.numeroDocumento || '0');
  if (cacheFotoEstudiante.has(idKey)) {
    return cacheFotoEstudiante.get(idKey)!;
  }

  const custom = typeof window !== 'undefined' ? localStorage.getItem(`shuji_foto_estudiante_${idKey}`) : null;
  if (custom) {
    cacheFotoEstudiante.set(idKey, custom);
    return custom;
  }

  const idNum = Number(estudiante.id) || (estudiante.numeroDocumento ? Number(estudiante.numeroDocumento.slice(-3)) : 1);
  const esFemenino = estudiante.genero === 'F' || (estudiante.nombres && /(a|ia|na|sa|la)$/i.test(estudiante.nombres.trim()));

  let resultado: string;
  if (esFemenino) {
    const idx = Math.abs(idNum) % FOTOS_ESTUDIANTES_MUJERES.length;
    resultado = FOTOS_ESTUDIANTES_MUJERES[idx];
  } else {
    const idx = Math.abs(idNum) % FOTOS_ESTUDIANTES_VARONES.length;
    resultado = FOTOS_ESTUDIANTES_VARONES[idx];
  }

  cacheFotoEstudiante.set(idKey, resultado);
  return resultado;
}

/**
 * Guarda una fotografía personalizada para el estudiante (base64 Data URL).
 */
export function guardarFotoEstudiante(id: number | string, dataUrl: string): void {
  const idKey = String(id);
  cacheFotoEstudiante.set(idKey, dataUrl);
  if (typeof window !== 'undefined' && id) {
    try {
      localStorage.setItem(`shuji_foto_estudiante_${idKey}`, dataUrl);
    } catch (e) {
      console.warn('No se pudo guardar la foto en localStorage:', e);
    }
  }
}

/**
 * Obtiene la fotografía de rostro para cualquier usuario del sistema (docente, director, etc.).
 */
export function obtenerFotoUsuario(usuario: {
  id?: number | null;
  username?: string | null;
  nombreCompleto?: string | null;
  roles?: Array<{ codigo: string }> | string[] | null;
}): string {
  if (!usuario) return FOTOS_USUARIOS_HOMBRES[0];

  const idKey = String(usuario.id || usuario.username || '0');
  if (cacheFotoUsuario.has(idKey)) {
    return cacheFotoUsuario.get(idKey)!;
  }

  const custom = typeof window !== 'undefined' ? localStorage.getItem(`shuji_foto_usuario_${idKey}`) : null;
  if (custom) {
    cacheFotoUsuario.set(idKey, custom);
    return custom;
  }

  const idNum = Number(usuario.id) || (usuario.username ? usuario.username.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) : 1);
  const esMujer = (usuario.nombreCompleto && /(a|ia|na|sa|la)\b/i.test(usuario.nombreCompleto.split(' ')[0] || '')) ||
                  (usuario.username && /(rosa|ana|maria|carmen|claudia|secretaria)/i.test(usuario.username));

  let resultado: string;
  if (esMujer) {
    const idx = Math.abs(idNum) % FOTOS_USUARIOS_MUJERES.length;
    resultado = FOTOS_USUARIOS_MUJERES[idx];
  } else {
    const idx = Math.abs(idNum) % FOTOS_USUARIOS_HOMBRES.length;
    resultado = FOTOS_USUARIOS_HOMBRES[idx];
  }

  cacheFotoUsuario.set(idKey, resultado);
  return resultado;
}

/**
 * Guarda una fotografía personalizada para un usuario del sistema.
 */
export function guardarFotoUsuario(id: number | string, dataUrl: string): void {
  const idKey = String(id);
  cacheFotoUsuario.set(idKey, dataUrl);
  if (typeof window !== 'undefined' && id) {
    try {
      localStorage.setItem(`shuji_foto_usuario_${idKey}`, dataUrl);
    } catch (e) {
      console.warn('No se pudo guardar la foto en localStorage:', e);
    }
  }
}
