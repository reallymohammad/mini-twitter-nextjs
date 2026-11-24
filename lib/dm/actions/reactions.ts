"use server";

import { prisma } from "@/lib/prisma";
import {
  assertNoBlock,
  requireCurrentUserId,
} from "./helpers";

const ALLOWED_REACTION_EMOJIS = new Set([
  "👍",
  "❤️",
  "😂",
  "😮",
  "😢",
  "🙏",
]);

export async function toggleMessageReaction(
  messageId: string,
  emoji: string,
) {
  const userId = await requireCurrentUserId();

  if (typeof messageId !== "string" || !messageId.trim()) {
    throw new Error("شناسهٔ پیام نامعتبر است.");
  }

  if (
    typeof emoji !== "string" ||
    !ALLOWED_REACTION_EMOJIS.has(emoji)
  ) {
    throw new Error("واکنش انتخاب‌شده معتبر نیست.");
  }

  const result = await prisma.$transaction(async (tx) => {
    const message = await tx.message.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        conversationId: true,
        deletedAt: true,
        createdAt: true,
        conversation: {
          select: {
            isGroup: true,
            participants: {
              select: {
                userId: true,
              },
            },
          },
        },
      },
    });

    if (!message || message.deletedAt) {
      throw new Error("پیام پیدا نشد یا دیگر در دسترس نیست.");
    }

    const membership = await tx.userConversation.findUnique({
      where: {
        userId_conversationId: {
          userId,
          conversationId: message.conversationId,
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

    if (
      membership.deletedAt &&
      message.createdAt <= membership.deletedAt
    ) {
      throw new Error("این پیام در دسترس نیست.");
    }

    const hiddenForUser = await tx.messageDeletion.findUnique({
      where: {
        userId_messageId: {
          userId,
          messageId,
        },
      },
      select: { messageId: true },
    });

    if (hiddenForUser) {
      throw new Error("این پیام در دسترس نیست.");
    }

    const participants = message.conversation.participants;

    if (
      message.conversation.isGroup ||
      participants.length !== 2
    ) {
      throw new Error(
        "واکنش به پیام فعلاً فقط برای گفت‌وگوی دونفره فعال است.",
      );
    }

    const otherParticipant = participants.find(
      (participant) => participant.userId !== userId,
    );

    if (!otherParticipant) {
      throw new Error("کاربر مقابل پیدا نشد.");
    }

    await assertNoBlock(
      tx,
      userId,
      otherParticipant.userId,
    );

    const existingReaction = await tx.messageReaction.findUnique({
      where: {
        messageId_userId: {
          messageId,
          userId,
        },
      },
      select: {
        emoji: true,
      },
    });

    let updatedEmoji: string | null = emoji;

    if (existingReaction?.emoji === emoji) {
      await tx.messageReaction.delete({
        where: {
          messageId_userId: {
            messageId,
            userId,
          },
        },
      });

      updatedEmoji = null;
    } else {
      await tx.messageReaction.upsert({
        where: {
          messageId_userId: {
            messageId,
            userId,
          },
        },
        create: {
          messageId,
          userId,
          emoji,
        },
        update: {
          emoji,
        },
      });
    }

    await tx.$queryRaw<{ emitted: boolean }[]>`
      SELECT realtime.send(
        payload => jsonb_build_object(
          'conversationId', ${message.conversationId}::text,
          'messageId', ${messageId}::text,
          'userId', ${userId}::text,
          'emoji', ${updatedEmoji}::text
        ),
        event => 'message_reaction_updated',
        topic => ${`dm:${message.conversationId}`}::text,
        private => false
      ) IS NULL AS emitted
    `;

    return {
      conversationId: message.conversationId,
      messageId,
      userId,
      emoji: updatedEmoji,
    };
  });

  return result;
}
