"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import type { Prisma } from "@prisma/client";
import type { MessageCursor } from "@/lib/dm/types";
import { revalidatePath } from "next/cache";


async function requireCurrentUserId(): Promise<string> {
  const user = await getCurrentUser();

  if (!user || user.deletedAt) {
    throw new Error(
      "برای انجام این کار باید وارد حساب کاربری شوید.",
    );
  }

  return user.id;
}

function makeParticipantsKey(
  userAId: string,
  userBId: string,
): string {
  return [userAId, userBId].sort().join(":");
}

class BlockedConversationError extends Error {
  constructor() {
    super("به‌دلیل تنظیمات بلاک، این گفتگو در دسترس نیست.");
    this.name = "BlockedConversationError";
  }
}

async function assertNoBlock(
  db: Prisma.TransactionClient,
  userAId: string,
  userBId: string,
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
    throw new BlockedConversationError();
  }
}

async function canStartConversation(
  db: Prisma.TransactionClient,
  senderId: string,
  recipientId: string,
  permission: string,
): Promise<boolean> {
  if (permission === "EVERYONE") return true;
  if (permission === "NOBODY") return false;

  const [
    senderFollowsRecipient,
    recipientFollowsSender,
  ] = await Promise.all([
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
    return Boolean(
      senderFollowsRecipient && recipientFollowsSender,
    );
  }

  return false;
}

/**
 * شروع گفت‌وگوی دونفره یا بازکردن گفت‌وگوی موجود.
 * در بازکردن دوباره، deletedAt را نگه می‌داریم تا
 * پیام‌های قبل از حذف مجدداً نمایش داده نشوند.
 */
export async function startDirectConversation(
  targetUserId: string,
) {
  const senderId = await requireCurrentUserId();

  if (
    !targetUserId ||
    typeof targetUserId !== "string"
  ) {
    throw new Error("شناسهٔ کاربر مقصد معتبر نیست.");
  }

  if (senderId === targetUserId) {
    throw new Error(
      "نمی‌توانید با خودتان گفتگو شروع کنید.",
    );
  }

  const participantsKey = makeParticipantsKey(
    senderId,
    targetUserId,
  );

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
          // deletedAt عمداً تغییر نمی‌کند.
        },
      });

      return { conversationId: existing.id };
    }

    const permission =
      recipient.settings?.dmPermission ?? "EVERYONE";

    const allowed = await canStartConversation(
      tx,
      senderId,
      targetUserId,
      permission,
    );

    if (!allowed) {
      throw new Error(
        "این کاربر دریافت پیام از شما را مجاز نکرده است.",
      );
    }

    const conversation = await tx.conversation.create({
      data: {
        isGroup: false,
        participantsKey,
        participants: {
          create: [
            { userId: senderId },
            { userId: targetUserId },
          ],
        },
      },
      select: { id: true },
    });

    return { conversationId: conversation.id };
  });
}

/**
 * ذخیرهٔ پیام و برگرداندن همان رکورد برای نمایش و Broadcast.
 */
export async function sendDirectMessage(input: {
  conversationId: string;
  content?: string | null;
  mediaUrls?: string[];
}) {
  const senderId = await requireCurrentUserId();

  if (
    !input?.conversationId ||
    typeof input.conversationId !== "string"
  ) {
    throw new Error("شناسهٔ گفتگو معتبر نیست.");
  }

  const content =
    typeof input.content === "string"
      ? input.content.trim()
      : null;

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

  const membership =
    await prisma.userConversation.findUnique({
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

  if (
    membership.conversation.isGroup ||
    membership.conversation.participants.length !== 2
  ) {
    throw new Error(
      "این عملیات فعلاً فقط برای گفت‌وگوی دونفره فعال است.",
    );
  }

  const recipient =
    membership.conversation.participants.find(
      (participant) => participant.userId !== senderId,
    );

  if (!recipient || recipient.user.deletedAt) {
    throw new Error("کاربر مقصد در دسترس نیست.");
  }

  try {
    await assertNoBlock(
      prisma,
      senderId,
      recipient.userId,
    );
  } catch (error) {
    if (error instanceof BlockedConversationError) {
      return { status: "blocked" as const };
    }

    throw error;
  }

  const result = await prisma.$transaction(
    async (tx) => {
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

      // پیام تازه، گفتگو را برای هر دو طرف دوباره نمایان می‌کند؛
      // ولی مرز تاریخچهٔ هر کاربر باید حفظ شود.
      await tx.userConversation.updateMany({
        where: {
          conversationId: input.conversationId,
          userId: {
            in: [senderId, recipient.userId],
          },
          isDeleted: true,
        },
        data: {
          isDeleted: false,
          // deletedAt عمداً تغییر نمی‌کند.
        },
      });

      return {
        message,
        recipientId: recipient.userId,
        shouldNotify:
          recipient.user.settings?.notifyMessages ?? true,
      };
    },
    {
      maxWait: 10000,
      timeout: 20000,
    },
  );

  // خطای اعلان نباید ارسال پیام ذخیره‌شده را ناموفق جلوه دهد.
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
      console.error(
        "[DM] Notification creation failed:",
        error,
      );
    }
  }

  return {
    status: "sent" as const,
    message: result.message,
  };
}

/**
 * بازیابی پیام‌های جدیدتر از cursor، فقط در تاریخچهٔ
 * قابل مشاهدهٔ کاربر فعلی.
 */
export async function getMessagesSince(
  conversationId: string,
  cursor: MessageCursor | null = null,
) {
  const userId = await requireCurrentUserId();

  if (
    typeof conversationId !== "string" ||
    !conversationId
  ) {
    throw new Error("شناسهٔ گفتگو معتبر نیست.");
  }

  const membership =
    await prisma.userConversation.findUnique({
      where: {
        userId_conversationId: {
          userId,
          conversationId,
        },
      },
      select: {
        isDeleted: true,
        deletedAt: true,
      },
    });

  if (!membership || membership.isDeleted) {
    throw new Error("این گفتگو در دسترس نیست.");
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
      throw new Error(
        "تاریخ نشانگر پیام معتبر نیست.",
      );
    }
  }

  const rows = await prisma.message.findMany({
    where: {
      conversationId,
      deletedAt: null,
      ...(membership.deletedAt
        ? {
            createdAt: {
              gt: membership.deletedAt,
            },
          }
        : {}),
      ...(cursorDate && cursor
        ? {
            OR: [
              {
                createdAt: {
                  gt: cursorDate,
                },
              },
              {
                createdAt: cursorDate,
                id: { gt: cursor.id },
              },
            ],
          }
        : {}),
    },
    orderBy: [
      { createdAt: "asc" },
      { id: "asc" },
    ],
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
  const messages = hasMore
    ? rows.slice(0, 200)
    : rows;
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
 * نشانه‌گذاری گفت‌وگوی قابل مشاهده به‌عنوان خوانده‌شده.
 * این تابع نباید گفت‌وگوی حذف‌شده را بازگرداند.
 */
export async function markConversationAsRead(
  conversationId: string,
) {
  const userId = await requireCurrentUserId();

  if (
    !conversationId ||
    typeof conversationId !== "string"
  ) {
    throw new Error("شناسهٔ گفتگو معتبر نیست.");
  }

  const lastReadAt = new Date();

  const result =
    await prisma.userConversation.updateMany({
      where: {
        userId,
        conversationId,
        isDeleted: false,
      },
      data: {
        lastReadAt,
      },
    });

  if (result.count === 0) {
    throw new Error("این گفتگو در دسترس نیست.");
  }

  return { success: true, lastReadAt };
}

/**
 * دریافت فهرست گفتگوهای کاربر جاری.
 */
export async function getConversations() {
  const userId = await requireCurrentUserId();

  const userConversations =
    await prisma.userConversation.findMany({
      where: {
        userId,
        isDeleted: false,
      },
      select: {
        conversationId: true,
        lastReadAt: true,
        deletedAt: true,
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
              orderBy: [
                { createdAt: "desc" },
                { id: "desc" },
              ],
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
    const otherParticipant =
      uc.conversation.participants[0]?.user ?? null;

    const latestStoredMessage =
      uc.conversation.messages[0] ?? null;

    // چون جدیدترین پیام را می‌گیریم، اگر همان پیام قبل از
    // مرز حذف باشد، هیچ پیام قابل‌نمایش جدیدتری وجود ندارد.
    const lastMessage =
      latestStoredMessage &&
      (!uc.deletedAt ||
        latestStoredMessage.createdAt > uc.deletedAt)
        ? latestStoredMessage
        : null;

    const hasUnread = Boolean(
      lastMessage &&
        lastMessage.senderId !== userId &&
        (!uc.lastReadAt ||
          uc.lastReadAt < lastMessage.createdAt),
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
 * دریافت جزئیات و تاریخچهٔ قابل مشاهدهٔ گفتگو.
 */
export async function getConversationDetails(
  conversationId: string,
) {
  const currentUser = await getCurrentUser();

  if (
    !currentUser ||
    currentUser.deletedAt ||
    typeof conversationId !== "string" ||
    !conversationId
  ) {
    return null;
  }

  const membership =
    await prisma.userConversation.findUnique({
      where: {
        userId_conversationId: {
          userId: currentUser.id,
          conversationId,
        },
      },
      select: {
        isDeleted: true,
        deletedAt: true,
      },
    });

  if (!membership || membership.isDeleted) {
    return null;
  }

  const currentUserSettings =
    await prisma.userSettings.findUnique({
      where: { userId: currentUser.id },
      select: {
        showReadReceipts: true,
      },
    });

  const myReadReceiptsEnabled =
    currentUserSettings?.showReadReceipts ?? true;

  const conversation =
    await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        // حذف طرف مقابل نباید باعث ناپدیدشدن اطلاعات
        // او یا خراب‌شدن منطق seen برای کاربر جاری شود.
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                fullName: true,
                avatarUrl: true,
                settings: {
                  select: {
                    showReadReceipts: true,
                  },
                },
              },
            },
          },
        },
        messages: {
          where: {
            deletedAt: null,
            ...(membership.deletedAt
              ? {
                  createdAt: {
                    gt: membership.deletedAt,
                  },
                }
              : {}),
          },
          orderBy: [
            { createdAt: "asc" },
            { id: "asc" },
          ],
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

  const otherParticipant =
    conversation.participants.find(
      (participant) =>
        participant.userId !== currentUser.id,
    );

  const otherReadReceiptsEnabled =
    otherParticipant?.user.settings
      ?.showReadReceipts ?? true;

  const shouldShowSeen =
    myReadReceiptsEnabled &&
    otherReadReceiptsEnabled;

  const otherLastReadAt = shouldShowSeen
    ? otherParticipant?.lastReadAt
    : null;

  const messagesWithSeen =
    conversation.messages.map((msg) => {
      const isMine =
        msg.senderId === currentUser.id;

      const isSeen = Boolean(
        isMine &&
          otherLastReadAt &&
          msg.createdAt <= otherLastReadAt,
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
 * حذف سراسری یک پیام توسط ارسال‌کننده.
 * این تابع «Delete for me» نیست؛ وضعیت پیام برای
 * هر دو طرف تغییر می‌کند، مطابق رفتار کد موجود.
 */
export async function deleteDirectMessage(
  messageId: string,
) {
  const userId = await requireCurrentUserId();

  if (
    !messageId ||
    typeof messageId !== "string"
  ) {
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
      throw new Error(
        "پیام یافت نشد یا پیش‌تر حذف شده است.",
      );
    }

    if (message.senderId !== userId) {
      throw new Error(
        "شما فقط مجاز به حذف پیام‌های ارسالی خودتان هستید.",
      );
    }

    const updatedMessage =
      await tx.message.update({
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
 * مخفی‌سازی گفتگو فقط برای کاربر جاری.
 * Conversation و Message دست‌نخورده باقی می‌مانند.
 */

export async function deleteConversation(
  conversationId: string,
) {
  const userId = await requireCurrentUserId();

  if (
    !conversationId ||
    typeof conversationId !== "string"
  ) {
    throw new Error("شناسهٔ گفتگو نامعتبر است.");
  }

  const membership =
    await prisma.userConversation.findUnique({
      where: {
        userId_conversationId: {
          userId,
          conversationId,
        },
      },
      select: {
        isDeleted: true,
      },
    });

  if (!membership) {
    throw new Error("این گفتگو در دسترس نیست.");
  }

  if (!membership.isDeleted) {
    const deletedAt = new Date();

    await prisma.userConversation.updateMany({
      where: {
        userId,
        conversationId,
        isDeleted: false,
      },
      data: {
        isDeleted: true,
        deletedAt,
        lastReadAt: deletedAt,
      },
    });
  }

  // دادهٔ فهرست در messages/layout.tsx دوباره خوانده شود.
  revalidatePath("/[locale]/messages", "layout");

  return {
    success: true,
    conversationId,
  };
}


export async function toggleReadReceipts(
  enabled: boolean,
) {
  const userId = await requireCurrentUserId();

  await prisma.userSettings.upsert({
    where: { userId },
    update: {
      showReadReceipts: enabled,
    },
    create: {
      userId,
      showReadReceipts: enabled,
    },
  });

  return { success: true };
}

export async function getConversationBlockStatus(
  conversationId: string,
) {
  const userId = await requireCurrentUserId();

  if (
    !conversationId ||
    typeof conversationId !== "string"
  ) {
    throw new Error("شناسهٔ گفتگو معتبر نیست.");
  }

  const membership =
    await prisma.userConversation.findUnique({
      where: {
        userId_conversationId: {
          userId,
          conversationId,
        },
      },
      select: {
        isDeleted: true,
        conversation: {
          select: {
            isGroup: true,
            // وضعیت حذف طرف مقابل نباید مانع بررسی بلاک شود.
            participants: {
              select: {
                userId: true,
              },
            },
          },
        },
      },
    });

  if (!membership || membership.isDeleted) {
    throw new Error("این گفتگو در دسترس نیست.");
  }

  const participants =
    membership.conversation.participants;

  if (
    membership.conversation.isGroup ||
    participants.length !== 2
  ) {
    throw new Error(
      "این بررسی فقط برای گفتگوی دونفره است.",
    );
  }

  const recipient = participants.find(
    (participant) =>
      participant.userId !== userId,
  );

  if (!recipient) {
    throw new Error("کاربر مقصد پیدا نشد.");
  }

  const block = await prisma.block.findFirst({
    where: {
      OR: [
        {
          blockerId: userId,
          blockedId: recipient.userId,
        },
        {
          blockerId: recipient.userId,
          blockedId: userId,
        },
      ],
    },
    select: {
      blockerId: true,
    },
  });

  return { blocked: Boolean(block) };
}
