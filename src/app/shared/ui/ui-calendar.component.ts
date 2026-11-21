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
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => UiCalendarComponent), multi: true },
    { provide: NG_VALIDATORS, useExisting: forwardRef(() => UiCalendarComponent), multi: true }
  ],
  template: `
    <div class="date-field">
      <div class="date-field__control">
        <input type="text" class="date-field__input" inputmode="numeric" autocomplete="off"
          [id]="id || null" [disabled]="isDisabled" [value]="manualText" placeholder="dd/mm/aaaa"
          [attr.aria-label]="ariaLabel" [attr.aria-describedby]="ariaDescribedby"
          [attr.aria-invalid]="manualError ? 'true' : ariaInvalid" [attr.aria-required]="required ? 'true' : null"
          (input)="editManual($event)" (blur)="commitManual()" (keydown.enter)="$event.preventDefault(); commitManual()" />
        <button type="button" class="date-field__button" [disabled]="isDisabled" aria-label="Abrir calendario"
          aria-haspopup="dialog" (click)="openCalendar()">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <rect x="3.5" y="5" width="17" height="16" rx="2.5"></rect>
            <path d="M7.5 3v4M16.5 3v4M4 9.5h16M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01"></path>
          </svg>
        </button>
      </div>
      @if (manualError) { <p class="date-field__error" role="alert">{{ manualError }}</p> }

      <dialog
        #calendarDialog
        class="calendar-dialog"
        aria-labelledby="ui-calendar-title"
        (click)="closeOnBackdrop($event)"
        (close)="markTouched()">
        <section class="calendar-card" [class.calendar-card--attendance]="attendanceCalendar">
          <header class="calendar-card__header">
            <div class="calendar-card__heading">
              <p>{{ attendanceCalendar ? 'Fecha de asistencia' : 'Fecha seleccionada' }}</p>
              <h2 id="ui-calendar-title">{{ selectedDateLabel }}</h2>
            </div>
            <button type="button" class="calendar-icon-button" aria-label="Cerrar calendario" (click)="closeCalendar()">×</button>
          </header>

          @if (viewMode === 'days') {
          <div class="calendar-date-nav" aria-label="Cambiar fecha">
            <button type="button" class="calendar-step-button" [disabled]="!canMoveDate(-1)" (click)="moveDate(-1)">
              <span aria-hidden="true">‹</span> Día anterior
            </button>
            <button type="button" class="calendar-step-button" [disabled]="!canMoveDate(1)" (click)="moveDate(1)">
              Día siguiente <span aria-hidden="true">›</span>
            </button>
          </div>
          }

          <div class="calendar-month-nav">
            <button type="button" class="calendar-icon-button" aria-label="Mes anterior" (click)="moveMonth(-1)" [disabled]="viewMode === 'year-month'">‹</button>
            <button
              type="button"
              class="calendar-title-toggle"
              (click)="toggleViewMode()"
              [attr.aria-expanded]="viewMode === 'year-month'"
              title="Clic para seleccionar año y mes rápidamente"
            >
              <h3>{{ monthLabel }}</h3>
              <span class="calendar-toggle-indicator" aria-hidden="true">{{ viewMode === 'year-month' ? '▲' : '▼' }}</span>
            </button>
            <button type="button" class="calendar-icon-button" aria-label="Mes siguiente" (click)="moveMonth(1)" [disabled]="viewMode === 'year-month'">›</button>
          </div>

          @if (viewMode === 'year-month') {
            <div class="calendar-picker-panel">
              <div><span>Año</span>
                <select aria-label="Año" (change)="selectYear(+$any($event.target).value)">
                  @for (year of availableYears; track year) {
                    <option [value]="year" [selected]="year === selectedYear">{{ year }}</option>
                  }
                </select>
              </div>
              <div><span>Mes</span>
                <select aria-label="Mes" (change)="selectMonth(+$any($event.target).value)">
                  @for (mes of mesesNombres; track mes; let i = $index) {
                    <option [value]="i" [selected]="i === selectedMonth" [disabled]="isMonthOutsideBounds(selectedYear, i)">{{ mes }}</option>
                  }
                </select>
              </div>
              <button type="button" class="calendar-return-btn" (click)="viewMode = 'days'">Ver días</button>
            </div>
          } @else {
            @if (attendanceCalendar) {
              <div class="calendar-legend" aria-label="Leyenda de asistencia">
                <span><i class="calendar-legend__dot calendar-legend__dot--recorded"></i>Con registros</span>
                <span><i class="calendar-legend__dot calendar-legend__dot--empty"></i>Sin registros</span>
              </div>
              @if (attendanceDataLoading) { <p class="calendar-note" role="status">Consultando las marcas del mes…</p> }
              @else if (attendanceLoadError) { <p class="calendar-note" role="alert">No se pudieron consultar las marcas de este mes.</p> }
            }

            <div class="calendar-grid" role="grid" aria-label="Días del mes">
              @for (weekDay of weekDays; track weekDay) {
                <span class="calendar-grid__weekday" role="columnheader">{{ weekDay }}</span>
              }
              @for (day of calendarDays; track day.iso) {
                <button
                  type="button"
                  role="gridcell"
                  class="calendar-grid__day"
                  [class.calendar-grid__day--outside]="day.outsideMonth"
                  [class.calendar-grid__day--weekend]="day.weekend && disableWeekends"
                  [class.calendar-grid__day--recorded]="attendanceCalendar && attendanceDataLoaded && day.hasAttendance"
                  [class.calendar-grid__day--empty]="attendanceCalendar && attendanceDataLoaded && !day.hasAttendance && !day.weekend"
                  [class.calendar-grid__day--today]="day.today"
                  [class.calendar-grid__day--selected]="day.selected"
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
              <p class="calendar-note">Sábados y domingos están deshabilitados.</p>
            }
          }

          <footer class="calendar-card__footer">
            @if (!required && value) {
              <button type="button" class="calendar-clear-button" (click)="clearDate()">Limpiar fecha</button>
            } @else {
              <span></span>
            }
            <button type="button" class="calendar-done-button" (click)="closeCalendar()">Listo</button>
          </footer>
        </section>
      </dialog>
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; min-width: 0; font-family: inherit; }
    .date-field__control { display: flex; min-width: 0; align-items: stretch; border: 1px solid #cdd7e5; border-radius: 8px; background: #fff; }
    .date-field__control:focus-within { border-color: #2864c5; box-shadow: 0 0 0 2px rgb(40 100 197 / 15%); }
    .date-field__input { box-sizing: border-box; flex: 1; min-width: 0; min-height: 42px; margin: 0 !important; padding: 8px 10px; border: 0; background: transparent; color: #172b4d; font: inherit; font-size: 16px; outline: none; }
    .date-field__input[aria-invalid="true"] { color: #a9322a; }
    .date-field__button { display: grid; place-items: center; flex: 0 0 42px; padding: 0; border: 0; border-left: 1px solid #e7edf4; border-radius: 0 7px 7px 0; background: transparent; color: #173b67; cursor: pointer; }
    .date-field__button:hover { background: #f4f7fb; }
    .date-field__button:focus-visible, .calendar-dialog :is(button, select):focus-visible { outline: 2px solid #2864c5; outline-offset: 2px; }
    .date-field__button:disabled { cursor: not-allowed; opacity: .58; }
    .date-field__button svg { width: 19px; height: 19px; }
    .date-field__error { margin: 4px 0 0; color: #a9322a; font-size: 15px; line-height: 1.4; }
    .calendar-dialog {
      box-sizing: border-box; width: min(520px, calc(100vw - 20px)); max-width: calc(100vw - 20px);
      max-height: calc(100dvh - 20px); overflow: auto; margin: auto; padding: 0; border: 1px solid #dbe4ef;
      border-radius: 16px; background: transparent; color: #172b4d; box-shadow: 0 26px 80px rgb(15 31 57 / 28%);
    }
    .calendar-dialog::backdrop { background: rgb(12 24 43 / 48%); backdrop-filter: blur(3px); }
    .calendar-card { padding: 18px; border-radius: inherit; background: #fff; }
    .calendar-card__header { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; }
    .calendar-card__heading p { margin: 0 0 5px; color: #64748b; font-size: 14px; font-weight: 700; }
    .calendar-card__heading h2 { margin: 0; color: #172b4d; font-size: clamp(16px, 4vw, 20px); font-weight: 650; line-height: 1.25; text-transform: capitalize; }
    .calendar-icon-button { width: 44px; height: 44px; display: grid; place-items: center; flex: 0 0 auto; border: 1px solid #e0e7f0; border-radius: 8px; background: white; color: #334155; font-size: 26px; line-height: 1; cursor: pointer; }
    .calendar-icon-button:hover { background: #edf3fb; }
    .calendar-date-nav { display: flex; justify-content: space-between; gap: 8px; margin-top: 12px; }
    .calendar-step-button { min-height: 42px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 8px 14px; border: 1px solid #dce5f0; border-radius: 11px; background: #f7f9fc; color: #30425f; font-size: 14px; font-weight: 700; cursor: pointer; }
    .calendar-step-button:hover:not(:disabled) { border-color: #b8c8dd; background: #eef4fb; }
    .calendar-step-button span { font-size: 21px; line-height: .8; }
    .calendar-step-button:disabled { cursor: not-allowed; opacity: .42; }
    .calendar-month-nav { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 12px; }
    .calendar-month-nav h3 { margin: 0; color: #172b4d; font-size: 19px; font-weight: 800; text-transform: capitalize; }
    .calendar-title-toggle {
      display: inline-flex; align-items: center; gap: 8px; padding: 7px 16px;
      border: 1px solid #d9e1ec; border-radius: 12px; background: #f8fafc;
      color: #172b4d; cursor: pointer; transition: background-color 140ms ease, border-color 140ms ease, transform 120ms ease;
    }
    .calendar-title-toggle:hover { background: #eef4fc; border-color: #2563eb; transform: translateY(-1px); }
    .calendar-title-toggle h3 { margin: 0; color: #172b4d; font-size: 19px; font-weight: 800; text-transform: capitalize; }
    .calendar-toggle-indicator { font-size: 13px; color: #1e40af; font-weight: 800; }

    .calendar-picker-panel { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 10px; margin-top: 12px; }
    .calendar-picker-panel > div { display: grid; gap: 5px; min-width: 0; font-size: 13px; color: #475569; }
    .calendar-picker-panel select { min-width: 0; min-height: 42px; width: 100%; padding: 6px 8px; border: 1px solid #cdd7e5; border-radius: 8px; color: #172b4d; background: white; font: inherit; }
    .calendar-return-btn { grid-column: 1 / -1; justify-self: end; min-height: 38px; padding: 0 12px; border: 0; border-radius: 8px; background: #eef3fa; color: #173b67; font: inherit; font-size: 13px; cursor: pointer; }
    .calendar-legend { display: flex; flex-wrap: wrap; gap: 14px; margin: 14px 0 5px; color: #52627a; font-size: 12px; font-weight: 600; }
    .calendar-legend span { display: inline-flex; align-items: center; gap: 7px; }
    .calendar-legend__dot { width: 10px; height: 10px; border-radius: 50%; }
    .calendar-legend__dot--recorded { background: #16834d; }
    .calendar-legend__dot--empty { background: #c43d3d; }
    .calendar-grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 8px; margin-top: 14px; }
    .calendar-grid__weekday { min-height: 36px; display: grid; place-items: center; color: #475569; font-size: 14px; font-weight: 800; }
    .calendar-grid__day { position: relative; min-width: 0; min-height: 42px; display: grid; place-items: center; border: 1px solid transparent; border-radius: 8px; background: #f8fafc; color: #1e293b; font: inherit; font-size: 16px; font-weight: 700; cursor: pointer; transition: transform 120ms ease, box-shadow 120ms ease; }
    .calendar-grid__day:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 11px rgb(23 43 77 / 12%); }
    .calendar-grid__day--outside { color: #94a3b8; background: #fafbfd; }
    .calendar-grid__day--recorded { border-color: #b7e1c8; background: #e8f6ee; color: #12643d; font-weight: 800; }
    .calendar-grid__day--empty { border-color: #f0c2bd; background: #fff0ee; color: #a9322a; }
    .calendar-grid__day--weekend:disabled { border-color: #edf0f4; background: #eef1f5; color: #a6afbc; opacity: .72; }
    .calendar-grid__day--selected { border-color: #173B67; box-shadow: inset 0 0 0 2.5px #173B67; font-weight: 800; }
    .calendar-grid__day--today::after { content: ''; position: absolute; right: 8px; top: 8px; width: 6px; height: 6px; border-radius: 50%; background: #173B67; }
    .calendar-grid__day:disabled:not(.calendar-grid__day--weekend) { cursor: not-allowed; opacity: .45; }
    .calendar-note { margin: 12px 0 0; color: #475569; font-size: 14px; font-weight: 600; }
    .calendar-card__footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 20px; padding-top: 16px; border-top: 1px solid #e7edf4; }
    .calendar-clear-button, .calendar-done-button { min-height: 46px; padding: 10px 18px; border-radius: 12px; font: inherit; font-size: 15px; font-weight: 800; cursor: pointer; }
    .calendar-clear-button { border: 1px solid #dce5f0; background: #fff; color: #475569; }
    .calendar-clear-button:hover { background: #f1f5f9; }
    .calendar-done-button { border: 1px solid #173B67; background: #173B67; color: #fff; }
    .calendar-done-button:hover { background: #112d50; }
    @media (max-width: 520px) {
      .calendar-dialog { width: calc(100vw - 16px); max-width: calc(100vw - 16px); max-height: calc(100dvh - 16px); border-radius: 18px; }
      .calendar-card { padding: 18px 14px 14px; }
      .calendar-grid { gap: 4px; }
      .calendar-grid__day { min-height: 42px; border-radius: 11px; font-size: 13px; }
      .calendar-grid__weekday { font-size: 11px; }
    }
    @media (prefers-reduced-motion: reduce) {
      .date-field__button, .calendar-grid__day { transition: none; }
    }
  `]
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
}
