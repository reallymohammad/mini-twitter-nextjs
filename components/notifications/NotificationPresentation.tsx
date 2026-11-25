import {
  AtSign,
  Bell,
  FileCheck2,
  Heart,
  Mail,
  MessageCircle,
  Quote,
  Repeat2,
  UserPlus,
  UserRoundCheck,
} from "lucide-react";
import type { ReactNode } from "react";
import type { NotificationType } from "@prisma/client";

interface NotificationPresentationResult {
  icon: ReactNode;
  text: string;
}

export function getNotificationPresentation(
  type: NotificationType
): NotificationPresentationResult {
  switch (type) {
    case "LIKE":
      return {
        icon: <Heart className="size-5 fill-rose-500 text-rose-500" />,
        text: "liked your post",
      };

    case "REPOST":
      return {
        icon: <Repeat2 className="size-5 text-emerald-500" />,
        text: "reposted your post",
      };

    case "QUOTE":
      return {
        icon: <Quote className="size-5 text-violet-500" />,
        text: "quoted your post",
      };

    case "REPLY":
      return {
        icon: <MessageCircle className="size-5 text-sky-500" />,
        text: "replied to your post",
      };

    case "FOLLOW":
      return {
        icon: <UserPlus className="size-5 text-primary" />,
        text: "started following you",
      };

    case "FOLLOW_REQUEST":
      return {
        icon: <UserPlus className="size-5 text-primary" />,
        text: "requested to follow you",
      };

    case "FOLLOW_ACCEPT":
      return {
        icon: <UserRoundCheck className="size-5 text-emerald-500" />,
        text: "accepted your follow request",
      };

    case "MENTION":
      return {
        icon: <AtSign className="size-5 text-amber-500" />,
        text: "mentioned you in a post",
      };

    case "MESSAGE":
      return {
        icon: <Mail className="size-5 text-sky-500" />,
        text: "sent you a message",
      };

    case "REPORT_RESOLVED":
      return {
        icon: <FileCheck2 className="size-5 text-emerald-500" />,
        text: "resolved your report",
      };

    default:
      return {
        icon: <Bell className="size-5 text-muted-foreground" />,
        text: "sent you a notification",
      };
  }
}
