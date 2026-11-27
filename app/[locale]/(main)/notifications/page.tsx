// app/[locale]/(main)/notifications/page.tsx
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Settings } from "lucide-react";

import { NotificationsFeed } from "@/components/notifications/NotificationsFeed";
import type { NotificationFilter } from "@/components/notifications/types";
import { getNotifications } from "@/lib/notifications/actions";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ filter?: string }>;
}

function getNotificationFilter(filter?: string): NotificationFilter {
  switch (filter) {
    case "VERIFIED":
      return "VERIFIED";

    case "MENTIONS":
      return "MENTIONS";

    case "ALL":
    default:
      return "ALL";
  }
}

export default async function NotificationsPage({
  params,
  searchParams,
}: PageProps) {
  const { locale } = await params;
  const { filter } = await searchParams;

  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect(`/${locale}/login`);
  }

  const currentFilter = getNotificationFilter(filter);

  const [pendingRequestsCount, initialData] = await Promise.all([
    prisma.follow.count({
      where: {
        followingId: currentUser.id,
        status: "PENDING",
      },
    }),
    getNotifications({
      limit: 20,
      filter: currentFilter,
    }),
  ]);

  return (
    <div className="min-h-screen border-x border-border pb-16">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/80 px-4 py-3 backdrop-blur">
        <h1 className="text-xl font-bold">Notifications</h1>

        <Link
          href={`/${locale}/settings/notifications`}
          className="rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          aria-label="Notification Settings"
        >
          <Settings className="size-5" />
        </Link>
      </div>

      {/* بنر درخواست‌های فالو */}
      {pendingRequestsCount > 0 && (
        <Link
          href={`/${locale}/notifications/requests`}
          className="group flex items-center justify-between border-b border-border px-4 py-3.5 transition hover:bg-muted/50"
        >
          <div>
            <p className="text-sm font-semibold text-foreground">
              Follow requests
            </p>

            <p className="mt-0.5 text-xs text-muted-foreground">
              {pendingRequestsCount} pending{" "}
              {pendingRequestsCount === 1 ? "request" : "requests"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="flex size-2 rounded-full bg-primary" />
            <ChevronRight className="size-4 text-muted-foreground transition group-hover:translate-x-0.5" />
          </div>
        </Link>
      )}

      <NotificationsFeed
        locale={locale}
        currentFilter={currentFilter}
        initialNotifications={initialData.notifications}
        initialNextCursor={initialData.nextCursor ?? null}
      />
    </div>
  );
}
