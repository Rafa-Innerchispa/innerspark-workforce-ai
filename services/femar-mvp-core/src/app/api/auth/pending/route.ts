import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { requireRole } from '@/lib/auth/server';

export async function GET(req: NextRequest) {
  const auth = await requireRole(req, ['master','tenant_admin']);
  if (!auth.ok) return auth.response;

  let query: FirebaseFirestore.Query = db.collection('users').where('status', '==', 'PENDING');
  if (auth.session.role !== 'master') {
    query = query.where('companyId', '==', auth.session.companyId);
  }
  const snapshot = await query.get();
  const users = snapshot.docs.map(doc => {
    const data = doc.data();
    const { password: _password, ...safe } = data;
    return { id: doc.id, ...safe };
  });
  return NextResponse.json({ success: true, users });
}
