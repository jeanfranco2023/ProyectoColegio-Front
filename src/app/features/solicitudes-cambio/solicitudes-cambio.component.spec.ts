import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { afterEach, describe, expect, it } from 'vitest';
import { environment } from '../../../environments/environment';
import { RolNombre } from '../../core/models/auth.model';
import { NotificacionCorreoSolicitudDto, SolicitudCambioDto } from '../../core/models/solicitud-cambio.model';
import { AuthStore } from '../../core/state/auth.store';
import { SolicitudesCambioComponent } from './solicitudes-cambio.component';

const base = `${environment.apiUrl}/solicitudes-cambio`;

afterEach(() => {
  TestBed.inject(HttpTestingController).verify();
  TestBed.resetTestingModule();
});

function preparar(rol: RolNombre, codigo?: string) {
  TestBed.configureTestingModule({
    imports: [SolicitudesCambioComponent],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: ActivatedRoute, useValue: { queryParamMap: of(convertToParamMap(codigo ? { codigo } : {})) } },
      {
        provide: AuthStore,
        useValue: {
          hasRole: (r: RolNombre) => r === rol,
          user: signal({ username: 'cuenta.prueba', nombreCompleto: 'Cuenta de prueba', email: 'cuenta@example.test' })
        }
      }
    ]
  });
  const fixture = TestBed.createComponent(SolicitudesCambioComponent);
  return { fixture, component: fixture.componentInstance, http: TestBed.inject(HttpTestingController) };
}

function ticket(cambios: Partial<SolicitudCambioDto> = {}): SolicitudCambioDto {
  return {
    id: 12,
    codigo: 'CH-026',
    titulo: 'Mejorar el padrón de matrícula',
    modulo: 'Matrículas',
    motivoProblema: 'La consulta del padrón necesita más contexto.',
    resultadoEsperado: 'Mostrar el año escolar del registro.',
    alcanceImpacto: null,
    evidenciaInicial: null,
    solicitanteId: 20,
    solicitanteNombre: 'Cuenta de prueba',
    solicitanteEmail: 'cuenta@example.test',
    estado: 'RECIBIDA',
    prioridad: 'MEDIA',
    impactoEvaluado: null,
    responsableId: null,
    responsableNombre: null,
    aprobadorNombre: null,
    registradoDecisionPor: null,
    fechaDecision: null,
    motivoDecision: null,
    resumenCambio: null,
    enlaceEvidenciaTecnica: null,
    planReversion: null,
    pruebaPosterior: null,
    resultadoPrueba: null,
    verificacionCierre: null,
    cerradoPorNombre: null,
    fechaSolicitud: '2026-11-10T09:00:00Z',
    fechaActualizacion: '2026-11-10T09:00:00Z',
    fechaCierre: null,
    eventos: [],
    notificaciones: [],
    ...cambios
  };
}

describe('SolicitudesCambioComponent', () => {
  it('emite un ticket de Dirección con el contrato real y reusa la clave si el servidor rechaza el envío', () => {
    const { component, http } = preparar('DIRECCION');
    http.expectOne({ method: 'GET', url: `${base}/mias` }).flush([]);
    expect(component.solicitudes()).toEqual([]);

    component.iniciarNuevaSolicitud();
    component.avanzarARevision();
    expect(component.pasoNuevaSolicitud()).toBe(1);

    const creada = ticket();
    component.formNueva = {
      titulo: creada.titulo,
      modulo: creada.modulo,
      motivoProblema: creada.motivoProblema,
      resultadoEsperado: creada.resultadoEsperado,
      alcanceImpacto: '',
      evidenciaInicial: ''
    };
    component.avanzarARevision();
    expect(component.pasoNuevaSolicitud()).toBe(2);

    component.confirmarEnvioSolicitud();
    component.confirmarEnvioSolicitud();
    const primerEnvio = http.expectOne({ method: 'POST', url: base });
    expect(primerEnvio.request.body).toEqual({
      titulo: creada.titulo,
      modulo: creada.modulo,
      motivoProblema: creada.motivoProblema,
      resultadoEsperado: creada.resultadoEsperado,
      alcanceImpacto: null,
      evidenciaInicial: null,
      idempotencyKey: expect.any(String)
    });
    primerEnvio.flush({ message: 'No se pudo guardar el ticket' }, { status: 500, statusText: 'Server Error' });
    expect(component.confirmacionReciente()).toBeNull();
    expect(component.errorMensaje()).toBe('No se pudo guardar el ticket');
    expect(component.solicitudes()).toEqual([]);

    component.confirmarEnvioSolicitud();
    const reintento = http.expectOne({ method: 'POST', url: base });
    expect(reintento.request.body.idempotencyKey).toBe(primerEnvio.request.body.idempotencyKey);
    reintento.flush(creada);
    expect(component.confirmacionReciente()?.codigo).toBe('CH-026');
    expect(component.solicitudes()).toEqual([creada]);
  });

  it('abre el enlace del ticket y envía la aclaración de Dirección al endpoint de información', () => {
    const { component, http } = preparar('DIRECCION', 'CH-026');
    const pendiente = ticket({ estado: 'REQUIERE_INFORMACION' });
    http.expectOne({ method: 'GET', url: `${base}/mias` }).flush([pendiente]);
    http.expectOne({ method: 'GET', url: `${base}/12` }).flush(pendiente);

    component.respuestaMensaje = 'Corresponde al año de la matrícula activa.';
    component.respuestaAdjunto = 'Referencia del informe';
    component.enviarRespuestaInformacion();
    const solicitud = http.expectOne({ method: 'POST', url: `${base}/12/informacion` });
    expect(solicitud.request.body).toEqual({
      comentario: 'Corresponde al año de la matrícula activa.',
      evidenciaUrl: 'Referencia del informe'
    });
    solicitud.flush(ticket({
      estado: 'EN_EVALUACION',
      eventos: [{
        id: 42,
        actorNombre: 'Cuenta de prueba',
        actorRol: 'DIRECCION',
        estadoAnterior: 'REQUIERE_INFORMACION',
        estadoNuevo: 'EN_EVALUACION',
        tipoEvento: 'INFORMACION_ADICIONAL',
        comentario: 'Corresponde al año de la matrícula activa.',
        visibleDireccion: true,
        evidenciaUrl: 'Referencia del informe',
        fechaEvento: '2026-11-10T09:02:00Z'
      }]
    }));
    expect(component.solicitudSeleccionada()?.estado).toBe('EN_EVALUACION');
    expect(component.conversacion().map(evento => evento.id)).toEqual([42]);
  });

  it('Administrador gestiona transiciones permitidas y muestra el resultado real del reintento SMTP', () => {
    const { component, fixture, http } = preparar('ADMINISTRADOR');
    const fallida: NotificacionCorreoSolicitudDto = {
      id: 7,
      destinatarioEmail: 'cuenta@example.test',
      asunto: 'Aviso de prueba',
      cuerpoResumen: 'Cambio actualizado',
      estadoEnvio: 'FALLIDO',
      intentos: 1,
      ultimoError: 'SMTP no disponible',
      fechaIntento: '2026-11-10T09:01:00Z'
    };
    const inicial = ticket({ estado: 'EN_EVALUACION' });
    http.expectOne({ method: 'GET', url: base }).flush([inicial]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Nueva solicitud');
    component.iniciarNuevaSolicitud();
    expect(component.mostrarFormularioNueva()).toBe(false);

    component.abrirFicha(inicial);
    http.expectOne({ method: 'GET', url: `${base}/12` }).flush({ ...inicial, notificaciones: [fallida] });
    expect(component.estadosGestionDisponibles()).toEqual([
      'EN_EVALUACION', 'REQUIERE_INFORMACION', 'APROBADA', 'RECHAZADA'
    ]);

    component.formAdmin.nuevoEstado = 'RESUELTA';
    component.guardarGestionAdmin();
    expect(component.errorMensaje()).toContain('transición');
    http.expectNone({ method: 'PATCH', url: `${base}/12/gestion` });

    component.formAdmin.nuevoEstado = 'REQUIERE_INFORMACION';
    component.guardarGestionAdmin();
    expect(component.errorMensaje()).toContain('qué información');
    component.formAdmin.comentario = 'Indique a qué año se aplica el cambio.';
    component.guardarGestionAdmin();
    const gestion = http.expectOne({ method: 'PATCH', url: `${base}/12/gestion` });
    expect(gestion.request.body).toMatchObject({
      nuevoEstado: 'REQUIERE_INFORMACION',
      comentario: 'Indique a qué año se aplica el cambio.',
      visibleDireccion: true
    });
    gestion.flush(ticket({ estado: 'REQUIERE_INFORMACION', notificaciones: [fallida] }));

    component.reintentarCorreo(12, 7);
    http.expectOne({ method: 'POST', url: `${base}/12/notificaciones/7/reintentar` })
      .flush({ ...fallida, intentos: 2 });
    expect(component.errorMensaje()).toBe('La notificación sigue sin enviarse.');
    expect(component.mensajeExito()).toBe('');
    expect(component.solicitudSeleccionada()?.notificaciones[0].intentos).toBe(2);

    component.reintentarCorreo(12, 7);
    http.expectOne({ method: 'POST', url: `${base}/12/notificaciones/7/reintentar` })
      .flush({ ...fallida, intentos: 3, estadoEnvio: 'ENVIADO', ultimoError: null });
    expect(component.mensajeExito()).toContain('Notificación enviada');
    expect(component.solicitudSeleccionada()?.codigo).toBe('CH-026');
    expect(component.solicitudSeleccionada()?.notificaciones[0].estadoEnvio).toBe('ENVIADO');
  });

  it('autocompleta el formulario con plantilla del módulo y emite en 1 clic sin revisión previa', () => {
    const { component, http } = preparar('DIRECCION');
    http.expectOne({ method: 'GET', url: `${base}/mias` }).flush([]);

    component.iniciarNuevaSolicitud();
    expect(component.pasoNuevaSolicitud()).toBe(1);

    component.seleccionarPlantillaRapida('cal-libreta');
    expect(component.formNueva.modulo).toBe('Calificaciones');
    expect(component.formNueva.titulo.length).toBeGreaterThanOrEqual(5);
    expect(component.formNueva.motivoProblema.length).toBeGreaterThanOrEqual(10);
    expect(component.formNueva.resultadoEsperado.length).toBeGreaterThanOrEqual(10);

    component.emitirSolicitudDirecta();
    const envioDirecto = http.expectOne({ method: 'POST', url: base });
    expect(envioDirecto.request.body).toMatchObject({
      modulo: 'Calificaciones',
      titulo: component.formNueva.titulo,
      idempotencyKey: expect.any(String)
    });
    const creada = ticket({ id: 25, codigo: 'CH-099', modulo: 'Calificaciones', titulo: component.formNueva.titulo });
    envioDirecto.flush(creada);

    expect(component.mostrarFormularioNueva()).toBe(false);
    expect(component.confirmacionReciente()?.codigo).toBe('CH-099');
    expect(component.solicitudes().some(s => s.codigo === 'CH-099')).toBe(true);
  });

  it('Administrador ejecuta transición rápida encadenada cumpliendo las etapas del backend en secuencia', () => {
    const { component, http } = preparar('ADMINISTRADOR');
    const recibida = ticket({ id: 12, codigo: 'CH-026', estado: 'RECIBIDA' });
    http.expectOne({ method: 'GET', url: base }).flush([recibida]);

    component.abrirFicha(recibida);
    http.expectOne({ method: 'GET', url: `${base}/12` }).flush(recibida);

    component.transicionRapidaEncadenada(['EN_EVALUACION', 'APROBADA', 'EN_EJECUCION', 'RESUELTA']);

    const paso1 = http.expectOne({ method: 'PATCH', url: `${base}/12/gestion` });
    expect(paso1.request.body.nuevoEstado).toBe('EN_EVALUACION');
    paso1.flush(ticket({ id: 12, codigo: 'CH-026', estado: 'EN_EVALUACION' }));

    const paso2 = http.expectOne({ method: 'PATCH', url: `${base}/12/gestion` });
    expect(paso2.request.body.nuevoEstado).toBe('APROBADA');
    expect(paso2.request.body.aprobadorNombre).toBeTruthy();
    paso2.flush(ticket({ id: 12, codigo: 'CH-026', estado: 'APROBADA' }));

    const paso3 = http.expectOne({ method: 'PATCH', url: `${base}/12/gestion` });
    expect(paso3.request.body.nuevoEstado).toBe('EN_EJECUCION');
    paso3.flush(ticket({ id: 12, codigo: 'CH-026', estado: 'EN_EJECUCION' }));

    const paso4 = http.expectOne({ method: 'PATCH', url: `${base}/12/gestion` });
    expect(paso4.request.body.nuevoEstado).toBe('RESUELTA');
    expect(paso4.request.body.resumenCambio).toBeTruthy();
    expect(paso4.request.body.pruebaPosterior).toBeTruthy();
    paso4.flush(ticket({ id: 12, codigo: 'CH-026', estado: 'RESUELTA' }));

    expect(component.solicitudSeleccionada()?.estado).toBe('RESUELTA');
    expect(component.mensajeExito()).toContain('Resuelta');
  });

  it('filtra por estado con chips KPI en 1 clic y alterna al volver a hacer clic', () => {
    const { component, http } = preparar('ADMINISTRADOR');
    http.expectOne({ method: 'GET', url: base }).flush([
      ticket({ id: 1, codigo: 'CH-001', estado: 'RECIBIDA' }),
      ticket({ id: 2, codigo: 'CH-002', estado: 'EN_EVALUACION' }),
      ticket({ id: 3, codigo: 'CH-003', estado: 'RESUELTA' })
    ]);

    expect(component.solicitudesFiltradas().length).toBe(3);
    component.aplicarFiltroRapidoEstado('EN_EVALUACION');
    expect(component.filtroEstado()).toBe('EN_EVALUACION');
    expect(component.solicitudesFiltradas().map(s => s.codigo)).toEqual(['CH-002']);

    component.aplicarFiltroRapidoEstado('EN_EVALUACION');
    expect(component.filtroEstado()).toBe('');
    expect(component.solicitudesFiltradas().length).toBe(3);
  });
});
