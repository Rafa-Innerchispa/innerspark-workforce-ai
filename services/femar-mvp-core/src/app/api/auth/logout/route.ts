import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set('session_token', '', { maxAge: 0, path: '/' });
  response.cookies.set('inneros_entity', '', { maxAge: 0, path: '/' });
  return response;
}
