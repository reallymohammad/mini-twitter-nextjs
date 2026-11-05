import { getCurrentUser, getSessionCookiePayload } from "@/lib/session";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null }, { status: 401 });

  const sessionPayload = await getSessionCookiePayload();

  return NextResponse.json({
    user: {
      username: user.username,
      fullName: user.fullName ?? user.username,
      avatarUrl: user.avatarUrl,
    },
    sessionId: sessionPayload?.activeSessionId ?? null,
  });
}
