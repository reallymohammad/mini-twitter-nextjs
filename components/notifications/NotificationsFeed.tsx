"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck, Loader2 } from "lucide-react";

import {
  getNotifications,
  markAllNotificationsAsRead,
} from "@/lib/notifications/actions";

import { groupNotifications } from "./groupNotifications";
import { NotificationItemCard } from "./NotificationItemCard";
import { NotificationTabs } from "./NotificationTabs";
import { NotificationsEmptyState } from "./NotificationsEmptyState";
import type { NotificationItem } from "./types";

interface NotificationsFeedProps {
  locale: string;
  currentFilter: "ALL" | "MENTIONS";
  initialNotifications: NotificationItem[];
  initialNextCursor?: string | null;
}

export function NotificationsFeed({
  locale,
  currentFilter,
  initialNotifications,
  initialNextCursor,
}: NotificationsFeedProps) {
  const router = useRouter();

  const [notifications, setNotifications] =
    useState<NotificationItem[]>(initialNotifications);

  const [nextCursor, setNextCursor] = useState<string | null>(
    initialNextCursor ?? null
  );

  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isPending, startTransition] = useTransition();

  // با تغییر تب یا داده‌ی دریافتی از سرور، فید را هماهنگ کن.
  useEffect(() => {
    setNotifications(initialNotifications);
    setNextCursor(initialNextCursor ?? null);
  }, [initialNotifications, initialNextCursor, currentFilter]);

  const handleTabChange = (filter: "ALL" | "MENTIONS") => {
    if (filter === currentFilter) return;

    const query = filter === "MENTIONS" ? "?filter=MENTIONS" : "";
    router.push(`/${locale}/notifications${query}`);
  };

  const handleMarkAllAsRead = () => {
    startTransition(async () => {
      try {
        await markAllNotificationsAsRead();

        setNotifications((current) =>
          current.map((notification) => ({
            ...notification,
            isRead: true,
          }))
        );

        router.refresh();
      } catch (error) {
        console.error("Failed to mark all notifications as read:", error);
      }
    });
  };

  const handleRead = (ids: string[]) => {
    const readIds = new Set(ids);

    setNotifications((current) =>
      current.map((notification) =>
        readIds.has(notification.id)
          ? { ...notification, isRead: true }
          : notification
      )
    );
  };

  const handleLoadMore = async () => {
    if (!nextCursor || isLoadingMore) return;

    setIsLoadingMore(true);

    try {
      const result = await getNotifications({
        cursor: nextCursor,
        limit: 20,
        filter: currentFilter,
      });

      setNotifications((current) => {
        const existingIds = new Set(
          current.map((notification) => notification.id)
        );

        const newNotifications = result.notifications.filter(
          (notification) => !existingIds.has(notification.id)
        );

        return [...current, ...newNotifications];
      });

      setNextCursor(result.nextCursor ?? null);
    } catch (error) {
      console.error("Failed to load more notifications:", error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const unreadCount = notifications.filter(
    (notification) => !notification.isRead
  ).length;

  const displayItems = groupNotifications(notifications);

  return (
    <div>
      <div className="flex items-center justify-between border-b border-border">
        <NotificationTabs
          currentFilter={currentFilter}
          onChange={handleTabChange}
        />

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllAsRead}
            disabled={isPending}
            className="mr-2 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            title="Mark all as read"
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CheckCheck className="size-4" />
            )}
            <span className="hidden sm:inline">Mark all read</span>
          </button>
        )}
      </div>

      <div className="divide-y divide-border">
        {displayItems.length === 0 ? (
          <NotificationsEmptyState filter={currentFilter} />
        ) : (
          displayItems.map((item) => (
            <NotificationItemCard
              key={
                item.kind === "single"
                  ? item.notification.id
                  : `follow-group-${item.notifications[0]?.id}`
              }
              item={item}
              locale={locale}
              onRead={handleRead}
            />
          ))
        )}
      </div>

      {nextCursor && (
        <div className="flex justify-center border-t border-border p-4">
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Loading...
              </>
            ) : (
              "Load more"
            )}
          </button>
        </div>
      )}
    </div>
  );
}
