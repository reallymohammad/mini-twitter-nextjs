import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  getRelatedAuthorSelect,
  getVisiblePostWhere,
  sanitizePostRelations,
} from "@/lib/prisma/postInclude";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const authorSelect = {
  id: true,
  username: true,
  fullName: true,
  avatarUrl: true,
  badge: true,
  isPrivate: true,
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

    const type = req.nextUrl.searchParams.get("type") ?? "foryou";

    if (
      type !== "foryou" &&
      type !== "for-you" &&
      type !== "following"
    ) {
      return NextResponse.json(
        { error: "Invalid feed type" },
        { status: 400 }
      );
    }

    const userFilter = {
      where: { userId: currentUser.id },
      select: { userId: true },
    } as const;

    const include = {
      author: {
        select: authorSelect,
      },
      quoteOf: {
        include: {
          author: {
            select: getRelatedAuthorSelect(currentUser.id),
          },
          _count: {
            select: {
              likes: true,
              replies: {
                where: { deletedAt: null },
              },
              reposts: true,
              quotes: {
                where: { deletedAt: null },
              },
            },
          },
          likes: userFilter,
          reposts: userFilter,
          bookmarks: userFilter,
        },
      },
      replyTo: {
        select: {
          id: true,
          content: true,
          deletedAt: true,
          author: {
            select: getRelatedAuthorSelect(currentUser.id),
          },
        },
      },
      _count: {
        select: {
          likes: true,
          replies: {
            where: { deletedAt: null },
          },
          reposts: true,
          quotes: {
            where: { deletedAt: null },
          },
        },
      },
      likes: userFilter,
      reposts: userFilter,
      bookmarks: userFilter,
    } as const satisfies Prisma.PostInclude;

    type FeedPost = Prisma.PostGetPayload<{
      include: typeof include;
    }>;

    const visiblePostWhere = getVisiblePostWhere(currentUser.id);
    let posts: FeedPost[];

    if (type === "following") {
      const following = await prisma.follow.findMany({
        where: {
          followerId: currentUser.id,
          status: "ACCEPTED",
        },
        select: {
          followingId: true,
        },
      });

      const authorIds = [
        currentUser.id,
        ...following.map((follow) => follow.followingId),
      ];

      posts = await prisma.post.findMany({
        where: {
          authorId: { in: authorIds },
          replyToId: null,
          deletedAt: null,
          ...visiblePostWhere,
        },
        include,
        orderBy: [
          { createdAt: "desc" },
          { id: "desc" },
        ],
        take: 30,
      });
    } else {
      posts = await prisma.post.findMany({
        where: {
          replyToId: null,
          deletedAt: null,
          ...visiblePostWhere,
        },
        include,
        orderBy: [
          { likeCount: "desc" },
          { createdAt: "desc" },
          { id: "desc" },
        ],
        take: 30,
      });
    }

    const mapped = posts.map((post) => {
      const safePost = sanitizePostRelations(post, currentUser.id);
      const { likes, reposts, bookmarks, ...publicPost } = safePost;
      const counts = publicPost._count;

      return {
        ...publicPost,
        likeCount: counts.likes,
        replyCount: counts.replies,
        repostCount: counts.reposts,
        quoteCount: counts.quotes,
        isLiked: likes.length > 0,
        isReposted: reposts.length > 0,
        isBookmarked: bookmarks.length > 0,
      };
    });

    return NextResponse.json(mapped, {
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("GET /api/posts/feed error:", error);

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
