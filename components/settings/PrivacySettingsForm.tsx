"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Lock, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";

interface PrivacySettingsFormProps {
  initialIsPrivate: boolean;
}

export default function PrivacySettingsForm({
  initialIsPrivate,
}: PrivacySettingsFormProps) {
  const t = useTranslations("Settings.Privacy");
  const router = useRouter();

  const [isPrivate, setIsPrivate] = useState(initialIsPrivate);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");

  async function handleToggle(checked: boolean) {
    const previousValue = isPrivate;

    setIsPrivate(checked);
    setIsPending(true);
    setError("");

    try {
     const res = await fetch("/api/user/privacy", {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ isPrivate: checked }),
});

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error ?? "Failed to update privacy setting");
      }

      router.refresh();
    } catch (err: unknown) {
      setIsPrivate(previousValue);
      setError(
        err instanceof Error ? err.message : "Something went wrong",
      );
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-background">
            <Lock className="h-5 w-5" aria-hidden="true" />
          </span>

          <div>
            <label
              htmlFor="private-account"
              className="block cursor-pointer select-none text-sm font-semibold"
            >
              {t("privateAccount")}
            </label>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t("privateAccountDescription")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isPending && (
            <LoaderCircle
              className="h-4 w-4 animate-spin text-muted-foreground"
              aria-hidden="true"
            />
          )}

          <label className="relative inline-flex shrink-0 cursor-pointer items-center">
            <input
              id="private-account"
              type="checkbox"
              className="peer sr-only"
              checked={isPrivate}
              disabled={isPending}
              onChange={(event) => handleToggle(event.target.checked)}
            />

            <span
              className="h-6 w-11 rounded-full bg-border transition-colors
                peer-checked:bg-foreground
                peer-focus-visible:outline-none peer-focus-visible:ring-2
                peer-focus-visible:ring-foreground peer-focus-visible:ring-offset-2
                peer-disabled:cursor-wait peer-disabled:opacity-60
                after:absolute after:start-[2px] after:top-[2px]
                after:h-5 after:w-5 after:rounded-full after:bg-white
                after:transition-transform after:content-['']
                peer-checked:after:translate-x-5"
              aria-hidden="true"
            />
          </label>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-2 text-sm text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}
