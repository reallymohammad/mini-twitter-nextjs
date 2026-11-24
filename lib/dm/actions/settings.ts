// ib/dm/actions/dm/settings.ts
"use server";

import { prisma } from "@/lib/prisma";
import { requireCurrentUserId } from "./helpers";

export async function toggleReadReceipts(enabled: boolean) {
  const userId = await requireCurrentUserId();

  await prisma.userSettings.upsert({
    where: { userId },
    update: { showReadReceipts: enabled },
    create: { userId, showReadReceipts: enabled },
  });

  return { success: true };
}
