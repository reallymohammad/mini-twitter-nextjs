// ib/dm/actions/dm/helpers.ts
import { getCurrentUser } from "@/lib/session";
import type { Prisma } from "@prisma/client";

export class BlockedConversationError extends Error {
  constructor() {
    super("به‌دلیل تنظیمات بلاک، این گفتگو در دسترس نیست.");
    this.name = "BlockedConversationError";
  }
}

export async function requireCurrentUserId(): Promise<string> {
  const user = await getCurrentUser();
  if (!user || user.deletedAt) {
    throw new Error("برای انجام این کار باید وارد حساب کاربری شوید.");
  }
  return user.id;
}

export function makeParticipantsKey(userAId: string, userBId: string): string {
  return [userAId, userBId].sort().join(":");
}

export async function assertNoBlock(
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

export async function canStartConversation(
  db: Prisma.TransactionClient,
  senderId: string,
  recipientId: string,
  permission: string,
): Promise<boolean> {
  if (permission === "EVERYONE") return true;
  if (permission === "NOBODY") return false;

  const [senderFollowsRecipient, recipientFollowsSender] = await Promise.all([
    db.follow.findFirst({
      where: { followerId: senderId, followingId: recipientId, status: "ACCEPTED" },
      select: { followerId: true },
    }),
    db.follow.findFirst({
      where: { followerId: recipientId, followingId: senderId, status: "ACCEPTED" },
      select: { followerId: true },
    }),
  ]);

  if (permission === "FOLLOWERS") return Boolean(senderFollowsRecipient);
  if (permission === "FOLLOWING") return Boolean(recipientFollowsSender);
  if (permission === "MUTUALS") return Boolean(senderFollowsRecipient && recipientFollowsSender);

  return false;
}
