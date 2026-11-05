// app/api/bookmarks/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const bookmarks = await prisma.bookmark.findMany({
      where: { userId: currentUser.id },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        post: {
          include: {
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
          },
        },
      },
    });

    const posts = bookmarks
      .filter((b) => b.post && !b.post.deletedAt)
      .map((b) => ({
        ...b.post,
        isLiked: b.post.likes.length > 0,
        isReposted: b.post.reposts.length > 0,
        isBookmarked: true,
        likes: undefined,
        reposts: undefined,
      }));

    return NextResponse.json(posts);
  } catch (error) {
    console.error("GET /api/bookmarks error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
