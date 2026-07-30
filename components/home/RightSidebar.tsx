import { useTranslations } from "next-intl";
import SearchBar from "./SearchBar";
import TrendCard from "./TrendCard";
import SuggestedUserCard from "./SuggestedUserCard";
import { MOCK_TRENDS } from "@/lib/mock/trends";
import { MOCK_SUGGESTED_USERS } from "@/lib/mock/users";

export default function RightSidebar() {
  const t = useTranslations("Home");

  return (
    <aside className="hidden lg:flex flex-col gap-4 w-80 shrink-0 px-4 py-4 sticky top-0 h-screen overflow-y-auto">
      <SearchBar />

      <div className="rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 overflow-hidden">
        <h2 className="font-bold text-lg px-4 py-3">{t("trends")}</h2>
        {MOCK_TRENDS.map((tr) => (
          <TrendCard key={tr.tag} tag={tr.tag} posts={tr.posts} />
        ))}
      </div>

      <div className="rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 overflow-hidden">
        <h2 className="font-bold text-lg px-4 py-3">{t("whoToFollow")}</h2>
        {MOCK_SUGGESTED_USERS.map((u) => (
          <SuggestedUserCard key={u.handle} {...u} />
        ))}
      </div>

      <p className="text-xs text-neutral-400 px-4">
        © {new Date().getFullYear()} Pulse
      </p>
    </aside>
  );
}
