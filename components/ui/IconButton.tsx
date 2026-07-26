import { ButtonHTMLAttributes, ReactNode } from "react";
import { clsx } from "@/lib/clsx";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  active?: boolean;
}

export default function IconButton({
  children,
  active,
  className,
  ...props
}: IconButtonProps) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center rounded-full p-2 transition-colors",
        active
          ? "text-violet-600"
          : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white",
        "hover:bg-violet-50 dark:hover:bg-violet-500/10",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
