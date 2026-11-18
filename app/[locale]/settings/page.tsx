import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  ArrowLeft,
  Bell,
  ChevronRight,
  Languages,
  MessageCircle,
  MonitorSmartphone,
  Shield,
  UserRound,
} from "lucide-react";

import { getCurrentUser } from "@/lib/session";

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function SettingsPage({ params }: Props) {
  const { locale } = await params;
  const user = await getCurrentUser();

  if (!user) redirect(`/${locale}/signin`);

  const t = await getTranslations("Settings");

  const editProfileHref = `/${locale}/settings/profile`;
  const languageHref = `/${locale}/settings/language`;
  const privacyHref = `/${locale}/settings/privacy`;
  const messagesHref = `/${locale}/settings/messages`; // لینک جدید فعال شد
  const homeHref = `/${locale}/home`;

  const upcomingSections = [
    {
      title: t("notifications"),
      description: t("notificationsDescription"),
      icon: Bell,
    },
    {
      title: t("sessions"),
      description: t("sessionsDescription"),
      icon: MonitorSmartphone,
    },
  ];

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-xl px-4 py-8">
        <header className="mb-6">
          <Link
            href={homeHref}
            aria-label={t("back")}
            className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-border transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
          >
            <ArrowLeft
              className="h-5 w-5 rtl:rotate-180"
              aria-hidden="true"
            />
          </Link>

          <h1 className="text-lg font-bold">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("description")}
          </p>
        </header>

        <div className="space-y-3">
          {/* Edit Profile */}
          <Link
            href={editProfileHref}
            className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-4 transition-colors hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-background">
              <UserRound className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">{t("editProfile")}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{t("editProfileDescription")}</span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground rtl:rotate-180" aria-hidden="true" />
          </Link>

          {/* Language */}
          <Link
            href={languageHref}
            className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-4 transition-colors hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-background">
              <Languages className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">{t("language")}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{t("languageDescription")}</span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground rtl:rotate-180" aria-hidden="true" />
          </Link>

          {/* Privacy */}
          <Link
            href={privacyHref}
            className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-4 transition-colors hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-background">
              <Shield className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">{t("privacy")}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{t("privacyDescription")}</span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground rtl:rotate-180" aria-hidden="true" />
          </Link>

          {/* Messages (Activated) */}
          <Link
            href={messagesHref}
            className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-4 transition-colors hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-background">
              <MessageCircle className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">{t("messages")}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{t("messagesDescription")}</span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground rtl:rotate-180" aria-hidden="true" />
          </Link>

          {/* Remaining Upcoming */}
          {upcomingSections.map((section) => {
            const Icon = section.icon;

            return (
              <div
                key={section.title}
                className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 p-4"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-background">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">
                    {section.title}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {section.description}
                  </span>
                </span>

                <span className="shrink-0 text-xs text-muted-foreground">
                  {t("comingSoon")}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
