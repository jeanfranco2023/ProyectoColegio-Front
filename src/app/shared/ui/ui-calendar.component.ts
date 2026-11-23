import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  ControlValueAccessor,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  ValidationErrors,
  Validator
} from '@angular/forms';
import {
  Component,
  ElementRef,
  EventEmitter,
  forwardRef,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild
} from '@angular/core';

interface CalendarDay {
  date: Date;
  iso: string;
  number: number;
  outsideMonth: boolean;
  weekend: boolean;
  hasAttendance: boolean;
  today: boolean;
  selected: boolean;
}

@Component({
  selector: 'app-ui-calendar',
  standalone: true,
  imports: [CommonModule],
  host: { class: 'block w-full min-w-0 font-sans' },
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => UiCalendarComponent), multi: true },
    { provide: NG_VALIDATORS, useExisting: forwardRef(() => UiCalendarComponent), multi: true }
  ],
  template: `
    <div class="date-field">
      <div class="date-field__control flex min-w-0 items-stretch rounded-lg border border-[#cdd7e5] bg-white focus-within:border-[#2864c5] focus-within:shadow-[0_0_0_2px_rgb(40_100_197_/_15%)]">
        <input type="text" class="date-field__input box-border flex-1 min-w-0 min-h-[42px] !m-0 border-0 bg-transparent px-[10px] py-2 font-[inherit] text-base text-[#172b4d] outline-none aria-[invalid=true]:text-[#a9322a]" inputmode="numeric" autocomplete="off"
          [id]="id || null" [disabled]="isDisabled" [value]="manualText" placeholder="dd/mm/aaaa"
          [attr.aria-label]="ariaLabel" [attr.aria-describedby]="ariaDescribedby"
          [attr.aria-invalid]="manualError ? 'true' : ariaInvalid" [attr.aria-required]="required ? 'true' : null"
          (input)="editManual($event)" (blur)="commitManual()" (keydown.enter)="$event.preventDefault(); commitManual()" />
        <button type="button" class="date-field__button grid flex-[0_0_42px] place-items-center rounded-r-[7px] border-0 border-l border-[#e7edf4] bg-transparent p-0 text-[#173b67] cursor-pointer transition-colors hover:bg-[#f4f7fb] focus-visible:outline-2 focus-visible:outline-[#2864c5] focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-[0.58] motion-reduce:transition-none" [disabled]="isDisabled" aria-label="Abrir calendario"
          aria-haspopup="dialog" (click)="openCalendar()">
          <svg class="size-[19px]" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <rect x="3.5" y="5" width="17" height="16" rx="2.5"></rect>
            <path d="M7.5 3v4M16.5 3v4M4 9.5h16M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01"></path>
          </svg>
        </button>
      </div>
      @if (manualError) { <p class="mt-1 mb-0 text-[15px] leading-[1.4] text-[#a9322a]" role="alert">{{ manualError }}</p> }

      <dialog
        #calendarDialog
        class="calendar-dialog box-border w-[min(520px,calc(100vw-20px))] max-w-[calc(100vw-20px)] max-h-[calc(100dvh-20px)] overflow-auto m-auto p-0 border border-[#dbe4ef] rounded-2xl bg-transparent text-[#172b4d] shadow-[0_26px_80px_rgb(15_31_57_/_28%)] backdrop:bg-[rgb(12_24_43_/_48%)] backdrop:backdrop-blur-[3px] max-[520px]:w-[calc(100vw-16px)] max-[520px]:max-w-[calc(100vw-16px)] max-[520px]:max-h-[calc(100dvh-16px)] max-[520px]:rounded-[18px]"
        aria-labelledby="ui-calendar-title"
        (click)="closeOnBackdrop($event)"
        (close)="markTouched()">
        <section
          class="rounded-[inherit] p-[18px] max-[520px]:px-[14px] max-[520px]:pt-[18px] max-[520px]:pb-[14px]"
          [class]="attendanceCalendar ? 'bg-[#fbfcfe]' : 'bg-white'">
          <header class="flex items-start justify-between gap-[18px]">
            <div>
              <p class="m-0 mb-[5px] text-sm font-bold text-[#64748b]">{{ attendanceCalendar ? 'Fecha de asistencia' : 'Fecha seleccionada' }}</p>
              <h2 id="ui-calendar-title" class="m-0 text-[clamp(16px,4vw,20px)] font-semibold leading-[1.25] capitalize text-[#172b4d]">{{ selectedDateLabel }}</h2>
            </div>
            <button type="button" class="grid size-11 flex-none place-items-center rounded-lg border border-[#e0e7f0] bg-white text-[26px] leading-none text-[#334155] cursor-pointer hover:bg-[#edf3fb] focus-visible:outline-2 focus-visible:outline-[#2864c5] focus-visible:outline-offset-2" aria-label="Cerrar calendario" (click)="closeCalendar()">×</button>
          </header>

          @if (viewMode === 'days') {
          <div class="mt-3 flex justify-between gap-2" aria-label="Cambiar fecha">
            <button type="button" class="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-[11px] border border-[#dce5f0] bg-[#f7f9fc] px-[14px] py-2 text-sm font-bold text-[#30425f] cursor-pointer hover:enabled:border-[#b8c8dd] hover:enabled:bg-[#eef4fb] focus-visible:outline-2 focus-visible:outline-[#2864c5] focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-[0.42]" [disabled]="!canMoveDate(-1)" (click)="moveDate(-1)">
              <span aria-hidden="true" class="text-[21px] leading-[0.8]">‹</span> Día anterior
            </button>
            <button type="button" class="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-[11px] border border-[#dce5f0] bg-[#f7f9fc] px-[14px] py-2 text-sm font-bold text-[#30425f] cursor-pointer hover:enabled:border-[#b8c8dd] hover:enabled:bg-[#eef4fb] focus-visible:outline-2 focus-visible:outline-[#2864c5] focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-[0.42]" [disabled]="!canMoveDate(1)" (click)="moveDate(1)">
              Día siguiente <span aria-hidden="true" class="text-[21px] leading-[0.8]">›</span>
            </button>
          </div>
          }

          <div class="mt-3 flex items-center justify-between gap-[10px]">
            <button type="button" class="grid size-11 flex-none place-items-center rounded-lg border border-[#e0e7f0] bg-white text-[26px] leading-none text-[#334155] cursor-pointer hover:bg-[#edf3fb] focus-visible:outline-2 focus-visible:outline-[#2864c5] focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-45" aria-label="Mes anterior" (click)="moveMonth(-1)" [disabled]="viewMode === 'year-month'">‹</button>
            <button
              type="button"
              class="inline-flex items-center gap-2 rounded-xl border border-[#d9e1ec] bg-[#f8fafc] px-4 py-[7px] text-[#172b4d] cursor-pointer transition-[background-color,border-color,transform] duration-150 hover:-translate-y-px hover:border-[#2563eb] hover:bg-[#eef4fc] focus-visible:outline-2 focus-visible:outline-[#2864c5] focus-visible:outline-offset-2"
              (click)="toggleViewMode()"
              [attr.aria-expanded]="viewMode === 'year-month'"
              title="Clic para seleccionar año y mes rápidamente"
            >
              <h3 class="m-0 text-[19px] font-extrabold capitalize text-[#172b4d]">{{ monthLabel }}</h3>
              <span class="text-[13px] font-extrabold text-[#1e40af]" aria-hidden="true">{{ viewMode === 'year-month' ? '▲' : '▼' }}</span>
            </button>
            <button type="button" class="grid size-11 flex-none place-items-center rounded-lg border border-[#e0e7f0] bg-white text-[26px] leading-none text-[#334155] cursor-pointer hover:bg-[#edf3fb] focus-visible:outline-2 focus-visible:outline-[#2864c5] focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-45" aria-label="Mes siguiente" (click)="moveMonth(1)" [disabled]="viewMode === 'year-month'">›</button>
          </div>

          @if (viewMode === 'year-month') {
            <div class="mt-3 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-[10px]">
              <div class="grid min-w-0 gap-[5px] text-[13px] text-[#475569]"><span>Año</span>
                <select class="min-w-0 min-h-[42px] w-full rounded-lg border border-[#cdd7e5] bg-white px-2 py-1.5 font-[inherit] text-[#172b4d] focus-visible:outline-2 focus-visible:outline-[#2864c5] focus-visible:outline-offset-2" aria-label="Año" (change)="selectYear(+$any($event.target).value)">
                  @for (year of availableYears; track year) {
                    <option [value]="year" [selected]="year === selectedYear">{{ year }}</option>
                  }
                </select>
              </div>
              <div class="grid min-w-0 gap-[5px] text-[13px] text-[#475569]"><span>Mes</span>
                <select class="min-w-0 min-h-[42px] w-full rounded-lg border border-[#cdd7e5] bg-white px-2 py-1.5 font-[inherit] text-[#172b4d] focus-visible:outline-2 focus-visible:outline-[#2864c5] focus-visible:outline-offset-2" aria-label="Mes" (change)="selectMonth(+$any($event.target).value)">
                  @for (mes of mesesNombres; track mes; let i = $index) {
                    <option [value]="i" [selected]="i === selectedMonth" [disabled]="isMonthOutsideBounds(selectedYear, i)">{{ mes }}</option>
                  }
                </select>
              </div>
              <button type="button" class="col-span-full min-h-[38px] justify-self-end rounded-lg border-0 bg-[#eef3fa] px-3 font-[inherit] text-[13px] font-semibold text-[#173b67] cursor-pointer hover:bg-[#e1eaf6] focus-visible:outline-2 focus-visible:outline-[#2864c5] focus-visible:outline-offset-2" (click)="viewMode = 'days'">Ver días</button>
            </div>
          } @else {
            @if (attendanceCalendar) {
              <div class="mt-[14px] mb-[5px] flex flex-wrap gap-[14px] text-xs font-semibold text-[#52627a]" aria-label="Leyenda de asistencia">
                <span class="inline-flex items-center gap-[7px]"><i class="size-[10px] rounded-full bg-[#16834d]"></i>Con registros</span>
                <span class="inline-flex items-center gap-[7px]"><i class="size-[10px] rounded-full bg-[#c43d3d]"></i>Sin registros</span>
              </div>
              @if (attendanceDataLoading) { <p class="mt-3 mb-0 text-sm font-semibold text-[#475569]" role="status">Consultando las marcas del mes…</p> }
              @else if (attendanceLoadError) { <p class="mt-3 mb-0 text-sm font-semibold text-[#475569]" role="alert">No se pudieron consultar las marcas de este mes.</p> }
            }

            <div class="mt-[14px] grid grid-cols-[repeat(7,minmax(0,1fr))] gap-2 max-[520px]:gap-1" role="grid" aria-label="Días del mes">
              @for (weekDay of weekDays; track weekDay) {
                <span class="grid min-h-9 place-items-center text-sm font-extrabold text-[#475569] max-[520px]:text-[11px]" role="columnheader">{{ weekDay }}</span>
              }
              @for (day of calendarDays; track day.iso) {
                <button
                  type="button"
                  role="gridcell"
                  [class]="dayButtonClasses(day)"
                  [disabled]="isDateDisabled(day.date)"
                  [attr.aria-label]="dayAriaLabel(day)"
                  [attr.aria-pressed]="day.selected"
                  [attr.aria-current]="day.today ? 'date' : null"
                  (click)="selectDate(day.date)">
                  {{ day.number }}
                </button>
              }
            </div>

            @if (disableWeekends) {
              <p class="mt-3 mb-0 text-sm font-semibold text-[#475569]">Sábados y domingos están deshabilitados.</p>
            }
          }

          <footer class="mt-5 flex items-center justify-between gap-3 border-t border-[#e7edf4] pt-4">
            @if (!required && value) {
              <button type="button" class="min-h-[46px] rounded-xl border border-[#dce5f0] bg-white px-[18px] py-[10px] font-[inherit] text-[15px] font-extrabold text-[#475569] cursor-pointer hover:bg-[#f1f5f9] focus-visible:outline-2 focus-visible:outline-[#2864c5] focus-visible:outline-offset-2" (click)="clearDate()">Limpiar fecha</button>
            } @else {
              <span></span>
            }
            <button type="button" class="min-h-[46px] rounded-xl border border-[#173B67] bg-[#173B67] px-[18px] py-[10px] font-[inherit] text-[15px] font-extrabold text-white cursor-pointer hover:bg-[#112d50] focus-visible:outline-2 focus-visible:outline-[#2864c5] focus-visible:outline-offset-2" (click)="closeCalendar()">Listo</button>
          </footer>
        </section>
      </dialog>
    </div>
  `
})
export class UiCalendarComponent implements ControlValueAccessor, Validator, OnChanges {
  @ViewChild('calendarDialog') private calendarDialog?: ElementRef<HTMLDialogElement>;

  @Input('aria-label') ariaLabel = 'Seleccionar fecha';
  @Input() id = '';
  @Input('aria-describedby') ariaDescribedby: string | null = null;
  @Input('aria-invalid') ariaInvalid: string | null = null;
  @Input() placeholder = 'Selecciona una fecha';
  @Input() required = false;
  @Input() min: string | null = null;
  @Input() max: string | null = null;
  @Input() disableWeekends = false;
  @Input() attendanceCalendar = false;
  @Input() attendanceDates: readonly string[] = [];
  @Input() attendanceDataLoaded = false;
  @Input() attendanceDataLoading = false;
  @Input() attendanceLoadError = false;
  @Input() disabled = false;
  @Input() value = '';

  @Output() readonly valueChange = new EventEmitter<string>();
  @Output() readonly visibleMonthChange = new EventEmitter<string>();

  readonly weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  readonly mesesNombres = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  viewMode: 'days' | 'year-month' = 'days';
  selectedYear: number = new Date().getFullYear();
  selectedMonth: number = new Date().getMonth();
  manualText = '';
  manualError = '';

  private currentMonth = new Date();
  private controlDisabled = false;
  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};
  private onValidatorChange: () => void = () => {};

  get availableYears(): number[] {
    const first = this.parseDate(this.min ?? '')?.getFullYear() ?? Math.min(1900, this.selectedYear);
    const last = this.parseDate(this.max ?? '')?.getFullYear() ?? Math.max(new Date().getFullYear() + 20, this.selectedYear);
    return Array.from({ length: Math.max(0, last - first + 1) }, (_, i) => first + i);
  }

  toggleViewMode(): void {
    this.selectedYear = this.currentMonth.getFullYear();
    this.selectedMonth = this.currentMonth.getMonth();
    this.viewMode = this.viewMode === 'days' ? 'year-month' : 'days';
  }

  selectYear(year: number): void {
    this.selectedYear = year;
    if (this.isMonthOutsideBounds(year, this.selectedMonth)) {
      const limite = [this.min, this.max].map(value => this.parseDate(value ?? ''))
        .find(date => date?.getFullYear() === year);
      if (limite) this.selectedMonth = limite.getMonth();
    }
    this.currentMonth = new Date(year, this.selectedMonth, 1);
    this.emitVisibleMonth();
  }

  selectMonth(monthIndex: number): void {
    if (this.isMonthOutsideBounds(this.selectedYear, monthIndex)) return;
    this.selectedMonth = monthIndex;
    this.currentMonth = new Date(this.selectedYear, monthIndex, 1);
    this.emitVisibleMonth();
    this.viewMode = 'days';
  }

  isMonthOutsideBounds(year: number, month: number): boolean {
    const first = this.toIsoDate(new Date(year, month, 1));
    const last = this.toIsoDate(new Date(year, month + 1, 0));
    return (!!this.min && last < this.min) || (!!this.max && first > this.max);
  }

  get isDisabled(): boolean {
    return this.disabled || this.controlDisabled;
  }

  get selectedDateLabel(): string {
    const date = this.parseDate(this.value);
    return date
      ? new Intl.DateTimeFormat('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date)
      : 'Selecciona un día';
  }

  get monthLabel(): string {
    return new Intl.DateTimeFormat('es-PE', { month: 'long', year: 'numeric' }).format(this.currentMonth);
  }

  get calendarDays(): CalendarDay[] {
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const mondayOffset = (firstDay.getDay() + 6) % 7;
    const start = new Date(year, month, 1 - mondayOffset);
    const today = this.toIsoDate(new Date());

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
      const iso = this.toIsoDate(date);
      const weekend = date.getDay() === 0 || date.getDay() === 6;
      return {
        date,
        iso,
        number: date.getDate(),
        outsideMonth: date.getMonth() !== month,
        weekend,
        hasAttendance: this.attendanceDates.includes(iso),
        today: iso === today,
        selected: iso === this.value
      };
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value']) this.updateManualText();
    this.onValidatorChange();
  }

  writeValue(value: unknown): void {
    this.value = typeof value === 'string' ? value : '';
    this.updateManualText();
    this.syncMonthToValue();
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.controlDisabled = isDisabled;
  }

  validate(control: AbstractControl): ValidationErrors | null {
    const value = typeof control.value === 'string' ? control.value : this.value;
    if (this.manualError || (value && !this.parseDate(value))) return { date: true };
    if (this.required && !value) return { required: true };
    if (value && this.min && value < this.min) return { min: { min: this.min, actual: value } };
    if (value && this.max && value > this.max) return { max: { max: this.max, actual: value } };
    if (value && this.disableWeekends && this.isWeekend(this.parseDate(value))) return { weekday: true };
    return null;
  }

  registerOnValidatorChange(fn: () => void): void {
    this.onValidatorChange = fn;
  }

  openCalendar(): void {
    if (this.isDisabled || !this.calendarDialog) return;
    this.viewMode = 'days';
    this.syncMonthToValue();
    this.calendarDialog.nativeElement.showModal();
    this.emitVisibleMonth();
  }

  closeCalendar(): void {
    this.calendarDialog?.nativeElement.close();
  }

  closeOnBackdrop(event: MouseEvent): void {
    if (event.target === this.calendarDialog?.nativeElement) this.closeCalendar();
  }

  moveMonth(offset: number): void {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + offset, 1);
    this.emitVisibleMonth();
  }

  canMoveDate(direction: -1 | 1): boolean {
    return this.nextAllowedDate(direction) !== null;
  }

  moveDate(direction: -1 | 1): void {
    const date = this.nextAllowedDate(direction);
    if (date) this.setValue(date, false);
  }

  selectDate(date: Date): void {
    if (this.isDateDisabled(date)) return;
    this.setValue(date, true);
  }

  clearDate(): void {
    if (this.required) return;
    this.clearValue();
    this.updateManualText();
    this.closeCalendar();
  }

  editManual(event: Event): void {
    const campo = event.target as HTMLInputElement;
    const raw = campo.value;
    const iso = this.parseDate(raw);
    const conSeparadores = /^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/.exec(raw);
    const digits = raw.replace(/[^0-9]/g, '').slice(0, 8);
    const partes = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)].filter(Boolean);
    this.manualText = iso ? this.displayDate(iso) : conSeparadores
      ? [conSeparadores[1].padStart(2, '0'), conSeparadores[2].padStart(2, '0'), conSeparadores[3]].join('/')
      : partes.join('/');
    if (campo.value !== this.manualText) campo.value = this.manualText;
  }

  commitManual(): void {
    if (this.isDisabled) return;
    this.markTouched();
    this.manualError = '';
    if (!this.manualText) {
      this.clearValue();
      return;
    }

    const partes = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(this.manualText);
    const date = partes ? this.parseDate(`${partes[3]}-${partes[2]}-${partes[1]}`) : null;
    if (!date) this.manualError = 'Revisa la fecha.';
    else if (this.disableWeekends && this.isWeekend(date)) this.manualError = 'Elige un día de lunes a viernes.';
    else if (this.isDateDisabled(date)) this.manualError = 'La fecha está fuera del rango permitido.';

    if (this.manualError || !date) {
      this.clearValue();
    } else if (this.toIsoDate(date) !== this.value) {
      this.setValue(date, false);
    } else {
      this.onValidatorChange();
    }
  }

  private clearValue(): void {
    if (this.value) {
      this.value = '';
      this.onChange('');
      this.valueChange.emit('');
    }
    this.onValidatorChange();
  }

  isDateDisabled(date: Date): boolean {
    const iso = this.toIsoDate(date);
    return this.isDisabled
      || (this.disableWeekends && this.isWeekend(date))
      || (!!this.min && iso < this.min)
      || (!!this.max && iso > this.max);
  }

  dayAriaLabel(day: CalendarDay): string {
    const label = new Intl.DateTimeFormat('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(day.date);
    if (!this.attendanceCalendar || day.weekend) return day.weekend && this.disableWeekends ? `${label}, fin de semana deshabilitado` : label;
    return `${label}, ${day.hasAttendance ? 'con registros de asistencia' : 'sin registros de asistencia'}`;
  }

  markTouched(): void {
    this.onTouched();
  }

  private nextAllowedDate(direction: -1 | 1): Date | null {
    const selected = this.parseDate(this.value) ?? new Date();
    const candidate = new Date(selected);
    for (let step = 0; step < 8; step++) {
      candidate.setDate(candidate.getDate() + direction);
      if (!this.isDateDisabled(candidate)) return candidate;
    }
    return null;
  }

  private setValue(date: Date, close: boolean): void {
    const oldMonth = this.monthKey;
    this.value = this.toIsoDate(date);
    this.updateManualText();
    this.currentMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    this.onChange(this.value);
    this.valueChange.emit(this.value);
    this.onValidatorChange();
    if (this.monthKey !== oldMonth) this.emitVisibleMonth();
    if (close) this.closeCalendar();
  }

  private syncMonthToValue(): void {
    const date = this.parseDate(this.value);
    if (date) {
      this.currentMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      this.selectedYear = date.getFullYear();
      this.selectedMonth = date.getMonth();
      } else {
      this.selectedYear = this.currentMonth.getFullYear();
      this.selectedMonth = this.currentMonth.getMonth();
      }
  }

  private updateManualText(): void {
    const date = this.parseDate(this.value);
    this.manualText = date ? this.displayDate(date) : '';
    this.manualError = '';
  }

  private displayDate(date: Date): string {
    return this.toIsoDate(date).split('-').reverse().join('/');
  }

  private emitVisibleMonth(): void {
    this.visibleMonthChange.emit(this.monthKey);
  }

  private get monthKey(): string {
    const month = String(this.currentMonth.getMonth() + 1).padStart(2, '0');
    return `${this.currentMonth.getFullYear()}-${month}`;
  }

  private isWeekend(date: Date | null): boolean {
    return !!date && (date.getDay() === 0 || date.getDay() === 6);
  }

  private parseDate(value: string): Date | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '');
    if (!match) return null;
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return this.toIsoDate(date) === value ? date : null;
  }

  private toIsoDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  dayButtonClasses(day: CalendarDay): string {
    const classes = [
      'relative grid min-w-0 min-h-[42px] place-items-center rounded-lg border font-[inherit] text-base font-bold cursor-pointer',
      'transition-[transform,box-shadow] duration-150 motion-reduce:transition-none',
      'enabled:hover:-translate-y-px enabled:hover:shadow-[0_4px_11px_rgb(23_43_77_/_12%)]',
      'focus-visible:outline-2 focus-visible:outline-[#2864c5] focus-visible:outline-offset-2',
      'disabled:cursor-not-allowed max-[520px]:rounded-[11px] max-[520px]:text-[13px]'
    ];

    if (this.attendanceCalendar && this.attendanceDataLoaded && day.hasAttendance) {
      classes.push('border-[#b7e1c8] bg-[#e8f6ee] text-[#12643d] font-extrabold');
    } else if (this.attendanceCalendar && this.attendanceDataLoaded && !day.hasAttendance && !day.weekend) {
      classes.push('border-[#f0c2bd] bg-[#fff0ee] text-[#a9322a]');
    } else if (day.weekend && this.disableWeekends) {
      classes.push('border-transparent bg-[#f8fafc] text-[#1e293b] disabled:border-[#edf0f4] disabled:bg-[#eef1f5] disabled:text-[#a6afbc] disabled:opacity-[0.72]');
    } else if (day.outsideMonth) {
      classes.push('border-transparent bg-[#fafbfd] text-[#94a3b8]');
    } else {
      classes.push('border-transparent bg-[#f8fafc] text-[#1e293b]');
    }

    if (!(day.weekend && this.disableWeekends)) {
      classes.push('disabled:opacity-45');
    }
    if (day.selected) {
      classes.push('!border-[#173B67] shadow-[inset_0_0_0_2.5px_#173B67] font-extrabold');
    }
    if (day.today) {
      classes.push("after:content-[''] after:absolute after:right-2 after:top-2 after:size-1.5 after:rounded-full after:bg-[#173B67]");
    }
    return classes.join(' ');
  }
}
