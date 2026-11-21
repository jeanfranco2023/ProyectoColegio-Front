import type { TipoDocumentoSolicitud } from '../../core/models/matricula-publica.model';

export interface CasoMatriculaDemo {
  numeroCaso: number;
  dniEstudiante: string;
  nombresEstudiante: string;
  apellidoPaternoEstudiante: string;
  apellidoMaternoEstudiante: string;
  generoEstudiante: 'M' | 'F';
  dniApoderado: string;
  nombresApoderado: string;
  apellidoPaternoApoderado: string;
  apellidoMaternoApoderado: string;
  parentesco: 'PADRE' | 'MADRE';
  celularApoderado: string;
  emailApoderado: string;
  direccionApoderado: string;
}

const ALUMNOS = [
  ['Lucía Fernanda', 'Velásquez', 'Paredes', 'F'],
  ['Thiago Mateo', 'Paredes', 'Ruiz', 'M'],
  ['Martina Isabel', 'Paredes', 'Ruiz', 'F'],
  ['Diego Alonso', 'Paredes', 'Ruiz', 'M'],
  ['Mateo Andrés', 'Salazar', 'Núñez', 'M'],
  ['Ana Paula', 'Núñez', 'Salazar', 'F'],
  ['Bruno Javier', 'Núñez', 'Cárdenas', 'M'],
  ['Camila Fernanda', 'Rojas', 'Castro', 'F'],
  ['Renata Sofía', 'Rojas', 'Castro', 'F'],
  ['Nicolás Adrián', 'Mendoza', 'León', 'M'],
  ['Emma Valeria', 'León', 'Mendoza', 'F'],
  ['Gabriel Alonso', 'León', 'Paredes', 'M'],
  ['Daniela Luz', 'León', 'Vargas', 'F'],
  ['Emilia Sofía', 'Cabrera', 'Torres', 'F'],
  ['Samuel Ignacio', 'Cabrera', 'Torres', 'M']
] as const;

const FAMILIAS = [
  ['Mariana Isabel', 'Paredes', 'Ruiz', 'MADRE'],
  ['César Augusto', 'Núñez', 'Cárdenas', 'PADRE'],
  ['Laura Beatriz', 'Castro', 'Rivas', 'MADRE'],
  ['Jorge Alberto', 'León', 'Paredes', 'PADRE'],
  ['Patricia Elena', 'Torres', 'Salas', 'MADRE']
] as const;

export function crearCasoMatriculaDemo(numeroCaso: number): CasoMatriculaDemo {
  const secuencia = ((Math.abs(Math.trunc(numeroCaso)) - 1) % 999_999) + 1;
  const indiceAlumno = (secuencia - 1) % ALUMNOS.length;
  const [nombresEstudiante, apellidoPaternoEstudiante, apellidoMaternoEstudiante, generoEstudiante] = ALUMNOS[indiceAlumno];
  const indiceFamilia = indiceAlumno < 4 ? 0 : indiceAlumno < 7 ? 1 : indiceAlumno < 9 ? 2 : indiceAlumno < 13 ? 3 : 4;
  const loteFamilia = Math.floor((secuencia - 1) / ALUMNOS.length);
  const secuenciaFamilia = ((loteFamilia * FAMILIAS.length + indiceFamilia) % 999_999) + 1;
  const [nombresApoderado, apellidoPaternoApoderado, apellidoMaternoApoderado, parentesco] = FAMILIAS[indiceFamilia];
  const sufijoFamilia = String(secuenciaFamilia).padStart(6, '0');

  return {
    numeroCaso: secuencia,
    dniEstudiante: String(99_000_000 + secuencia),
    nombresEstudiante,
    apellidoPaternoEstudiante,
    apellidoMaternoEstudiante,
    generoEstudiante,
    dniApoderado: String(98_000_000 + secuenciaFamilia),
    nombresApoderado,
    apellidoPaternoApoderado,
    apellidoMaternoApoderado,
    parentesco,
    celularApoderado: `999${sufijoFamilia}`,
    emailApoderado: `familia.prueba.${sufijoFamilia}@example.test`,
    direccionApoderado: `Av. de Prueba ${100 + secuenciaFamilia}, Lima`
  };
}

export function crearPdfMatriculaDemo(
  tipo: TipoDocumentoSolicitud,
  caso: CasoMatriculaDemo,
  grado: string
): File {
  return new File([textoPdfMatriculaDemo(tipo, caso, grado)], `PRUEBA-FICTICIA-${tipo}-${caso.numeroCaso}.pdf`, { type: 'application/pdf' });
}

export function textoPdfMatriculaDemo(
  tipo: TipoDocumentoSolicitud,
  caso: CasoMatriculaDemo,
  grado: string
): string {
  const estudiante = `${caso.nombresEstudiante} ${caso.apellidoPaternoEstudiante} ${caso.apellidoMaternoEstudiante}`;
  const apoderado = `${caso.nombresApoderado} ${caso.apellidoPaternoApoderado} ${caso.apellidoMaternoApoderado}`;
  const progenitor = caso.parentesco === 'MADRE' ? 'Madre' : 'Padre';
  const contenido = contenidoDocumento(tipo, caso, estudiante, apoderado, progenitor, grado);
  const lineas = contenido.flatMap(envolver);
  const operaciones = [
    'BT /F1 18 Tf 0.82 0.05 0.08 rg 42 790 Td (FICTICIO - SOLO PRUEBAS) Tj ET',
    'BT /F1 14 Tf 0.82 0.05 0.08 rg 42 766 Td (SIN VALIDEZ OFICIAL) Tj ET',
    '0.85 G 42 752 m 553 752 l S'
  ];
  let y = 720;
  for (const linea of lineas) {
    operaciones.push(`BT /F1 11 Tf 0 0 0 rg 46 ${y} Td (${escaparPdf(linea)}) Tj ET`);
    y -= 25;
  }
  operaciones.push('BT /F1 14 Tf 0.82 0.05 0.08 rg 42 55 Td (FICTICIO - SIN VALIDEZ OFICIAL) Tj ET');
  const stream = operaciones.join('\n');
  const objetos = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (let i = 0; i < objetos.length; i++) {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${objetos[i]}\nendobj\n`;
  }
  const xref = pdf.length;
  pdf += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;

  return pdf;
}

export function fotoMatriculaDemo(): string {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="200" viewBox="0 0 160 200"><rect width="160" height="200" rx="18" fill="#e9eff7"/><circle cx="80" cy="68" r="30" fill="#9aabc1"/><path d="M28 178c4-36 24-55 52-55s48 19 52 55" fill="#9aabc1"/><text x="80" y="190" text-anchor="middle" font-family="Arial,sans-serif" font-size="13" font-weight="700" fill="#173b67">DEMO</text></svg>';
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function contenidoDocumento(
  tipo: TipoDocumentoSolicitud,
  caso: CasoMatriculaDemo,
  estudiante: string,
  apoderado: string,
  progenitor: string,
  grado: string
): string[] {
  const base = ['Documento creado para pruebas locales. No acredita identidad, domicilio ni estudios.'];
  if (tipo === 'DNI_C4') return [
    'FICHA DE IDENTIDAD SINTETICA (NO ES DNI NI C4)',
    `Nombre completo del estudiante: ${estudiante}`,
    `DNI sintetico de prueba: ${caso.dniEstudiante}`,
    ...base
  ];
  if (tipo === 'PARTIDA_NACIMIENTO') return [
    'REGISTRO DE NACIMIENTO SIMULADO (NO ES ACTA LEGAL)',
    `Nombre completo del estudiante: ${estudiante}`,
    `DNI sintetico del estudiante: ${caso.dniEstudiante}`,
    `${progenitor}: ${apoderado}`,
    `DNI sintetico del ${progenitor.toLowerCase()}: ${caso.dniApoderado}`,
    ...base
  ];
  if (tipo === 'RECIBO_SERVICIO') return [
    'COMPROBANTE DOMICILIARIO DE PRUEBA (NO ES RECIBO)',
    `Titular de prueba: ${apoderado}`,
    `Direccion de prueba: ${caso.direccionApoderado}`,
    ...base
  ];
  return [
    'CONSTANCIA ACADEMICA SIMULADA (NO ACREDITA ESTUDIOS)',
    `Nombre completo del estudiante: ${estudiante}`,
    `Nivel y grado solicitado: ${grado}`,
    ...base
  ];
}

function envolver(texto: string): string[] {
  const plano = texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7e]/g, ' ');
  const palabras = plano.split(/\s+/).filter(Boolean);
  const lineas: string[] = [];
  let linea = '';
  for (const palabra of palabras) {
    if (`${linea} ${palabra}`.trim().length > 76) {
      lineas.push(linea);
      linea = palabra;
    } else {
      linea = `${linea} ${palabra}`.trim();
    }
  }
  if (linea) lineas.push(linea);
  return lineas;
}

function escaparPdf(texto: string): string {
  return texto.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}
