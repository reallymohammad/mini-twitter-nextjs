import { Home, Search, Bell, Mail } from "lucide-react";
import Link from "next/link";

export default function MobileTabBar() {
  const items = [
    { icon: <Home />, href: "/home", active: true },
    { icon: <Search />, href: "/explore" },
    { icon: <Bell />, href: "/notifications" },
    { icon: <Mail />, href: "/messages" },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 flex items-center justify-around bg-white/90 dark:bg-neutral-950/90 backdrop-blur border-t border-neutral-100 dark:border-neutral-900 py-2">
      {items.map((item, i) => (
        <Link
          key={i}
          href={item.href}
          className={`p-2.5 rounded-full ${
            item.active
              ? "text-violet-600"
              : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
          }`}
        >
          <span className="w-6 h-6 block">{item.icon}</span>
        </Link>
      ))}
    </nav>
  );
}
