// ib/dm/actions/dm/messages.ts
"use server";

import { prisma } from "@/lib/prisma";
import type { MessageCursor } from "@/lib/dm/types";
import { revalidatePath } from "next/cache";
import {
  requireCurrentUserId,
  assertNoBlock,
  BlockedConversationError,
} from "./helpers";

export async function sendDirectMessage(input: {
  conversationId: string;
  content?: string | null;
  mediaUrls?: string[];
  replyToId?: string | null;
}) {
  const senderId = await requireCurrentUserId();

  if (!input?.conversationId || typeof input.conversationId !== "string") {
    throw new Error("شناسهٔ گفتگو معتبر نیست.");
  }

  const content = typeof input.content === "string" ? input.content.trim() : null;
  const mediaUrls = input.mediaUrls ?? [];

  if (!Array.isArray(mediaUrls) || mediaUrls.some((url) => typeof url !== "string")) {
    throw new Error("فهرست فایل‌های پیوست معتبر نیست.");
  }

  if (!content && mediaUrls.length === 0) {
    throw new Error("متن یا فایل پیوست برای پیام لازم است.");
  }

  const membership = await prisma.userConversation.findUnique({
    where: {
      userId_conversationId: { userId: senderId, conversationId: input.conversationId },
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
                  settings: { select: { notifyMessages: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!membership) throw new Error("شما عضو این گفتگو نیستید.");

  if (membership.conversation.isGroup || membership.conversation.participants.length !== 2) {
    throw new Error("این عملیات فعلاً فقط برای گفت‌وگوی دونفره فعال است.");
  }

  const recipient = membership.conversation.participants.find(
    (participant) => participant.userId !== senderId,
  );

  if (!recipient || recipient.user.deletedAt) {
    throw new Error("کاربر مقصد در دسترس نیست.");
  }

  try {
    await assertNoBlock(prisma, senderId, recipient.userId);
  } catch (error) {
    if (error instanceof BlockedConversationError) {
      return { status: "blocked" as const };
    }
    throw error;
  }

  let validReplyToId: string | null = null;
  if (typeof input.replyToId === "string" && input.replyToId.trim()) {
    const parentMsg = await prisma.message.findFirst({
      where: {
        id: input.replyToId,
        conversationId: input.conversationId,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (parentMsg) validReplyToId = parentMsg.id;
  }

  const result = await prisma.$transaction(
    async (tx) => {
      const message = await tx.message.create({
        data: {
          conversationId: input.conversationId,
          senderId,
          content,
          mediaUrls,
          replyToId: validReplyToId,
        },
        include: {
          sender: {
            select: { id: true, username: true, fullName: true, avatarUrl: true },
          },
          replyTo: {
            select: {
              id: true,
              content: true,
              mediaUrls: true,
              senderId: true,
              deletedAt: true,
              sender: { select: { id: true, username: true, fullName: true } },
            },
          },
          reactions: {
  select: {
    userId: true,
    emoji: true,
  },
},

        },
      });

      await tx.userConversation.updateMany({
        where: {
          conversationId: input.conversationId,
          userId: { in: [senderId, recipient.userId] },
          isDeleted: true,
        },
        data: { isDeleted: false },
      });

      return {
        message,
        recipientId: recipient.userId,
        shouldNotify: recipient.user.settings?.notifyMessages ?? true,
      };
    },
    { maxWait: 10000, timeout: 20000 },
  );

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

  return { status: "sent" as const, message: result.message };
}

export async function getMessagesSince(
  conversationId: string,
  cursor: MessageCursor | null = null,
) {
  const userId = await requireCurrentUserId();

  if (typeof conversationId !== "string" || !conversationId) {
    throw new Error("شناسهٔ گفتگو معتبر نیست.");
  }

  const membership = await prisma.userConversation.findUnique({
    where: {
      userId_conversationId: { userId, conversationId },
    },
    select: { isDeleted: true, deletedAt: true },
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
      throw new Error("تاریخ نشانگر پیام معتبر نیست.");
    }
  }

  const rows = await prisma.message.findMany({
    where: {
      conversationId,
      deletedAt: null,
      userDeletions: { none: { userId } },
      ...(membership.deletedAt ? { createdAt: { gt: membership.deletedAt } } : {}),
      ...(cursorDate && cursor
        ? {
            OR: [
              { createdAt: { gt: cursorDate } },
              { createdAt: cursorDate, id: { gt: cursor.id } },
            ],
          }
        : {}),
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: 201,
    include: {
      sender: {
        select: { id: true, username: true, fullName: true, avatarUrl: true },
      },
      replyTo: {
        select: {
          id: true,
          content: true,
          mediaUrls: true,
          senderId: true,
          deletedAt: true,
          sender: { select: { id: true, username: true, fullName: true } },
        },
      },
      reactions: {
  select: {
    userId: true,
    emoji: true,
  },
},

    },
  });

  const hasMore = rows.length > 200;
  const messages = hasMore ? rows.slice(0, 200) : rows;
  const last = messages.at(-1);

  return {
    messages,
    hasMore,
    nextCursor: last
      ? { createdAt: last.createdAt.toISOString(), id: last.id }
      : cursor,
  };
}

export async function deleteDirectMessage(messageId: string) {
  const userId = await requireCurrentUserId();

  if (typeof messageId !== "string" || !messageId) {
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
      throw new Error("شما فقط مجاز به حذف پیام‌های ارسالی خودتان هستید.");
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

    await tx.notification.deleteMany({ where: { messageId } });

    await tx.$queryRaw<{ emitted: boolean }[]>`
      SELECT realtime.send(
        payload => jsonb_build_object(
          'conversationId', ${updatedMessage.conversationId}::text,
          'messageId', ${updatedMessage.id}::text
        ),
        event => 'message_deleted',
        topic => ${`dm:${updatedMessage.conversationId}`}::text,
        private => false
      ) IS NULL AS emitted
    `;

    return updatedMessage;
  });
}

export async function deleteMessageForMe(messageId: string) {
  if (typeof messageId !== "string" || !messageId.trim()) {
    throw new Error("شناسهٔ پیام نامعتبر است.");
  }

  const userId = await requireCurrentUserId();

  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: {
      id: true,
      conversationId: true,
      createdAt: true,
      deletedAt: true,
    },
  });

  if (!message || message.deletedAt) {
    throw new Error("پیام پیدا نشد یا قبلاً حذف شده است.");
  }

  const membership = await prisma.userConversation.findUnique({
    where: {
      userId_conversationId: { userId, conversationId: message.conversationId },
    },
    select: { isDeleted: true, deletedAt: true },
  });

  if (!membership || membership.isDeleted) {
    throw new Error("این گفتگو در دسترس نیست.");
  }

  if (membership.deletedAt && message.createdAt <= membership.deletedAt) {
    throw new Error("این پیام در دسترس نیست.");
  }

  await prisma.messageDeletion.upsert({
    where: { userId_messageId: { userId, messageId } },
    create: { userId, messageId },
    update: {},
  });

  revalidatePath("/[locale]/messages", "layout");
  return { success: true, messageId };
}

export async function deleteSelectedMessages(
  messageIds: string[],
  scope: "me" | "everyone"
): Promise<{
  deletedIds: string[];
  failedIds: string[];
}> {
  await requireCurrentUserId();

  if (scope !== "me" && scope !== "everyone") {
    throw new Error("نوع حذف نامعتبر است.");
  }

  if (
    !Array.isArray(messageIds) ||
    messageIds.length === 0 ||
    messageIds.length > 20 ||
    messageIds.some((id) => typeof id !== "string" || !id.trim())
  ) {
    throw new Error("فهرست پیام‌ها نامعتبر است.");
  }

  const uniqueIds = [...new Set(messageIds)];
  const deletedIds: string[] = [];
  const failedIds: string[] = [];

  for (const messageId of uniqueIds) {
    try {
      if (scope === "everyone") {
        await deleteDirectMessage(messageId);
      } else {
        await deleteMessageForMe(messageId);
      }
      deletedIds.push(messageId);
    } catch (error) {
      console.error("[DM] Could not delete selected message:", messageId, error);
      failedIds.push(messageId);
    }
  }

  return { deletedIds, failedIds };
}
