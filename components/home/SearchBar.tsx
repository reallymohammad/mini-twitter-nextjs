import { useTranslations } from "next-intl";
import { Search } from "lucide-react";

export default function SearchBar() {
  const t = useTranslations("Home");

  return (
    <div className="relative">
      <Search className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
      <input
        type="text"
        placeholder={t("search")}
        className="w-full rounded-full bg-neutral-100 dark:bg-neutral-900 ps-11 pe-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-500/40 placeholder:text-neutral-400 transition-shadow"
      />
    </div>
  );
}
