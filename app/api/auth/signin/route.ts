import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sanitizeIdentifier } from "@/lib/auth/validators";
import { toSafeUser } from "@/lib/auth/serialize-user";

interface SigninBody {
  emailOrUsername: string;
  password: string;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<SigninBody>;
    const { emailOrUsername, password } = body;

    if (!emailOrUsername || !password) {
      return NextResponse.json(
        { error: "Email/username and password are required." },
        { status: 400 }
      );
    }

    const identifier = sanitizeIdentifier(emailOrUsername);

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { username: identifier }],
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials." },
        { status: 401 }
      );
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatches) {
      return NextResponse.json(
        { error: "Invalid credentials." },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { user: toSafeUser(user) },
      { status: 200 }
    );
  } catch (err) {
    console.error("Signin error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
