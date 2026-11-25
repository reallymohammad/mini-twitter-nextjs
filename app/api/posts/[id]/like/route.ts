import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { createNotification } from "@/lib/notifications/service";

type Context = {
  params: Promise<{ id: string }>;
};

export async function POST(_: NextRequest, { params }: Context) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { id: postId } = await params;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const post = await tx.post.findFirst({
        where: {
          id: postId,
          deletedAt: null,
        },
        select: {
          id: true,
          authorId: true,
        },
      });

      if (!post) {
        return { status: "not-found" as const };
      }

      // بررسی بلاک دوطرفه بین لایک‌کننده و نویسندهٔ پست
       if (post.authorId !== user.id) {
        const block = await tx.block.findFirst({
          where: {
            OR: [
              { blockerId: user.id, blockedId: post.authorId },
              { blockerId: post.authorId, blockedId: user.id },
            ],
          },
          select: { blockerId: true, blockedId: true },
        });

        if (block) {
          return { status: "forbidden" as const };
        }
      }

      await tx.like.create({
        data: {
          userId: user.id,
          postId,
        },
      });

      await tx.post.update({
        where: { id: postId },
        data: {
          likeCount: { increment: 1 },
        },
      });

      return {
        status: "liked" as const,
        recipientId: post.authorId,
        postId: post.id,
      };
    });

    if (result.status === "not-found") {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }

    if (result.status === "forbidden") {
      return NextResponse.json(
        { error: "Action blocked" },
        { status: 403 }
      );
    }

    try {
      await createNotification({
        type: "LIKE",
        recipientId: result.recipientId,
        actorId: user.id,
        postId: result.postId,
      });
    } catch (notificationError) {
      console.error(
        "[LIKE] Notification creation failed:",
        notificationError
      );
    }

    return NextResponse.json({ liked: true });
  } catch (error) {
    // لایک تکراری؛ موفقیت اعلام می‌شود ولی نوتیفیکیشن جدیدی ساخته نمی‌شود.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json({ liked: true });
    }

    console.error("Like POST error:", error);

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
