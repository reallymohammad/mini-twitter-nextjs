import { prisma } from "@/lib/prisma";
import { postInclude, type PostWithRelations } from "./posts";

export async function getHomeFeed(userId: string): Promise<PostWithRelations[]> {
  const following = await prisma.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
  });

  const ids = [userId, ...following.map((f) => f.followingId)];

  return prisma.post.findMany({
    where: {
      authorId: { in: ids },
      // exclude plain replies from the home feed
      NOT: { type: "REPLY" },
    },
    include: postInclude,
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}
