import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { createNotification } from "@/lib/notifications/service";

const MAX_ATTEMPTS = 3;

export async function POST(req: NextRequest) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => null);
  const targetUserId = body?.targetUserId;

  if (typeof targetUserId !== "string" || !targetUserId.trim()) {
    return NextResponse.json(
      { error: "targetUserId is required" },
      { status: 400 }
    );
  }

  if (targetUserId === currentUser.id) {
    return NextResponse.json(
      { error: "Cannot follow yourself" },
      { status: 400 }
    );
  }

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let followResult:
      | {
          status: string;
          shouldNotify: boolean;
        }
      | null;

    try {
      followResult = await prisma.$transaction(
        async (tx) => {
          const targetUser = await tx.user.findFirst({
            where: {
              id: targetUserId,
              deletedAt: null,
            },
            select: { isPrivate: true },
          });

          if (!targetUser) {
            return null;
          }

          const where = {
            followerId_followingId: {
              followerId: currentUser.id,
              followingId: targetUserId,
            },
          };

          const existingFollow = await tx.follow.findUnique({
            where,
            select: { status: true },
          });

          // فالو پذیرفته‌شده با درخواست تکراری به PENDING برنمی‌گردد.
          const nextStatus =
            existingFollow?.status === "ACCEPTED"
              ? "ACCEPTED"
              : targetUser.isPrivate
                ? "PENDING"
                : "ACCEPTED";

          const follow = await tx.follow.upsert({
            where,
            create: {
              followerId: currentUser.id,
              followingId: targetUserId,
              status: nextStatus,
            },
            update: {
              status: nextStatus,
            },
            select: { status: true },
          });

          return {
            status: follow.status,
            // درخواست تکراری نباید نوتیفیکیشن تکراری بسازد.
            shouldNotify: !existingFollow,
          };
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        }
      );
    } catch (error) {
      const isRetryable =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === "P2034" || error.code === "P2002");

      if (isRetryable && attempt < MAX_ATTEMPTS) {
        continue;
      }

      if (isRetryable) {
        return NextResponse.json(
          { error: "Follow conflict; please retry" },
          { status: 409 }
        );
      }

      console.error("Follow POST error:", error);

      return NextResponse.json(
        { error: "Internal Server Error" },
        { status: 500 }
      );
    }

    if (followResult === null) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    if (followResult.shouldNotify) {
      try {
        await createNotification({
          type: "FOLLOW",
          recipientId: targetUserId,
          actorId: currentUser.id,
        });
      } catch (notificationError) {
        console.error(
          "[FOLLOW] Notification creation failed:",
          notificationError
        );
      }
    }

    return NextResponse.json({
      ok: true,
      status: followResult.status,
    });
  }

  return NextResponse.json(
    { error: "Follow conflict; please retry" },
    { status: 409 }
  );
}

export async function DELETE(req: NextRequest) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => null);
  const targetUserId = body?.targetUserId;

  if (typeof targetUserId !== "string" || !targetUserId.trim()) {
    return NextResponse.json(
      { error: "targetUserId is required" },
      { status: 400 }
    );
  }

  await prisma.follow.deleteMany({
    where: {
      followerId: currentUser.id,
      followingId: targetUserId,
    },
  });

  return NextResponse.json({ ok: true });
}
