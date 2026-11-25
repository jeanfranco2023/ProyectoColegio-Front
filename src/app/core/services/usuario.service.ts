import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import {
  ActualizarUsuarioAdminRequestDto,
  CambiarPasswordRequestDto,
  CrearUsuarioRequestDto,
  DocumentoLegajoDto,
  UserResponseDto
} from '../models/auth.model';
import {
  AnioLectivoResponseDto,
  GradoResponseDto,
  NivelResponseDto
} from '../models/academico.model';
import { ReniecPersonaDto } from '../models/matricula-publica.model';

@Injectable({
  providedIn: 'root'
})
export class UsuarioService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/usuarios`;

  listarUsuarios(rol?: string): Observable<UserResponseDto[]> {
    let params = new HttpParams();
    if (rol && rol.trim().length > 0) {
      params = params.set('rol', rol.trim());
    }
    return this.http
      .get<ApiResponse<UserResponseDto[]>>(this.baseUrl, { params })
      .pipe(map(res => res.data ?? []));
  }

  crearUsuario(payload: CrearUsuarioRequestDto): Observable<UserResponseDto> {
    return this.http
      .post<ApiResponse<UserResponseDto>>(this.baseUrl, payload)
      .pipe(map(res => res.data));
  }

  actualizarUsuario(id: number, payload: ActualizarUsuarioAdminRequestDto): Observable<UserResponseDto> {
    return this.http
      .put<ApiResponse<UserResponseDto>>(`${this.baseUrl}/${id}`, payload)
      .pipe(map(res => res.data));
  }

  listarNiveles(): Observable<NivelResponseDto[]> {
    return this.http.get<NivelResponseDto[]>(`${environment.apiUrl}/academico/niveles`);
  }

  listarGrados(nivelId?: number): Observable<GradoResponseDto[]> {
    let params = new HttpParams();
    if (nivelId !== undefined && nivelId !== null) {
      params = params.set('nivelId', nivelId.toString());
    }
    return this.http.get<GradoResponseDto[]>(`${environment.apiUrl}/academico/grados`, { params });
  }

  listarAnios(): Observable<AnioLectivoResponseDto[]> {
    return this.http.get<AnioLectivoResponseDto[]>(`${environment.apiUrl}/academico/anios`);
  }

  listarAreas(nivelId: number): Observable<Array<{ id: number; nivelId: number; codigo: string; nombre: string }>> {
    return this.http.get<Array<{ id: number; nivelId: number; codigo: string; nombre: string }>>(
      `${environment.apiUrl}/curriculo/areas`,
      { params: { nivelId } }
    );
  }

  listarMallaGrado(gradoId: number, anioId: number): Observable<Array<{ id: number; areaCurricularId: number; activo: boolean }>> {
    return this.http.get<Array<{ id: number; areaCurricularId: number; activo: boolean }>>(
      `${environment.apiUrl}/horarios/grado/${gradoId}`,
      { params: { anioId } }
    );
  }

  cambiarEstado(id: number, activo: boolean): Observable<UserResponseDto> {
    return this.http
      .patch<ApiResponse<UserResponseDto>>(`${this.baseUrl}/${id}/estado`, { activo })
      .pipe(map(res => res.data));
  }

  cambiarPassword(payload: CambiarPasswordRequestDto): Observable<void> {
    return this.http
      .put<ApiResponse<void>>(`${this.baseUrl}/password`, payload)
      .pipe(map(() => undefined));
  }

  obtenerPerfil(): Observable<UserResponseDto> {
    return this.http
      .get<ApiResponse<UserResponseDto>>(`${this.baseUrl}/me`)
      .pipe(map(res => res.data));
  }

  consultarReniec(dni: string): Observable<ReniecPersonaDto> {
    return this.http.get<ReniecPersonaDto>(`${environment.apiUrl}/personas/reniec/${encodeURIComponent(dni)}`);
  }

  corregirDni(id: number, payload: { nuevoDni: string; motivo: string; nombreCompleto?: string }): Observable<UserResponseDto> {
    return this.http
      .patch<ApiResponse<UserResponseDto>>(`${this.baseUrl}/${id}/dni`, payload)
      .pipe(map(res => res.data));
  }

  revocarRol(usuarioId: number, rolId: number): Observable<UserResponseDto> {
    return this.http
      .delete<ApiResponse<UserResponseDto>>(`${this.baseUrl}/${usuarioId}/roles/${rolId}`)
      .pipe(map(res => res.data));
  }

  subirDocumentoLegajo(usuarioId: number, tipo: string, archivo: File): Observable<DocumentoLegajoDto> {
    const formData = new FormData();
    formData.append('archivo', archivo);
    formData.append('tipoDocumento', tipo === 'TITULO' ? 'TITULO_PROFESIONAL'
      : tipo === 'ANTECEDENTES' ? 'ANTECEDENTES_POLICIALES' : tipo);
    return this.http
      .post<ApiResponse<DocumentoLegajoDto>>(`${this.baseUrl}/${usuarioId}/documentos`, formData)
      .pipe(map(res => res.data));
  }
}
