import type {
  NotificationDisplayItem,
  NotificationItem,
} from "./types";

export function groupNotifications(
  notifications: NotificationItem[]
): NotificationDisplayItem[] {
  const result: NotificationDisplayItem[] = [];
  const followGroupsByDay = new Map<string, NotificationItem[]>();

  for (const notification of notifications) {
    if (notification.type !== "FOLLOW") {
      result.push({
        kind: "single",
        notification,
      });
      continue;
    }

    const dayKey = new Date(notification.createdAt)
      .toISOString()
      .slice(0, 10);

    const existingGroup = followGroupsByDay.get(dayKey);

    if (existingGroup) {
      existingGroup.push(notification);
      continue;
    }

    const group = [notification];
    followGroupsByDay.set(dayKey, group);

    result.push({
      kind: "follow-group",
      notifications: group,
    });
  }

  return result;
}
