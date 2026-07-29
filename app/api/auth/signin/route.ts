// app/api/auth/signin/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { sanitizeIdentifier } from "@/lib/auth/validators";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const emailOrUsername: string = body.emailOrUsername;
    const password: string = body.password;
    const locale: string = body.locale ?? "en";

    if (!emailOrUsername || !password) {
      return NextResponse.json(
        { error: "Email/username and password are required." },
        { status: 400 }
      );
    }

    const identifier = sanitizeIdentifier(emailOrUsername);

    const user = await prisma.user.findFirst({
      where: { OR: [{ email: identifier }, { username: identifier }] },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }

    (await cookies()).set("userId", user.id, { httpOnly: true, path: "/" });

    return NextResponse.json({ redirectTo: `/${locale}/${user.username}` });
  } catch (err) {
    console.error("Signin error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
