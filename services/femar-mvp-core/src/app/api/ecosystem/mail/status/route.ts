import { NextResponse } from 'next/server';
import { mailDeliveryStatus } from '@/lib/mailDelivery';

export async function GET() {
  return NextResponse.json({
    ok: true,
    ...mailDeliveryStatus(),
    install_script: 'services/femar-mvp-core/scripts/install-firebase-trigger-email.sh',
    firebase_project: 'innerspark-workforce-ai',
    mail_collection: 'mail',
  });
}
