// lib/actions/follow-requests.ts
"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { createNotification } from "@/lib/notifications/service";

export async function acceptFollowRequest(followerId: string) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return { ok: false, error: "Unauthorized" };
  }

  if (!followerId || followerId === currentUser.id) {
    return { ok: false, error: "Invalid follow request" };
  }

  try {
    const accepted = await prisma.$transaction(
      async (tx) => {
        const follow = await tx.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId,
              followingId: currentUser.id,
            },
          },
          select: {
            status: true,
          },
        });

        if (!follow || follow.status !== "PENDING") {
          return false;
        }

        const result = await tx.follow.updateMany({
          where: {
            followerId,
            followingId: currentUser.id,
            status: "PENDING",
          },
          data: {
            status: "ACCEPTED",
          },
        });

        if (result.count !== 1) {
          return false;
        }

        // پاک‌سازی اعلان موقت FOLLOW_REQUEST از اینباکس A
        await tx.notification.deleteMany({
          where: {
            recipientId: currentUser.id,
            actorId: followerId,
            type: "FOLLOW_REQUEST",
          },
        });

        return true;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    if (!accepted) {
      return { ok: false, error: "REQUEST_NOT_FOUND" };
    }

    // ۱. ساخت اعلان FOLLOW برای A تا برود داخل استکِ تجمیعیِ فالوهای A (با سایر فالوئرها)
    const followNotification = createNotification({
      type: "FOLLOW",
      recipientId: currentUser.id,
      actorId: followerId,
    });

    // ۲. ساخت اعلان FOLLOW_ACCEPT برای B تا مطلع شود درخواستش تایید شده است
    const acceptNotification = createNotification({
      type: "FOLLOW_ACCEPT",
      recipientId: followerId,
      actorId: currentUser.id,
    });

    await Promise.all([followNotification, acceptNotification]);

    revalidatePath("/[locale]/notifications", "page");
    revalidatePath("/[locale]/notifications/requests", "page");

    return { ok: true };
  } catch (error) {
    console.error("Failed to accept follow request:", error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      return {
        ok: false,
        error: "Follow request changed; please retry",
      };
    }

    return { ok: false, error: "Failed to accept request" };
  }
}

export async function rejectFollowRequest(followerId: string) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return { ok: false, error: "Unauthorized" };
  }

  if (!followerId || followerId === currentUser.id) {
    return { ok: false, error: "Invalid follow request" };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.follow.deleteMany({
        where: {
          followerId,
          followingId: currentUser.id,
          status: "PENDING",
        },
      });

      await tx.notification.deleteMany({
        where: {
          recipientId: currentUser.id,
          actorId: followerId,
          type: "FOLLOW_REQUEST",
        },
      });
    });

    revalidatePath("/[locale]/notifications", "page");
    revalidatePath("/[locale]/notifications/requests", "page");

    return { ok: true };
  } catch (error) {
    console.error("Failed to reject follow request:", error);
    return { ok: false, error: "Failed to reject request" };
  }
}
