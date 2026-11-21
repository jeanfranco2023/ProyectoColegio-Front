/**
 * Utilidades centralizadas de validación y sanitización en tiempo real
 * para campos de texto, números, documentos, teléfonos, correos y direcciones.
 */

/**
 * Sanitiza una cadena eliminando cualquier número o caracter que no sea letra,
 * espacio, tilde, eñe, diéresis, apóstrofe o guión.
 */
export function sanitizarSoloLetras(valor: string | null | undefined): string {
  if (!valor) return '';
  return valor.normalize('NFC').replace(/[^\p{L} \p{M}'-]/gu, '');
}

/**
 * Sanitiza una cadena de DNI dejando únicamente dígitos numéricos (máximo 8).
 */
export function sanitizarDni(valor: string | null | undefined): string {
  if (!valor) return '';
  return valor.replace(/\D/g, '').slice(0, 8);
}

/**
 * Sanitiza una cadena de celular / teléfono dejando únicamente dígitos numéricos (máximo 9).
 */
export function sanitizarCelular(valor: string | null | undefined): string {
  if (!valor) return '';
  return valor.replace(/\D/g, '').slice(0, 9);
}

/**
 * Sanitiza una cadena de dirección postal eliminando caracteres especiales peligrosos o no estándar,
 * permitiendo letras, números, espacios y signos postales (#, ., ,, -, /, °, º).
 */
export function sanitizarDireccion(valor: string | null | undefined): string {
  if (!valor) return '';
  return valor.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ\s#.,\-°º/]/g, '');
}

/**
 * Valida si un nombre o apellido contiene únicamente letras y espacios válidos.
 */
export function esNombreValido(valor: string | null | undefined): boolean {
  if (!valor) return false;
  const limpio = valor.trim();
  if (!limpio) return false;
  return /^[\p{L}\p{M} '-]+$/u.test(limpio) && /\p{L}/u.test(limpio);
}

/**
 * Valida si un DNI tiene exactamente 8 dígitos numéricos.
 */
export function esDniValido(valor: string | null | undefined): boolean {
  if (!valor) return false;
  return /^\d{8}$/.test(valor.trim());
}

/**
 * Valida si un número telefónico o celular tiene 9 dígitos numéricos.
 */
export function esCelularValido(valor: string | null | undefined): boolean {
  if (!valor) return false;
  return /^\d{9}$/.test(valor.trim());
}

/**
 * Valida si un correo electrónico cumple con el estándar RFC y estructura de dominio.
 */
export function esEmailValido(valor: string | null | undefined): boolean {
  if (!valor) return false;
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(valor.trim());
}

/**
 * Valida si una dirección es alfanumérica y solo contiene signos postales estándar.
 */
export function esDireccionValida(valor: string | null | undefined): boolean {
  if (!valor) return false;
  const limpio = valor.trim();
  if (!limpio) return false;
  return /^[\p{L}0-9\s#.,\-°º/]+$/u.test(limpio);
}
