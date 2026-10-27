export function fechaActualEnPeru(ahora = new Date()): string {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(ahora);
  const valor = (tipo: string) => partes.find(parte => parte.type === tipo)?.value ?? '';
  return `${valor('year')}-${valor('month')}-${valor('day')}`;
}

export function fechaNacimientoValida(fecha: string, ahora = new Date()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
  const fechaParseada = new Date(`${fecha}T00:00:00.000Z`);
  return !Number.isNaN(fechaParseada.getTime())
    && fechaParseada.toISOString().slice(0, 10) === fecha
    && fecha < fechaActualEnPeru(ahora);
}

export function edadAlCorteMatricula(fecha: string, anioLectivo: number): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !Number.isInteger(anioLectivo)) return null;
  const nacimiento = new Date(`${fecha}T00:00:00.000Z`);
  if (Number.isNaN(nacimiento.getTime()) || nacimiento.toISOString().slice(0, 10) !== fecha) return null;
  const [anio, mes] = fecha.split('-').map(Number);
  return anioLectivo - anio - (mes > 3 ? 1 : 0);
}
