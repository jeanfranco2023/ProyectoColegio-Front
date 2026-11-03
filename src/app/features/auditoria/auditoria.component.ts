import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { AuditoriaService } from '../../core/services/auditoria.service';
import { AuditoriaAccesoDto, CambioAuditoriaDto, PaginaAuditoriaDto } from '../../core/models/auditoria.model';

@Component({
  selector: 'app-auditoria',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="space-y-5 text-[#172b4d]">
      <header class="flex flex-wrap items-end justify-between gap-4 border-t-4 border-[#d9c39b] pt-5">
        <div>
          <p class="text-[11px] font-bold uppercase tracking-[.16em] text-[#9a6b20]">Control institucional</p>
          <h1 class="mt-1 text-3xl font-extrabold tracking-tight">Auditoría de accesos</h1>
          <p class="mt-1 text-sm text-[#5d6b7f]">Registro cronológico de accesos a la API, actor, rol, resultado y duración.</p>
        </div>
        <button type="button" (click)="actualizar()" class="rounded-lg border border-[#d9e2ef] bg-white px-4 py-2.5 text-sm font-semibold hover:bg-[#f7f9fc] focus-visible:outline-2 focus-visible:outline-[#3268c8]">Actualizar</button>
      </header>

      <div class="rounded-xl border border-[#dce4ef] bg-white p-4 text-sm text-[#52627a]">
        Se registra la ruta y el método HTTP sin guardar contraseñas, tokens, parámetros de consulta ni cuerpos de solicitudes.
      </div>

      <div class="flex gap-2 border-b border-[#dce4ef]" role="tablist" aria-label="Tipo de auditoría">
        <button type="button" role="tab" [attr.aria-selected]="vista() === 'accesos'" (click)="vista.set('accesos')" class="border-b-2 px-4 py-3 text-sm font-semibold" [class.border-blue-600]="vista() === 'accesos'" [class.text-blue-700]="vista() === 'accesos'" [class.border-transparent]="vista() !== 'accesos'">Accesos a la API</button>
        <button type="button" role="tab" [attr.aria-selected]="vista() === 'cambios'" (click)="cargarCambios()" class="border-b-2 px-4 py-3 text-sm font-semibold" [class.border-blue-600]="vista() === 'cambios'" [class.text-blue-700]="vista() === 'cambios'" [class.border-transparent]="vista() !== 'cambios'">Cambios de datos</button>
      </div>

      @if (error()) {
        <div role="alert" class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{{ error() }}</div>
      }
      @if (cargando()) {
        <div role="status" class="rounded-xl border border-[#dce4ef] bg-white p-8 text-center text-sm text-[#5d6b7f]">Cargando registros de auditoría…</div>
      } @else if (vista() === 'accesos') {
        <div class="overflow-hidden rounded-xl border border-[#dce4ef] bg-white shadow-sm">
          <div class="overflow-x-auto">
            <table class="w-full min-w-[920px] border-collapse text-left text-sm">
              <thead class="bg-[#f5f7fb] text-[11px] uppercase tracking-wide text-[#59677a]">
                <tr><th class="px-4 py-3">Fecha y hora</th><th class="px-4 py-3">Usuario / rol</th><th class="px-4 py-3">Acción y ruta</th><th class="px-4 py-3">Resultado</th><th class="px-4 py-3">Origen</th><th class="px-4 py-3 text-right">Duración</th></tr>
              </thead>
              <tbody class="divide-y divide-[#edf1f6]">
                @for (evento of pagina()?.content ?? []; track evento.id) {
                  <tr class="align-top hover:bg-[#fafcff]">
                    <td class="whitespace-nowrap px-4 py-3 text-[#52627a]">{{ evento.fechaEvento | date:'dd/MM/yyyy HH:mm:ss' }}</td>
                    <td class="px-4 py-3"><div class="font-semibold">{{ nombreActor(evento) }}</div><div class="mt-1 text-xs text-[#68778d]">{{ etiquetaRol(evento) }}</div></td>
                    <td class="px-4 py-3"><span class="mr-2 rounded bg-[#eaf1fd] px-2 py-1 text-[11px] font-bold text-[#285bad]">{{ evento.metodo }}</span><code class="break-all text-xs text-[#40516a]">{{ evento.ruta }}</code></td>
                    <td class="px-4 py-3"><span class="rounded-full px-2.5 py-1 text-xs font-semibold" [class.bg-emerald-50]="evento.estadoHttp < 400" [class.text-emerald-700]="evento.estadoHttp < 400" [class.bg-red-50]="evento.estadoHttp >= 400" [class.text-red-700]="evento.estadoHttp >= 400">{{ evento.estadoHttp }}</span></td>
                    <td class="px-4 py-3 text-xs text-[#52627a]"><div>{{ evento.direccionIp || 'No disponible' }}</div><div class="mt-1 max-w-48 truncate" [title]="evento.agenteUsuario || ''">{{ evento.agenteUsuario || 'Agente no informado' }}</div></td>
                    <td class="whitespace-nowrap px-4 py-3 text-right text-[#52627a]">{{ evento.duracionMs }} ms</td>
                  </tr>
                } @empty {
                  <tr><td colspan="6" class="px-4 py-12 text-center text-[#68778d]">Aún no hay accesos registrados.</td></tr>
                }
              </tbody>
            </table>
          </div>
          <footer class="flex flex-wrap items-center justify-between gap-3 border-t border-[#edf1f6] px-4 py-3 text-xs text-[#59677a]">
            <span>{{ pagina()?.totalElements ?? 0 }} registros · página {{ (pagina()?.number ?? 0) + 1 }} de {{ pagina()?.totalPages || 1 }}</span>
            <div class="flex gap-2">
              <button type="button" (click)="cargar((pagina()?.number ?? 0) - 1)" [disabled]="!pagina() || pagina()!.number <= 0" class="rounded-lg border border-[#d9e2ef] px-3 py-2 font-semibold disabled:cursor-not-allowed disabled:opacity-40">Anterior</button>
              <button type="button" (click)="cargar((pagina()?.number ?? 0) + 1)" [disabled]="!pagina() || pagina()!.number + 1 >= pagina()!.totalPages" class="rounded-lg border border-[#d9e2ef] px-3 py-2 font-semibold disabled:cursor-not-allowed disabled:opacity-40">Siguiente</button>
            </div>
          </footer>
        </div>
      } @else {
        <div class="overflow-x-auto rounded-xl border border-[#dce4ef] bg-white shadow-sm">
          <table class="w-full min-w-[900px] border-collapse text-left text-sm">
            <thead class="bg-[#f5f7fb] text-[11px] uppercase tracking-wide text-[#59677a]"><tr><th class="px-4 py-3">Fecha y hora</th><th class="px-4 py-3">Actor / rol</th><th class="px-4 py-3">Acción</th><th class="px-4 py-3">Registro</th><th class="px-4 py-3">Detalle</th></tr></thead>
            <tbody class="divide-y divide-[#edf1f6]">
              @for (cambio of cambios(); track cambio.id) {
                <tr class="align-top hover:bg-[#fafcff]">
                  <td class="whitespace-nowrap px-4 py-3 text-[#52627a]">{{ cambio.fechaCreacion | date:'dd/MM/yyyy HH:mm:ss' }}</td>
                  <td class="px-4 py-3"><div class="font-semibold">{{ nombreActorCambio(cambio) }}</div><div class="mt-1 text-xs text-[#68778d]">{{ etiquetaRolCambio(cambio) }}</div></td>
                  <td class="px-4 py-3"><span class="rounded bg-[#eaf1fd] px-2 py-1 text-[11px] font-bold text-[#285bad]">{{ cambio.accion }}</span></td>
                  <td class="px-4 py-3"><div class="font-semibold">{{ cambio.tablaAfectada }}</div><div class="mt-1 break-all text-xs text-[#68778d]">Clave {{ cambio.registroClave }}</div></td>
                  <td class="px-4 py-3"><details><summary class="cursor-pointer font-semibold text-[#285bad]">Ver valores registrados</summary><div class="mt-2 grid gap-2 xl:grid-cols-2"><div><p class="mb-1 text-xs font-semibold text-[#68778d]">Antes</p><pre class="max-h-52 overflow-auto whitespace-pre-wrap break-all rounded bg-[#f5f7fb] p-2 text-[11px]">{{ cambio.datosAnteriores || 'Sin estado anterior' }}</pre></div><div><p class="mb-1 text-xs font-semibold text-[#68778d]">Después</p><pre class="max-h-52 overflow-auto whitespace-pre-wrap break-all rounded bg-[#f5f7fb] p-2 text-[11px]">{{ cambio.datosNuevos || 'Sin estado nuevo' }}</pre></div></div></details></td>
                </tr>
              } @empty {
                <tr><td colspan="5" class="px-4 py-12 text-center text-[#68778d]">Aún no hay cambios de datos registrados.</td></tr>
              }
            </tbody>
          </table>
        </div>
      }
    </section>
  `
})
export class AuditoriaComponent {
  private readonly auditoria = inject(AuditoriaService);
  readonly pagina = signal<PaginaAuditoriaDto | null>(null);
  readonly cambios = signal<CambioAuditoriaDto[]>([]);
  readonly vista = signal<'accesos' | 'cambios'>('accesos');
  readonly cargando = signal(false);
  readonly error = signal('');

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

  cargar(page = 0): void {
    if (page < 0) return;
    this.vista.set('accesos');
    this.cargando.set(true);
    this.error.set('');
    this.auditoria.listar(page).subscribe({
      next: resultado => this.pagina.set(resultado),
      error: () => {
        this.error.set('No se pudo cargar la auditoría de accesos.');
        this.cargando.set(false);
      },
      complete: () => this.cargando.set(false)
    });
  }

  cargarCambios(): void {
    this.vista.set('cambios');
    this.cargando.set(true);
    this.error.set('');
    this.auditoria.listarCambios().subscribe({
      next: resultado => this.cambios.set(resultado),
      error: () => {
        this.error.set('No se pudieron cargar los cambios de datos.');
        this.cargando.set(false);
      },
      complete: () => this.cargando.set(false)
    });
  }

  actualizar(): void {
    if (this.vista() === 'accesos') this.cargar(this.pagina()?.number ?? 0);
    else this.cargarCambios();
  }
}
