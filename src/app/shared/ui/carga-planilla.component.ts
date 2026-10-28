import { Component, EventEmitter, inject, Input, OnChanges, OnDestroy, Output, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { EvaluacionService, ImportacionCneb } from '../../core/services/evaluacion.service';
@Component({
    selector: 'app-carga-planilla', standalone: true,
    template: `<section class="grid gap-3 rounded-xl border border-ui-border bg-ui-surface p-4 font-sans text-ui-text" aria-label="Importar planilla CNEB">
    <h2 class="font-semibold">Importar calificaciones CSV o Excel</h2>
    <p class="text-sm">Descarga la plantilla de la competencia seleccionada. Conserva el DNI como texto para mantener sus ocho dígitos.</p>
    <div class="flex flex-wrap items-center gap-3">
      <button type="button" class="min-h-11 rounded-lg border p-2" [disabled]="!contextoValido || procesando()" (click)="plantilla()">Descargar plantilla CSV</button>
      <label class="grid gap-1 text-sm">Planilla, hasta 5 MB y 500 filas
        <input type="file" accept=".csv,.xlsx" [disabled]="!contextoValido || procesando()" (change)="seleccionar($event)" class="min-h-11" />
      </label>
      <button type="button" class="min-h-11 rounded-lg border p-2" [disabled]="!archivo || procesando()" (click)="enviar(false)">Validar y previsualizar</button>
      <button type="button" class="min-h-11 rounded-lg bg-ui-action px-3 py-2 font-sans font-semibold text-ui-action-text disabled:opacity-50" [disabled]="!vista() || procesando()" (click)="enviar(true)">Confirmar carga</button>
    </div>
    <p role="status">{{ procesando() ? 'Procesando planilla…' : mensaje() }}</p>
    @for (error of errores(); track error.campo) { <p role="alert" class="text-sm text-ui-error-text">{{ error.campo }}: {{ error.mensaje }}</p> }
    @if (vista(); as datos) {
      <p>{{ datos.filasValidadas }} filas validadas. Todavía no se guardaron cambios.</p>
      <div class="max-h-80 overflow-auto"><table class="w-full text-left text-sm"><thead><tr><th>Fila</th><th>DNI</th><th>Estudiante</th><th>Competencia</th><th>Nota</th><th>Conclusión</th></tr></thead><tbody>
        @for (fila of datos.filas; track fila.fila) { <tr class="border-t border-ui-border"><td class="p-2">{{ fila.fila }}</td><td>{{ fila.dni }}</td><td>{{ fila.estudiante }}</td><td>{{ fila.competenciaId }}</td><td>{{ fila.nota }}</td><td>{{ fila.conclusion }}</td></tr> }
      </tbody></table></div>
    }
  </section>`
})
export class CargaPlanillaComponent implements OnChanges, OnDestroy {
    private readonly servicio = inject(EvaluacionService);
    @Input()
    asignacionId = 0;
    @Input()
    periodoId = 0;
    @Input()
    seccionId = 0;
    @Input()
    competenciaId = 0;
    @Output()
    readonly completada = new EventEmitter<number>();
    archivo: File | null = null;
    readonly vista = signal<ImportacionCneb | null>(null);
    readonly procesando = signal(false);
    readonly mensaje = signal('');
    readonly errores = signal<Array<{
        campo: string;
        mensaje: string;
    }>>([]);
    private peticion?: Subscription;
    get contextoValido(): boolean { return !!(this.asignacionId && this.periodoId && this.seccionId && this.competenciaId); }
    ngOnChanges(): void { this.peticion?.unsubscribe(); this.archivo = null; this.vista.set(null); this.errores.set([]); this.mensaje.set(''); this.procesando.set(false); }
    ngOnDestroy(): void { this.peticion?.unsubscribe(); }
    seleccionar(event: Event): void {
        this.vista.set(null);
        this.errores.set([]);
        this.mensaje.set('');
        const input = event.target as HTMLInputElement;
        const archivo = input.files?.[0];
        this.archivo = null;
        if (!archivo)
            return;
        if (!/\.(csv|xlsx)$/i.test(archivo.name) || archivo.size > 5 * 1024 * 1024 || archivo.size === 0) {
            this.mensaje.set('Adjunta una planilla CSV o XLSX válida, de hasta 5 MB.');
            input.value = '';
            return;
        }
        this.archivo = archivo;
    }
    enviar(confirmar: boolean): void {
        if (!this.archivo || !this.contextoValido || this.procesando() || (confirmar && !this.vista()))
            return;
        this.procesando.set(true);
        this.errores.set([]);
        this.mensaje.set('');
        this.peticion = this.servicio.importarPlanilla(this.archivo, this.periodoId, this.seccionId, this.asignacionId, confirmar).subscribe({
            next: resultado => {
                this.procesando.set(false);
                if (confirmar) {
                    this.vista.set(null);
                    this.archivo = null;
                    this.mensaje.set(`${resultado.filasProcesadas} calificaciones guardadas.`);
                    this.completada.emit(resultado.filasProcesadas);
                }
                else
                    this.vista.set(resultado);
            },
            error: error => {
                this.procesando.set(false);
                this.vista.set(null);
                this.mensaje.set(error?.error?.message ?? 'No se pudo procesar la planilla. No se confirmaron cambios.');
                this.errores.set(Object.entries(error?.error?.validationErrors ?? {}).map(([campo, mensaje]) => ({ campo, mensaje: String(mensaje) })));
            }
        });
    }
    plantilla(): void {
        if (!this.contextoValido)
            return;
        this.servicio.descargarPlantilla(this.asignacionId, this.periodoId, this.competenciaId).subscribe({
            next: blob => guardarDescarga(blob, 'plantilla_calificaciones_cneb.csv'),
            error: () => this.mensaje.set('No se pudo descargar la plantilla.')
        });
    }
}
export function guardarDescarga(blob: Blob, nombre: string): void {
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombre;
    enlace.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
