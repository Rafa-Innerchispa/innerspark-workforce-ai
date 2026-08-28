import {
  CanonicalPunch,
  PunchEventType,
  createCanonicalPunch,
  normalizePunchTimestamp,
} from './canonicalPunch';

export interface PunchAdapterContext {
  device_id: string;
  source?: CanonicalPunch['source'];
}

export interface PunchAdapter {
  readonly vendor: CanonicalPunch['source'];
  parse(raw: unknown, context: PunchAdapterContext): CanonicalPunch | null;
  parseBatch(raw: unknown, context: PunchAdapterContext): CanonicalPunch[];
}

/** ZKTeco ATTLOG state codes: 0 = check-in, 1 = check-out. */
const ZKTECO_STATE_TO_EVENT: Record<string, PunchEventType> = {
  '0': 'clock_in',
  '1': 'clock_out',
  '2': 'break_start',
  '3': 'break_end',
};

function mapZktecoState(state: string | undefined): PunchEventType {
  if (state === undefined || state === '') {
    return 'unknown';
  }
  return ZKTECO_STATE_TO_EVENT[state.trim()] ?? 'unknown';
}

function parseZktecoAttlogLine(
  line: string,
  context: PunchAdapterContext
): CanonicalPunch | null {
  const trimmed = line.trim();
  if (!trimmed) {
    return null;
  }

  const parts = trimmed.split('\t');
  if (parts.length < 2) {
    return null;
  }

  const [employee_id, timestampRaw, state, verification] = parts;
  if (!employee_id?.trim() || !timestampRaw?.trim()) {
    return null;
  }

  let timestamp: string;
  try {
    timestamp = normalizePunchTimestamp(timestampRaw);
  } catch {
    return null;
  }

  return createCanonicalPunch({
    employee_id: employee_id.trim(),
    timestamp,
    event_type: mapZktecoState(state),
    source: context.source ?? 'zkteco',
    device_id: context.device_id,
    evidence: {
      raw: trimmed,
      raw_ref: `zkteco:${context.device_id}:${employee_id.trim()}:${timestampRaw.trim()}`,
      ...(verification?.trim() ? { photo_ref: verification.trim() } : {}),
    },
    raw_ref: `zkteco:${context.device_id}:${employee_id.trim()}:${timestampRaw.trim()}`,
  });
}

/**
 * Stub adapter for ZKTeco ADMS/iClock ATTLOG payloads.
 * Accepts a single tab-separated line or a newline-delimited batch string.
 */
export class ZKTecoPunchAdapter implements PunchAdapter {
  readonly vendor = 'zkteco' as const;

  parse(raw: unknown, context: PunchAdapterContext): CanonicalPunch | null {
    if (typeof raw !== 'string') {
      return null;
    }
    return parseZktecoAttlogLine(raw, context);
  }

  parseBatch(raw: unknown, context: PunchAdapterContext): CanonicalPunch[] {
    if (typeof raw !== 'string') {
      return [];
    }

    return raw
      .split('\n')
      .map((line) => this.parse(line, context))
      .filter((punch): punch is CanonicalPunch => punch !== null);
  }
}

export const zktecoPunchAdapter = new ZKTecoPunchAdapter();
