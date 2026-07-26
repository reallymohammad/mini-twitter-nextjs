import Avatar from "@/components/ui/Avatar";
import { useTranslations } from "next-intl";

export default function SuggestedUserCard({
  name,
  handle,
  color,
}: {
  name: string;
  handle: string;
  color: string;
}) {
  const t = useTranslations("Home");

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer">
      <Avatar name={name} gradient={color} size={36} />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate">{name}</p>
        <p className="text-xs text-neutral-500 truncate">{handle}</p>
      </div>
      <button className="text-xs font-bold rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-3.5 py-1.5 hover:opacity-80 transition-opacity shrink-0">
        {t("follow")}
      </button>
    </div>
  );
}
