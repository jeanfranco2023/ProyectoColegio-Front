import { DestroyRef, Directive, ElementRef, inject, input } from '@angular/core';
import {
  sanitizarCelular, sanitizarDireccion, sanitizarDni, sanitizarSoloLetras
} from '../../core/utils/validaciones';

type FormatoEntrada = 'dni' | 'celular' | 'nombre' | 'direccion' | 'correo' | 'entero' | 'monto';

@Directive({ selector: 'input[appFormatoEntrada]', standalone: true })
export class FormatoEntradaDirective {
  readonly appFormatoEntrada = input.required<FormatoEntrada>();

  constructor() {
    const campo: HTMLInputElement = inject(ElementRef).nativeElement;
    const listeners = new AbortController();
    const opciones = { capture: true, signal: listeners.signal };
    inject(DestroyRef).onDestroy(() => listeners.abort());

    campo.addEventListener('beforeinput', evento => {
      if (this.appFormatoEntrada() === 'monto' && evento.data === ',') return;
      if (!evento.isComposing && evento.inputType === 'insertText' && evento.data
          && this.limpiar(evento.data) !== evento.data) {
        evento.preventDefault();
      }
    }, opciones);

    campo.addEventListener('keydown', evento => {
      const formato = this.appFormatoEntrada();
      if (campo.type !== 'number' || evento.ctrlKey || evento.metaKey || evento.altKey) return;
      if ((formato === 'entero' && /^[eE+.,-]$/.test(evento.key))
          || (formato === 'monto' && /^[eE+-]$/.test(evento.key))) evento.preventDefault();
    }, opciones);

    campo.addEventListener('paste', evento => {
      const texto = evento.clipboardData?.getData('text/plain');
      if (!texto) return;
      const limpio = this.limpiar(texto);
      if (limpio === texto) return;
      evento.preventDefault();
      if (!limpio) return;
      if (campo.selectionStart === null || campo.selectionEnd === null) {
        campo.value = limpio.slice(0, campo.maxLength < 0 ? undefined : campo.maxLength);
      } else {
        const libres = campo.maxLength < 0 ? undefined
          : Math.max(0, campo.maxLength - campo.value.length + campo.selectionEnd - campo.selectionStart);
        campo.setRangeText(limpio.slice(0, libres), campo.selectionStart, campo.selectionEnd, 'end');
      }
      campo.dispatchEvent(new Event('input', { bubbles: true }));
    }, opciones);

    const sincronizar = () => {
      const anterior = campo.value;
      const limpio = this.limpiar(anterior).slice(0, campo.maxLength < 0 ? undefined : campo.maxLength);
      if (anterior === limpio) return;
      const cursor = campo.selectionStart;
      campo.value = limpio;
      if (cursor !== null) {
        const posicion = Math.min(limpio.length, this.limpiar(anterior.slice(0, cursor)).length);
        campo.setSelectionRange(posicion, posicion);
      }
    };
    // El modelo recibe el valor limpio porque esta escucha precede al accessor de Angular.
    campo.addEventListener('input', evento => {
      if (!(evento instanceof InputEvent) || !evento.isComposing) sincronizar();
    }, opciones);
    campo.addEventListener('compositionend', sincronizar, opciones);
  }

  private limpiar(valor: string): string {
    switch (this.appFormatoEntrada()) {
      case 'dni': return sanitizarDni(valor);
      case 'celular': return sanitizarCelular(valor);
      case 'nombre': return sanitizarSoloLetras(valor);
      case 'direccion': return sanitizarDireccion(valor);
      case 'correo': return valor.replace(/[^a-zA-Z0-9._%+@-]/g, '');
      case 'entero': return valor.replace(/[^0-9]/g, '');
      case 'monto': {
        const [entero, ...decimales] = valor.replace(/,/g, '.').replace(/[^0-9.]/g, '').split('.');
        return decimales.length ? entero + '.' + decimales.join('') : entero;
      }
    }
  }
}
