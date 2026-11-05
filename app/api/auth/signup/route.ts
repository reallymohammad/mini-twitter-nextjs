import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession, setSessionCookie } from "@/lib/session";
import { authRateLimit, getClientIp } from "@/lib/rateLimit";
import { toSafeUser } from "@/lib/utils";

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

const signupSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      USERNAME_REGEX,
      "Username must be 3-20 characters (letters, numbers, underscore only)."
    ),
  email: z.string().trim().toLowerCase().email("Invalid email address."),
  fullName: z.string().trim().min(1, "Full name is required.").max(50),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(72, "Password is too long."),
  locale: z.string().min(2).max(5),
});

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const { success } = await authRateLimit.limit(ip);

  if (!success) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 }
    );
  }

  const { username, email, fullName, password, locale } = parsed.data;

  const existingUser = await prisma.user.findFirst({
    where: { OR: [{ username }, { email }] },
  });

  if (existingUser) {
    const field = existingUser.username === username ? "Username" : "Email";
    return NextResponse.json(
      { error: `${field} already exists.` },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: { username, email, fullName, passwordHash },
  });

  const session = await createSession(user.id, false);
  await setSessionCookie(session.id, false);

  return NextResponse.json(
    { user: toSafeUser(user), redirectTo: `/${locale}/${user.username}` },
    { status: 201 }
  );
}
