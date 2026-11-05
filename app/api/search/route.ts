import { NextRequest, NextResponse } from "next/server";
import { searchUsers, searchPostsTop } from "@/lib/search/query";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

function serializeBigInt<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_, item) =>
      typeof item === "bigint" ? Number(item) : item
    )
  );
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const q = searchParams.get("q")?.trim() ?? "";
  const type = searchParams.get("type") ?? "all";

  const parsedLimit = Number(searchParams.get("limit") ?? "4");
  const limit = Number.isFinite(parsedLimit)
    ? Math.min(Math.max(Math.floor(parsedLimit), 1), 10)
    : 4;

  if (!q) {
    return NextResponse.json({
      users: { items: [], hasMore: false },
      posts: { items: [], nextCursor: null },
    });
  }

  try {
    const sessionUser = await getCurrentUser();
    const viewerId = sessionUser?.id ?? null;

    const shouldSearchUsers = type !== "posts";
    const shouldSearchPosts = type !== "people";

    const usersPromise = shouldSearchUsers
      ? searchUsers({ query: q, viewerId, limit })
      : Promise.resolve({ items: [], hasMore: false });

    const postsPromise = shouldSearchPosts
      ? searchPostsTop({ query: q, viewerId, limit })
      : Promise.resolve({ items: [], nextCursor: null });

    const [users, posts] = await Promise.all([
      usersPromise,
      postsPromise,
    ]);

    return NextResponse.json(
      serializeBigInt({
        users,
        posts,
      })
    );
  } catch (error) {
    console.error("[API Search Error]:", error);

    return NextResponse.json(
      {
        error: "Search failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
