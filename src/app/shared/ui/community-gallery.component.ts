import { Component, signal } from '@angular/core';

@Component({
  selector: 'ui-community-gallery',
  standalone: true,
  template: `
    <section class="mt-7 border-t border-[#e2e8f0] pt-[22px] pb-[26px] max-[600px]:mt-5 max-[600px]:py-[18px]" aria-labelledby="ui-community-gallery-title">
      <div class="mb-[15px]">
        <p class="mb-[5px] font-[Inter] text-[11px] leading-[1.4] font-bold tracking-[.08em] text-[#76551f]">GALERÍA</p>
        <h2 id="ui-community-gallery-title" class="m-0 font-[Inter] text-[21px] leading-[1.3] font-semibold text-[#102447]">Nuestra comunidad</h2>
      </div>
      @if (photos().length) {
        <div class="grid grid-cols-[repeat(3,minmax(0,1fr))] gap-3 max-[600px]:grid-cols-1">
          @for (photo of photos(); track photo) {
            <img class="block h-[190px] w-full rounded-[12px] object-cover max-[600px]:h-[170px]" [src]="photo" [alt]="'Fotografía de la comunidad ' + ($index + 1)" />
          }
        </div>
      } @else if (checked() === candidates.length) {
        <p class="m-0 grid min-h-[108px] place-items-center rounded-[14px] border border-dashed border-[#b8c2d0] bg-[#f7f8fa] p-[18px] text-center font-[Inter] text-[14px] leading-[1.5] font-medium text-[#46566e]">Próximamente: fotos de nuestra comunidad</p>
      } @else {
        <p class="m-0 grid min-h-[108px] place-items-center rounded-[14px] border border-dashed border-[#b8c2d0] bg-[#f7f8fa] p-[18px] text-center font-[Inter] text-[14px] leading-[1.5] font-medium text-[#46566e]" aria-live="polite">Preparando la galería…</p>
      }
      @for (photo of candidates; track photo) {
        <img class="absolute h-px w-px overflow-hidden [clip-path:inset(50%)]" [src]="photo" alt="" aria-hidden="true"
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
