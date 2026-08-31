import { NextResponse } from 'next/server';
import { entityPolicySummary, inventoryForUser, MODULE_INVENTORY } from '@/lib/moduleInventory';
import { requireSession } from '@/lib/sessionAuth';

export async function GET() {
  const user = await requireSession();
  if (user instanceof NextResponse) return user;

  const visible =
    user.role === 'superadmin'
      ? MODULE_INVENTORY
      : inventoryForUser(user.allowedModuleIds);

  return NextResponse.json({
    ok: true,
    inventory: visible,
    policy: entityPolicySummary(),
    user: {
      id: user.id,
      role: user.role,
      companyId: user.companyId,
      allowedModuleIds: user.allowedModuleIds,
    },
  });
}
