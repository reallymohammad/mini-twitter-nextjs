// lib/notifications/service.ts
import { prisma } from "@/lib/prisma";
import { FollowStatus, NotificationType } from "@prisma/client";

interface CreateNotificationParams {
  type: NotificationType;
  recipientId: string;
  actorId: string;
  postId?: string | null;
  messageId?: string | null;
  reportId?: string | null;
}

// انواع تعاملی که در صورت پرایوت بودن کاربر، نباید برای غیرفالوئرها ارسال شوند
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
  // ۱. اعلان برای تعامل کاربر با خودش نباید ثبت شود
  if (!recipientId || !actorId || recipientId === actorId) {
    return null;
  }

  try {
    // ۲. بررسی مسدودیت (Block دوطرفه)
    const block = await prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: recipientId, blockedId: actorId },
          { blockerId: actorId, blockedId: recipientId },
        ],
      },
      select: { blockerId: true },
    });

    if (block) {
      return null;
    }

    // ۳. بررسی میوت (اگر گیرنده، این کاربر را میوت کرده باشد هیچ اعلانی نمی‌گیرد)
    const isMuted = await prisma.mute.findUnique({
      where: {
        muterId_mutedId: {
          muterId: recipientId,
          mutedId: actorId,
        },
      },
      select: { muterId: true },
    });

    if (isMuted) {
      return null;
    }

    // ۴. بررسی پرایوت بودن اکانت کنش‌گر (actor)
    const actor = await prisma.user.findUnique({
      where: { id: actorId },
      select: { isPrivate: true },
    });

    if (!actor) {
      return null;
    }

    // اگر اکانت actor پرایوت باشد و تعامل محتوایی باشد، گیرنده حتماً باید فالوئر تاییدشدهٔ او باشد
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

    // ۵. بررسی تنظیمات نوتیفیکیشن گیرنده (UserSettings)
    const settings = await prisma.userSettings.findUnique({
      where: { userId: recipientId },
    });

    if (settings) {
      if (type === NotificationType.LIKE && settings.notifyLikes === false) return null;
      if (type === NotificationType.REPOST && settings.notifyReposts === false) return null;
      if (type === NotificationType.QUOTE && settings.notifyQuotes === false) return null;
      if (type === NotificationType.REPLY && settings.notifyReplies === false) return null;
      if (type === NotificationType.FOLLOW && settings.notifyFollows === false) return null;
      if (type === NotificationType.MENTION && settings.notifyMentions === false) return null;
      if (type === NotificationType.MESSAGE && settings.notifyMessages === false) return null;
    }

    // ۶. جلوگیری از نوتیفیکیشن‌های تکراری برای LIKE و REPOST روی یک پست
    if (
      postId &&
      (type === NotificationType.LIKE || type === NotificationType.REPOST)
    ) {
      const existing = await prisma.notification.findFirst({
        where: {
          recipientId,
          actorId,
          postId,
          type,
        },
      });

      if (existing) {
        if (existing.isRead) {
          return await prisma.notification.update({
            where: { id: existing.id },
            data: {
              isRead: false,
              createdAt: new Date(),
            },
          });
        }
        return existing;
      }
    }

    // ۷. ساخت و ذخیره اعلان در دیتابیس
    const notification = await prisma.notification.create({
      data: {
        type,
        recipientId,
        actorId,
        ...(postId ? { postId } : {}),
        ...(messageId ? { messageId } : {}),
        ...(reportId ? { reportId } : {}),
      },
    });

    return notification;
  } catch (error) {
    console.error(`[createNotification] Failed to create ${type} notification`, {
      recipientId,
      actorId,
      postId,
      messageId,
      reportId,
      error,
    });
    return null;
  }
}
