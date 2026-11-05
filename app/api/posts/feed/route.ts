// app/api/posts/feed/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") ?? "for-you";

    const include = {
      author: true,
      _count: { select: { likes: true, replies: true, reposts: true } },
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
    };

    let posts;

    if (type === "following") {
      const following = await prisma.follow.findMany({
        where: { followerId: currentUser.id, status: "ACCEPTED" },
        select: { followingId: true },
      });
      const followingIds = following.map((f) => f.followingId);

      posts = await prisma.post.findMany({
        where: {
          authorId: { in: [...followingIds, currentUser.id] },
          replyToId: null,
          quoteOfId: null,
          deletedAt: null,
        },
        include,
        orderBy: { createdAt: "desc" },
        take: 30,
      });
    } else {
      posts = await prisma.post.findMany({
        where: {
          replyToId: null,
          quoteOfId: null,
          deletedAt: null,
        },
        include,
        orderBy: [{ likeCount: "desc" }, { createdAt: "desc" }],
        take: 30,
      });
    }

    const mapped = posts.map((post) => ({
      ...post,
      isLiked: post.likes.length > 0,
      isReposted: post.reposts.length > 0,
      isBookmarked: post.bookmarks.length > 0,
      likes: undefined,
      reposts: undefined,
      bookmarks: undefined,
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    console.error("GET /api/posts/feed error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
