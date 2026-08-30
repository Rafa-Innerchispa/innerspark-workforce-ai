import { deliverMail } from '@/lib/mailDelivery';

const DEFAULT_ADMIN_EMAIL = 'rafagye@gmail.com';

export function adminNotificationEmails(): string[] {
  const raw = process.env.INNEROS_ADMIN_EMAILS || DEFAULT_ADMIN_EMAIL;
  return raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** Bootstrap accounts that may enter immediately without manual approval. */
export function isAutoApprovedEmail(email: string): boolean {
  const lower = email.trim().toLowerCase();
  const allowlist = (process.env.INNEROS_OAUTH_AUTO_APPROVE_EMAILS || DEFAULT_ADMIN_EMAIL)
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowlist.includes(lower);
}

export function approvalsUrl(origin?: string): string {
  const base = (origin || process.env.INNEROS_PUBLIC_ORIGIN || 'https://inneros.creatorcore.ai').replace(
    /\/$/,
    ''
  );
  return `${base}/approvals`;
}

export async function notifyAdminPendingUser(input: {
  name: string;
  cedula: string;
  email?: string;
  companyId: string;
  phone?: string;
  address?: string;
  authProvider?: string;
  origin?: string;
}): Promise<void> {
  const adminEmails = adminNotificationEmails();
  const link = approvalsUrl(input.origin);
  const provider = input.authProvider || 'password';

  for (const to of adminEmails) {
    const html = `
            <h2>Solicitud de acceso a InnerOS</h2>
            <p><strong>${input.name}</strong> solicita acceso.</p>
            <ul>
              <li>Cédula/ID: <strong>${input.cedula}</strong></li>
              <li>Correo: ${input.email || '—'}</li>
              <li>Teléfono: ${input.phone || '—'}</li>
              <li>Dirección: ${input.address || '—'}</li>
              <li>Empresa solicitada: <strong>${input.companyId}</strong></li>
              <li>Método: ${provider}</li>
            </ul>
            <p>Estado actual: <strong>PENDING</strong></p>
            <p><a href="${link}" style="background:#2563eb;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">Abrir panel de aprobaciones</a></p>
          `;
    try {
      await deliverMail({
        to,
        subject: 'Nuevo usuario pendiente de aprobación — InnerOS',
        html,
      });
    } catch (e) {
      console.warn('Could not deliver admin notification email', to, e);
    }
  }
}
