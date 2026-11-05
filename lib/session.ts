import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { parseDevice } from "@/lib/device";


const COOKIE_NAME = "session";
const SESSION_DURATION_DAYS = 30;
const SESSION_DURATION_DAYS_SHORT = 1; // remember = false

type SessionCookiePayload = {
  sessionIds: string[];
  activeSessionId: string;
};

function getExpiryDate(remember: boolean) {
  const days = remember ? SESSION_DURATION_DAYS : SESSION_DURATION_DAYS_SHORT;
  return new Date(Date.now() + days * 86400_000);
}

function getCookieOptions(remember: boolean) {
  const isProduction = process.env.NODE_ENV === "production" && process.env.VERCEL === "1";

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax" as const,
    path: "/",
    maxAge: remember
      ? SESSION_DURATION_DAYS * 86400
      : SESSION_DURATION_DAYS_SHORT * 86400,
  };
}


// ساخت سشن جدید در DB
export async function createSession(userId: string, remember = true) {
  const headersList = await headers();
  const ua = headersList.get("user-agent") ?? undefined;
  const ip = headersList.get("x-forwarded-for") ?? undefined;

  return prisma.session.create({
    data: {
      userId,
      device: parseDevice(ua),
      ip,
      expiresAt: getExpiryDate(remember),
    },
  });
}

// ورود عادی -> جایگزینی کامل کوکی
export async function setSessionCookie(sessionId: string, remember = true) {
  const cookieStore = await cookies();
  const payload: SessionCookiePayload = {
    sessionIds: [sessionId],
    activeSessionId: sessionId,
  };
  cookieStore.set(COOKIE_NAME, JSON.stringify(payload), getCookieOptions(remember));
}

// افزودن اکانت جدید به لیست موجود
export async function addAccountSession(sessionId: string, remember = true) {
  const cookieStore = await cookies();
  const current = await getSessionCookiePayload();
  const sessionIds = current
    ? Array.from(new Set([...current.sessionIds, sessionId]))
    : [sessionId];

  cookieStore.set(
    COOKIE_NAME,
    JSON.stringify({ sessionIds, activeSessionId: sessionId }),
    getCookieOptions(remember)
  );
}

// خواندن کوکی خام (اکنون export شده - استفاده در route handlerها هم لازمه)
export async function getSessionCookiePayload(): Promise<SessionCookiePayload | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionCookiePayload;
  } catch {
    return null;
  }
}

// گرفتن فقط id سشن فعال، بدون query به DB (سبک، برای middleware/چک سریع)
export async function getActiveSessionId(): Promise<string | null> {
  const payload = await getSessionCookiePayload();
  return payload?.activeSessionId ?? null;
}

// گرفتن کاربر جاری (استفاده در server components / route handlers)
export async function getCurrentUser() {
  const activeSessionId = await getActiveSessionId();
  if (!activeSessionId) return null;

  const session = await prisma.session.findUnique({
    where: { id: activeSessionId },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) {
    return null;
  }

  return session.user;
}

// سوییچ بین اکانت‌های موجود در کوکی
export async function switchAccount(sessionId: string) {
  const payload = await getSessionCookiePayload();
  if (!payload || !payload.sessionIds.includes(sessionId)) {
    throw new Error("Session not found in current cookie");
  }

  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session || session.expiresAt < new Date()) {
    throw new Error("Session expired");
  }

  const cookieStore = await cookies();
  cookieStore.set(
    COOKIE_NAME,
    JSON.stringify({ ...payload, activeSessionId: sessionId }),
    getCookieOptions(true)
  );

  return session;
}

// خروج از یک اکانت خاص
export async function removeAccountSession(sessionId: string) {
  await prisma.session.delete({ where: { id: sessionId } }).catch(() => null);

  const payload = await getSessionCookiePayload();
  if (!payload) return;

  const remaining = payload.sessionIds.filter((id) => id !== sessionId);
  const cookieStore = await cookies();

  if (remaining.length === 0) {
    cookieStore.delete(COOKIE_NAME);
    return;
  }

  const activeSessionId =
    payload.activeSessionId === sessionId ? remaining[0] : payload.activeSessionId;

  cookieStore.set(
    COOKIE_NAME,
    JSON.stringify({ sessionIds: remaining, activeSessionId }),
    getCookieOptions(true)
  );
}

// خروج کامل از همه اکانت‌ها
export async function clearAllSessions() {
  const payload = await getSessionCookiePayload();
  if (payload) {
    await prisma.session.deleteMany({
      where: { id: { in: payload.sessionIds } },
    });
  }
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
