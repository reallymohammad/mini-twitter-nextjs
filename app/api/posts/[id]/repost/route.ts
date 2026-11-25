import { Prisma, NotificationType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { createNotification } from "@/lib/notifications/service";

type Context = {
  params: Promise<{ id: string }>;
};

class PostUnavailableError extends Error {}
class PrivacyViolationError extends Error {}
class BlockedInteractionError extends Error {}

function notFoundResponse() {
  return NextResponse.json(
    {
      error: "Post not found",
    },
    {
      status: 404,
    }
  );
}

export async function POST(
  _request: NextRequest,
  { params }: Context
) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      {
        error: "Unauthorized",
      },
      {
        status: 401,
      }
    );
  }

  const { id: postId } = await params;

  try {
    const notificationTarget = await prisma.$transaction(
      async (transaction) => {
        const post = await transaction.post.findFirst({
          where: {
            id: postId,
            deletedAt: null,
          },
          select: {
            id: true,
            authorId: true,
            author: {
              select: {
                isPrivate: true,
              },
            },
          },
        });

        if (!post) {
          throw new PostUnavailableError();
        }

        // بررسی بلاک دوطرفه
        if (post.authorId !== user.id) {
          const block = await transaction.block.findFirst({
            where: {
              OR: [
                {
                  blockerId: user.id,
                  blockedId: post.authorId,
                },
                {
                  blockerId: post.authorId,
                  blockedId: user.id,
                },
              ],
            },
            select: {
              blockerId: true,
              blockedId: true,
            },
          });

          if (block) {
            throw new BlockedInteractionError();
          }
        }

        // مطابق منطق فعلی پروژه:
        // ریپوست پست حساب خصوصی مجاز نیست.
        if (post.author.isPrivate) {
          throw new PrivacyViolationError();
        }

        // اگر ریپوست تکراری باشد، P2002 ایجاد می‌شود
        // و نوتیفیکیشن جدید ساخته نخواهد شد.
        await transaction.repost.create({
          data: {
            userId: user.id,
            postId: post.id,
          },
        });

        await transaction.post.update({
          where: {
            id: post.id,
          },
          data: {
            repostCount: {
              increment: 1,
            },
          },
        });

        return {
          recipientId: post.authorId,
          postId: post.id,
        };
      },
      {
        isolationLevel:
          Prisma.TransactionIsolationLevel.Serializable,
      }
    );

    // کاربر نباید برای خودش نوتیفیکیشن دریافت کند.
    if (notificationTarget.recipientId !== user.id) {
      try {
        await createNotification({
          type: NotificationType.REPOST,
          recipientId: notificationTarget.recipientId,
          actorId: user.id,
          postId: notificationTarget.postId,
        });
      } catch (notificationError) {
        // خطای اعلان نباید باعث شکست عملیات ریپوست شود.
        console.error(
          "[REPOST] Notification creation failed:",
          notificationError
        );
      }
    }

    return NextResponse.json(
      {
        reposted: true,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    if (error instanceof PostUnavailableError) {
      return notFoundResponse();
    }

    if (error instanceof BlockedInteractionError) {
      return NextResponse.json(
        {
          error:
            "You cannot interact with this post due to block settings",
          code: "BLOCKED_INTERACTION",
        },
        {
          status: 403,
        }
      );
    }

    if (error instanceof PrivacyViolationError) {
      return NextResponse.json(
        {
          error:
            "Cannot repost a private account's post",
          code: "PRIVATE_POST_REPOST",
        },
        {
          status: 403,
        }
      );
    }

    // ریپوست تکراری
    // در این حالت نباید اعلان جدید ساخته شود.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json({
        reposted: true,
      });
    }

    console.error("Repost POST error:", error);

    return NextResponse.json(
      {
        error: "Internal Server Error",
      },
      {
        status: 500,
      }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: Context
) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      {
        error: "Unauthorized",
      },
      {
        status: 401,
      }
    );
  }

  const { id: postId } = await params;

  try {
    await prisma.$transaction(
      async (transaction) => {
        const post = await transaction.post.findFirst({
          where: {
            id: postId,
            deletedAt: null,
          },
          select: {
            id: true,
          },
        });

        if (!post) {
          throw new PostUnavailableError();
        }

        const removed = await transaction.repost.deleteMany({
          where: {
            userId: user.id,
            postId: post.id,
          },
        });

        if (removed.count === 0) {
          return;
        }

        await transaction.post.updateMany({
          where: {
            id: post.id,
            repostCount: {
              gt: 0,
            },
          },
          data: {
            repostCount: {
              decrement: 1,
            },
          },
        });
      },
      {
        isolationLevel:
          Prisma.TransactionIsolationLevel.Serializable,
      }
    );

    return NextResponse.json({
      reposted: false,
    });
  } catch (error) {
    if (error instanceof PostUnavailableError) {
      return notFoundResponse();
    }

    console.error("Repost DELETE error:", error);

    return NextResponse.json(
      {
        error: "Internal Server Error",
      },
      {
        status: 500,
      }
    );
  }
}
