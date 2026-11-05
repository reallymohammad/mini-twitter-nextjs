// app/api/search/suggestions/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { searchUsers } from "@/lib/search/query";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (q.length < 1) {
    return NextResponse.json({ users: [] });
  }

  const user = await getCurrentUser();
  const viewerId = user?.id ?? null;

  try {
    const { items } = await searchUsers({ query: q, viewerId, limit: 6 });

    return NextResponse.json({
      users: items.map((u) => ({
        id: u.id,
        username: u.username,
        fullName: u.fullName,
        avatarUrl: u.avatarUrl,
        badge: u.badge ?? null,
        bio: u.bio ?? null,
        followersCount: u.followersCount ?? 0,
        isFollowedByViewer: u.isFollowedByViewer ?? false,
      })),
    });
  } catch (err) {
    console.error("[search/suggestions]", err);
    return NextResponse.json({ users: [] }, { status: 500 });
  }
}
