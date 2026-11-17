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
      // ۱. پیدا کردن پست و نویسنده آن
      const post = await tx.post.findFirst({
        where: { id: postId, deletedAt: null },
        select: { id: true, authorId: true },
      });

      if (!post) return "not-found" as const;

      // ۲. بررسی بلاک دوطرفه بین لایک‌کننده و نویسنده پست
      if (post.authorId !== user.id) {
        const block = await tx.block.findFirst({
          where: {
            OR: [
              { blockerId: user.id, blockedId: post.authorId },
              { blockerId: post.authorId, blockedId: user.id },
            ],
          },
        });
        if (block) return "forbidden" as const;
      }

      await tx.like.create({
        data: { userId: user.id, postId },
      });

      await tx.post.update({
        where: { id: postId },
        data: { likeCount: { increment: 1 } },
      });

      return "liked" as const;
    });

    if (found === "not-found") {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }
    if (found === "forbidden") {
      return NextResponse.json({ error: "Action blocked" }, { status: 403 });
    }

    return NextResponse.json({ liked: true });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json({ liked: true });
    }

    throw error;
  }
}
