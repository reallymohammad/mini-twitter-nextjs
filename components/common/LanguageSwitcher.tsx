"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { locales } from "@/lib/i18n/config";

export default function LanguageSwitcher({
  variant = "default",
}: {
  variant?: "default" | "minimal";
}) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const toggle = () => {
    const next = locale === "en" ? "fa" : "en";
    const segments = pathname.split("/");
    segments[1] = next;
    router.push(segments.join("/"));
  };

  if (variant === "minimal") {
    return (
      <button
        onClick={toggle}
        className="text-sm font-medium text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
      >
        {locale === "en" ? "فارسی" : "English"}
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      className="inline-flex items-center gap-1.5 rounded-full border border-neutral-300 dark:border-neutral-700 px-4 py-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
    >
      <span className="opacity-60">
        {locales.filter((l) => l !== locale)[0].toUpperCase()}
      </span>
      <span>{locale === "en" ? "فارسی" : "English"}</span>
    </button>
  );
}
