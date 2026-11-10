import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

type RouteContext = { params: Promise<{ id: string }> };

class PostUnavailableError extends Error {}
class BookmarkCountMismatchError extends Error {}

export async function POST(_req: NextRequest, { params }: RouteContext) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { id: postId } = await params;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const isBookmarked = await prisma.$transaction(
        async (tx) => {
          const post = await tx.post.findFirst({
            where: { id: postId, deletedAt: null },
            select: { id: true },
          });

          if (!post) throw new PostUnavailableError();

          const existing = await tx.bookmark.findUnique({
            where: {
              userId_postId: {
                userId: currentUser.id,
                postId,
              },
            },
            select: { postId: true },
          });

          if (existing) {
            await tx.bookmark.delete({
              where: {
                userId_postId: {
                  userId: currentUser.id,
                  postId,
                },
              },
            });

            const updated = await tx.post.updateMany({
              where: {
                id: postId,
                deletedAt: null,
                bookmarkCount: { gt: 0 },
              },
              data: {
                bookmarkCount: { decrement: 1 },
              },
            });

            if (updated.count === 0) {
              const stillActive = await tx.post.findFirst({
                where: { id: postId, deletedAt: null },
                select: { id: true },
              });

              if (!stillActive) throw new PostUnavailableError();
              throw new BookmarkCountMismatchError();
            }

            return false;
          }

          await tx.bookmark.create({
            data: {
              userId: currentUser.id,
              postId,
            },
          });

          const updated = await tx.post.updateMany({
            where: { id: postId, deletedAt: null },
            data: {
              bookmarkCount: { increment: 1 },
            },
          });

          if (updated.count === 0) throw new PostUnavailableError();

          return true;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );

      return NextResponse.json({ isBookmarked });
    } catch (error) {
      if (error instanceof PostUnavailableError) {
        return NextResponse.json(
          { error: "Post not found" },
          { status: 404 }
        );
      }

      if (error instanceof BookmarkCountMismatchError) {
        return NextResponse.json(
          { error: "Bookmark count is inconsistent" },
          { status: 409 }
        );
      }

      const writeConflict =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034";

      if (writeConflict && attempt < 2) continue;

      if (writeConflict) {
        return NextResponse.json(
          { error: "Concurrent request; please retry" },
          { status: 409 }
        );
      }

      console.error("POST /api/posts/[id]/bookmark error:", error);

      return NextResponse.json(
        { error: "Internal Server Error" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json(
    { error: "Concurrent request; please retry" },
    { status: 409 }
  );
}
