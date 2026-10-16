import { Component, signal } from '@angular/core';

@Component({
  selector: 'ui-community-gallery',
  standalone: true,
  template: `
    <section class="ui-community-gallery" aria-labelledby="ui-community-gallery-title">
      <div class="ui-community-gallery__heading">
        <p class="ui-community-gallery__eyebrow">GALERÍA</p>
        <h2 id="ui-community-gallery-title">Nuestra comunidad</h2>
      </div>
      @if (photos().length) {
        <div class="ui-community-gallery__grid">
          @for (photo of photos(); track photo) {
            <img [src]="photo" [alt]="'Fotografía de la comunidad ' + ($index + 1)" />
          }
        </div>
      } @else if (checked() === candidates.length) {
        <p class="ui-community-gallery__empty">Próximamente: fotos de nuestra comunidad</p>
      } @else {
        <p class="ui-community-gallery__empty" aria-live="polite">Preparando la galería…</p>
      }
      @for (photo of candidates; track photo) {
        <img class="ui-community-gallery__probe" [src]="photo" alt="" aria-hidden="true"
          (load)="photoLoaded(photo)" (error)="photoChecked()" />
      }
    </section>
  `,
})
export class CommunityGalleryComponent {
  readonly candidates = Array.from({ length: 6 }, (_, index) => `/images/comunidad/foto-${String(index + 1).padStart(2, '0')}.jpg`);
  readonly photos = signal<string[]>([]);
  readonly checked = signal(0);

  photoLoaded(path: string): void {
    this.photos.update(current => current.includes(path) ? current : [...current, path]);
    this.photoChecked();
  }

  photoChecked(): void {
    this.checked.update(current => Math.min(current + 1, this.candidates.length));
  }
}
