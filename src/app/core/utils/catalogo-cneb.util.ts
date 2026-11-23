import { CalificacionCualitativa, CalificacionResponseDto } from '../models/evaluacion.model';

export interface CompetenciaCnebCatalogoItem {
  areaId: number;
  numeroOrden: number;
  nombre: string;
}

export interface CompetenciaCalificacionItem {
  id: number;
  competenciaId: number;
  numeroOrden: number;
  competenciaNombre: string;
  calificacion: CalificacionCualitativa;
  conclusionDescriptiva: string;
  requiereRefuerzo: boolean;
}

export interface CursoCalificacionGrupo {
  areaKey: string;
  areaId: number;
  areaNombre: string;
  nivelLogroCurso: CalificacionCualitativa;
  conteo: { AD: number; A: number; B: number; C: number };
  competencias: CompetenciaCalificacionItem[];
}

export const AREA_CURRICULAR_POR_ID: Readonly<Record<number, string>> = {
  1: 'Personal Social',
  2: 'Psicomotriz',
  3: 'Comunicación',
  4: 'Castellano como segunda lengua',
  5: 'Matemática',
  6: 'Ciencia y Tecnología',
  7: 'Personal Social',
  8: 'Educación Religiosa',
  9: 'Educación Física',
  10: 'Comunicación',
  11: 'Arte y Cultura',
  12: 'Castellano como segunda lengua',
  13: 'Inglés',
  14: 'Matemática',
  15: 'Ciencia y Tecnología',
  16: 'Desarrollo Personal, Ciudadanía y Cívica',
  17: 'Ciencias Sociales',
  18: 'Educación Religiosa',
  19: 'Educación para el Trabajo',
  20: 'Educación Física',
  21: 'Comunicación',
  22: 'Arte y Cultura',
  23: 'Castellano como segunda lengua',
  24: 'Inglés',
  25: 'Matemática',
  26: 'Ciencia y Tecnología',
  27: 'Tutoría',
  28: 'Tutoría',
  29: 'Taller de Cuentos y títeres',
  30: 'Iniciación Musical',
  31: 'Inglés',
  32: 'Ajedrez',
  33: 'Taller de Robótica educativa',
  34: 'Taller de Redacción y escritura creativa',
  35: 'Taller de Educación financiera',
  36: 'Oratoria',
  37: 'Taller de Programación y desarrollo web'
};

export const COMPETENCIA_CNEB_POR_ID: Readonly<Record<number, CompetenciaCnebCatalogoItem>> = {
  1: { areaId: 1, numeroOrden: 3, nombre: 'Construye identidad como persona humana' },
  2: { areaId: 1, numeroOrden: 2, nombre: 'Convive y participa democráticamente' },
  3: { areaId: 1, numeroOrden: 1, nombre: 'Construye su identidad' },
  4: { areaId: 2, numeroOrden: 1, nombre: 'Se desenvuelve a través de su motricidad' },
  5: { areaId: 3, numeroOrden: 4, nombre: 'Crea proyectos desde los lenguajes del arte' },
  6: { areaId: 3, numeroOrden: 3, nombre: 'Escribe diversos tipos de textos' },
  7: { areaId: 3, numeroOrden: 2, nombre: 'Lee diversos tipos de textos escritos' },
  8: { areaId: 3, numeroOrden: 1, nombre: 'Se comunica oralmente en su lengua materna' },
  9: { areaId: 4, numeroOrden: 1, nombre: 'Se comunica oralmente en castellano' },
  10: { areaId: 5, numeroOrden: 2, nombre: 'Resuelve problemas de forma y localización' },
  11: { areaId: 5, numeroOrden: 1, nombre: 'Resuelve problemas de cantidad' },
  12: { areaId: 6, numeroOrden: 1, nombre: 'Indaga mediante métodos científicos' },
  13: { areaId: 7, numeroOrden: 5, nombre: 'Gestiona responsablemente los recursos económicos' },
  14: { areaId: 7, numeroOrden: 4, nombre: 'Gestiona el ambiente y el espacio' },
  15: { areaId: 7, numeroOrden: 3, nombre: 'Construye interpretaciones históricas' },
  16: { areaId: 7, numeroOrden: 2, nombre: 'Convive y participa democráticamente' },
  17: { areaId: 7, numeroOrden: 1, nombre: 'Construye su identidad' },
  18: { areaId: 8, numeroOrden: 2, nombre: 'Asume experiencias de encuentro con Dios' },
  19: { areaId: 8, numeroOrden: 1, nombre: 'Construye su identidad como persona humana' },
  20: { areaId: 9, numeroOrden: 3, nombre: 'Interactúa mediante habilidades sociomotrices' },
  21: { areaId: 9, numeroOrden: 2, nombre: 'Asume una vida saludable' },
  22: { areaId: 9, numeroOrden: 1, nombre: 'Se desenvuelve a través de su motricidad' },
  23: { areaId: 10, numeroOrden: 3, nombre: 'Escribe diversos tipos de textos' },
  24: { areaId: 10, numeroOrden: 2, nombre: 'Lee diversos tipos de textos escritos' },
  25: { areaId: 10, numeroOrden: 1, nombre: 'Se comunica oralmente en su lengua materna' },
  26: { areaId: 11, numeroOrden: 2, nombre: 'Crea proyectos desde los lenguajes del arte' },
  27: { areaId: 11, numeroOrden: 1, nombre: 'Aprecia manifestaciones artístico-culturales' },
  28: { areaId: 12, numeroOrden: 3, nombre: 'Escribe textos en castellano como segunda lengua' },
  29: { areaId: 12, numeroOrden: 2, nombre: 'Lee textos en castellano como segunda lengua' },
  30: { areaId: 12, numeroOrden: 1, nombre: 'Se comunica oralmente en castellano' },
  31: { areaId: 13, numeroOrden: 3, nombre: 'Escribe diversos tipos de textos en inglés' },
  32: { areaId: 13, numeroOrden: 2, nombre: 'Lee diversos tipos de textos en inglés' },
  33: { areaId: 13, numeroOrden: 1, nombre: 'Se comunica oralmente en inglés' },
  34: { areaId: 14, numeroOrden: 4, nombre: 'Resuelve problemas de gestión de datos' },
  35: { areaId: 14, numeroOrden: 3, nombre: 'Resuelve problemas de forma y localización' },
  36: { areaId: 14, numeroOrden: 2, nombre: 'Resuelve problemas de regularidad y cambio' },
  37: { areaId: 14, numeroOrden: 1, nombre: 'Resuelve problemas de cantidad' },
  38: { areaId: 15, numeroOrden: 3, nombre: 'Diseña y construye soluciones tecnológicas' },
  39: { areaId: 15, numeroOrden: 2, nombre: 'Explica el mundo natural y artificial' },
  40: { areaId: 15, numeroOrden: 1, nombre: 'Indaga mediante métodos científicos' },
  41: { areaId: 16, numeroOrden: 2, nombre: 'Convive y participa democráticamente' },
  42: { areaId: 16, numeroOrden: 1, nombre: 'Construye su identidad' },
  43: { areaId: 17, numeroOrden: 3, nombre: 'Gestiona responsablemente los recursos económicos' },
  44: { areaId: 17, numeroOrden: 2, nombre: 'Gestiona el ambiente y el espacio' },
  45: { areaId: 17, numeroOrden: 1, nombre: 'Construye interpretaciones históricas' },
  46: { areaId: 18, numeroOrden: 2, nombre: 'Asume experiencias de encuentro con Dios' },
  47: { areaId: 18, numeroOrden: 1, nombre: 'Construye su identidad como persona humana' },
  48: { areaId: 19, numeroOrden: 1, nombre: 'Gestiona proyectos de emprendimiento' },
  49: { areaId: 20, numeroOrden: 3, nombre: 'Interactúa mediante habilidades sociomotrices' },
  50: { areaId: 20, numeroOrden: 2, nombre: 'Asume una vida saludable' },
  51: { areaId: 20, numeroOrden: 1, nombre: 'Se desenvuelve a través de su motricidad' },
  52: { areaId: 21, numeroOrden: 3, nombre: 'Escribe diversos tipos de textos' },
  53: { areaId: 21, numeroOrden: 2, nombre: 'Lee diversos tipos de textos escritos' },
  54: { areaId: 21, numeroOrden: 1, nombre: 'Se comunica oralmente en su lengua materna' },
  55: { areaId: 22, numeroOrden: 2, nombre: 'Crea proyectos desde los lenguajes del arte' },
  56: { areaId: 22, numeroOrden: 1, nombre: 'Aprecia manifestaciones artístico-culturales' },
  57: { areaId: 23, numeroOrden: 3, nombre: 'Escribe textos en castellano como segunda lengua' },
  58: { areaId: 23, numeroOrden: 2, nombre: 'Lee textos en castellano como segunda lengua' },
  59: { areaId: 23, numeroOrden: 1, nombre: 'Se comunica oralmente en castellano' },
  60: { areaId: 24, numeroOrden: 3, nombre: 'Escribe diversos tipos de textos en inglés' },
  61: { areaId: 24, numeroOrden: 2, nombre: 'Lee diversos tipos de textos en inglés' },
  62: { areaId: 24, numeroOrden: 1, nombre: 'Se comunica oralmente en inglés' },
  63: { areaId: 25, numeroOrden: 4, nombre: 'Resuelve problemas de gestión de datos' },
  64: { areaId: 25, numeroOrden: 3, nombre: 'Resuelve problemas de forma y localización' },
  65: { areaId: 25, numeroOrden: 2, nombre: 'Resuelve problemas de regularidad y cambio' },
  66: { areaId: 25, numeroOrden: 1, nombre: 'Resuelve problemas de cantidad' },
  67: { areaId: 26, numeroOrden: 3, nombre: 'Diseña y construye soluciones tecnológicas' },
  68: { areaId: 26, numeroOrden: 2, nombre: 'Explica el mundo natural y artificial' },
  69: { areaId: 26, numeroOrden: 1, nombre: 'Indaga mediante métodos científicos' },
  70: { areaId: 29, numeroOrden: 1, nombre: 'Representa relatos breves con títeres' },
  71: { areaId: 30, numeroOrden: 1, nombre: 'Explora ritmos y sonidos con el cuerpo' },
  72: { areaId: 31, numeroOrden: 1, nombre: 'Comprende y usa expresiones breves en inglés' },
  73: { areaId: 32, numeroOrden: 1, nombre: 'Aplica estrategias básicas de ajedrez' },
  74: { areaId: 33, numeroOrden: 1, nombre: 'Construye y prueba prototipos sencillos' },
  75: { areaId: 34, numeroOrden: 1, nombre: 'Planifica, escribe y revisa textos creativos' },
  76: { areaId: 35, numeroOrden: 1, nombre: 'Elabora un presupuesto y compara decisiones' },
  77: { areaId: 36, numeroOrden: 1, nombre: 'Argumenta oralmente con evidencias' },
  78: { areaId: 37, numeroOrden: 1, nombre: 'Desarrolla y prueba un sitio web sencillo' }
};

const PESO_CNEB: Readonly<Record<CalificacionCualitativa, number>> = {
  AD: 4,
  A: 3,
  B: 2,
  C: 1
};

function calcularLogroConsolidado(conteo: { AD: number; A: number; B: number; C: number }): CalificacionCualitativa {
  const total = conteo.AD + conteo.A + conteo.B + conteo.C;
  if (total === 0) return 'B';
  const suma = conteo.AD * PESO_CNEB.AD + conteo.A * PESO_CNEB.A + conteo.B * PESO_CNEB.B + conteo.C * PESO_CNEB.C;
  const promedio = suma / total;
  if (conteo.C > 0 && promedio < 2.5) return 'C';
  if (promedio >= 3.5) return 'AD';
  if (promedio >= 2.5) return 'A';
  if (promedio >= 1.5) return 'B';
  return 'C';
}

/**
 * Agrupa las calificaciones CNEB de un bimestre por área curricular / curso y ordena
 * tanto los cursos alfabéticamente como sus competencias por número de orden.
 */
export function agruparCalificacionesPorCurso(
  notas: readonly CalificacionResponseDto[],
  areasDinamicas: ReadonlyArray<{ id: number; nombre: string }> = [],
  competenciasDinamicas: ReadonlyArray<{ id: number; areaId?: number; numeroOrden?: number; nombre: string }> = []
): CursoCalificacionGrupo[] {
  if (!notas.length) return [];

  const mapaAreas = new Map<number, string>();
  for (const a of areasDinamicas) {
    if (a?.id) mapaAreas.set(a.id, a.nombre);
  }

  const mapaCompetencias = new Map<number, CompetenciaCnebCatalogoItem>();
  for (const c of competenciasDinamicas) {
    if (c?.id) {
      mapaCompetencias.set(c.id, {
        areaId: c.areaId ?? COMPETENCIA_CNEB_POR_ID[c.id]?.areaId ?? 0,
        numeroOrden: c.numeroOrden ?? COMPETENCIA_CNEB_POR_ID[c.id]?.numeroOrden ?? 99,
        nombre: c.nombre
      });
    }
  }

  const grupos = new Map<
    string,
    {
      areaKey: string;
      areaId: number;
      areaNombre: string;
      conteo: { AD: number; A: number; B: number; C: number };
      competencias: CompetenciaCalificacionItem[];
    }
  >();

  for (const n of notas) {
    const compId = n.competenciaId ?? 0;
    const compInfo = mapaCompetencias.get(compId) ?? COMPETENCIA_CNEB_POR_ID[compId];
    const areaId = n.areaCurricularId ?? compInfo?.areaId ?? 0;
    const areaNombre =
      (areaId > 0 ? mapaAreas.get(areaId) ?? AREA_CURRICULAR_POR_ID[areaId] : undefined) ??
      (areaId > 0 ? `Área Curricular #${areaId}` : 'Área Curricular');
    const areaKey = areaId > 0 ? String(areaId) : areaNombre;

    let grupo = grupos.get(areaKey);
    if (!grupo) {
      grupo = {
        areaKey,
        areaId,
        areaNombre,
        conteo: { AD: 0, A: 0, B: 0, C: 0 },
        competencias: []
      };
      grupos.set(areaKey, grupo);
    }

    const calif = n.calificacionCualitativa ?? 'B';
    if (calif in grupo.conteo) {
      grupo.conteo[calif]++;
    }

    grupo.competencias.push({
      id: n.id,
      competenciaId: compId,
      numeroOrden: compInfo?.numeroOrden ?? 99,
      competenciaNombre: compInfo?.nombre ?? (compId > 0 ? `Competencia #${compId}` : 'Competencia evaluada'),
      calificacion: calif,
      conclusionDescriptiva: n.conclusionDescriptiva?.trim() || 'Sin conclusión descriptiva registrada',
      requiereRefuerzo: Boolean(n.requiereRefuerzo || calif === 'C')
    });
  }

  return Array.from(grupos.values())
    .map(g => ({
      areaKey: g.areaKey,
      areaId: g.areaId,
      areaNombre: g.areaNombre,
      nivelLogroCurso: calcularLogroConsolidado(g.conteo),
      conteo: g.conteo,
      competencias: [...g.competencias].sort(
        (a, b) => a.numeroOrden - b.numeroOrden || a.competenciaId - b.competenciaId
      )
    }))
    .sort((a, b) => a.areaNombre.localeCompare(b.areaNombre, 'es'));
}
