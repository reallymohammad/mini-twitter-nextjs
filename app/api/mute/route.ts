// app/api/mute/route.ts
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

  if (typeof targetUserId !== "string" || !targetUserId.trim()) {
    return NextResponse.json(
      { error: "targetUserId is required" },
      { status: 400 }
    );
  }

  if (targetUserId === currentUser.id) {
    return NextResponse.json(
      { error: "Cannot mute yourself" },
      { status: 400 }
    );
  }

  await prisma.mute.upsert({
    where: {
      muterId_mutedId: {
        muterId: currentUser.id,
        mutedId: targetUserId,
      },
    },
    create: {
      muterId: currentUser.id,
      mutedId: targetUserId,
    },
    update: {},
  });

  return NextResponse.json({ ok: true, isMuted: true });
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

  await prisma.mute.deleteMany({
    where: {
      muterId: currentUser.id,
      mutedId: targetUserId,
    },
  });

  return NextResponse.json({ ok: true, isMuted: false });
}
