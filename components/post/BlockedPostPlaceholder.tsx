"use client";

import Link from "next/link";
import { AlertCircle, Eye } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface BlockedPostPlaceholderProps {
  href?: string;
  className?: string;
  inThread?: boolean;
  connectAbove?: boolean;
  connectBelow?: boolean;
  onView?: () => void;
}

export default function BlockedPostPlaceholder({
  href,
  className,
  inThread = false,
  connectAbove = false,
  connectBelow = false,
  onView,
}: BlockedPostPlaceholderProps) {
  const t = useTranslations("Post");

  const action = onView ? (
    <button
      type="button"
      onClick={onView}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-accent"
    >
      <Eye className="size-3.5" aria-hidden="true" />
      {t("view")}
    </button>
  ) : href ? (
    <Link
      href={href}
      onClick={(event) => event.stopPropagation()}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-accent"
    >
      <Eye className="size-3.5" aria-hidden="true" />
      {t("view")}
    </Link>
  ) : null;

  if (!inThread) {
    return (
      <div
        role="status"
        className={cn(
          "flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground",
          className
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
          <span>{t("blockedByYou")}</span>
        </span>
        {action}
      </div>
    );
  }

  return (
    <div className={cn("flex gap-3 border-b border-border p-3", className)}>
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
        className="flex min-w-0 flex-1 items-center justify-between gap-3 self-center rounded-xl border border-dashed border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground"
      >
        <span className="min-w-0">{t("blockedByYou")}</span>
        {action}
      </div>
    </div>
  );
}
