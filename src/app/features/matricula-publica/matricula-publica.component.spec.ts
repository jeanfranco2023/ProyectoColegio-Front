import { describe, expect, it } from 'vitest';
import { signal } from '@angular/core';
import { MatriculaPublicaComponent } from './matricula-publica.component';
import { DocumentoSolicitudDto, TipoDocumentoSolicitud } from '../../core/models/matricula-publica.model';

const tipos: TipoDocumentoSolicitud[] = ['PARTIDA_NACIMIENTO', 'DNI_C4', 'RECIBO_SERVICIO'];
const documentos = (): DocumentoSolicitudDto[] => tipos.map(tipo => ({
  tipo, estado: 'VALIDADO', observacion: null, versionId: 'version', iaValida: true,
  dniApiCoincide: tipo === 'RECIBO_SERVICIO' ? null : true,
  estadoFirma: tipo === 'PARTIDA_NACIMIENTO' ? 'VALIDA' : 'NO_APLICA', detalleFirma: null,
  vinculoParentalCoincide: tipo === 'PARTIDA_NACIMIENTO' ? true : null
}));

function permitePago(datos: DocumentoSolicitudDto[]): boolean {
  const contexto = {documentTypes: tipos, solicitud: () => ({documentos: datos})};
  return MatriculaPublicaComponent.prototype.documentosAprobados.call(contexto as unknown as MatriculaPublicaComponent);
}

describe('Documentos PDF y vínculo parental', () => {
  it('advierte la edad usando los límites recibidos del backend y el año lectivo seleccionado', () => {
    const seccion = {id: 9, anioLectivoId: 2, edadMinimaAlCorte: 6, edadMaximaAlCorte: 8};
    const contexto = {
      nacimientoEstudiante: '2020-04-01', seccionId: () => 9, anioId: () => 2,
      seccionesDisponibles: [seccion], catalogo: () => ({anios: [{id: 2, anio: 2026}]})
    };
    const aviso = Object.getOwnPropertyDescriptor(MatriculaPublicaComponent.prototype, 'advertenciaEdad')!.get!;
    const error = Object.getOwnPropertyDescriptor(MatriculaPublicaComponent.prototype, 'errorEdad')!.get!;
    expect(aviso.call(contexto)).toContain('fuera del rango ordinario (6–8)');
    expect(error.call(contexto)).toBe('');
    contexto.nacimientoEstudiante = '2020-03-31';
    expect(aviso.call(contexto)).toBe('');
    contexto.nacimientoEstudiante = '2018-03-31';
    expect(aviso.call(contexto)).toBe('');
    contexto.nacimientoEstudiante = '2017-03-31';
    expect(aviso.call(contexto)).toContain('fuera del rango ordinario (6–8)');
    Object.assign(seccion, {edadMinimaAlCorte: undefined});
    expect(aviso.call(contexto)).toContain('No se pudo comprobar');
    expect(error.call(contexto)).toContain('No se pudo comprobar');
  });

  it('permite continuar cuando los tres documentos y el vínculo están validados', () => {
    expect(permitePago(documentos())).toBe(true);
  });

  it('bloquea evidencia parental ausente o negativa aunque el estado diga validado', () => {
    for (const vinculo of [null, false]) {
      const datos = documentos(); datos[0].vinculoParentalCoincide = vinculo;
      expect(permitePago(datos)).toBe(false);
    }
  });

  it('bloquea DNI no confirmado y documentos faltantes', () => {
    const datos = documentos(); datos[1].dniApiCoincide = null;
    expect(permitePago(datos)).toBe(false);
    expect(permitePago(documentos().slice(1))).toBe(false);
  });

  it('rechaza imágenes en las tres cargas y descarta un archivo seleccionado previamente', () => {
    for (const tipo of tipos) {
      const archivos: Partial<Record<TipoDocumentoSolicitud, File | null>> = {[tipo]: new File(['viejo'], 'viejo.pdf', {type:'application/pdf'})};
      const error = signal('');
      const input = {files: [new File(['imagen'], 'imagen.jpg', {type:'image/jpeg'})], value:'imagen.jpg'};
      const contexto = {archivos,error};
      MatriculaPublicaComponent.prototype.seleccionarArchivo.call(contexto as unknown as MatriculaPublicaComponent,
        tipo, {target:input} as unknown as Event);
      expect(archivos[tipo]).toBeNull();
      expect(input.value).toBe('');
      expect(error()).toContain('PDF');
    }
  });
});
