"use client";

import { AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface DeletedPostPlaceholderProps {
  className?: string;
  inThread?: boolean;
  connectAbove?: boolean;
  connectBelow?: boolean;
}

export default function DeletedPostPlaceholder({
  className,
  inThread = false,
  connectAbove = false,
  connectBelow = false,
}: DeletedPostPlaceholderProps) {
  const t = useTranslations("Post");

  if (!inThread) {
    return (
      <div
        role="status"
        className={cn(
          "flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground",
          className
        )}
      >
        <AlertCircle
          className="size-4 shrink-0"
          aria-hidden="true"
        />
        <span>{t("postUnavailable")}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex gap-3 border-b border-border p-3",
        className
      )}
    >
      <div
        className="relative w-10 shrink-0 self-stretch"
        aria-hidden="true"
      >
        {connectAbove && (
          <span className="pointer-events-none absolute -top-3 bottom-full left-1/2 w-0.5 -translate-x-1/2 border-s-2 border-dashed border-muted-foreground/50" />
        )}

        <div className="relative z-[1] flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <AlertCircle className="size-4" />
        </div>

        {connectBelow && (
          <span className="pointer-events-none absolute -bottom-3 top-10 left-1/2 w-0.5 -translate-x-1/2 border-s-2 border-dashed border-muted-foreground/50" />
        )}
      </div>

      <div
        role="status"
        className="min-w-0 flex-1 self-center rounded-xl border border-dashed border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground"
      >
        {t("postUnavailable")}
      </div>
    </div>
  );
}
