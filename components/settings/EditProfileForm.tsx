"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface InitialData {
  fullName: string;
  bio: string;
  location: string;
  website: string;
  birthDate: string;
  avatarUrl: string;
  coverImageUrl: string;
}

interface Props {
  locale: string;
  username: string;
  initialData: InitialData;
}

export default function EditProfileForm({ locale, username, initialData }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<InitialData>(initialData);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function set(field: keyof InitialData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const res = await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
      return;
    }

    router.push(`/${locale}/${username}`);
    router.refresh();
  }

  const inputClass =
    "w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-foreground transition-colors";
  const labelClass = "block text-xs font-medium text-muted-foreground mb-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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

      {/* Avatar URL */}
      <div>
        <label className={labelClass}>Avatar URL</label>
        <input
          className={inputClass}
          value={form.avatarUrl}
          placeholder="https://..."
          onChange={(e) => set("avatarUrl", e.target.value)}
        />
      </div>

      {/* Cover Image URL */}
      <div>
        <label className={labelClass}>Cover image URL</label>
        <input
          className={inputClass}
          value={form.coverImageUrl}
          placeholder="https://..."
          onChange={(e) => set("coverImageUrl", e.target.value)}
        />
      </div>

      {/* Error */}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2 text-sm font-medium rounded-full bg-foreground text-background hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {saving ? "Saving…" : "Save"}
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
