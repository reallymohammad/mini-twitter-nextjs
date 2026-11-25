import { prisma } from "@/lib/prisma";
import { NotificationType } from "@prisma/client";

interface CreateNotificationParams {
  type: NotificationType;
  recipientId: string;
  actorId: string;
  postId?: string | null;
  messageId?: string | null;
}

export async function createNotification({
  type,
  recipientId,
  actorId,
  postId,
  messageId,
}: CreateNotificationParams) {
  // ۱. اعلان برای تعامل با خود کاربر نباید ساخته شود
  if (!recipientId || !actorId || recipientId === actorId) {
    return null;
  }

  try {
    // ۲. بررسی مسدودیت (Block)
    // نکته: جدول Block کلید ترکیبی دارد و فیلد id ندارد
    const block = await prisma.block.findFirst({
      where: {
        OR: [
          {
            blockerId: recipientId,
            blockedId: actorId,
          },
          {
            blockerId: actorId,
            blockedId: recipientId,
          },
        ],
      },
      select: {
        blockerId: true,
        blockedId: true,
      },
    });

    if (block) {
      return null;
    }

    // ۳. بررسی تنظیمات اعلان گیرنده
    const settings = await prisma.userSettings.findUnique({
      where: {
        userId: recipientId,
      },
    });

    if (settings) {
      if (
        type === NotificationType.LIKE &&
        settings.notifyLikes === false
      ) {
        return null;
      }

      if (
        type === NotificationType.REPLY &&
        settings.notifyReplies === false
      ) {
        return null;
      }

      if (
        type === NotificationType.FOLLOW &&
        settings.notifyFollows === false
      ) {
        return null;
      }

      if (
        type === NotificationType.MENTION &&
        settings.notifyMentions === false
      ) {
        return null;
      }

      if (
        type === NotificationType.MESSAGE &&
        settings.notifyMessages === false
      ) {
        return null;
      }
    }

    // ۴. جلوگیری از ساخت نوتیفیکیشن‌های تکراری برای لایک و ری‌پست
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
        // اگر قبلاً خوانده شده بود، دوباره به حالت خوانده‌نشده برگردد
        if (existing.isRead) {
          return await prisma.notification.update({
            where: {
              id: existing.id,
            },
            data: {
              isRead: false,
              createdAt: new Date(),
            },
          });
        }

        return existing;
      }
    }

    // ۵. ثبت در دیتابیس
    const notification = await prisma.notification.create({
      data: {
        type,
        recipientId,
        actorId,
        ...(postId ? { postId } : {}),
        ...(messageId ? { messageId } : {}),
      },
    });

    console.log("[NOTIFICATION_CREATED]", {
      id: notification.id,
      type,
      recipientId,
      actorId,
      postId,
    });

    return notification;
  } catch (error) {
    console.error(
      `[createNotification] Failed to create ${type} notification`,
      {
        recipientId,
        actorId,
        postId,
        messageId,
        error,
      }
    );

    return null;
  }
}
