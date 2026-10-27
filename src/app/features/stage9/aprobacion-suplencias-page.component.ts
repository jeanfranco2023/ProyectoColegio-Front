import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { AprobacionSuplenciasComponent } from './aprobacion-suplencias.component';
import { Stage9ReasonDialog, Stage9ReasonAction, Stage9State } from './stage9.contract';
import { SuplenciaDto, SuplenciaService } from '../../core/services/suplencia.service';
import { HijoPortalDto, PortalFamiliarService } from '../../core/services/portal-familiar.service';
import { vistaSuplencia } from './suplencia-view';
@Component({ selector: 'app-aprobacion-suplencias-page', standalone: true, imports: [AprobacionSuplenciasComponent], template: `
  <p role="status">{{ mensaje() }}</p>
  <app-aprobacion-suplencias-screen [state]="estado()" [errorMessage]="mensaje()" [requests]="visibles()" [pendingCount]="pendientes()" [activeCount]="activas()" [expiredCount]="vencidas()" [search]="busqueda()" [reasonDialog]="dialogo()" [reasonDraft]="motivo()" (searchChanged)="busqueda.set($event)" (approveRequested)="aprobar($event)" (reasonRequested)="abrirMotivo($event)" (reasonDraftChanged)="motivo.set($event)" (reasonConfirmed)="resolver($event)" (reasonCanceled)="dialogo.set(null)" (retry)="cargar()" />
` })
export class AprobacionSuplenciasPageComponent implements OnInit {
    private readonly servicio = inject(SuplenciaService);
    private readonly portal = inject(PortalFamiliarService);
    readonly solicitudes = signal<SuplenciaDto[]>([]);
    readonly hijos = signal<HijoPortalDto[]>([]);
    readonly estado = signal<Stage9State>('loading');
    readonly mensaje = signal('');
    readonly busqueda = signal('');
    readonly dialogo = signal<Stage9ReasonDialog | null>(null);
    readonly motivo = signal('');
    readonly ocupado = signal(false);
    readonly pendientes = computed(() => this.solicitudes().filter(s => s.estado === 'PENDIENTE_APROBACION').length);
    readonly activas = computed(() => this.solicitudes().filter(s => s.estado === 'ACTIVO').length);
    readonly vencidas = computed(() => this.solicitudes().filter(s => s.estado === 'VENCIDO').length);
    readonly visibles = computed(() => this.solicitudes().map(s => vistaSuplencia(s, this.hijos())).filter(s => `${s.fullName} ${s.studentName} ${s.dni}`.toLocaleLowerCase('es').includes(this.busqueda().trim().toLocaleLowerCase('es'))));
    ngOnInit() { this.cargar(); }
    cargar() { this.estado.set('loading'); forkJoin({ solicitudes: this.servicio.bandeja(), hijos: this.portal.alumnosSeguimiento() }).subscribe({ next: d => { this.solicitudes.set(d.solicitudes); this.hijos.set(d.hijos); this.estado.set(d.solicitudes.length ? 'normal' : 'empty'); }, error: e => { this.estado.set('error'); this.mensaje.set(e?.error?.message ?? 'No se pudo cargar la bandeja.'); } }); }
    abrirMotivo(dialogo: Stage9ReasonDialog) { if (this.ocupado())
        return; this.motivo.set(''); this.dialogo.set(dialogo); }
    aprobar(id: number) { if (this.ocupado())
        return; this.ocupado.set(true); this.servicio.aprobar(id).subscribe({ next: () => this.completado(), error: e => this.fallo(e) }); }
    resolver(accion: {
        requestId: number;
        action: Stage9ReasonAction;
        reason: string;
    }) { if (this.ocupado() || !accion.reason.trim() || accion.reason.trim().length > 500)
        return; this.ocupado.set(true); this.servicio.resolver(accion.requestId, accion.action === 'reject' ? 'rechazar' : 'revocar', accion.reason.trim()).subscribe({ next: () => { this.dialogo.set(null); this.completado(); }, error: e => this.fallo(e) }); }
    private completado() { this.ocupado.set(false); this.mensaje.set('Resolución registrada.'); this.cargar(); }
    private fallo(e: {
        error?: {
            message?: string;
        };
    }) { this.ocupado.set(false); this.mensaje.set(e?.error?.message ?? 'No se pudo registrar la resolución.'); }
}
