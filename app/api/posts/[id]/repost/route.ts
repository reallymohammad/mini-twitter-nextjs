import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

type Context = { params: Promise<{ id: string }> };

class PostUnavailableError extends Error {}

function notFoundResponse() {
  return NextResponse.json({ error: "Post not found" }, { status: 404 });
}

export async function POST(_req: NextRequest, { params }: Context) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: postId } = await params;

  try {
    await prisma.$transaction(async (tx) => {
      const updated = await tx.post.updateMany({
        where: { id: postId, deletedAt: null },
        data: { repostCount: { increment: 1 } },
      });

      if (updated.count === 0) throw new PostUnavailableError();

      await tx.repost.create({
        data: { userId: user.id, postId },
      });
    });

    return NextResponse.json({ reposted: true }, { status: 201 });
  } catch (error) {
    if (error instanceof PostUnavailableError) return notFoundResponse();

    // اگر همین کاربر قبلاً ری‌پست کرده باشد، تراکنش و افزایش شمارنده
    // برمی‌گردد؛ پاسخ همچنان idempotent می‌ماند.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json({ reposted: true });
    }

    throw error;
  }
}

export async function DELETE(_req: NextRequest, { params }: Context) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: postId } = await params;

  try {
    await prisma.$transaction(async (tx) => {
      const post = await tx.post.findFirst({
        where: { id: postId, deletedAt: null },
        select: { id: true },
      });

      if (!post) throw new PostUnavailableError();

      const removed = await tx.repost.deleteMany({
        where: { userId: user.id, postId },
      });

      if (removed.count === 0) return;

      const updated = await tx.post.updateMany({
        where: {
          id: postId,
          deletedAt: null,
          repostCount: { gt: 0 },
        },
        data: { repostCount: { decrement: 1 } },
      });

      // اگر پست حین تراکنش حذف نرم شده باشد، حذف ری‌پست نیز برگردد.
      if (updated.count === 0) {
        const stillActive = await tx.post.findFirst({
          where: { id: postId, deletedAt: null },
          select: { id: true },
        });

        if (!stillActive) throw new PostUnavailableError();
        // اگر شمارنده از قبل صفر بوده، آن را منفی نکن.
      }
    });

    return NextResponse.json({ reposted: false });
  } catch (error) {
    if (error instanceof PostUnavailableError) return notFoundResponse();
    throw error;
  }
}
