"use client";

import { useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Check, LoaderCircle } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

interface LanguageSelectorProps {
  currentLocale: string;
}

const languages = [
  { locale: "fa", label: "فارسی", nativeLabel: "فارسی" },
  { locale: "en", label: "English", nativeLabel: "English" },
] as const;

export default function LanguageSelector({
  currentLocale,
}: LanguageSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("Settings.Language");
  const [isPending, startTransition] = useTransition();

  function changeLanguage(nextLocale: string) {
    if (nextLocale === currentLocale) return;

    // pathname شامل locale فعلی است؛ فقط بخش اول مسیر را عوض می‌کنیم.
    const segments = pathname.split("/");
    segments[1] = nextLocale;
    const nextPath = segments.join("/") || `/${nextLocale}`;

    startTransition(() => {
      router.replace(nextPath);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3" aria-label={t("title")}>
      {languages.map((language) => {
        const isSelected = currentLocale === language.locale;

        return (
          <button
            key={language.locale}
            type="button"
            onClick={() => changeLanguage(language.locale)}
            disabled={isPending}
            aria-pressed={isSelected}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl border p-4 text-start transition-colors",
              "hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground",
              isSelected
                ? "border-primary bg-primary/5"
                : "border-border bg-muted/20",
              isPending && "cursor-wait opacity-70"
            )}
          >
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">
                {language.label}
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {t(`languageNames.${language.locale}`)}
              </span>
            </span>

            {isPending && !isSelected ? (
              <LoaderCircle
                className="h-4 w-4 animate-spin text-muted-foreground"
                aria-hidden="true"
              />
            ) : isSelected ? (
              <Check
                className="h-5 w-5 text-primary"
                aria-hidden="true"
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
