import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function GET(_req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const bookmarks = await prisma.bookmark.findMany({
      where: {
        userId: currentUser.id,
        post: { is: { deletedAt: null } },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        post: {
          include: {
            author: {
              select: {
                id: true,
                username: true,
                fullName: true,
                avatarUrl: true,
                badge: true,
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
          },
        },
      },
    });

    const posts = bookmarks.map(({ post }) => {
      const { likes, reposts, ...postData } = post;

      return {
        ...postData,
        isLiked: likes.length > 0,
        isReposted: reposts.length > 0,
        isBookmarked: true,
      };
    });

    return NextResponse.json(posts);
  } catch (error) {
    console.error("GET /api/bookmarks error:", error);

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
