import { prisma } from "@/lib/prisma";

export type BlockState = {
  hasBlockedThem: boolean;
  isBlockedByThem: boolean;
  isBlocked: boolean;
};

export type BlockDirection =
  | "both"
  | "blockedByMe"
  | "blockedMe";

export async function getBlockState(
  viewerId: string | undefined,
  targetId: string
): Promise<BlockState> {
  if (!viewerId || viewerId === targetId) {
    return {
      hasBlockedThem: false,
      isBlockedByThem: false,
      isBlocked: false,
    };
  }

  const rows = await prisma.block.findMany({
    where: {
      OR: [
        { blockerId: viewerId, blockedId: targetId },
        { blockerId: targetId, blockedId: viewerId },
      ],
    },
    select: { blockerId: true },
  });

  const hasBlockedThem = rows.some(
    (row) => row.blockerId === viewerId
  );
  const isBlockedByThem = rows.some(
    (row) => row.blockerId === targetId
  );

  return {
    hasBlockedThem,
    isBlockedByThem,
    isBlocked: hasBlockedThem || isBlockedByThem,
  };
}

/**
 * شناسهٔ کاربران مرتبط با بلاک.
 *
 * both: هر دو جهت؛ مناسب فیلترکردن کاربران در لیست‌ها (پیش‌فرض).
 * blockedByMe: کاربرانی که من بلاک کرده‌ام.
 * blockedMe: کاربرانی که مرا بلاک کرده‌اند.
 */
export async function getBlockedUserIds(
  viewerId?: string,
  direction: BlockDirection = "both"
): Promise<string[]> {
  if (!viewerId) {
    return [];
  }

  const rows = await prisma.block.findMany({
    where:
      direction === "blockedByMe"
        ? { blockerId: viewerId }
        : direction === "blockedMe"
          ? { blockedId: viewerId }
          : {
              OR: [
                { blockerId: viewerId },
                { blockedId: viewerId },
              ],
            },
    select: {
      blockerId: true,
      blockedId: true,
    },
  });

  const ids = new Set<string>();

  for (const row of rows) {
    ids.add(
      row.blockerId === viewerId
        ? row.blockedId
        : row.blockerId
    );
  }

  return [...ids];
}
