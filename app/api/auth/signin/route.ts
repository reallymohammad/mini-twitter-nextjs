import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession, setSessionCookie, addAccountSession } from "@/lib/session";
import { authRateLimit, getClientIp } from "@/lib/rateLimit";
import { toSafeUser } from "@/lib/utils";

const signinSchema = z.object({
  identifier: z.string().min(1, "Username or email is required."),
  password: z.string().min(1, "Password is required."),
  remember: z.boolean().optional().default(false),
  locale: z.string().min(2).max(5),
  mode: z.enum(["new", "add"]).optional().default("new"),
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
  const parsed = signinSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 }
    );
  }

  const { identifier, password, remember, locale, mode } = parsed.data;
  const normalizedIdentifier = identifier.trim().toLowerCase();

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { username: normalizedIdentifier },
        { email: normalizedIdentifier },
      ],
    },
  });

  const invalidCredentialsResponse = NextResponse.json(
    { error: "Invalid credentials." },
    { status: 401 }
  );

  if (!user || !user.passwordHash) {
    return invalidCredentialsResponse;
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    return invalidCredentialsResponse;
  }

  const session = await createSession(user.id, remember);

  if (mode === "add") {
    await addAccountSession(session.id, remember);
  } else {
    await setSessionCookie(session.id, remember);
  }

  return NextResponse.json(
    {
      user: toSafeUser(user),
      redirectTo: `/${locale}/${user.username}`,
    },
    { status: 200 }
  );
}
