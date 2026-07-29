import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { profileSchema } from "@/lib/validators/profile";

export async function PATCH(req: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0].message },
      { status: 400 }
    );
  }

  const { fullName, bio, location, website, birthDate, avatarUrl, coverImageUrl } =
    parsed.data;

  const updated = await prisma.user.update({
    where: { id: currentUser.id },
    data: {
      fullName,
      bio: bio || null,
      location: location || null,
      website: website || null,
      birthDate: birthDate ? new Date(birthDate) : null,
      avatarUrl: avatarUrl || null,
      coverImageUrl: coverImageUrl || null,
    },
    select: {
      id: true,
      fullName: true,
      username: true,
      bio: true,
      location: true,
      website: true,
      birthDate: true,
      avatarUrl: true,
      coverImageUrl: true,
    },
  });

  return NextResponse.json(updated);
}
