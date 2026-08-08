// app/api/posts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { postSchema } from "@/lib/validators/post";
import { z } from "zod";
import { getCurrentUser } from "@/lib/session";
import { getPostInclude } from "@/lib/prisma/postInclude";

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor");
    const limit = parseInt(searchParams.get("limit") || "10");

    const posts = await prisma.post.findMany({
      where: { parentPostId: null },
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      orderBy: { createdAt: "desc" },
      include: getPostInclude(currentUser.id),
    });

    let nextCursor: string | undefined = undefined;
    if (posts.length > limit) {
      const nextItem = posts.pop();
      nextCursor = nextItem!.id;
    }

    return NextResponse.json({ posts, nextCursor });
  } catch (error) {
    console.error("Error fetching posts:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = postSchema.parse(body);

    const post = await prisma.post.create({
      data: {
        content: validatedData.content,
        imageUrl: validatedData.imageUrl,
        authorId: currentUser.id,
        ...(validatedData.parentId && {
          parentPostId: validatedData.parentId,
          type: "REPLY",
        }),
      },
      include: getPostInclude(currentUser.id),
    });

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error creating post:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
