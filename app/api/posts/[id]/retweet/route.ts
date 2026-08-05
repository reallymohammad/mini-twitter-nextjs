import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: retweetOfId } = await params;

  const existing = await prisma.post.findFirst({
    where: { authorId: user.id, type: "RETWEET", retweetOfId },
  });
  if (existing) return NextResponse.json({ retweeted: true });

  await prisma.post.create({
    data: { type: "RETWEET", authorId: user.id, retweetOfId, content: null },
  });
  return NextResponse.json({ retweeted: true }, { status: 201 });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: retweetOfId } = await params;

  await prisma.post.deleteMany({
    where: { authorId: user.id, type: "RETWEET", retweetOfId },
  });
  return NextResponse.json({ retweeted: false });
}
