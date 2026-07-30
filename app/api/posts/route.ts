import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { PostType } from "@prisma/client";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { type, content, imageUrl, parentPostId, retweetOfId } = body as {
    type: PostType;
    content?: string;
    imageUrl?: string;
    parentPostId?: string;
    retweetOfId?: string;
  };

  // Validation
  if (type === "POST" && !content && !imageUrl)
    return NextResponse.json({ error: "Content or image required" }, { status: 400 });
  if (type === "REPLY" && !parentPostId)
    return NextResponse.json({ error: "parentPostId required" }, { status: 400 });
  if ((type === "RETWEET" || type === "QUOTE") && !retweetOfId)
    return NextResponse.json({ error: "retweetOfId required" }, { status: 400 });
  if (type === "QUOTE" && !content)
    return NextResponse.json({ error: "Quote requires content" }, { status: 400 });

  // Prevent duplicate retweet
  if (type === "RETWEET") {
    const existing = await prisma.post.findFirst({
      where: { authorId: user.id, type: "RETWEET", retweetOfId },
    });
    if (existing) return NextResponse.json({ error: "Already retweeted" }, { status: 409 });
  }

  const post = await prisma.post.create({
    data: {
      type,
      content: type === "RETWEET" ? null : content ?? null,
      imageUrl: imageUrl ?? null,
      authorId: user.id,
      parentPostId: parentPostId ?? null,
      retweetOfId: retweetOfId ?? null,
    },
  });

  return NextResponse.json(post, { status: 201 });
}
