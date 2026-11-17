"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

type Props = {
  locale: string;
  kind: "blocked-by-me" | "blocked-me";
  user: {
    id: string;
    username: string;
    fullName?: string | null;
  };
  onUnblockSuccess?: () => void;
};

const copyByLocale = {
  fa: {
    blockedByMeTitle: "شما @{username} را بلاک کرده‌اید",
    blockedByMeDescription:
      "پست‌های این حساب را نخواهید دید و او نمی‌تواند شما را دنبال کند یا به شما پیام دهد.",
    unblockBtn: "رفع بلاک",
    unblocking: "در حال رفع بلاک...",
    blockedMeTitle: "شما بلاک شده‌اید",
    blockedMeDescription:
      "شما امکان مشاهده پست‌ها، دنبال کردن یا تعامل با @{username} را ندارید.",
  },
  en: {
    blockedByMeTitle: "You blocked @{username}",
    blockedByMeDescription:
      "You will not see their posts, and they cannot follow or message you.",
    unblockBtn: "Unblock",
    unblocking: "Unblocking...",
    blockedMeTitle: "You're blocked",
    blockedMeDescription:
      "You cannot follow, see posts, or interact with @{username}.",
  },
  ar: {
    blockedByMeTitle: "لقد حظرت @{username}",
    blockedByMeDescription:
      "لن ترى منشورات هذا الحساب، ولا يمكنه متابعتك أو مراسلتك.",
    unblockBtn: "إلغاء الحظر",
    unblocking: "جارٍ إلغاء الحظر...",
    blockedMeTitle: "تم حظرك",
    blockedMeDescription:
      "لا يمكنك متابعة @{username} أو رؤية منشوراته أو التفاعل معه.",
  },
};

export default function BlockedProfileState({
  locale,
  kind,
  user,
  onUnblockSuccess,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const t =
    copyByLocale[locale as keyof typeof copyByLocale] ?? copyByLocale.en;

  const handleUnblock = () => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/users/${user.id}/block`, {
          method: "DELETE",
        });
        if (!res.ok) {
          throw new Error("Failed to unblock");
        }
        if (onUnblockSuccess) {
          onUnblockSuccess();
        } else {
          router.refresh();
        }
      } catch (err) {
        console.error(err);
        setError(locale === "fa" ? "خطا در رفع بلاک" : "Failed to unblock");
      }
    });
  };

  if (kind === "blocked-by-me") {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-16 text-center border-t border-border">
        <h2 className="text-xl font-bold text-foreground">
          {t.blockedByMeTitle.replace("{username}", user.username)}
        </h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground leading-relaxed">
          {t.blockedByMeDescription}
        </p>

        <div className="mt-6 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={handleUnblock}
            disabled={isPending}
            className="inline-flex items-center justify-center min-w-[130px] rounded-full bg-destructive px-5 py-2 text-sm font-semibold text-destructive-foreground transition hover:bg-destructive/90 disabled:opacity-60"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              t.unblockBtn
            )}
          </button>
          {error && <span className="text-xs text-red-500">{error}</span>}
        </div>
      </div>
    );
  }

  // kind === "blocked-me"
  return (
    <div className="flex flex-col items-center justify-center px-4 py-20 text-center border-t border-border">
      <h2 className="text-2xl font-extrabold text-foreground">
        {t.blockedMeTitle}
      </h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground leading-relaxed">
        {t.blockedMeDescription.replace("{username}", user.username)}
      </p>
    </div>
  );
}
