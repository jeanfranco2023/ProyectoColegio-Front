import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { AuditoriaService } from '../../core/services/auditoria.service';
import { AuditoriaComponent } from './auditoria.component';
import { PaginaAuditoriaDto, PaginaCambiosAuditoriaDto } from '../../core/models/auditoria.model';

afterEach(() => TestBed.resetTestingModule());

describe('AuditoriaComponent (Acciones del sistema)', () => {
  const dummyAccesos: PaginaAuditoriaDto = {
    content: [
      {
        id: 1,
        solicitudId: 'req-01',
        usuarioId: 10,
        usuarioNombre: 'admin.colegio',
        roles: 'ADMINISTRADOR',
        metodo: 'GET',
        ruta: '/api/v1/usuarios',
        estadoHttp: 200,
        direccionIp: '127.0.0.1',
        agenteUsuario: 'TestAgent',
        duracionMs: 45,
        fechaEvento: '2026-11-04T00:00:00Z',
      },
      {
        id: 2,
        solicitudId: 'req-02',
        usuarioId: 12,
        usuarioNombre: 'direccion.colegio',
        roles: 'DIRECCION',
        metodo: 'POST',
        ruta: '/api/v1/solicitudes-cambio',
        estadoHttp: 201,
        direccionIp: '10.0.0.5',
        agenteUsuario: 'Mozilla/5.0',
        duracionMs: 62,
        fechaEvento: '2026-11-05T14:20:00Z',
      },
    ],
    number: 0,
    size: 50,
    totalElements: 2,
    totalPages: 1,
  };

  const dummyCambios: PaginaCambiosAuditoriaDto = {
    content: [
      {
        id: 101,
        tablaAfectada: 'usuarios',
        registroId: 37,
        registroClave: 'id:37',
        accion: 'UPDATE',
        datosAnteriores: '{"activo": true}',
        datosNuevos: '{"activo": false}',
        usuarioId: 10,
        usuarioNombre: 'admin.colegio',
        roles: 'ADMINISTRADOR',
        contextoHistoricoSinSnapshot: false,
        fechaCreacion: '2026-11-04T01:00:00Z',
      },
    ],
    number: 0,
    size: 50,
    totalElements: 1,
    totalPages: 1,
  };

  it('inicia cargando la auditoría de accesos y selecciona el primer evento para la ficha lateral', () => {
    const auditoriaService = {
      listar: vi.fn(() => of(dummyAccesos)),
      listarCambios: vi.fn(() => of(dummyCambios)),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: AuditoriaService, useValue: auditoriaService }],
    });

    const component = TestBed.runInInjectionContext(() => new AuditoriaComponent());
    expect(auditoriaService.listar).toHaveBeenCalledWith(0);
    expect(component.vista()).toBe('accesos');
    expect(component.pagina()?.totalElements).toBe(2);
    expect(component.accesoSeleccionado()?.id).toBe(1);
    expect(component.nombreActor(dummyAccesos.content[0])).toBe('admin.colegio');
    expect(component.etiquetaRol(dummyAccesos.content[0])).toBe('ADMINISTRADOR');
  });

  it('filtra accesos por usuario, método HTTP, ruta y rango de fechas actualizando el contador', () => {
    const auditoriaService = {
      listar: vi.fn(() => of(dummyAccesos)),
      listarCambios: vi.fn(() => of(dummyCambios)),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: AuditoriaService, useValue: auditoriaService }],
    });

    const component = TestBed.runInInjectionContext(() => new AuditoriaComponent());
    expect(component.totalResultadosActivos()).toBe(2);

    component.filtroAccesoMetodo.set('POST');
    component.filtroAccesoRuta.set('solicitudes-cambio');
    expect(component.accesosFiltrados().length).toBe(1);
    expect(component.accesosFiltrados()[0].usuarioNombre).toBe('direccion.colegio');

    component.limpiarFiltrosAccesos();
    expect(component.accesosFiltrados().length).toBe(2);
  });

  it('carga cambios con filtros y paginación al cambiar de pestaña', () => {
    const auditoriaService = {
      listar: vi.fn(() => of(dummyAccesos)),
      listarCambios: vi.fn(() => of(dummyCambios)),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: AuditoriaService, useValue: auditoriaService }],
    });

    const component = TestBed.runInInjectionContext(() => new AuditoriaComponent());
    component.filtroFechaInicio = '2026-11-01';
    component.filtroFechaFin = '2026-11-04';
    component.filtroUsuarioId = 10;
    component.filtroTabla = 'usuarios';

    component.cargarCambios(0);

    expect(auditoriaService.listarCambios).toHaveBeenCalledWith(0, 50, {
      fechaInicio: '2026-11-01',
      fechaFin: '2026-11-04',
      usuarioId: 10,
      tabla: 'usuarios',
    });
    expect(component.vista()).toBe('cambios');
    expect(component.paginaCambios()?.totalElements).toBe(1);
    expect(component.cambios().length).toBe(1);
    expect(component.cambioSeleccionado()?.id).toBe(101);
    expect(component.nombreActorCambio(dummyCambios.content[0])).toBe('admin.colegio');
  });

  it('limpia los filtros de cambios y recarga la página 0', () => {
    const auditoriaService = {
      listar: vi.fn(() => of(dummyAccesos)),
      listarCambios: vi.fn(() => of(dummyCambios)),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: AuditoriaService, useValue: auditoriaService }],
    });

    const component = TestBed.runInInjectionContext(() => new AuditoriaComponent());
    component.filtroFechaInicio = '2026-11-01';
    component.filtroFechaFin = '2026-11-04';
    component.filtroUsuarioId = '5';
    component.filtroTabla = 'matriculas';

    component.limpiarFiltrosCambios();

    expect(component.filtroFechaInicio).toBe('');
    expect(component.filtroFechaFin).toBe('');
    expect(component.filtroUsuarioId).toBe('');
    expect(component.filtroTabla).toBe('');
    expect(auditoriaService.listarCambios).toHaveBeenCalledWith(0, 50, {});
  });
});
