import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
       
import Logo from "@/components/ui/Logo";
import LanguageSwitcher from "@/components/common/LanguageSwitcher";

export default function LandingHeader() {
  const t = useTranslations("Nav");

  return (
    <header className="flex items-center justify-between px-6 md:px-10 py-5">
      <div className="flex items-center gap-2.5">
        <Logo size={30} />
        <span className="font-bold text-lg tracking-tight">Pulse</span>
      </div>

      <div className="flex items-center gap-3">
        <LanguageSwitcher />
        <div className="hidden sm:flex items-center gap-2">
          <Link
            href="/login"
            className="px-4 py-2 text-sm font-semibold rounded-full text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            {t("login")}
          </Link>
          <Link
            href="/signup"
            className="px-4 py-2 text-sm font-semibold rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:opacity-85 transition-opacity"
          >
            {t("signup")}
          </Link>
        </div>
      </div>
    </header>
  );
}
