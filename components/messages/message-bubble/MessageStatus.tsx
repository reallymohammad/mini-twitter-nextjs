// message-bubble/MessageStatus.tsx
"use client";

import { Check, CheckCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface MessageStatusProps {
  isMine: boolean;
  isSeen?: boolean;
  /**
   * اگر تنظیمات حریم خصوصی در کلاینت در دسترس باشد،
   * در صورت false بودن، حتی اگر پیام خوانده شده باشد تیک دوم نمایش داده نمی‌شود.
   * پیش‌فرض true در نظر گرفته شده است.
   */
  showReadReceipts?: boolean;
  className?: string;
}

export default function MessageStatus({
  isMine,
  isSeen = false,
  showReadReceipts = true,
  className,
}: MessageStatusProps) {
  const t = useTranslations("Settings.Messages");

  // تیک وضعیت فقط برای پیام‌های ارسال شده توسط خود کاربر نمایش داده می‌شود
  if (!isMine) return null;

  // شرط تیک دوم: پیام خوانده شده باشد و نمایش رسید خواندن نیز مجاز باشد
  const shouldShowDoubleCheck = isSeen && showReadReceipts;

  return (
    <span
      className={cn("inline-flex items-center select-none", className)}
      title={shouldShowDoubleCheck ? t("seen") : t("sent")}
      aria-label={shouldShowDoubleCheck ? t("seen") : t("sent")}
    >
      {shouldShowDoubleCheck ? (
        <CheckCheck className="h-3.5 w-3.5 text-sky-500 animate-in fade-in-50 duration-200" />
      ) : (
        <Check className="h-3.5 w-3.5 text-muted-foreground" />
      )}
    </span>
  );
}
