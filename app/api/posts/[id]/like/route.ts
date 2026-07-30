import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: postId } = await params;

  await prisma.like.upsert({
    where: { userId_postId: { userId: user.id, postId } },
    create: { userId: user.id, postId },
    update: {},
  });
  return NextResponse.json({ liked: true });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: postId } = await params;

  await prisma.like.deleteMany({ where: { userId: user.id, postId } });
  return NextResponse.json({ liked: false });
}
