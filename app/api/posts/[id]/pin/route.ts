import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function retrySerializable<T>(operation: () => Promise<T>): Promise<T> {
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

function handleError(error: unknown, action: string) {
  console.error(action, error);

  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  ) {
    return NextResponse.json(
      { error: "Concurrent request; please retry" },
      { status: 409 }
    );
  }

  return NextResponse.json(
    { error: "Failed to update pin" },
    { status: 500 }
  );
}

export async function POST(_req: NextRequest, { params }: RouteContext) {
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
          const post = await tx.post.findFirst({
            where: { id: postId, deletedAt: null },
            select: { id: true, authorId: true },
          });

          if (!post) return { kind: "not-found" } as const;

          if (post.authorId !== user.id) {
            return { kind: "forbidden" } as const;
          }

          // پین قبلی فقط پس از تأیید معتبر بودن پست مقصد حذف می‌شود.
          await tx.pinnedPost.deleteMany({
            where: { userId: user.id },
          });

          const pinned = await tx.pinnedPost.create({
            data: {
              userId: user.id,
              postId: post.id,
              order: 0,
            },
          });

          return { kind: "pinned", pinned } as const;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      )
    );

    if (result.kind === "not-found") {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }

    if (result.kind === "forbidden") {
      return NextResponse.json(
        { error: "You can only pin your own post" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { success: true, pinned: result.pinned },
      { status: 201 }
    );
  } catch (error) {
    return handleError(error, "PIN_POST_ERROR:");
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
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
          const post = await tx.post.findFirst({
            where: { id: postId, deletedAt: null },
            select: { id: true, authorId: true },
          });

          if (!post) return { kind: "not-found" } as const;

          if (post.authorId !== user.id) {
            return { kind: "forbidden" } as const;
          }

          const removed = await tx.pinnedPost.deleteMany({
            where: { userId: user.id, postId: post.id },
          });

          return {
            kind: "unpinned",
            deleted: removed.count > 0,
          } as const;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      )
    );

    if (result.kind === "not-found") {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }

    if (result.kind === "forbidden") {
      return NextResponse.json(
        { error: "You can only unpin your own post" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      deleted: result.deleted,
    });
  } catch (error) {
    return handleError(error, "UNPIN_POST_ERROR:");
  }
}
