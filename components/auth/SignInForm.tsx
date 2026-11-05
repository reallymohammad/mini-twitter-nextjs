"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";

export default function SignInForm() {
  const t = useTranslations("auth.signin");
  const router = useRouter();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [errors, setErrors] = useState<{
    identifier?: string;
    password?: string;
    general?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const locale = useLocale();
  const searchParams = useSearchParams();
  const mode = (searchParams.get("mode") as "new" | "add") ?? "new";

  function validate() {
    const next: typeof errors = {};
    if (!identifier.trim()) next.identifier = "Required";
    if (!password) next.password = "Required";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    e.stopPropagation();
    
    setServerError(null);
    if (!validate()) {
      console.log("Validation failed:", { identifier, password });
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      console.log("Sending signin request...");
      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: identifier.trim(),
          password,
          remember,
          locale,
          mode,
        }),
      });

      const data = await res.json();
      console.log("Signin response:", res.status, data);

      if (!res.ok) {
        const msg = data.error ?? "Invalid credentials.";
        setServerError(msg);
        setErrors({ general: msg });
        return;
      }

      const target = data.redirectTo || `/${locale}/home`;
      router.push(target);
      router.refresh();
    } catch (err) {
      console.error("Fetch error:", err);
      const msg = "Network error. Please try again.";
      setServerError(msg);
      setErrors({ general: msg });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-sm sm:max-w-md mx-auto block opacity-100">
      <div className="relative rounded-2xl sm:rounded-3xl border border-neutral-800 bg-neutral-900 p-5 sm:p-8 shadow-2xl">
        {/* Glow Background */}
        <div className="absolute -inset-px rounded-2xl sm:rounded-3xl bg-gradient-to-br from-indigo-500/15 via-violet-500/15 to-fuchsia-500/15 blur-lg -z-10 pointer-events-none" />

        {/* Header */}
        <div className="mb-6 sm:mb-8 text-center">
          <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
            {t("title")}
          </h1>
          <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-neutral-300">
            {t("subtitle")}
          </p>
        </div>

        {/* Error Alert */}
        {(errors.general || serverError) && (
          <div className="mb-4 sm:mb-5 rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-xs sm:text-sm text-red-400 leading-relaxed">
            {errors.general ?? serverError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4 sm:space-y-5">
          {/* Identifier Input */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-neutral-200 mb-1.5">
              {t("fields.identifier")}
            </label>
            <div className="relative flex items-center">
              <Mail className="absolute start-3.5 h-4 w-4 text-neutral-400 pointer-events-none" />
              <input
                type="text"
                value={identifier}
                autoComplete="username"
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  if (errors.identifier)
                    setErrors((prev) => ({ ...prev, identifier: undefined }));
                }}
                placeholder={t("placeholders.identifier")}
                className={`w-full rounded-xl bg-neutral-950 border ps-10 pe-4 py-3 sm:py-2.5 text-base sm:text-sm text-neutral-100 placeholder:text-neutral-500 outline-none transition focus:border-violet-400/50 focus:ring-2 focus:ring-violet-400/20 ${
                  errors.identifier ? "border-red-500/40" : "border-neutral-800"
                }`}
              />
            </div>
            {errors.identifier && (
              <p className="mt-1.5 text-xs text-red-400">{errors.identifier}</p>
            )}
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-neutral-200 mb-1.5">
              {t("fields.password")}
            </label>
            <div className="relative flex items-center">
              <Lock className="absolute start-3.5 h-4 w-4 text-neutral-400 pointer-events-none" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                autoComplete="current-password"
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password)
                    setErrors((prev) => ({ ...prev, password: undefined }));
                }}
                placeholder={t("placeholders.password")}
                className={`w-full rounded-xl bg-neutral-950 border ps-10 pe-11 py-3 sm:py-2.5 text-base sm:text-sm text-neutral-100 placeholder:text-neutral-500 outline-none transition focus:border-violet-400/50 focus:ring-2 focus:ring-violet-400/20 ${
                  errors.password ? "border-red-500/40" : "border-neutral-800"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label="Toggle password visibility"
                className="absolute end-0 h-full px-3.5 flex items-center text-neutral-400 hover:text-neutral-200 transition"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1.5 text-xs text-red-400">{errors.password}</p>
            )}
          </div>

          {/* Remember me & Forgot Password */}
          <div className="flex items-center justify-between text-xs sm:text-sm pt-1">
            <label className="flex items-center gap-2 text-neutral-200 cursor-pointer select-none py-1">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 rounded border-neutral-700 bg-neutral-950 accent-violet-500 cursor-pointer"
              />
              <span>{t("rememberMe")}</span>
            </label>
            <Link
              href={`/${locale}/forgot-password`}
              className="text-violet-400 hover:text-violet-300 transition py-1"
            >
              {t("forgotPassword")}
            </Link>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 py-3 sm:py-2.5 text-sm font-semibold text-white hover:opacity-95 active:opacity-90 transition disabled:opacity-60 shadow-lg shadow-violet-500/20 mt-2"
          >
            {isSubmitting ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <>
                <span>{t("submit")}</span>
                <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              </>
            )}
          </button>
        </form>

        {/* Footer Link */}
        <p className="mt-6 text-center text-xs sm:text-sm text-neutral-300">
          {t("noAccount")}{" "}
          <Link
            href={`/${locale}/signup`}
            className="font-medium text-violet-400 hover:text-violet-300 transition underline-offset-4 hover:underline"
          >
            {t("signUp")}
          </Link>
        </p>
      </div>
    </div>
  );
}
