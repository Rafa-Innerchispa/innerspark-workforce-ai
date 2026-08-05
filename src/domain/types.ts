// ============================================================
// InnerSpark Workforce AI — Domain Types
// ============================================================

// --- Shift Policies ---
export interface ShiftPolicy {
  id: string;
  name: string;
  shiftType: ShiftType;
  startTime: string;
  endTime: string;
  graceMinutes: number;
  breakMinutes: number;
  workHoursPerDay: number;
  maxOvertimeHoursPerDay: number;
  requiresNightSurcharge: boolean;
  nightSurchargeStart: string;
  nightSurchargeEnd: string;
  requiredPunches: number;
  overtimePolicy: string;
  active: boolean;
}

export interface ScheduleGroup {
  id: string;
  name: string;
  locationId: string;
  policyId: string;
  employeeIds: string[];
}

// --- Holiday ---
export interface Holiday {
  id: string;
  date: string; // MM-DD
  year?: number;
  name: string;
  isRecurring: boolean;
  isPaid: boolean;
}

// --- Employee Requests ---
export type RequestType = 'overtime' | 'justification' | 'permission' | 'manual_punch' | 'vacation' | 'schedule_change';
export type RequestStatus = 'pending' | 'approved' | 'rejected';

export interface EmployeeRequest {
  id: string;
  employeeId: string;
  type: RequestType;
  status: RequestStatus;
  startDate: string;
  endDate: string | null;
  reason: string;
  notes: string;
  attachmentUrl: string | null;
  approverComment: string | null;
  createdAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
}

// --- Attendance Report ---
export interface AttendanceReportRow {
  employeeId: string;
  fullName: string;
  department: string;
  regularHours: number;
  nightHours: number;
  overtime50Hours: number;
  overtime100Hours: number;
  absences: number;
  lateMinutes: number;
  permissions: number;
  totalHours: number;
}

// --- Enhanced Payroll ---
export type PayrollPeriodStatusV2 = 'borrador' | 'en_revision' | 'aprobada';

export interface PaySlipLine {
  concept: string;
  type: 'earnings' | 'deduction';
  amount: number;
  evidenceLink?: string;
  ruleApplied?: string;
  referenceDate?: string;
}

export interface EmployeePaySlip {
  employeeId: string;
  fullName: string;
  department: string;
  position: string;
  baseSalary: number;
  hourlyRate: number;
  workedDays: number;
  lines: PaySlipLine[];
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  status: 'complete' | 'pending_review' | 'has_anomalies';
  criticalAnomalies: number;
}

export interface PayrollPeriodV2 {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: PayrollPeriodStatusV2;
  totalEmployees: number;
  totalBaseSalary: number;
  totalOvertime50: number;
  totalOvertime100: number;
  totalNightSurcharge: number;
  totalAdditions: number;
  totalDeductions: number;
  totalNetPayroll: number;
  criticalAnomalyCount: number;
}

// --- Roles ---
export type UserRole = 'hr_admin' | 'hr_analyst' | 'supervisor' | 'employee';

export interface DemoUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

// --- Company & Locations ---
export interface Company {
  id: string;
  name: string;
  ruc: string;           // Ecuadorian tax ID
  address: string;
  phone: string;
  timezone: string;       // "America/Guayaquil"
  currency: string;       // "USD"
}

export interface Location {
  id: string;
  companyId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  geofenceRadiusMeters: number;
}

// --- Employee ---
export type ContractType = 'permanent' | 'fixed_term' | 'part_time' | 'intern';
export type EmployeeStatus = 'active' | 'inactive' | 'suspended' | 'terminated';

export interface Employee {
  id: string;
  employeePin: string;      // Biometric PIN
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  department: string;
  position: string;
  supervisorId: string | null;
  locationId: string;
  contractType: ContractType;
  status: EmployeeStatus;
  hireDate: string;         // ISO date
  baseSalary: number;       // USD
  hourlyRate: number;       // USD
  avatar?: string;
}

// --- Schedules & Shifts ---
export type ShiftType = 'regular' | 'night' | 'rotating' | 'flexible' | 'part_time';

export interface Shift {
  id: string;
  name: string;
  shiftType: ShiftType;
  startTime: string;        // HH:mm
  endTime: string;          // HH:mm
  graceMinutesLate: number; // Tolerance for lateness
  graceMinutesEarly: number;
  breakStart: string | null;
  breakEnd: string | null;
  workHoursPerDay: number;
}

export interface Schedule {
  id: string;
  employeeId: string;
  shiftId: string;
  startDate: string;
  endDate: string | null;   // null = indefinite
  daysOfWeek: number[];      // 0=Sun, 1=Mon ...
  effectiveDate: string;
}

// --- Biometric Devices ---
export type DeviceModel = 'ZKTeco_SenseFace_2A' | 'ZKTeco_WL_Series' | 'ZKTeco_ADMS' | 'mobile_app';
export type DeviceProtocol = 'TA_PUSH' | 'ADMS' | 'TCP_IP' | 'internal_mobile';
export type DeviceStatus = 'online' | 'offline' | 'error' | 'maintenance';

export interface BiometricDevice {
  id: string;
  serial: string;
  model: DeviceModel;
  name: string;
  locationId: string;
  ipAddress: string;
  port: number;
  protocol: DeviceProtocol;
  firmwareVersion: string;
  status: DeviceStatus;
  lastSync: string;          // ISO date
  lastSyncStatus: 'success' | 'partial' | 'failed';
  employeeCount: number;
}

// --- Attendance Events ---
export type VerificationMethod = 'fingerprint' | 'face' | 'pin' | 'card' | 'mobile_gps' | 'mobile_qr';
export type EventType = 'clock_in' | 'clock_out' | 'break_start' | 'break_end' | 'overtime_start' | 'overtime_end';

export interface AttendanceEvent {
  id: string;
  deviceSerial: string;
  deviceModel: DeviceModel;
  employeePin: string;
  employeeId: string;
  eventTime: string;          // ISO date in America/Guayaquil
  verificationMethod: VerificationMethod;
  eventType: EventType;
  sourceProtocol: DeviceProtocol;
  rawEventId: string;
  latitude?: number;
  longitude?: number;
  geofenceValid?: boolean;
}

// --- Anomalies / Exceptions ---
export type ExceptionType = 'lateness' | 'absence' | 'missing_punch' | 'early_exit' | 'extra_time';
export type ExceptionSeverity = 'critical' | 'high' | 'medium' | 'low';
export type ExceptionStatus = 'pending' | 'approved' | 'rejected' | 'auto_resolved' | 'corrected';

export interface AttendanceException {
  id: string;
  employeeId: string;
  date: string;               // ISO date
  type: ExceptionType;
  severity: ExceptionSeverity;
  status: ExceptionStatus;
  description: string;
  scheduledStart: string;     // HH:mm
  scheduledEnd: string;       // HH:mm
  actualStart: string | null;
  actualEnd: string | null;
  minutesAffected: number;
  monetaryImpact: number;     // USD
  relatedEventIds: string[];
  aiNote?: string;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

// --- Approvals ---
export interface ApprovalRecord {
  id: string;
  exceptionId: string;
  employeeId: string;
  approverId: string;
  action: 'approved' | 'rejected' | 'corrected';
  comment: string;
  correctionData?: Partial<AttendanceException>;
  timestamp: string;
}

// --- Payroll Period ---
export type PayrollPeriodStatus = 'open' | 'under_review' | 'ready_for_approval' | 'closed';

export interface PayrollPeriod {
  id: string;
  companyId: string;
  name: string;               // "Q1-2025-P1"
  startDate: string;          // ISO date
  endDate: string;            // ISO date
  status: PayrollPeriodStatus;
  totalEmployees: number;
  totalBaseSalary: number;
  totalOvertime: number;
  totalAdditions: number;
  totalDeductions: number;
  totalNetPayroll: number;
  overtime50Hours: number;
  overtime100Hours: number;
  overtime50Amount: number;
  overtime100Amount: number;
  anomalyCount: number;
  criticalAnomalyCount: number;
}

export interface EmployeePayrollBreakdown {
  employeeId: string;
  fullName: string;
  department: string;
  baseSalary: number;
  workedDays: number;
  totalWorkedHours: number;
  regularHours: number;
  overtime50Hours: number;
  overtime100Hours: number;
  overtime50Amount: number;
  overtime100Amount: number;
  additions: PayrollAdjustment[];
  deductions: PayrollAdjustment[];
  totalAdditions: number;
  totalDeductions: number;
  grossPay: number;
  netPay: number;
  status: 'complete' | 'pending_review' | 'has_anomalies';
}

export interface PayrollAdjustment {
  id: string;
  concept: string;
  amount: number;
  type: 'addition' | 'deduction';
  isConfigurable: boolean;
  description: string;
}

// --- AI Review ---
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface AIReviewResult {
  periodId: string;
  periodName: string;
  overallRiskLevel: RiskLevel;
  summary: string;              // Spanish
  anomalyBreakdown: {
    type: ExceptionType;
    count: number;
    totalImpact: number;
  }[];
  criticalFindings: AIFinding[];
  recommendations: string[];    // Spanish
  canClosePeriod: boolean;
  reasonSummary: string;
  reviewedAt: string;
  modelUsed: 'deterministic' | 'ai_ml_api';
}

export interface AIFinding {
  employeeId: string;
  employeeName: string;
  issue: string;                // Spanish
  evidence: string[];           // Citations of attendance events
  rulesApplied: string[];
  estimatedImpact: number;
  riskLevel: RiskLevel;
}

// --- Voice Notes (Speechmatics) ---
export interface VoiceNote {
  id: string;
  employeeId: string;
  audioUrl?: string;
  transcription: string;
  language: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  draftExceptionRequest?: Partial<AttendanceException>;
  createdAt: string;
}

// --- Bright Data Policy Watch ---
export interface PolicyUpdate {
  id: string;
  source: string;
  title: string;
  url: string;
  summary: string;              // Spanish
  relevantTo: string[];
  datePublished: string;
  reviewed: boolean;
}

// --- Navigation ---
export interface NavSection {
  title: string;
  items: NavItem[];
}

export interface NavItem {
  label: string;
  path: string;
  icon: string;
  badge?: number;
  roles: UserRole[];
}