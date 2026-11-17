// lib/actions/follow-requests.ts
"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { revalidatePath } from "next/cache";

export async function acceptFollowRequest(followerId: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { ok: false, error: "Unauthorized" };
  }

  try {
    // استفاده از ایزولیشن سطح بالا برای جلوگیری از race condition
    await prisma.$transaction(
      async (tx) => {
        const follow = await tx.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId,
              followingId: currentUser.id,
            },
          },
        });

        if (!follow || follow.status !== "PENDING") {
          throw new Error("REQUEST_NOT_FOUND");
        }

        await tx.follow.update({
          where: {
            followerId_followingId: {
              followerId,
              followingId: currentUser.id,
            },
          },
          data: {
            status: "ACCEPTED",
          },
        });
      },
      {
        isolationLevel: "Serializable",
      }
    );

    revalidatePath("/[locale]/notifications/requests", "page");
    return { ok: true };
  } catch (error: any) {
    return { ok: false, error: error.message ?? "Failed to accept request" };
  }
}

export async function rejectFollowRequest(followerId: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { ok: false, error: "Unauthorized" };
  }

  try {
    await prisma.follow.deleteMany({
      where: {
        followerId,
        followingId: currentUser.id,
        status: "PENDING",
      },
    });

    revalidatePath("/[locale]/notifications/requests", "page");
    return { ok: true };
  } catch (error: any) {
    return { ok: false, error: error.message ?? "Failed to reject request" };
  }
}
