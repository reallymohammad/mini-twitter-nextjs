// app/api/block/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

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
      { error: "Cannot block yourself" },
      { status: 400 }
    );
  }

  try {
    await prisma.$transaction(
      async (tx) => {
        // ۱. ایجاد رکورد بلاک
        await tx.block.upsert({
          where: {
            blockerId_blockedId: {
              blockerId: currentUser.id,
              blockedId: targetUserId,
            },
          },
          create: {
            blockerId: currentUser.id,
            blockedId: targetUserId,
          },
          update: {},
        });

        // ۲. حذف روابط فالو از هر دو طرف (چه ACCEPTED چه PENDING)
        await tx.follow.deleteMany({
          where: {
            OR: [
              { followerId: currentUser.id, followingId: targetUserId },
              { followerId: targetUserId, followingId: currentUser.id },
            ],
          },
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      }
    );

    return NextResponse.json({ ok: true, isBlocked: true });
  } catch (error) {
    console.error("Block error:", error);
    return NextResponse.json(
      { error: "Failed to block user" },
      { status: 500 }
    );
  }
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

  await prisma.block.deleteMany({
    where: {
      blockerId: currentUser.id,
      blockedId: targetUserId,
    },
  });

  return NextResponse.json({ ok: true, isBlocked: false });
}
export async function GET(req: NextRequest) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const targetUserId = req.nextUrl.searchParams.get("targetUserId");

  if (!targetUserId?.trim()) {
    return NextResponse.json(
      { error: "targetUserId is required" },
      { status: 400 },
    );
  }

  const [outgoing, incoming] = await Promise.all([
    prisma.block.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: currentUser.id,
          blockedId: targetUserId,
        },
      },
      select: { blockerId: true },
    }),
    prisma.block.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: targetUserId,
          blockedId: currentUser.id,
        },
      },
      select: { blockerId: true },
    }),
  ]);

  return NextResponse.json({
    hasBlockedThem: outgoing !== null,
    isBlockedByThem: incoming !== null,
  });
}
