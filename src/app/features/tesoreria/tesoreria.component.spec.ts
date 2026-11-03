import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthStore } from '../../core/state/auth.store';
import { TesoreriaService } from '../../core/services/tesoreria.service';
import { TesoreriaComponent } from './tesoreria.component';

const obligacion = {
  id: 902,
  matriculaId: 281,
  conceptoId: 1,
  tipoConcepto: 'MATRICULA',
  numeroCuota: 0,
  descripcion: 'Cuota de matrícula',
  fechaVencimiento: '2026-11-30',
  montoBase: 350,
  montoMora: 0,
  montoDescuento: 0,
  totalPagado: 0,
  saldoPendiente: 350,
  estado: 'PENDIENTE',
  nombreEstudiante: 'Estudiante QA'
};

function crearComponente() {
  const tesoreria = {
    generarObligacionMatricula: vi.fn(() => of(obligacion)),
    generarCronograma: vi.fn(() => of([])),
    listarObligaciones: vi.fn(() => of([obligacion]))
  };
  TestBed.configureTestingModule({providers: [
    {provide: TesoreriaService, useValue: tesoreria},
    {provide: AuthStore, useValue: {hasRole: (role: string) => role === 'SECRETARIA', hasAnyRole: (roles: string[]) => roles.includes('SECRETARIA')}},
    {provide: ActivatedRoute, useValue: {queryParamMap: of({get: () => null})}},
    {provide: Router, useValue: {navigate: vi.fn(), navigateByUrl: vi.fn()}}
  ]});
  return {component: TestBed.runInInjectionContext(() => new TesoreriaComponent()), tesoreria};
}

afterEach(() => TestBed.resetTestingModule());

describe('Cuota única de matrícula en Tesorería', () => {
  it('envía solo matrícula y fecha al endpoint de cuota única y actualiza la lista', () => {
    const {component, tesoreria} = crearComponente();
    component.modoGeneracion = 'MATRICULA';
    component.matriculaId = 281;
    component.primerVencimiento = '2026-11-30';

    component.guardarGeneracion();

    expect(tesoreria.generarObligacionMatricula).toHaveBeenCalledWith({matriculaId: 281, fechaVencimiento: '2026-11-30'});
    expect(tesoreria.generarCronograma).not.toHaveBeenCalled();
    expect(tesoreria.listarObligaciones).toHaveBeenCalledWith(281);
    expect(component.mensaje()).toContain('S/ 350.00');
  });

  it('rechaza un vencimiento anterior a hoy sin enviar la solicitud', () => {
    const {component, tesoreria} = crearComponente();
    const ayer = new Date(`${component.fechaMinimaVencimiento}T00:00:00`);
    ayer.setDate(ayer.getDate() - 1);
    component.matriculaId = 281;
    component.primerVencimiento = ayer.toLocaleDateString('sv-SE');

    component.generarObligacionMatricula();

    expect(tesoreria.generarObligacionMatricula).not.toHaveBeenCalled();
    expect(component.error()).toContain('anterior a hoy');
  });
});
