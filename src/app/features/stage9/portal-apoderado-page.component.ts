import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { PortalApoderadoComponent } from './portal-apoderado.component';
import { Stage9State, Stage9Payment } from './stage9.contract';
import { CalificacionPortalDto, HijoPortalDto, PortalFamiliarService } from '../../core/services/portal-familiar.service';
import { AsistenciaAulaResponseDto } from '../../core/models/asistencia.model';
import { PeriodoResponseDto } from '../../core/models/academico.model';
import { TesoreriaService } from '../../core/services/tesoreria.service';
import { EvaluacionService } from '../../core/services/evaluacion.service';
import { AuthStore } from '../../core/state/auth.store';
import { guardarDescarga } from '../../shared/ui/carga-planilla.component';
import { fechaActualEnPeru } from '../../core/utils/fecha-nacimiento';
@Component({ selector: 'app-portal-apoderado-page', standalone: true, imports: [PortalApoderadoComponent, RouterLink], template: `
  <nav class="mb-4 flex flex-wrap gap-3" aria-label="Servicios de la familia"><a class="min-h-11 rounded-lg border bg-white p-3" routerLink="/admin/tesoreria">Realizar pagos</a><a class="min-h-11 rounded-lg border bg-white p-3" routerLink="/admin/comunicados">Comunicados</a><a class="min-h-11 rounded-lg border bg-white p-3" routerLink="/admin/suplencias">Designar suplente</a></nav>
  <app-portal-apoderado-screen [state]="estado()" [errorMessage]="mensaje()" [children]="opciones()" [schoolYear]="hijoActual()?.anio ?? 0" [periods]="opcionesPeriodos()" [selectedStudentId]="matriculaId()" [selectedPeriodId]="periodoId()" [grades]="notasPeriodo()" [payments]="pagos()" (childSelected)="seleccionar($event)" (periodSelected)="periodoId.set($event)" (reportRequested)="descargar($event.studentId)" (retry)="cargar()" />
  <p role="status" class="mb-4">{{ aviso() }}</p>
  @if(matriculaId() && estado() === 'normal'){
    <section class="grid gap-3 rounded-xl border bg-white p-5"><h2 class="text-lg font-semibold">Asistencia escolar del año</h2><p>{{ resumenAsistencia() }}</p>
      <div class="max-h-80 overflow-auto"><table class="w-full text-left text-sm"><thead><tr><th>Fecha</th><th>Estado</th><th>Justificación</th></tr></thead><tbody>@for(a of asistencias();track a.id){<tr class="border-t"><td class="p-2">{{ a.fechaSesion }}</td><td>{{ a.estado }}</td><td>{{ a.justificada ? a.motivoJustificacion : '—' }}</td></tr>}</tbody></table></div>
      @if(!asistencias().length){<p>No hay asistencias registradas para esta matrícula.</p>}
      <p class="text-sm">La libreta PDF incluye todos los periodos registrados del año.</p>
    </section>
  }
` })
export class PortalApoderadoPageComponent implements OnInit {
    private readonly portal = inject(PortalFamiliarService);
    private readonly tesoreria = inject(TesoreriaService);
    private readonly evaluacion = inject(EvaluacionService);
    private readonly store = inject(AuthStore);
    readonly hijos = signal<HijoPortalDto[]>([]);
    readonly matriculaId = signal<number | null>(null);
    readonly periodoId = signal<number | null>(null);
    readonly periodos = signal<PeriodoResponseDto[]>([]);
    readonly notas = signal<CalificacionPortalDto[]>([]);
    readonly pagos = signal<Stage9Payment[]>([]);
    readonly asistencias = signal<AsistenciaAulaResponseDto[]>([]);
    readonly estado = signal<Stage9State>('loading');
    readonly mensaje = signal('');
    readonly aviso = signal('');
    private revision = 0;
    readonly opciones = computed(() => this.hijos().map(h => ({ id: h.matriculaId, fullName: `${h.nombres} ${h.apellidoPaterno} ${h.apellidoMaterno}`, gradeLabel: `${h.grado} ${h.seccion} · ${h.anio}` })));
    readonly hijoActual = computed(() => this.hijos().find(h => h.matriculaId === this.matriculaId()));
    readonly opcionesPeriodos = computed(() => this.periodos().map(p => ({ id: p.id, label: p.nombre })));
    readonly notasPeriodo = computed(() => this.notas().filter(n => n.periodoId === this.periodoId()).map(n => ({ areaId: n.areaId, areaName: n.areaNombre, competenciaId: n.competenciaId, competenciaName: n.competenciaNombre, grade: n.nota, conclusion: n.conclusion })));
    readonly resumenAsistencia = computed(() => {
        const total = this.asistencias().length;
        if (!total)
            return 'Sin registros de asistencia.';
        const presentes = this.asistencias().filter(a => a.estado === 'PRESENTE').length;
        const tardanzas = this.asistencias().filter(a => a.estado === 'TARDANZA').length;
        return `De ${total} registros: ${presentes} asistencias (${Math.round(presentes * 100 / total)}%), ${tardanzas} tardanzas y ${total - presentes - tardanzas} faltas.`;
    });
    ngOnInit() { this.cargar(); }
    cargar() {
        this.estado.set('loading');
        this.portal.hijos().subscribe({ next: hijos => {
                this.hijos.set(hijos);
                if (!hijos.length) {
                    this.estado.set('empty');
                    return;
                }
                this.seleccionar(hijos.some(h => h.matriculaId === this.matriculaId()) ? this.matriculaId()! : hijos[0].matriculaId);
            }, error: e => { this.estado.set('error'); this.mensaje.set(e?.error?.message ?? 'No se pudo cargar el portal familiar.'); } });
    }
    seleccionar(id: number) {
        const hijo = this.hijos().find(h => h.matriculaId === id);
        if (!hijo)
            return;
        const revision = ++this.revision;
        this.matriculaId.set(id);
        this.periodoId.set(null);
        this.estado.set('loading');
        this.notas.set([]);
        this.pagos.set([]);
        this.asistencias.set([]);
        this.aviso.set('');
        const obligaciones = this.store.hasAnyRole(['DIRECCION', 'SECRETARIA']) ? this.tesoreria.listarObligaciones(id) : this.tesoreria.listarMisObligaciones();
        forkJoin({ notas: this.portal.calificaciones(id), periodos: this.portal.periodos(id), asistencias: this.portal.asistencia(id), obligaciones }).subscribe({ next: datos => {
                if (revision !== this.revision)
                    return;
                this.notas.set(datos.notas);
                this.periodos.set(datos.periodos);
                this.periodoId.set(datos.periodos[0]?.id ?? null);
                this.asistencias.set(datos.asistencias);
                this.pagos.set(datos.obligaciones.filter(o => o.matriculaId === id && o.estado !== 'CANCELADO_POR_TRASLADO').map(o => ({ id: o.id, concept: o.saldoPendiente > 0 ? `${o.descripcion} (saldo por pagar)` : o.descripcion, schoolYear: hijo.anio, amount: o.saldoPendiente > 0 ? o.saldoPendiente : o.totalPagado, currency: 'PEN', dueDate: o.fechaVencimiento,
                    status: o.saldoPendiente <= 0 ? 'PAGADO' : o.fechaVencimiento < fechaActualEnPeru() ? 'VENCIDO' : 'PENDIENTE' })));
                this.estado.set('normal');
            }, error: e => { if (revision !== this.revision)
                return; this.estado.set('error'); this.mensaje.set(e?.error?.message ?? 'No se pudo consultar la información del estudiante.'); } });
    }
    descargar(id: number) {
        if (id !== this.matriculaId() || !this.hijos().some(h => h.matriculaId === id))
            return;
        this.evaluacion.descargarLibretaPdf(id).subscribe({ next: blob => guardarDescarga(blob, `libreta_${id}.pdf`), error: () => this.aviso.set('No se pudo descargar la libreta.') });
    }
}
