/**
 * Firestore tenant isolation — canonical paths for per-tenant config and data.
 * Legacy flat collections remain for backward compatibility until migration completes.
 */

import type {
  CollectionReference,
  DocumentReference,
  Firestore,
} from 'firebase-admin/firestore';
import { db } from '@/lib/firebase';
import {
  TenantConfig,
  isValidTenantConfig,
  resolveTenantConfig,
} from './tenantConfig';

export const TENANTS_ROOT = 'tenants';
export const TENANT_CONFIG_DOC = 'workforce';

/** Sanitize tenant id for Firestore path segments. */
export function normalizeTenantId(tenantId: string): string {
  const trimmed = tenantId?.trim() || 'default';
  return trimmed.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
}

export function tenantRef(
  firestore: Firestore,
  tenantId: string
): DocumentReference {
  return firestore.collection(TENANTS_ROOT).doc(normalizeTenantId(tenantId));
}

export function tenantConfigRef(
  firestore: Firestore,
  tenantId: string
): DocumentReference {
  return tenantRef(firestore, tenantId)
    .collection('config')
    .doc(TENANT_CONFIG_DOC);
}

export function tenantEmployeesCollection(
  firestore: Firestore,
  tenantId: string
): CollectionReference {
  return tenantRef(firestore, tenantId).collection('employees');
}

/** Loads tenant config from Firestore, falling back to in-memory defaults. */
export async function loadTenantConfig(tenantId: string): Promise<TenantConfig> {
  const defaults = resolveTenantConfig(tenantId);
  const snap = await tenantConfigRef(db, tenantId).get();

  if (!snap.exists) {
    return defaults;
  }

  const data = snap.data() as Partial<TenantConfig> | undefined;
  const merged: TenantConfig = {
    tenant_id: normalizeTenantId(tenantId),
    schedule: { ...defaults.schedule, ...data?.schedule },
    payroll: { ...defaults.payroll, ...data?.payroll },
  };

  return isValidTenantConfig(merged) ? merged : defaults;
}

/** Persists tenant workforce config under tenants/{id}/config/workforce. */
export async function saveTenantConfig(config: TenantConfig): Promise<void> {
  if (!isValidTenantConfig(config)) {
    throw new Error(`Invalid tenant config for ${config.tenant_id}`);
  }

  await tenantConfigRef(db, config.tenant_id).set(
    {
      tenant_id: normalizeTenantId(config.tenant_id),
      schedule: config.schedule,
      payroll: config.payroll,
      updated_at: new Date().toISOString(),
    },
    { merge: true }
  );
}
