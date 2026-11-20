"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";

interface ProfileBackButtonProps {
  locale: string;
  isOwner: boolean;
}

/**
 * Accept only the same-locale destinations that may legitimately lead to a
 * profile. Keep the query string and fragment so list/search state is retained.
 */
function getValidBackPath(from: string | null, locale: string): string | null {
  if (
    !from ||
    !from.startsWith("/") ||
    from.startsWith("//") ||
    from.includes("\\") ||
    /[\u0000-\u0020\u007f]/.test(from) ||
    /%(?![0-9a-fA-F]{2})/.test(from)
  ) {
    return null;
  }

  try {
    // Validate the unnormalized path too: URL() resolves dot segments for us,
    // which must not turn a malformed input into an allowed destination.
    const rawPathname = from.split(/[?#]/, 1)[0];
    if (!rawPathname.startsWith("/") || rawPathname.startsWith("//")) return null;
    const rawSegments = rawPathname.slice(1).split("/");
    if (rawSegments.some((segment) => !segment)) return null;
    const decodedRawSegments = rawSegments.map((segment) => decodeURIComponent(segment));
    if (
      decodedRawSegments.some(
        (segment) =>
          segment === "." ||
          segment === ".." ||
          segment.includes("/") ||
          segment.includes("\\") ||
          /[\u0000-\u001f\u007f]/.test(segment)
      )
    ) {
      return null;
    }

    const destination = new URL(from, "http://internal.local");
    if (destination.origin !== "http://internal.local") return null;

    const segments = destination.pathname.split("/").filter(Boolean);

    if (segments[0] !== locale) return null;

    const isFollowList =
      segments.length === 3 &&
      Boolean(segments[1]) &&
      (segments[2] === "followers" || segments[2] === "following");
    const isSearchPage = segments.length === 2 && segments[1] === "search";
    const isMessagesPage = segments.length === 2 && segments[1] === "messages";
    const isConversation =
      segments.length === 3 &&
      segments[1] === "messages" &&
      Boolean(segments[2]);

    if (!isFollowList && !isSearchPage && !isMessagesPage && !isConversation) return null;

    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return null;
  }
}

export default function ProfileBackButton({
  locale,
  isOwner,
}: ProfileBackButtonProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("profile");
  const fromPath = getValidBackPath(searchParams.get("from"), locale);

  if (isOwner || !fromPath) return null;

  return (
    <button
      type="button"
      onClick={() => router.replace(fromPath)}
      aria-label={t("back")}
      title={t("back")}
      className="-ms-2 me-4 rounded-full p-2 transition-colors hover:bg-muted"
    >
      <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
    </button>
  );
}
