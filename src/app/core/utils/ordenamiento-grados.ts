/**
 * Utilidades para ordenamiento de grados y secciones escolares.
 *
 * Secuencia solicitada institucionalmente (descendente por nivel):
 * 1. Inicial: 5 años, 4 años, 3 años.
 * 2. Primaria: 6°, 5°, 4°, 3°, 2°, 1°.
 * 3. Secundaria: 5°, 4°, 3°, 2°, 1°.
 */

export function obtenerPesoGradoNombre(nombre: string): number {
  const norm = (nombre || '').toLowerCase().trim();

  // Nivel Inicial: 5 años, 4 años, 3 años
  if (norm.includes('inicial') || norm.includes('año') || norm.includes('ano')) {
    if (norm.includes('5')) return 10;
    if (norm.includes('4')) return 20;
    if (norm.includes('3')) return 30;
    return 35;
  }

  // Nivel Primaria: 6°, 5°, 4°, 3°, 2°, 1°
  if (norm.includes('primaria')) {
    if (norm.includes('6')) return 100;
    if (norm.includes('5')) return 110;
    if (norm.includes('4')) return 120;
    if (norm.includes('3')) return 130;
    if (norm.includes('2')) return 140;
    if (norm.includes('1')) return 150;
    return 160;
  }

  // Nivel Secundaria: 5°, 4°, 3°, 2°, 1°
  if (norm.includes('secundaria')) {
    if (norm.includes('5')) return 200;
    if (norm.includes('4')) return 210;
    if (norm.includes('3')) return 220;
    if (norm.includes('2')) return 230;
    if (norm.includes('1')) return 240;
    return 250;
  }

  return 999;
}

export function compararGradosPorSecuenciaInstitucional(nombreA: string, nombreB: string): number {
  const pesoA = obtenerPesoGradoNombre(nombreA);
  const pesoB = obtenerPesoGradoNombre(nombreB);
  if (pesoA !== pesoB) return pesoA - pesoB;
  return (nombreA || '').localeCompare(nombreB || '');
}
