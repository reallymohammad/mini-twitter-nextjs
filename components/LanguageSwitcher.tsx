"use client";
import { useLocale } from "next-intl";
import { useRouter, usePathname } from "next/navigation";

export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const toggle = () => {
    const next = locale === "en" ? "fa" : "en";
    const newPath = pathname.replace(`/${locale}`, `/${next}`);
    router.push(newPath);
  };

  return (
    <button
      onClick={toggle}
      className="rounded-full border border-neutral-300 dark:border-neutral-700 px-4 py-1.5 text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
    >
      {locale === "en" ? "فارسی" : "English"}
    </button>
  );
}
