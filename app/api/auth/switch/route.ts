import { NextResponse } from "next/server";
import { switchAccount } from "@/lib/session";
import { z } from "zod";

const schema = z.object({ sessionId: z.string().min(1) });

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  try {
    await switchAccount(parsed.data.sessionId);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Session not found or expired." },
      { status: 403 }
    );
  }
}
