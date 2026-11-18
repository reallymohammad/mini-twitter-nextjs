"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { LoaderCircle } from "lucide-react";

type DmPermission =
  | "EVERYONE"
  | "FOLLOWERS"
  | "FOLLOWING"
  | "MUTUALS"
  | "NOBODY";

interface MessageSettings {
  dmPermission: DmPermission;
  showReadReceipts: boolean;
}

const dmPermissions: DmPermission[] = [
  "EVERYONE",
  "FOLLOWERS",
  "FOLLOWING",
  "MUTUALS",
  "NOBODY",
];

function isMessageSettings(value: unknown): value is MessageSettings {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const data = value as Record<string, unknown>;

  return (
    dmPermissions.some(
      (permission) => permission === data.dmPermission,
    ) &&
    typeof data.showReadReceipts === "boolean"
  );
}

export default function MessagesSettingsForm() {
  const t = useTranslations("Settings.Messages");

  const [saved, setSaved] = useState<MessageSettings | null>(null);
  const [draft, setDraft] = useState<MessageSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      setIsLoading(true);
      setLoadError(false);
      setSaved(null);
      setDraft(null);

      try {
        const response = await fetch("/api/user/messages", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Failed to load message settings");
        }

        const data: unknown = await response.json();

        if (!isMessageSettings(data)) {
          throw new Error("Invalid message settings response");
        }

        if (!cancelled) {
          setSaved(data);
          setDraft(data);
        }
      } catch {
        if (!cancelled) {
          setLoadError(true);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadSettings();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  async function handleSave() {
    if (!draft || isSaving) return;

    setIsSaving(true);
    setSaveError(false);
    setIsSaved(false);

    try {
      const response = await fetch("/api/user/messages", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(draft),
      });

      if (!response.ok) {
        throw new Error("Failed to save message settings");
      }

      const data: unknown = await response.json();

      if (!isMessageSettings(data)) {
        throw new Error("Invalid message settings response");
      }

      setSaved(data);
      setDraft(data);
      setIsSaved(true);
    } catch {
      setSaveError(true);
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-16" aria-label={t("loading")}>
        <LoaderCircle className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (loadError || !draft || !saved) {
    return (
      <div className="rounded-lg border p-5">
        <p role="alert" className="text-sm text-destructive">
          {t("loadError")}
        </p>

        <button
          type="button"
          onClick={() => setReloadKey((value) => value + 1)}
          className="mt-4 rounded-md border px-4 py-2 text-sm transition hover:bg-muted"
        >
          {t("retry")}
        </button>
      </div>
    );
  }

  const hasChanges =
    draft.dmPermission !== saved.dmPermission ||
    draft.showReadReceipts !== saved.showReadReceipts;

  return (
    <div className="space-y-6">
      <section className="rounded-lg border p-5">
        <label
          htmlFor="dm-permission"
          className="block font-medium"
        >
          {t("dmPermission")}
        </label>

        <p className="mt-1 text-sm text-muted-foreground">
          {t("dmPermissionDescription")}
        </p>

        <select
          id="dm-permission"
          value={draft.dmPermission}
          onChange={(event) => {
            const value = event.target.value as DmPermission;

            setDraft((current) =>
              current ? { ...current, dmPermission: value } : current,
            );
            setSaveError(false);
            setIsSaved(false);
          }}
          disabled={isSaving}
          className="mt-4 w-full rounded-md border bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
        >
          <option value="EVERYONE">{t("permissions.everyone")}</option>
          <option value="FOLLOWERS">{t("permissions.followers")}</option>
          <option value="FOLLOWING">{t("permissions.following")}</option>
          <option value="MUTUALS">{t("permissions.mutuals")}</option>
          <option value="NOBODY">{t("permissions.nobody")}</option>
        </select>
      </section>

      <section className="rounded-lg border p-5">
        <label
          htmlFor="show-read-receipts"
          className="flex cursor-pointer items-center justify-between gap-4"
        >
          <span>
            <span className="block font-medium">
              {t("readReceipts")}
            </span>
            <span className="mt-1 block text-sm text-muted-foreground">
              {t("readReceiptsDescription")}
            </span>
          </span>

          <input
            id="show-read-receipts"
            type="checkbox"
            role="switch"
            checked={draft.showReadReceipts}
            onChange={(event) => {
              const checked = event.target.checked;

              setDraft((current) =>
                current
                  ? { ...current, showReadReceipts: checked }
                  : current,
              );
              setSaveError(false);
              setIsSaved(false);
            }}
            disabled={isSaving}
            className="h-5 w-5 shrink-0 accent-primary disabled:cursor-not-allowed"
          />
        </label>
      </section>

      {saveError && (
        <p role="alert" className="text-sm text-destructive">
          {t("saveError")}
        </p>
      )}

      {isSaved && (
        <p role="status" className="text-sm text-muted-foreground">
          {t("saved")}
        </p>
      )}

      <button
        type="button"
        onClick={() => void handleSave()}
        disabled={isSaving || !hasChanges}
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSaving && <LoaderCircle className="h-4 w-4 animate-spin" />}
        {isSaving ? t("saving") : t("save")}
      </button>
    </div>
  );
}
