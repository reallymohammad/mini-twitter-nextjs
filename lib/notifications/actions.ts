// lib/notifications/actions.ts
"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/session";
import { NotificationType, Prisma } from "@prisma/client";

const MAX_NOTIFICATION_LIMIT = 100;

function getSafeLimit(limit: number): number {
  if (!Number.isFinite(limit)) return 20;
  return Math.max(1, Math.min(Math.floor(limit), MAX_NOTIFICATION_LIMIT));
}

export async function getNotifications({
  cursor,
  limit = 20,
  filter = "ALL",
}: {
  cursor?: string;
  limit?: number;
  filter?: "ALL" | "MENTIONS";
}) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const safeLimit = getSafeLimit(limit);

  const where: Prisma.NotificationWhereInput = {
    recipientId: user.id,
    type:
      filter === "MENTIONS"
        ? NotificationType.MENTION
        : { not: NotificationType.MESSAGE }, // ✅ MESSAGE از فید حذف شد
  };

  const notifications = await prisma.notification.findMany({
    where,
    take: safeLimit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: { createdAt: "desc" },
    include: {
      actor: {
        select: {
          id: true,
          username: true,
          fullName: true,
          avatarUrl: true,
          badge: true,
        },
      },
      post: {
        select: {
          id: true,
          content: true,
        },
      },
      message: {
        select: {
          id: true,
          content: true,
          conversationId: true,
        },
      },
    },
  });

  const hasMore = notifications.length > safeLimit;
  const page = hasMore ? notifications.slice(0, safeLimit) : notifications;

  return {
    notifications: page,
    nextCursor: hasMore ? page[page.length - 1]?.id : undefined,
  };
}

export async function getUnreadNotificationsCount() {
  const user = await getCurrentUser();
  if (!user) return 0;

  return prisma.notification.count({
    where: {
      recipientId: user.id,
      isRead: false,
      type: {
        not: NotificationType.MESSAGE, // ✅ MESSAGE از شمارنده هم حذف شد
      },
    },
  });
}

export async function markNotificationAsRead(notificationId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  if (!notificationId?.trim()) throw new Error("Invalid notification ID");

  const result = await prisma.notification.updateMany({
    where: {
      id: notificationId,
      recipientId: user.id,
      isRead: false,
      // اینجا لازم نیست MESSAGE را فیلتر کنیم؛
      // چون ممکنه بعداً برای جای دیگری استفاده بشه.
    },
    data: { isRead: true },
  });

  // نوتیف پیج + هرجایی که بج را نشان می‌دهد (مثلاً layout)
  revalidatePath("/[locale]/notifications", "page");
  revalidatePath("/[locale]", "layout");

  return { success: true, updated: result.count > 0 };
}

export async function markAllNotificationsAsRead() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  await prisma.notification.updateMany({
    where: {
      recipientId: user.id,
      isRead: false,
      type: {
        not: NotificationType.MESSAGE, // ✅ mark-all فقط نوتیف‌های واقعی را read می‌کند
      },
    },
    data: { isRead: true },
  });

  revalidatePath("/[locale]/notifications", "page");
  revalidatePath("/[locale]", "layout");

  return { success: true };
}
