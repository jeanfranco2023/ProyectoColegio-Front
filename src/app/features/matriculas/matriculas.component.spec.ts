import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { NEVER, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { AcademicoService } from '../../core/services/academico.service';
import { MatriculaService } from '../../core/services/matricula.service';
import { MatriculaPublicaService } from '../../core/services/matricula-publica.service';
import { AuthStore } from '../../core/state/auth.store';
import { ApoderadoResponseDto, EstudianteResponseDto, FichaMatriculaResponseDto } from '../../core/models/matricula.model';
import { SolicitudMatriculaPublicaAdminDto } from '../../core/models/matricula-publica.model';
import { MatriculasComponent } from './matriculas.component';

describe('MatriculasComponent', () => {
  it('normaliza una nota de pago aunque termine en una cadena larga de puntuación', () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthStore, useValue: {} },
        { provide: MatDialog, useValue: {} },
        { provide: MatriculaService, useValue: {} },
        { provide: AcademicoService, useValue: {} }
      ]
    });
    const componente = TestBed.runInInjectionContext(() => new MatriculasComponent());
    const ficha = {
      matricula: { observaciones: `PÉNDIENTE DE PAGO${'.!;:,'.repeat(20_000)}  ` }
    } as unknown as FichaMatriculaResponseDto;

    expect(componente.observacionesFicha(ficha)).toBe('Sin observaciones registradas');
  });

  it('envía el apoderado elegido como responsable económico del estudiante', () => {
    const apoderado: ApoderadoResponseDto = {
      id: 141,
      usuarioId: 8,
      numeroDocumento: '90000001',
      nombres: 'APODERADO QA',
      apellidoPaterno: 'SINTETICO',
      apellidoMaterno: 'FAMILIAR'
    };
    const matricula = {
      listarApoderados: vi.fn(() => of([apoderado])),
      vincularApoderado: vi.fn(() => of({})),
      listarEstudiantes: vi.fn(() => of([]))
    };
    const dialogRef = { afterClosed: () => NEVER, close: vi.fn() };
    const dialog = { open: vi.fn(() => dialogRef) };
    TestBed.configureTestingModule({ providers: [
      { provide: AuthStore, useValue: {} },
      { provide: MatDialog, useValue: dialog },
      { provide: MatriculaService, useValue: matricula },
      { provide: AcademicoService, useValue: {} }
    ] });
    const componente = TestBed.runInInjectionContext(() => new MatriculasComponent());
    const estudiante = {
      id: 151,
      numeroDocumento: '90000002',
      nombres: 'ALUMNO QA',
      apellidoPaterno: 'SINTETICO',
      apellidoMaterno: 'ESTUDIANTE'
    } as EstudianteResponseDto;

    componente.abrirDialogoVinculoApoderado(estudiante);
    componente.apoderadoIdSeleccionado = apoderado.id;
    componente.guardarVinculoApoderado();

    expect(matricula.vincularApoderado).toHaveBeenCalledWith({
      estudianteId: estudiante.id,
      apoderadoId: apoderado.id,
      parentesco: 'PADRE',
      esResponsableEconomico: true,
      tieneCustodia: false,
      permiteRecojo: true
    });
    expect(componente.mensajeExito()).toBe('Apoderado vinculado al estudiante.');
  });

  it('excluye del catálogo presencial los grados cuyas secciones están completamente llenas (ej. 5° de Secundaria)', () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthStore, useValue: { hasRole: vi.fn(() => true) } },
        { provide: MatDialog, useValue: {} },
        { provide: MatriculaService, useValue: {} },
        { provide: AcademicoService, useValue: {} }
      ]
    });
    const componente = TestBed.runInInjectionContext(() => new MatriculasComponent());

    // Grado 13 (4° Secundaria) con vacantes y Grado 14 (5° Secundaria) con todas sus secciones llenas (30/30)
    componente.gradosMap.set(13, '4° de Secundaria');
    componente.gradosMap.set(14, '5° de Secundaria');
    componente.catalogoGradosPresencial.set([
      { id: 13, nombre: '4° de Secundaria', nivelId: 3 },
      { id: 14, nombre: '5° de Secundaria', nivelId: 3 }
    ]);
    componente.seccionesPresencial.set([
      { id: 49, anioLectivoId: 1, gradoId: 13, nivelId: 3, letra: 'A', cupoMaximo: 35, vacantesOcupadas: 30 },
      { id: 53, anioLectivoId: 1, gradoId: 14, nivelId: 3, letra: 'A', cupoMaximo: 30, vacantesOcupadas: 30 },
      { id: 54, anioLectivoId: 1, gradoId: 14, nivelId: 3, letra: 'B', cupoMaximo: 30, vacantesOcupadas: 30 },
      { id: 55, anioLectivoId: 1, gradoId: 14, nivelId: 3, letra: 'C', cupoMaximo: 30, vacantesOcupadas: 30 }
    ]);

    const gradosDisponibles = componente.listaGradosPresencial();
    expect(gradosDisponibles.map(g => g.id)).toContain(13);
    expect(gradosDisponibles.map(g => g.id)).not.toContain(14); // 5° de Secundaria NO debe figurar
  });

  it('bloquea avanzar al paso 2 presencial si la sección seleccionada está llena', () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthStore, useValue: { hasRole: vi.fn(() => true) } },
        { provide: MatDialog, useValue: {} },
        { provide: MatriculaService, useValue: {} },
        { provide: AcademicoService, useValue: {} }
      ]
    });
    const componente = TestBed.runInInjectionContext(() => new MatriculasComponent());
    componente.presencialAnioId = 1;
    componente.presencialGradoId = 14;
    componente.presencialSeccionId = 53;
    componente.seccionesPresencial.set([
      { id: 53, anioLectivoId: 1, gradoId: 14, nivelId: 3, letra: 'A', cupoMaximo: 30, vacantesOcupadas: 30 }
    ]);

    componente.avanzarAPaso2Presencial();
    expect(componente.errorPresencial()).toContain('llena');
    expect(componente.etapaPresencial()).toBe(1);
  });

  it('excluye secciones llenas, letra D y aulas inhabilitadas en asignar matrícula y presencial', () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthStore, useValue: { hasRole: vi.fn(() => true) } },
        { provide: MatDialog, useValue: {} },
        { provide: MatriculaService, useValue: {} },
        { provide: AcademicoService, useValue: {} }
      ]
    });
    const componente = TestBed.runInInjectionContext(() => new MatriculasComponent());
    componente.aulasInactivasCodigos.set(new Set(['SEC-4-B']));
    componente.secciones.set([
      { id: 1, anioLectivoId: 1, gradoId: 10, nivelId: 3, letra: 'A', cupoMaximo: 30, vacantesOcupadas: 30, aulaFisica: 'SEC-5-A' },
      { id: 2, anioLectivoId: 1, gradoId: 11, nivelId: 3, letra: 'B', cupoMaximo: 30, vacantesOcupadas: 10, aulaFisica: 'SEC-4-B' },
      { id: 3, anioLectivoId: 1, gradoId: 5, nivelId: 2, letra: 'D', cupoMaximo: 30, vacantesOcupadas: 0, aulaFisica: 'PRI-5-D' },
      { id: 4, anioLectivoId: 1, gradoId: 11, nivelId: 3, letra: 'A', cupoMaximo: 30, vacantesOcupadas: 15, aulaFisica: 'SEC-4-A' }
    ]);
    componente.seccionesPresencial.set(componente.secciones());
    componente.presencialGradoId = 11;

    expect(componente.seccionesDisponiblesParaAsignar().map(s => s.id)).toEqual([4]);
    expect(componente.seccionesFiltradasPresencial().map(s => s.id)).toEqual([4]);

    componente.quitarConstanciaPresencial();
    expect(componente.presencialConstancia()).toBeNull();
    expect(componente.presencialConstanciaPreview()).toBeNull();
  });

  it('excluye del padrón a quienes ya tienen sección asignada, conserva pendientes públicos y asigna nivel/grado por defecto', () => {
    const asignarSeccionSpy = vi.fn(() => of({
      id: 'sol-1',
      estado: 'MATRICULADA',
      nombreEstudiante: 'PUBLICA, ANA',
      anioLectivoId: 3,
      gradoId: 6,
      seccionId: 20,
      estudianteId: 102,
      matriculaId: 500
    } as unknown as SolicitudMatriculaPublicaAdminDto));

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthStore, useValue: { hasRole: vi.fn(() => true) } },
        { provide: MatDialog, useValue: { open: vi.fn(() => ({ afterClosed: () => NEVER, close: vi.fn() })) } },
        {
          provide: MatriculaService,
          useValue: {
            listarEstudiantes: vi.fn(() => of([])),
            listarPorAnio: vi.fn(() => of([])),
            listarEstudianteIdsMatriculados: vi.fn(() => of([101, 102]))
          }
        },
        {
          provide: AcademicoService,
          useValue: {
            listarSecciones: vi.fn(() => of([])),
            listarAulas: vi.fn(() => of([]))
          }
        },
        { provide: MatriculaPublicaService, useValue: { asignarSeccion: asignarSeccionSpy, listarAdmin: vi.fn(() => of([])) } }
      ]
    });

    const componente = TestBed.runInInjectionContext(() => new MatriculasComponent());
    componente.listaEstudiantes.set([
      { id: 101, numeroDocumento: '11111111', nombres: 'Luis', apellidoPaterno: 'Ya', apellidoMaterno: 'Matriculado' } as EstudianteResponseDto,
      { id: 102, numeroDocumento: '22222222', nombres: 'Ana', apellidoPaterno: 'Publica', apellidoMaterno: 'Pendiente' } as EstudianteResponseDto,
      { id: 103, numeroDocumento: '33333333', nombres: 'Mario', apellidoPaterno: 'Sin', apellidoMaterno: 'Matricula' } as EstudianteResponseDto
    ]);
    componente.estudiantesConSeccionAsignada.set(new Set([101]));
    componente.solicitudesPublicasPendientes.set([
      {
        id: 'sol-1',
        estado: 'PAGO_CONFIRMADO_PENDIENTE_ASIGNACION',
        nombreEstudiante: 'Publica Pendiente, Ana',
        documentoEstudiante: '22222222',
        nombreApoderado: 'Apoderado',
        celularApoderado: '999999999',
        emailApoderado: 'apo@test.com',
        anioLectivoId: 3,
        gradoId: 6,
        seccionId: null,
        documentos: [],
        creadaAt: '2026-11-11T00:00:00Z',
        estudianteId: 102,
        matriculaId: 500,
        requiereAutorizacionEdad: false,
        motivoAutorizacionEdad: null,
        autorizadoPorUsuarioId: null,
        fechaAutorizacionEdad: null
      }
    ]);
    componente.catalogoGradosPresencial.set([
      { id: 1, nombre: 'Inicial 5 años', nivelId: 1 },
      { id: 6, nombre: '4° de Primaria', nivelId: 2 }
    ]);
    componente.secciones.set([
      { id: 10, anioLectivoId: 3, gradoId: 1, nivelId: 1, letra: 'A', cupoMaximo: 30, vacantesOcupadas: 0 },
      { id: 20, anioLectivoId: 3, gradoId: 6, nivelId: 2, letra: 'A', cupoMaximo: 30, vacantesOcupadas: 0 },
      { id: 21, anioLectivoId: 3, gradoId: 6, nivelId: 2, letra: 'B', cupoMaximo: 30, vacantesOcupadas: 5 }
    ]);

    expect(componente.estudiantesEnPadron().map(e => e.id)).toEqual([102, 103]);

    componente.onEstudianteSeleccionadoAsignar(102);
    expect(componente.anioLectivoId).toBe(3);
    expect(componente.asignarNivelId).toBe(2);
    expect(componente.asignarGradoId).toBe(6);
    expect(componente.seccionesFiltradasParaAsignar().map(s => s.id)).toEqual([20, 21]);

    componente.seccionIdSeleccionada = 21;
    componente.solicitar();
    expect(asignarSeccionSpy).toHaveBeenCalledWith('sol-1', 21);
    expect(componente.pestanaActiva()).toBe('matriculas');
  });
});
