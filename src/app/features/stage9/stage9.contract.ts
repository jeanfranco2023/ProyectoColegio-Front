export type Stage9State = 'normal' | 'empty' | 'loading' | 'error';

export interface Stage9StudentOption {
  id: number;
  fullName: string;
  gradeLabel: string;
}

export interface Stage9PeriodOption {
  id: number;
  label: string;
}

export interface Stage9GradeRow {
  areaId: number;
  areaName: string;
  grade: 'AD' | 'A' | 'B' | 'C';
  conclusion?: string | null;
}

export interface Stage9Payment {
  id: number;
  concept: string;
  schoolYear: number;
  amount: number;
  currency: 'PEN';
  dueDate: string;
  status: 'PAGADO' | 'PENDIENTE' | 'VENCIDO';
  receiptName?: string | null;
}

export interface Stage9ObservationDraft {
  studentId: number | null;
  date: string;
  type: string;
  description: string;
}

export interface Stage9Observation extends Stage9ObservationDraft {
  id: number;
  studentName: string;
  authorName: string;
}

export type Stage9SubstituteStatus =
  | 'PENDIENTE_APROBACION'
  | 'ACTIVO'
  | 'VENCIDO'
  | 'RECHAZADO'
  | 'REVOCADO';

export interface Stage9SubstituteDraft {
  studentId: number | null;
  fullName: string;
  dni: string;
  relationship: string;
  phone: string;
  startDate: string;
  endDate: string;
}

export interface Stage9SubstituteRequest extends Stage9SubstituteDraft {
  id: number;
  studentName: string;
  status: Stage9SubstituteStatus;
}

export interface Stage9TutorStudent {
  id: number;
  fullName: string;
  attendanceSummary: string;
  incidentsSummary: string;
  observationsCount: number;
  lastActivity: string;
}

export interface Stage9TutorFilters {
  sectionId: number | null;
  periodId: number | null;
  search: string;
}

export type Stage9ReasonAction = 'reject' | 'revoke';

export interface Stage9ReasonDialog {
  requestId: number;
  action: Stage9ReasonAction;
}
