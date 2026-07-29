// app/api/auth/signup/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { isValidEmail, sanitizeIdentifier } from "@/lib/auth/validators";

interface SignupBody {
  fullName: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  locale?: string;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<SignupBody>;
    const { fullName, username, email, password, confirmPassword, locale = "en" } = body;

    if (!fullName || !username || !email || !password || !confirmPassword) {
      return NextResponse.json({ error: "All fields are required." }, { status: 400 });
    }

    const trimmedFullName = fullName.trim();
    const normalizedEmail = sanitizeIdentifier(email);
    const normalizedUsername = sanitizeIdentifier(username);

    if (!isValidEmail(normalizedEmail)) {
      return NextResponse.json({ error: "Invalid email format." }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });
    }

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email: normalizedEmail }, { username: normalizedUsername }] },
      select: { email: true, username: true },
    });

    if (existingUser) {
      const field = existingUser.email === normalizedEmail ? "email" : "username";
      return NextResponse.json({ error: `This ${field} is already taken.`, field }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: { fullName: trimmedFullName, username: normalizedUsername, email: normalizedEmail, passwordHash },
    });

    (await cookies()).set("userId", user.id, { httpOnly: true, path: "/" });

    return NextResponse.json({ redirectTo: `/${locale}/${user.username}` }, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const target = (err.meta?.target as string[] | undefined)?.[0];
      return NextResponse.json({ error: `This ${target ?? "field"} is already taken.` }, { status: 409 });
    }

    console.error("Signup error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
