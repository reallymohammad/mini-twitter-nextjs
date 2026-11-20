"use client";

import { useTranslations } from "next-intl";

export default function MessagesEmptyPage() {
  const t = useTranslations("messagesEmpty");

  return (
    <div className="flex h-full flex-1 flex-col items-center justify-center p-8 text-center text-muted-foreground">
      <h2 className="mb-2 text-xl font-bold text-foreground">
        {t("title")}
      </h2>

      <p className="max-w-sm text-sm">{t("description")}</p>
    </div>
  );
}
