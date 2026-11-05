import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionCookiePayload, getActiveSessionId } from "@/lib/session";

export async function GET() {
  const payload = await getSessionCookiePayload();

  if (!payload?.sessionIds?.length) {
    return NextResponse.json({ sessions: [] });
  }

  const sessions = await prisma.session.findMany({
    where: {
      id: { in: payload.sessionIds },
      expiresAt: { gt: new Date() },
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          fullName: true,
          avatarUrl: true,
          deletedAt: true,
        },
      },
    },
  });

  const activeSessionId = await getActiveSessionId();

 const result = sessions
  .filter((s) => s.user.deletedAt === null)
  .map((s) => ({
    id: s.id,                        // ← sessionId → id
    username: s.user.username,       // ← flat
    fullName: s.user.fullName,       // ← flat
    avatarUrl: s.user.avatarUrl,     // ← flat
    isActive: s.id === activeSessionId,
  }));

  return NextResponse.json({ sessions: result });
}
