import { clsx } from "@/lib/clsx";
import Link from "next/link";
import { ReactNode } from "react";

interface NavItemProps {
  icon: ReactNode;
  label: string;
  href: string;
  active?: boolean;
}

export default function NavItem({ icon, label, href, active }: NavItemProps) {
  return (
    <Link
      href={href}
      className={clsx(
        "flex items-center gap-4 px-3 py-2.5 rounded-full transition-colors w-full",
        active
          ? "font-bold text-neutral-900 dark:text-white"
          : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900"
      )}
    >
      <span className="w-6 h-6 [&>svg]:w-full [&>svg]:h-full">{icon}</span>
      <span className="text-lg hidden xl:inline">{label}</span>
    </Link>
  );
}
