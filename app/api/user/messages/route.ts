import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const dmPermissions = [
  "EVERYONE",
  "FOLLOWERS",
  "FOLLOWING",
  "MUTUALS",
  "NOBODY",
] as const;

type DmPermissionValue = (typeof dmPermissions)[number];

function isDmPermission(value: unknown): value is DmPermissionValue {
  return dmPermissions.some((permission) => permission === value);
}

export async function GET() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const settings = await prisma.userSettings.findUnique({
      where: { userId: currentUser.id },
      select: {
        dmPermission: true,
        showReadReceipts: true,
      },
    });

    return NextResponse.json(
      {
        dmPermission: settings?.dmPermission ?? "EVERYONE",
        showReadReceipts: settings?.showReadReceipts ?? true,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    console.error("Get message settings error:", error);

    return NextResponse.json(
      { error: "Failed to load message settings" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawBody: unknown = await req.json().catch(() => null);

  if (
    !rawBody ||
    typeof rawBody !== "object" ||
    Array.isArray(rawBody)
  ) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const body = rawBody as Record<string, unknown>;
  const keys = Object.keys(body);

  if (
    keys.length === 0 ||
    keys.some(
      (key) =>
        key !== "dmPermission" && key !== "showReadReceipts",
    )
  ) {
    return NextResponse.json(
      { error: "Only dmPermission and showReadReceipts can be updated" },
      { status: 400 },
    );
  }

  const updates: {
    dmPermission?: DmPermissionValue;
    showReadReceipts?: boolean;
  } = {};

  if ("dmPermission" in body) {
    if (!isDmPermission(body.dmPermission)) {
      return NextResponse.json(
        { error: "Invalid dmPermission" },
        { status: 400 },
      );
    }

    updates.dmPermission = body.dmPermission;
  }

  if ("showReadReceipts" in body) {
    if (typeof body.showReadReceipts !== "boolean") {
      return NextResponse.json(
        { error: "showReadReceipts must be a boolean" },
        { status: 400 },
      );
    }

    updates.showReadReceipts = body.showReadReceipts;
  }

  try {
    const settings = await prisma.userSettings.upsert({
      where: { userId: currentUser.id },
      update: updates,
      create: {
        userId: currentUser.id,
        ...updates,
      },
      select: {
        dmPermission: true,
        showReadReceipts: true,
      },
    });

    return NextResponse.json(
      {
        dmPermission: settings.dmPermission,
        showReadReceipts: settings.showReadReceipts,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    console.error("Update message settings error:", error);

    return NextResponse.json(
      { error: "Failed to update message settings" },
      { status: 500 },
    );
  }
}
