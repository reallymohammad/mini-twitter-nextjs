// components/post/Composer.tsx
"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Image as ImageIcon, Loader2, X } from "lucide-react";

const MAX_CONTENT_LENGTH = 280;
const MAX_MEDIA_COUNT = 4;

interface CurrentUser {
  id: string;
  username: string;
  name: string | null;
  avatarUrl: string | null;
}

interface ComposerProps {
  currentUser: CurrentUser;
  replyToId?: string;
  quotedPostId?: string;
  placeholder?: string;
  autoFocus?: boolean;
  onSuccess?: (post: unknown) => void;
}

export default function Composer({
  currentUser,
  replyToId,
  quotedPostId,
  placeholder,
  autoFocus,
  onSuccess,
}: ComposerProps) {
  const t = useTranslations("Composer");
  const router = useRouter();

  const [content, setContent] = useState("");
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const remaining = MAX_CONTENT_LENGTH - content.length;
  const isOverLimit = remaining < 0;
  const canSubmit =
    (content.trim().length > 0 || mediaFiles.length > 0) &&
    !isOverLimit &&
    !isUploading &&
    !isPending;

  function handleTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setContent(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (mediaFiles.length + files.length > MAX_MEDIA_COUNT) {
      setError(t("maxMediaError", { count: MAX_MEDIA_COUNT }));
      return;
    }
    setMediaFiles((prev) => [...prev, ...files]);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () =>
        setMediaPreviews((prev) => [...prev, reader.result as string]);
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  }

  function removeMedia(index: number) {
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));
    setMediaPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  async function uploadMediaFiles(): Promise<string[]> {
    if (mediaFiles.length === 0) return [];
    setIsUploading(true);
    try {
      return await Promise.all(
        mediaFiles.map(async (file) => {
          const formData = new FormData();
          formData.append("file", file);
          formData.append(
            "upload_preset",
            process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET as string
          );
          const res = await fetch(
            `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/upload`,
            { method: "POST", body: formData }
          );
          if (!res.ok) throw new Error("upload_failed");
          const data = await res.json();
          return data.secure_url as string;
        })
      );
    } finally {
      setIsUploading(false);
    }
  }

  async function handleSubmit() {
  setError(null);
  if (!canSubmit) return;

  try {
    const mediaUrls = await uploadMediaFiles();

    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: content.trim(),
        mediaUrls,
        expectedUserId: currentUser.id,
        ...(replyToId && { replyToId }),
        ...(quotedPostId && { quotedPostId }),
      }),
    });

    if (res.status === 409) {
      setError(t("sessionMismatchError"));
      router.refresh();
      return;
    }

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(data?.message ?? t("submitError"));
    }

    const post = await res.json();

    setContent("");
    setMediaFiles([]);
    setMediaPreviews([]);
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    startTransition(() => router.refresh());
    onSuccess?.(post);
  } catch (err) {
    setError(err instanceof Error ? err.message : t("submitError"));
  }
}


  return (
    <div className="flex gap-3 border-b border-neutral-200 p-4 dark:border-neutral-800">
      <Image
        src={currentUser.avatarUrl || "/default-avatar.png"}
        alt={currentUser.name ?? currentUser.username}
        width={44}
        height={44}
        className="h-11 w-11 shrink-0 rounded-full object-cover"
      />

      <div className="min-w-0 flex-1">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleTextChange}
          placeholder={placeholder ?? t(replyToId ? "replyPlaceholder" : "placeholder")}
          autoFocus={autoFocus}
          rows={1}
          dir="auto"
          className="w-full resize-none bg-transparent text-lg outline-none placeholder:text-neutral-500 dark:text-neutral-100"
        />

        <AnimatePresence>
          {mediaPreviews.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className={`mt-3 grid gap-2 overflow-hidden ${
                mediaPreviews.length === 1 ? "grid-cols-1" : "grid-cols-2"
              }`}
            >
              {mediaPreviews.map((src, index) => (
                <div key={index} className="relative aspect-video overflow-hidden rounded-xl">
                  <Image src={src} alt="" fill className="object-cover" />
                  <button
                    type="button"
                    onClick={() => removeMedia(index)}
                    className="absolute end-1.5 top-1.5 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}

        <div className="mt-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={mediaFiles.length >= MAX_MEDIA_COUNT}
            className="rounded-full p-2 text-sky-500 hover:bg-sky-500/10 disabled:opacity-40"
          >
            <ImageIcon size={20} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={handleFileSelect}
          />

          <div className="flex items-center gap-3">
            {content.length > 0 && (
              <span
                className={`text-xs tabular-nums ${
                  isOverLimit ? "text-red-500" : "text-neutral-500"
                }`}
              >
                {remaining}
              </span>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="rounded-full bg-sky-500 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-sky-600 disabled:opacity-40"
            >
              {isUploading || isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : replyToId ? (
                t("reply")
              ) : (
                t("post")
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
