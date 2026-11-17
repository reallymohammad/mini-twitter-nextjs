// app/[locale]/(main)/notifications/requests/page.tsx
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { FollowRequestItem } from "@/components/user/FollowRequestItem";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function FollowRequestsPage({ params }: PageProps) {
  const { locale } = await params;
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect(`/${locale}/login`);
  }

  // اگر اکانت کاربر پرایوت نباشد عملاً ریکوئستی نخواهد داشت، اما کوئری را امن اجرا می‌کنیم
  const requests = await prisma.follow.findMany({
    where: {
      followingId: currentUser.id,
      status: "PENDING",
    },
    include: {
      follower: {
        select: {
          id: true,
          username: true,
          fullName: true,
          avatarUrl: true,
          bio: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="min-h-screen border-x border-border pb-10">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 flex items-center gap-6 border-b border-border bg-background/80 px-4 py-3 backdrop-blur">
        <Link
          href={`/${locale}/notifications`}
          className="rounded-full p-2 hover:bg-muted transition"
          aria-label="Back"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div>
          <h1 className="text-lg font-bold leading-5">Follow requests</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {requests.length} pending {requests.length === 1 ? "request" : "requests"}
          </p>
        </div>
      </div>

      {/* Requests List */}
      <div className="divide-y divide-border">
        {requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <h2 className="text-xl font-bold text-foreground">You have no follow requests</h2>
            <p className="mt-1 text-sm text-muted-foreground max-w-xs">
              When people ask to follow you, their requests will appear here.
            </p>
          </div>
        ) : (
          requests.map((req) => (
            <FollowRequestItem
              key={req.follower.id}
              locale={locale}
              user={req.follower}
            />
          ))
        )}
      </div>
    </div>
  );
}
