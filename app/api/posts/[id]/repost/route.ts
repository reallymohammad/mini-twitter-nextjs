import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: postId } = await params;

  const existing = await prisma.repost.findUnique({
    where: { userId_postId: { userId: user.id, postId } },
  });
  if (existing) return NextResponse.json({ reposted: true });

  await prisma.$transaction([
    prisma.repost.create({ data: { userId: user.id, postId } }),
    prisma.post.update({ where: { id: postId }, data: { repostCount: { increment: 1 } } }),
  ]);

  return NextResponse.json({ reposted: true }, { status: 201 });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: postId } = await params;

  const existing = await prisma.repost.findUnique({
    where: { userId_postId: { userId: user.id, postId } },
  });
  if (!existing) return NextResponse.json({ reposted: false });

  await prisma.$transaction([
    prisma.repost.delete({ where: { userId_postId: { userId: user.id, postId } } }),
    prisma.post.update({ where: { id: postId }, data: { repostCount: { decrement: 1 } } }),
  ]);

  return NextResponse.json({ reposted: false });
}
