// app/api/auth/me/route.ts
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { toSafeUser } from "@/lib/utils";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(null);
  }
  return NextResponse.json(toSafeUser(user));
}
