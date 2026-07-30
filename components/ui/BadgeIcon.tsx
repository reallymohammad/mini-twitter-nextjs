import { VerificationBadge } from "@prisma/client";

const colors: Record<VerificationBadge, string> = {
  NONE: "",
  BLUE: "text-blue-400",
  GOLD: "text-yellow-400",
  GREY: "text-gray-400",
};

export default function BadgeIcon({ badge }: { badge: VerificationBadge }) {
  if (badge === "NONE") return null;
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className={colors[badge]}>
      <path d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
    </svg>
  );
}
