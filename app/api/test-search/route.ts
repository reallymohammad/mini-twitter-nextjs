import { NextRequest, NextResponse } from "next/server";
import { searchPostsTop, searchUsers } from "@/lib/search/query";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "a";

  try {
    const [posts, users] = await Promise.all([
      searchPostsTop({ query: q, viewerId: null }),
      searchUsers({ query: q, viewerId: null }),
    ]);

    return NextResponse.json({ posts, users });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
