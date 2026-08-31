import crypto from 'crypto';

/** scrypt hash: `salt:hexkey` */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hashedBuffer = crypto.scryptSync(password, salt, 64);
  return `${salt}:${hashedBuffer.toString('hex')}`;
}

export function verifyPassword(password: string, stored?: string | null): boolean {
  if (!stored) return false;
  if (stored.includes(':')) {
    const [salt, key] = stored.split(':');
    const hashedBuffer = crypto.scryptSync(password, salt, 64);
    return key === hashedBuffer.toString('hex');
  }
  const legacy = crypto.createHash('sha256').update(password).digest('hex');
  return stored === legacy;
}

export function validatePasswordStrength(password: string): string | null {
  if (!password || password.length < 8) {
    return 'La contraseña debe tener al menos 8 caracteres';
  }
  return null;
}
