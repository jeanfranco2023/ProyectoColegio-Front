import { describe, expect, it } from 'vitest';
import { crearCasoMatriculaDemo, crearPdfMatriculaDemo, textoPdfMatriculaDemo } from './matricula-demo.util';
import { TipoDocumentoSolicitud } from '../../core/models/matricula-publica.model';

describe('documentos sintéticos de matrícula', () => {
  it('genera identificadores de prueba y PDFs claramente no oficiales', () => {
    const caso = crearCasoMatriculaDemo(1);
    expect(caso.dniEstudiante).toMatch(/^\d{8}$/);
    expect(caso.dniApoderado).toMatch(/^\d{8}$/);
    expect(caso.emailApoderado).toContain('@example.test');
    const quinceCasos = Array.from({ length: 15 }, (_, i) => crearCasoMatriculaDemo(i + 1));
    expect(new Set(quinceCasos.map(item => item.dniEstudiante)).size).toBe(15);
    expect(new Set(quinceCasos.map(item => item.dniApoderado)).size).toBe(5);
    expect(quinceCasos.slice(0, 4).every(item => item.dniApoderado === quinceCasos[0].dniApoderado)).toBe(true);

    const tipos: TipoDocumentoSolicitud[] = [
      'DNI_C4', 'PARTIDA_NACIMIENTO', 'RECIBO_SERVICIO', 'CERTIFICADO_ESTUDIOS'
    ];
    for (const tipo of tipos) {
      const archivo = crearPdfMatriculaDemo(tipo, caso, '5.° de Secundaria');
      const texto = textoPdfMatriculaDemo(tipo, caso, '5.° de Secundaria');
      expect(archivo.type).toBe('application/pdf');
      expect(archivo.size).toBeLessThan(5 * 1024 * 1024);
      expect(texto.startsWith('%PDF-1.4')).toBe(true);
      expect(texto).toContain('FICTICIO - SOLO PRUEBAS');
      expect(texto).toContain('SIN VALIDEZ OFICIAL');
      expect(texto).toContain('Documento creado para pruebas locales');
      const inicioXref = Number(texto.match(/startxref\n(\d+)\n%%EOF$/)?.[1]);
      expect(Number.isFinite(inicioXref) && texto.slice(inicioXref).startsWith('xref\n')).toBe(true);
    }
  });
});
