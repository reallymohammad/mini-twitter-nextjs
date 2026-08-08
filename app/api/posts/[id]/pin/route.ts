// app/api/posts/[id]/pin/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(
  _req: NextRequest,
  { params }: RouteContext
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id: postId } = await params;

    const post = await prisma.post.findUnique({
      where: {
        id: postId,
      },
      select: {
        id: true,
        authorId: true,
      },
    });

    if (!post) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }

    // فقط نویسنده پست می‌تواند آن را پین کند
    if (post.authorId !== user.id) {
      return NextResponse.json(
        { error: "You can only pin your own post" },
        { status: 403 }
      );
    }

    const pinned = await prisma.$transaction(async (tx) => {
      // چون در این طراحی هر کاربر فقط یک پست پین می‌کند،
      // پین قبلی حذف می‌شود.
      await tx.pinnedPost.deleteMany({
        where: {
          userId: user.id,
        },
      });

      return tx.pinnedPost.create({
        data: {
          userId: user.id,
          postId: post.id,
          order: 0,
        },
      });
    });

    return NextResponse.json(
      {
        success: true,
        pinned,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("PIN_POST_ERROR:", error);

    return NextResponse.json(
      { error: "Failed to pin post" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: RouteContext
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id: postId } = await params;

    const post = await prisma.post.findUnique({
      where: {
        id: postId,
      },
      select: {
        id: true,
        authorId: true,
      },
    });

    if (!post) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }

    // فقط نویسنده پست می‌تواند پین آن را حذف کند
    if (post.authorId !== user.id) {
      return NextResponse.json(
        { error: "You can only unpin your own post" },
        { status: 403 }
      );
    }

    const result = await prisma.pinnedPost.deleteMany({
      where: {
        userId: user.id,
        postId: post.id,
      },
    });

    return NextResponse.json({
      success: true,
      deleted: result.count > 0,
    });
  } catch (error) {
    console.error("UNPIN_POST_ERROR:", error);

    return NextResponse.json(
      { error: "Failed to unpin post" },
      { status: 500 }
    );
  }
}
