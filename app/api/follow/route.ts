import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const MAX_ATTEMPTS = 3;

export async function POST(req: NextRequest) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    try {
      const status = await prisma.$transaction(
        async (tx) => {
          const targetUser = await tx.user.findFirst({
            where: {
              id: targetUserId,
              deletedAt: null,
            },
            select: { isPrivate: true },
          });

          if (!targetUser) return null;

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

          // فالو پذیرفته‌شده هرگز با POST تکراری به PENDING برنگردد.
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
            update: { status: nextStatus },
            select: { status: true },
          });

          return follow.status;
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        }
      );

      if (status === null) {
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({ ok: true, status });
    } catch (error) {
      const isRetryable =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === "P2034" || error.code === "P2002");

      if (!isRetryable) throw error;

      if (attempt === MAX_ATTEMPTS) {
        return NextResponse.json(
          { error: "Follow conflict; please retry" },
          { status: 409 }
        );
      }
    }
  }

  // مسیر عادی اجرا هرگز به اینجا نمی‌رسد.
  throw new Error("Follow retry loop exited unexpectedly");
}

export async function DELETE(req: NextRequest) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
