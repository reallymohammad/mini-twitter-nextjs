import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, Ban, ChevronRight, Lock, VolumeX } from "lucide-react";

import { getCurrentUser } from "@/lib/session";
import PrivacySettingsForm from "@/components/settings/PrivacySettingsForm";

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function PrivacySettingsPage({ params }: Props) {
  const { locale } = await params;
  const user = await getCurrentUser();

  if (!user) redirect(`/${locale}/signin`);

  const t = await getTranslations("Settings.Privacy");
  const settingsHref = `/${locale}/settings`;
  const mutedHref = `/${locale}/settings/muted`;
  const blockedHref = `/${locale}/settings/blocked`;

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-xl px-4 py-8">
        <header className="mb-6">
          <Link
            href={settingsHref}
            aria-label={t("back")}
            className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-border transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
          >
            <ArrowLeft
              className="h-5 w-5 rtl:rotate-180"
              aria-hidden="true"
            />
          </Link>

          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-muted/40">
            <Lock className="h-5 w-5" aria-hidden="true" />
          </div>

          <h1 className="text-lg font-bold">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("description")}
          </p>
        </header>

        <div className="space-y-4">
          {/* تنظیمات حساب خصوصی (کلاینت کامپوننت برای هندل کردن تغییر وضعیت) */}
          <PrivacySettingsForm initialIsPrivate={user.isPrivate} />

          {/* لینک به لیست میوت‌شده‌ها */}
          <Link
            href={mutedHref}
            className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-4 transition-colors hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-background">
              <VolumeX className="h-5 w-5" aria-hidden="true" />
            </span>

            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">
                {t("mutedAccounts")}
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {t("mutedAccountsDescription")}
              </span>
            </span>

            <ChevronRight
              className="h-4 w-4 shrink-0 text-muted-foreground rtl:rotate-180"
              aria-hidden="true"
            />
          </Link>

          {/* لینک به لیست بلاک‌شده‌ها */}
          <Link
            href={blockedHref}
            className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-4 transition-colors hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-background">
              <Ban className="h-5 w-5" aria-hidden="true" />
            </span>

            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">
                {t("blockedAccounts")}
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {t("blockedAccountsDescription")}
              </span>
            </span>

            <ChevronRight
              className="h-4 w-4 shrink-0 text-muted-foreground rtl:rotate-180"
              aria-hidden="true"
            />
          </Link>
        </div>
      </div>
    </main>
  );
}
