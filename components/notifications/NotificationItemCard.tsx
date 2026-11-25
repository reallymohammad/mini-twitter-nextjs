"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { markNotificationAsRead } from "@/lib/notifications/actions";
import { getNotificationPresentation } from "./NotificationPresentation";
import { NotificationPostPreview } from "./NotificationPostPreview";
import type {
  NotificationDisplayItem,
  NotificationItem,
} from "./types";

interface NotificationItemCardProps {
  item: NotificationDisplayItem;
  locale: string;
  onRead: (ids: string[]) => void;
}

type Actor = NonNullable<NotificationItem["actor"]>;

function getNotificationHref(
  notification: NotificationItem,
  locale: string
) {
  if (
    notification.type === "MESSAGE" &&
    notification.message?.conversationId
  ) {
    return `/${locale}/messages?conversationId=${notification.message.conversationId}`;
  }

  if (notification.type === "FOLLOW_REQUEST") {
    return `/${locale}/notifications/requests`;
  }

  if (notification.post) {
    return `/${locale}/status/${notification.post.id}`;
  }

  if (notification.actor) {
    return `/${locale}/${notification.actor.username}`;
  }

  return `/${locale}/notifications`;
}

function ActorAvatar({ actor }: { actor: Actor }) {
  return (
    <span className="relative inline-flex size-9 shrink-0 overflow-hidden rounded-full bg-muted">
      {actor.avatarUrl ? (
        <Image
          src={actor.avatarUrl}
          alt={actor.fullName || actor.username}
          fill
          sizes="36px"
          className="object-cover"
        />
      ) : (
        <span className="flex size-full items-center justify-center text-xs font-bold text-muted-foreground">
          {actor.username.charAt(0).toUpperCase()}
        </span>
      )}
    </span>
  );
}

function getUniqueActors(notifications: NotificationItem[]) {
  const actors = new Map<string, Actor>();

  for (const notification of notifications) {
    if (notification.actor) {
      actors.set(notification.actor.id, notification.actor);
    }
  }

  return [...actors.values()];
}

export function NotificationItemCard({
  item,
  locale,
  onRead,
}: NotificationItemCardProps) {
  const router = useRouter();
  const [isMarkingRead, setIsMarkingRead] = useState(false);

  const isGroup = item.kind === "follow-group";
  const notifications = isGroup
    ? item.notifications
    : [item.notification];

  const firstNotification = notifications[0];
  const unreadIds = notifications
    .filter((notification) => !notification.isRead)
    .map((notification) => notification.id);

  const isUnread = unreadIds.length > 0;
  const href = getNotificationHref(firstNotification, locale);
  const presentation = getNotificationPresentation(firstNotification.type);

  const handleClick = async (
    event: React.MouseEvent<HTMLAnchorElement>
  ) => {
    // لینک‌های بازشده در تب جدید را دست‌کاری نکن.
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    if (!isUnread) {
      return;
    }

    event.preventDefault();

    if (isMarkingRead) {
      return;
    }

    setIsMarkingRead(true);

    try {
      await Promise.all(
        unreadIds.map((id) => markNotificationAsRead(id))
      );

      onRead(unreadIds);

      // بج سایدبار از شمارنده‌ی سرور دوباره محاسبه می‌شود.
      router.push(href);
      router.refresh();
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
      router.push(href);
    } finally {
      setIsMarkingRead(false);
    }
  };

  const actors = isGroup
    ? getUniqueActors(notifications)
    : firstNotification.actor
      ? [firstNotification.actor]
      : [];

  let message: React.ReactNode;

  if (isGroup) {
    const firstActor = actors[0];
    const otherActorsCount = Math.max(actors.length - 1, 0);

    if (!firstActor) {
      message = `${notifications.length} people followed you`;
    } else if (otherActorsCount === 0) {
      message = (
        <>
          <strong className="font-semibold text-foreground">
            {firstActor.fullName || firstActor.username}
          </strong>{" "}
          started following you
        </>
      );
    } else {
      message = (
        <>
          <strong className="font-semibold text-foreground">
            {firstActor.fullName || firstActor.username}
          </strong>{" "}
          and {otherActorsCount}{" "}
          {otherActorsCount === 1 ? "other" : "others"} followed you
        </>
      );
    }
  } else if (firstNotification.actor) {
    message = (
      <>
        <strong className="font-semibold text-foreground">
          {firstNotification.actor.fullName ||
            firstNotification.actor.username}
        </strong>{" "}
        {presentation.text}
      </>
    );
  } else {
    message = presentation.text;
  }

  return (
    <Link
      href={href}
      onClick={handleClick}
      aria-current={isUnread ? "false" : undefined}
      className={[
        "flex gap-4 border-s-2 p-4 transition",
        "hover:bg-muted/40",
        isUnread
          ? "border-s-primary bg-primary/10 opacity-100"
          : "border-s-transparent bg-background opacity-70 hover:opacity-100",
      ].join(" ")}
    >
      <div className="flex w-8 shrink-0 justify-end pt-1">
        {isGroup ? (
          <span className="text-primary">
            {presentation.icon}
          </span>
        ) : (
          presentation.icon
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            {isGroup ? (
              <div className="flex shrink-0 -space-x-2">
                {actors.slice(0, 3).map((actor) => (
                  <span
                    key={actor.id}
                    className="rounded-full ring-2 ring-background"
                  >
                    <ActorAvatar actor={actor} />
                  </span>
                ))}
              </div>
            ) : firstNotification.actor ? (
              <ActorAvatar actor={firstNotification.actor} />
            ) : null}

            <p className="min-w-0 text-sm leading-6 text-muted-foreground">
              {message}
            </p>
          </div>

          {isUnread && (
            <span
              className="mt-2 size-2 shrink-0 rounded-full bg-primary"
              aria-label="Unread"
            />
          )}
        </div>

        {firstNotification.post && (
          <NotificationPostPreview
            content={firstNotification.post.content}
          />
        )}

        {isMarkingRead && (
          <span className="sr-only">Marking notification as read</span>
        )}
      </div>
    </Link>
  );
}
