// app/api/posts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getCurrentUser } from "@/lib/session";
import { getPostInclude } from "@/lib/prisma/postInclude";

const createPostSchema = z.object({
  content: z.string().max(280).optional(),
  mediaUrls: z.array(z.string().url()).max(4).default([]),
  replyToId: z.string().optional(),
  quoteOfId: z.string().optional(),
  expectedUserId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor");
    const limit = parseInt(searchParams.get("limit") || "10");

    const posts = await prisma.post.findMany({
      where: { replyToId: null, quoteOfId: null },
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      orderBy: { createdAt: "desc" },
      include: getPostInclude(currentUser.id),
    });

    let nextCursor: string | undefined;
    if (posts.length > limit) nextCursor = posts.pop()!.id;

    return NextResponse.json({ posts, nextCursor });
  } catch (error) {
    console.error("Error fetching posts:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
     const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { content, mediaUrls, replyToId, quoteOfId, expectedUserId } =
      createPostSchema.parse(body);

    if (expectedUserId && expectedUserId !== currentUser.id) {
      return NextResponse.json(
        { error: "Session mismatch", code: "SESSION_MISMATCH" },
        { status: 409 }
      );
    }
    const [post] = await prisma.$transaction(async (tx) => {
      const newPost = await tx.post.create({
        data: { content, mediaUrls, authorId: currentUser.id, replyToId, quoteOfId },
        include: getPostInclude(currentUser.id),
      });

      const updates: Promise<unknown>[] = [];
      if (replyToId) updates.push(tx.post.update({ where: { id: replyToId }, data: { replyCount: { increment: 1 } } }));
      if (quoteOfId) updates.push(tx.post.update({ where: { id: quoteOfId }, data: { quoteCount: { increment: 1 } } }));
      await Promise.all(updates);

      return [newPost];
    });

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError)
return NextResponse.json({ error: "Validation failed", details: error.issues }, { status: 400 });
    console.error("Error creating post:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
