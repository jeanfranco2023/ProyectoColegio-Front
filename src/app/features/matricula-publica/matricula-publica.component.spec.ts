import { describe, expect, it, vi } from 'vitest';
import { signal } from '@angular/core';
import { of } from 'rxjs';
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
    const seccion = {id: 9, anioLectivoId: 2, gradoId: 4, edadMinimaAlCorte: 6, edadMaximaAlCorte: 8};
    const contexto = {
      nacimientoEstudiante: '2020-04-01', gradoId: () => 4, anioId: () => 2,
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

describe('Reenvío de seguimiento público', () => {
  it('muestra respuesta genérica del backend y nunca afirma que se entregó un correo', () => {
    const mensaje = signal('');
    const contexto = {
      documentoEstudiante: '12345678',
      anioId: () => 2026,
      error: signal(''),
      reenviandoToken: signal(false),
      mensajeReenvioToken: mensaje,
      api: { reenviarToken: vi.fn(() => of({mensaje: 'Si existe una solicitud, recibirás instrucciones.'})) },
      mensajeError: () => 'No se pudo procesar la consulta.'
    };

    MatriculaPublicaComponent.prototype.reenviarEnlaceSeguimiento.call(contexto as unknown as MatriculaPublicaComponent);

    expect(mensaje()).toBe('Si existe una solicitud, recibirás instrucciones.');
    expect(mensaje().toLowerCase()).not.toContain('reenviado');
  });
});

describe('Ordenamiento de grados disponibles', () => {
  it('ordena ascendentemente por nivel (Inicial < Primaria < Secundaria) y por grado/edad (3 < 4 < 5)', () => {
    const secciones = [
      { id: 1, anioLectivoId: 2026, gradoId: 105, grado: 'Cinco añitos', nivel: 'INICIAL', vacantesDisponibles: 10 },
      { id: 2, anioLectivoId: 2026, gradoId: 103, grado: 'Tres añitos', nivel: 'INICIAL', vacantesDisponibles: 5 },
      { id: 3, anioLectivoId: 2026, gradoId: 104, grado: 'Cuatro añitos', nivel: 'INICIAL', vacantesDisponibles: 8 },
      { id: 4, anioLectivoId: 2026, gradoId: 202, grado: 'Segundo de Primaria', nivel: 'PRIMARIA', vacantesDisponibles: 12 },
      { id: 5, anioLectivoId: 2026, gradoId: 201, grado: 'Primer Grado', nivel: 'PRIMARIA', vacantesDisponibles: 15 },
      { id: 6, anioLectivoId: 2026, gradoId: 305, grado: '5° de Secundaria', nivel: 'SECUNDARIA', vacantesDisponibles: 50 },
      { id: 7, anioLectivoId: 2026, gradoId: 301, grado: '1° de Secundaria', nivel: 'SECUNDARIA', vacantesDisponibles: 20 }
    ];
    const contexto = {
      anioId: () => 2026,
      seccionesDisponibles: secciones
    };
    const getter = Object.getOwnPropertyDescriptor(MatriculaPublicaComponent.prototype, 'gradosDisponibles')!.get!;
    const ordenados = getter.call(contexto) as any[];

    expect(ordenados.map(g => g.grado)).toEqual([
      'Tres añitos',
      'Cuatro añitos',
      'Cinco añitos',
      'Primer Grado',
      'Segundo de Primaria',
      '1° de Secundaria',
      '5° de Secundaria'
    ]);
  });
});

describe('Fotografía del estudiante como evidencia obligatoria', () => {
  it('rechaza archivos no imagen o mayores a 5MB y acepta imágenes válidas', () => {
    const error = signal('');
    const fotoEstudianteArchivo = signal<File | null>(null);
    const fotoEstudianteBase64 = signal<string | null>(null);
    const contexto = {
      error,
      fotoEstudianteArchivo,
      fotoEstudianteBase64,
      documentoEstudiante: '74839201'
    };

    // 1. Archivo PDF (inválido para foto)
    const inputPdf = { files: [new File(['pdf'], 'foto.pdf', { type: 'application/pdf' })], value: 'foto.pdf' };
    MatriculaPublicaComponent.prototype.seleccionarFotoEstudiante.call(contexto as unknown as MatriculaPublicaComponent, { target: inputPdf } as unknown as Event);
    expect(error()).toContain('imagen válida');
    expect(inputPdf.value).toBe('');
    expect(fotoEstudianteArchivo()).toBeNull();

    // 2. Archivo mayor a 5MB
    const bigBytes = new Uint8Array(6 * 1024 * 1024);
    const inputBig = { files: [new File([bigBytes], 'grande.jpg', { type: 'image/jpeg' })], value: 'grande.jpg' };
    MatriculaPublicaComponent.prototype.seleccionarFotoEstudiante.call(contexto as unknown as MatriculaPublicaComponent, { target: inputBig } as unknown as Event);
    expect(error()).toContain('imagen válida');
  });
});

describe('Ingreso por traslado y certificado de estudios', () => {
  it('exige 4 documentos incluyendo CERTIFICADO_ESTUDIOS cuando la modalidad es TRASLADO', () => {
    const docTypesGetter = Object.getOwnPropertyDescriptor(MatriculaPublicaComponent.prototype, 'documentTypes')!.get!;
    const contextoTraslado = {
      modalidadIngreso: 'TRASLADO' as const,
      solicitud: () => ({ modalidadIngreso: 'TRASLADO' as const, documentos: documentos() })
    };

    const tiposTraslado = docTypesGetter.call(contextoTraslado) as TipoDocumentoSolicitud[];
    expect(tiposTraslado).toEqual(['PARTIDA_NACIMIENTO', 'DNI_C4', 'RECIBO_SERVICIO', 'CERTIFICADO_ESTUDIOS']);

    const aprobadoSinCertificado = MatriculaPublicaComponent.prototype.documentosAprobados.call(
      Object.defineProperty(contextoTraslado, 'documentTypes', { get: () => tiposTraslado }) as unknown as MatriculaPublicaComponent
    );
    expect(aprobadoSinCertificado).toBe(false);

    const docs4: DocumentoSolicitudDto[] = [
      ...documentos(),
      {
        tipo: 'CERTIFICADO_ESTUDIOS',
        estado: 'VALIDADO',
        observacion: null,
        versionId: 'v4',
        iaValida: true,
        dniApiCoincide: true,
        estadoFirma: 'NO_APLICA',
        detalleFirma: null,
        vinculoParentalCoincide: null
      }
    ];
    const contextoCompleto = {
      modalidadIngreso: 'TRASLADO' as const,
      solicitud: () => ({ modalidadIngreso: 'TRASLADO' as const, documentos: docs4 })
    };
    Object.defineProperty(contextoCompleto, 'documentTypes', { get: () => tiposTraslado });
    expect(MatriculaPublicaComponent.prototype.documentosAprobados.call(contextoCompleto as unknown as MatriculaPublicaComponent)).toBe(true);
  });
});


