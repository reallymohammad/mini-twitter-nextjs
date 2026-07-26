import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";

export default function HeroSection() {
  const t = useTranslations("Landing");

  return (
    <section className="flex-1 flex flex-col md:flex-row items-center gap-12 px-6 md:px-16 py-10 md:py-0">
      <div className="flex-1 max-w-xl flex flex-col gap-6 text-center md:text-start items-center md:items-start">
        <span className="inline-flex items-center gap-2 rounded-full bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 text-xs font-semibold px-3 py-1.5">
          {t("badge")}
        </span>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.1]">
          {t("headline")}
        </h1>

        <p className="text-lg text-neutral-500 dark:text-neutral-400 max-w-md">
          {t("sub")}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm mt-2">
          <Link
            href="/signup"
            className="flex-1 text-center rounded-full bg-violet-600 hover:bg-violet-500 text-white font-semibold py-3 transition-colors"
          >
            {t("signup")}
          </Link>
          <Link
            href="/login"
            className="flex-1 text-center rounded-full border border-neutral-300 dark:border-neutral-700 font-semibold py-3 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            {t("login")}
          </Link>
        </div>

        <p className="text-xs text-neutral-400">{t("legal")}</p>
      </div>

      <div className="flex-1 hidden md:flex items-center justify-center">
        <div className="relative w-full max-w-md aspect-[4/5] rounded-3xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-orange-400 p-1 shadow-2xl shadow-violet-500/20">
          <div className="w-full h-full rounded-[22px] bg-white dark:bg-neutral-950 p-5 flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex gap-3 rounded-2xl bg-neutral-100 dark:bg-neutral-900 p-3 animate-pulse"
                style={{ animationDelay: `${i * 150}ms` }}
              >
                <div className="w-9 h-9 rounded-full bg-neutral-300 dark:bg-neutral-700 shrink-0" />
                <div className="flex-1 flex flex-col gap-2 py-0.5">
                  <div className="h-2.5 w-1/3 rounded bg-neutral-300 dark:bg-neutral-700" />
                  <div className="h-2.5 w-4/5 rounded bg-neutral-200 dark:bg-neutral-800" />
                  <div className="h-2.5 w-3/5 rounded bg-neutral-200 dark:bg-neutral-800" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
