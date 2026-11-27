import { FollowStatus, NotificationType } from "@prisma/client";

import { prisma } from "@/lib/prisma";

interface CreateNotificationParams {
  type: NotificationType;
  recipientId: string;
  actorId: string;
  postId?: string | null;
  messageId?: string | null;
  reportId?: string | null;
}

const PRIVATE_INTERACTION_TYPES: ReadonlySet<NotificationType> = new Set([
  NotificationType.LIKE,
  NotificationType.REPOST,
  NotificationType.QUOTE,
  NotificationType.REPLY,
  NotificationType.MENTION,
]);

export async function createNotification({
  type,
  recipientId,
  actorId,
  postId,
  messageId,
  reportId,
}: CreateNotificationParams) {
  if (!recipientId || !actorId || recipientId === actorId) {
    return null;
  }

  try {
    // بلاک دوطرفه
    const block = await prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: recipientId, blockedId: actorId },
          { blockerId: actorId, blockedId: recipientId },
        ],
      },
      select: { blockerId: true },
    });

    if (block) return null;

    // میوت شدن actor توسط گیرنده
    const isMuted = await prisma.mute.findUnique({
      where: {
        muterId_mutedId: {
          muterId: recipientId,
          mutedId: actorId,
        },
      },
      select: { muterId: true },
    });

    if (isMuted) return null;

    const actor = await prisma.user.findUnique({
      where: { id: actorId },
      select: { isPrivate: true },
    });

    if (!actor) return null;

    if (actor.isPrivate && PRIVATE_INTERACTION_TYPES.has(type)) {
      const follow = await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: recipientId,
            followingId: actorId,
          },
        },
        select: { status: true },
      });

      if (!follow || follow.status !== FollowStatus.ACCEPTED) {
        return null;
      }
    }

    // تنظیمات اعلان گیرنده
    const settings = await prisma.userSettings.findUnique({
      where: { userId: recipientId },
    });

    if (settings) {
      if (type === NotificationType.LIKE && !settings.notifyLikes) return null;
      if (type === NotificationType.REPOST && !settings.notifyReposts)
        return null;
      if (type === NotificationType.QUOTE && !settings.notifyQuotes)
        return null;
      if (type === NotificationType.REPLY && !settings.notifyReplies)
        return null;
      if (type === NotificationType.FOLLOW && !settings.notifyFollows)
        return null;
      if (type === NotificationType.MENTION && !settings.notifyMentions)
        return null;
      if (type === NotificationType.MESSAGE && !settings.notifyMessages)
        return null;
    }

    // LIKE و REPOST: اگر اعلان قبلی وجود دارد، همان را نگه دار یا احیا کن.
    if (
      postId &&
      (type === NotificationType.LIKE ||
        type === NotificationType.REPOST)
    ) {
      const existing = await prisma.notification.findFirst({
        where: {
          recipientId,
          actorId,
          postId,
          type,
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      });

      if (existing) {
        if (existing.deletedAt !== null) {
          return prisma.notification.update({
            where: { id: existing.id },
            data: {
              deletedAt: null,
              // createdAt و isRead را دست نمی‌زنیم؛
              // احیا نباید اعلان را دوباره به‌عنوان رویداد تازه نشان دهد.
            },
          });
        }

        return existing;
      }
    }

    return await prisma.notification.create({
      data: {
        type,
        recipientId,
        actorId,
        ...(postId ? { postId } : {}),
        ...(messageId ? { messageId } : {}),
        ...(reportId ? { reportId } : {}),
      },
    });
  } catch (error) {
    console.error(
      `[createNotification] Failed to create ${type} notification`,
      {
        recipientId,
        actorId,
        postId,
        messageId,
        reportId,
        error,
      },
    );

    return null;
  }
}
