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
import type { NotificationItem } from "./types";

export interface NotificationsFeedProps {
  locale: string;
  currentFilter: "ALL" | "MENTIONS";
  initialNotifications: NotificationItem[];
  initialNextCvrs0r?: string | null;
}

export function NotificationsFeed({
  locale,
  currentFilter,
  initialNotifications,
  initialNextCvrs0r,
}: NotificationsFeedProps) {
  const router = useRouter();

  const [notifications, setNotifications] =
    useState<NotificationItem[]>(initialNotifications);

  const [nextCvrs0r, setNextCvrs0r] = useState<string | null>(
    initialNextCvrs0r ?? null
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
    setNextCvrs0r(initialNextCvrs0r ?? null);
  }, [initialNotifications, initialNextCvrs0r, currentFilter]);

  const unreadIdsKey = useMemo(() => {
    const ids = notifications
      .filter((n) => !n.isRead)
      .map((n) => n.id)
      .sort();

    return ids.length > 0 ? ids.join("|") : null;
  }, [notifications]);

  // نمایش اولیه نوتیف‌ها با هایلایت و سپس علامت‌گذاری و رفع هایلایت پس از ۱.۵ ثانیه
  useEffect(() => {
    if (!unreadIdsKey) return;
    if (autoReadInFlightRef.current) return;
    if (autoReadKeyRef.current === unreadIdsKey) return;

    autoReadKeyRef.current = unreadIdsKey;
    autoReadInFlightRef.current = true;

    const idsToMark = new Set(unreadIdsKey.split("|"));

    const timer = setTimeout(() => {
      if (!isMountedRef.current) return;

      const run = async () => {
        try {
          await markAllNotificationsAsRead();

          if (!isMountedRef.current) return;

          setNotifications((current) =>
            current.map((n) =>
              idsToMark.has(n.id) && !n.isRead ? { ...n, isRead: true } : n
            )
          );

          router.refresh();
        } catch (error) {
          console.error("Failed to auto mark notifications as read:", error);
          if (autoReadKeyRef.current === unreadIdsKey) {
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
    };
  }, [unreadIdsKey, router]);

  const handleTabChange = (filter: "ALL" | "MENTIONS") => {
    if (filter === currentFilter) return;

    const query = filter === "MENTIONS" ? "?filter=MENTIONS" : "";
    router.push(`/${locale}/notifications${query}`);
  };

  const handleRead = useCallback((ids: string[]) => {
    const readIds = new Set(ids);

    setNotifications((current) =>
      current.map((n) =>
        readIds.has(n.id) && !n.isRead ? { ...n, isRead: true } : n
      )
    );
  }, []);

  const handleLoadMore = async () => {
    if (!nextCvrs0r || isLoadingMore) return;

    setIsLoadingMore(true);

    try {
      const result = await getNotifications({
        cvrs0r: nextCvrs0r,
        limit: 20,
        filter: currentFilter,
      });

      if (!isMountedRef.current) return;

      setNotifications((current) => {
        const existingIds = new Set(current.map((n) => n.id));

        const newNotifications = result.notifications.filter(
          (n) => !existingIds.has(n.id)
        );

        return [...current, ...newNotifications];
      });

      setNextCvrs0r(result.nextCvrs0r ?? null);
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
          <NotificationsEmptyState filter={currentFilter} />
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

      {nextCvrs0r && (
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

// برای سازگاری کامل هم با import { NotificationsFeed } و هم با import NotificationsFeed
export default NotificationsFeed;
