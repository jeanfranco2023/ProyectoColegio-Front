import { FormatoEntradaDirective } from '../../shared/ui/formato-entrada.directive';
import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuditoriaService } from '../../core/services/auditoria.service';
import { UiCalendarComponent } from '../../shared/ui/ui-calendar.component';
import { UiPaginacionComponent, paginarRegistros } from '../../shared/ui/ui-paginacion.component';
import {
  AuditoriaAccesoDto,
  CambioAuditoriaDto,
  PaginaAuditoriaDto,
  PaginaCambiosAuditoriaDto
} from '../../core/models/auditoria.model';

@Component({
  selector: 'app-auditoria',
  standalone: true,
  imports: [FormatoEntradaDirective, CommonModule, FormsModule, UiCalendarComponent, UiPaginacionComponent],
  template: `
    <section class="space-y-5 text-slate-900">
      <header class="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#1E3A8A]/40 bg-gradient-to-r from-[#0A192F] via-[#0F294D] to-[#173B67] p-6 text-white shadow-md">
        <div>
          <span class="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[.14em] text-sky-100">
            Supervisión exclusiva de Administración
          </span>
          <h1 class="mt-2 mb-0 font-sans text-2xl sm:text-3xl font-extrabold tracking-tight text-white">Acciones del sistema</h1>
          <p class="mt-1.5 mb-0 text-sm text-slate-200">
            Trazabilidad inmutable de accesos HTTP y cambios de datos con identidad real del actor, origen técnico y estado anterior/posterior.
          </p>
        </div>
        <div class="flex items-center gap-3">
          <span class="rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-bold text-white" data-testid="auditoria-contador">
            {{ totalResultadosActivos() }} resultados
          </span>
          <button
            type="button"
            (click)="actualizar()"
            class="min-h-11 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-[#0F294D] shadow-sm transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-white cursor-pointer"
          >
            Actualizar
          </button>
        </div>
      </header>

      <div class="rounded-xl border border-[#E2E8F0] bg-white p-4 text-sm text-[#526579]">
        Se conserva el registro íntegro de rutas, métodos HTTP y snapshots de base de datos sin exponer contraseñas ni tokens de sesión.
      </div>

      <div class="flex gap-2 border-b border-[#E2E8F0]" role="tablist" aria-label="Secciones de acciones del sistema">
        <button
          type="button"
          role="tab"
          id="tab-accesos"
          aria-controls="panel-accesos"
          [attr.aria-selected]="vista() === 'accesos'"
          (click)="cambiarVista('accesos')"
          class="min-h-11 border-b-2 px-4 py-3 text-sm font-semibold transition-colors"
          [class.border-[#173B67]]="vista() === 'accesos'"
          [class.text-[#173B67]]="vista() === 'accesos'"
          [class.border-transparent]="vista() !== 'accesos'"
          [class.text-[#526579]]="vista() !== 'accesos'"
        >
          Accesos
        </button>
        <button
          type="button"
          role="tab"
          id="tab-cambios"
          aria-controls="panel-cambios"
          [attr.aria-selected]="vista() === 'cambios'"
          (click)="cargarCambios(0)"
          class="min-h-11 border-b-2 px-4 py-3 text-sm font-semibold transition-colors"
          [class.border-[#173B67]]="vista() === 'cambios'"
          [class.text-[#173B67]]="vista() === 'cambios'"
          [class.border-transparent]="vista() !== 'cambios'"
          [class.text-[#526579]]="vista() !== 'cambios'"
        >
          Cambios
        </button>
      </div>

      @if (vista() === 'accesos') {
        <div class="rounded-xl border border-[#E2E8F0] bg-white p-4" aria-label="Filtros de accesos">
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <label class="mb-1 block text-xs font-semibold text-[#526579]" for="filtro-acceso-usuario">Usuario o actor</label>
              <input
                id="filtro-acceso-usuario"
                type="text"
                [ngModel]="filtroAccesoUsuario()"
                (ngModelChange)="filtroAccesoUsuario.set($event)"
                placeholder="Ej. admin.colegio o #10"
                aria-label="Usuario o actor"
                class="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs text-[#20354E]"
              />
            </div>
            <div>
              <label class="mb-1 block text-xs font-semibold text-[#526579]" for="filtro-acceso-metodo">Método HTTP</label>
              <select
                id="filtro-acceso-metodo"
                [ngModel]="filtroAccesoMetodo()"
                (ngModelChange)="filtroAccesoMetodo.set($event)"
                aria-label="Método HTTP"
                class="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs text-[#20354E]"
              >
                <option value="">Todos los métodos</option>
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
            <div>
              <label class="mb-1 block text-xs font-semibold text-[#526579]" for="filtro-acceso-ruta">Ruta u operación</label>
              <input
                id="filtro-acceso-ruta"
                type="text"
                [ngModel]="filtroAccesoRuta()"
                (ngModelChange)="filtroAccesoRuta.set($event)"
                placeholder="Ej. /api/v1/usuarios"
                aria-label="Ruta u operación"
                class="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs text-[#20354E]"
              />
            </div>
            <div>
              <label class="mb-1 block text-xs font-semibold text-[#526579]">Fecha desde</label>
              <app-ui-calendar [ngModel]="filtroAccesoFechaInicio()" (ngModelChange)="filtroAccesoFechaInicio.set($event)" aria-label="Fecha desde accesos" />
            </div>
            <div>
              <label class="mb-1 block text-xs font-semibold text-[#526579]">Fecha hasta</label>
              <app-ui-calendar [ngModel]="filtroAccesoFechaFin()" (ngModelChange)="filtroAccesoFechaFin.set($event)" aria-label="Fecha hasta accesos" />
            </div>
          </div>
          <div class="mt-3 flex flex-wrap items-center justify-between gap-2">
            <span class="text-xs font-medium text-[#526579]">
              Mostrando {{ accesosFiltrados().length }} de {{ pagina()?.totalElements ?? 0 }} accesos en la página actual
            </span>
            <button
              type="button"
              (click)="limpiarFiltrosAccesos()"
              class="min-h-10 rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-semibold text-[#526579] hover:bg-[#F8FAFC]"
            >
              Limpiar filtros
            </button>
          </div>
        </div>
      }

      @if (vista() === 'cambios') {
        <div class="rounded-xl border border-[#E2E8F0] bg-white p-4" aria-label="Filtros de cambios">
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <label class="mb-1 block text-xs font-semibold text-[#526579]">Fecha Desde</label>
              <app-ui-calendar [(ngModel)]="filtroFechaInicio" aria-label="Fecha Desde" />
            </div>
            <div>
              <label class="mb-1 block text-xs font-semibold text-[#526579]">Fecha Hasta</label>
              <app-ui-calendar [(ngModel)]="filtroFechaFin" aria-label="Fecha Hasta" />
            </div>
            <div>
              <label class="mb-1 block text-xs font-semibold text-[#526579]" for="filtro-cambio-usuario-id">Usuario ID</label>
              <input
                id="filtro-cambio-usuario-id"
                appFormatoEntrada="entero"
                type="number"
                [(ngModel)]="filtroUsuarioId"
                placeholder="Ej. 1"
                aria-label="Usuario ID"
                class="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs text-[#20354E]"
              />
            </div>
            <div>
              <label class="mb-1 block text-xs font-semibold text-[#526579]" for="filtro-cambio-tabla">Tabla afectada</label>
              <input
                id="filtro-cambio-tabla"
                type="text"
                [(ngModel)]="filtroTabla"
                placeholder="Ej. usuarios"
                aria-label="Tabla afectada"
                class="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs text-[#20354E]"
              />
            </div>
            <div>
              <label class="mb-1 block text-xs font-semibold text-[#526579]" for="filtro-cambio-operacion">Operación</label>
              <select
                id="filtro-cambio-operacion"
                [ngModel]="filtroAccionCambio()"
                (ngModelChange)="filtroAccionCambio.set($event)"
                aria-label="Operación"
                class="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs text-[#20354E]"
              >
                <option value="">Todas las operaciones</option>
                <option value="INSERT">INSERT</option>
                <option value="UPDATE">UPDATE</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
          </div>
          <div class="mt-3 flex flex-wrap items-center justify-between gap-2">
            <span class="text-xs font-medium text-[#526579]">
              Mostrando {{ cambiosFiltrados().length }} de {{ paginaCambios()?.totalElements ?? 0 }} cambios registrados
            </span>
            <div class="flex gap-2">
              <button
                type="button"
                (click)="limpiarFiltrosCambios()"
                class="min-h-10 rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-semibold text-[#526579] hover:bg-[#F8FAFC] cursor-pointer"
              >
                Limpiar
              </button>
              <button
                type="button"
                (click)="filtrarCambios()"
                class="min-h-10 rounded-lg bg-[#173B67] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#20354E] cursor-pointer"
              >
                Filtrar
              </button>
            </div>
          </div>
        </div>
      }

      @if (error()) {
        <div role="alert" class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{{ error() }}</div>
      }

      @if (cargando()) {
        <div role="status" class="rounded-xl border border-[#E2E8F0] bg-white p-8 text-center text-sm text-[#526579]">
          Cargando registros de acciones del sistema…
        </div>
      } @else if (vista() === 'accesos') {
        <div id="panel-accesos" role="tabpanel" aria-labelledby="tab-accesos" class="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <div class="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-sm" [class.lg:col-span-7]="!!accesoSeleccionado()" [class.lg:col-span-12]="!accesoSeleccionado()">
            <div class="overflow-x-auto">
              <table class="w-full min-w-[780px] border-collapse text-left text-sm" data-mobile-table-cards>
                <thead class="bg-[#F1F5F9] text-[11px] uppercase tracking-wide text-[#173B67]">
                  <tr>
                    <th class="px-4 py-3">Fecha y hora</th>
                    <th class="px-4 py-3">Usuario / rol</th>
                    <th class="px-4 py-3">Método y ruta</th>
                    <th class="px-4 py-3">Resultado</th>
                    <th class="px-4 py-3">Origen</th>
                    <th class="px-4 py-3 text-right">Ficha</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-[#E2E8F0]">
                  @for (evento of accesosPaginados(); track evento.id) {
                    <tr
                      class="align-top transition-colors hover:bg-[#F8FAFC] cursor-pointer"
                      [class.bg-[#F1F5F9]]="accesoSeleccionado()?.id === evento.id"
                      (click)="seleccionarAcceso(evento)"
                    >
                      <td data-label="Fecha y hora" class="whitespace-nowrap px-4 py-3 text-[#526579]">
                        {{ evento.fechaEvento | date:'dd/MM/yyyy HH:mm:ss' }}
                      </td>
                      <td data-label="Usuario / rol" class="px-4 py-3">
                        <div class="font-semibold text-[#20354E]">{{ nombreActor(evento) }}</div>
                        <div class="mt-0.5 text-xs text-[#526579]">{{ etiquetaRol(evento) }}</div>
                      </td>
                      <td data-label="Método y ruta" class="px-4 py-3">
                        <span class="mr-2 rounded bg-[#E8F2F8] px-2 py-1 text-[11px] font-bold text-[#173B67]">{{ evento.metodo }}</span>
                        <code class="break-all text-xs text-[#20354E]">{{ evento.ruta }}</code>
                      </td>
                      <td data-label="Resultado" class="px-4 py-3">
                        <span
                          class="rounded-full px-2.5 py-1 text-xs font-semibold"
                          [class.bg-emerald-50]="evento.estadoHttp < 400"
                          [class.text-emerald-700]="evento.estadoHttp < 400"
                          [class.bg-red-50]="evento.estadoHttp >= 400"
                          [class.text-red-700]="evento.estadoHttp >= 400"
                        >
                          {{ evento.estadoHttp }} · {{ evento.duracionMs }} ms
                        </span>
                      </td>
                      <td data-label="Origen" class="px-4 py-3 text-xs text-[#526579]">
                        <div>{{ evento.direccionIp || 'No disponible' }}</div>
                        <div class="mt-0.5 max-w-44 truncate" [title]="evento.agenteUsuario || ''">
                          {{ evento.agenteUsuario || 'Agente no informado' }}
                        </div>
                      </td>
                      <td data-label="Ficha" class="whitespace-nowrap px-4 py-3 text-right">
                        <button
                          type="button"
                          (click)="seleccionarAcceso(evento); $event.stopPropagation()"
                          class="rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-semibold text-[#173B67] hover:bg-[#F8FAFC]"
                        >
                          Inspeccionar
                        </button>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="6" class="px-4 py-12 text-center text-[#526579]">Aún no hay accesos registrados con los filtros seleccionados.</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <ui-paginacion
              [totalRegistros]="accesosFiltrados().length"
              [paginaActual]="paginaAccesosLocal()"
              [tamanoPagina]="10"
              etiqueta="accesos"
              ariaLabel="Paginación de accesos del sistema"
              (cambioPagina)="paginaAccesosLocal.set($event)"
            />
            @if ((pagina()?.totalPages ?? 1) > 1) {
              <div class="flex flex-wrap items-center justify-between gap-3 border-t border-ui-divider bg-ui-surface-soft px-5 py-2.5 text-xs text-ui-muted">
                <span>Bloque servidor {{ (pagina()?.number ?? 0) + 1 }} de {{ pagina()?.totalPages || 1 }} ({{ pagina()?.totalElements ?? 0 }} eventos históricos)</span>
                <div class="flex gap-2">
                  <button type="button" (click)="cargar((pagina()?.number ?? 0) - 1)" [disabled]="!pagina() || pagina()!.number <= 0" class="rounded-lg border border-ui-divider bg-ui-surface px-2.5 py-1 font-semibold text-ui-action disabled:opacity-40 cursor-pointer">Bloque anterior</button>
                  <button type="button" (click)="cargar((pagina()?.number ?? 0) + 1)" [disabled]="!pagina() || pagina()!.number + 1 >= pagina()!.totalPages" class="rounded-lg border border-ui-divider bg-ui-surface px-2.5 py-1 font-semibold text-ui-action disabled:opacity-40 cursor-pointer">Bloque siguiente</button>
                </div>
              </div>
            }
          </div>

          @if (accesoSeleccionado(); as detalleAcceso) {
            <aside
              aria-label="Ficha detallada del evento de acceso"
              class="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm lg:col-span-5 lg:sticky lg:top-24 lg:self-start"
            >
              <div class="flex items-start justify-between gap-3 border-b border-[#E2E8F0] pb-3">
                <div>
                  <p class="text-[11px] font-bold uppercase tracking-wider text-[#0F294D]">Ficha de acceso #{{ detalleAcceso.id }}</p>
                  <h2 class="mt-0.5 text-lg font-bold text-[#20354E]">{{ detalleAcceso.metodo }} {{ detalleAcceso.ruta }}</h2>
                </div>
                <button
                  type="button"
                  (click)="accesoSeleccionado.set(null)"
                  aria-label="Cerrar ficha de acceso"
                  class="rounded-lg border border-[#E2E8F0] px-2.5 py-1 text-xs font-semibold text-[#526579] hover:bg-[#F8FAFC]"
                >
                  Cerrar
                </button>
              </div>

              <dl class="mt-4 space-y-3 text-xs">
                <div class="rounded-lg bg-[#F8FAFC] p-3">
                  <dt class="font-bold uppercase tracking-wide text-[#526579]">Identidad real de ejecución</dt>
                  <dd class="mt-1 text-sm font-semibold text-[#20354E]">{{ nombreActor(detalleAcceso) }}</dd>
                  <dd class="mt-0.5 text-[#526579]">
                    ID de cuenta: {{ detalleAcceso.usuarioId ?? 'No autenticado' }} · Rol activo: {{ etiquetaRol(detalleAcceso) }}
                  </dd>
                </div>
                <div class="grid grid-cols-2 gap-3">
                  <div class="rounded-lg border border-[#E2E8F0] p-3">
                    <dt class="font-semibold text-[#526579]">Fecha y hora (UTC/Local)</dt>
                    <dd class="mt-1 font-semibold text-[#20354E]">{{ detalleAcceso.fechaEvento | date:'dd/MM/yyyy HH:mm:ss' }}</dd>
                  </div>
                  <div class="rounded-lg border border-[#E2E8F0] p-3">
                    <dt class="font-semibold text-[#526579]">Estado HTTP y latencia</dt>
                    <dd class="mt-1 font-semibold text-[#20354E]">HTTP {{ detalleAcceso.estadoHttp }} ({{ detalleAcceso.duracionMs }} ms)</dd>
                  </div>
                </div>
                <div class="rounded-lg border border-[#E2E8F0] p-3">
                  <dt class="font-semibold text-[#526579]">Identificador de correlación (Request ID)</dt>
                  <dd class="mt-1 break-all font-mono text-[#20354E]">{{ detalleAcceso.solicitudId || 'Sin solicitudId' }}</dd>
                </div>
                <div class="rounded-lg border border-[#E2E8F0] p-3">
                  <dt class="font-semibold text-[#526579]">Dirección IP de origen</dt>
                  <dd class="mt-1 font-mono text-[#20354E]">{{ detalleAcceso.direccionIp || 'No disponible' }}</dd>
                </div>
                <div class="rounded-lg border border-[#E2E8F0] p-3">
                  <dt class="font-semibold text-[#526579]">User-Agent completo</dt>
                  <dd class="mt-1 break-words font-mono text-[#20354E]">{{ detalleAcceso.agenteUsuario || 'Agente no informado' }}</dd>
                </div>
              </dl>
            </aside>
          }
        </div>
      } @else {
        <div id="panel-cambios" role="tabpanel" aria-labelledby="tab-cambios" class="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <div class="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-sm" [class.lg:col-span-7]="!!cambioSeleccionado()" [class.lg:col-span-12]="!cambioSeleccionado()">
            <div class="overflow-x-auto">
              <table class="w-full min-w-[780px] border-collapse text-left text-sm" data-mobile-table-cards>
                <thead class="bg-[#F1F5F9] text-[11px] uppercase tracking-wide text-[#173B67]">
                  <tr>
                    <th class="px-4 py-3">Fecha y hora</th>
                    <th class="px-4 py-3">Actor / rol</th>
                    <th class="px-4 py-3">Acción</th>
                    <th class="px-4 py-3">Registro afectado</th>
                    <th class="px-4 py-3 text-right">Ficha</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-[#E2E8F0]">
                  @for (cambio of cambiosPaginados(); track cambio.id) {
                    <tr
                      class="align-top transition-colors hover:bg-[#F8FAFC] cursor-pointer"
                      [class.bg-[#F1F5F9]]="cambioSeleccionado()?.id === cambio.id"
                      (click)="seleccionarCambio(cambio)"
                    >
                      <td data-label="Fecha y hora" class="whitespace-nowrap px-4 py-3 text-[#526579]">
                        {{ cambio.fechaCreacion | date:'dd/MM/yyyy HH:mm:ss' }}
                      </td>
                      <td data-label="Actor / rol" class="px-4 py-3">
                        <div class="font-semibold text-[#20354E]">{{ nombreActorCambio(cambio) }}</div>
                        <div class="mt-0.5 text-xs text-[#526579]">{{ etiquetaRolCambio(cambio) }}</div>
                      </td>
                      <td data-label="Acción" class="px-4 py-3">
                        <span class="rounded bg-[#E8F2F8] px-2 py-1 text-[11px] font-bold text-[#173B67]">{{ cambio.accion }}</span>
                      </td>
                      <td data-label="Registro afectado" class="px-4 py-3">
                        <div class="font-semibold text-[#20354E]">{{ cambio.tablaAfectada }}</div>
                        <div class="mt-0.5 break-all text-xs text-[#526579]">Clave {{ cambio.registroClave }}</div>
                      </td>
                      <td data-label="Ficha" class="whitespace-nowrap px-4 py-3 text-right">
                        <button
                          type="button"
                          (click)="seleccionarCambio(cambio); $event.stopPropagation()"
                          class="rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-semibold text-[#173B67] hover:bg-[#F8FAFC]"
                        >
                          Ver cambios
                        </button>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="5" class="px-4 py-12 text-center text-[#526579]">Aún no hay cambios de datos registrados.</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <ui-paginacion
              [totalRegistros]="cambiosFiltrados().length"
              [paginaActual]="paginaCambiosLocal()"
              [tamanoPagina]="10"
              etiqueta="cambios"
              ariaLabel="Paginación de cambios de datos"
              (cambioPagina)="paginaCambiosLocal.set($event)"
            />
            @if ((paginaCambios()?.totalPages ?? 1) > 1) {
              <div class="flex flex-wrap items-center justify-between gap-3 border-t border-ui-divider bg-ui-surface-soft px-5 py-2.5 text-xs text-ui-muted">
                <span>Bloque servidor {{ (paginaCambios()?.number ?? 0) + 1 }} de {{ paginaCambios()?.totalPages || 1 }} ({{ paginaCambios()?.totalElements ?? 0 }} cambios históricos)</span>
                <div class="flex gap-2">
                  <button type="button" (click)="cargarCambios((paginaCambios()?.number ?? 0) - 1)" [disabled]="!paginaCambios() || paginaCambios()!.number <= 0" class="rounded-lg border border-ui-divider bg-ui-surface px-2.5 py-1 font-semibold text-ui-action disabled:opacity-40 cursor-pointer">Bloque anterior</button>
                  <button type="button" (click)="cargarCambios((paginaCambios()?.number ?? 0) + 1)" [disabled]="!paginaCambios() || paginaCambios()!.number + 1 >= paginaCambios()!.totalPages" class="rounded-lg border border-ui-divider bg-ui-surface px-2.5 py-1 font-semibold text-ui-action disabled:opacity-40 cursor-pointer">Bloque siguiente</button>
                </div>
              </div>
            }
          </div>

          @if (cambioSeleccionado(); as detalleCambio) {
            <aside
              aria-label="Ficha detallada del cambio de datos"
              class="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm lg:col-span-5 lg:sticky lg:top-24 lg:self-start"
            >
              <div class="flex items-start justify-between gap-3 border-b border-[#E2E8F0] pb-3">
                <div>
                  <p class="text-[11px] font-bold uppercase tracking-wider text-[#0F294D]">Ficha de cambio #{{ detalleCambio.id }}</p>
                  <h2 class="mt-0.5 text-lg font-bold text-[#20354E]">
                    {{ detalleCambio.accion }} · {{ detalleCambio.tablaAfectada }}
                  </h2>
                </div>
                <button
                  type="button"
                  (click)="cambioSeleccionado.set(null)"
                  aria-label="Cerrar ficha de cambio"
                  class="rounded-lg border border-[#E2E8F0] px-2.5 py-1 text-xs font-semibold text-[#526579] hover:bg-[#F8FAFC]"
                >
                  Cerrar
                </button>
              </div>

              <dl class="mt-4 space-y-3 text-xs">
                <div class="rounded-lg bg-[#F8FAFC] p-3">
                  <dt class="font-bold uppercase tracking-wide text-[#526579]">Identidad real del ejecutor</dt>
                  <dd class="mt-1 text-sm font-semibold text-[#20354E]">{{ nombreActorCambio(detalleCambio) }}</dd>
                  <dd class="mt-0.5 text-[#526579]">
                    ID usuario: {{ detalleCambio.usuarioId ?? 'No disponible' }} · {{ etiquetaRolCambio(detalleCambio) }}
                  </dd>
                </div>
                <div class="grid grid-cols-2 gap-3">
                  <div class="rounded-lg border border-[#E2E8F0] p-3">
                    <dt class="font-semibold text-[#526579]">Fecha de operación</dt>
                    <dd class="mt-1 font-semibold text-[#20354E]">{{ detalleCambio.fechaCreacion | date:'dd/MM/yyyy HH:mm:ss' }}</dd>
                  </div>
                  <div class="rounded-lg border border-[#E2E8F0] p-3">
                    <dt class="font-semibold text-[#526579]">Clave primaria</dt>
                    <dd class="mt-1 font-mono font-semibold text-[#20354E]">{{ detalleCambio.registroClave }}</dd>
                  </div>
                </div>
                <div>
                  <dt class="mb-1 font-semibold text-[#526579]">Payload anterior (Antes)</dt>
                  <dd>
                    <pre class="max-h-52 overflow-auto whitespace-pre-wrap break-all rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3 font-mono text-[11px] text-[#20354E]">{{ detalleCambio.datosAnteriores || 'Sin estado anterior' }}</pre>
                  </dd>
                </div>
                <div>
                  <dt class="mb-1 font-semibold text-[#526579]">Payload nuevo (Después)</dt>
                  <dd>
                    <pre class="max-h-52 overflow-auto whitespace-pre-wrap break-all rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3 font-mono text-[11px] text-[#20354E]">{{ detalleCambio.datosNuevos || 'Sin estado nuevo' }}</pre>
                  </dd>
                </div>
              </dl>
            </aside>
          }
        </div>
      }
    </section>
  `
})
export class AuditoriaComponent {
  private readonly auditoria = inject(AuditoriaService);
  readonly pagina = signal<PaginaAuditoriaDto | null>(null);
  readonly paginaCambios = signal<PaginaCambiosAuditoriaDto | null>(null);
  readonly cambios = signal<CambioAuditoriaDto[]>([]);
  readonly vista = signal<'accesos' | 'cambios'>('accesos');
  readonly cargando = signal(false);
  readonly error = signal('');

  readonly accesoSeleccionado = signal<AuditoriaAccesoDto | null>(null);
  readonly cambioSeleccionado = signal<CambioAuditoriaDto | null>(null);

  readonly filtroAccesoUsuario = signal('');
  readonly filtroAccesoMetodo = signal('');
  readonly filtroAccesoRuta = signal('');
  readonly filtroAccesoFechaInicio = signal('');
  readonly filtroAccesoFechaFin = signal('');
  readonly filtroAccionCambio = signal('');

  filtroFechaInicio = '';
  filtroFechaFin = '';
  filtroUsuarioId: number | string = '';
  filtroTabla = '';

  readonly accesosFiltrados = computed(() => {
    const lista = this.pagina()?.content ?? [];
    const usuario = this.filtroAccesoUsuario().trim().toLowerCase();
    const metodo = this.filtroAccesoMetodo().trim().toUpperCase();
    const ruta = this.filtroAccesoRuta().trim().toLowerCase();
    const desde = this.filtroAccesoFechaInicio().trim();
    const hasta = this.filtroAccesoFechaFin().trim();

    return lista.filter(ev => {
      if (usuario) {
        const actor = `${ev.usuarioNombre ?? ''} #${ev.usuarioId ?? ''} ${ev.roles ?? ''}`.toLowerCase();
        if (!actor.includes(usuario)) return false;
      }
      if (metodo && ev.metodo?.toUpperCase() !== metodo) {
        return false;
      }
      if (ruta && !(ev.ruta ?? '').toLowerCase().includes(ruta)) {
        return false;
      }
      if (desde && ev.fechaEvento && ev.fechaEvento.slice(0, 10) < desde) {
        return false;
      }
      if (hasta && ev.fechaEvento && ev.fechaEvento.slice(0, 10) > hasta) {
        return false;
      }
      return true;
    });
  });

  readonly cambiosFiltrados = computed(() => {
    const lista = this.paginaCambios()?.content ?? this.cambios();
    const accion = this.filtroAccionCambio().trim().toUpperCase();
    if (!accion) return lista;
    return lista.filter(c => c.accion?.toUpperCase() === accion);
  });

  readonly paginaAccesosLocal = signal<number>(1);
  readonly paginaCambiosLocal = signal<number>(1);
  readonly accesosPaginados = computed(() => paginarRegistros(this.accesosFiltrados(), this.paginaAccesosLocal(), 10));
  readonly cambiosPaginados = computed(() => paginarRegistros(this.cambiosFiltrados(), this.paginaCambiosLocal(), 10));

  readonly totalResultadosActivos = computed(() => {
    return this.vista() === 'accesos' ? this.accesosFiltrados().length : this.cambiosFiltrados().length;
  });

  nombreActor(evento: AuditoriaAccesoDto): string {
    return evento.usuarioNombre || (evento.usuarioId === null ? 'Actor no identificado' : `Usuario #${evento.usuarioId}`);
  }

  etiquetaRol(evento: AuditoriaAccesoDto): string {
    return evento.roles || 'Rol no informado en este evento';
  }

  nombreActorCambio(cambio: CambioAuditoriaDto): string {
    if (cambio.contextoHistoricoSinSnapshot) return cambio.usuarioId === null ? 'Usuario no identificado' : `Usuario #${cambio.usuarioId}`;
    return cambio.usuarioNombre || (cambio.usuarioId === null ? 'Actor no identificado' : `Usuario #${cambio.usuarioId}`);
  }

  etiquetaRolCambio(cambio: CambioAuditoriaDto): string {
    return cambio.contextoHistoricoSinSnapshot
      ? 'Rol no conservado en este evento histórico'
      : cambio.roles || 'Rol no informado en este evento';
  }

  constructor() {
    this.cargar();
  }

  cambiarVista(nuevaVista: 'accesos' | 'cambios'): void {
    if (nuevaVista === 'accesos') {
      this.vista.set('accesos');
    } else {
      this.cargarCambios(0);
    }
  }

  seleccionarAcceso(evento: AuditoriaAccesoDto): void {
    this.accesoSeleccionado.set(evento);
  }

  seleccionarCambio(cambio: CambioAuditoriaDto): void {
    this.cambioSeleccionado.set(cambio);
  }

  limpiarFiltrosAccesos(): void {
    this.paginaAccesosLocal.set(1);
    this.filtroAccesoUsuario.set('');
    this.filtroAccesoMetodo.set('');
    this.filtroAccesoRuta.set('');
    this.filtroAccesoFechaInicio.set('');
    this.filtroAccesoFechaFin.set('');
  }

  cargar(page = 0): void {
    if (page < 0) return;
    this.paginaAccesosLocal.set(1);
    this.vista.set('accesos');
    this.cargando.set(true);
    this.error.set('');
    this.auditoria.listar(page).subscribe({
      next: resultado => {
        this.pagina.set(resultado);
        if (resultado.content.length > 0 && !this.accesoSeleccionado()) {
          this.accesoSeleccionado.set(resultado.content[0]);
        }
      },
      error: () => {
        this.error.set('No se pudo cargar la auditoría de accesos.');
        this.cargando.set(false);
      },
      complete: () => this.cargando.set(false)
    });
  }

  cargarCambios(page = 0): void {
    if (page < 0) return;
    this.paginaCambiosLocal.set(1);
    this.vista.set('cambios');
    this.cargando.set(true);
    this.error.set('');

    const filtros: { fechaInicio?: string; fechaFin?: string; usuarioId?: number; tabla?: string } = {};
    if (this.filtroFechaInicio) filtros.fechaInicio = this.filtroFechaInicio;
    if (this.filtroFechaFin) filtros.fechaFin = this.filtroFechaFin;
    if (this.filtroUsuarioId !== '' && this.filtroUsuarioId !== null && this.filtroUsuarioId !== undefined) {
      const uid = Number(this.filtroUsuarioId);
      if (!isNaN(uid)) filtros.usuarioId = uid;
    }
    if (this.filtroTabla?.trim()) filtros.tabla = this.filtroTabla.trim();

    this.auditoria.listarCambios(page, 50, filtros).subscribe({
      next: resultado => {
        this.paginaCambios.set(resultado);
        this.cambios.set(resultado.content);
        if (resultado.content.length > 0 && !this.cambioSeleccionado()) {
          this.cambioSeleccionado.set(resultado.content[0]);
        }
      },
      error: () => {
        this.error.set('No se pudieron cargar los cambios de datos.');
        this.cargando.set(false);
      },
      complete: () => this.cargando.set(false)
    });
  }

  filtrarCambios(): void {
    this.cargarCambios(0);
  }

  limpiarFiltrosCambios(): void {
    this.filtroFechaInicio = '';
    this.filtroFechaFin = '';
    this.filtroUsuarioId = '';
    this.filtroTabla = '';
    this.filtroAccionCambio.set('');
    this.cargarCambios(0);
  }

  actualizar(): void {
    if (this.vista() === 'accesos') this.cargar(this.pagina()?.number ?? 0);
    else this.cargarCambios(this.paginaCambios()?.number ?? 0);
  }
}
