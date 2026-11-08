import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

type Context = { params: Promise<{ id: string }> };

export async function POST(_: NextRequest, { params }: Context) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: postId } = await params;

  try {
    const found = await prisma.$transaction(async (tx) => {
      const post = await tx.post.findFirst({
        where: { id: postId, deletedAt: null },
        select: { id: true },
      });

      if (!post) return false;

      await tx.like.create({
        data: { userId: user.id, postId },
      });

      await tx.post.update({
        where: { id: postId },
        data: { likeCount: { increment: 1 } },
      });

      return true;
    });

    if (!found) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    return NextResponse.json({ liked: true });
  } catch (error) {
    // لایک تکراری نباید شمارنده را دوباره افزایش دهد.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json({ liked: true });
    }

    throw error;
  }
}

export async function DELETE(_: NextRequest, { params }: Context) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: postId } = await params;

  const found = await prisma.$transaction(async (tx) => {
    const post = await tx.post.findFirst({
      where: { id: postId, deletedAt: null },
      select: { id: true },
    });

    if (!post) return false;

    const deleted = await tx.like.deleteMany({
      where: { userId: user.id, postId },
    });

    if (deleted.count > 0) {
      await tx.post.updateMany({
        where: { id: postId, likeCount: { gt: 0 } },
        data: { likeCount: { decrement: 1 } },
      });
    }

    return true;
  });

  if (!found) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  return NextResponse.json({ liked: false });
}
