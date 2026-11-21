import { describe, it, expect } from 'vitest';
import { obtenerPesoGradoNombre, compararGradosPorSecuenciaInstitucional } from './ordenamiento-grados';

describe('ordenamiento-grados', () => {
  it('ordena grados en la secuencia institucional requerida', () => {
    const grados = [
      '1° de Primaria',
      '3° de Secundaria',
      'Inicial 3 años',
      '5° de Secundaria',
      '6° de Primaria',
      'Inicial 5 años',
      'Inicial 4 años',
      '5° de Primaria',
      '1° de Secundaria'
    ];

    const ordenados = [...grados].sort(compararGradosPorSecuenciaInstitucional);

    expect(ordenados).toEqual([
      'Inicial 5 años',
      'Inicial 4 años',
      'Inicial 3 años',
      '6° de Primaria',
      '5° de Primaria',
      '1° de Primaria',
      '5° de Secundaria',
      '3° de Secundaria',
      '1° de Secundaria'
    ]);
  });
});
