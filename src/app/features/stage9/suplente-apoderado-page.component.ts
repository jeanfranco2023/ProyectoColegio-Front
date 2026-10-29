import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { CrearSuplencia, SuplenciaDto, SuplenciaService } from '../../core/services/suplencia.service';
import { HijoPortalDto, PortalFamiliarService } from '../../core/services/portal-familiar.service';
import { AuthStore } from '../../core/state/auth.store';
import { fechaActualEnPeru } from '../../core/utils/fecha-nacimiento';
import { SuplenteApoderadoComponent } from './suplente-apoderado.component';
import { Stage9State } from './stage9.contract';
import { vistaSuplencia } from './suplencia-view';
@Component({ selector: 'app-suplente-apoderado-page', standalone: true, imports: [FormsModule, RouterLink, SuplenteApoderadoComponent], template: `
  @if(apoderado()){
    <form class="mb-4 grid gap-3 rounded-xl border bg-white p-5 md:grid-cols-2" (ngSubmit)="solicitar()" aria-label="Solicitar suplencia temporal">
      <h1 class="text-xl font-bold md:col-span-2">Autorizar recojo temporal</h1>
      <p class="text-sm text-slate-600 md:col-span-2">Registra a un adulto autorizado para recoger al estudiante durante las fechas indicadas. No es una suplencia docente ni reemplaza la tutela legal. Dirección revisará y aprobará la solicitud.</p>
      <label class="grid gap-1">Estudiante<select name="estudiante" [(ngModel)]="draft.estudianteId" class="min-h-11 rounded-lg border p-2" required><option [ngValue]="0">Selecciona</option>@for(h of hijosUnicos();track h.estudianteId){<option [ngValue]="h.estudianteId">{{ h.nombres }} {{ h.apellidoPaterno }} {{ h.apellidoMaterno }}</option>}</select></label>
      <label class="grid gap-1">DNI del suplente<input class="min-h-11 rounded-lg border p-2" name="dni" [(ngModel)]="draft.numeroDocumento" pattern="[0-9]{8}" maxlength="8" inputmode="numeric" required /></label>
      <label class="grid gap-1">Nombres<input class="min-h-11 rounded-lg border p-2" name="nombres" [(ngModel)]="draft.nombres" maxlength="20" required /></label>
      <label class="grid gap-1">Apellido paterno<input class="min-h-11 rounded-lg border p-2" name="paterno" [(ngModel)]="draft.apellidoPaterno" maxlength="20" required /></label>
      <label class="grid gap-1">Apellido materno<input class="min-h-11 rounded-lg border p-2" name="materno" [(ngModel)]="draft.apellidoMaterno" maxlength="20" required /></label>
      <label class="grid gap-1">Parentesco<input class="min-h-11 rounded-lg border p-2" name="parentesco" [(ngModel)]="draft.parentesco" maxlength="30" required /></label>
      <label class="grid gap-1">Celular<input class="min-h-11 rounded-lg border p-2" name="celular" [(ngModel)]="draft.celular" maxlength="9" pattern="9[0-9]{8}" inputmode="tel" required /></label>
      <label class="grid gap-1">Desde<input class="min-h-11 rounded-lg border p-2" type="date" name="inicio" [(ngModel)]="draft.fechaInicio" [min]="hoy" required /></label>
      <label class="grid gap-1">Hasta<input class="min-h-11 rounded-lg border p-2" type="date" name="fin" [(ngModel)]="draft.fechaFin" [min]="draft.fechaInicio || hoy" required /></label>
      <button class="min-h-11 rounded-lg bg-blue-700 p-2 text-white disabled:opacity-50" type="submit" [disabled]="ocupado() || !hijosUnicos().length">Solicitar aprobación</button>
    </form>
    <p role="status">{{ mensaje() }}</p>
    <app-suplente-apoderado-screen [showForm]="false" [state]="estado()" [requests]="solicitudesVista()" [errorMessage]="mensaje()" (detailsRequested)="verDetalle($event)" (retry)="cargar()" />
    @if(detalle();as s){<aside class="grid gap-2 rounded-xl border bg-white p-4" aria-label="Detalle de suplencia"><h2 class="font-semibold">{{ s.nombres }} {{ s.apellidoPaterno }} {{ s.apellidoMaterno }}</h2><p>Estado: {{ s.estado }} · {{ s.fechaInicio }} a {{ s.fechaFin }}</p><p>{{ s.motivoResolucion || 'Sin observación de resolución.' }}</p><button class="min-h-11 rounded-lg border p-2" type="button" (click)="detalle.set(null)">Cerrar detalle</button></aside>}
  }@else{<p>La solicitud debe registrarla el apoderado titular desde su cuenta.</p><a class="inline-block min-h-11 rounded-lg border bg-white p-3" routerLink="/admin/aprobacion-suplencias">Ir a gestión de suplentes</a>}
` })
export class SuplenteApoderadoPageComponent implements OnInit {
    private readonly portal = inject(PortalFamiliarService);
    private readonly servicio = inject(SuplenciaService);
    private readonly store = inject(AuthStore);
    readonly hijos = signal<HijoPortalDto[]>([]);
    readonly solicitudes = signal<SuplenciaDto[]>([]);
    readonly detalle = signal<SuplenciaDto | null>(null);
    readonly estado = signal<Stage9State>('loading');
    readonly mensaje = signal('');
    readonly ocupado = signal(false);
    readonly hoy = fechaActualEnPeru();
    readonly hijosUnicos = computed(() => Array.from(new Map(this.hijos().map(h => [h.estudianteId, h])).values()));
    readonly solicitudesVista = computed(() => this.solicitudes().map(s => vistaSuplencia(s, this.hijos())));
    draft: CrearSuplencia = { estudianteId: 0, numeroDocumento: '', nombres: '', apellidoPaterno: '', apellidoMaterno: '', parentesco: '', celular: '', fechaInicio: this.hoy, fechaFin: this.hoy };
    apoderado() { return this.store.hasRole('APODERADO'); }
    ngOnInit() { if (this.apoderado())
        this.cargar(); }
    cargar() { this.estado.set('loading'); forkJoin({ hijos: this.portal.hijosPropios(), solicitudes: this.servicio.misSolicitudes() }).subscribe({ next: d => { this.hijos.set(d.hijos); this.solicitudes.set(d.solicitudes); this.estado.set(d.solicitudes.length ? 'normal' : 'empty'); }, error: e => { this.estado.set('error'); this.mensaje.set(e?.error?.message ?? 'No se pudieron cargar las solicitudes.'); } }); }
    solicitar() {
        if (this.ocupado() || !this.hijosUnicos().some(h => h.estudianteId === Number(this.draft.estudianteId)))
            return;
        if (!/^\d{8}$/.test(this.draft.numeroDocumento) || !/^9\d{8}$/.test(this.draft.celular) || this.draft.fechaInicio < this.hoy || this.draft.fechaFin < this.draft.fechaInicio) {
            this.mensaje.set('Revisa el DNI, celular y fechas.');
            return;
        }
        this.ocupado.set(true);
        this.servicio.solicitar({ ...this.draft, estudianteId: Number(this.draft.estudianteId) }).subscribe({ next: () => { this.ocupado.set(false); this.mensaje.set('Solicitud registrada. Falta la aprobación institucional.'); this.cargar(); }, error: e => { this.ocupado.set(false); this.mensaje.set(e?.error?.message ?? 'No se pudo registrar la solicitud.'); } });
    }
    verDetalle(id: number) { this.detalle.set(this.solicitudes().find(s => s.id === id) ?? null); }
}
