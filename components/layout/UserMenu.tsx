// components/UserMenu.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import { createPortal } from "react-dom";


type SessionUser = {
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  isActive: boolean;
};

type InitialUser = {
  username: string;
  avatarUrl?: string | null;
  fullName: string;
};

interface UserMenuProps {
  initialUser: InitialUser;
  activeSessionId: string | null;
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px] fill-primary shrink-0">
      <path d="M9.6 16.6L4.5 11.5l1.4-1.4 3.7 3.7 8.5-8.5 1.4 1.4z" />
    </svg>
  );
}

function PlusAvatarIcon() {
  return (
    <div className="flex size-9 items-center justify-center rounded-full border border-dashed border-border shrink-0">
      <svg viewBox="0 0 24 24" className="size-4 fill-muted-foreground">
        <path
          d="M12 4v16m-8-8h16"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

function AvatarSkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="size-9 animate-pulse rounded-full bg-muted shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 w-24 animate-pulse rounded bg-muted" />
        <div className="h-2.5 w-16 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

function UserAvatar({ avatarUrl }: { avatarUrl: string | null | undefined }) {
  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt=""
        width={36}
        height={36}
        className="shrink-0 rounded-full object-cover"
      />
    );
  }
  return <div className="size-9 shrink-0 rounded-full bg-muted" />;
}
export default function UserMenu({ initialUser, activeSessionId }: UserMenuProps) {
  const [sessions, setSessions] = useState<SessionUser[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const [triggerUser, setTriggerUser] = useState<{
    username: string;
    fullName: string;
    avatarUrl: string | null;
  }>({
    username: initialUser.username,
    fullName: initialUser.fullName,
    avatarUrl: initialUser.avatarUrl ?? null,
  });

  // موقعیت واقعی دراپ‌داون روی صفحه (چون از طریق portal بیرون از سایدبار mount میشه)
  const [coords, setCoords] = useState<{
    bottom: number;
    left: number;
    width: number;
  } | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("userMenu");

  const otherUsers = sessions.filter((s) => !s.isActive);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
  setTriggerUser({
    username: initialUser.username,
    fullName: initialUser.fullName,
    avatarUrl: initialUser.avatarUrl ?? null,
  });
}, [initialUser]);


  useEffect(() => {
    const active = sessions.find((s) => s.isActive);
    if (active?.username && active?.fullName) {
      setTriggerUser({
        username: active.username,
        fullName: active.fullName,
        avatarUrl: active.avatarUrl,
      });
    }
  }, [sessions]);

  // محاسبه موقعیت دکمه‌ی trigger برای قرار دادن دراپ‌داون پورتال‌شده
  useEffect(() => {
    if (!open) return;

    const updateCoords = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setCoords({
        bottom: window.innerHeight - rect.top + 8,
        left: rect.left,
        width: rect.width,
      });
    };

    updateCoords();
    window.addEventListener("resize", updateCoords);
    window.addEventListener("scroll", updateCoords, true);
    return () => {
      window.removeEventListener("resize", updateCoords);
      window.removeEventListener("scroll", updateCoords, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        !triggerRef.current?.contains(e.target as Node)
      ) {
        close();
      }
    }

    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        close();
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, close]);

  async function fetchSessions() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/sessions");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSessions(data.sessions ?? []);
    } catch {
      setError(t("loadError"));
    } finally {
      setLoading(false);
    }
  }

  function handleOpen() {
    const next = !open;
    setOpen(next);
    if (next && sessions.length === 0) {
      fetchSessions();
    }
  }

async function handleSwitch(sessionId: string) {
  try {
    const res = await fetch("/api/auth/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
    if (!res.ok) throw new Error();

    const targetUser = sessions.find((s) => s.id === sessionId);

    close();
    setSessions([]);

    // hard navigation: کش کلاینت (RSC cache, router cache) کامل باطل می‌شود
    // و سرور با کوکی سشن جدید صفحه را از صفر می‌سازد
    window.location.assign(
      targetUser?.username ? `/${locale}/${targetUser.username}` : `/${locale}`
    );
  } catch {
    setError(t("switchError"));
  }
}

const handleSignout = async () => {
  if (!activeSessionId) return;
  try {
    const res = await fetch("/api/auth/signout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: activeSessionId }),
    });
    if (!res.ok) throw new Error();

    const data = await res.json();

    close();
    setSessions([]);

    if (data.switched) {
      const nextUser = otherUsers[0];
      window.location.assign(
        nextUser?.username ? `/${locale}/${nextUser.username}` : `/${locale}`
      );
    } else {
      window.location.assign(`/${locale}/login`);
    }
  } catch {
    setError(t("switchError"));
  }
};




  return (
    <div className="relative">
      {/* Trigger */}
      <button
        ref={triggerRef}
        onClick={handleOpen}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex w-full min-w-0 items-center gap-3 rounded-full px-3 py-2 text-start transition-colors hover:bg-muted"
      >
        <UserAvatar avatarUrl={triggerUser.avatarUrl} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold leading-tight">
            {triggerUser.fullName}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            @{triggerUser.username}
          </p>
        </div>
        <svg
          viewBox="0 0 24 24"
          className="size-4 shrink-0 fill-muted-foreground"
        >
          <circle cx="5" cy="12" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="19" cy="12" r="1.8" />
        </svg>
      </button>

      {/* Dropdown — از طریق portal مستقیماً زیر document.body mount می‌شود
          تا هیچ overflow/z-index والدی (سایدبار) نتواند آن را ببرد یا مخفی کند */}
      {mounted &&
  open &&
  coords &&
  createPortal(
    <div
      ref={menuRef}
      role="menu"
      style={{
        position: "fixed",
        bottom: coords.bottom,
        left: coords.left,
        width: coords.width,
        zIndex: 9999,
      }}
      className="
        isolate
        origin-bottom-left
        overflow-hidden
        rounded-2xl
        border
        border-border
        bg-background
        text-foreground
        opacity-100
        shadow-2xl
      "
    >
      {/* Active user */}
      <div className="flex items-center gap-3 bg-background px-4 py-3">
        <UserAvatar avatarUrl={triggerUser.avatarUrl} />

        <div className="min-w-0 flex-1 text-start">
          <p className="truncate text-sm font-bold leading-tight">
            {triggerUser.fullName}
          </p>

          <p className="truncate text-xs text-muted-foreground">
            @{triggerUser.username}
          </p>
        </div>

        <CheckIcon />
      </div>

      <hr className="border-border" />

      {/* Loading */}
      {loading && (
        <div className="bg-background py-1">
          <AvatarSkeletonRow />
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <p className="bg-background px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {/* Other accounts */}
      {!loading && !error && otherUsers.length > 0 && (
        <>
          {otherUsers.map((session) => (
            <button
              key={session.id}
              type="button"
              role="menuitem"
              onClick={() => handleSwitch(session.id)}
              className="
                flex w-full items-center gap-3
                bg-background px-4 py-3
                text-start transition-colors
                hover:bg-muted
              "
            >
              <UserAvatar avatarUrl={session.avatarUrl} />

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {session.fullName}
                </p>

                <p className="truncate text-xs text-muted-foreground">
                  @{session.username}
                </p>
              </div>
            </button>
          ))}

          <hr className="border-border" />
        </>
      )}

      {/* Actions */}
      {!loading && (
        <>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              close();
              router.push(`/${locale}/login?mode=add`);
            }}
            className="
              flex w-full items-center gap-3
              bg-background px-4 py-3
              text-start transition-colors
              hover:bg-muted
            "
          >
            <PlusAvatarIcon />

            <span className="text-sm font-medium">
              {t("addAccount")}
            </span>
          </button>

          <hr className="border-border" />

          <button
            type="button"
            role="menuitem"
            onClick={handleSignout}
            className="
              w-full bg-background px-4 py-3
              text-start text-sm font-medium
              transition-colors hover:bg-muted
            "
          >
            {t("logoutUser", {
              username: triggerUser.username,
            })}
          </button>
        </>
      )}
    </div>,
    document.body
  )}

    </div>
  );
}
