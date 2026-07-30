import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const postInclude = {
  author: { select: { id: true, username: true, name: true, avatarUrl: true } },
  likes: { select: { userId: true } },
  retweets: { select: { authorId: true } },
  replies: { select: { id: true } },
} as const;

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.like.findUnique({
    where: { userId_postId: { userId: user.id, postId: params.id } },
  });

  if (existing) {
    await prisma.like.delete({
      where: { userId_postId: { userId: user.id, postId: params.id } },
    });
  } else {
    await prisma.like.create({ data: { userId: user.id, postId: params.id } });
  }

  const post = await prisma.post.findUnique({ where: { id: params.id }, include: postInclude });
  return NextResponse.json(post);
}
