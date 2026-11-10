import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getCurrentUser } from "@/lib/session";
import { getPostInclude } from "@/lib/prisma/postInclude";

export const runtime = "nodejs";

class ReferencedPostNotFoundError extends Error {}

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

// حتی اگر پست‌هایی قبلاً بدون پاک‌کردن محتوا soft-delete شده باشند،
 // محتوای کوتِ حذف‌شده از این API برنگردد.
function hideDeletedQuote<T extends object>(post: T): T {
  const quote = "quoteOf" in post ? post.quoteOf : null;

  if (
    !quote ||
    typeof quote !== "object" ||
    !("deletedAt" in quote) ||
    !quote.deletedAt
  ) {
    return post;
  }

  return {
    ...post,
    quoteOf: {
      ...quote,
      content: null,
      mediaUrls: [],
    },
  } as T;
}

async function retrySerializable<T>(
  operation: () => Promise<T>
): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await operation();
    } catch (error) {
      const retryable =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034";

      if (!retryable || attempt === 2) throw error;
    }
  }

  throw new Error("Transaction retries exhausted");
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
      where: {
        replyToId: null,
        deletedAt: null,
      },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: [
        { createdAt: "desc" },
        { id: "desc" },
      ],
      include: getPostInclude(currentUser.id),
    });

    let nextCursor: string | undefined;

    if (posts.length > limit) {
      posts.pop(); // فقط رکورد اضافه برای تشخیص وجود صفحهٔ بعد
      nextCursor = posts[posts.length - 1].id;
    }

    return NextResponse.json({
      posts: posts.map(hideDeletedQuote),
      nextCursor,
    });
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
        {
          error: "Validation failed",
          details: result.error.issues,
        },
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

    if (
      quoteOfId &&
      quotedPostId &&
      quoteOfId !== quotedPostId
    ) {
      return NextResponse.json(
        { error: "Conflicting quoted post IDs" },
        { status: 400 }
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

      if (
        mediaUrls.some(
          (url) => !isAllowedCloudinaryImageUrl(url, cloudName)
        )
      ) {
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

    const refIds = [
      ...new Set(
        [targetReplyId, targetQuoteId].filter(
          (id): id is string => Boolean(id)
        )
      ),
    ];

    const post = await retrySerializable(() =>
      prisma.$transaction(
        async (tx) => {
          if (refIds.length > 0) {
            const found = await tx.post.findMany({
              where: {
                id: { in: refIds },
                deletedAt: null,
              },
              select: { id: true },
            });

            if (found.length !== refIds.length) {
              throw new ReferencedPostNotFoundError();
            }
          }

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

          if (targetReplyId) {
            const updated = await tx.post.updateMany({
              where: {
                id: targetReplyId,
                deletedAt: null,
              },
              data: {
                replyCount: { increment: 1 },
              },
            });

            if (updated.count === 0) {
              throw new ReferencedPostNotFoundError();
            }
          }

          if (targetQuoteId) {
            const updated = await tx.post.updateMany({
              where: {
                id: targetQuoteId,
                deletedAt: null,
              },
              data: {
                quoteCount: { increment: 1 },
              },
            });

            if (updated.count === 0) {
              throw new ReferencedPostNotFoundError();
            }
          }

          return newPost;
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          maxWait: 5000,
          timeout: 15000,
        }
      )
    );

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    if (error instanceof ReferencedPostNotFoundError) {
      return NextResponse.json(
        { error: "Referenced post not found" },
        { status: 404 }
      );
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      return NextResponse.json(
        { error: "Concurrent request; please retry" },
        { status: 409 }
      );
    }

    console.error("Error creating post:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
