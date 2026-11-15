import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function POST(req: NextRequest) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const targetUserId = body?.targetUserId;

  if (typeof targetUserId !== "string" || !targetUserId) {
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

  const result = await prisma.$transaction(async (tx) => {
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

    // فالو پذیرفته‌شده را با درخواست جدید به PENDING برنگردان.
    const status =
      existingFollow?.status === "ACCEPTED"
        ? "ACCEPTED"
        : targetUser.isPrivate
          ? "PENDING"
          : "ACCEPTED";

    await tx.follow.upsert({
      where,
      create: {
        followerId: currentUser.id,
        followingId: targetUserId,
        status,
      },
      update: { status },
    });

    return status;
  });

  if (!result) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, status: result });
}

export async function DELETE(req: NextRequest) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const targetUserId = body?.targetUserId;

  if (typeof targetUserId !== "string" || !targetUserId) {
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
