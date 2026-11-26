// components/notifications/groupNotifications.ts
import type { NotificationDisplayItem, NotificationItem } from "./types";

export function groupNotifications(
  notifications: NotificationItem[]
): NotificationDisplayItem[] {
  const result: NotificationDisplayItem[] = [];

  // مپ برای استک کردن لایک‌ها و ری‌پست‌ها بر اساس: `${type}:${postId}`
  const postGroupMap = new Map<string, NotificationItem[]>();

  // لیست موقت برای استک کردن فالوها
  let currentFollowGroup: NotificationItem[] = [];

  const flushFollowGroup = () => {
    if (currentFollowGroup.length === 0) return;

    if (currentFollowGroup.length === 1) {
      result.push({
        kind: "single",
        id: currentFollowGroup[0].id,
        notification: currentFollowGroup[0],
      });
    } else {
      result.push({
        kind: "follow-group",
        id: `follow-group-${currentFollowGroup[0].id}`,
        notifications: [...currentFollowGroup],
      });
    }
    currentFollowGroup = [];
  };

  for (const notification of notifications) {
    // ۱. استک کردن بر اساس پست برای LIKE و REPOST
    if (
      notification.postId &&
      (notification.type === "LIKE" || notification.type === "REPOST")
    ) {
      flushFollowGroup();
      const groupKey = `${notification.type}:${notification.postId}`;

      if (!postGroupMap.has(groupKey)) {
        postGroupMap.set(groupKey, []);
      }
      postGroupMap.get(groupKey)!.push(notification);
      continue;
    }

    // ۲. استک کردن فالوها (FOLLOW)
    if (notification.type === "FOLLOW") {
      currentFollowGroup.push(notification);
      continue;
    }

    // ۳. سایر اعلان‌ها (REPLY, MENTION, QUOTE و ...) به صورت تکی
    flushFollowGroup();
    result.push({
      kind: "single",
      id: notification.id,
      notification,
    });
  }

  flushFollowGroup();

  // تبدیل مپ‌های لایک و ری‌پست به آیتم‌های نمایشی
  const postInteractionGroups: NotificationDisplayItem[] = [];
  for (const [groupKey, groupItems] of postGroupMap.entries()) {
    const [type, postId] = groupKey.split(":") as ["LIKE" | "REPOST", string];

    if (groupItems.length === 1) {
      postInteractionGroups.push({
        kind: "single",
        id: groupItems[0].id,
        notification: groupItems[0],
      });
    } else {
      postInteractionGroups.push({
        kind: "post-interaction-group",
        id: `post-group-${groupKey}`,
        type,
        postId,
        notifications: groupItems,
      });
    }
  }

  // ادغام همه اعلان‌ها و مرتب‌سازی بر اساس تاریخ (جدیدترین در ابتدا)
  const allItems = [...result, ...postInteractionGroups];
  allItems.sort((a, b) => {
    const dateA = new Date(
      a.kind === "single"
        ? a.notification.createdAt
        : a.notifications[0].createdAt
    ).getTime();

    const dateB = new Date(
      b.kind === "single"
        ? b.notification.createdAt
        : b.notifications[0].createdAt
    ).getTime();

    return dateB - dateA;
  });

  return allItems;
}
