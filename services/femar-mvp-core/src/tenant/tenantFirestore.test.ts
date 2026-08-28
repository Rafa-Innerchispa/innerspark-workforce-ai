import {
  TENANTS_ROOT,
  normalizeTenantId,
  tenantConfigRef,
  tenantEmployeesCollection,
  tenantRef,
} from './tenantFirestore';

function createPathTrackingFirestore() {
  const segments: string[] = [];

  const docRef = (path: string) => ({
    id: path.split('/').pop(),
    collection: (name: string) => {
      segments.push(`${path}/${name}`);
      return collectionRef(`${path}/${name}`);
    },
  });

  const collectionRef = (path: string) => ({
    doc: (id: string) => {
      segments.push(`${path}/${id}`);
      return docRef(`${path}/${id}`);
    },
  });

  return {
    collection: (name: string) => {
      segments.push(name);
      return collectionRef(name);
    },
    segments,
  };
}

describe('tenantFirestore', () => {
  it('normalizes tenant ids for safe Firestore paths', () => {
    expect(normalizeTenantId('FEMAR')).toBe('femar');
    expect(normalizeTenantId(' acme corp ')).toBe('acme_corp');
    expect(normalizeTenantId('')).toBe('default');
  });

  it('scopes employees under tenants/{id}/employees', () => {
    const firestore = createPathTrackingFirestore();
    tenantEmployeesCollection(firestore as never, 'femar');

    expect(firestore.segments).toEqual([
      TENANTS_ROOT,
      `${TENANTS_ROOT}/femar`,
      `${TENANTS_ROOT}/femar/employees`,
    ]);
  });

  it('stores workforce config under tenants/{id}/config/workforce', () => {
    const firestore = createPathTrackingFirestore();
    tenantConfigRef(firestore as never, 'femar');

    expect(firestore.segments).toContain(`${TENANTS_ROOT}/femar/config/workforce`);
  });

  it('uses normalized tenant id in tenant root doc', () => {
    const firestore = createPathTrackingFirestore();
    tenantRef(firestore as never, ' InnerSpark-Labs ');

    expect(firestore.segments).toEqual([
      TENANTS_ROOT,
      `${TENANTS_ROOT}/innerspark-labs`,
    ]);
  });
});
