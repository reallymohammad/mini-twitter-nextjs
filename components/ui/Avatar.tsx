import { clsx } from "@/lib/clsx";

interface AvatarProps {
  name: string;
  gradient?: string;
  size?: number;
}

export default function Avatar({
  name,
  gradient = "from-neutral-400 to-neutral-600",
  size = 40,
}: AvatarProps) {
  const initial = name.trim().charAt(0).toUpperCase();
  return (
    <div
      style={{ width: size, height: size }}
      className={clsx(
        "rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold shrink-0 select-none",
        gradient
      )}
    >
      <span style={{ fontSize: size * 0.4 }}>{initial}</span>
    </div>
  );
}
