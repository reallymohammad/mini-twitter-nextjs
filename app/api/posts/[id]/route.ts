import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

type Context = { params: Promise<{ id: string }> };

async function retrySerializable<T>(
  operation: () => Promise<T>
): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await operation();
    } catch (error) {
      const retryable =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034";

      if (!retryable || attempt === 2) throw error;
    }
  }

  throw new Error("Transaction retries exhausted");
}

export async function DELETE(
  _req: NextRequest,
  { params }: Context
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id: postId } = await params;

    const result = await retrySerializable(() =>
      prisma.$transaction(
        async (tx) => {
          const post = await tx.post.findUnique({
            where: { id: postId },
            select: {
              authorId: true,
              deletedAt: true,
              replyToId: true, // دریافت آیدی پست والد
            },
          });

          if (!post || post.deletedAt) {
            return "not-found" as const;
          }

          if (post.authorId !== user.id) {
            return "forbidden" as const;
          }

          const updated = await tx.post.updateMany({
            where: {
              id: postId,
              authorId: user.id,
              deletedAt: null,
            },
            data: {
              deletedAt: new Date(),
              content: null,
              mediaUrls: [],
            },
          });

          if (updated.count === 0) {
            return "not-found" as const;
          }

          // اگر پست حذف‌شده یک پاسخ به پست دیگری بوده، شمارنده پست والد را کم کن
          if (post.replyToId) {
            await tx.post.updateMany({
              where: {
                id: post.replyToId,
                replyCount: { gt: 0 },
              },
              data: {
                replyCount: { decrement: 1 },
              },
            });
          }

          await tx.pinnedPost.deleteMany({
            where: { postId },
          });

          return "deleted" as const;
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        }
      )
    );

    if (result === "not-found") {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }

    if (result === "forbidden") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      return NextResponse.json(
        { error: "Concurrent request; please retry" },
        { status: 409 }
      );
    }

    console.error("DELETE_POST_ERROR:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
