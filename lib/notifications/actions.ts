"use server";

import { NotificationType, Prisma, FollowStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export type NotificationFilter = "ALL" | "VERIFIED" | "MENTIONS";

const MAX_NOTIFICATION_LIMIT = 100;

const notificationInclude = {
  actor: {
    select: {
      id: true,
      username: true,
      fullName: true,
      avatarUrl: true,
      badge: true,
      isPrivate: true,
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
} satisfies Prisma.NotificationInclude;

type NotificationWithRelations = Prisma.NotificationGetPayload<{
  include: typeof notificationInclude;
}>;

function getSafeLimit(limit: number): number {
  if (!Number.isFinite(limit)) return 20;
  return Math.max(1, Math.min(Math.floor(limit), MAX_NOTIFICATION_LIMIT));
}

function isVerifiedBadge(badge: unknown): boolean {
  if (typeof badge === "string") {
    const value = badge.trim().toUpperCase();
    return (
      value.length > 0 &&
      !["NONE", "NO_BADGE", "UNVERIFIED", "NOT_VERIFIED"].includes(value)
    );
  }
  return Boolean(badge);
}

/**
 * ساخت شرط پایه دیتابیس همراه با فیلترهای امنیتی بلاک، میوت و پرایوت
 */
function buildNotificationWhere(
  recipientId: string,
  filter: NotificationFilter,
  unreadOnly = false,
): Prisma.NotificationWhereInput {
  return {
    recipientId,
    ...(unreadOnly ? { isRead: false } : {}),
    ...(filter === "MENTIONS"
      ? { type: NotificationType.MENTION }
      : { type: { not: NotificationType.MESSAGE } }),
    // فیلتر امنیتی: عدم نمایش اعلان از کاربران بلاک‌شده یا میوت‌شده
    actor: {
      isNot: {
        OR: [
          // کاربرانی که گیرنده آن‌ها را بلاک کرده است
          { blockedBy: { some: { blockerId: recipientId } } },
          // کاربرانی که گیرنده را بلاک کرده‌اند
          { blocking: { some: { blockedId: recipientId } } },
          // کاربرانی که توسط گیرنده میوت شده‌اند
          { mutedBy: { some: { muterId: recipientId } } },
        ],
      },
    },
  };
}

/**
 * بررسی اینکه آیا تعاملِ یک اکانت پرایوت معتبر است یا خیر
 * (اگر اکانت actor پرایوت باشد، گیرنده باید حتماً او را فالو کرده و وضعیت ACCEPTED داشته باشد)
 */
async function filterValidNotifications(
  recipientId: string,
  notifications: NotificationWithRelations[],
): Promise<NotificationWithRelations[]> {
  const validNotifications: NotificationWithRelations[] = [];

  // انواع تعاملی که برای اکانت‌های پرایوت نیاز به بررسی فالو دارند
  const privateContentTypes: NotificationType[] = [
    NotificationType.LIKE,
    NotificationType.REPOST,
    NotificationType.QUOTE,
    NotificationType.REPLY,
    NotificationType.MENTION,
  ];

  for (const notification of notifications) {
    // اگر اعلان actor ندارد یا نوع آن جزء تعاملات محتوایی حساس نیست، عبور کن
    if (!notification.actor || !privateContentTypes.includes(notification.type)) {
      validNotifications.push(notification);
      continue;
    }

    // اگر اکانت actor پرایوت است، بررسی می‌کنیم که آیا گیرنده او را فالو کرده است یا خیر
    if (notification.actor.isPrivate) {
      const follow = await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: recipientId,
            followingId: notification.actor.id,
          },
        },
        select: { status: true },
      });

      // اگر فالو نکرده یا درخواستش تایید نشده (ACCEPTED نیست)، این نوتیفیکیشن نباید نمایش داده شود
      if (!follow || follow.status !== FollowStatus.ACCEPTED) {
        continue;
      }
    }

    validNotifications.push(notification);
  }

  return validNotifications;
}

export async function getNotifications({
  cursor,
  limit = 2,
  filter = "ALL",
}: {
  cursor?: string;
  limit?: number;
  filter?: NotificationFilter;
}) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const safeLimit = getSafeLimit(limit);
  const where = buildNotificationWhere(user.id, filter);

  const scanLimit =
    filter === "VERIFIED" ? Math.max(safeLimit + 1, 50) : safeLimit + 1;

  const collected: NotificationWithRelations[] = [];
  let scanCursor = cursor;

  while (collected.length <= safeLimit) {
    const batch = await prisma.notification.findMany({
      where,
      take: scanLimit,
      ...(scanCursor ? { cursor: { id: scanCursor }, skip: 1 } : {}),
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: notificationInclude,
    });

    if (batch.length === 0) break;

    // اعمال فیلترهای تکمیلی (مانند پرایوت بودن و ...) روی دسته‌ی خوانده شده
    const validatedBatch = await filterValidNotifications(user.id, batch);

    for (const notification of validatedBatch) {
      if (
        filter !== "VERIFIED" ||
        isVerifiedBadge(notification.actor?.badge)
      ) {
        collected.push(notification);
      }
    }

    if (batch.length < scanLimit) break;

    scanCursor = batch[batch.length - 1].id;
  }

  const hasMore = collected.length > safeLimit;
  const page = hasMore ? collected.slice(0, safeLimit) : collected;

  return {
    notifications: page,
    nextCursor: hasMore ? page[page.length - 1]?.id : undefined,
  };
}

export async function getUnreadNotificationsCount() {
  const user = await getCurrentUser();
  if (!user) return 0;

  // شمارش اولیه با احتساب شرط‌های پایه‌ی بلاک و میوت
  const rawCount = await prisma.notification.count({
    where: buildNotificationWhere(user.id, "ALL", true),
  });

  return rawCount;
}

export async function markAllNotificationsAsRead(
  filter: NotificationFilter = "ALL",
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const where = buildNotificationWhere(user.id, filter, true);

  const unreadNotifications = await prisma.notification.findMany({
    where,
    include: notificationInclude,
  });

  const validatedUnread = await filterValidNotifications(user.id, unreadNotifications);

  let targetIds = validatedUnread.map((n) => n.id);

  if (filter === "VERIFIED") {
    targetIds = targetIds.filter((id) => {
      const n = validatedUnread.find((item) => item.id === id);
      return isVerifiedBadge(n?.actor?.badge);
    });
  }

  if (targetIds.length > 0) {
    await prisma.notification.updateMany({
      where: {
        recipientId: user.id,
        isRead: false,
        id: { in: targetIds },
      },
      data: { isRead: true },
    });
  }

  revalidatePath("/[locale]/notifications", "page");
  revalidatePath("/[locale]", "layout");

  return { success: true };
}
export async function markNotificationAsRead(notificationId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  
  await prisma.notification.updateMany({
    where: { id: notificationId, recipientId: user.id },
    data: { isRead: true },
  });
  
  revalidatePath("/[locale]/notifications");
  return { success: true };
}