import { NextResponse } from "next/server";
import { z } from "zod";
import { clearAllSessions, removeAccountSession, getSessionCookiePayload } from "@/lib/session";

const signoutSchema = z.object({
  userId: z.string().cuid().optional(),
  sessionId: z.string().cuid().optional(), // اضافه شد
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = signoutSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const { sessionId } = parsed.data;

  try {
    if (sessionId) {
      await removeAccountSession(sessionId);
      // بعد از حذف، ببین چی موند
      const remaining = await getSessionCookiePayload();
      if (remaining) {
        return NextResponse.json({
          success: true,
          switched: true,
          activeSessionId: remaining.activeSessionId,
        });
      } else {
        return NextResponse.json({ success: true, switched: false });
      }
    } else {
      await clearAllSessions();
      return NextResponse.json({ success: true, switched: false });
    }
  } catch {
    return NextResponse.json({ error: "Failed to sign out." }, { status: 500 });
  }
}
