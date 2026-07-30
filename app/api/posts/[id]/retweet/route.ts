import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.post.deleteMany({
    where: { authorId: user.id, type: "RETWEET", originalPostId: params.id },
  });

  const post = await prisma.post.findUnique({
    where: { id: params.id },
    include: {
      author: { select: { id: true, username: true, name: true, avatarUrl: true } },
      likes: { select: { userId: true } },
      retweets: { select: { authorId: true } },
      replies: { select: { id: true } },
    },
  });

  return NextResponse.json(post);
}
