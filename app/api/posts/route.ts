import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getCurrentUser } from "@/lib/session";
import { getPostInclude } from "@/lib/prisma/postInclude";

export const runtime = "nodejs";

const createPostSchema = z.object({
  content: z.string().max(280).nullish(),
  mediaUrls: z.array(z.string().url()).max(4).default([]),
  replyToId: z.string().min(1).nullish(),
  quoteOfId: z.string().min(1).nullish(),
  quotedPostId: z.string().min(1).nullish(), // legacy alias
  expectedUserId: z.string().optional(),
});

function isAllowedCloudinaryImageUrl(
  value: string,
  cloudName: string
): boolean {
  try {
    const url = new URL(value);

    return (
      url.protocol === "https:" &&
      url.hostname === "res.cloudinary.com" &&
      url.pathname.startsWith(`/${cloudName}/image/upload/`)
    );
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor");
    const parsedLimit = parseInt(searchParams.get("limit") || "10", 10);
    const limit = Number.isFinite(parsedLimit)
      ? Math.min(Math.max(parsedLimit, 1), 50)
      : 10;

    const posts = await prisma.post.findMany({
      where: { replyToId: null, deletedAt: null },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: "desc" },
      include: getPostInclude(currentUser.id),
    });

    let nextCursor: string | undefined;

    if (posts.length > limit) {
      nextCursor = posts.pop()!.id;
    }

    return NextResponse.json({ posts, nextCursor });
  } catch (error) {
    console.error("Error fetching posts:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => null);
    const result = createPostSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.issues },
        { status: 400 }
      );
    }

    const {
      content,
      mediaUrls,
      replyToId,
      quoteOfId,
      quotedPostId,
      expectedUserId,
    } = result.data;

    if (expectedUserId && expectedUserId !== currentUser.id) {
      return NextResponse.json(
        { error: "Session mismatch", code: "SESSION_MISMATCH" },
        { status: 409 }
      );
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();

    if (mediaUrls.length > 0) {
      if (!cloudName) {
        console.error("CLOUDINARY_CLOUD_NAME is missing");
        return NextResponse.json(
          { error: "Image upload is not configured" },
          { status: 500 }
        );
      }

      if (mediaUrls.some((url) => !isAllowedCloudinaryImageUrl(url, cloudName))) {
        return NextResponse.json(
          { error: "Invalid media URL" },
          { status: 400 }
        );
      }
    }

    const targetQuoteId = quoteOfId || quotedPostId || null;
    const targetReplyId = replyToId || null;
    const trimmedContent = content?.trim() || "";

    if (!trimmedContent && mediaUrls.length === 0 && !targetQuoteId) {
      return NextResponse.json(
        { error: "Post cannot be empty" },
        { status: 400 }
      );
    }

    // بررسی وجود پست‌های reply و quote و حذف‌نشدن آن‌ها
    const refIds = [targetReplyId, targetQuoteId].filter(
      (id): id is string => Boolean(id)
    );

    if (refIds.length > 0) {
      const found = await prisma.post.findMany({
        where: {
          id: { in: refIds },
          deletedAt: null,
        },
        select: { id: true },
      });

      const foundIds = new Set(found.map((post) => post.id));

      if (refIds.some((id) => !foundIds.has(id))) {
        return NextResponse.json(
          { error: "Referenced post not found" },
          { status: 404 }
        );
      }
    }

    const post = await prisma.$transaction(
      async (tx) => {
        const newPost = await tx.post.create({
          data: {
            content: trimmedContent || null,
            mediaUrls,
            authorId: currentUser.id,
            replyToId: targetReplyId,
            quoteOfId: targetQuoteId,
          },
          include: getPostInclude(currentUser.id),
        });

        const counterUpdates: Promise<unknown>[] = [];

        if (targetReplyId) {
          counterUpdates.push(
            tx.post.update({
              where: { id: targetReplyId },
              data: { replyCount: { increment: 1 } },
            })
          );
        }

        if (targetQuoteId) {
          counterUpdates.push(
            tx.post.update({
              where: { id: targetQuoteId },
              data: { quoteCount: { increment: 1 } },
            })
          );
        }

        if (counterUpdates.length > 0) {
          await Promise.all(counterUpdates);
        }

        return newPost;
      },
      { maxWait: 5000, timeout: 15000 }
    );

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error creating post:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
