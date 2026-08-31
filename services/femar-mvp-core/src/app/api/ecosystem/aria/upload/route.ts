import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/pdf',
  'text/csv',
  'text/plain',
]);

/** Tenant-safe attachment ingest for ARIA (in-memory session; no cross-tenant persistence). */
export async function POST(req: Request) {
  const cookieStore = await cookies();
  const userId = cookieStore.get('session_token')?.value;
  if (!userId) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof Blob) || file.size === 0) {
    return NextResponse.json({ ok: false, error: 'missing_file' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ ok: false, error: 'file_too_large' }, { status: 413 });
  }

  const mime = file.type || 'application/octet-stream';
  if (!ALLOWED.has(mime)) {
    return NextResponse.json({ ok: false, error: 'type_not_allowed', mime }, { status: 415 });
  }

  const name = typeof form?.get('name') === 'string' ? String(form.get('name')) : 'attachment';
  const buf = Buffer.from(await file.arrayBuffer());
  const preview =
    mime.startsWith('image/') || mime === 'text/csv' || mime === 'text/plain'
      ? buf.toString('utf8', 0, Math.min(buf.length, 4000))
      : '';

  return NextResponse.json({
    ok: true,
    attachment: {
      name,
      mime,
      size: buf.length,
      preview: preview || undefined,
      dataBase64: buf.toString('base64'),
    },
  });
}
