import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { removeAccountSession, getSessionCookiePayload } from "@/lib/session";

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ userId: string }> } // params باید Promise باشد
) {
  const { userId } = await params;

  // پیدا کردن سشنی که متعلق به این userId است از کوکی
  const payload = await getSessionCookiePayload();
  if (payload) {
    const userSession = await prisma.session.findFirst({
      where: {
        id: { in: payload.sessionIds },
        userId: userId,
      },
      select: { id: true },
    });

    if (userSession) {
      await removeAccountSession(userSession.id);
    }
  }

  return NextResponse.json({ success: true });
}
