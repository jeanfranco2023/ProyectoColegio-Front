import { SuplenciaDto } from '../../core/services/suplencia.service';
import { HijoPortalDto } from '../../core/services/portal-familiar.service';
import { Stage9SubstituteRequest } from './stage9.contract';
export function vistaSuplencia(s: SuplenciaDto, hijos: readonly HijoPortalDto[]): Stage9SubstituteRequest {
    const estudiante = hijos.find(h => h.estudianteId === s.estudianteId);
    return { id: s.id, studentId: s.estudianteId, studentName: estudiante ? `${estudiante.nombres} ${estudiante.apellidoPaterno} ${estudiante.apellidoMaterno}` : `Estudiante #${s.estudianteId}`,
        fullName: `${s.nombres} ${s.apellidoPaterno} ${s.apellidoMaterno}`, dni: s.numeroDocumento, relationship: s.parentesco, phone: s.celular, startDate: s.fechaInicio, endDate: s.fechaFin, status: s.estado };
}
