import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const blockedUsers = await prisma.user.findMany({
    where: {
      deletedAt: null,
      blockedBy: {
        some: { blockerId: currentUser.id },
      },
    },
    select: {
      id: true,
      fullName: true,
      username: true,
      avatarUrl: true,
      bio: true,
    },
    orderBy: { username: "asc" },
  });

  return NextResponse.json(blockedUsers);
}
