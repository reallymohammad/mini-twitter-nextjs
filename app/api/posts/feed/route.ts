import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const authorSelect = {
  id: true,
  username: true,
  fullName: true,
  avatarUrl: true,
  badge: true,
} as const;

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") ?? "for-you";

    const include = {
      author: { select: authorSelect },
      quoteOf: {
        include: {
          author: { select: authorSelect },
          _count: {
            select: {
              likes: true,
              replies: true,
              reposts: true,
              quotes: true,
            },
          },
          likes: {
            where: { userId: currentUser.id },
            select: { userId: true },
          },
          reposts: {
            where: { userId: currentUser.id },
            select: { userId: true },
          },
          bookmarks: {
            where: { userId: currentUser.id },
            select: { userId: true },
          },
        },
      },
      _count: {
        select: {
          likes: true,
          replies: true,
          reposts: true,
        },
      },
      likes: {
        where: { userId: currentUser.id },
        select: { userId: true },
      },
      reposts: {
        where: { userId: currentUser.id },
        select: { userId: true },
      },
      bookmarks: {
        where: { userId: currentUser.id },
        select: { userId: true },
      },
    } as const satisfies Prisma.PostInclude;

    const posts =
      type === "following"
        ? await (async () => {
            const following = await prisma.follow.findMany({
              where: {
                followerId: currentUser.id,
                status: "ACCEPTED",
              },
              select: { followingId: true },
            });

            const authorIds = [
              ...following.map((follow) => follow.followingId),
              currentUser.id,
            ];

            return prisma.post.findMany({
              where: {
                authorId: { in: authorIds },
                replyToId: null,
                deletedAt: null,
              },
              include,
              orderBy: [
                { createdAt: "desc" },
                { id: "desc" },
              ],
              take: 30,
            });
          })()
        : await prisma.post.findMany({
            where: {
              replyToId: null,
              deletedAt: null,
            },
            include,
            orderBy: [
              { likeCount: "desc" },
              { createdAt: "desc" },
              { id: "desc" },
            ],
            take: 30,
          });

    const mapped = posts.map(
      ({ likes, reposts, bookmarks, quoteOf, ...post }) => ({
        ...post,
        quoteOf: quoteOf?.deletedAt
          ? {
              ...quoteOf,
              content: null,
              mediaUrls: [],
            }
          : quoteOf,
        isLiked: likes.length > 0,
        isReposted: reposts.length > 0,
        isBookmarked: bookmarks.length > 0,
      })
    );

    return NextResponse.json(mapped);
  } catch (error) {
    console.error("GET /api/posts/feed error:", error);

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
