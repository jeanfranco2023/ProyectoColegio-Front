import { describe, expect, it } from 'vitest';
import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AprobacionSuplenciasComponent } from './aprobacion-suplencias.component';
import { ObservacionesFaltasComponent } from './observaciones-faltas.component';
import { PortalApoderadoComponent } from './portal-apoderado.component';
import { SeguimientoTutoriaComponent } from './seguimiento-tutoria.component';
import { SuplenteApoderadoComponent } from './suplente-apoderado.component';

describe('Etapa 9 presentation screens', () => {
  it('renders all five screens as standalone components', async () => {
    const screens: Array<Type<unknown>> = [
      PortalApoderadoComponent,
      ObservacionesFaltasComponent,
      SuplenteApoderadoComponent,
      AprobacionSuplenciasComponent,
      SeguimientoTutoriaComponent,
    ];
    for (const component of screens) {
      await TestBed.configureTestingModule({ imports: [component] }).compileComponents();
      const fixture = TestBed.createComponent(component);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('section[aria-labelledby]')).toBeTruthy();
      fixture.destroy();
      TestBed.resetTestingModule();
    }
  });

  it('keeps approve and reject actions out of the guardian substitute list', async () => {
    await TestBed.configureTestingModule({ imports: [SuplenteApoderadoComponent] }).compileComponents();
    const fixture = TestBed.createComponent(SuplenteApoderadoComponent);
    fixture.componentRef.setInput('state', 'normal');
    fixture.componentRef.setInput('requests', [{
      id: 21,
      studentId: 7,
      studentName: 'Estudiante de prueba',
      fullName: 'Persona de prueba',
      dni: '00000000',
      relationship: 'Familiar',
      phone: '900000000',
      startDate: '2026-10-20',
      endDate: '2026-10-30',
      status: 'PENDIENTE_APROBACION',
    }]);
    fixture.detectChanges();
    const labels = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(labels).toContain('Ver detalle');
    expect(labels).not.toContain('Aprobar');
    expect(labels).not.toContain('Rechazar');
  });

  it('requires a reason before confirming a reject or revoke action', async () => {
    await TestBed.configureTestingModule({ imports: [AprobacionSuplenciasComponent] }).compileComponents();
    const fixture = TestBed.createComponent(AprobacionSuplenciasComponent);
    fixture.componentRef.setInput('reasonDialog', { requestId: 21, action: 'reject' });
    fixture.componentRef.setInput('reasonDraft', '   ');
    fixture.detectChanges();
    const confirm = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      '[role="dialog"] button[disabled]',
    );
    expect(confirm?.disabled).toBe(true);
  });
});
