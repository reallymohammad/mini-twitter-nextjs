import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import {
  getPostInclude,
  getVisiblePostWhere,
  sanitizePostRelations,
} from "@/lib/prisma/postInclude";
import { getCurrentUser } from "@/lib/session";
import { createNotification } from "@/lib/notifications/service";

export const runtime = "nodejs";

class ReferencedPostNotFoundError extends Error {}
class PrivatePostQuoteError extends Error {}

const createPostSchema = z.object({
  content: z.string().max(280).nullish(),
  mediaUrls: z.array(z.string().url()).max(4).default([]),
  replyToId: z.string().min(1).nullish(),
  quoteOfId: z.string().min(1).nullish(),
  quotedPostId: z.string().min(1).nullish(),
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

      if (!retryable || attempt === 2) {
        throw error;
      }
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
    const parsedLimit = parseInt(
      searchParams.get("limit") || "10",
      10
    );

    const limit = Number.isFinite(parsedLimit)
      ? Math.min(Math.max(parsedLimit, 1), 50)
      : 10;

    const posts = await prisma.post.findMany({
      where: {
        replyToId: null,
        deletedAt: null,
        ...getVisiblePostWhere(currentUser.id),
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
      posts.pop();
      nextCursor = posts[posts.length - 1]?.id;
    }

    return NextResponse.json({
      posts: posts.map((post) =>
        sanitizePostRelations(post, currentUser.id)
      ),
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
    const parsedBody = createPostSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parsedBody.error.issues,
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
    } = parsedBody.data;

    if (expectedUserId && expectedUserId !== currentUser.id) {
      return NextResponse.json(
        {
          error: "Session mismatch",
          code: "SESSION_MISMATCH",
        },
        { status: 409 }
      );
    }

    if (quoteOfId && quotedPostId && quoteOfId !== quotedPostId) {
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

    const created = await retrySerializable(() =>
      prisma.$transaction(
        async (tx) => {
          const referencedPosts =
            refIds.length > 0
              ? await tx.post.findMany({
                  where: {
                    id: { in: refIds },
                    deletedAt: null,
                    ...getVisiblePostWhere(currentUser.id),
                  },
                  select: {
                    id: true,
                    authorId: true,
                    author: {
                      select: { isPrivate: true },
                    },
                  },
                })
              : [];

          if (referencedPosts.length !== refIds.length) {
            throw new ReferencedPostNotFoundError();
          }

          if (targetQuoteId) {
            const quotedPost = referencedPosts.find(
              (item) => item.id === targetQuoteId
            );

            if (!quotedPost) {
              throw new ReferencedPostNotFoundError();
            }

            if (quotedPost.author.isPrivate) {
              throw new PrivatePostQuoteError();
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
                ...getVisiblePostWhere(currentUser.id),
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
                ...getVisiblePostWhere(currentUser.id),
              },
              data: {
                quoteCount: { increment: 1 },
              },
            });

            if (updated.count === 0) {
              throw new ReferencedPostNotFoundError();
            }
          }

          const replyRecipientId = targetReplyId
            ? referencedPosts.find(
                (item) => item.id === targetReplyId
              )?.authorId ?? null
            : null;

          const quoteRecipientId = targetQuoteId
            ? referencedPosts.find(
                (item) => item.id === targetQuoteId
              )?.authorId ?? null
            : null;

          return {
            post: newPost,
            replyRecipientId,
            quoteRecipientId,
          };
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          maxWait: 5000,
          timeout: 15000,
        }
      )
    );

    const notificationJobs: Promise<unknown>[] = [];

    if (created.replyRecipientId) {
      notificationJobs.push(
        createNotification({
          type: "REPLY",
          recipientId: created.replyRecipientId,
          actorId: currentUser.id,
          postId: created.post.id,
        })
      );
    }

    if (created.quoteRecipientId) {
      notificationJobs.push(
        createNotification({
          type: "QUOTE",
          recipientId: created.quoteRecipientId,
          actorId: currentUser.id,
          postId: created.post.id,
        })
      );
    }

    const notificationResults = await Promise.allSettled(notificationJobs);

    for (const result of notificationResults) {
      if (result.status === "rejected") {
        console.error(
          "[POST] Notification creation failed:",
          result.reason
        );
      }
    }

    return NextResponse.json(
      sanitizePostRelations(created.post, currentUser.id),
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ReferencedPostNotFoundError) {
      return NextResponse.json(
        { error: "Referenced post not found" },
        { status: 404 }
      );
    }

    if (error instanceof PrivatePostQuoteError) {
      return NextResponse.json(
        {
          error: "Cannot quote a private account's post",
          code: "PRIVATE_POST_QUOTE",
        },
        { status: 403 }
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
