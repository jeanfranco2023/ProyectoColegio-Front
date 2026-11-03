import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { NEVER, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { AcademicoService } from '../../core/services/academico.service';
import { MatriculaService } from '../../core/services/matricula.service';
import { AuthStore } from '../../core/state/auth.store';
import { ApoderadoResponseDto, EstudianteResponseDto, FichaMatriculaResponseDto } from '../../core/models/matricula.model';
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
      vincularApoderado: vi.fn(() => of({}))
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
});
