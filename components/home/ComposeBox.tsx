"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Avatar from "@/components/ui/Avatar";
import { Image as ImageIcon, Smile, MapPin } from "lucide-react";

export default function ComposeBox() {
  const t = useTranslations("Home");
  const [value, setValue] = useState("");

  return (
    <div className="flex gap-3 px-4 py-4 border-b border-neutral-100 dark:border-neutral-900">
      <Avatar name="Mohammad" gradient="from-violet-500 to-fuchsia-500" size={44} />

      <div className="flex-1 flex flex-col gap-3">
        <textarea
          rows={2}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t("whatsHappening")}
          className="w-full resize-none bg-transparent text-xl outline-none placeholder:text-neutral-400 dark:placeholder:text-neutral-500"
        />

        <div className="flex items-center justify-between border-t border-neutral-100 dark:border-neutral-900 pt-3">
          <div className="flex items-center gap-1 text-violet-500">
            <button className="p-2 rounded-full hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors">
              <ImageIcon className="w-5 h-5" />
            </button>
            <button className="p-2 rounded-full hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors">
              <Smile className="w-5 h-5" />
            </button>
            <button className="p-2 rounded-full hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors">
              <MapPin className="w-5 h-5" />
            </button>
          </div>

          <button
            disabled={!value.trim()}
            className="rounded-full bg-violet-600 disabled:bg-violet-300 dark:disabled:bg-violet-900 disabled:text-white/60 text-white font-bold px-5 py-2 text-sm hover:bg-violet-500 transition-colors disabled:cursor-not-allowed"
          >
            {t("post")}
          </button>
        </div>
      </div>
    </div>
  );
}
