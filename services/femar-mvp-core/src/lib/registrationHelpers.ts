export type CompanyRequestType = 'join_existing' | 'new_tenant';

export type CompanyRequest = {
  type: CompanyRequestType;
  displayName: string;
  slug: string;
};

export function slugifyCompanyName(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'empresa'
  );
}

export function buildCompanyRequest(
  type: CompanyRequestType,
  displayName: string
): CompanyRequest {
  const slug = slugifyCompanyName(displayName);
  return { type, displayName: displayName.trim(), slug };
}

/** Pending users stay under pending:{slug} until superadmin assigns real tenant. */
export function pendingCompanyId(request: CompanyRequest): string {
  return `pending:${request.slug}`;
}
