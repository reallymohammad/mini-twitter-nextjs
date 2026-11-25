// lib/dm/actions/markAsRead.ts
"use server";

import { prisma } from "@/lib/prisma";

export async function markConversationAsRead(
  conversationId: string,
  userId: string
) {
  if (!conversationId || !userId) return null;

  // ۱. بررسی تنظیمات کاربر لاگین‌شده
  const settings = await prisma.userSettings.findUnique({
    where: { userId },
    select: { showReadReceipts: true },
  });

  // اگر خاموش کرده باشد، هیچ تاریخی ثبت نمی‌کنیم و null برمی‌گردانیم
  if (!settings?.showReadReceipts) {
    return null;
  }

  const now = new Date();

  // ۲. به‌روزرسانی lastReadAt فقط برای همین کاربر
  const updated = await prisma.userConversation.update({
    where: {
      userId_conversationId: {
        userId,
        conversationId,
      },
    },
    data: {
      lastReadAt: now,
    },
  });

  return { lastReadAt: updated.lastReadAt ?? now };
}
