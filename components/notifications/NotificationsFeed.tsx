"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import {
  getNotifications,
  markAllNotificationsAsRead,
} from "@/lib/notifications/actions";

import { groupNotifications } from "./groupNotifications";
import { NotificationItemCard } from "./NotificationItemCard";
import { NotificationTabs } from "./NotificationTabs";
import { NotificationsEmptyState } from "./NotificationsEmptyState";
import type { NotificationFilter, NotificationItem } from "./types";

export interface NotificationsFeedProps {
  locale: string;
  currentFilter: NotificationFilter;
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
    initialNextCursor ?? null,
  );

  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const autoReadKeyRef = useRef<string | null>(null);
  const autoReadInFlightRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setNotifications(initialNotifications);
    setNextCursor(initialNextCursor ?? null);
  }, [initialNotifications, initialNextCursor, currentFilter]);

  const unreadIdsKey = useMemo(() => {
    const ids = notifications
      .filter((notification) => !notification.isRead)
      .map((notification) => notification.id)
      .sort();

    return ids.length > 0 ? ids.join("|") : null;
  }, [notifications]);

  // ابتدا اعلان‌ها با هایلایت نمایش داده می‌شوند؛
  // سپس اعلان‌های همین تب پس از ۱.۵ ثانیه خوانده می‌شوند.
  useEffect(() => {
    if (!unreadIdsKey) return;

    const readKey = `${currentFilter}:${unreadIdsKey}`;

    if (autoReadInFlightRef.current) return;
    if (autoReadKeyRef.current === readKey) return;

    autoReadKeyRef.current = readKey;
    autoReadInFlightRef.current = true;

    const idsToMark = new Set(unreadIdsKey.split("|"));
    let requestStarted = false;

    const timer = setTimeout(() => {
      requestStarted = true;

      if (!isMountedRef.current) {
        autoReadInFlightRef.current = false;
        return;
      }

      const run = async () => {
        try {
          await markAllNotificationsAsRead(currentFilter);

          if (!isMountedRef.current) return;

          setNotifications((current) =>
            current.map((notification) =>
              idsToMark.has(notification.id) && !notification.isRead
                ? { ...notification, isRead: true }
                : notification,
            ),
          );

          router.refresh();
        } catch (error) {
          console.error("Failed to auto mark notifications as read:", error);

          if (autoReadKeyRef.current === readKey) {
            autoReadKeyRef.current = null;
          }
        } finally {
          autoReadInFlightRef.current = false;
        }
      };

      void run();
    }, 1500);

    return () => {
      clearTimeout(timer);

      // اگر تب عوض شد و تایمر هنوز اجرا نشده بود،
      // تب جدید می‌تواند تایمر خودش را بسازد.
      if (!requestStarted) {
        autoReadInFlightRef.current = false;

        if (autoReadKeyRef.current === readKey) {
          autoReadKeyRef.current = null;
        }
      }
    };
  }, [unreadIdsKey, currentFilter, router]);

  const handleTabChange = (filter: NotificationFilter) => {
    if (filter === currentFilter) return;

    const query =
      filter === "ALL" ? "" : `?filter=${encodeURIComponent(filter)}`;

    router.push(`/${locale}/notifications${query}`);
  };

  const handleRead = useCallback((ids: string[]) => {
    const readIds = new Set(ids);

    setNotifications((current) =>
      current.map((notification) =>
        readIds.has(notification.id) && !notification.isRead
          ? { ...notification, isRead: true }
          : notification,
      ),
    );
  }, []);

  const handleLoadMore = async () => {
    if (!nextCursor || isLoadingMore) return;

    setIsLoadingMore(true);

    try {
      const result = await getNotifications({
        cursor: nextCursor,
        limit: 20,
        filter: currentFilter,
      });

      if (!isMountedRef.current) return;

      setNotifications((current) => {
        const existingIds = new Set(
          current.map((notification) => notification.id),
        );

        const newNotifications = result.notifications.filter(
          (notification) => !existingIds.has(notification.id),
        );

        return [...current, ...newNotifications];
      });

      setNextCursor(result.nextCursor ?? null);
    } catch (error) {
      console.error("Failed to load more notifications:", error);
    } finally {
      if (isMountedRef.current) {
        setIsLoadingMore(false);
      }
    }
  };

  const displayItems = groupNotifications(notifications);

  return (
    <div>
      <div className="flex items-center justify-between border-b border-border">
        <NotificationTabs
          currentFilter={currentFilter}
          onChange={handleTabChange}
        />
      </div>

      <div className="divide-y border-b border-border">
        {displayItems.length === 0 ? (
          currentFilter === "VERIFIED" ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No verified notifications yet.
            </div>
          ) : (
            <NotificationsEmptyState filter={currentFilter} />
          )
        ) : (
          displayItems.map((item) => (
            <NotificationItemCard
              key={
                item.kind === "single"
                  ? item.notification.id
                  : `group-${item.notifications[0]?.id}`
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
            className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium transition hover:bg-muted disabled:opacity-50"
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

export default NotificationsFeed;
