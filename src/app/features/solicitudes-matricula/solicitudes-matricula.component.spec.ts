import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { SolicitudMatriculaPublicaAdminDto } from '../../core/models/matricula-publica.model';
import { AcademicoService } from '../../core/services/academico.service';
import { MatriculaPublicaService } from '../../core/services/matricula-publica.service';
import { AuthStore } from '../../core/state/auth.store';
import { SolicitudesMatriculaComponent } from './solicitudes-matricula.component';

function crearSolicitud(
  cambios: Partial<SolicitudMatriculaPublicaAdminDto> = {}
): SolicitudMatriculaPublicaAdminDto {
  return {
    id: 'sol-1',
    estado: 'DOCUMENTOS_PENDIENTES',
    nombreEstudiante: 'Mateo Quispe Pérez',
    documentoEstudiante: '78901234',
    nombreApoderado: 'Rosa Pérez',
    celularApoderado: '999888777',
    emailApoderado: 'rosa@example.test',
    anioLectivoId: 1,
    gradoId: 10,
    seccionId: null,
    creadaAt: '2026-11-10T10:00:00Z',
    requiereAutorizacionEdad: false,
    motivoAutorizacionEdad: null,
    autorizadoPorUsuarioId: null,
    fechaAutorizacionEdad: null,
    estudianteId: null,
    matriculaId: null,
    modalidadIngreso: 'REGULAR',
    colegioProcedencia: null,
    documentos: [
      {
        tipo: 'PARTIDA_NACIMIENTO',
        estado: 'VALIDADO',
        observacion: null,
        versionId: 'v1',
        iaValida: true,
        dniApiCoincide: true,
        estadoFirma: 'NO_APLICA',
        detalleFirma: null,
        vinculoParentalCoincide: true
      },
      {
        tipo: 'DNI_C4',
        estado: 'PENDIENTE',
        observacion: null,
        versionId: null,
        iaValida: null,
        dniApiCoincide: null,
        estadoFirma: null,
        detalleFirma: null,
        vinculoParentalCoincide: null
      },
      {
        tipo: 'RECIBO_SERVICIO',
        estado: 'PENDIENTE',
        observacion: null,
        versionId: null,
        iaValida: null,
        dniApiCoincide: null,
        estadoFirma: null,
        detalleFirma: null,
        vinculoParentalCoincide: null
      }
    ],
    ...cambios
  };
}

function preparar(lista: SolicitudMatriculaPublicaAdminDto[]) {
  const apiMock = {
    listarAdmin: vi.fn(() => of(lista)),
    darVistoBuenoAdmin: vi.fn(),
    rechazarAdmin: vi.fn()
  };
  const academicoMock = {
    listarAnios: vi.fn(() => of([{ id: 1, anio: 2026 }])),
    listarNiveles: vi.fn(() => of([{ id: 2, nombre: 'Secundaria' }])),
    listarGrados: vi.fn(() => of([{ id: 10, nombre: '1.° Secundaria', nivelId: 2 }])),
    listarSecciones: vi.fn(() => of([]))
  };

  TestBed.configureTestingModule({
    imports: [SolicitudesMatriculaComponent],
    providers: [
      { provide: MatriculaPublicaService, useValue: apiMock },
      { provide: AcademicoService, useValue: academicoMock },
      { provide: AuthStore, useValue: { hasAnyRole: () => true } }
    ]
  });

  const fixture = TestBed.createComponent(SolicitudesMatriculaComponent);
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance };
}

describe('SolicitudesMatriculaComponent', () => {
  it('filtra por chips KPI, modalidad y búsqueda textual, y restablece con limpiarFiltros', () => {
    const { component } = preparar([
      crearSolicitud({ id: '1', estado: 'DOCUMENTOS_PENDIENTES', modalidadIngreso: 'REGULAR', nombreEstudiante: 'Lucía Vargas' }),
      crearSolicitud({
        id: '2',
        estado: 'AUTORIZACION_EDAD_PENDIENTE',
        modalidadIngreso: 'TRASLADO',
        nombreEstudiante: 'Carlos Huamán',
        colegioProcedencia: 'I.E. Santa Rosa'
      })
    ]);

    expect(component.solicitudesFiltradas().length).toBe(2);

    component.aplicarFiltroEstadoRapido('AUTORIZACION_EDAD_PENDIENTE');
    expect(component.filtroEstado()).toBe('AUTORIZACION_EDAD_PENDIENTE');
    expect(component.solicitudesFiltradas().map(s => s.id)).toEqual(['2']);

    component.aplicarFiltroEstadoRapido('AUTORIZACION_EDAD_PENDIENTE');
    expect(component.filtroEstado()).toBe('');
    expect(component.solicitudesFiltradas().length).toBe(2);

    component.filtroModalidad.set('TRASLADO');
    component.busqueda.set('santa rosa');
    expect(component.solicitudesFiltradas().map(s => s.id)).toEqual(['2']);

    component.limpiarFiltros();
    expect(component.solicitudesFiltradas().length).toBe(2);
  });

  it('abre observación directa por documento y autocompleta motivo frecuente sin escribir', () => {
    const solicitud = crearSolicitud({
      id: '3',
      modalidadIngreso: 'TRASLADO',
      documentos: [
        ...crearSolicitud().documentos,
        {
          tipo: 'CERTIFICADO_ESTUDIOS',
          estado: 'PENDIENTE',
          observacion: null,
          versionId: 'v4',
          iaValida: null,
          dniApiCoincide: null,
          estadoFirma: null,
          detalleFirma: null,
          vinculoParentalCoincide: null
        }
      ]
    });
    const { component } = preparar([solicitud]);

    component.abrirObservacionDocumento(solicitud, 'CERTIFICADO_ESTUDIOS');
    expect(component.documento()).toBe('CERTIFICADO_ESTUDIOS');
    expect(component.motivosDocumentoActual().length).toBeGreaterThan(0);

    const motivoElegido = component.motivosDocumentoActual()[0];
    const selectSimulado = document.createElement('select');
    const opcion = document.createElement('option');
    opcion.value = motivoElegido;
    selectSimulado.appendChild(opcion);
    selectSimulado.value = motivoElegido;

    component.aplicarMotivoObservacion({ target: selectSimulado } as unknown as Event);
    expect(component.observacion()).toBe(motivoElegido);
    expect(selectSimulado.value).toBe('');
  });

  it('autocompleta sustento institucional de excepción de edad con selector frecuente', () => {
    const { component } = preparar([crearSolicitud({ estado: 'AUTORIZACION_EDAD_PENDIENTE', requiereAutorizacionEdad: true })]);
    const motivoEdad = component.motivosAutorizacionEdad[0];
    const selectSimulado = document.createElement('select');
    const opcion = document.createElement('option');
    opcion.value = motivoEdad;
    selectSimulado.appendChild(opcion);
    selectSimulado.value = motivoEdad;

    component.aplicarMotivoEdad({ target: selectSimulado } as unknown as Event);
    expect(component.motivoEdad()).toBe(motivoEdad);
    expect(component.motivoEdad().length).toBeGreaterThanOrEqual(10);
    expect(selectSimulado.value).toBe('');
  });
});
