import { prisma } from "@/lib/prisma";

export type DmPermissionResult = {
  allowed: boolean;
  reason:
    | "OWNER"
    | "BLOCKED"
    | "NOBODY"
    | "FOLLOWERS"
    | "FOLLOWING"
    | "MUTUALS"
    | "ALLOWED";
};

/**
 * Checks whether sender may initiate a DM to recipient. This is useful for
 * rendering the profile action, but the server action that creates a
 * conversation must repeat this check before writing anything.
 */
export async function canSendDirectMessage(
  senderId: string,
  recipientId: string,
): Promise<DmPermissionResult> {
  if (senderId === recipientId) {
    return { allowed: false, reason: "OWNER" };
  }

  const [recipient, block, senderFollowsRecipient, recipientFollowsSender] =
    await Promise.all([
      prisma.user.findFirst({
        where: { id: recipientId, deletedAt: null },
        select: { settings: { select: { dmPermission: true } } },
      }),
      prisma.block.findFirst({
        where: {
          OR: [
            { blockerId: senderId, blockedId: recipientId },
            { blockerId: recipientId, blockedId: senderId },
          ],
        },
        select: { blockerId: true },
      }),
      prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: senderId,
            followingId: recipientId,
          },
        },
        select: { status: true },
      }),
      prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: recipientId,
            followingId: senderId,
          },
        },
        select: { status: true },
      }),
    ]);

  if (!recipient) return { allowed: false, reason: "NOBODY" };
  if (block) return { allowed: false, reason: "BLOCKED" };

  const permission = recipient.settings?.dmPermission ?? "EVERYONE";
  const senderFollows = senderFollowsRecipient?.status === "ACCEPTED";
  const recipientFollows = recipientFollowsSender?.status === "ACCEPTED";

  const allowed =
    permission === "EVERYONE" ||
    (permission === "FOLLOWERS" && senderFollows) ||
    (permission === "FOLLOWING" && recipientFollows) ||
    (permission === "MUTUALS" && senderFollows && recipientFollows);

  if (allowed) return { allowed: true, reason: "ALLOWED" };
  if (permission === "FOLLOWERS" || permission === "FOLLOWING" || permission === "MUTUALS" || permission === "NOBODY") {
    return { allowed: false, reason: permission };
  }

  // Fail closed if an unexpected enum value is ever encountered.
  return { allowed: false, reason: "NOBODY" };
}
