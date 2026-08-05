import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // Handshake for ZKTeco ADMS
  // Usually returns "OK"
  return new NextResponse('OK', { status: 200, headers: { 'Content-Type': 'text/plain' } });
}
