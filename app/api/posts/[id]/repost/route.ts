import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

type Context = { params: Promise<{ id: string }> };

class PostUnavailableError extends Error {}
class PrivacyViolationError extends Error {}
class BlockedInteractionError extends Error {}

function notFoundResponse() {
  return NextResponse.json(
    { error: "Post not found" },
    { status: 404 }
  );
}

export async function POST(
  _req: NextRequest,
  { params }: Context
) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { id: postId } = await params;

  try {
    await prisma.$transaction(
      async (tx) => {
        const post = await tx.post.findFirst({
          where: {
            id: postId,
            deletedAt: null,
          },
          select: {
            id: true,
            authorId: true,
            author: {
              select: { isPrivate: true },
            },
          },
        });

        if (!post) {
          throw new PostUnavailableError();
        }

        // بررسی گارد بلاک دوطرفه (اگر نویسنده، خود کاربر نباشد)
        if (post.authorId !== user.id) {
          const isBlocked = await tx.block.findFirst({
            where: {
              OR: [
                { blockerId: user.id, blockedId: post.authorId },
                { blockerId: post.authorId, blockedId: user.id },
              ],
            },
          });

          if (isBlocked) {
            throw new BlockedInteractionError();
          }
        }

        // محدودیت برای اکانت خصوصی
        if (post.author.isPrivate) {
          throw new PrivacyViolationError();
        }

        // ایجاد ریپست؛ در صورت تکراری بودن P2002 هندل می‌شود
        await tx.repost.create({
          data: {
            userId: user.id,
            postId,
          },
        });

        await tx.post.update({
          where: { id: postId },
          data: {
            repostCount: { increment: 1 },
          },
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      }
    );

    return NextResponse.json(
      { reposted: true },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof PostUnavailableError) {
      return notFoundResponse();
    }

    if (error instanceof BlockedInteractionError) {
      return NextResponse.json(
        {
          error: "You cannot interact with this post due to block settings",
          code: "BLOCKED_INTERACTION",
        },
        { status: 403 }
      );
    }

    if (error instanceof PrivacyViolationError) {
      return NextResponse.json(
        {
          error: "Cannot repost a private account's post",
          code: "PRIVATE_POST_REPOST",
        },
        { status: 403 }
      );
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json({ reposted: true });
    }

    console.error("Repost POST error:", error);

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: Context
) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { id: postId } = await params;

  try {
    await prisma.$transaction(
      async (tx) => {
        const post = await tx.post.findFirst({
          where: {
            id: postId,
            deletedAt: null,
          },
          select: { id: true },
        });

        if (!post) {
          throw new PostUnavailableError();
        }

        const removed = await tx.repost.deleteMany({
          where: {
            userId: user.id,
            postId,
          },
        });

        if (removed.count === 0) return;

        await tx.post.updateMany({
          where: {
            id: postId,
            repostCount: { gt: 0 },
          },
          data: {
            repostCount: { decrement: 1 },
          },
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      }
    );

    return NextResponse.json({ reposted: false });
  } catch (error) {
    if (error instanceof PostUnavailableError) {
      return notFoundResponse();
    }

    console.error("Repost DELETE error:", error);

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
