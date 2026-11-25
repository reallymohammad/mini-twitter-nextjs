import type { getNotifications } from "@/lib/notifications/actions";

type NotificationResult = Awaited<ReturnType<typeof getNotifications>>;

export type NotificationItem =
  NotificationResult["notifications"][number];

export type NotificationDisplayItem =
  | {
      kind: "single";
      notification: NotificationItem;
    }
  | {
      kind: "follow-group";
      notifications: NotificationItem[];
    };
