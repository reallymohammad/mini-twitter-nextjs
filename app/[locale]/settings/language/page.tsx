import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, Languages } from "lucide-react";

import { getCurrentUser } from "@/lib/session";
import LanguageSelector from "@/components/settings/LanguageSelector";

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function LanguageSettingsPage({ params }: Props) {
  const { locale } = await params;
  const user = await getCurrentUser();

  if (!user) redirect(`/${locale}/signin`);

  const t = await getTranslations("Settings.Language");
  const settingsHref = `/${locale}/settings`;

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
            <Languages className="h-5 w-5" aria-hidden="true" />
          </div>

          <h1 className="text-lg font-bold">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("description")}
          </p>
        </header>

        <LanguageSelector currentLocale={locale} />
      </div>
    </main>
  );
}
