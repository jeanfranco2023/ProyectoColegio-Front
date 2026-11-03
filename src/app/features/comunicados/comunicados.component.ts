import { Component, ElementRef, inject, signal, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { map } from 'rxjs';
import { ComunicadoService } from '../../core/services/comunicado.service';
import { AcademicoService } from '../../core/services/academico.service';
import { AuthStore } from '../../core/state/auth.store';
import { AnioLectivoResponseDto } from '../../core/models/academico.model';
import { UiDatePePipe } from '../../shared/ui/ui-date-pe.pipe';

export interface ComunicadoEscolar {
  id: number;
  titulo: string;
  resumen: string;
  destinatarios: string;
  fechaPublicacion: string;
  autor: string;
  requiereAcuse: boolean;
  acuseConfirmado: boolean;
}

@Component({
  selector: 'app-comunicados',
  standalone: true,
  imports: [CommonModule, FormsModule, UiDatePePipe],
template: `
    <div class="space-y-6 min-w-0 font-sans text-ui-text [&_button]:min-h-11 [&_input]:min-h-11 [&_select]:min-h-11 [&_textarea]:min-h-11 [&_:focus-visible]:outline-[3px] [&_:focus-visible]:outline-[var(--ui-action)] [&_:focus-visible]:outline-offset-[3px] [&_.grid>div]:min-w-0 [&_.grid>article]:min-w-0">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t-[3px] border-[var(--ui-gold)]/50 pt-3">
        <div>
          <h2 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-ui-text tracking-[-.025em]">Comunicados Institucionales</h2>
          <p class="text-sm text-ui-muted mt-1">
            Difusión de circulares oficiales y avisos a la comunidad educativa de la I.E.P. Shuji Kitamura.
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <button
            (click)="cargarComunicados()"
            class="px-3 py-2.5 rounded-xl bg-ui-surface-soft hover:bg-ui-divider text-ui-text text-xs !text-[11px] font-semibold cursor-pointer max-[640px]:w-full box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]"
          >
            Actualizar BD
          </button>
          @if (store.hasAnyRole(['DIRECCION', 'SECRETARIA'])) { <button
            (click)="nuevoComunicado()"
            class="px-4 py-2.5 rounded-xl bg-ui-action hover:bg-ui-action text-ui-action-text font-semibold text-xs !text-[11px] sm:!text-[11px] shadow-lg shadow-card transition flex items-center gap-2 cursor-pointer max-[640px]:w-full box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span>Publicar Comunicado en BD</span>
          </button> }
        </div>
      </div>

      @if (error()) { <p class="text-sm text-ui-error-text" role="alert">{{ error() }}</p> }
      @if (mensaje()) { <p class="text-sm text-ui-success-text" role="status">{{ mensaje() }}</p> }
      <dialog #comunicadoDialog class="box-border w-[min(680px,calc(100vw-24px))] max-w-[calc(100vw-24px)] max-h-[calc(100dvh-24px)] overflow-hidden border border-ui-divider rounded-[22px] bg-ui-surface text-ui-text p-0 shadow-dialog backdrop:bg-[rgb(12_24_43_/_46%)] backdrop:backdrop-blur-[3px] max-[639px]:w-[calc(100vw-16px)] max-[639px]:max-w-[calc(100vw-16px)] max-[639px]:max-h-[calc(100dvh-16px)] max-[639px]:rounded-[18px] !w-[min(620px,calc(100vw_-_24px))] !max-w-[calc(100vw_-_24px)] !max-h-[calc(100dvh_-_24px)] !overflow-auto" aria-labelledby="comunicado-dialog-title">
        <div class="flex max-h-[calc(100dvh-24px)] min-h-0 flex-col"><header class="flex flex-[0_0_auto] items-center justify-between gap-4 border-b border-ui-divider px-6 py-5 [&_h3]:m-0 [&_h3]:text-ui-text [&_h3]:text-lg [&_h3]:leading-[27px] [&_h3]:font-[750] [&_p]:mb-0 [&_p]:mt-1 [&_p]:text-ui-muted [&_p]:text-xs [&_p]:leading-[1.5] max-[639px]:p-4"><div><h3 id="comunicado-dialog-title" class="tracking-[-.025em]">Publicar comunicado</h3><p>El mensaje será visible para la comunidad según su alcance.</p></div><button type="button" class="min-h-11 rounded-xl border border-ui-divider bg-ui-surface-soft px-4 font-semibold text-ui-text !grid !h-11 !w-11 !min-h-11 !min-w-11 !flex-none !place-items-center !p-0 !font-[650]" (click)="cerrarDialogo()" aria-label="Cerrar">✕</button></header>
          <form (ngSubmit)="publicar()" class="flex min-h-0 flex-[1_1_auto] flex-col"><div class="min-h-0 flex-[1_1_auto] overflow-auto overscroll-contain px-6 py-5 max-[639px]:p-4 space-y-4">
            @if (error()) { <p class="m-0 rounded-xl border border-ui-error-border bg-ui-error-bg px-3 py-[10px] text-xs text-ui-error-text" role="alert">{{ error() }}</p> }
            <label class="block min-w-0 text-xs font-semibold leading-normal text-ui-muted [&_input]:mt-[6px] [&_input]:block [&_input]:w-full [&_select]:mt-[6px] [&_select]:block [&_select]:w-full [&_textarea]:mt-[6px] [&_textarea]:block [&_textarea]:w-full">Año lectivo *<select [(ngModel)]="anioLectivoId" name="anioLectivoId" [disabled]="!anios().length" required class="min-w-0 !min-h-[46px] max-w-full border px-3 py-[10px] !border-ui-control-border rounded-xl !bg-ui-surface !text-ui-text transition-colors focus:border-[var(--ui-focus)] focus:outline-none focus:shadow-[0_0_0_3px_var(--ui-focus-shadow)] max-[639px]:text-base !font-[650]">@if (!anios().length) { <option [ngValue]="0">Sin años lectivos disponibles</option> } @for (anio of anios(); track anio.id) { <option [ngValue]="anio.id">Año {{ anio.anio }}</option> }</select></label>
            <label class="block min-w-0 text-xs font-semibold leading-normal text-ui-muted [&_input]:mt-[6px] [&_input]:block [&_input]:w-full [&_select]:mt-[6px] [&_select]:block [&_select]:w-full [&_textarea]:mt-[6px] [&_textarea]:block [&_textarea]:w-full">Título *<input [(ngModel)]="titulo" name="titulo" required maxlength="150" placeholder="Asunto del comunicado" class="min-w-0 !min-h-[46px] max-w-full border px-3 py-[10px] !border-ui-control-border rounded-xl !bg-ui-surface !text-ui-text transition-colors focus:border-[var(--ui-focus)] focus:outline-none focus:shadow-[0_0_0_3px_var(--ui-focus-shadow)] max-[639px]:text-base !font-[650]"></label>
            <label class="block min-w-0 text-xs font-semibold leading-normal text-ui-muted [&_input]:mt-[6px] [&_input]:block [&_input]:w-full [&_select]:mt-[6px] [&_select]:block [&_select]:w-full [&_textarea]:mt-[6px] [&_textarea]:block [&_textarea]:w-full">Contenido *<textarea [(ngModel)]="contenido" name="contenido" required maxlength="20000" rows="6" placeholder="Escribe el mensaje para la comunidad" class="min-w-0 max-w-full border px-3 py-[10px] !border-ui-control-border rounded-xl !bg-ui-surface !text-ui-text transition-colors focus:border-[var(--ui-focus)] focus:outline-none focus:shadow-[0_0_0_3px_var(--ui-focus-shadow)] max-[639px]:text-base py-[10px] resize-y !min-h-[110px] !font-[650]"></textarea></label>
            <label class="inline-flex items-center gap-3 text-sm text-ui-text"><input type="checkbox" class="w-[18px] accent-[var(--ui-action)] !font-[650]" [(ngModel)]="requiereAcuse" name="requiereAcuse"> Solicitar confirmación de lectura</label>
          </div><footer class="sticky bottom-0 z-[1] flex flex-[0_0_auto] flex-wrap justify-end gap-[10px] border-t border-ui-divider bg-ui-surface px-6 py-[14px] max-[639px]:px-4 max-[639px]:py-3 max-[639px]:[&>button]:flex-[1_1_auto]"><button type="button" class="rounded-xl border border-ui-divider bg-ui-surface-soft px-4 font-semibold text-ui-text max-[640px]:w-full box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]" (click)="cerrarDialogo()">Cancelar</button><button type="submit" [disabled]="publicando()" class="rounded-xl bg-ui-action px-[18px] font-bold text-ui-action-text shadow-card disabled:cursor-wait disabled:opacity-[.55] max-[640px]:w-full box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px]">{{ publicando() ? 'Publicando…' : 'Publicar comunicado' }}</button></footer></form>
        </div>
      </dialog>

      <!-- Feed Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
        @if (cargando()) {
          <div class="col-span-full p-12 text-center text-ui-muted rounded-2xl bg-ui-surface border border-ui-divider">
            <span class="inline-block w-6 h-6 border-2 border-ui-action/30 border-t-ui-action rounded-full animate-spin mb-2"></span>
            <p class="text-xs !text-[11px]">Consultando comunicados en la base de datos...</p>
          </div>
        } @else {
          @for (item of comunicados(); track item.id) {
            <div class="p-6 rounded-2xl bg-ui-surface border border-ui-divider hover:border-ui-divider transition space-y-3 shadow-sm flex flex-col justify-between">
              <div>
                <div class="flex items-center justify-between gap-2">
                  <span class="px-2.5 py-0.5 rounded-md text-[11px] font-bold tracking-wide uppercase bg-ui-surface-soft text-ui-action border border-ui-divider">
                    Para: {{ item.destinatarios }}
                  </span>
                </div>

                <h3 class="text-base font-bold text-ui-text mt-3 tracking-[-.025em]">{{ item.titulo }}</h3>
                <p class="text-xs !text-[11px] text-ui-muted mt-2 leading-relaxed">{{ item.resumen }}</p>
              </div>

              <div class="pt-4 border-t border-ui-divider flex items-center justify-between text-[11px] text-ui-muted font-mono">
                <span>Publicado por: {{ item.autor }}</span>
                <span>{{ item.fechaPublicacion | uiDatePe }}</span>
              </div>
              @if (esSoloApoderado() && item.requiereAcuse) {
                <button (click)="confirmarAcuse(item.id)" [disabled]="item.acuseConfirmado" class="mt-3 p-2 rounded bg-ui-action text-ui-action-text text-xs !text-[11px] max-[640px]:w-full box-border inline-flex min-w-0 !min-h-[44px] items-center justify-center gap-2 font-sans text-sm font-semibold leading-[1.25] text-center align-middle max-[639px]:!min-h-[44px] disabled:cursor-not-allowed disabled:opacity-60">{{ item.acuseConfirmado ? 'Lectura confirmada' : 'Confirmar lectura y acuse' }}</button>
              }
            </div>
          } @empty {
            <div [hidden]="!!error()" class="col-span-full p-12 text-center text-ui-muted rounded-2xl bg-ui-surface border border-ui-divider space-y-2 relative pt-[62px]" data-illustration="calendar"><svg aria-hidden="true" class="absolute left-1/2 top-3 h-[42px] w-[42px] -translate-x-1/2 fill-none stroke-[var(--ui-action)] stroke-2 [stroke-linecap:round] [stroke-linejoin:round]"><rect x="7" y="10" width="34" height="31" rx="4"/><path d="M15 6v8m18-8v8M7 19h34" stroke="var(--ui-gold)"/><path d="M15 26h4m5 0h4m5 0h3M15 33h4m5 0h4"/></svg>
              <p class="font-medium text-ui-muted">No hay comunicados oficiales emitidos en la base de datos.</p>
              <p class="text-xs !text-[11px] text-ui-muted">Las circulares y notificaciones dirigidas a la comunidad educativa se sincronizarán directamente desde PostgreSQL.</p>
            </div>
          }
        }
      </div>
    </div>
  `
})
export class ComunicadosComponent implements OnInit {
  private readonly comunicadoService = inject(ComunicadoService);
  private readonly academicoService = inject(AcademicoService);
  @ViewChild('comunicadoDialog') private comunicadoDialog!: ElementRef<HTMLDialogElement>;
  readonly store = inject(AuthStore);
  readonly acusesConfirmados = signal<ReadonlySet<number>>(new Set());
  readonly anios = signal<AnioLectivoResponseDto[]>([]);
  readonly publicando = signal(false);
  readonly error = signal<string | null>(null);
  readonly mensaje = signal<string | null>(null);
  anioLectivoId = 0;
  titulo = '';
  contenido = '';
  requiereAcuse = false;

  cargando = signal(false);
  readonly comunicados = signal<ComunicadoEscolar[]>([]);

  ngOnInit(): void {
    this.restaurarAcusesConfirmados();
    this.cargarComunicados();
    if (this.store.hasAnyRole(['DIRECCION', 'SECRETARIA'])) {
      this.academicoService.listarAnios().subscribe({ next: anios => { this.anios.set(anios); this.anioLectivoId = anios.find(a => a.abierto)?.id ?? anios[0]?.id ?? 0; } });
    }
  }

  cargarComunicados(): void {
    this.error.set(null);
    this.cargando.set(true);
    const consulta = this.esSoloApoderado()
      ? this.comunicadoService.consultarBandeja(0, 20).pipe(map(res => res.comunicados))
      : this.comunicadoService.listarPublicados();
    consulta.subscribe({
      next: (res) => {
        this.cargando.set(false);
        if (Array.isArray(res)) {
          this.comunicados.set(
            res.map((c) => ({
              id: c.id,
              titulo: c.titulo || 'Sin título',
              resumen: c.contenido || 'Sin contenido adicional',
              destinatarios: 'Destinatario no informado',
              fechaPublicacion: c.fechaPublicacion ? String(c.fechaPublicacion).split('T')[0] : '—',
              autor: c.remitenteUsuarioId ? `Usuario #${c.remitenteUsuarioId}` : '—',
              requiereAcuse: c.requiereAcuse,
              // GET de bandeja/publicados no incluye el acuse por destinatario.
              // Se conserva localmente durante la sesión; el POST confirma el estado real.
              acuseConfirmado: this.acusesConfirmados().has(c.id)
            }))
          );
        } else {
          this.comunicados.set([]);
        }
      },
      error: () => {
        this.cargando.set(false);
        this.comunicados.set([]);
        this.error.set('No se pudieron cargar los comunicados.');
      }
    });
  }

  nuevoComunicado(): void {
    this.error.set(null);
    this.mensaje.set(null);
    this.titulo = '';
    this.contenido = '';
    this.requiereAcuse = false;
    this.comunicadoDialog.nativeElement.showModal();
  }

  esSoloApoderado(): boolean {
    return this.store.hasRole('APODERADO') && !this.store.hasAnyRole(['DIRECCION', 'SECRETARIA']);
  }

  cerrarDialogo(): void { this.comunicadoDialog.nativeElement.close(); }

  publicar(): void {
    if (!this.anioLectivoId || !this.titulo.trim() || !this.contenido.trim()) { this.error.set('Complete año, título y contenido.'); return; }
    this.publicando.set(true);
    this.error.set(null);
    this.comunicadoService.publicarComunicado({ anioLectivoId: this.anioLectivoId, titulo: this.titulo.trim(), contenido: this.contenido.trim(), requiereAcuse: this.requiereAcuse }).subscribe({
      next: () => { this.publicando.set(false); this.cerrarDialogo(); this.mensaje.set('Comunicado publicado correctamente.'); this.titulo = ''; this.contenido = ''; this.cargarComunicados(); },
      error: err => { this.publicando.set(false); this.error.set(err?.error?.message ?? 'No se pudo publicar el comunicado.'); }
    });
  }

  confirmarAcuse(id: number): void {
    if (this.acusesConfirmados().has(id)) return;
    this.error.set(null);
    this.mensaje.set(null);
    this.comunicadoService.confirmarAcuse(id).subscribe({
      next: (respuesta) => {
        if (!respuesta.acuseConfirmado) {
          this.error.set('El backend no confirmó la lectura.');
          return;
        }
        this.registrarAcuseConfirmado(id);
        this.comunicados.update(items => items.map(item => item.id === id ? { ...item, acuseConfirmado: true } : item));
        this.mensaje.set('Lectura y acuse confirmados.');
      },
      error: err => this.error.set(err?.error?.message ?? 'No se pudo confirmar el acuse.')
    });
  }

  private acuseStorageKey(): string {
    return `shuji.comunicados.acuses.v1.${this.store.user()?.id ?? 'sin-usuario'}`;
  }

  private restaurarAcusesConfirmados(): void {
    try {
      const guardados: unknown = JSON.parse(sessionStorage.getItem(this.acuseStorageKey()) ?? '[]');
      if (Array.isArray(guardados)) {
        this.acusesConfirmados.set(new Set(guardados.filter((id): id is number => Number.isSafeInteger(id) && id > 0)));
      }
    } catch {
      this.acusesConfirmados.set(new Set());
    }
  }

  private registrarAcuseConfirmado(id: number): void {
    const actualizados = new Set(this.acusesConfirmados());
    actualizados.add(id);
    this.acusesConfirmados.set(actualizados);
    try {
      sessionStorage.setItem(this.acuseStorageKey(), JSON.stringify([...actualizados]));
    } catch {
      // Keep the confirmed state for the current component even if session storage is unavailable.
    }
  }
}
