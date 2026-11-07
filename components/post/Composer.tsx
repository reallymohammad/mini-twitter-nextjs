"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Image as ImageIcon, Loader2, X, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { PostWithRelations } from "@/lib/types/post";

const MAX_CONTENT_LENGTH = 280;
const MAX_MEDIA_COUNT = 4;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

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
  quotedPost?: PostWithRelations | null;
  onRemoveQuote?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  onSuccess?: (post: unknown) => void;
}

interface UploadSignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
}

export default function Composer({
  currentUser,
  replyToId,
  quotedPostId: initialQuotedPostId,
  quotedPost: initialQuotedPost,
  onRemoveQuote,
  placeholder,
  autoFocus,
  onSuccess,
}: ComposerProps) {
  const t = useTranslations("Composer");
  const router = useRouter();

  const [content, setContent] = useState("");
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [activeQuotedPost, setActiveQuotedPost] = useState<PostWithRelations | null>(
    initialQuotedPost ?? null
  );
  const activeQuotedPostId = activeQuotedPost?.id ?? initialQuotedPostId;

  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const remaining = MAX_CONTENT_LENGTH - content.length;
  const isOverLimit = remaining < 0;
  const canSubmit =
    (content.trim().length > 0 || mediaFiles.length > 0 || Boolean(activeQuotedPostId)) &&
    !isOverLimit &&
    !isUploading &&
    !isSubmitting &&
    !isPending;

  function safeTranslate(key: string, fallback: string, values?: Record<string, any>) {
    try {
      return t(key as any, values);
    } catch {
      return fallback;
    }
  }

  function handleTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setContent(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;

    if (mediaFiles.length + files.length > MAX_MEDIA_COUNT) {
      setError(
        safeTranslate(
          "maxMediaError",
          `You can only upload up to ${MAX_MEDIA_COUNT} images.`,
          { count: MAX_MEDIA_COUNT }
        )
      );
      return;
    }
    if (files.some((f) => !f.type.startsWith("image/"))) {
      setError("Only image files are allowed.");
      return;
    }
    if (files.some((f) => f.size > MAX_FILE_SIZE)) {
      setError("Each image must be smaller than 10MB.");
      return;
    }

    setError(null);
    setMediaFiles((prev) => [...prev, ...files]);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () =>
        setMediaPreviews((prev) => [...prev, reader.result as string]);
      reader.readAsDataURL(file);
    });
  }

  function removeMedia(index: number) {
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));
    setMediaPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  function handleRemoveQuote() {
    setActiveQuotedPost(null);
    onRemoveQuote?.();
  }

  async function uploadMediaFiles(): Promise<string[]> {
    if (mediaFiles.length === 0) return [];
    setIsUploading(true);

    try {
      return await Promise.all(
        mediaFiles.map(async (file) => {
          // One fresh signature per file (served by our own backend)
          const signRes = await fetch("/api/upload/sign", { method: "POST" });
          if (!signRes.ok) {
            const err = await signRes.json().catch(() => null);
            throw new Error(err?.error || "Could not authorize upload");
          }
          const sig = (await signRes.json()) as UploadSignature;

          const formData = new FormData();
          formData.append("file", file);
          formData.append("api_key", sig.apiKey);
          formData.append("timestamp", String(sig.timestamp));
          formData.append("signature", sig.signature);
          formData.append("folder", sig.folder);

          const res = await fetch(
            `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`,
            { method: "POST", body: formData }
          );

          if (!res.ok) {
            const errData = await res.json().catch(() => null);
            console.error("Cloudinary error response:", errData);
            throw new Error(errData?.error?.message || "Image upload failed");
          }

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
    setIsSubmitting(true);

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
          ...(activeQuotedPostId && { quoteOfId: activeQuotedPostId }),
        }),
      });

      if (res.status === 409) {
        setError(safeTranslate("sessionMismatchError", "Session expired. Refreshing..."));
        router.refresh();
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(
          data?.message ||
            data?.error ||
            safeTranslate("submitError", "Failed to send post. Please try again.")
        );
      }

      const post = await res.json();

      setContent("");
      setMediaFiles([]);
      setMediaPreviews([]);
      setActiveQuotedPost(null);
      if (textareaRef.current) textareaRef.current.style.height = "auto";

      startTransition(() => router.refresh());
      onSuccess?.(post);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : safeTranslate("submitError", "An unexpected error occurred.")
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const busy = isUploading || isSubmitting || isPending;

  return (
    <div className="relative flex flex-col p-4">
      <div className="flex gap-3">
        <div className="shrink-0">
          {currentUser.avatarUrl ? (
            <Image
              src={currentUser.avatarUrl}
              alt={currentUser.name ?? currentUser.username}
              width={40}
              height={40}
              className="size-10 rounded-full object-cover"
            />
          ) : (
            <div className="flex size-10 items-center justify-center rounded-full bg-muted font-bold text-muted-foreground">
              {currentUser.username?.[0]?.toUpperCase() ?? "U"}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleTextChange}
            placeholder={
              placeholder ??
              (activeQuotedPostId
                ? safeTranslate("quotePlaceholder", "Add a comment...")
                : safeTranslate(
                    replyToId ? "replyPlaceholder" : "placeholder",
                    replyToId ? "Post your reply" : "What is happening?!"
                  ))
            }
            autoFocus={autoFocus}
            rows={2}
            dir="auto"
            className="w-full resize-none bg-transparent text-base outline-none placeholder:text-muted-foreground text-foreground md:text-lg"
          />

          <AnimatePresence>
            {mediaPreviews.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className={`mt-2 grid max-h-56 gap-2 overflow-hidden ${
                  mediaPreviews.length === 1 ? "grid-cols-1" : "grid-cols-2"
                }`}
              >
                {mediaPreviews.map((src, index) => (
                  <div
                    key={index}
                    className="relative aspect-video max-h-48 overflow-hidden rounded-xl border border-border"
                  >
                    <Image src={src} alt="Preview" fill unoptimized className="object-cover" />
                    <button
                      type="button"
                      onClick={() => removeMedia(index)}
                      className="absolute end-1.5 top-1.5 z-10 rounded-full bg-black/70 p-1 text-white backdrop-blur transition hover:bg-black/90"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {activeQuotedPost && (
            <div className="relative mt-2.5 overflow-hidden rounded-2xl border border-border/80 bg-muted/20 p-3 transition-colors">
              <button
                type="button"
                onClick={handleRemoveQuote}
                className="absolute end-2 top-2 z-10 rounded-full bg-black/60 p-1 text-white backdrop-blur transition hover:bg-black/80"
                title="Remove quote"
              >
                <X size={14} />
              </button>

              <div className="flex items-center gap-2">
                {activeQuotedPost.author?.avatarUrl ? (
                  <Image
                    src={activeQuotedPost.author.avatarUrl}
                    alt={activeQuotedPost.author.username}
                    width={20}
                    height={20}
                    className="size-5 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex size-5 items-center justify-center rounded-full bg-muted text-[10px] font-bold">
                    {activeQuotedPost.author?.username?.[0]?.toUpperCase()}
                  </div>
                )}
                <span className="truncate text-xs font-bold text-foreground">
                  {activeQuotedPost.author?.fullName || activeQuotedPost.author?.username}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  @{activeQuotedPost.author?.username}
                </span>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {formatDistanceToNow(new Date(activeQuotedPost.createdAt), {
                    addSuffix: true,
                  })}
                </span>
              </div>

              {activeQuotedPost.content && (
                <p className="mt-1.5 line-clamp-3 text-xs md:text-sm text-foreground/90">
                  {activeQuotedPost.content}
                </p>
              )}

              {activeQuotedPost.mediaUrls?.length > 0 && (
                <div className="relative mt-2 h-36 w-full overflow-hidden rounded-xl border border-border/50">
                  <Image
                    src={activeQuotedPost.mediaUrls[0]}
                    alt="Quoted media"
                    fill
                    className="object-cover"
                  />
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-red-500">
              <AlertCircle size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>

      <div className="sticky bottom-0 z-20 mt-3 flex items-center justify-between border-t border-border/60 bg-background/95 pt-2.5 backdrop-blur">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={mediaFiles.length >= MAX_MEDIA_COUNT || busy}
            className="rounded-full p-2 text-sky-500 transition hover:bg-sky-500/10 disabled:opacity-40"
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
        </div>

        <div className="flex items-center gap-3">
          {content.length > 0 && (
            <span
              className={`text-xs tabular-nums ${
                isOverLimit ? "text-red-500 font-semibold" : "text-muted-foreground"
              }`}
            >
              {remaining}
            </span>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex items-center justify-center rounded-full bg-sky-500 px-5 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-600 disabled:opacity-40"
          >
            {busy ? (
              <Loader2 size={16} className="animate-spin" />
            ) : replyToId ? (
              safeTranslate("reply", "Reply")
            ) : activeQuotedPostId ? (
              safeTranslate("quote", "Quote")
            ) : (
              safeTranslate("post", "Post")
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
