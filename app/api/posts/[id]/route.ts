// app/api/posts/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: postId } = await params;

  // بررسی وجود پست و اینکه آیا متعلق به کاربر جاری است یا خیر
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { authorId: true },
  });

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  if (post.authorId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // حذف پست (Prisma به‌صورت آبشاری یا معمولی بسته به Schema شما موارد مرتبط مانند لایک‌ها را حذف می‌کند)
  await prisma.post.delete({
    where: { id: postId },
  });

  return NextResponse.json({ success: true });
}