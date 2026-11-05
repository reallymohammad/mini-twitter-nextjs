// app/api/posts/[id]/bookmark/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: postId } = await params;

    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post || post.deletedAt) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const existing = await prisma.bookmark.findUnique({
      where: { userId_postId: { userId: currentUser.id, postId } },
    });

    if (existing) {
      await prisma.$transaction([
        prisma.bookmark.delete({
          where: { userId_postId: { userId: currentUser.id, postId } },
        }),
        prisma.post.update({
          where: { id: postId },
          data: { bookmarkCount: { decrement: 1 } },
        }),
      ]);
      return NextResponse.json({ isBookmarked: false });
    }

    await prisma.$transaction([
      prisma.bookmark.create({ data: { userId: currentUser.id, postId } }),
      prisma.post.update({
        where: { id: postId },
        data: { bookmarkCount: { increment: 1 } },
      }),
    ]);
    return NextResponse.json({ isBookmarked: true });
  } catch (error) {
    console.error("POST /api/posts/[id]/bookmark error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
