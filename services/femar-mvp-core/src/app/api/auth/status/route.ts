import { NextResponse } from 'next/server';
import { GOOGLE_OAUTH_REDIRECT_URIS } from '@/lib/innerosCopy';
import { googleOAuthConfigured, oauthRedirectUri, resolveOAuthOrigin } from '@/lib/googleAuth';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = resolveOAuthOrigin(url, null, req.headers);
  return NextResponse.json({
    ok: true,
    google_oauth: googleOAuthConfigured(),
    redirect_uri_for_this_host: oauthRedirectUri(origin),
    register_in_google_console: GOOGLE_OAUTH_REDIRECT_URIS,
    note: 'Add every hostname you use (creatorcore.ai, pcdoctor.ai, iskconguayaquil.org) to Authorized redirect URIs.',
  });
}
