import { describe, it, expect } from 'vitest';
import {
  sanitizarSoloLetras,
  sanitizarDni,
  sanitizarCelular,
  sanitizarDireccion,
  esNombreValido,
  esDniValido,
  esCelularValido,
  esEmailValido,
  esDireccionValida
} from './validaciones';

describe('validaciones.ts - Sanitización y Validación Universal', () => {
  it('sanitizarSoloLetras debe remover números y símbolos extraños preservando tildes y eñes', () => {
    expect(sanitizarSoloLetras('María 123 José #$')).toBe('María  José ');
    expect(sanitizarSoloLetras('Ángel Nuñez-Peña')).toBe('Ángel Nuñez-Peña');
    expect(sanitizarSoloLetras("O'Higgins 99")).toBe("O'Higgins ");
  });

  it('sanitizarDni debe permitir solo números hasta 8 dígitos', () => {
    expect(sanitizarDni('74839201')).toBe('74839201');
    expect(sanitizarDni('74A83B920199')).toBe('74839201');
    expect(sanitizarDni('abc')).toBe('');
  });

  it('sanitizarCelular debe permitir solo números hasta 9 dígitos', () => {
    expect(sanitizarCelular('987654321')).toBe('987654321');
    expect(sanitizarCelular('987-654-32100')).toBe('987654321');
  });

  it('sanitizarDireccion debe permitir alfanuméricos y signos postales comunes sin símbolos peligrosos', () => {
    expect(sanitizarDireccion('Av. Los Próceres #123, Dpto 4-B / Mz. C Lote 10')).toBe('Av. Los Próceres #123, Dpto 4-B / Mz. C Lote 10');
    expect(sanitizarDireccion('Calle <script>alert(1)</script> 123')).toBe('Calle scriptalert1/script 123');
  });

  it('esNombreValido debe verificar correctamente', () => {
    expect(esNombreValido('Carlos Alberto')).toBe(true);
    expect(esNombreValido('María del Carmen')).toBe(true);
    expect(esNombreValido('Juan123')).toBe(false);
    expect(esNombreValido('')).toBe(false);
  });

  it('esDniValido debe aceptar solo 8 dígitos exactos', () => {
    expect(esDniValido('74839201')).toBe(true);
    expect(esDniValido('7483920')).toBe(false);
    expect(esDniValido('748392011')).toBe(false);
    expect(esDniValido('7483920a')).toBe(false);
  });

  it('esCelularValido debe aceptar solo 9 dígitos exactos', () => {
    expect(esCelularValido('987654321')).toBe(true);
    expect(esCelularValido('98765432')).toBe(false);
  });

  it('esEmailValido debe verificar correos con formato correcto', () => {
    expect(esEmailValido('apoderado@gmail.com')).toBe(true);
    expect(esEmailValido('juan.perez@shuji.edu.pe')).toBe(true);
    expect(esEmailValido('invalido@')).toBe(false);
    expect(esEmailValido('invalido@com')).toBe(false);
    expect(esEmailValido('invalido')).toBe(false);
  });

  it('esDireccionValida debe validar direcciones con caracteres permitidos', () => {
    expect(esDireccionValida('Av. Sol 123, Dpto 201')).toBe(true);
    expect(esDireccionValida('Jr. Ayacucho #456 - Lima')).toBe(true);
    expect(esDireccionValida('Dirección <mala>')).toBe(false);
  });
});
