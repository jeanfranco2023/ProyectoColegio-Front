import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ConceptoCobroResponseDto,
  CrearObligacionMatriculaRequestDto,
  GenerarObligacionesAnualesRequestDto,
  CrearPreferenciaAdelantoMercadoPagoDto,
  CrearPreferenciaMercadoPagoDto,
  ObligacionResponseDto,
  PreferenciaMercadoPagoResponseDto,
  RegistrarPagoCajaRequestDto,
  TransaccionResponseDto
} from '../models/tesoreria.model';

@Injectable({
  providedIn: 'root'
})
export class TesoreriaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/tesoreria`;

  conceptosExtraordinarios() {
    return this.http.get<ConceptoCobroResponseDto[]>(this.baseUrl + '/extraordinarios/conceptos');
  }

  guardarConceptoExtraordinario(id: number | null, concepto: import('../models/tesoreria.model').ConceptoExtraordinario) {
    const url = this.baseUrl + '/extraordinarios/conceptos';
    return id === null
      ? this.http.post<ConceptoCobroResponseDto>(url, concepto)
      : this.http.put<ConceptoCobroResponseDto>(url + '/' + id, concepto);
  }

  configurarPension(diaVencimiento: number) {
    return this.http.put<ConceptoCobroResponseDto>(this.baseUrl + '/pensiones/configuracion', { diaVencimiento });
  }

  matriculasParaCobro() {
    return this.http.get<import('../models/tesoreria.model').MatriculaParaCobro[]>(this.baseUrl + '/extraordinarios/matriculas');
  }

  generarExtraordinarios(conceptoId: number, matriculaIds: number[], vencimiento: string) {
    return this.http.post<ObligacionResponseDto[]>(this.baseUrl + '/extraordinarios/obligaciones',
      { conceptoId, matriculaIds, vencimiento });
  }

  listarExtraordinarios(matriculaId?: number | null) {
    if (matriculaId != null && matriculaId > 0) {
      return this.http.get<ObligacionResponseDto[]>(this.baseUrl + '/extraordinarios/obligaciones', { params: { matriculaId } });
    }
    return this.http.get<ObligacionResponseDto[]>(this.baseUrl + '/extraordinarios/obligaciones');
  }

  descargarConstancia(id: number) {
    return this.http.get(this.baseUrl + '/extraordinarios/obligaciones/' + id + '/constancia', { responseType: 'blob' });
  }

  listarConceptos(): Observable<ConceptoCobroResponseDto[]> {
    return this.http.get<ConceptoCobroResponseDto[]>(`${this.baseUrl}/conceptos`);
  }

  generarCronograma(payload: GenerarObligacionesAnualesRequestDto): Observable<ObligacionResponseDto[]> {
    return this.http.post<ObligacionResponseDto[]>(`${this.baseUrl}/obligaciones`, payload);
  }

  generarObligacionMatricula(payload: CrearObligacionMatriculaRequestDto): Observable<ObligacionResponseDto> {
    return this.http.post<ObligacionResponseDto>(`${this.baseUrl}/obligaciones/matricula`, payload);
  }

  listarObligaciones(matriculaId?: number | null): Observable<ObligacionResponseDto[]> {
    if (matriculaId != null && matriculaId > 0) {
      const params = new HttpParams().set('matriculaId', matriculaId.toString());
      return this.http.get<ObligacionResponseDto[]>(`${this.baseUrl}/obligaciones`, { params });
    }
    return this.http.get<ObligacionResponseDto[]>(`${this.baseUrl}/obligaciones`);
  }

  listarMisObligaciones(): Observable<ObligacionResponseDto[]> {
    return this.http.get<ObligacionResponseDto[]>(`${this.baseUrl}/mis-obligaciones`);
  }

  registrarPagoCaja(payload: RegistrarPagoCajaRequestDto): Observable<TransaccionResponseDto> {
    return this.http.post<TransaccionResponseDto>(`${this.baseUrl}/pagos/caja`, payload);
  }

  crearPreferenciaMercadoPago(payload: CrearPreferenciaMercadoPagoDto): Observable<PreferenciaMercadoPagoResponseDto> {
    return this.http.post<PreferenciaMercadoPagoResponseDto>(
      `${this.baseUrl}/pagos/mercadopago/preferencia`,
      payload
    );
  }

  confirmarPago(id: number): Observable<TransaccionResponseDto | null> {
    return this.http.post<TransaccionResponseDto | null>(`${this.baseUrl}/obligaciones/${id}/confirmar-pago`, {});
  }

  simularPagoMercadoPago(
    id: number,
    metodoPago: import('../../shared/ui/simulador-checkout.component').MetodoPagoOnline,
    referenciaOperacion?: string
  ): Observable<TransaccionResponseDto> {
    return this.http.post<TransaccionResponseDto>(
      `${this.baseUrl}/obligaciones/${id}/simular-pago`,
      { metodoPago, referenciaOperacion: referenciaOperacion ?? null }
    );
  }

  crearPreferenciaAdelantoMercadoPago(
    payload: CrearPreferenciaAdelantoMercadoPagoDto
  ): Observable<PreferenciaMercadoPagoResponseDto> {
    return this.http.post<PreferenciaMercadoPagoResponseDto>(
      `${this.baseUrl}/pagos/mercadopago/preferencia-adelanto`,
      payload
    );
  }

  confirmarPagoAdelanto(obligacionPagoIds: number[]): Observable<TransaccionResponseDto[]> {
    return this.http.post<TransaccionResponseDto[]>(
      `${this.baseUrl}/obligaciones/adelanto/confirmar-pago`,
      { obligacionPagoIds }
    );
  }

  simularPagoAdelantoMercadoPago(
    obligacionPagoIds: number[],
    metodoPago: import('../../shared/ui/simulador-checkout.component').MetodoPagoOnline,
    referenciaOperacion?: string
  ): Observable<TransaccionResponseDto[]> {
    return this.http.post<TransaccionResponseDto[]>(
      `${this.baseUrl}/obligaciones/adelanto/simular-pago`,
      { obligacionPagoIds, metodoPago, referenciaOperacion: referenciaOperacion ?? null }
    );
  }
}
