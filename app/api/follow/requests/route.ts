import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requests = await prisma.follow.findMany({
    where: {
      followingId: currentUser.id,
      status: "PENDING",
    },
    orderBy: { createdAt: "desc" },
    select: {
      followerId: true,
      createdAt: true,
      follower: {
        select: {
          id: true,
          username: true,
          fullName: true,
          avatarUrl: true,
          bio: true,
        },
      },
    },
  });

  return NextResponse.json({ requests });
}

export async function PATCH(req: NextRequest) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const followerId = body?.followerId;

  if (typeof followerId !== "string" || !followerId) {
    return NextResponse.json(
      { error: "followerId is required" },
      { status: 400 }
    );
  }

  const result = await prisma.follow.updateMany({
    where: {
      followerId,
      followingId: currentUser.id,
      status: "PENDING",
    },
    data: { status: "ACCEPTED" },
  });

  if (result.count === 0) {
    return NextResponse.json(
      { error: "Pending request not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const followerId = body?.followerId;

  if (typeof followerId !== "string" || !followerId) {
    return NextResponse.json(
      { error: "followerId is required" },
      { status: 400 }
    );
  }

  await prisma.follow.deleteMany({
    where: {
      followerId,
      followingId: currentUser.id,
      status: "PENDING",
    },
  });

  return NextResponse.json({ ok: true });
}
