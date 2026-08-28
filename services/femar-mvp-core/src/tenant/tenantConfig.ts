/**
 * Per-tenant workforce configuration — schedule rules and payroll thresholds
 * consumed by attendance normalization and reporting pipelines.
 */

export interface TenantScheduleConfig {
  /** IANA timezone (e.g. America/Guayaquil). */
  timezone: string;
  /** Standard entry time HH:mm (24h). */
  entry_time: string;
  /** Standard exit time HH:mm (24h). */
  exit_time: string;
  /** Grace period after entry_time before marking late. */
  grace_minutes: number;
}

export interface TenantPayrollConfig {
  /** Expected punch count per reporting period (e.g. 20 for ~10 work days). */
  expected_punches_per_period: number;
  overtime_rate: number;
  penalty_rate: number;
  /** IESS employee contribution rate. */
  iess_rate: number;
}

export interface TenantConfig {
  tenant_id: string;
  schedule: TenantScheduleConfig;
  payroll: TenantPayrollConfig;
}

const HH_MM = /^([01]\d|2[0-3]):([0-5]\d)$/;

const DEFAULT_SCHEDULE: TenantScheduleConfig = {
  timezone: 'America/Guayaquil',
  entry_time: '09:00',
  exit_time: '18:00',
  grace_minutes: 15,
};

const DEFAULT_PAYROLL: TenantPayrollConfig = {
  expected_punches_per_period: 20,
  overtime_rate: 10,
  penalty_rate: 15,
  iess_rate: 0.0945,
};

/** Known tenant overrides; unknown ids fall back to defaults. */
const TENANT_OVERRIDES: Record<string, Partial<TenantConfig>> = {
  femar: {
    tenant_id: 'femar',
    schedule: { ...DEFAULT_SCHEDULE },
    payroll: { ...DEFAULT_PAYROLL },
  },
};

export function parseScheduleTimeToMinutes(time: string): number {
  const match = time.match(HH_MM);
  if (!match) {
    throw new Error(`Invalid schedule time: ${time}`);
  }
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
}

export function isValidTenantConfig(
  value: Partial<TenantConfig>
): value is TenantConfig {
  if (!value.tenant_id?.trim()) {
    return false;
  }

  const schedule = value.schedule;
  if (
    !schedule?.timezone?.trim() ||
    !HH_MM.test(schedule.entry_time ?? '') ||
    !HH_MM.test(schedule.exit_time ?? '') ||
    schedule.grace_minutes === undefined ||
    schedule.grace_minutes < 0
  ) {
    return false;
  }

  const payroll = value.payroll;
  if (
    !payroll ||
    payroll.expected_punches_per_period <= 0 ||
    payroll.overtime_rate < 0 ||
    payroll.penalty_rate < 0 ||
    payroll.iess_rate < 0 ||
    payroll.iess_rate > 1
  ) {
    return false;
  }

  return true;
}

export function createTenantConfig(
  tenantId: string,
  overrides?: Partial<Omit<TenantConfig, 'tenant_id'>>
): TenantConfig {
  const config: TenantConfig = {
    tenant_id: tenantId.trim(),
    schedule: {
      ...DEFAULT_SCHEDULE,
      ...overrides?.schedule,
    },
    payroll: {
      ...DEFAULT_PAYROLL,
      ...overrides?.payroll,
    },
  };

  if (!isValidTenantConfig(config)) {
    throw new Error(`Invalid tenant config for ${tenantId}`);
  }

  return config;
}

/**
 * Resolves tenant configuration by id with safe defaults for unknown tenants.
 */
export function resolveTenantConfig(tenantId: string): TenantConfig {
  const normalized = tenantId?.trim() || 'default';
  const override = TENANT_OVERRIDES[normalized];

  return createTenantConfig(normalized, {
    schedule: override?.schedule,
    payroll: override?.payroll,
  });
}
