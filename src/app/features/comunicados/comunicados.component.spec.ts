import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { AuthStore } from '../../core/state/auth.store';
import { ComunicadoService } from '../../core/services/comunicado.service';
import { AcademicoService } from '../../core/services/academico.service';
import { ComunicadosComponent } from './comunicados.component';

describe('Comunicados y cuentas con varios roles', () => {
  it('rechaza títulos de más de 40 caracteres antes de enviar la publicación', () => {
    preparar(['SECRETARIA']);
    const componente = TestBed.runInInjectionContext(() => new ComunicadosComponent());
    componente.anioLectivoId = 1;
    componente.titulo = 'A'.repeat(41);
    componente.contenido = 'Información para las familias.';
    componente.publicar();
    expect(componente.error()).toContain('40 caracteres');
    expect(componente.publicando()).toBe(false);
  });
  for (const rol of ['DIRECCION', 'SECRETARIA']) {
    it(`consulta publicaciones para ${rol} aunque también sea APODERADO`, () => {
      const api = preparar([rol, 'APODERADO']);
      const componente = TestBed.runInInjectionContext(() => new ComunicadosComponent());
      componente.cargarComunicados();
      expect(api.listarPublicados).toHaveBeenCalledOnce();
      expect(api.consultarBandeja).not.toHaveBeenCalled();
      expect(componente.esSoloApoderado()).toBe(false);
    });
  }

  it('conserva la bandeja y el acuse del apoderado sin rol administrativo', () => {
    const api = preparar(['APODERADO']);
    const componente = TestBed.runInInjectionContext(() => new ComunicadosComponent());
    componente.cargarComunicados();
    expect(api.consultarBandeja).toHaveBeenCalledWith(0, 100);
    expect(api.listarPublicados).not.toHaveBeenCalled();
    expect(componente.esSoloApoderado()).toBe(true);
  });
});

function preparar(roles: string[]) {
  const api = {listarPublicados:vi.fn(() => of([])), consultarBandeja:vi.fn(() => of({comunicados:[]}))};
  TestBed.configureTestingModule({providers:[
    {provide:ComunicadoService,useValue:api},
    {provide:AcademicoService,useValue:{}},
    {provide:AuthStore,useValue:{hasRole:(r:string)=>roles.includes(r),hasAnyRole:(rs:string[])=>rs.some(r=>roles.includes(r))}}
  ]});
  return api;
}
