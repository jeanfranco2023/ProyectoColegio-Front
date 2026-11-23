import { HttpErrorResponse } from '@angular/common/http';
import { A11yModule } from '@angular/cdk/a11y';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { concatMap, finalize, from, last } from 'rxjs';
import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthStore } from '../../core/state/auth.store';
import { SolicitudCambioService } from '../../core/services/solicitud-cambio.service';
import { UiPaginacionComponent, paginarRegistros } from '../../shared/ui/ui-paginacion.component';
import {
  ESTADO_SOLICITUD_LABELS,
  EstadoSolicitudCambio,
  GestionarSolicitudCambioRequestDto,
  MODULOS_SOLICITUD_CAMBIO,
  SolicitudCambioDto
} from '../../core/models/solicitud-cambio.model';

interface PlantillaSolicitudCambio {
  readonly id: string;
  readonly modulo: string;
  readonly etiqueta: string;
  readonly titulo: string;
  readonly motivoProblema: string;
  readonly resultadoEsperado: string;
  readonly alcanceImpacto: string;
  readonly evidenciaInicial: string;
}

const PLANTILLAS_SOLICITUD: readonly PlantillaSolicitudCambio[] = [
  // Matrículas
  {
    id: 'mat-vacantes',
    modulo: 'Matrículas',
    etiqueta: 'Ampliar o redistribuir vacantes por sección',
    titulo: 'Ampliación excepcional de vacantes en sección activa',
    motivoProblema: 'La demanda de matrícula y traslados superó el cupo base asignado para el grado vigente.',
    resultadoEsperado: 'Permitir el ajuste controlado de vacantes disponibles y reflejar el nuevo aforo en matrícula.',
    alcanceImpacto: 'Grado y secciones activas del periodo lectivo 2026.',
    evidenciaInicial: 'Acta de Dirección Académica 2026'
  },
  {
    id: 'mat-traslado',
    modulo: 'Matrículas',
    etiqueta: 'Ajustar flujo de alumno trasladado y requisitos',
    titulo: 'Actualización de requisitos y estado para alumnos por traslado',
    motivoProblema: 'Los expedientes ingresados por traslado requieren validación diferenciada de constancia y notas previas.',
    resultadoEsperado: 'Registrar correctamente el historial de traslado y habilitar los controles documentales correspondientes.',
    alcanceImpacto: 'Submódulo de matrículas, admisión y padrón estudiantil.',
    evidenciaInicial: 'Resolución Directoral de Matrícula 2026'
  },
  {
    id: 'mat-padron',
    modulo: 'Matrículas',
    etiqueta: 'Añadir columnas o filtros en padrón de matrícula',
    titulo: 'Incorporar filtros operativos adicionales en el padrón de matrículas',
    motivoProblema: 'La consulta diaria del padrón requiere segmentación inmediata por situación de matrícula y año lectivo.',
    resultadoEsperado: 'Visualizar filtros directos por modalidad, estado y año escolar con exportación consistente.',
    alcanceImpacto: 'Dirección, Secretaría Académica y reportes de matrícula.',
    evidenciaInicial: 'Informe interno de Secretaría Académica'
  },
  // Solicitudes de matrícula
  {
    id: 'solmat-obs',
    modulo: 'Solicitudes de matrícula',
    etiqueta: 'Simplificar observación y subsanación documental',
    titulo: 'Optimización de observaciones rápidas por documento adjunto',
    motivoProblema: 'El registro repetitivo de observaciones por documento retrasa la atención en ventanilla y mesa de partes.',
    resultadoEsperado: 'Contar con motivos predefinidos por tipo de documento y envío directo de subsanación.',
    alcanceImpacto: 'Bandeja de solicitudes de matrícula y Portal Familiar.',
    evidenciaInicial: 'Oficio de mejora de atención al apoderado'
  },
  {
    id: 'solmat-edad',
    modulo: 'Solicitudes de matrícula',
    etiqueta: 'Parametrizar excepción de edad según norma MINEDU',
    titulo: 'Ajuste de criterios para autorización excepcional de edad',
    motivoProblema: 'Se requiere estandarizar los sustentos permitidos al aprobar solicitudes con excepción cronológica.',
    resultadoEsperado: 'Disponer de causales oficiales predefinidas al momento de registrar la autorización.',
    alcanceImpacto: 'Nivel Inicial y 1.er grado de Primaria.',
    evidenciaInicial: 'Directiva normativa MINEDU vigente'
  },
  {
    id: 'solmat-asignacion',
    modulo: 'Solicitudes de matrícula',
    etiqueta: 'Priorizar asignación automática de sección con vacantes',
    titulo: 'Mejora en sugerencia de sección al aprobar solicitud de admisión',
    motivoProblema: 'La selección manual de aula requiere validar simultáneamente el aforo disponible por turno.',
    resultadoEsperado: 'Mostrar únicamente secciones con vacantes libres ordenadas por menor carga estudiantil.',
    alcanceImpacto: 'Dirección y Secretaría durante proceso de admisión.',
    evidenciaInicial: 'Reporte operativo de admisión 2026'
  },
  // Aulas y horarios
  {
    id: 'aulas-aforo',
    modulo: 'Aulas y horarios',
    etiqueta: 'Actualizar aforo o turno de aula asignada',
    titulo: 'Modificación de capacidad operativa y turno de aulas',
    motivoProblema: 'La redistribución física de ambientes requiere actualizar el aforo máximo sin afectar sesiones vigentes.',
    resultadoEsperado: 'Reflejar el nuevo aforo habilitado y alertar solo si supera la capacidad física real.',
    alcanceImpacto: 'Aulas de Primaria y Secundaria del local principal.',
    evidenciaInicial: 'Plano de distribución de ambientes 2026'
  },
  {
    id: 'aulas-bloque',
    modulo: 'Aulas y horarios',
    etiqueta: 'Ajustar franja horaria de bloque lectivo',
    titulo: 'Reconfiguración de franja horaria de recreo o bloque lectivo',
    motivoProblema: 'El horario institucional requiere ajustar la duración de bloques para actividades pedagógicas.',
    resultadoEsperado: 'Actualizar las franjas base sin generar traslapes en las sesiones programadas.',
    alcanceImpacto: 'Malla y horarios de turno mañana y tarde.',
    evidenciaInicial: 'Resolución Directoral de Calendarización 2026'
  },
  {
    id: 'aulas-tutor',
    modulo: 'Aulas y horarios',
    etiqueta: 'Reasignar tutor de sección en periodo activo',
    titulo: 'Cambio administrativo de docente tutor en sección asignada',
    motivoProblema: 'Por licencia o rotación docente es necesario trasladar la tutoría oficial de una sección.',
    resultadoEsperado: 'Actualizar el tutor responsable y preservar el historial académico y de convivencia.',
    alcanceImpacto: 'Sección afectada, módulo de tutoría y boletas.',
    evidenciaInicial: 'Memorando de asignación docente'
  },
  // Malla horaria
  {
    id: 'malla-carga',
    modulo: 'Malla horaria',
    etiqueta: 'Ajustar horas semanales de área curricular',
    titulo: 'Actualización de horas pedagógicas semanales en malla curricular',
    motivoProblema: 'La planificación anual requiere adecuar las horas asignadas a talleres y áreas prioritarias.',
    resultadoEsperado: 'Recalcular la carga horaria semanal disponible y validar tope por docente.',
    alcanceImpacto: 'Plan de estudios vigente del nivel educativo.',
    evidenciaInicial: 'Proyecto Curricular Institucional (PCI)'
  },
  {
    id: 'malla-taller',
    modulo: 'Malla horaria',
    etiqueta: 'Habilitar nuevo curso o taller extracurricular',
    titulo: 'Registro de nuevo taller formativo dentro de la malla horaria',
    motivoProblema: 'Se incorpora un nuevo taller institucional que requiere programación horaria y evaluación CNEB.',
    resultadoEsperado: 'Listar el nuevo curso en malla horaria, registro de notas y libreta escolar.',
    alcanceImpacto: 'Nivel Secundaria y registro de calificaciones.',
    evidenciaInicial: 'Acta de Consejo Académico 2026'
  },
  {
    id: 'malla-cruce',
    modulo: 'Malla horaria',
    etiqueta: 'Revisar regla de detección de cruces docentes',
    titulo: 'Refinamiento de validación de cruces de horario docente',
    motivoProblema: 'Se requiere diferenciar talleres compartidos o co-docencia en la regla de validación de cruces.',
    resultadoEsperado: 'Permitir bloques co-dictados autorizados sin falsos bloqueos de guardado.',
    alcanceImpacto: 'Malla horaria y asignación docente.',
    evidenciaInicial: 'Solicitud de Coordinación Académica'
  },
  // Refuerzo académico
  {
    id: 'ref-auto',
    modulo: 'Refuerzo académico',
    etiqueta: 'Ajustar criterio de derivación automática por nota C',
    titulo: 'Optimización de derivación automática a refuerzo académico',
    motivoProblema: 'Los estudiantes con calificación C requieren asignación inmediata sin pasos manuales intermedios.',
    resultadoEsperado: 'Generar automáticamente el plan de refuerzo al registrar calificación en inicio (C).',
    alcanceImpacto: 'Estudiantes con calificación C en bimestre vigente.',
    evidenciaInicial: 'Lineamiento institucional de acompañamiento'
  },
  {
    id: 'ref-seguimiento',
    modulo: 'Refuerzo académico',
    etiqueta: 'Agregar indicador de avance o sesiones cumplidas',
    titulo: 'Incorporar seguimiento de sesiones y cierre en refuerzo académico',
    motivoProblema: 'Coordinación necesita visualizar cuántas sesiones de nivelación completó cada estudiante.',
    resultadoEsperado: 'Mostrar conteo de sesiones y estado de superación por competencia evaluada.',
    alcanceImpacto: 'Docentes de área, tutores y Dirección.',
    evidenciaInicial: 'Informe de Coordinación de Tutoría'
  },
  {
    id: 'ref-reporte',
    modulo: 'Refuerzo académico',
    etiqueta: 'Exportar padrón consolidado de alumnos en refuerzo',
    titulo: 'Reporte consolidado de estudiantes derivados a refuerzo',
    motivoProblema: 'Se necesita consolidar en un reporte único los cursos críticos por grado y sección.',
    resultadoEsperado: 'Permitir descarga rápida de listado filtrado por bimestre, grado y área.',
    alcanceImpacto: 'Dirección y Coordinación Académica.',
    evidenciaInicial: 'Acta de jornada pedagógica'
  },
  // Calificaciones
  {
    id: 'cal-cierre',
    modulo: 'Calificaciones',
    etiqueta: 'Ampliar ventana de registro o corrección de notas',
    titulo: 'Ampliación extraordinaria de ventana de registro de calificaciones',
    motivoProblema: 'Docentes con evaluación de recuperación pendiente requieren reapertura temporal del bimestre.',
    resultadoEsperado: 'Habilitar el registro y recálculo controlado de notas dentro del plazo autorizado.',
    alcanceImpacto: 'Bimestre activo y actas de evaluación.',
    evidenciaInicial: 'Memorando de Dirección Académica'
  },
  {
    id: 'cal-libreta',
    modulo: 'Calificaciones',
    etiqueta: 'Ajustar formato o campos de libreta oficial CNEB',
    titulo: 'Mejora de presentación y agrupación en libreta oficial PDF',
    motivoProblema: 'Se requiere presentar competencias agrupadas limpiamente por área curricular en el PDF oficial.',
    resultadoEsperado: 'Emitir la libreta escolar con cabecera oficial, tabla por áreas y resumen por bimestre.',
    alcanceImpacto: 'Módulo de calificaciones y Portal Familiar.',
    evidenciaInicial: 'Modelo oficial de Informe de Progreso CNEB'
  },
  {
    id: 'cal-rectifica',
    modulo: 'Calificaciones',
    etiqueta: 'Registrar rectificación excepcional de nota cerrada',
    titulo: 'Autorización de rectificación de calificación en periodo cerrado',
    motivoProblema: 'Se detectó error material de transcripción luego del cierre regular del bimestre.',
    resultadoEsperado: 'Habilitar actualización auditada manteniendo trazabilidad del usuario y motivo.',
    alcanceImpacto: 'Expediente del estudiante e historial de notas.',
    evidenciaInicial: 'Solicitud documentada del docente de área'
  },
  // Asistencia
  {
    id: 'asist-justifica',
    modulo: 'Asistencia',
    etiqueta: 'Ampliar catálogo o plazo de justificación de faltas',
    titulo: 'Actualización de plazo y causales de justificación de inasistencias',
    motivoProblema: 'Los apoderados requieren plazo ampliado cuando presentan certificado médico posterior.',
    resultadoEsperado: 'Permitir registrar justificación documentada dentro de los 5 días hábiles posteriores.',
    alcanceImpacto: 'Registro diario de asistencia y portal familiar.',
    evidenciaInicial: 'Reglamento Interno 2026 - Art. Asistencia'
  },
  {
    id: 'asist-biom',
    modulo: 'Asistencia',
    etiqueta: 'Ajustar tolerancia horaria en importación biométrica',
    titulo: 'Ajuste de minutos de tolerancia para marcación biométrica de ingreso',
    motivoProblema: 'Por horario de invierno se requiere ampliar la tolerancia antes de marcar tardanza automática.',
    resultadoEsperado: 'Aplicar la nueva tolerancia institucional al procesar las marcas de ingreso.',
    alcanceImpacto: 'Todos los niveles en turno mañana.',
    evidenciaInicial: 'Comunicado institucional de horario de invierno'
  },
  {
    id: 'asist-alerta',
    modulo: 'Asistencia',
    etiqueta: 'Ajustar umbral de alerta por inasistencias reiteradas',
    titulo: 'Calibración de alertas preventivas por inasistencias acumuladas',
    motivoProblema: 'Tutoría requiere detectar oportunamente estudiantes con faltas consecutivas en la semana.',
    resultadoEsperado: 'Resaltar casos críticos en el resumen de asistencia desde 3 faltas injustificadas.',
    alcanceImpacto: 'Módulo de asistencia, tutores y convivencia.',
    evidenciaInicial: 'Plan de retención estudiantil 2026'
  },
  // Convivencia
  {
    id: 'conv-tipif',
    modulo: 'Convivencia',
    etiqueta: 'Actualizar tipificación de incidencias o medidas',
    titulo: 'Actualización de categorías y protocolos de incidencias escolares',
    motivoProblema: 'Es necesario alinear los tipos de incidencia con los lineamientos actualizados de convivencia.',
    resultadoEsperado: 'Disponer de categorías estandarizadas y medidas formativas sugeridas en el registro.',
    alcanceImpacto: 'Comité de Tutoría y Convivencia Escolar.',
    evidenciaInicial: 'DS 004-2018-MINEDU y protocolos vigentes'
  },
  {
    id: 'conv-citacion',
    modulo: 'Convivencia',
    etiqueta: 'Automatizar seguimiento de citaciones a apoderados',
    titulo: 'Mejora de trazabilidad en citaciones y compromisos familiares',
    motivoProblema: 'Se necesita registrar asistencia del apoderado y acuerdos firmados directamente en la ficha.',
    resultadoEsperado: 'Visualizar estado de citación y vencimiento de compromisos desde el historial.',
    alcanceImpacto: 'Convivencia, Psicología y Dirección.',
    evidenciaInicial: 'Acta del Comité de Convivencia Escolar'
  },
  {
    id: 'conv-deriv',
    modulo: 'Convivencia',
    etiqueta: 'Integrar constancia de derivación externa',
    titulo: 'Campo estructurado para derivación externa (DEMUNA / SíseVe)',
    motivoProblema: 'Los casos graves requieren dejar constancia ordenada del código de reporte externo.',
    resultadoEsperado: 'Registrar código de seguimiento y fecha de reporte sin alterar la confidencialidad.',
    alcanceImpacto: 'Dirección y responsable de convivencia.',
    evidenciaInicial: 'Protocolo SíseVe vigente'
  },
  // Tesorería y pagos
  {
    id: 'tes-mora',
    modulo: 'Tesorería y pagos',
    etiqueta: 'Ajustar calendario de vencimiento o exoneración de mora',
    titulo: 'Actualización de reglas de vencimiento y exoneración en pensiones',
    motivoProblema: 'Casos autorizados por Dirección requieren aplicar exoneración parcial o prórroga documentada.',
    resultadoEsperado: 'Permitir ajuste auditado del recargo manteniendo integridad contable de la deuda.',
    alcanceImpacto: 'Cuentas por cobrar de familias y reportes de caja.',
    evidenciaInicial: 'Resolución Administrativa de Tesorería 2026'
  },
  {
    id: 'tes-concepto',
    modulo: 'Tesorería y pagos',
    etiqueta: 'Habilitar o ajustar concepto de cobro institucional',
    titulo: 'Configuración de nuevo concepto de pago o derecho académico',
    motivoProblema: 'Se requiere habilitar un concepto específico para trámites o talleres con tarifa diferenciada.',
    resultadoEsperado: 'Listar el concepto habilitado en caja y portal de pagos con comprobante correcto.',
    alcanceImpacto: 'Tesorería, Secretaría y Portal Familiar.',
    evidenciaInicial: 'Tarifario institucional aprobado 2026'
  },
  {
    id: 'tes-comprobante',
    modulo: 'Tesorería y pagos',
    etiqueta: 'Corregir detalle impreso en comprobante o reporte',
    titulo: 'Actualización de formato y glosa de comprobantes de tesorería',
    motivoProblema: 'Se solicita incluir el grado, sección y periodo facturado en el detalle del comprobante.',
    resultadoEsperado: 'Emitir comprobantes y reportes diarios con el desglose completo por alumno.',
    alcanceImpacto: 'Comprobantes de pago y cierre diario de caja.',
    evidenciaInicial: 'Observación de auditoría contable interna'
  },
  // Comunicados
  {
    id: 'com-plantilla',
    modulo: 'Comunicados',
    etiqueta: 'Agregar plantilla institucional de comunicado rápido',
    titulo: 'Incorporación de plantillas estandarizadas de comunicados oficiales',
    motivoProblema: 'Dirección emite avisos recurrentes de citación, suspensión y cronogramas que toman tiempo redactar.',
    resultadoEsperado: 'Contar con plantillas predefinidas con asunto, cuerpo y segmentación automática.',
    alcanceImpacto: 'Dirección, Coordinación y destinatarios familiares.',
    evidenciaInicial: 'Manual de comunicación institucional'
  },
  {
    id: 'com-segm',
    modulo: 'Comunicados',
    etiqueta: 'Mejorar segmentación de destinatarios por aula o deuda',
    titulo: 'Segmentación granular de comunicados por nivel, grado o sección',
    motivoProblema: 'Algunos avisos pedagógicos aplican solo a secciones específicas y no a todo el nivel.',
    resultadoEsperado: 'Permitir seleccionar una o múltiples secciones antes de publicar el comunicado.',
    alcanceImpacto: 'Emisión de comunicados y notificaciones familiares.',
    evidenciaInicial: 'Solicitud de Coordinación Académica'
  },
  {
    id: 'com-lectura',
    modulo: 'Comunicados',
    etiqueta: 'Reportar confirmación de lectura por apoderado',
    titulo: 'Panel de control de confirmación de lectura de comunicados',
    motivoProblema: 'Dirección necesita verificar qué familias han leído los comunicados urgentes enviados.',
    resultadoEsperado: 'Mostrar porcentaje y listado de acuse de lectura por grado y sección.',
    alcanceImpacto: 'Comunicados oficiales y Portal Familiar.',
    evidenciaInicial: 'Plan de comunicación familia-escuela 2026'
  },
  // Usuarios y permisos
  {
    id: 'usr-perm',
    modulo: 'Usuarios y permisos',
    etiqueta: 'Ajustar alcance de permisos por rol operativo',
    titulo: 'Revisión de matriz de permisos para rol operativo específico',
    motivoProblema: 'Se requiere habilitar o restringir acciones puntuales según funciones vigentes del personal.',
    resultadoEsperado: 'Aplicar el ajuste en rutas frontend y autorización backend con registro de auditoría.',
    alcanceImpacto: 'Control de accesos y seguridad institucional.',
    evidenciaInicial: 'Manual de Organización y Funciones (MOF) 2026'
  },
  {
    id: 'usr-alta',
    modulo: 'Usuarios y permisos',
    etiqueta: 'Agilizar alta masiva o activación de cuentas docentes',
    titulo: 'Simplificación de provisión y activación de credenciales de personal',
    motivoProblema: 'La incorporación de nuevos docentes en mitad de ciclo demanda alta rápida con rol validado.',
    resultadoEsperado: 'Crear usuarios con asignación inmediata de rol y correo institucional verificable.',
    alcanceImpacto: 'Administración de usuarios y accesos.',
    evidenciaInicial: 'Nómina de contratación docente 2026'
  },
  {
    id: 'usr-clave',
    modulo: 'Usuarios y permisos',
    etiqueta: 'Ajustar política de restablecimiento de acceso',
    titulo: 'Optimización de soporte de restablecimiento y desbloqueo de cuentas',
    motivoProblema: 'Apoderados y docentes bloqueados requieren recuperación guiada sin intervención técnica.',
    resultadoEsperado: 'Permitir desbloqueo y restablecimiento seguro desde administración con auditoría.',
    alcanceImpacto: 'Portal institucional y cuentas familiares.',
    evidenciaInicial: 'Reporte de mesa de ayuda interna'
  },
  // Portal familiar
  {
    id: 'fam-pago',
    modulo: 'Portal familiar',
    etiqueta: 'Mejorar visibilidad de cronograma de pagos en portal',
    titulo: 'Claridad de estados de cuenta y constancias en Portal Familiar',
    motivoProblema: 'Los apoderados consultan por el detalle de cuotas vencidas y constancias descargables.',
    resultadoEsperado: 'Mostrar resumen claro por mes, estado de pago y botón directo de descarga de recibo.',
    alcanceImpacto: 'Apoderados activos en Portal Familiar.',
    evidenciaInicial: 'Encuesta de satisfacción familiar 2026'
  },
  {
    id: 'fam-libreta',
    modulo: 'Portal familiar',
    etiqueta: 'Habilitar descarga directa de libreta por bimestre',
    titulo: 'Acceso directo de apoderados a boleta bimestral en Portal Familiar',
    motivoProblema: 'Las familias solicitan descargar su informe de progreso apenas concluye el cierre del bimestre.',
    resultadoEsperado: 'Publicar automáticamente la libreta oficial para apoderados al habilitarse el periodo.',
    alcanceImpacto: 'Portal Familiar y módulo de calificaciones.',
    evidenciaInicial: 'Acuerdo de reunión de padres de familia'
  },
  {
    id: 'fam-suplencia',
    modulo: 'Portal familiar',
    etiqueta: 'Simplificar registro de recojo autorizado o suplencia',
    titulo: 'Mejora de flujo de autorización de recojo por terceros',
    motivoProblema: 'Los padres requieren registrar autorizaciones temporales desde móvil con menos pasos.',
    resultadoEsperado: 'Agilizar el selector de parentesco, vigencia y documento del autorizado.',
    alcanceImpacto: 'Portal Familiar y control de salida escolar.',
    evidenciaInicial: 'Protocolo de seguridad de salida estudiantil'
  }
];

const OPCIONES_ALCANCE_RAPIDO: readonly string[] = [
  'Todos los niveles y secciones del año lectivo 2026',
  'Solo nivel Primaria (1.° a 6.° grado)',
  'Solo nivel Secundaria (1.° a 5.° año)',
  'Estudiantes con situación de traslado o admisión pendiente',
  'Estudiantes derivados a refuerzo académico (nota C)',
  'Dirección General, Secretaría Académica y Coordinación',
  'Tesorería, caja institucional y Portal Familiar',
  'Docentes de área, tutores y control de asistencia'
];

const OPCIONES_SUSTENTO_RAPIDO: readonly string[] = [
  'Resolución Directoral Institucional 2026',
  'Acta de Consejo Académico / Dirección',
  'Memorando de Secretaría Académica',
  'Directiva normativa MINEDU / SIAGIE vigente',
  'Reporte operativo interno de incidencias',
  'Acta de Tesorería y Administración'
];

const OPCIONES_RESPUESTA_DIRECCION: readonly string[] = [
  'Confirmado por Dirección: aplicar el ajuste a partir del periodo lectivo 2026 vigente.',
  'Se precisa que el cambio aplica a todas las secciones activas de Primaria y Secundaria.',
  'Se adjunta el sustento directivo y se autoriza proceder con la implementación técnica.',
  'Validado con Secretaría Académica: mantener compatibilidad con los expedientes históricos.'
];

const OPCIONES_ANEXO_DIRECCION: readonly string[] = [
  'Acta de Dirección Académica N.° 2026-01',
  'Resolución Directoral vigente',
  'Memorando interno de Secretaría Académica',
  'Captura y sustento operativo adjunto en ficha'
];

const OPCIONES_IMPACTO_ADMIN: readonly string[] = [
  'Impacto bajo · Ajuste puntual de interfaz o validaciones sin cambio de esquema',
  'Impacto medio · Ajuste de lógica de negocio en backend y actualización de vista Angular',
  'Impacto alto · Migración controlada de base de datos, backend y múltiples vistas',
  'Impacto operativo · Cambio de configuración o parámetros sin despliegue estructural'
];

const OPCIONES_RESPONSABLE_ADMIN: readonly string[] = [
  'Equipo Técnico Institucional',
  'Administrador del Sistema',
  'Soporte y Desarrollo Frontend/Backend',
  'Coordinación TI Shuji Kitamura'
];

const OPCIONES_APROBADOR_ADMIN: readonly string[] = [
  'Dirección General / Comité Técnico',
  'Dirección Académica',
  'Comité de Control de Cambios',
  'Administración Central'
];

const OPCIONES_MOTIVO_DECISION_ADMIN: readonly string[] = [
  'Aprobado por alineamiento operativo y mejora directa en tiempos de gestión.',
  'Aprobado con prioridad institucional para el periodo académico vigente.',
  'Requiere precisión de alcance o documento normativo por parte de Dirección.',
  'No viable en el ciclo actual por conflicto con normativa o dependencia externa.'
];

const OPCIONES_RESUMEN_CAMBIO_ADMIN: readonly string[] = [
  'Se implementaron selectores rápidos y botones de 1 clic respetando el flujo vigente.',
  'Parámetros actualizados y lógica de negocio ajustada según requerimiento aprobado.',
  'Corrección aplicada en componente visual, validaciones de formulario y endpoints.',
  'Regla operativa parametrizada sin afectar registros históricos existentes.'
];

const OPCIONES_PLAN_REVERSION_ADMIN: readonly string[] = [
  'Revertir commit del cambio y restaurar versión anterior del servicio sin pérdida de datos.',
  'Deshabilitar ajuste mediante parámetro de configuración anterior y limpiar caché.',
  'Restaurar respaldo previo de tabla involucrada y redesplegar artefacto estable.'
];

const OPCIONES_PRUEBA_ADMIN: readonly string[] = [
  'OK · Verificado flujo completo en entorno local y pruebas automatizadas sin errores',
  'OK · Validada creación, transición y persistencia en base de datos',
  'OK · Probado con rol Dirección y Administrador en navegador sin regresiones'
];

const OPCIONES_RESULTADO_PRUEBA_ADMIN: readonly string[] = [
  'Aprobado · 100% conforme',
  'OK · Sin errores ni regresiones',
  'Validado en preproducción y producción'
];

const OPCIONES_CIERRE_ADMIN: readonly string[] = [
  'Conformidad verificada en módulo operativo; ticket cerrado satisfactoriamente.',
  'Validado con solicitante en ambiente activo sin observaciones pendientes.',
  'Cierre administrativo formal completado con trazabilidad e historial íntegro.'
];

const OPCIONES_COMENTARIO_ADMIN: readonly string[] = [
  'Se inicia evaluación técnica y funcional del requerimiento registrado.',
  'Por favor precisar qué grados, secciones o periodo específico abarca el ajuste.',
  'Cambio aprobado e implementado. Ya se encuentra disponible para validación de Dirección.',
  'Solicitud atendida y cerrada conforme tras verificar funcionamiento en el sistema.'
];

const TRANSICIONES_ADMIN: Record<EstadoSolicitudCambio, readonly EstadoSolicitudCambio[]> = {
  RECIBIDA: ['EN_EVALUACION'],
  EN_EVALUACION: ['REQUIERE_INFORMACION', 'APROBADA', 'RECHAZADA'],
  REQUIERE_INFORMACION: ['RECHAZADA'],
  APROBADA: ['EN_EJECUCION'],
  RECHAZADA: [],
  EN_EJECUCION: ['RESUELTA'],
  RESUELTA: ['CERRADA'],
  CERRADA: []
};

@Component({
  selector: 'app-solicitudes-cambio',
  standalone: true,
  imports: [A11yModule, CommonModule, FormsModule, UiPaginacionComponent],
  template: `
    <section class="space-y-6 text-slate-900">
      <header class="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#1E3A8A]/40 bg-gradient-to-r from-[#0A192F] via-[#0F294D] to-[#173B67] p-6 text-white shadow-md">
        <div>
          <span class="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[.14em] text-sky-100">
            {{ esAdministrador() ? 'Gobierno técnico y trazabilidad de cambios' : 'Gestión directiva institucional' }}
          </span>
          <h1 class="mt-2 mb-0 font-sans text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            {{ esAdministrador() ? 'Solicitudes de cambio' : 'Mis solicitudes de cambio' }}
          </h1>
          <p class="mt-1.5 mb-0 text-sm text-slate-200">
            @if (esAdministrador()) {
              Bandeja integral de evaluación, autorización, implementación técnica y notificación institucional de tickets CH-xxx.
            } @else {
              Emisión formal de requerimientos de cambio al sistema con revisión previa, seguimiento de estado y respuesta a aclaraciones.
            }
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <span class="rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-bold text-white" data-testid="solicitudes-contador">
            {{ solicitudesFiltradas().length }} solicitudes
          </span>
          @if (puedeSolicitar()) {
            <button
              type="button"
              (click)="iniciarNuevaSolicitud()"
              class="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-[#0F294D] shadow-sm transition hover:bg-slate-100 cursor-pointer"
            >
              <svg class="size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 5v14m-7-7h14" />
              </svg>
              <span>Nueva solicitud</span>
            </button>
          }
          <button
            type="button"
            (click)="cargarSolicitudes()" [disabled]="cargandoListado() || operandoFicha()"
            class="min-h-11 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20 cursor-pointer"
          >
            Actualizar
          </button>
        </div>
      </header>

      @if (mensajeExito()) {
        <div role="status" class="rounded-xl border border-[#74A388] bg-[#E4F2E8] p-4 text-sm font-medium text-[#1D5E3C]">
          {{ mensajeExito() }}
        </div>
      }
      @if (errorMensaje() && !mostrarFormularioNueva()) {
        <div role="alert" class="rounded-xl border border-[#C77A72] bg-[#FCE8E6] p-4 text-sm font-medium text-[#83231D]">
          {{ errorMensaje() }}
        </div>
      }

      <!-- Confirmación tras crear una solicitud -->
      @if (confirmacionReciente(); as confirmada) {
        <div
          role="region"
          aria-label="Confirmación de solicitud registrada"
          class="rounded-2xl border-2 border-[#74A388] bg-white p-5 shadow-sm"
        >
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p class="text-xs font-bold uppercase tracking-wider text-[#1D5E3C]">Solicitud registrada con éxito</p>
              <h2 class="mt-1 text-xl font-bold text-[#20354E]">
                Código {{ confirmada.codigo }} · {{ confirmada.titulo }}
              </h2>
              <p class="mt-1 text-xs text-[#526579]">
                Fecha: {{ confirmada.fechaSolicitud | date:'dd/MM/yyyy HH:mm' }} · Estado inicial:
                <strong class="text-[#173B67]">{{ etiquetaEstado(confirmada.estado) }}</strong> · Solicitante: {{ confirmada.solicitanteEmail }}
              </p>
            </div>
            <div class="flex gap-2">
              <button
                type="button"
                (click)="abrirFicha(confirmada); confirmacionReciente.set(null)"
                class="min-h-11 rounded-lg bg-[#173B67] px-4 py-2 text-xs font-semibold text-white hover:bg-[#20354E]"
              >
                Ir a la ficha {{ confirmada.codigo }}
              </button>
              <button
                type="button"
                (click)="confirmacionReciente.set(null)"
                class="min-h-11 rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-xs font-semibold text-[#526579] hover:bg-[#F8FAFC]"
              >
                Cerrar aviso
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Modal flotante Nueva solicitud en 2 pasos (1. Datos, 2. Revisión final check-answers) -->
      @if (puedeSolicitar() && mostrarFormularioNueva()) {
        <div
          class="fixed inset-0 z-[2200] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-xs sm:p-5"
          (click)="cancelarNuevaSolicitud()"
          (keydown.escape)="cancelarNuevaSolicitud()"
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Formulario de nueva solicitud de cambio"
            cdkTrapFocus
            (click)="$event.stopPropagation()"
            class="shuji-modal-3d-enter flex max-h-[min(92dvh,860px)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <!-- Cabecera del modal con indicador visual de pasos -->
            <header class="shrink-0 border-b border-slate-200 bg-gradient-to-r from-[#173B67] via-[#1d4b82] to-[#245996] px-6 py-5 text-white">
              <div class="flex items-start justify-between gap-4">
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-amber-200">
                      Paso {{ pasoNuevaSolicitud() }} de 2 · {{ pasoNuevaSolicitud() === 1 ? 'Datos y autocompletado' : 'Revisión y confirmación' }}
                    </span>
                  </div>
                  <h2 class="m-0 mt-1.5 font-display text-xl font-bold text-white sm:text-2xl">
                    {{ pasoNuevaSolicitud() === 1 ? 'Registrar nueva solicitud de cambio' : 'Verifique los datos antes de confirmar el envío' }}
                  </h2>
                  <p class="m-0 mt-1 text-xs text-slate-200 sm:text-sm">
                    {{ pasoNuevaSolicitud() === 1
                      ? 'Usa una plantilla del módulo o redacta los detalles técnicos de tu requerimiento.'
                      : 'Confirma el alcance y el correo institucional de notificación antes de emitir el ticket.' }}
                  </p>
                </div>
                <button
                  type="button"
                  (click)="cancelarNuevaSolicitud()"
                  aria-label="Cerrar formulario de nueva solicitud"
                  class="grid size-10 shrink-0 place-items-center rounded-xl border border-white/20 bg-white/10 text-base font-bold text-white transition hover:bg-white/20 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <!-- Indicador visual de pasos -->
              <div class="mt-4 flex flex-wrap items-center gap-2 text-xs">
                <span
                  class="inline-flex items-center gap-2 rounded-full px-3 py-1 font-bold transition"
                  [class]="pasoNuevaSolicitud() === 1 ? 'bg-white text-[#173B67] shadow-xs' : 'bg-emerald-400/25 text-emerald-100'"
                >
                  <span class="grid size-5 place-items-center rounded-full text-[11px] font-extrabold"
                    [class]="pasoNuevaSolicitud() === 1 ? 'bg-[#173B67] text-white' : 'bg-emerald-400 text-slate-900'">1</span>
                  Datos y autocompletado
                </span>
                <span class="text-white/50" aria-hidden="true">→</span>
                <span
                  class="inline-flex items-center gap-2 rounded-full px-3 py-1 font-bold transition"
                  [class]="pasoNuevaSolicitud() === 2 ? 'bg-white text-[#173B67] shadow-xs' : 'bg-white/10 text-slate-200'"
                >
                  <span class="grid size-5 place-items-center rounded-full text-[11px] font-extrabold"
                    [class]="pasoNuevaSolicitud() === 2 ? 'bg-[#173B67] text-white' : 'bg-white/20 text-white'">2</span>
                  Revisión y envío
                </span>
              </div>
            </header>

            <!-- Cuerpo desplazable del modal -->
            <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-slate-50/75 p-5 space-y-5 sm:p-6">
              @if (errorMensaje()) {
                <div role="alert" class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800 shadow-2xs">
                  {{ errorMensaje() }}
                </div>
              }

              @if (pasoNuevaSolicitud() === 1) {
                <!-- Tarjeta 1: Completado rápido con plantillas -->
                <div class="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/95 via-teal-50/50 to-white p-5 shadow-xs space-y-4">
                  <div class="flex flex-wrap items-start justify-between gap-3">
                    <div class="flex items-start gap-3">
                      <span class="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-600 text-white shadow-xs" aria-hidden="true">
                        <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </span>
                      <div>
                        <p class="m-0 text-xs font-extrabold uppercase tracking-wider text-emerald-900">
                          Completado rápido (sin escribir)
                        </p>
                        <p class="m-0 mt-0.5 text-xs text-slate-600">
                          Elige un módulo y una plantilla o toca un chip rápido para rellenar asunto, motivo, resultado y sustento.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <label class="grid min-w-0 gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-700" for="sc-modulo">
                      1. Módulo del sistema *
                      <select
                        id="sc-modulo"
                        [ngModel]="formNueva.modulo"
                        (ngModelChange)="alCambiarModuloNueva($event)"
                        class="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-800 shadow-2xs transition focus:border-[#173B67] focus:outline-none focus:ring-2 focus:ring-[#173B67]/15"
                      >
                        @for (mod of modulos; track mod) {
                          <option [value]="mod">{{ mod }}</option>
                        }
                      </select>
                    </label>
                    <label class="grid min-w-0 gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-700" for="sc-plantilla-rapida">
                      2. Solicitud frecuente (autocompleta todo)
                      <select
                        id="sc-plantilla-rapida"
                        [ngModel]="plantillaSeleccionada()"
                        (ngModelChange)="seleccionarPlantillaRapida($event)"
                        data-testid="select-plantilla-rapida"
                        class="min-h-11 w-full rounded-xl border border-emerald-400/70 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 shadow-2xs transition focus:border-[#173B67] focus:outline-none focus:ring-2 focus:ring-[#173B67]/15"
                      >
                        <option value="">-- Elegir plantilla para autocompletar --</option>
                        @for (tpl of plantillasDelModulo(); track tpl.id) {
                          <option [value]="tpl.id">{{ tpl.etiqueta }}</option>
                        }
                        <optgroup label="Otras plantillas frecuentes">
                          @for (tpl of todasLasPlantillas; track tpl.id) {
                            @if (tpl.modulo !== formNueva.modulo) {
                              <option [value]="tpl.id">{{ tpl.modulo }} · {{ tpl.etiqueta }}</option>
                            }
                          }
                        </optgroup>
                      </select>
                    </label>
                  </div>

                  <div class="flex flex-wrap gap-2 pt-1">
                    @for (tpl of plantillasDelModulo(); track tpl.id) {
                      <button
                        type="button"
                        (click)="seleccionarPlantillaRapida(tpl.id)"
                        [class]="plantillaSeleccionada() === tpl.id
                          ? 'inline-flex items-center gap-1.5 rounded-full border border-[#173B67] bg-[#173B67] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs cursor-pointer transition'
                          : 'inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-[#173B67] hover:bg-emerald-50 cursor-pointer transition'"
                      >
                        @if (plantillaSeleccionada() === tpl.id) {
                          <span aria-hidden="true">✓</span>
                        }
                        <span>{{ tpl.etiqueta }}</span>
                      </button>
                    }
                  </div>
                </div>

                <!-- Tarjeta 2: Campos detallados de la solicitud -->
                <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-5">
                  <div class="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <span class="h-5 w-1 rounded-full bg-[#0F294D]" aria-hidden="true"></span>
                    <h3 class="m-0 font-display text-base font-bold text-[#173B67]">Detalle del requerimiento</h3>
                  </div>

                  <div>
                    <label class="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-700" for="sc-titulo">
                      Título o asunto del cambio *
                    </label>
                    <input
                      id="sc-titulo"
                      type="text"
                      [(ngModel)]="formNueva.titulo"
                      placeholder="Seleccione una plantilla arriba o escriba un asunto breve..."
                      class="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 placeholder:font-normal placeholder:text-slate-400 transition focus:border-[#173B67] focus:outline-none focus:ring-2 focus:ring-[#173B67]/15"
                    />
                  </div>

                  <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div class="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-2.5">
                      <div class="flex flex-wrap items-center justify-between gap-2">
                        <label class="text-xs font-bold uppercase tracking-wide text-slate-700" for="sc-motivo">
                          Problema o motivo *
                        </label>
                        <select
                          aria-label="Seleccionar motivo frecuente"
                          (change)="aplicarMotivoPlantilla($event)"
                          class="max-w-[210px] rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#173B67] focus:border-[#173B67] focus:outline-none"
                        >
                          <option value="">Elegir motivo rápido...</option>
                          @for (tpl of plantillasDelModulo(); track tpl.id) {
                            <option [value]="tpl.motivoProblema">{{ tpl.etiqueta }}</option>
                          }
                        </select>
                      </div>
                      <textarea
                        id="sc-motivo"
                        rows="3"
                        [(ngModel)]="formNueva.motivoProblema"
                        placeholder="Describa la situación actual o seleccione un motivo rápido..."
                        class="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 transition focus:border-[#173B67] focus:outline-none focus:ring-2 focus:ring-[#173B67]/15"
                      ></textarea>
                    </div>

                    <div class="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-2.5">
                      <div class="flex flex-wrap items-center justify-between gap-2">
                        <label class="text-xs font-bold uppercase tracking-wide text-slate-700" for="sc-esperado">
                          Resultado esperado *
                        </label>
                        <select
                          aria-label="Seleccionar resultado frecuente"
                          (change)="aplicarResultadoPlantilla($event)"
                          class="max-w-[210px] rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#173B67] focus:border-[#173B67] focus:outline-none"
                        >
                          <option value="">Elegir resultado rápido...</option>
                          @for (tpl of plantillasDelModulo(); track tpl.id) {
                            <option [value]="tpl.resultadoEsperado">{{ tpl.etiqueta }}</option>
                          }
                        </select>
                      </div>
                      <textarea
                        id="sc-esperado"
                        rows="3"
                        [(ngModel)]="formNueva.resultadoEsperado"
                        placeholder="Indique el ajuste esperado o seleccione una opción rápida..."
                        class="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 transition focus:border-[#173B67] focus:outline-none focus:ring-2 focus:ring-[#173B67]/15"
                      ></textarea>
                    </div>

                    <div class="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-2.5">
                      <div class="flex flex-wrap items-center justify-between gap-2">
                        <label class="text-xs font-bold uppercase tracking-wide text-slate-700" for="sc-alcance">
                          Alcance o impacto (opcional)
                        </label>
                        <select
                          aria-label="Seleccionar alcance rápido"
                          (change)="aplicarCampoNuevaSelect('alcanceImpacto', $event)"
                          class="max-w-[210px] rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#173B67] focus:border-[#173B67] focus:outline-none"
                        >
                          <option value="">Elegir alcance...</option>
                          @for (opc of opcionesAlcanceRapido; track opc) {
                            <option [value]="opc">{{ opc }}</option>
                          }
                        </select>
                      </div>
                      <textarea
                        id="sc-alcance"
                        maxlength="4000"
                        rows="2"
                        [(ngModel)]="formNueva.alcanceImpacto"
                        placeholder="Seleccione un alcance arriba o detalle aulas/niveles..."
                        class="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 transition focus:border-[#173B67] focus:outline-none focus:ring-2 focus:ring-[#173B67]/15"
                      ></textarea>
                    </div>

                    <div class="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-2.5">
                      <div class="flex flex-wrap items-center justify-between gap-2">
                        <label class="text-xs font-bold uppercase tracking-wide text-slate-700" for="sc-evidencia">
                          Evidencia o sustento (opcional)
                        </label>
                        <select
                          aria-label="Seleccionar documento de sustento"
                          (change)="aplicarCampoNuevaSelect('evidenciaInicial', $event)"
                          class="max-w-[210px] rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#173B67] focus:border-[#173B67] focus:outline-none"
                        >
                          <option value="">Elegir sustento...</option>
                          @for (opc of opcionesSustentoRapido; track opc) {
                            <option [value]="opc">{{ opc }}</option>
                          }
                        </select>
                      </div>
                      <input
                        id="sc-evidencia"
                        maxlength="2000"
                        type="text"
                        [(ngModel)]="formNueva.evidenciaInicial"
                        placeholder="Ej. Resolución Directoral N.º 018-2026 o seleccione arriba"
                        class="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 transition focus:border-[#173B67] focus:outline-none focus:ring-2 focus:ring-[#173B67]/15"
                      />
                    </div>
                  </div>
                </div>
              } @else {
                <!-- Paso 2: Revisión final (Check-answers) -->
                <div class="space-y-4">
                  <div class="rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-50 to-white p-4 shadow-2xs">
                    <p class="m-0 text-xs font-extrabold uppercase tracking-wider text-[#173B67]">
                      Cuenta autenticada que emite la solicitud
                    </p>
                    <p class="m-0 mt-1 text-base font-bold text-slate-900">
                      {{ identidadSolicitanteActual().nombre }} ({{ identidadSolicitanteActual().username }})
                    </p>
                    <p class="m-0 mt-0.5 text-xs text-slate-600" data-testid="check-answers-email">
                      Correo institucional de notificación: <strong>{{ identidadSolicitanteActual().email }}</strong>
                    </p>
                  </div>

                  <dl class="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white text-sm shadow-xs">
                    <div class="grid grid-cols-1 gap-2 p-4 sm:grid-cols-3">
                      <dt class="text-xs font-bold uppercase tracking-wide text-slate-500">Título del cambio</dt>
                      <dd class="m-0 font-bold text-slate-900 sm:col-span-2">{{ formNueva.titulo }}</dd>
                    </div>
                    <div class="grid grid-cols-1 gap-2 p-4 sm:grid-cols-3">
                      <dt class="text-xs font-bold uppercase tracking-wide text-slate-500">Módulo afectado</dt>
                      <dd class="m-0 font-semibold text-[#173B67] sm:col-span-2">{{ formNueva.modulo }}</dd>
                    </div>
                    <div class="grid grid-cols-1 gap-2 p-4 sm:grid-cols-3">
                      <dt class="text-xs font-bold uppercase tracking-wide text-slate-500">Problema o motivo</dt>
                      <dd class="m-0 whitespace-pre-line text-slate-800 sm:col-span-2">{{ formNueva.motivoProblema }}</dd>
                    </div>
                    <div class="grid grid-cols-1 gap-2 p-4 sm:grid-cols-3">
                      <dt class="text-xs font-bold uppercase tracking-wide text-slate-500">Resultado esperado</dt>
                      <dd class="m-0 whitespace-pre-line text-slate-800 sm:col-span-2">{{ formNueva.resultadoEsperado }}</dd>
                    </div>
                    <div class="grid grid-cols-1 gap-2 p-4 sm:grid-cols-3">
                      <dt class="text-xs font-bold uppercase tracking-wide text-slate-500">Alcance o impacto conocido</dt>
                      <dd class="m-0 whitespace-pre-line text-slate-700 sm:col-span-2">{{ formNueva.alcanceImpacto || 'No especificado' }}</dd>
                    </div>
                    <div class="grid grid-cols-1 gap-2 p-4 sm:grid-cols-3">
                      <dt class="text-xs font-bold uppercase tracking-wide text-slate-500">Evidencia opcional</dt>
                      <dd class="m-0 text-slate-700 sm:col-span-2">{{ formNueva.evidenciaInicial || 'Sin adjunto adicional' }}</dd>
                    </div>
                  </dl>
                </div>
              }
            </div>

            <!-- Pie fijo del modal -->
            <footer class="shrink-0 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-6 py-4">
              @if (pasoNuevaSolicitud() === 1) {
                <button
                  type="button"
                  (click)="cancelarNuevaSolicitud()"
                  class="min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <div class="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    (click)="avanzarARevision()"
                    class="min-h-11 rounded-xl border border-[#173B67] bg-white px-5 py-2 text-sm font-bold text-[#173B67] transition hover:bg-slate-50 cursor-pointer"
                  >
                    Revisar resumen
                  </button>
                  <button
                    type="button"
                    (click)="emitirSolicitudDirecta()"
                    [disabled]="enviandoSolicitud()"
                    data-testid="btn-emitir-directo"
                    class="min-h-11 rounded-xl bg-[#173B67] px-5 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[#20354E] disabled:opacity-60 cursor-pointer"
                  >
                    {{ enviandoSolicitud() ? 'Emitiendo...' : 'Emitir solicitud ahora (1 clic)' }}
                  </button>
                </div>
              } @else {
                <button
                  type="button"
                  (click)="pasoNuevaSolicitud.set(1)"
                  [disabled]="enviandoSolicitud()"
                  class="min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 cursor-pointer"
                >
                  Volver y editar datos
                </button>
                <button
                  type="button"
                  (click)="confirmarEnvioSolicitud()"
                  [disabled]="enviandoSolicitud()"
                  data-testid="btn-confirmar-solicitud"
                  class="min-h-11 rounded-xl bg-[#173B67] px-6 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[#20354E] disabled:opacity-50 cursor-pointer"
                >
                  {{ enviandoSolicitud() ? 'Registrando solicitud…' : 'Confirmar y emitir solicitud' }}
                </button>
              }
            </footer>
          </section>
        </div>
      }

      <!-- Resumen rápido por estado (1 clic para filtrar) -->
      @if (solicitudes().length) {
        <div class="flex flex-wrap items-center gap-2" aria-label="Resumen rápido por estado">
          <button
            type="button"
            (click)="aplicarFiltroRapidoEstado('')"
            [class.bg-[#173B67]]="filtroEstado() === ''"
            [class.text-white]="filtroEstado() === ''"
            [class.border-[#173B67]]="filtroEstado() === ''"
            [class.bg-white]="filtroEstado() !== ''"
            [class.text-[#20354E]]="filtroEstado() !== ''"
            class="rounded-full border border-[#E2E8F0] px-3.5 py-1.5 text-xs font-semibold shadow-xs transition-colors hover:border-[#173B67]"
          >
            Todas ({{ solicitudes().length }})
          </button>
          @for (item of conteoPorEstado(); track item.estado) {
            @if (item.cantidad > 0) {
              <button
                type="button"
                (click)="aplicarFiltroRapidoEstado(item.estado)"
                [class.bg-[#173B67]]="filtroEstado() === item.estado"
                [class.text-white]="filtroEstado() === item.estado"
                [class.border-[#173B67]]="filtroEstado() === item.estado"
                [class.bg-white]="filtroEstado() !== item.estado"
                [class.text-[#20354E]]="filtroEstado() !== item.estado"
                class="rounded-full border border-[#E2E8F0] px-3 py-1.5 text-xs font-semibold shadow-xs transition-colors hover:border-[#173B67]"
              >
                {{ item.etiqueta }} ({{ item.cantidad }})
              </button>
            }
          }
        </div>
      }

      <!-- Barra de filtros -->
      <div class="rounded-xl border border-[#E2E8F0] bg-white p-4" aria-label="Filtros de solicitudes de cambio">
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label class="mb-1 block text-xs font-semibold text-[#526579]" for="filtro-sc-estado">Estado</label>
            <select
              id="filtro-sc-estado"
              [ngModel]="filtroEstado()"
              (ngModelChange)="filtroEstado.set($event)"
              aria-label="Filtrar por estado"
              class="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs text-[#20354E]"
            >
              <option value="">Todos los estados</option>
              @for (est of estadosDisponibles; track est) {
                <option [value]="est">{{ etiquetaEstado(est) }}</option>
              }
            </select>
          </div>
          <div>
            <label class="mb-1 block text-xs font-semibold text-[#526579]" for="filtro-sc-modulo">Módulo</label>
            <select
              id="filtro-sc-modulo"
              [ngModel]="filtroModulo()"
              (ngModelChange)="filtroModulo.set($event)"
              aria-label="Filtrar por módulo"
              class="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs text-[#20354E]"
            >
              <option value="">Todos los módulos</option>
              @for (mod of modulos; track mod) {
                <option [value]="mod">{{ mod }}</option>
              }
            </select>
          </div>
          <div>
            <label class="mb-1 block text-xs font-semibold text-[#526579]" for="filtro-sc-responsable">Responsable o código</label>
            <input
              id="filtro-sc-responsable"
              type="text"
              [ngModel]="filtroResponsable()"
              (ngModelChange)="filtroResponsable.set($event)"
              placeholder="Ej. CH-026 o admin.sistema"
              aria-label="Responsable o código"
              class="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs text-[#20354E]"
            />
          </div>
          <div>
            <label class="mb-1 block text-xs font-semibold text-[#526579]" for="filtro-sc-fecha">Fecha (AAAA-MM-DD)</label>
            <input
              id="filtro-sc-fecha"
              type="date"
              [ngModel]="filtroFecha()"
              (ngModelChange)="filtroFecha.set($event)"
              aria-label="Filtrar por fecha"
              class="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs text-[#20354E]"
            />
          </div>
        </div>
        <div class="mt-3 flex flex-wrap items-center justify-between gap-2">
          <span class="text-xs text-[#526579]">
            Mostrando {{ solicitudesFiltradas().length }} de {{ solicitudes().length }} solicitudes registradas
          </span>
          <button
            type="button"
            (click)="limpiarFiltros()"
            class="rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-semibold text-[#526579] hover:bg-[#F8FAFC]"
          >
            Limpiar filtros
          </button>
        </div>
      </div>

      <!-- Bandeja + Ficha detallada -->
      <div class="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div
          class="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-sm"
          [class.xl:col-span-6]="!!solicitudSeleccionada()"
          [class.xl:col-span-12]="!solicitudSeleccionada()"
        >
          <div class="overflow-x-auto">
            <table class="w-full min-w-[820px] border-collapse text-left text-sm" data-mobile-table-cards>
              <thead class="bg-[#F1F5F9] text-[11px] font-bold uppercase tracking-wider text-[#173B67]">
                <tr>
                  <th class="px-4 py-3.5 whitespace-nowrap">Código</th>
                  <th class="min-w-[220px] px-4 py-3.5 whitespace-nowrap">Asunto / Módulo</th>
                  @if (esAdministrador()) {
                    <th class="px-4 py-3.5 whitespace-nowrap">Solicitante</th>
                  }
                  <th class="px-4 py-3.5 whitespace-nowrap">Prioridad</th>
                  <th class="px-4 py-3.5 whitespace-nowrap">Estado</th>
                  <th class="px-4 py-3.5 whitespace-nowrap">Responsable</th>
                  <th class="px-4 py-3.5 text-right whitespace-nowrap">Acción</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#E2E8F0]">
                @for (item of solicitudesPaginadas(); track item.id) {
                  <tr
                    class="align-middle transition-colors hover:bg-[#F8FAFC] cursor-pointer"
                    [class.bg-[#F1F5F9]]="solicitudSeleccionada()?.id === item.id"
                    (click)="abrirFicha(item)"
                  >
                    <td data-label="Código" class="whitespace-nowrap px-4 py-3.5 font-mono font-bold text-[#173B67]">
                      {{ item.codigo }}
                      <div class="mt-0.5 font-sans text-[11px] font-normal text-[#526579]">
                        {{ item.fechaSolicitud | date:'dd/MM/yyyy' }}
                      </div>
                    </td>
                    <td data-label="Asunto / Módulo" class="min-w-[220px] px-4 py-3.5">
                      <div class="font-semibold text-[#20354E] leading-snug">{{ item.titulo }}</div>
                      <div class="mt-0.5 text-xs text-[#526579]">{{ item.modulo }}</div>
                    </td>
                    @if (esAdministrador()) {
                      <td data-label="Solicitante" class="px-4 py-3.5 text-xs whitespace-nowrap">
                        <div class="font-semibold text-[#20354E]">{{ item.solicitanteNombre }}</div>
                        <div class="text-[#526579]">{{ item.solicitanteEmail }}</div>
                      </td>
                    }
                    <td data-label="Prioridad" class="whitespace-nowrap px-4 py-3.5">
                      <span class="inline-flex rounded bg-[#F8FAFC] px-2.5 py-1 text-xs font-bold text-[#20354E] whitespace-nowrap">
                        {{ item.prioridad }}
                      </span>
                    </td>
                    <td data-label="Estado" class="whitespace-nowrap px-4 py-3.5">
                      <span
                        class="inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold"
                        [class.bg-[#FFF2D8]]="item.estado === 'REQUIERE_INFORMACION' || item.estado === 'EN_EVALUACION'"
                        [class.text-[#744F0A]]="item.estado === 'REQUIERE_INFORMACION' || item.estado === 'EN_EVALUACION'"
                        [class.bg-[#E4F2E8]]="item.estado === 'APROBADA' || item.estado === 'RESUELTA' || item.estado === 'CERRADA'"
                        [class.text-[#1D5E3C]]="item.estado === 'APROBADA' || item.estado === 'RESUELTA' || item.estado === 'CERRADA'"
                        [class.bg-[#FCE8E6]]="item.estado === 'RECHAZADA'"
                        [class.text-[#83231D]]="item.estado === 'RECHAZADA'"
                        [class.bg-[#E8F2F8]]="item.estado === 'RECIBIDA' || item.estado === 'EN_EJECUCION'"
                        [class.text-[#1C4D70]]="item.estado === 'RECIBIDA' || item.estado === 'EN_EJECUCION'"
                      >
                        {{ etiquetaEstado(item.estado) }}
                      </span>
                    </td>
                    <td data-label="Responsable" class="whitespace-nowrap px-4 py-3.5 text-xs text-[#526579]">
                      {{ item.responsableNombre || 'Por asignar' }}
                    </td>
                    <td data-label="Acción" class="whitespace-nowrap px-4 py-3.5 text-right">
                      <button
                        type="button"
                        (click)="abrirFicha(item); $event.stopPropagation()"
                        class="inline-flex min-h-9 items-center rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-[#173B67] hover:bg-[#F8FAFC] cursor-pointer"
                      >
                        Abrir ficha
                      </button>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td [attr.colspan]="esAdministrador() ? 7 : 6" class="px-4 py-12 text-center text-[#526579]">
                      {{ cargandoListado() ? 'Cargando solicitudes…' : errorMensaje() ? 'No se pudo mostrar la bandeja.' : 'No se encontraron solicitudes de cambio con los criterios seleccionados.' }}
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <ui-paginacion
            [totalRegistros]="solicitudesFiltradas().length"
            [paginaActual]="paginaActual()"
            [tamanoPagina]="10"
            etiqueta="solicitudes"
            ariaLabel="Paginación de solicitudes de cambio"
            (cambioPagina)="paginaActual.set($event)"
          />
        </div>

        @if (cargandoFicha()) { <p class="xl:col-span-6" role="status">Cargando ficha…</p> }
        <!-- Ficha detallada -->
        @if (solicitudSeleccionada(); as ficha) {
          <aside
            aria-label="Ficha detallada de solicitud de cambio"
            class="space-y-5 rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm xl:col-span-6"
          >
            <div class="flex flex-wrap items-start justify-between gap-3 border-b border-[#E2E8F0] pb-4">
              <div>
                <div class="flex items-center gap-2">
                  <span class="font-mono text-xs font-bold uppercase tracking-wider text-[#0F294D]">{{ ficha.codigo }}</span>
                  <span class="rounded-full bg-[#F1F5F9] px-2.5 py-0.5 text-xs font-bold text-[#173B67]">
                    {{ etiquetaEstado(ficha.estado) }}
                  </span>
                </div>
                <h2 class="mt-1 text-xl font-bold text-[#20354E]">{{ ficha.titulo }}</h2>
                <p class="mt-0.5 text-xs text-[#526579]">
                  Módulo: <strong>{{ ficha.modulo }}</strong> · Emitida por {{ ficha.solicitanteNombre }} ({{ ficha.solicitanteEmail }})
                </p>
              </div>
              <button
                type="button"
                (click)="cerrarFicha()"
                class="rounded-lg border border-[#E2E8F0] px-3 py-1.5 text-xs font-semibold text-[#526579] hover:bg-[#F8FAFC]"
              >
                Cerrar ficha
              </button>
            </div>

            <!-- Pestañas internas de la ficha: Resumen, Conversación con Dirección, Historial de eventos, Evidencias técnicas internas -->
            <div class="flex flex-wrap gap-1.5 border-b border-[#E2E8F0]" role="group" aria-label="Secciones de la ficha de cambio">
              <button
                type="button"
                [attr.aria-pressed]="seccionFicha() === 'resumen'"
                (click)="seccionFicha.set('resumen')"
                class="border-b-2 px-3 py-2 text-xs font-semibold"
                [class.border-[#173B67]]="seccionFicha() === 'resumen'"
                [class.text-[#173B67]]="seccionFicha() === 'resumen'"
                [class.border-transparent]="seccionFicha() !== 'resumen'"
              >
                Resumen
              </button>
              <button
                type="button"
                [attr.aria-pressed]="seccionFicha() === 'conversacion'"
                (click)="seccionFicha.set('conversacion')"
                class="border-b-2 px-3 py-2 text-xs font-semibold"
                [class.border-[#173B67]]="seccionFicha() === 'conversacion'"
                [class.text-[#173B67]]="seccionFicha() === 'conversacion'"
                [class.border-transparent]="seccionFicha() !== 'conversacion'"
              >
                Conversación con Dirección ({{ conversacion().length }})
              </button>
              <button
                type="button"
                [attr.aria-pressed]="seccionFicha() === 'historial'"
                (click)="seccionFicha.set('historial')"
                class="border-b-2 px-3 py-2 text-xs font-semibold"
                [class.border-[#173B67]]="seccionFicha() === 'historial'"
                [class.text-[#173B67]]="seccionFicha() === 'historial'"
                [class.border-transparent]="seccionFicha() !== 'historial'"
              >
                Historial de eventos ({{ ficha.eventos.length }})
              </button>
              @if (esAdministrador()) {
                <button
                  type="button"
                  [attr.aria-pressed]="seccionFicha() === 'evidencias'"
                  (click)="seccionFicha.set('evidencias')"
                  class="border-b-2 px-3 py-2 text-xs font-semibold"
                  [class.border-[#173B67]]="seccionFicha() === 'evidencias'"
                  [class.text-[#173B67]]="seccionFicha() === 'evidencias'"
                  [class.border-transparent]="seccionFicha() !== 'evidencias'"
                >
                  Evidencias técnicas internas
                </button>
              }
            </div>

            @if (seccionFicha() === 'resumen') {
              <div class="space-y-4 text-xs">
                <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div class="rounded-lg border border-[#E2E8F0] p-3">
                    <p class="font-semibold text-[#526579]">Problema o motivo</p>
                    <p class="mt-1 text-[#20354E]">{{ ficha.motivoProblema }}</p>
                  </div>
                  <div class="rounded-lg border border-[#E2E8F0] p-3">
                    <p class="font-semibold text-[#526579]">Resultado esperado</p>
                    <p class="mt-1 text-[#20354E]">{{ ficha.resultadoEsperado }}</p>
                  </div>
                  <div class="rounded-lg border border-[#E2E8F0] p-3">
                    <p class="font-semibold text-[#526579]">Alcance o impacto conocido</p>
                    <p class="mt-1 text-[#20354E]">{{ ficha.alcanceImpacto || 'No especificado' }}</p>
                  </div>
                  <div class="rounded-lg border border-[#E2E8F0] p-3">
                    <p class="font-semibold text-[#526579]">Sustento inicial / Autorización</p>
                    <p class="mt-1 text-[#20354E]">Evidencia: {{ ficha.evidenciaInicial || 'No adjuntada' }}</p>
                    <p class="mt-1 text-[#526579]">
                      Aprobador: <strong>{{ ficha.aprobadorNombre || 'Por definir' }}</strong> · Registró: {{ ficha.registradoDecisionPor || '—' }}
                    </p>
                    @if (ficha.fechaDecision) {
                      <p>Fecha de decisión: {{ ficha.fechaDecision | date:'dd/MM/yyyy HH:mm' }}</p>
                    }
                    @if (ficha.fechaCierre) {
                      <p>Cerró: {{ ficha.cerradoPorNombre || '—' }} · {{ ficha.fechaCierre | date:'dd/MM/yyyy HH:mm' }}</p>
                    }
                  </div>
                </div>

                @if (ficha.resumenCambio || ficha.motivoDecision) {
                  <div class="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3.5">
                    <p class="font-bold text-[#173B67]">Decisión y resumen de atención</p>
                    @if (ficha.motivoDecision) {
                      <p class="mt-1 text-[#20354E]"><strong>Motivo / Criterio:</strong> {{ ficha.motivoDecision }}</p>
                    }
                    @if (ficha.resumenCambio) {
                      <p class="mt-1 text-[#20354E]"><strong>Resumen de resolución:</strong> {{ ficha.resumenCambio }}</p>
                    }
                  </div>
                }

                <!-- Respuesta de Dirección cuando está en estado REQUIERE_INFORMACION -->
                @if (puedeSolicitar() && ficha.estado === 'REQUIERE_INFORMACION') {
                  <div class="rounded-xl border-2 border-[#B88932] bg-[#FFF2D8]/50 p-4">
                    <p class="text-xs font-bold uppercase tracking-wide text-[#744F0A]">
                      Esta solicitud requiere información adicional de Dirección
                    </p>
                    <div class="mt-3 space-y-2.5">
                      <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <div>
                          <label class="mb-1 block text-[11px] font-semibold text-[#744F0A]" for="sc-resp-rapida">
                            Respuesta rápida predefinida
                          </label>
                          <select
                            id="sc-resp-rapida"
                            (change)="aplicarRespuestaRapida($event)"
                            class="w-full rounded-lg border border-[#B88932] bg-white px-2.5 py-2 text-xs text-[#20354E]"
                          >
                            <option value="">Elegir respuesta frecuente...</option>
                            @for (resp of opcionesRespuestaDireccion; track resp) {
                              <option [value]="resp">{{ resp }}</option>
                            }
                          </select>
                        </div>
                        <div>
                          <label class="mb-1 block text-[11px] font-semibold text-[#744F0A]" for="sc-anexo-rapido">
                            Anexo o sustento frecuente
                          </label>
                          <select
                            id="sc-anexo-rapido"
                            (change)="aplicarAnexoRapido($event)"
                            class="w-full rounded-lg border border-[#B88932] bg-white px-2.5 py-2 text-xs text-[#20354E]"
                          >
                            <option value="">Elegir documento de sustento...</option>
                            @for (anexo of opcionesAnexoDireccion; track anexo) {
                              <option [value]="anexo">{{ anexo }}</option>
                            }
                          </select>
                        </div>
                      </div>
                      <label class="block text-xs font-semibold text-[#20354E]" for="respuesta-aclaracion">
                        Aclaración o información solicitada *
                      </label>
                      <textarea
                        id="respuesta-aclaracion" maxlength="2000"
                        rows="2"
                        [(ngModel)]="respuestaMensaje"
                        placeholder="Seleccione una respuesta rápida arriba o ingrese la aclaración oficial..."
                        class="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs text-[#20354E]"
                      ></textarea>
                      <input
                        type="text"
                        [(ngModel)]="respuestaAdjunto"
                        placeholder="Referencia de anexo o documento (opcional)"
                        aria-label="Referencia de anexo" maxlength="500"
                        class="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs text-[#20354E]"
                      />
                      <div class="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          (click)="enviarRespuestaInformacion()" [disabled]="operandoFicha()"
                          data-testid="btn-responder-informacion"
                          class="rounded-lg bg-[#173B67] px-4 py-2 text-xs font-semibold text-white hover:bg-[#20354E]"
                        >
                          Enviar aclaración a Administración
                        </button>
                      </div>
                    </div>
                  </div>
                }

                <!-- Notificaciones por correo institucional -->
                <div class="rounded-xl border border-[#E2E8F0] p-3.5">
                  <p class="text-xs font-bold uppercase tracking-wider text-[#173B67]">
                    Notificaciones por correo institucional al solicitante ({{ ficha.notificaciones.length }})
                  </p>
                  <div class="mt-2.5 space-y-2">
                    @for (notif of ficha.notificaciones; track notif.id) {
                      <div class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-2.5">
                        <div>
                          <p class="font-semibold text-[#20354E]">{{ notif.asunto }}</p>
                          <p class="text-[11px] text-[#526579]">
                            Para: {{ notif.destinatarioEmail }} · Intentos: {{ notif.intentos }} · {{ notif.fechaIntento | date:'dd/MM/yyyy HH:mm' }}
                          </p>
                          @if (esAdministrador() && notif.ultimoError) {
                            <p class="mt-0.5 text-[11px] font-medium text-[#83231D]">{{ notif.ultimoError }}</p>
                          }
                        </div>
                        <div class="flex items-center gap-2">
                          <span
                            class="rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                            [class.bg-[#E4F2E8]]="notif.estadoEnvio === 'ENVIADO'"
                            [class.text-[#1D5E3C]]="notif.estadoEnvio === 'ENVIADO'"
                            [class.bg-[#FCE8E6]]="notif.estadoEnvio === 'FALLIDO'"
                            [class.text-[#83231D]]="notif.estadoEnvio === 'FALLIDO'"
                          >
                            {{ notif.estadoEnvio }}
                          </span>
                          @if (esAdministrador() && notif.estadoEnvio === 'FALLIDO') {
                            <button
                              type="button"
                              (click)="reintentarCorreo(ficha.id, notif.id)" [disabled]="operandoFicha()"
                              data-testid="btn-reintentar-correo"
                              class="rounded-lg bg-[#173B67] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[#20354E]"
                            >
                              Reintentar envío
                            </button>
                          }
                        </div>
                      </div>
                    } @empty {
                      <p class="text-xs text-[#526579]">Aún no se han emitido avisos por correo para esta solicitud.</p>
                    }
                  </div>
                </div>
              </div>
            }

            @if (seccionFicha() === 'conversacion') {
              <div class="space-y-3 text-xs">
                @for (com of conversacion(); track com.id) {
                  <div class="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                    <div class="flex items-center justify-between">
                      <span class="font-bold text-[#173B67]">{{ com.actorNombre }} ({{ com.actorRol }})</span>
                      <span class="text-[#526579]">{{ com.fechaEvento | date:'dd/MM/yyyy HH:mm' }}</span>
                    </div>
                    <p class="mt-1.5 text-[#20354E]">{{ com.comentario }}</p>
                    @if (com.evidenciaUrl) {
                      <p class="mt-1 font-mono text-[11px] text-[#0F294D]">Adjunto: {{ com.evidenciaUrl }}</p>
                    }
                  </div>
                } @empty {
                  <p class="py-4 text-center text-[#526579]">No hay mensajes registrados en la conversación.</p>
                }
              </div>
            }

            @if (seccionFicha() === 'historial') {
              <ol class="space-y-2.5 text-xs">
                @for (ev of ficha.eventos; track ev.id) {
                  <li class="rounded-lg border border-[#E2E8F0] p-3">
                    <div class="flex flex-wrap items-center justify-between gap-2">
                      <span class="font-bold text-[#173B67]">
                        {{ ev.tipoEvento.replaceAll('_', ' ') }}
                        @if (ev.estadoAnterior && ev.estadoAnterior !== ev.estadoNuevo) { · {{ etiquetaEstado(ev.estadoAnterior) }} → }
                        @if (ev.estadoNuevo) { {{ etiquetaEstado(ev.estadoNuevo) }} }
                      </span>
                      <span class="text-[#526579]">{{ ev.fechaEvento | date:'dd/MM/yyyy HH:mm:ss' }}</span>
                    </div>
                    <p class="mt-1 text-[#20354E]">{{ ev.comentario }}</p>
                    <p class="mt-0.5 text-[11px] text-[#526579]">
                      Ejecutado por: {{ ev.actorNombre }} ({{ ev.actorRol }})
                    </p>
                    @if (ev.evidenciaUrl) { <p>Referencia: {{ ev.evidenciaUrl }}</p> }
                  </li>
                }
              </ol>
            }

            @if (esAdministrador() && seccionFicha() === 'evidencias') {
              <div class="space-y-3 text-xs">
                <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div class="rounded-lg border border-[#E2E8F0] p-3">
                    <p class="font-semibold text-[#526579]">Qué se cambió</p>
                    <p class="mt-1 text-[#20354E]">{{ ficha.resumenCambio || 'Pendiente de registro técnico' }}</p>
                  </div>
                  <div class="rounded-lg border border-[#E2E8F0] p-3">
                    <p class="font-semibold text-[#526579]">Enlace a PR / Commit / Evidencia</p>
                    <p class="mt-1 font-mono text-[#173B67]">{{ ficha.enlaceEvidenciaTecnica || 'Sin enlace registrado' }}</p>
                  </div>
                  <div class="rounded-lg border border-[#E2E8F0] p-3">
                    <p class="font-semibold text-[#526579]">Plan de reversión</p>
                    <p class="mt-1 text-[#20354E]">{{ ficha.planReversion || 'No especificado' }}</p>
                  </div>
                  <div class="rounded-lg border border-[#E2E8F0] p-3">
                    <p class="font-semibold text-[#526579]">Prueba posterior y resultado</p>
                    <p class="mt-1 text-[#20354E]">{{ ficha.pruebaPosterior || 'Pendiente de validación post-cambio' }}</p>
                    @if (ficha.resultadoPrueba) { <p>Resultado: {{ ficha.resultadoPrueba }}</p> }
                  </div>
                  <div class="rounded-lg border border-[#E2E8F0] p-3 sm:col-span-2">
                    <p class="font-semibold text-[#526579]">Verificación de cierre</p>
                    <p class="mt-1 text-[#20354E]">{{ ficha.verificacionCierre || 'Pendiente de cierre formal' }}</p>
                  </div>
                </div>
              </div>
            }

            <!-- Panel exclusivo de evaluación, autorización e implementación para ADMINISTRADOR -->
            @if (esAdministrador() && estadosGestionDisponibles().length) {
              <div class="border-t-2 border-[#0F294D] pt-4 space-y-4">
                <div>
                  <p class="text-xs font-bold uppercase tracking-wider text-[#0F294D]">
                    Acciones rápidas de flujo (1 clic · sin llenar todo manualmente)
                  </p>
                  <div class="mt-2 flex flex-wrap gap-2">
                    @if (ficha.estado === 'RECIBIDA') {
                      <button
                        type="button"
                        (click)="transicionRapidaEncadenada(['EN_EVALUACION'])"
                        [disabled]="operandoFicha() || cargandoFicha()"
                        data-testid="btn-rapido-evaluar"
                        class="rounded-lg border border-[#173B67] bg-white px-3 py-1.5 text-xs font-semibold text-[#173B67] hover:bg-[#F1F5F9] disabled:opacity-60"
                      >
                        Pasar a En evaluación
                      </button>
                      <button
                        type="button"
                        (click)="transicionRapidaEncadenada(['EN_EVALUACION', 'APROBADA'])"
                        [disabled]="operandoFicha() || cargandoFicha()"
                        data-testid="btn-rapido-evaluar-aprobar"
                        class="rounded-lg bg-[#1D5E3C] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#174A2F] disabled:opacity-60"
                      >
                        Evaluar y Aprobar (1 clic)
                      </button>
                      <button
                        type="button"
                        (click)="transicionRapidaEncadenada(['EN_EVALUACION', 'APROBADA', 'EN_EJECUCION', 'RESUELTA'])"
                        [disabled]="operandoFicha() || cargandoFicha()"
                        data-testid="btn-rapido-resolver-directo"
                        class="rounded-lg bg-[#173B67] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#20354E] disabled:opacity-60"
                      >
                        Aprobar, Ejecutar y Resolver (1 clic)
                      </button>
                    }
                    @if (ficha.estado === 'EN_EVALUACION') {
                      <button
                        type="button"
                        (click)="transicionRapidaEncadenada(['APROBADA'])"
                        [disabled]="operandoFicha() || cargandoFicha()"
                        data-testid="btn-rapido-aprobar"
                        class="rounded-lg bg-[#1D5E3C] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#174A2F] disabled:opacity-60"
                      >
                        Aprobar cambio (1 clic)
                      </button>
                      <button
                        type="button"
                        (click)="transicionRapidaEncadenada(['APROBADA', 'EN_EJECUCION', 'RESUELTA'])"
                        [disabled]="operandoFicha() || cargandoFicha()"
                        data-testid="btn-rapido-aprobar-resolver"
                        class="rounded-lg bg-[#173B67] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#20354E] disabled:opacity-60"
                      >
                        Aprobar, Ejecutar y Resolver (1 clic)
                      </button>
                      <button
                        type="button"
                        (click)="transicionRapidaEncadenada(['REQUIERE_INFORMACION'])"
                        [disabled]="operandoFicha() || cargandoFicha()"
                        data-testid="btn-rapido-pedir-info"
                        class="rounded-lg border border-[#B88932] bg-[#FFF2D8] px-3 py-1.5 text-xs font-semibold text-[#744F0A] hover:bg-[#FCE6BA] disabled:opacity-60"
                      >
                        Pedir aclaración a Dirección
                      </button>
                      <button
                        type="button"
                        (click)="transicionRapidaEncadenada(['RECHAZADA'])"
                        [disabled]="operandoFicha() || cargandoFicha()"
                        data-testid="btn-rapido-rechazar"
                        class="rounded-lg border border-[#A63A3A] bg-white px-3 py-1.5 text-xs font-semibold text-[#A63A3A] hover:bg-[#FDECEC] disabled:opacity-60"
                      >
                        Rechazar con sustento
                      </button>
                    }
                    @if (ficha.estado === 'REQUIERE_INFORMACION') {
                      <button
                        type="button"
                        (click)="transicionRapidaEncadenada(['RECHAZADA'])"
                        [disabled]="operandoFicha() || cargandoFicha()"
                        class="rounded-lg border border-[#A63A3A] bg-white px-3 py-1.5 text-xs font-semibold text-[#A63A3A] hover:bg-[#FDECEC] disabled:opacity-60"
                      >
                        Rechazar por falta de respuesta
                      </button>
                    }
                    @if (ficha.estado === 'APROBADA') {
                      <button
                        type="button"
                        (click)="transicionRapidaEncadenada(['EN_EJECUCION'])"
                        [disabled]="operandoFicha() || cargandoFicha()"
                        class="rounded-lg border border-[#173B67] bg-white px-3 py-1.5 text-xs font-semibold text-[#173B67] hover:bg-[#F1F5F9] disabled:opacity-60"
                      >
                        Iniciar ejecución
                      </button>
                      <button
                        type="button"
                        (click)="transicionRapidaEncadenada(['EN_EJECUCION', 'RESUELTA'])"
                        [disabled]="operandoFicha() || cargandoFicha()"
                        data-testid="btn-rapido-ejecutar-resolver"
                        class="rounded-lg bg-[#173B67] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#20354E] disabled:opacity-60"
                      >
                        Ejecutar y Resolver (1 clic)
                      </button>
                    }
                    @if (ficha.estado === 'EN_EJECUCION') {
                      <button
                        type="button"
                        (click)="transicionRapidaEncadenada(['RESUELTA'])"
                        [disabled]="operandoFicha() || cargandoFicha()"
                        data-testid="btn-rapido-marcar-resuelta"
                        class="rounded-lg bg-[#173B67] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#20354E] disabled:opacity-60"
                      >
                        Marcar como Resuelta (1 clic)
                      </button>
                    }
                    @if (ficha.estado === 'RESUELTA') {
                      <button
                        type="button"
                        (click)="transicionRapidaEncadenada(['CERRADA'])"
                        [disabled]="operandoFicha() || cargandoFicha()"
                        data-testid="btn-rapido-cerrar"
                        class="rounded-lg bg-[#1D5E3C] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#174A2F] disabled:opacity-60"
                      >
                        Cerrar ticket con conformidad (1 clic)
                      </button>
                    }
                  </div>
                </div>

                <p class="text-xs font-bold uppercase tracking-wider text-[#0F294D]">
                  Panel de evaluación, autorización e implementación (Administrador)
                </p>
                <div class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3 text-xs">
                  <div>
                    <label class="mb-1 block font-semibold text-[#20354E]" for="admin-estado">Estado del flujo</label>
                    <select
                      id="admin-estado"
                      [(ngModel)]="formAdmin.nuevoEstado"
                      class="w-full rounded-lg border border-[#CBD5E1] bg-white px-2.5 py-2 text-xs text-[#20354E]"
                    >
                      @for (est of estadosGestionDisponibles(); track est) {
                        <option [value]="est">{{ etiquetaEstado(est) }}</option>
                      }
                    </select>
                  </div>
                  <div>
                    <label class="mb-1 block font-semibold text-[#20354E]" for="admin-prioridad">Prioridad</label>
                    <select
                      id="admin-prioridad"
                      [(ngModel)]="formAdmin.prioridad"
                      class="w-full rounded-lg border border-[#CBD5E1] bg-white px-2.5 py-2 text-xs text-[#20354E]"
                    >
                      <option value="BAJA">BAJA</option>
                      <option value="MEDIA">MEDIA</option>
                      <option value="ALTA">ALTA</option>
                      <option value="CRITICA">CRITICA</option>
                    </select>
                  </div>
                  <div>
                    <div class="mb-1 flex items-center justify-between gap-1">
                      <label class="block font-semibold text-[#20354E]" for="admin-impacto">Impacto técnico</label>
                      <select
                        aria-label="Plantilla de impacto técnico"
                        (change)="aplicarTextoEnFormAdmin('impactoEvaluado', $event)"
                        class="max-w-[140px] rounded border border-[#E2E8F0] bg-[#F8FAFC] px-1.5 py-0.5 text-[10px] font-semibold text-[#173B67]"
                      >
                        <option value="">Elegir...</option>
                        @for (opc of opcionesImpactoAdmin; track opc) {
                          <option [value]="opc">{{ opc }}</option>
                        }
                      </select>
                    </div>
                    <input
                      id="admin-impacto"
                      type="text"
                      maxlength="4000"
                      [(ngModel)]="formAdmin.impactoEvaluado"
                      class="w-full rounded-lg border border-[#CBD5E1] bg-white px-2.5 py-2 text-xs text-[#20354E]"
                    />
                  </div>
                  <div>
                    <div class="mb-1 flex items-center justify-between gap-1">
                      <label class="block font-semibold text-[#20354E]" for="admin-responsable">Responsable técnico</label>
                      <select
                        aria-label="Seleccionar responsable técnico"
                        (change)="aplicarTextoEnFormAdmin('responsableNombre', $event)"
                        class="max-w-[140px] rounded border border-[#E2E8F0] bg-[#F8FAFC] px-1.5 py-0.5 text-[10px] font-semibold text-[#173B67]"
                      >
                        <option value="">Elegir...</option>
                        @for (opc of opcionesResponsableAdmin; track opc) {
                          <option [value]="opc">{{ opc }}</option>
                        }
                      </select>
                    </div>
                    <input
                      id="admin-responsable"
                      type="text"
                      [(ngModel)]="formAdmin.responsableNombre"
                      class="w-full rounded-lg border border-[#CBD5E1] bg-white px-2.5 py-2 text-xs text-[#20354E]"
                    />
                  </div>
                  <div class="sm:col-span-2">
                    <div class="mb-1 flex flex-wrap items-center justify-between gap-1">
                      <label class="block font-semibold text-[#20354E]" for="admin-aprobador">
                        Autorizado por (conserva quién autorizó aunque otro registre)
                      </label>
                      <select
                        aria-label="Seleccionar aprobador"
                        (change)="aplicarTextoEnFormAdmin('aprobadorNombre', $event)"
                        class="max-w-[180px] rounded border border-[#E2E8F0] bg-[#F8FAFC] px-1.5 py-0.5 text-[10px] font-semibold text-[#173B67]"
                      >
                        <option value="">Elegir aprobador...</option>
                        @for (opc of opcionesAprobadorAdmin; track opc) {
                          <option [value]="opc">{{ opc }}</option>
                        }
                      </select>
                    </div>
                    <input
                      id="admin-aprobador"
                      type="text"
                      [(ngModel)]="formAdmin.aprobadorNombre"
                      placeholder="Ej. Dirección General / Comité Técnico"
                      class="w-full rounded-lg border border-[#CBD5E1] bg-white px-2.5 py-2 text-xs text-[#20354E]"
                    />
                  </div>
                  <div class="sm:col-span-3">
                    <div class="mb-1 flex flex-wrap items-center justify-between gap-2">
                      <label class="block font-semibold text-[#20354E]" for="admin-motivo">
                        Decisión / Motivo {{ formAdmin.nuevoEstado === 'RECHAZADA' ? '(Obligatorio para rechazar *)' : '' }}
                      </label>
                      <select
                        aria-label="Seleccionar motivo de decisión"
                        (change)="aplicarTextoEnFormAdmin('motivoDecision', $event)"
                        class="max-w-[230px] rounded border border-[#E2E8F0] bg-[#F8FAFC] px-2 py-0.5 text-[10px] font-semibold text-[#173B67]"
                      >
                        <option value="">Elegir sustento frecuente...</option>
                        @for (opc of opcionesMotivoDecisionAdmin; track opc) {
                          <option [value]="opc">{{ opc }}</option>
                        }
                      </select>
                    </div>
                    <input
                      id="admin-motivo"
                      type="text"
                      [(ngModel)]="formAdmin.motivoDecision"
                      placeholder="Sustento de la autorización, observación o rechazo..."
                      class="w-full rounded-lg border border-[#CBD5E1] bg-white px-2.5 py-2 text-xs text-[#20354E]"
                    />
                  </div>
                  <div class="sm:col-span-2">
                    <div class="mb-1 flex flex-wrap items-center justify-between gap-2">
                      <label class="block font-semibold text-[#20354E]" for="admin-que-cambio">Resumen del cambio y de la resolución</label>
                      <select
                        aria-label="Seleccionar resumen del cambio"
                        (change)="aplicarTextoEnFormAdmin('resumenCambio', $event)"
                        class="max-w-[210px] rounded border border-[#E2E8F0] bg-[#F8FAFC] px-2 py-0.5 text-[10px] font-semibold text-[#173B67]"
                      >
                        <option value="">Elegir resumen rápido...</option>
                        @for (opc of opcionesResumenCambioAdmin; track opc) {
                          <option [value]="opc">{{ opc }}</option>
                        }
                      </select>
                    </div>
                    <input
                      id="admin-que-cambio"
                      type="text"
                      [(ngModel)]="formAdmin.resumenCambio"
                      placeholder="Detalle de parámetros, tablas o componentes modificados"
                      class="w-full rounded-lg border border-[#CBD5E1] bg-white px-2.5 py-2 text-xs text-[#20354E]"
                    />
                  </div>
                  <div>
                    <label class="mb-1 block font-semibold text-[#20354E]" for="admin-evidencia">Enlace PR / Commit / Evidencia</label>
                    <input
                      id="admin-evidencia"
                      type="text"
                      [(ngModel)]="formAdmin.enlaceEvidenciaTecnica"
                      placeholder="Ej. PR #145 · commit a1b2c3"
                      class="w-full rounded-lg border border-[#CBD5E1] bg-white px-2.5 py-2 text-xs text-[#20354E]"
                    />
                  </div>
                  <div>
                    <div class="mb-1 flex items-center justify-between gap-1">
                      <label class="block font-semibold text-[#20354E]" for="admin-reversion">Plan de reversión</label>
                      <select
                        aria-label="Seleccionar plan de reversión"
                        (change)="aplicarTextoEnFormAdmin('planReversion', $event)"
                        class="max-w-[130px] rounded border border-[#E2E8F0] bg-[#F8FAFC] px-1.5 py-0.5 text-[10px] font-semibold text-[#173B67]"
                      >
                        <option value="">Elegir...</option>
                        @for (opc of opcionesPlanReversionAdmin; track opc) {
                          <option [value]="opc">{{ opc }}</option>
                        }
                      </select>
                    </div>
                    <input
                      id="admin-reversion"
                      type="text"
                      [(ngModel)]="formAdmin.planReversion"
                      placeholder="Pasos para revertir en caso de contingencia"
                      class="w-full rounded-lg border border-[#CBD5E1] bg-white px-2.5 py-2 text-xs text-[#20354E]"
                    />
                  </div>
                  <div>
                    <div class="mb-1 flex items-center justify-between gap-1">
                      <label class="block font-semibold text-[#20354E]" for="admin-prueba">Prueba posterior</label>
                      <select
                        aria-label="Seleccionar prueba posterior"
                        (change)="aplicarTextoEnFormAdmin('pruebaPosterior', $event)"
                        class="max-w-[130px] rounded border border-[#E2E8F0] bg-[#F8FAFC] px-1.5 py-0.5 text-[10px] font-semibold text-[#173B67]"
                      >
                        <option value="">Elegir...</option>
                        @for (opc of opcionesPruebaAdmin; track opc) {
                          <option [value]="opc">{{ opc }}</option>
                        }
                      </select>
                    </div>
                    <input
                      id="admin-prueba"
                      type="text"
                      [(ngModel)]="formAdmin.pruebaPosterior"
                      placeholder="Ej. OK · Verificado en módulo operativo"
                      class="w-full rounded-lg border border-[#CBD5E1] bg-white px-2.5 py-2 text-xs text-[#20354E]"
                    />
                  </div>
                  <div>
                    <div class="mb-1 flex items-center justify-between gap-1">
                      <label class="block font-semibold text-[#20354E]" for="admin-resultado-prueba">Resultado de la prueba</label>
                      <select
                        aria-label="Seleccionar resultado de prueba"
                        (change)="aplicarTextoEnFormAdmin('resultadoPrueba', $event)"
                        class="max-w-[120px] rounded border border-[#E2E8F0] bg-[#F8FAFC] px-1.5 py-0.5 text-[10px] font-semibold text-[#173B67]"
                      >
                        <option value="">Elegir...</option>
                        @for (opc of opcionesResultadoPruebaAdmin; track opc) {
                          <option [value]="opc">{{ opc }}</option>
                        }
                      </select>
                    </div>
                    <input id="admin-resultado-prueba" type="text" maxlength="120"
                      [(ngModel)]="formAdmin.resultadoPrueba"
                      class="w-full rounded-lg border border-[#CBD5E1] bg-white px-2.5 py-2 text-xs text-[#20354E]" />
                  </div>
                  <div>
                    <div class="mb-1 flex items-center justify-between gap-1">
                      <label class="block font-semibold text-[#20354E]" for="admin-cierre">Verificación de cierre</label>
                      <select
                        aria-label="Seleccionar verificación de cierre"
                        (change)="aplicarTextoEnFormAdmin('verificacionCierre', $event)"
                        class="max-w-[125px] rounded border border-[#E2E8F0] bg-[#F8FAFC] px-1.5 py-0.5 text-[10px] font-semibold text-[#173B67]"
                      >
                        <option value="">Elegir...</option>
                        @for (opc of opcionesCierreAdmin; track opc) {
                          <option [value]="opc">{{ opc }}</option>
                        }
                      </select>
                    </div>
                    <input
                      id="admin-cierre"
                      type="text"
                      [(ngModel)]="formAdmin.verificacionCierre"
                      placeholder="Conformidad de cierre"
                      class="w-full rounded-lg border border-[#CBD5E1] bg-white px-2.5 py-2 text-xs text-[#20354E]"
                    />
                  </div>
                  <div class="sm:col-span-3">
                    <div class="mb-1 flex flex-wrap items-center justify-between gap-2">
                      <label class="block font-semibold text-[#20354E]" for="admin-resumen-resolucion">Mensaje para Dirección</label>
                      <select
                        aria-label="Seleccionar mensaje frecuente para Dirección"
                        (change)="aplicarTextoEnFormAdmin('comentario', $event)"
                        class="max-w-[250px] rounded border border-[#E2E8F0] bg-[#F8FAFC] px-2 py-0.5 text-[10px] font-semibold text-[#173B67]"
                      >
                        <option value="">Elegir mensaje rápido...</option>
                        @for (opc of opcionesComentarioAdmin; track opc) {
                          <option [value]="opc">{{ opc }}</option>
                        }
                      </select>
                    </div>
                    <input
                      id="admin-resumen-resolucion"
                      type="text"
                      [(ngModel)]="formAdmin.comentario"
                      placeholder="Escriba la información solicitada o el mensaje que verá Dirección"
                      class="w-full rounded-lg border border-[#CBD5E1] bg-white px-2.5 py-2 text-xs text-[#20354E]"
                    />
                  </div>
                </div>
                <div class="mt-4 flex justify-end">
                  <button
                    type="button"
                    (click)="guardarGestionAdmin()" [disabled]="operandoFicha() || cargandoFicha()"
                    data-testid="btn-guardar-gestion-admin"
                    class="min-h-10 rounded-lg bg-[#173B67] px-4 py-2 text-xs font-semibold text-white hover:bg-[#20354E]"
                  >
                    Guardar evaluación y actualizar estado
                  </button>
                </div>
              </div>
            }
          </aside>
        }
      </div>
    </section>
  `
})
export class SolicitudesCambioComponent {
  private readonly service = inject(SolicitudCambioService);
  private readonly ruta = inject(ActivatedRoute);
  readonly store = inject(AuthStore);

  readonly modulos = MODULOS_SOLICITUD_CAMBIO;
  readonly todasLasPlantillas = PLANTILLAS_SOLICITUD;
  readonly opcionesAlcanceRapido = OPCIONES_ALCANCE_RAPIDO;
  readonly opcionesSustentoRapido = OPCIONES_SUSTENTO_RAPIDO;
  readonly opcionesRespuestaDireccion = OPCIONES_RESPUESTA_DIRECCION;
  readonly opcionesAnexoDireccion = OPCIONES_ANEXO_DIRECCION;
  readonly opcionesImpactoAdmin = OPCIONES_IMPACTO_ADMIN;
  readonly opcionesResponsableAdmin = OPCIONES_RESPONSABLE_ADMIN;
  readonly opcionesAprobadorAdmin = OPCIONES_APROBADOR_ADMIN;
  readonly opcionesMotivoDecisionAdmin = OPCIONES_MOTIVO_DECISION_ADMIN;
  readonly opcionesResumenCambioAdmin = OPCIONES_RESUMEN_CAMBIO_ADMIN;
  readonly opcionesPlanReversionAdmin = OPCIONES_PLAN_REVERSION_ADMIN;
  readonly opcionesPruebaAdmin = OPCIONES_PRUEBA_ADMIN;
  readonly opcionesResultadoPruebaAdmin = OPCIONES_RESULTADO_PRUEBA_ADMIN;
  readonly opcionesCierreAdmin = OPCIONES_CIERRE_ADMIN;
  readonly opcionesComentarioAdmin = OPCIONES_COMENTARIO_ADMIN;
  readonly estadosDisponibles = Object.keys(ESTADO_SOLICITUD_LABELS) as EstadoSolicitudCambio[];
  readonly solicitudes = signal<SolicitudCambioDto[]>([]);
  readonly solicitudSeleccionada = signal<SolicitudCambioDto | null>(null);
  readonly seccionFicha = signal<'resumen' | 'conversacion' | 'historial' | 'evidencias'>('resumen');
  readonly filtroEstado = signal('');
  readonly filtroModulo = signal('');
  readonly filtroResponsable = signal('');
  readonly filtroFecha = signal('');
  readonly plantillaSeleccionada = signal('');
  readonly moduloSeleccionNueva = signal<string>(MODULOS_SOLICITUD_CAMBIO[0]);

  readonly mostrarFormularioNueva = signal(false);
  readonly pasoNuevaSolicitud = signal<1 | 2>(1);
  readonly enviandoSolicitud = signal(false);
  readonly cargandoListado = signal(false);
  readonly cargandoFicha = signal(false);
  readonly operandoFicha = signal(false);
  readonly confirmacionReciente = signal<SolicitudCambioDto | null>(null);
  readonly mensajeExito = signal('');
  readonly errorMensaje = signal('');

  private claveIdempotenciaActiva = '';
  private codigoPendiente = '';
  private versionFicha = 0;

  formNueva = this.nuevaSolicitudVacia();
  respuestaMensaje = '';
  respuestaAdjunto = '';
  formAdmin: GestionarSolicitudCambioRequestDto = this.formularioGestion();

  readonly esAdministrador = computed(() => this.store.hasRole('ADMINISTRADOR'));
  readonly puedeSolicitar = computed(() => !this.esAdministrador() && this.store.hasRole('DIRECCION'));
  readonly estadosGestionDisponibles = computed(() => {
    const estado = this.solicitudSeleccionada()?.estado;
    if (!estado || estado === 'CERRADA' || estado === 'RECHAZADA') return [];
    return [estado, ...TRANSICIONES_ADMIN[estado]];
  });

  readonly conversacion = computed(() => this.solicitudSeleccionada()?.eventos.filter(evento =>
    evento.visibleDireccion && (
      evento.tipoEvento === 'INFORMACION_ADICIONAL' ||
      evento.tipoEvento === 'ACTUALIZACION_TECNICA' ||
      (evento.tipoEvento === 'CAMBIO_ESTADO' && evento.estadoNuevo === 'REQUIERE_INFORMACION')
    )
  ) ?? []);

  readonly identidadSolicitanteActual = computed(() => {
    const usuario = this.store.user();
    return {
      username: usuario?.username || '—',
      nombre: usuario?.nombreCompleto || usuario?.username || '—',
      email: usuario?.email || '—'
    };
  });

  readonly solicitudesFiltradas = computed(() => {
    const estado = this.filtroEstado().trim();
    const modulo = this.filtroModulo().trim();
    const responsable = this.filtroResponsable().trim().toLowerCase();
    const fecha = this.filtroFecha().trim();

    return this.solicitudes().filter(item => {
      if (estado && item.estado !== estado) return false;
      if (modulo && item.modulo !== modulo) return false;
      if (responsable) {
        const texto = `${item.codigo} ${item.titulo} ${item.responsableNombre ?? ''}`.toLowerCase();
        if (!texto.includes(responsable)) return false;
      }
      return !fecha || item.fechaSolicitud.startsWith(fecha);
    });
  });

  readonly paginaActual = signal<number>(1);
  readonly solicitudesPaginadas = computed(() =>
    paginarRegistros(this.solicitudesFiltradas(), this.paginaActual(), 10)
  );
  readonly plantillasDelModulo = computed(() =>
    PLANTILLAS_SOLICITUD.filter(tpl => tpl.modulo === this.moduloSeleccionNueva())
  );
  readonly conteoPorEstado = computed(() => {
    const conteo = new Map<EstadoSolicitudCambio, number>();
    for (const item of this.solicitudes()) {
      conteo.set(item.estado, (conteo.get(item.estado) ?? 0) + 1);
    }
    return this.estadosDisponibles.map(estado => ({
      estado,
      etiqueta: this.etiquetaEstado(estado),
      cantidad: conteo.get(estado) ?? 0
    }));
  });

  constructor() {
    this.ruta.queryParamMap.pipe(takeUntilDestroyed()).subscribe(parametros => {
      this.codigoPendiente = parametros.get('codigo')?.trim().toUpperCase() ?? '';
      this.cargarSolicitudes();
    });
  }

  etiquetaEstado(estado: EstadoSolicitudCambio): string {
    return ESTADO_SOLICITUD_LABELS[estado] ?? estado;
  }

  cargarSolicitudes(): void {
    if ((!this.esAdministrador() && !this.puedeSolicitar()) || this.cargandoListado()) return;

    this.errorMensaje.set('');
    this.cargandoListado.set(true);
    const peticion = this.esAdministrador() ? this.service.listarTodas() : this.service.listarMias();
    peticion.pipe(finalize(() => this.cargandoListado.set(false))).subscribe({
      next: lista => {
        this.solicitudes.set(lista);
        if (this.codigoPendiente) {
          const solicitud = lista.find(item => item.codigo.toUpperCase() === this.codigoPendiente);
          this.codigoPendiente = '';
          if (solicitud) this.abrirFicha(solicitud);
          else this.errorMensaje.set('No se encontró ese ticket en tus solicitudes.');
        } else {
          const actual = this.solicitudSeleccionada();
          if (actual && lista.some(item => item.id === actual.id)) this.abrirFicha(actual);
          else if (actual) this.cerrarFicha();
        }
      },
      error: error => this.mostrarError(error, 'No se pudieron cargar las solicitudes de cambio.')
    });
  }

  aplicarFiltroRapidoEstado(estado: EstadoSolicitudCambio | ''): void {
    if (!estado) {
      this.filtroEstado.set('');
    } else {
      this.filtroEstado.set(this.filtroEstado() === estado ? '' : estado);
    }
    this.paginaActual.set(1);
  }

  limpiarFiltros(): void {
    this.filtroEstado.set('');
    this.filtroModulo.set('');
    this.filtroResponsable.set('');
    this.filtroFecha.set('');
    this.paginaActual.set(1);
  }

  iniciarNuevaSolicitud(): void {
    if (!this.puedeSolicitar() || this.enviandoSolicitud()) return;
    this.errorMensaje.set('');
    this.mensajeExito.set('');
    this.confirmacionReciente.set(null);
    this.claveIdempotenciaActiva = globalThis.crypto?.randomUUID?.() ??
      `sc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.formNueva = this.nuevaSolicitudVacia();
    this.plantillaSeleccionada.set('');
    this.moduloSeleccionNueva.set(this.formNueva.modulo);
    this.pasoNuevaSolicitud.set(1);
    this.mostrarFormularioNueva.set(true);
  }

  cancelarNuevaSolicitud(): void {
    if (this.enviandoSolicitud()) return;
    this.mostrarFormularioNueva.set(false);
    this.plantillaSeleccionada.set('');
    this.pasoNuevaSolicitud.set(1);
    this.errorMensaje.set('');
  }

  alCambiarModuloNueva(modulo: string): void {
    this.formNueva.modulo = modulo;
    this.moduloSeleccionNueva.set(modulo);
    const actual = this.plantillaSeleccionada();
    if (actual && !PLANTILLAS_SOLICITUD.some(tpl => tpl.id === actual && tpl.modulo === modulo)) {
      this.plantillaSeleccionada.set('');
    }
  }

  seleccionarPlantillaRapida(plantillaId: string): void {
    this.plantillaSeleccionada.set(plantillaId);
    const tpl = PLANTILLAS_SOLICITUD.find(item => item.id === plantillaId);
    if (!tpl) return;
    this.formNueva = {
      ...this.formNueva,
      modulo: tpl.modulo,
      titulo: tpl.titulo,
      motivoProblema: tpl.motivoProblema,
      resultadoEsperado: tpl.resultadoEsperado,
      alcanceImpacto: tpl.alcanceImpacto,
      evidenciaInicial: tpl.evidenciaInicial
    };
    this.moduloSeleccionNueva.set(tpl.modulo);
    this.errorMensaje.set('');
  }

  aplicarMotivoPlantilla(evento: Event): void {
    const valor = this.extraerValorSelect(evento);
    if (valor) this.formNueva.motivoProblema = valor;
  }

  aplicarResultadoPlantilla(evento: Event): void {
    const valor = this.extraerValorSelect(evento);
    if (valor) this.formNueva.resultadoEsperado = valor;
  }

  aplicarCampoNuevaSelect(campo: 'alcanceImpacto' | 'evidenciaInicial', evento: Event): void {
    const valor = this.extraerValorSelect(evento);
    if (valor) this.formNueva[campo] = valor;
  }

  avanzarARevision(): void {
    if (!this.puedeSolicitar() || !this.mostrarFormularioNueva()) return;
    if (!this.validarFormularioNueva()) return;
    this.errorMensaje.set('');
    this.pasoNuevaSolicitud.set(2);
  }

  confirmarEnvioSolicitud(): void {
    if (!this.puedeSolicitar() || this.pasoNuevaSolicitud() !== 2 || this.enviandoSolicitud()) return;
    this.enviarNuevaSolicitudAlServidor();
  }

  emitirSolicitudDirecta(): void {
    if (!this.puedeSolicitar() || !this.mostrarFormularioNueva() || this.enviandoSolicitud()) return;
    if (!this.validarFormularioNueva()) return;
    this.enviarNuevaSolicitudAlServidor();
  }

  private validarFormularioNueva(): boolean {
    if (
      this.formNueva.titulo.trim().length < 5 ||
      !this.formNueva.modulo.trim() ||
      this.formNueva.motivoProblema.trim().length < 10 ||
      this.formNueva.resultadoEsperado.trim().length < 10
    ) {
      this.errorMensaje.set('Complete el título (mínimo 5 caracteres), el módulo, el motivo y el resultado esperado (mínimo 10 caracteres cada uno).');
      return false;
    }
    return true;
  }

  private enviarNuevaSolicitudAlServidor(): void {
    this.enviandoSolicitud.set(true);
    this.errorMensaje.set('');
    this.service.crear({
      titulo: this.formNueva.titulo.trim(),
      modulo: this.formNueva.modulo,
      motivoProblema: this.formNueva.motivoProblema.trim(),
      resultadoEsperado: this.formNueva.resultadoEsperado.trim(),
      alcanceImpacto: this.formNueva.alcanceImpacto.trim() || null,
      evidenciaInicial: this.formNueva.evidenciaInicial.trim() || null,
      idempotencyKey: this.claveIdempotenciaActiva
    }).pipe(finalize(() => this.enviandoSolicitud.set(false))).subscribe({
      next: creada => {
        this.mostrarFormularioNueva.set(false);
        this.plantillaSeleccionada.set('');
        this.pasoNuevaSolicitud.set(1);
        this.confirmacionReciente.set(creada);
        this.actualizarEnLista(creada);
        this.cerrarFicha();
        this.mostrarDetalle(creada);
      },
      error: error => this.mostrarError(error, 'No se pudo registrar la solicitud de cambio.')
    });
  }

  abrirFicha(item: SolicitudCambioDto): void {
    const version = ++this.versionFicha;
    if (this.solicitudSeleccionada()?.id !== item.id) {
      this.solicitudSeleccionada.set(null);
      this.seccionFicha.set('resumen');
      this.respuestaMensaje = '';
      this.respuestaAdjunto = '';
    }
    this.errorMensaje.set('');
    this.cargandoFicha.set(true);
    this.service.obtenerDetalle(item.id).pipe(finalize(() => {
      if (version === this.versionFicha) this.cargandoFicha.set(false);
    })).subscribe({
      next: detalle => {
        if (version === this.versionFicha) this.mostrarDetalle(detalle);
      },
      error: error => {
        if (version === this.versionFicha) this.mostrarError(error, 'No se pudo cargar la ficha del ticket.');
      }
    });
  }

  cerrarFicha(): void {
    this.versionFicha++;
    this.cargandoFicha.set(false);
    this.solicitudSeleccionada.set(null);
    this.seccionFicha.set('resumen');
    this.respuestaMensaje = '';
    this.respuestaAdjunto = '';
  }

  aplicarRespuestaRapida(evento: Event): void {
    const valor = this.extraerValorSelect(evento);
    if (valor) this.respuestaMensaje = valor;
  }

  aplicarAnexoRapido(evento: Event): void {
    const valor = this.extraerValorSelect(evento);
    if (valor) this.respuestaAdjunto = valor;
  }

  aplicarTextoEnFormAdmin(
    campo:
      | 'impactoEvaluado'
      | 'responsableNombre'
      | 'aprobadorNombre'
      | 'motivoDecision'
      | 'resumenCambio'
      | 'enlaceEvidenciaTecnica'
      | 'planReversion'
      | 'pruebaPosterior'
      | 'resultadoPrueba'
      | 'verificacionCierre'
      | 'comentario',
    evento: Event
  ): void {
    const valor = this.extraerValorSelect(evento);
    if (valor) this.formAdmin[campo] = valor;
  }

  transicionRapidaEncadenada(rutaEstados: readonly EstadoSolicitudCambio[]): void {
    const actual = this.solicitudSeleccionada();
    if (!this.esAdministrador() || !actual || !rutaEstados.length || this.operandoFicha() || this.cargandoFicha()) {
      return;
    }

    let estadoEnRuta = actual.estado;
    for (const destino of rutaEstados) {
      if (!TRANSICIONES_ADMIN[estadoEnRuta]?.includes(destino)) {
        this.errorMensaje.set('La secuencia rápida seleccionada no es válida para el estado actual del ticket.');
        return;
      }
      estadoEnRuta = destino;
    }

    const base: GestionarSolicitudCambioRequestDto = { ...this.formAdmin };
    base.responsableNombre = base.responsableNombre?.trim() ||
      this.identidadSolicitanteActual().nombre || 'Administrador del Sistema';

    if (rutaEstados.includes('APROBADA')) {
      base.impactoEvaluado = base.impactoEvaluado?.trim() ||
        'Impacto operativo evaluado en el módulo correspondiente.';
      base.aprobadorNombre = base.aprobadorNombre?.trim() ||
        this.identidadSolicitanteActual().nombre || 'Dirección General / Comité Técnico';
      base.motivoDecision = base.motivoDecision?.trim() ||
        'Aprobado por alineamiento operativo y mejora directa en tiempos de gestión.';
    }
    if (rutaEstados.includes('RESUELTA')) {
      base.resumenCambio = base.resumenCambio?.trim() ||
        'Ajuste implementado y validado en el módulo operativo correspondiente.';
      base.pruebaPosterior = base.pruebaPosterior?.trim() ||
        'OK · Verificado flujo completo en módulo operativo';
      base.resultadoPrueba = base.resultadoPrueba?.trim() || 'Aprobado · 100% conforme';
    }
    if (rutaEstados.includes('CERRADA')) {
      base.verificacionCierre = base.verificacionCierre?.trim() ||
        'Conformidad verificada en módulo operativo; ticket cerrado satisfactoriamente.';
    }
    if (rutaEstados.includes('REQUIERE_INFORMACION')) {
      base.comentario = base.comentario?.trim() ||
        'Por favor precisar grados, secciones o documento de sustento aplicable.';
    }
    if (rutaEstados.includes('RECHAZADA')) {
      base.motivoDecision = base.motivoDecision?.trim() ||
        'No viable en el ciclo actual según evaluación técnica y normativa.';
    }

    const comentarioFinal = base.comentario?.trim();
    this.iniciarOperacionFicha();
    from(rutaEstados).pipe(
      concatMap((estadoDestino, indice) => {
        const esUltimoPaso = indice === rutaEstados.length - 1;
        const mensajePaso = esUltimoPaso
          ? (comentarioFinal || `Estado actualizado a ${this.etiquetaEstado(estadoDestino)}.`)
          : `Avance automático hacia ${this.etiquetaEstado(estadoDestino)}.`;
        return this.service.gestionar(actual.id, {
          ...base,
          nuevoEstado: estadoDestino,
          comentario: mensajePaso,
          visibleDireccion: true
        });
      }),
      last(),
      finalize(() => this.operandoFicha.set(false))
    ).subscribe({
      next: actualizada => {
        this.mensajeExito.set(
          `Solicitud ${actualizada.codigo} actualizada. Estado: ${this.etiquetaEstado(actualizada.estado)}.`
        );
        this.actualizarEnLista(actualizada);
        if (this.solicitudSeleccionada()?.id === actual.id) this.mostrarDetalle(actualizada);
      },
      error: error => this.mostrarError(error, 'No se pudo completar la transición rápida de la solicitud.')
    });
  }

  enviarRespuestaInformacion(): void {
    const actual = this.solicitudSeleccionada();
    if (!this.puedeSolicitar() || actual?.estado !== 'REQUIERE_INFORMACION' || this.operandoFicha()) return;
    const comentario = this.respuestaMensaje.trim();
    if (comentario.length < 5) {
      this.errorMensaje.set('Ingrese la aclaración solicitada con al menos 5 caracteres.');
      return;
    }

    this.iniciarOperacionFicha();
    this.service.responderInformacion(actual.id, {
      comentario,
      evidenciaUrl: this.respuestaAdjunto.trim() || null
    }).pipe(finalize(() => this.operandoFicha.set(false))).subscribe({
      next: actualizada => {
        this.respuestaMensaje = '';
        this.respuestaAdjunto = '';
        this.mensajeExito.set(`Información enviada en ${actualizada.codigo}. Estado: ${this.etiquetaEstado(actualizada.estado)}.`);
        this.actualizarEnLista(actualizada);
        if (this.solicitudSeleccionada()?.id === actual.id) this.mostrarDetalle(actualizada);
      },
      error: error => this.mostrarError(error, 'No se pudo enviar la respuesta.')
    });
  }

  guardarGestionAdmin(): void {
    const actual = this.solicitudSeleccionada();
    if (!this.esAdministrador() || !actual || this.operandoFicha() || this.cargandoFicha()) return;

    const formulario = this.formAdmin;
    const destino = formulario.nuevoEstado;
    const cambiaEstado = destino !== actual.estado;
    if (!this.estadosGestionDisponibles().includes(destino)) {
      this.errorMensaje.set('La transición seleccionada no está disponible para este ticket.');
      return;
    }
    if (cambiaEstado && destino === 'RECHAZADA' && !formulario.motivoDecision?.trim()) {
      this.errorMensaje.set('El motivo de decisión es obligatorio cuando se rechaza una solicitud.');
      return;
    }
    if (cambiaEstado && destino === 'REQUIERE_INFORMACION' && !formulario.comentario?.trim()) {
      this.errorMensaje.set('Escriba qué información debe enviar Dirección.');
      return;
    }
    if (cambiaEstado && destino === 'RESUELTA' &&
        (!formulario.resumenCambio?.trim() || (!formulario.pruebaPosterior?.trim() && !formulario.resultadoPrueba?.trim()))) {
      this.errorMensaje.set('Registre el resumen del cambio y la prueba posterior o su resultado antes de resolver.');
      return;
    }
    if (cambiaEstado && destino === 'CERRADA' && !formulario.verificacionCierre?.trim()) {
      this.errorMensaje.set('Registre la verificación de cierre.');
      return;
    }

    const comentario = formulario.comentario?.trim() || null;
    this.iniciarOperacionFicha();
    this.service.gestionar(actual.id, {
      ...formulario,
      comentario,
      visibleDireccion: cambiaEstado || !!comentario
    }).pipe(finalize(() => this.operandoFicha.set(false))).subscribe({
      next: actualizada => {
        this.mensajeExito.set(`Solicitud ${actualizada.codigo} actualizada. Estado: ${this.etiquetaEstado(actualizada.estado)}.`);
        this.actualizarEnLista(actualizada);
        if (this.solicitudSeleccionada()?.id === actual.id) this.mostrarDetalle(actualizada);
      },
      error: error => this.mostrarError(error, 'No se pudo actualizar la solicitud.')
    });
  }

  reintentarCorreo(solicitudId: number, notificacionId: number): void {
    const actual = this.solicitudSeleccionada();
    if (!this.esAdministrador() || this.operandoFicha() || actual?.id !== solicitudId ||
        !actual.notificaciones.some(item => item.id === notificacionId && item.estadoEnvio === 'FALLIDO')) return;

    this.iniciarOperacionFicha();
    this.service.reintentarNotificacion(solicitudId, notificacionId)
      .pipe(finalize(() => this.operandoFicha.set(false))).subscribe({
        next: notificacion => {
          const detalle = this.solicitudSeleccionada();
          if (detalle?.id === solicitudId) {
            this.solicitudSeleccionada.set({
              ...detalle,
              notificaciones: detalle.notificaciones.map(item => item.id === notificacion.id ? notificacion : item)
            });
          }
          if (notificacion.estadoEnvio === 'ENVIADO') {
            this.mensajeExito.set(`Notificación enviada a ${notificacion.destinatarioEmail}.`);
          } else if (notificacion.estadoEnvio === 'PENDIENTE') {
            this.mensajeExito.set('El reintento está pendiente de confirmación.');
          } else {
            this.errorMensaje.set('La notificación sigue sin enviarse.');
          }
        },
        error: error => this.mostrarError(error, 'No se pudo reintentar el envío del correo.')
      });
  }

  private nuevaSolicitudVacia() {
    return {
      titulo: '',
      modulo: MODULOS_SOLICITUD_CAMBIO[0],
      motivoProblema: '',
      resultadoEsperado: '',
      alcanceImpacto: '',
      evidenciaInicial: ''
    };
  }

  private formularioGestion(item?: SolicitudCambioDto): GestionarSolicitudCambioRequestDto {
    return {
      nuevoEstado: item?.estado ?? 'RECIBIDA',
      prioridad: item?.prioridad ?? 'MEDIA',
      impactoEvaluado: item?.impactoEvaluado ?? '',
      responsableNombre: item?.responsableNombre ?? '',
      aprobadorNombre: item?.aprobadorNombre ?? '',
      motivoDecision: item?.motivoDecision ?? '',
      resumenCambio: item?.resumenCambio ?? '',
      enlaceEvidenciaTecnica: item?.enlaceEvidenciaTecnica ?? '',
      planReversion: item?.planReversion ?? '',
      pruebaPosterior: item?.pruebaPosterior ?? '',
      resultadoPrueba: item?.resultadoPrueba ?? '',
      verificacionCierre: item?.verificacionCierre ?? '',
      comentario: '',
      visibleDireccion: false
    };
  }

  private actualizarEnLista(ticket: SolicitudCambioDto): void {
    this.solicitudes.update(lista => lista.some(item => item.id === ticket.id)
      ? lista.map(item => item.id === ticket.id ? ticket : item)
      : [ticket, ...lista]);
  }

  private mostrarDetalle(ticket: SolicitudCambioDto): void {
    this.solicitudSeleccionada.set(ticket);
    this.formAdmin = this.formularioGestion(ticket);
  }

  private iniciarOperacionFicha(): void {
    this.operandoFicha.set(true);
    this.mensajeExito.set('');
    this.errorMensaje.set('');
  }

  private extraerValorSelect(evento: Event): string {
    const select = evento.target as HTMLSelectElement | null;
    const valor = select?.value?.trim() ?? '';
    if (select) select.value = '';
    return valor;
  }

  private mostrarError(error: unknown, respaldo: string): void {
    const detalle = error instanceof HttpErrorResponse ? error.error?.message : null;
    this.errorMensaje.set(typeof detalle === 'string' && detalle.trim() ? detalle : respaldo);
  }
}
