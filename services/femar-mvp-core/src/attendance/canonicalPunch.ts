/**
 * Canonical attendance punch — vendor-neutral record consumed by novelty,
 * pre-payroll and reporting pipelines.
 */

export type PunchEventType =
  | 'clock_in'
  | 'clock_out'
  | 'break_start'
  | 'break_end'
  | 'unknown';

export type PunchSourceVendor = 'zkteco' | 'mobile' | 'manual' | (string & {});

export interface PunchEvidence {
  /** Inline raw payload from the originating device/protocol. */
  raw?: string;
  /** Storage reference when raw payload is persisted externally. */
  raw_ref?: string;
  photo_ref?: string;
  latitude?: number;
  longitude?: number;
}

export interface CanonicalPunch {
  employee_id: string;
  /** ISO-8601 timestamp with timezone offset. */
  timestamp: string;
  event_type: PunchEventType;
  /** Originating integration channel (e.g. zkteco, mobile). */
  source: PunchSourceVendor;
  /** Hardware or logical device identifier (serial, terminal id). */
  device_id: string;
  evidence?: PunchEvidence;
  /** Top-level alias for evidence.raw_ref when adapters only supply a pointer. */
  raw_ref?: string;
}

const REQUIRED_FIELDS: (keyof CanonicalPunch)[] = [
  'employee_id',
  'timestamp',
  'event_type',
  'source',
  'device_id',
];

const ISO_TIMESTAMP =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

/**
 * Normalizes ADMS-style local timestamps to ISO-8601 (America/Guayaquil UTC-05:00).
 */
export function normalizePunchTimestamp(timestamp: string): string {
  const trimmed = timestamp.trim();
  if (ISO_TIMESTAMP.test(trimmed)) {
    return trimmed.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(trimmed)
      ? trimmed
      : `${trimmed}Z`;
  }

  const localMatch = trimmed.match(
    /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})(?:\.\d{1,3})?$/
  );
  if (localMatch) {
    return `${localMatch[1]}T${localMatch[2]}-05:00`;
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }

  throw new Error(`Unsupported punch timestamp format: ${timestamp}`);
}

export function isValidCanonicalPunch(
  value: Partial<CanonicalPunch>
): value is CanonicalPunch {
  for (const field of REQUIRED_FIELDS) {
    const current = value[field];
    if (current === undefined || current === null || current === '') {
      return false;
    }
  }

  if (!ISO_TIMESTAMP.test(value.timestamp!)) {
    return false;
  }

  return true;
}

export function createCanonicalPunch(
  input: Omit<CanonicalPunch, 'timestamp'> & { timestamp: string }
): CanonicalPunch {
  const timestamp = normalizePunchTimestamp(input.timestamp);
  const punch: CanonicalPunch = {
    ...input,
    timestamp,
    raw_ref: input.raw_ref ?? input.evidence?.raw_ref,
    evidence: input.evidence
      ? {
          ...input.evidence,
          raw_ref: input.evidence.raw_ref ?? input.raw_ref,
        }
      : input.raw_ref
        ? { raw_ref: input.raw_ref }
        : undefined,
  };

  if (!isValidCanonicalPunch(punch)) {
    throw new Error('Invalid canonical punch payload');
  }

  return punch;
}
