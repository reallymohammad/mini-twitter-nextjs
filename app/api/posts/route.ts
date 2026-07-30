import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  content: z.string().max(280),
  type: z.enum(["POST", "REPLY", "RETWEET", "QUOTE"]),
  parentId: z.string().optional(),
  originalPostId: z.string().optional(),
  quotedPostId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  const { content, type, parentId, originalPostId, quotedPostId } = body.data;

  const post = await prisma.post.create({
    data: {
      content,
      type,
      authorId: user.id,
      parentId,
      originalPostId,
      quotedPostId,
    },
    include: {
      author: { select: { id: true, username: true, name: true, avatarUrl: true } },
      likes: { select: { userId: true } },
      retweets: { select: { authorId: true } },
      replies: { select: { id: true } },
      quotedPost: {
        include: {
          author: { select: { id: true, username: true, name: true, avatarUrl: true } },
          likes: { select: { userId: true } },
          retweets: { select: { authorId: true } },
          replies: { select: { id: true } },
        },
      },
    },
  });

  return NextResponse.json(post, { status: 201 });
}
