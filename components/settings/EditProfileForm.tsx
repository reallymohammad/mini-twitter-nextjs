"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Lock } from "lucide-react";

interface InitialData {
  fullName: string;
  bio: string;
  location: string;
  website: string;
  birthDate: string;
  avatarUrl: string;
  coverImageUrl: string;
  isPrivate?: boolean;
}

interface Props {
  locale: string;
  username: string;
  initialData: InitialData;
}

export default function EditProfileForm({ locale, username, initialData }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<InitialData>({
    ...initialData,
    isPrivate: initialData.isPrivate ?? false,
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState(initialData.avatarUrl);
  const [coverPreview, setCoverPreview] = useState(initialData.coverImageUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  function set<K extends keyof InitialData>(field: K, value: InitialData[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleFileChange(
    e: React.ChangeEvent<HTMLInputElement>,
    type: "avatar" | "cover"
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);
    if (type === "avatar") {
      setAvatarFile(file);
      setAvatarPreview(preview);
    } else {
      setCoverFile(file);
      setCoverPreview(preview);
    }
  }

  async function uploadFile(file: File, type: "avatar" | "cover"): Promise<string> {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("type", type);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Upload failed");
    return data.url as string;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setUploading(true);
    setError("");

    try {
      const updated = { ...form };

      if (avatarFile) updated.avatarUrl = await uploadFile(avatarFile, "avatar");
      if (coverFile) updated.coverImageUrl = await uploadFile(coverFile, "cover");

      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");

      router.push(`/${locale}/${username}`);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setUploading(false);
    }
  }

  const inputClass =
    "w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-foreground transition-colors";
  const labelClass = "block text-xs font-medium text-muted-foreground mb-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Cover + Avatar upload area */}
      <div className="relative mb-12">
        {/* Cover */}
        <div
          className="relative w-full h-32 bg-muted rounded-xl overflow-hidden cursor-pointer group"
          onClick={() => coverInputRef.current?.click()}
        >
          {coverPreview ? (
            <Image src={coverPreview} alt="Cover" fill className="object-cover" />
          ) : null}
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
            <CameraIcon />
          </div>
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFileChange(e, "cover")}
          />
        </div>

        {/* Avatar */}
        <div
          className="absolute -bottom-10 left-4 w-20 h-20 rounded-full border-4 border-background bg-muted overflow-hidden cursor-pointer group"
          onClick={() => avatarInputRef.current?.click()}
        >
          {avatarPreview ? (
            <Image src={avatarPreview} alt="Avatar" fill className="object-cover" />
          ) : null}
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
            <CameraIcon size={16} />
          </div>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFileChange(e, "avatar")}
          />
        </div>
      </div>

      {/* Full Name */}
      <div>
        <div className="flex justify-between">
          <label className={labelClass}>Full name *</label>
          <span className="text-xs text-muted-foreground">{form.fullName.length}/50</span>
        </div>
        <input
          className={inputClass}
          value={form.fullName}
          maxLength={50}
          required
          onChange={(e) => set("fullName", e.target.value)}
        />
      </div>

      {/* Bio */}
      <div>
        <div className="flex justify-between">
          <label className={labelClass}>Bio</label>
          <span className="text-xs text-muted-foreground">{form.bio.length}/160</span>
        </div>
        <textarea
          className={`${inputClass} resize-none`}
          rows={3}
          value={form.bio}
          maxLength={160}
          onChange={(e) => set("bio", e.target.value)}
        />
      </div>

      {/* Location */}
      <div>
        <label className={labelClass}>Location</label>
        <input
          className={inputClass}
          value={form.location}
          maxLength={30}
          onChange={(e) => set("location", e.target.value)}
        />
      </div>

      {/* Website */}
      <div>
        <label className={labelClass}>Website (include https://)</label>
        <input
          className={inputClass}
          value={form.website}
          placeholder="https://example.com"
          onChange={(e) => set("website", e.target.value)}
        />
      </div>

      {/* Birth Date */}
      <div>
        <label className={labelClass}>Birth date</label>
        <input
          type="date"
          className={inputClass}
          value={form.birthDate}
          onChange={(e) => set("birthDate", e.target.value)}
        />
      </div>

      {/* Account Privacy Toggle */}
      <div className="pt-2">
        <div className="flex items-center justify-between rounded-xl border border-border p-3.5 bg-muted/40 hover:bg-muted/70 transition-colors">
          <div className="flex items-start gap-3 pe-2">
            <div className="mt-0.5 rounded-full p-2 bg-background border border-border text-foreground">
              <Lock className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <label
                htmlFor="isPrivateSwitch"
                className="text-sm font-semibold cursor-pointer select-none"
              >
                Private account
              </label>
              <p className="text-xs text-muted-foreground leading-relaxed">
                When your account is private, only people you approve can see your posts and follower lists.
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              id="isPrivateSwitch"
              type="checkbox"
              className="sr-only peer"
              checked={Boolean(form.isPrivate)}
              onChange={(e) => set("isPrivate", e.target.checked)}
            />
            <div className="w-11 h-6 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-foreground"></div>
          </label>
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={uploading}
          className="px-5 py-2 text-sm font-medium rounded-full bg-foreground text-background hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {uploading ? "Uploading…" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-5 py-2 text-sm font-medium rounded-full border border-border hover:bg-muted transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function CameraIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="white"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}
