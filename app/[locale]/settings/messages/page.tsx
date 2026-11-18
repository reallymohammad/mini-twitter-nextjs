import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";

import { getCurrentUser } from "@/lib/session";
import MessagesSettingsForm from "@/components/settings/MessagesSettingsForm";

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function MessagesSettingsPage({ params }: Props) {
  const { locale } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/${locale}/signin`);
  }

  const t = await getTranslations("Settings.Messages");

  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl px-4 py-6 sm:px-6">
      <header className="mb-8 flex items-start gap-3">
        <Link
          href={`/${locale}/settings`}
          aria-label={t("back")}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
        </Link>

        <div>
          <h1 className="text-xl font-semibold">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("description")}
          </p>
        </div>
      </header>

      <MessagesSettingsForm />
    </main>
  );
}
