import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Stage9SubstituteStatus } from '../../features/stage9/stage9.contract';
export interface CrearSuplencia {
    estudianteId: number;
    numeroDocumento: string;
    nombres: string;
    apellidoPaterno: string;
    apellidoMaterno: string;
    parentesco: string;
    celular: string;
    fechaInicio: string;
    fechaFin: string;
}
export interface SuplenciaDto extends CrearSuplencia {
    id: number;
    apoderadoTitularId: number;
    estado: Stage9SubstituteStatus;
    motivoResolucion: string | null;
    autorizadoPorUsuarioId: number | null;
    fechaSolicitud: string;
    fechaResolucion: string | null;
}
@Injectable({ providedIn: 'root' })
export class SuplenciaService {
    private readonly http = inject(HttpClient);
    private readonly url = `${environment.apiUrl}/suplencias`;
    solicitar(datos: CrearSuplencia) { return this.http.post<SuplenciaDto>(this.url, datos); }
    misSolicitudes() { return this.http.get<SuplenciaDto[]>(`${this.url}/mis-solicitudes`); }
    bandeja() { return this.http.get<SuplenciaDto[]>(`${this.url}/pendientes`); }
    aprobar(id: number) { return this.http.put<SuplenciaDto>(`${this.url}/${id}/aprobar`, {}); }
    resolver(id: number, accion: 'rechazar' | 'revocar', motivo: string) { return this.http.put<SuplenciaDto>(`${this.url}/${id}/${accion}`, { motivo }); }
}
