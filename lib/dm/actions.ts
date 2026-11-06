"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import type { Prisma } from "@prisma/client";
import type { MessageCursor } from "@/lib/dm/types";

async function requireCurrentUserId(): Promise<string> {
  const user = await getCurrentUser();

  if (!user || user.deletedAt) {
    throw new Error("برای انجام این کار باید وارد حساب کاربری شوید.");
  }

  return user.id;
}

function makeParticipantsKey(userAId: string, userBId: string): string {
  return [userAId, userBId].sort().join(":");
}

async function assertNoBlock(
  db: Prisma.TransactionClient,
  userAId: string,
  userBId: string
): Promise<void> {
  const block = await db.block.findFirst({
    where: {
      OR: [
        { blockerId: userAId, blockedId: userBId },
        { blockerId: userBId, blockedId: userAId },
      ],
    },
    select: { blockerId: true },
  });

  if (block) {
    throw new Error("به‌دلیل تنظیمات بلاک، این گفتگو در دسترس نیست.");
  }
}

async function canStartConversation(
  db: Prisma.TransactionClient,
  senderId: string,
  recipientId: string,
  permission: string
): Promise<boolean> {
  if (permission === "EVERYONE") return true;
  if (permission === "NOBODY") return false;

  const [senderFollowsRecipient, recipientFollowsSender] = await Promise.all([
    db.follow.findFirst({
      where: {
        followerId: senderId,
        followingId: recipientId,
        status: "ACCEPTED",
      },
      select: { followerId: true },
    }),
    db.follow.findFirst({
      where: {
        followerId: recipientId,
        followingId: senderId,
        status: "ACCEPTED",
      },
      select: { followerId: true },
    }),
  ]);

  if (permission === "FOLLOWERS") {
    return Boolean(senderFollowsRecipient);
  }

  if (permission === "FOLLOWING") {
    return Boolean(recipientFollowsSender);
  }

  if (permission === "MUTUALS") {
    return Boolean(senderFollowsRecipient && recipientFollowsSender);
  }

  return false;
}

/**
 * شروع گفت‌وگوی دونفره یا بازگرداندن گفت‌وگوی موجود
 */
export async function startDirectConversation(targetUserId: string) {
  const senderId = await requireCurrentUserId();

  if (!targetUserId || typeof targetUserId !== "string") {
    throw new Error("شناسهٔ کاربر مقصد معتبر نیست.");
  }

  if (senderId === targetUserId) {
    throw new Error("نمی‌توانید با خودتان گفتگو شروع کنید.");
  }

  const participantsKey = makeParticipantsKey(senderId, targetUserId);

  return prisma.$transaction(async (tx) => {
    const recipient = await tx.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        deletedAt: true,
        settings: {
          select: { dmPermission: true },
        },
      },
    });

    if (!recipient || recipient.deletedAt) {
      throw new Error("این کاربر پیدا نشد.");
    }

    await assertNoBlock(tx, senderId, targetUserId);

    const existing = await tx.conversation.findUnique({
      where: { participantsKey },
      select: { id: true },
    });

    if (existing) {
      await tx.userConversation.upsert({
        where: {
          userId_conversationId: {
            userId: senderId,
            conversationId: existing.id,
          },
        },
        create: {
          userId: senderId,
          conversationId: existing.id,
          isDeleted: false,
          deletedAt: null,
        },
        update: {
          isDeleted: false,
          deletedAt: null,
        },
      });

      return { conversationId: existing.id };
    }

    const permission = recipient.settings?.dmPermission ?? "EVERYONE";
    const allowed = await canStartConversation(
      tx,
      senderId,
      targetUserId,
      permission
    );

    if (!allowed) {
      throw new Error("این کاربر دریافت پیام از شما را مجاز نکرده است.");
    }

    const conversation = await tx.conversation.create({
      data: {
        isGroup: false,
        participantsKey,
        participants: {
          create: [{ userId: senderId }, { userId: targetUserId }],
        },
      },
      select: { id: true },
    });

    return { conversationId: conversation.id };
  });
}

/**
 * ذخیرهٔ پیام و برگرداندن همان رکورد برای نمایش و Broadcast
 */
export async function sendDirectMessage(input: {
  conversationId: string;
  content?: string | null;
  mediaUrls?: string[];
}) {
  const senderId = await requireCurrentUserId();

  if (
    !input ||
    typeof input.conversationId !== "string" ||
    !input.conversationId
  ) {
    throw new Error("شناسهٔ گفتگو معتبر نیست.");
  }

  const content =
    typeof input.content === "string" ? input.content.trim() : null;
  const mediaUrls = input.mediaUrls ?? [];

  if (
    !Array.isArray(mediaUrls) ||
    mediaUrls.some((url) => typeof url !== "string")
  ) {
    throw new Error("فهرست فایل‌های پیوست معتبر نیست.");
  }

  if (!content && mediaUrls.length === 0) {
    throw new Error("متن یا فایل پیوست برای پیام لازم است.");
  }

  const result = await prisma.$transaction(
    async (tx) => {
      const membership = await tx.userConversation.findUnique({
        where: {
          userId_conversationId: {
            userId: senderId,
            conversationId: input.conversationId,
          },
        },
        select: {
          conversation: {
            select: {
              isGroup: true,
              participants: {
                select: {
                  userId: true,
                  user: {
                    select: {
                      deletedAt: true,
                      settings: {
                        select: { notifyMessages: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!membership) {
        throw new Error("شما عضو این گفتگو نیستید.");
      }

      const conversation = membership.conversation;

      if (conversation.isGroup || conversation.participants.length !== 2) {
        throw new Error(
          "این عملیات فعلاً فقط برای گفت‌وگوی دونفره فعال است."
        );
      }

      const recipient = conversation.participants.find(
        (participant) => participant.userId !== senderId
      );

      if (!recipient || recipient.user.deletedAt) {
        throw new Error("کاربر مقصد در دسترس نیست.");
      }

      await assertNoBlock(tx, senderId, recipient.userId);

      const message = await tx.message.create({
        data: {
          conversationId: input.conversationId,
          senderId,
          content,
          mediaUrls,
        },
        select: {
          id: true,
          conversationId: true,
          senderId: true,
          content: true,
          mediaUrls: true,
          createdAt: true,
        },
      });

      await tx.userConversation.updateMany({
        where: {
          conversationId: input.conversationId,
          userId: { in: [senderId, recipient.userId] },
        },
        data: {
          isDeleted: false,
          deletedAt: null,
        },
      });

      return {
        message,
        recipientId: recipient.userId,
        shouldNotify: recipient.user.settings?.notifyMessages ?? true,
      };
    },
    {
      maxWait: 10000,
      timeout: 20000,
    }
  );

  // خطای اعلان نباید ارسال پیامِ ذخیره‌شده را ناموفق جلوه دهد.
  if (result.shouldNotify) {
    try {
      await prisma.notification.create({
        data: {
          type: "MESSAGE",
          recipientId: result.recipientId,
          actorId: senderId,
          messageId: result.message.id,
        },
      });
    } catch (error) {
      console.error("[DM] Notification creation failed:", error);
    }
  }

  return result.message;
}

/**
 * بازیابی پیام‌های بعد از یک موقعیت مشخص.
 * cursor فقط با نتایج همین تابع جلو می‌رود، نه با Broadcastهای دریافتی.
 */
export async function getMessagesSince(
  conversationId: string,
  cursor: MessageCursor | null = null
) {
  const userId = await requireCurrentUserId();

  if (typeof conversationId !== "string" || !conversationId) {
    throw new Error("شناسهٔ گفتگو معتبر نیست.");
  }

  const membership = await prisma.userConversation.findUnique({
    where: {
      userId_conversationId: { userId, conversationId },
    },
    select: { userId: true },
  });

  if (!membership) {
    throw new Error("شما عضو این گفتگو نیستید.");
  }

  let cursorDate: Date | null = null;

  if (cursor !== null) {
    if (
      !cursor ||
      typeof cursor.id !== "string" ||
      !cursor.id ||
      typeof cursor.createdAt !== "string"
    ) {
      throw new Error("نشانگر پیام معتبر نیست.");
    }

    cursorDate = new Date(cursor.createdAt);

    if (Number.isNaN(cursorDate.getTime())) {
      throw new Error("تاریخ نشانگر پیام معتبر نیست.");
    }
  }

  const rows = await prisma.message.findMany({
    where: {
      conversationId,
      deletedAt: null,
      ...(cursorDate && cursor
        ? {
            OR: [
              { createdAt: { gt: cursorDate } },
              {
                createdAt: cursorDate,
                id: { gt: cursor.id },
              },
            ],
          }
        : {}),
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: 201,
    select: {
      id: true,
      conversationId: true,
      senderId: true,
      content: true,
      mediaUrls: true,
      createdAt: true,
    },
  });

  const hasMore = rows.length > 200;
  const messages = hasMore ? rows.slice(0, 200) : rows;
  const last = messages.at(-1);

  return {
    messages,
    hasMore,
    nextCursor: last
      ? {
          createdAt: last.createdAt.toISOString(),
          id: last.id,
        }
      : cursor,
  };
}

/**
 * نشانه‌گذاری پیام‌های گفتگو به‌عنوان خوانده‌شده
 */
export async function markConversationAsRead(conversationId: string) {
  const userId = await requireCurrentUserId();

  if (!conversationId) {
    throw new Error("شناسهٔ گفتگو معتبر نیست.");
  }

  const membership = await prisma.userConversation.findUnique({
    where: {
      userId_conversationId: { userId, conversationId },
    },
    select: { userId: true },
  });

  if (!membership) {
    throw new Error("شما عضو این گفتگو نیستید.");
  }

  const lastReadAt = new Date();

  await prisma.userConversation.update({
    where: {
      userId_conversationId: { userId, conversationId },
    },
    data: {
      lastReadAt,
      isDeleted: false,
      deletedAt: null,
    },
  });

  return { success: true, lastReadAt };
}

/**
 * دریافت فهرست گفتگوهای کاربر جاری
 */
export async function getConversations() {
  const userId = await requireCurrentUserId();

  const userConversations = await prisma.userConversation.findMany({
    where: {
      userId,
      isDeleted: false,
    },
    select: {
      conversationId: true,
      lastReadAt: true,
      conversation: {
        select: {
          id: true,
          createdAt: true,
          participants: {
            where: {
              userId: { not: userId },
            },
            select: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  username: true,
                  avatarUrl: true,
                  badge: true,
                },
              },
            },
          },
          messages: {
            where: { deletedAt: null },
            take: 1,
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              content: true,
              mediaUrls: true,
              createdAt: true,
              senderId: true,
            },
          },
        },
      },
    },
    orderBy: {
      conversation: {
        createdAt: "desc",
      },
    },
  });

  return userConversations.map((uc) => {
    const otherParticipant = uc.conversation.participants[0]?.user ?? null;
    const lastMessage = uc.conversation.messages[0] ?? null;
    const hasUnread = Boolean(
      lastMessage &&
        lastMessage.senderId !== userId &&
        (!uc.lastReadAt ||
          new Date(uc.lastReadAt) < new Date(lastMessage.createdAt))
    );

    return {
      id: uc.conversationId,
      user: otherParticipant
        ? {
            id: otherParticipant.id,
            name: otherParticipant.fullName,
            username: otherParticipant.username,
            image: otherParticipant.avatarUrl,
            badge: otherParticipant.badge,
          }
        : null,
      lastMessage,
      hasUnread,
      createdAt: uc.conversation.createdAt,
    };
  });
}

/**
 * دریافت جزئیات و تاریخچهٔ پیام‌های یک گفتگوی معین
 */
export async function getConversationDetails(conversationId: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.deletedAt) return null;

  const membership = await prisma.userConversation.findUnique({
    where: {
      userId_conversationId: {
        userId: currentUser.id,
        conversationId,
      },
    },
    select: { userId: true },
  });

  if (!membership) return null;

  const currentUserSettings = await prisma.userSettings.findUnique({
    where: { userId: currentUser.id },
    select: { showReadReceipts: true },
  });
  const myReadReceiptsEnabled =
    currentUserSettings?.showReadReceipts ?? true;

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      participants: {
        where: { isDeleted: false },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              fullName: true,
              avatarUrl: true,
              settings: {
                select: { showReadReceipts: true },
              },
            },
          },
        },
      },
      messages: {
        where: { deletedAt: null },
        orderBy: { createdAt: "asc" },
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              fullName: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
  });

  if (!conversation) return null;

  const otherParticipant = conversation.participants.find(
    (participant) => participant.userId !== currentUser.id
  );

  const otherReadReceiptsEnabled =
    otherParticipant?.user?.settings?.showReadReceipts ?? true;

  const shouldShowSeen =
    myReadReceiptsEnabled && otherReadReceiptsEnabled;
  const otherLastReadAt = shouldShowSeen
    ? otherParticipant?.lastReadAt
    : null;

  const messagesWithSeen = conversation.messages.map((msg) => {
    const isMine = msg.senderId === currentUser.id;
    const isSeen = Boolean(
      isMine &&
        otherLastReadAt &&
        new Date(msg.createdAt) <= new Date(otherLastReadAt)
    );

    return { ...msg, isSeen };
  });

  return {
    ...conversation,
    otherUser: otherParticipant?.user ?? null,
    messages: messagesWithSeen,
  };
}

/**
 * حذف یک پیام مشخص توسط ارسال‌کننده (Soft Delete)
 */
export async function deleteDirectMessage(messageId: string) {
  const userId = await requireCurrentUserId();

  if (!messageId || typeof messageId !== "string") {
    throw new Error("شناسهٔ پیام نامعتبر است.");
  }

  return prisma.$transaction(async (tx) => {
    const message = await tx.message.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        senderId: true,
        deletedAt: true,
        conversationId: true,
      },
    });

    if (!message || message.deletedAt) {
      throw new Error("پیام یافت نشد یا پیش‌تر حذف شده است.");
    }

    if (message.senderId !== userId) {
      throw new Error(
        "شما فقط مجاز به حذف پیام‌های ارسالی خودتان هستید."
      );
    }

    const updatedMessage = await tx.message.update({
      where: { id: messageId },
      data: {
        deletedAt: new Date(),
        content: null,
        mediaUrls: [],
      },
      select: {
        id: true,
        conversationId: true,
        deletedAt: true,
      },
    });

    await tx.notification.deleteMany({
      where: { messageId },
    });

    return updatedMessage;
  });
}

/**
 * حذف/مخفی‌سازی گفت‌وگو برای کاربر جاری
 */
export async function deleteConversation(conversationId: string) {
  const userId = await requireCurrentUserId();

  if (!conversationId || typeof conversationId !== "string") {
    throw new Error("شناسهٔ گفتگو نامعتبر است.");
  }

  const membership = await prisma.userConversation.findUnique({
    where: {
      userId_conversationId: { userId, conversationId },
    },
    select: { userId: true },
  });

  if (!membership) {
    throw new Error("شما عضو این گفتگو نیستید.");
  }

  await prisma.userConversation.update({
    where: {
      userId_conversationId: { userId, conversationId },
    },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
    },
  });

  return { success: true, conversationId };
}

export async function toggleReadReceipts(enabled: boolean) {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error("Unauthorized");

  await prisma.userSettings.upsert({
    where: { userId: currentUser.id },
    update: { showReadReceipts: enabled },
    create: {
      userId: currentUser.id,
      showReadReceipts: enabled,
    },
  });

  return { success: true };
}
