// ib/dm/conversations.ts
"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { revalidatePath } from "next/cache";
import {
  requireCurrentUserId,
  makeParticipantsKey,
  assertNoBlock,
  canStartConversation,
} from "./helpers";

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
        settings: { select: { dmPermission: true } },
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
          userId_conversationId: { userId: senderId, conversationId: existing.id },
        },
        create: {
          userId: senderId,
          conversationId: existing.id,
          isDeleted: false,
          deletedAt: null,
        },
        update: { isDeleted: false },
      });

      return { conversationId: existing.id };
    }

    const permission = recipient.settings?.dmPermission ?? "EVERYONE";
    const allowed = await canStartConversation(tx, senderId, targetUserId, permission);

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

export async function getConversations() {
  const userId = await requireCurrentUserId();

  const userConversations = await prisma.userConversation.findMany({
    where: { userId, isDeleted: false },
    select: {
      conversationId: true,
      lastReadAt: true,
      deletedAt: true,
      conversation: {
        select: {
          id: true,
          createdAt: true,
          participants: {
            where: { userId: { not: userId } },
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
            where: {
              deletedAt: null,
              userDeletions: { none: { userId } },
            },
            take: 1,
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
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
      conversation: { createdAt: "desc" },
    },
  });

  return userConversations.map((uc) => {
    const otherParticipant = uc.conversation.participants[0]?.user ?? null;
    const latestStoredMessage = uc.conversation.messages[0] ?? null;

    const lastMessage =
      latestStoredMessage &&
      (!uc.deletedAt || latestStoredMessage.createdAt > uc.deletedAt)
        ? latestStoredMessage
        : null;

    const hasUnread = Boolean(
      lastMessage &&
        lastMessage.senderId !== userId &&
        (!uc.lastReadAt || uc.lastReadAt < lastMessage.createdAt),
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

export async function getConversationDetails(conversationId: string) {
  const currentUser = await getCurrentUser();

  if (!currentUser || currentUser.deletedAt || typeof conversationId !== "string" || !conversationId) {
    return null;
  }

  const membership = await prisma.userConversation.findUnique({
    where: {
      userId_conversationId: { userId: currentUser.id, conversationId },
    },
    select: { isDeleted: true, deletedAt: true },
  });

  if (!membership || membership.isDeleted) return null;

  const currentUserSettings = await prisma.userSettings.findUnique({
    where: { userId: currentUser.id },
    select: { showReadReceipts: true },
  });

  const myReadReceiptsEnabled = currentUserSettings?.showReadReceipts ?? true;

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              username: true,
              fullName: true,
              avatarUrl: true,
              settings: { select: { showReadReceipts: true } },
            },
          },
        },
      },
      messages: {
        where: {
          deletedAt: null,
          userDeletions: { none: { userId: currentUser.id } },
          ...(membership.deletedAt ? { createdAt: { gt: membership.deletedAt } } : {}),
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
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
      },
    },
  });

  if (!conversation) return null;

  const otherParticipant = conversation.participants.find(
    (participant) => participant.userId !== currentUser.id,
  );

  const otherReadReceiptsEnabled = otherParticipant?.user.settings?.showReadReceipts ?? true;
  const shouldShowSeen = myReadReceiptsEnabled && otherReadReceiptsEnabled;
  const otherLastReadAt = shouldShowSeen ? otherParticipant?.lastReadAt : null;

  const messagesWithSeen = conversation.messages.map((msg) => ({
    ...msg,
    isSeen: Boolean(
      msg.senderId === currentUser.id &&
        otherLastReadAt &&
        msg.createdAt <= otherLastReadAt,
    ),
  }));

  return {
    ...conversation,
    otherUser: otherParticipant?.user ?? null,
    messages: messagesWithSeen,
  };
}

export async function markConversationAsRead(conversationId: string) {
  const userId = await requireCurrentUserId();

  if (!conversationId || typeof conversationId !== "string") {
    throw new Error("شناسهٔ گفتگو معتبر نیست.");
  }

  const lastReadAt = new Date();
  const result = await prisma.userConversation.updateMany({
    where: { userId, conversationId, isDeleted: false },
    data: { lastReadAt },
  });

  if (result.count === 0) {
    throw new Error("این گفتگو در دسترس نیست.");
  }

  return { success: true, lastReadAt };
}

export async function deleteConversation(conversationId: string) {
  const userId = await requireCurrentUserId();

  if (!conversationId || typeof conversationId !== "string") {
    throw new Error("شناسهٔ گفتگو نامعتبر است.");
  }

  const membership = await prisma.userConversation.findUnique({
    where: {
      userId_conversationId: { userId, conversationId },
    },
    select: { isDeleted: true },
  });

  if (!membership) {
    throw new Error("این گفتگو در دسترس نیست.");
  }

  if (!membership.isDeleted) {
    const deletedAt = new Date();
    await prisma.userConversation.updateMany({
      where: { userId, conversationId, isDeleted: false },
      data: {
        isDeleted: true,
        deletedAt,
        lastReadAt: deletedAt,
      },
    });
  }

  revalidatePath("/[locale]/messages", "layout");
  return { success: true, conversationId };
}

export async function getConversationBlockStatus(conversationId: string) {
  const userId = await requireCurrentUserId();

  if (!conversationId || typeof conversationId !== "string") {
    throw new Error("شناسهٔ گفتگو معتبر نیست.");
  }

  const membership = await prisma.userConversation.findUnique({
    where: {
      userId_conversationId: { userId, conversationId },
    },
    select: {
      isDeleted: true,
      conversation: {
        select: {
          isGroup: true,
          participants: { select: { userId: true } },
        },
      },
    },
  });

  if (!membership || membership.isDeleted) {
    throw new Error("این گفتگو در دسترس نیست.");
  }

  const participants = membership.conversation.participants;
  if (membership.conversation.isGroup || participants.length !== 2) {
    throw new Error("این بررسی فقط برای گفتگوی دونفره است.");
  }

  const recipient = participants.find((participant) => participant.userId !== userId);
  if (!recipient) {
    throw new Error("کاربر مقصد پیدا نشد.");
  }

  const block = await prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: userId, blockedId: recipient.userId },
        { blockerId: recipient.userId, blockedId: userId },
      ],
    },
    select: { blockerId: true },
  });

  return { blocked: Boolean(block) };
}
