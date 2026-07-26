import { useTranslations } from "next-intl";
import Logo from "@/components/ui/Logo";
import NavItem from "./NavItem";
import Avatar from "@/components/ui/Avatar";
import {
  Home,
  Search,
  Bell,
  Mail,
  User,
  MoreHorizontal,
} from "lucide-react";

export default function LeftSidebar() {
  const t = useTranslations("Nav");

  const items = [
    { icon: <Home />, label: t("home"), href: "/home", active: true },
    { icon: <Search />, label: t("explore"), href: "/explore" },
    { icon: <Bell />, label: t("notifications"), href: "/notifications" },
    { icon: <Mail />, label: t("messages"), href: "/messages" },
    { icon: <User />, label: t("profile"), href: "/profile" },
  ];

  return (
    <aside className="hidden md:flex flex-col justify-between h-screen sticky top-0 px-2 xl:px-4 py-4 w-[72px] xl:w-64 shrink-0">
      <div className="flex flex-col gap-1">
        <div className="p-2 mb-2">
          <Logo size={30} />
        </div>

        {items.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
      </div>

      <button className="flex items-center gap-3 rounded-full p-2 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors">
        <Avatar name="Mohammad" gradient="from-violet-500 to-fuchsia-500" size={36} />
        <div className="hidden xl:flex flex-col items-start text-sm min-w-0">
          <span className="font-semibold truncate">Mohammad</span>
          <span className="text-neutral-500 truncate">@bengalpixel</span>
        </div>
        <MoreHorizontal className="hidden xl:inline w-4 h-4 ms-auto text-neutral-400" />
      </button>
    </aside>
  );
}
