// app/[locale]/compose/page.tsx
"use client";

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { useRouter, useParams } from "next/navigation";
import TextareaAutosize from "react-textarea-autosize";
import Image from "next/image";
import { toast } from "sonner";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { ImageIcon, X, Loader2 } from "lucide-react";

const MAX_LENGTH = 280;

export default function ComposePage() {
  const router = useRouter();
  const t = useTranslations("compose");
  const currentUser = useCurrentUser();

  const [content, setContent] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { locale } = useParams<{ locale: string }>();

  const remaining = MAX_LENGTH - content.length;
  const canSubmit =
    (content.trim().length > 0 || !!mediaFile) &&
    remaining >= 0 &&
    !isSubmitting;

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("error.fileSize"));
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error(t("error.fileType"));
      return;
    }

    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
  };

  const handleRemoveMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!currentUser) {
      toast.error(t("error.notLoggedIn"));
      return;
    }
    if (!canSubmit) return;

    setIsSubmitting(true);
    let mediaUrls: string[] = [];

    try {
      if (mediaFile) {
        const formData = new FormData();
        formData.append("file", mediaFile);
        formData.append("type", "post");

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          const err = await uploadRes.json();
          throw new Error(err.error || t("error.uploadFailed"));
        }

        const data = await uploadRes.json();
        mediaUrls = [data.url];
      }

      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim(), mediaUrls }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || t("error.postFailed"));
      }

      const post = await res.json();

      toast.success(t("success"));

      setContent("");
      handleRemoveMedia();

      router.push(`/${locale}/status/${post.id}`);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || t("error.unexpected"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-4">
      <div className="flex gap-3">
        <div className="relative w-12 h-12 flex-shrink-0">
          {currentUser?.avatarUrl ? (
            <Image
              src={currentUser.avatarUrl}
              alt={currentUser.username}
              width={48}
              height={48}
              className="rounded-full object-cover w-12 h-12"
              onError={(e) => {
                const target = e.currentTarget;
                target.style.display = "none";
                const fallback = target.nextElementSibling as HTMLElement;
                if (fallback) fallback.style.display = "flex";
              }}
            />
          ) : null}
          <div
            className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xl font-semibold text-gray-600 dark:text-gray-300"
            style={{ display: currentUser?.avatarUrl ? "none" : "flex" }}
          >
            {currentUser?.fullName?.[0]?.toUpperCase() || "؟"}
          </div>
        </div>

        <div className="flex-1">
          <TextareaAutosize
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t("placeholder")}
            className="w-full resize-none bg-transparent outline-none text-lg placeholder:text-gray-400 min-h-[80px]"
            disabled={isSubmitting}
            autoFocus
            dir="auto"
          />

          {mediaPreview && (
            <div className="relative mt-3 rounded-2xl overflow-hidden border border-gray-200">
              <Image
                src={mediaPreview}
                alt="preview"
                width={500}
                height={300}
                className="w-full max-h-80 object-cover"
              />
              <button
                type="button"
                onClick={handleRemoveMedia}
                disabled={isSubmitting}
                className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1.5"
              >
                <X size={16} />
              </button>
            </div>
          )}

          <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleMediaChange}
                className="hidden"
                id="media-upload-input"
                disabled={isSubmitting || !!mediaFile}
              />
              <label
                htmlFor="media-upload-input"
                className={`cursor-pointer text-blue-500 hover:text-blue-600 ${
                  isSubmitting || mediaFile
                    ? "opacity-50 pointer-events-none"
                    : ""
                }`}
              >
                <ImageIcon size={20} />
              </label>
            </div>

            <div className="flex items-center gap-3">
              <span
                className={`text-sm ${
                  remaining < 0
                    ? "text-red-500"
                    : remaining <= 20
                    ? "text-yellow-500"
                    : "text-gray-400"
                }`}
              >
                {remaining}
              </span>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-5 py-1.5 rounded-full flex items-center gap-2"
              >
                {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                {t("submit")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
