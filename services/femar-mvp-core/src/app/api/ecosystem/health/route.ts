import { ECOSYSTEM_MODULES } from '@/lib/ecosystemModules';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ProbeResult = {
  id: string;
  name: string;
  status: string;
  url: string | null;
  http_status: number | null;
  ok: boolean;
  error?: string;
};

async function probeUrl(url: string, timeoutMs = 8000): Promise<{ status: number | null; error?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: controller.signal,
      cache: 'no-store',
    });
    if (res.status === 405 || res.status === 501) {
      const getRes = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
        cache: 'no-store',
      });
      return { status: getRes.status };
    }
    return { status: res.status };
  } catch (err) {
    return { status: null, error: err instanceof Error ? err.message : 'probe_failed' };
  } finally {
    clearTimeout(timer);
  }
}

export async function GET() {
  const probes: ProbeResult[] = [];

  for (const mod of ECOSYSTEM_MODULES) {
    const url = mod.publicUrl || mod.entryUrl;
    if (!url || url.startsWith('http://192.168.')) {
      probes.push({
        id: mod.id,
        name: mod.name,
        status: mod.status,
        url,
        http_status: null,
        ok: mod.status === 'NOT_READY',
        error: url ? 'lan_only' : 'no_public_url',
      });
      continue;
    }

    const result = await probeUrl(url);
    const ok = result.status !== null && result.status >= 200 && result.status < 400;
    probes.push({
      id: mod.id,
      name: mod.name,
      status: mod.status,
      url,
      http_status: result.status,
      ok,
      error: result.error,
    });
  }

  const liveCount = probes.filter((p) => p.ok).length;
  return Response.json({
    ok: liveCount > 0,
    checked_at: new Date().toISOString(),
    summary: { total: probes.length, live: liveCount, failed: probes.length - liveCount },
    probes,
  });
}
