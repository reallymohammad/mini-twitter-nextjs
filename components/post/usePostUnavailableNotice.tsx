"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";

export function usePostUnavailableNotice() {
  const t = useTranslations("Post");
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showPostUnavailable = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    setVisible(true);

    timerRef.current = setTimeout(() => {
      setVisible(false);
      timerRef.current = null;
    }, 4000);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const postUnavailableNotice = visible
    ? createPortal(
        <div
          role="alert"
          className="fixed inset-x-4 bottom-5 z-[100] mx-auto flex w-fit max-w-md items-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-medium text-white shadow-xl"
        >
          <AlertCircle className="size-5 shrink-0" aria-hidden="true" />
          <span>{t("postUnavailable")}</span>
        </div>,
        document.body
      )
    : null;

  return { showPostUnavailable, postUnavailableNotice };
}
