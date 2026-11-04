import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { AuditoriaService } from '../../core/services/auditoria.service';
import { AuditoriaComponent } from './auditoria.component';
import { PaginaAuditoriaDto, PaginaCambiosAuditoriaDto } from '../../core/models/auditoria.model';

afterEach(() => TestBed.resetTestingModule());

describe('AuditoriaComponent', () => {
  const dummyAccesos: PaginaAuditoriaDto = {
    content: [
      {
        id: 1,
        solicitudId: 'req-01',
        usuarioId: 10,
        usuarioNombre: 'admin.colegio',
        roles: 'DIRECCION',
        metodo: 'GET',
        ruta: '/api/v1/usuarios',
        estadoHttp: 200,
        direccionIp: '127.0.0.1',
        agenteUsuario: 'TestAgent',
        duracionMs: 45,
        fechaEvento: '2026-11-04T00:00:00Z',
      },
    ],
    number: 0,
    size: 50,
    totalElements: 1,
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
        roles: 'DIRECCION',
        contextoHistoricoSinSnapshot: false,
        fechaCreacion: '2026-11-04T01:00:00Z',
      },
    ],
    number: 0,
    size: 50,
    totalElements: 1,
    totalPages: 1,
  };

  it('inicia cargando la auditoría de accesos', () => {
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
    expect(component.pagina()?.totalElements).toBe(1);
    expect(component.nombreActor(dummyAccesos.content[0])).toBe('admin.colegio');
    expect(component.etiquetaRol(dummyAccesos.content[0])).toBe('DIRECCION');
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
