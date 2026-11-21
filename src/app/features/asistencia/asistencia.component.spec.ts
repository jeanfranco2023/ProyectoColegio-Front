import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { of, Subject } from 'rxjs';
import { AcademicoService } from '../../core/services/academico.service';
import { AsistenciaService } from '../../core/services/asistencia.service';
import { AuthStore } from '../../core/state/auth.store';
import { AsistenciaComponent } from './asistencia.component';

afterEach(() => {
  vi.restoreAllMocks();
  TestBed.resetTestingModule();
});

describe('Filtros de asistencia', () => {
  it('actualiza la lista cuando cambian la búsqueda y el estado', () => {
    TestBed.configureTestingModule({ providers: [
      { provide: AsistenciaService, useValue: {} },
      { provide: AcademicoService, useValue: {} },
      { provide: AuthStore, useValue: { hasRole: vi.fn(() => false), hasAnyRole: vi.fn(() => false) } }
    ] });
    const component = TestBed.runInInjectionContext(() => new AsistenciaComponent());
    component.alumnos.set([
      { id: 1, estudiante: 'Ana QA', fecha: '2026-11-02', estado: 'PRESENTE' },
      { id: 2, estudiante: 'Benito QA', fecha: '2026-11-02', estado: 'TARDANZA' },
      { id: 3, estudiante: 'Ana del Mar QA', fecha: '2026-11-02', estado: 'TARDANZA' }
    ]);

    expect(component.alumnosFiltrados().map(alumno => alumno.id)).toEqual([1, 2, 3]);
    component.busquedaAsistencia.set('ana');
    expect(component.alumnosFiltrados().map(alumno => alumno.id)).toEqual([1, 3]);
    component.estadoFiltro.set('TARDANZA');
    expect(component.alumnosFiltrados().map(alumno => alumno.id)).toEqual([3]);
  });

  it('TUTOR carga su reporte y matrícula asignados sin pedir reporte diario ni alertas restringidas', () => {
    const asistencia = {
      obtenerMatriculasDocente: vi.fn(() => of([{matriculaId: 281, estudiante: 'Estudiante QA'}])),
      obtenerReporteDocente: vi.fn(() => of([{id: 10, matriculaId: 281, estudiante: 'Estudiante QA', fechaSesion: '2026-11-02', estado: 'PRESENTE'}])),
      obtenerReporteDiario: vi.fn(() => of({asistencias: []})),
      listarAlertasConciliacion: vi.fn(() => of([]))
    };
    const academico = {listarAnios: vi.fn(() => of([]))};
    TestBed.configureTestingModule({providers: [
      {provide: AsistenciaService, useValue: asistencia},
      {provide: AcademicoService, useValue: academico},
      {provide: AuthStore, useValue: {hasRole: (role: string) => role === 'TUTOR', hasAnyRole: (roles: string[]) => roles.includes('TUTOR')}}
    ]});
    const component = TestBed.runInInjectionContext(() => new AsistenciaComponent());

    component.ngOnInit();

    expect(asistencia.obtenerMatriculasDocente).toHaveBeenCalledOnce();
    expect(asistencia.obtenerReporteDocente).toHaveBeenCalledOnce();
    expect(asistencia.obtenerReporteDiario).not.toHaveBeenCalled();
    expect(asistencia.listarAlertasConciliacion).not.toHaveBeenCalled();
    expect(academico.listarAnios).not.toHaveBeenCalled();
    expect(component.matriculasDocente()).toEqual([{matriculaId: 281, estudiante: 'Estudiante QA'}]);
    expect(component.puedeConsultarAlertas()).toBe(false);
    expect(component.puedeRegistrar()).toBe(true);
    expect(component.puedeJustificar()).toBe(true);
    expect(component.puedeDescargarSustento()).toBe(false);
  });

  it('DIRECCION consulta reporte diario y alertas sin ver controles de conciliación', () => {
    const asistencia = {
      obtenerMatriculasDocente: vi.fn(() => of([])),
      obtenerReporteDocente: vi.fn(() => of([])),
      obtenerReporteDiario: vi.fn(() => of({asistencias: []})),
      listarAlertasConciliacion: vi.fn(() => of([]))
    };
    const academico = {listarAnios: vi.fn(() => of([]))};
    TestBed.configureTestingModule({providers: [
      {provide: AsistenciaService, useValue: asistencia},
      {provide: AcademicoService, useValue: academico},
      {provide: AuthStore, useValue: {hasRole: (role: string) => role === 'DIRECCION', hasAnyRole: (roles: string[]) => roles.includes('DIRECCION')}}
    ]});
    const component = TestBed.runInInjectionContext(() => new AsistenciaComponent());

    component.ngOnInit();

    expect(asistencia.obtenerReporteDiario).toHaveBeenCalledOnce();
    expect(asistencia.listarAlertasConciliacion).toHaveBeenCalledOnce();
    expect(asistencia.obtenerReporteDocente).not.toHaveBeenCalled();
    expect(academico.listarAnios).not.toHaveBeenCalled();
    expect(component.puedeConsultarAlertas()).toBe(true);
    expect(component.puedeGestionarBiometria()).toBe(false);
    expect(component.puedeRegistrar()).toBe(false);
    expect(component.puedeDescargarSustento()).toBe(true);
  });

  it('importarCsvBiometrico procesa archivo y refresca la lista de aula en tiempo real', () => {
    const mockRes = { id: 1, nombreArchivo: 'test.csv', totalFilas: 2, marcasValidas: 2, marcasErroneas: 0, estado: 'COMPLETADO' as const };
    const asistencia = {
      importarArchivoBiometrico: vi.fn(() => of(mockRes)),
      obtenerReporteDiario: vi.fn(() => of({ asistencias: [] })),
      listarAlertasConciliacion: vi.fn(() => of([]))
    };
    TestBed.configureTestingModule({ providers: [
      { provide: AsistenciaService, useValue: asistencia },
      { provide: AcademicoService, useValue: { listarAnios: vi.fn(() => of([])) } },
      { provide: AuthStore, useValue: { hasRole: (r: string) => r === 'AUXILIAR', hasAnyRole: (roles: string[]) => roles.includes('AUXILIAR') } }
    ] });
    const component = TestBed.runInInjectionContext(() => new AsistenciaComponent());
    component.archivoBiometrico = new File(['dni,fechaHora,dispositivoCodigo\n'], 'marcas.csv');

    component.importarCsvBiometrico();

    expect(asistencia.importarArchivoBiometrico).toHaveBeenCalledOnce();
    expect(asistencia.obtenerReporteDiario).toHaveBeenCalled();
    expect(component.etapaImportacion()).toBe(3);
    expect(component.ultimoResultadoImportacion()).toEqual(mockRes);
    expect(component.mensaje()).toContain('Archivo CSV importado: 2 asistencia(s) reflejadas');
  });

  it('importarCsvBiometrico auto-ajusta fechaSeleccionada cuando hay fecha detectada en el archivo', () => {
    const mockRes = { id: 1, nombreArchivo: 'test.csv', totalFilas: 1, marcasValidas: 1, marcasErroneas: 0, estado: 'COMPLETADO' as const };
    const asistencia = {
      importarArchivoBiometrico: vi.fn(() => of(mockRes)),
      obtenerReporteDiario: vi.fn(() => of({ asistencias: [] })),
      listarAlertasConciliacion: vi.fn(() => of([]))
    };
    TestBed.configureTestingModule({ providers: [
      { provide: AsistenciaService, useValue: asistencia },
      { provide: AcademicoService, useValue: { listarAnios: vi.fn(() => of([])) } },
      { provide: AuthStore, useValue: { hasRole: (r: string) => r === 'AUXILIAR', hasAnyRole: (roles: string[]) => roles.includes('AUXILIAR') } }
    ] });
    const component = TestBed.runInInjectionContext(() => new AsistenciaComponent());
    component.archivoBiometrico = new File(['dni,fechaHora,dispositivoCodigo\n74839201,2026-11-06T07:45:00-05:00,PUERTA-1'], 'marcas.csv');
    component.csvFechaDetectada.set('2026-11-06');
    component.ajustarFechaAlImportar = true;

    component.importarCsvBiometrico();

    expect(component.fechaSeleccionada).toBe('2026-11-06');
    expect(asistencia.obtenerReporteDiario).toHaveBeenCalledWith('2026-11-06');
  });

  it('estructura la importación CSV/XLSX en 3 etapas claras (selección, revisión previa y resultado)', () => {
    TestBed.configureTestingModule({ providers: [
      { provide: AsistenciaService, useValue: {} },
      { provide: AcademicoService, useValue: {} },
      { provide: AuthStore, useValue: { hasRole: () => false, hasAnyRole: () => false } }
    ] });
    const component = TestBed.runInInjectionContext(() => new AsistenciaComponent());

    expect(component.etapaImportacion()).toBe(1);

    const archivoValido = new File(['dni,fechaHora,dispositivoCodigo\n74839201,2026-11-06T07:45:00-05:00,PUERTA-1'], 'marcas.csv', { type: 'text/csv' });
    component.seleccionarCsvBiometrico({ target: { files: [archivoValido] } } as unknown as Event);

    expect(component.archivoBiometrico).toBe(archivoValido);
    expect(component.etapaImportacion()).toBe(2);

    const archivoInvalido = new File(['invalido'], 'documento.txt', { type: 'text/plain' });
    component.seleccionarCsvBiometrico({ target: { files: [archivoInvalido] } } as unknown as Event);

    expect(component.archivoBiometrico).toBeNull();
    expect(component.etapaImportacion()).toBe(1);
    expect(component.error()).toBe('Selecciona un CSV o XLSX de hasta 5 MB.');
  });

  it('descarga un CSV compatible con las tres columnas del lector biométrico y fechas hábiles', async () => {
    TestBed.configureTestingModule({ providers: [
      { provide: AsistenciaService, useValue: {} },
      { provide: AcademicoService, useValue: {} },
      { provide: AuthStore, useValue: { hasRole: () => false, hasAnyRole: () => false } }
    ] });
    const component = TestBed.runInInjectionContext(() => new AsistenciaComponent());
    const createUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    const revokeUrlSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    component.descargarPlantillaCsv();

    expect(createUrlSpy).toHaveBeenCalledOnce();
    expect(revokeUrlSpy).toHaveBeenCalledOnce();
    const blob = createUrlSpy.mock.calls[0][0] as Blob;
    const contenido = await new Promise<string>((resolve, reject) => {
      const lector = new FileReader();
      lector.onload = () => resolve(String(lector.result));
      lector.onerror = () => reject(lector.error);
      lector.readAsText(blob);
    });
    const lineas = contenido.trim().split(/\r?\n/);
    expect(lineas[0]).toBe('dni,fechaHora,dispositivoCodigo');
    for (const linea of lineas.slice(1)) {
      const columnas = linea.split(',');
      expect(columnas).toHaveLength(3);
      expect(columnas[1]).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-05:00$/);
      expect([0, 6]).not.toContain(new Date(columnas[1]).getUTCDay());
    }
  });

  it('conserva la sección del reporte AUXILIAR y excluye filas sin sección del filtro específico', () => {
    const asistencia = {
      obtenerReporteDiario: vi.fn(() => of({ asistencias: [
        { id: 1, nombreEstudiante: 'Alumna de A', seccionId: 81, seccion: '5.º Secundaria A', estado: 'PRESENTE', fechaSesion: '2026-11-06' },
        { id: 2, nombreEstudiante: 'Alumno de B', seccionId: 82, seccion: '5.º Secundaria B', estado: 'PRESENTE', fechaSesion: '2026-11-06' },
        { id: 3, nombreEstudiante: 'Registro sin sección', estado: 'PRESENTE', fechaSesion: '2026-11-06' }
      ] })),
      listarAlertasConciliacion: vi.fn(() => of([]))
    };
    TestBed.configureTestingModule({ providers: [
      { provide: AsistenciaService, useValue: asistencia },
      { provide: AcademicoService, useValue: {} },
      { provide: AuthStore, useValue: { hasRole: (r: string) => r === 'AUXILIAR', hasAnyRole: (roles: string[]) => roles.includes('AUXILIAR') } }
    ] });
    const component = TestBed.runInInjectionContext(() => new AsistenciaComponent());
    component.cargarAsistencia();
    expect(component.seccionesDisponibles()).toEqual([
      { id: 81, nombre: '5.º Secundaria A' },
      { id: 82, nombre: '5.º Secundaria B' }
    ]);
    component.seccionFiltro.set(81);
    expect(component.alumnosFiltrados().map(alumno => alumno.id)).toEqual([1]);
  });

  it('refresca los colores del mes después del CSV y descarta una respuesta anterior a la importación', () => {
    const respuestaAnterior = new Subject<string[]>();
    const asistencia = {
      obtenerFechasConRegistros: vi.fn()
        .mockReturnValueOnce(respuestaAnterior)
        .mockReturnValue(of(['2026-11-06'])),
      importarArchivoBiometrico: vi.fn(() => of({
        id: 'lote-1', estado: 'COMPLETADO', marcasValidas: 1, marcasErroneas: 0
      })),
      obtenerReporteDiario: vi.fn(() => of({ asistencias: [] })),
      listarAlertasConciliacion: vi.fn(() => of([]))
    };
    TestBed.configureTestingModule({ providers: [
      { provide: AsistenciaService, useValue: asistencia },
      { provide: AcademicoService, useValue: {} },
      { provide: AuthStore, useValue: { hasRole: (r: string) => r === 'AUXILIAR', hasAnyRole: (roles: string[]) => roles.includes('AUXILIAR') } }
    ] });
    const component = TestBed.runInInjectionContext(() => new AsistenciaComponent());
    component.fechaSeleccionada = '2026-11-06';
    component.cargarFechasConRegistros('2026-11');
    component.archivoBiometrico = new File(['dni,fechaHora,dispositivoCodigo'], 'marcas.csv');
    component.importarCsvBiometrico();
    expect(asistencia.obtenerFechasConRegistros).toHaveBeenCalledTimes(2);
    expect(component.fechasConRegistros()).toEqual(['2026-11-06']);
    respuestaAnterior.next([]);
    respuestaAnterior.complete();
    component.cargarFechasConRegistros('2026-11');
    expect(asistencia.obtenerFechasConRegistros).toHaveBeenCalledTimes(2);
    expect(component.fechasConRegistros()).toEqual(['2026-11-06']);
  });
});
