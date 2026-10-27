import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { afterEach,beforeEach,describe,expect,it } from 'vitest';
import { AcademicoService } from '../../core/services/academico.service';
import { HorarioService } from '../../core/services/horario.service';
import { RefuerzoService, SesionRefuerzoDto } from '../../core/services/refuerzo.service';
import { RefuerzosComponent } from './refuerzos.component';
describe('sesiones de refuerzo por contexto',()=>{
  let componente:RefuerzosComponent;let peticiones:Subject<SesionRefuerzoDto[]>[];
  beforeEach(()=>{peticiones=[];TestBed.configureTestingModule({providers:[{provide:AcademicoService,useValue:{}},{provide:HorarioService,useValue:{}},{provide:RefuerzoService,useValue:{listarSesiones:()=>{const respuesta=new Subject<SesionRefuerzoDto[]>();peticiones.push(respuesta);return respuesta;}}}]});componente=TestBed.runInInjectionContext(()=>new RefuerzosComponent());componente.asignaciones.set([{id:1,anioLectivoId:2,nivelId:1,seccionId:3,areaCurricularId:4,docenteUsuarioId:5},{id:2,anioLectivoId:2,nivelId:1,seccionId:3,areaCurricularId:6,docenteUsuarioId:7}]);componente.asignacionId=1;componente.periodoId=1;});
  afterEach(()=>TestBed.resetTestingModule());
  const sesion=(id:number,area:number,docente:number):SesionRefuerzoDto=>({id,anioLectivoId:2,periodoAcademicoId:1,areaCurricularId:area,docenteUsuarioId:docente,tema:'Cantidades',fechaProgramada:'2026-10-26',horaInicio:'15:00',horaFin:'16:00',aulaAsignada:'A101'});
  it('muestra solo sesiones del área y docente seleccionados',()=>{componente.cargar();peticiones[0].next([sesion(1,4,5),sesion(2,6,7)]);expect(componente.sesiones().map(s=>s.id)).toEqual([1]);});
  it('una consulta anterior no reemplaza la selección actual',()=>{componente.cargar();componente.asignacionId=2;componente.cargar();peticiones[1].next([sesion(2,6,7)]);peticiones[0].next([sesion(1,4,5)]);expect(componente.sesiones().map(s=>s.id)).toEqual([2]);});
});
