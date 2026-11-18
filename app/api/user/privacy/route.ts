import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function PATCH(req: NextRequest) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("isPrivate" in body) ||
    typeof body.isPrivate !== "boolean"
  ) {
    return NextResponse.json(
      { error: "isPrivate must be a boolean" },
      { status: 400 },
    );
  }

  const updated = await prisma.user.update({
    where: { id: currentUser.id },
    data: {
      isPrivate: body.isPrivate,
    },
    select: {
      isPrivate: true,
    },
  });

  return NextResponse.json(updated);
}
