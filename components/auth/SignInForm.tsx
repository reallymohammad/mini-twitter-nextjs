"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import Link from "next/link";
import { useLocale } from "next-intl";

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


  function validate() {
    const next: typeof errors = {};
    if (!identifier.trim()) next.identifier = t("errors.identifierRequired");
    if (!password) next.password = t("errors.passwordRequired");
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);
    if (!validate()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailOrUsername: identifier,
          password,
          remember,
          locale,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg = data.error ?? "Invalid credentials.";
        setServerError(msg);
        setErrors({ general: msg });
        return;
      }

      router.push(data.redirectTo);
    } catch {
      const msg = "Network error. Please try again.";
      setServerError(msg);
      setErrors({ general: msg });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="w-full max-w-md mx-auto"
    >
      <div className="relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 shadow-2xl">
        <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-indigo-500/20 via-violet-500/20 to-fuchsia-500/20 blur-xl -z-10" />

        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
            {t("title")}
          </h1>
          <p className="mt-2 text-sm text-white/50">{t("subtitle")}</p>
        </div>

        {(errors.general || serverError) && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-400"
          >
            {errors.general ?? serverError}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm text-white/70 mb-1.5">
              {t("fields.identifier")}
            </label>
            <div className="relative">
              <Mail className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <input
                type="text"
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  if (errors.identifier)
                    setErrors((prev) => ({ ...prev, identifier: undefined }));
                }}
                placeholder={t("placeholders.identifier")}
                className={`w-full rounded-xl bg-white/5 border ps-10 pe-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-violet-400/50 focus:ring-2 focus:ring-violet-400/20 ${
                  errors.identifier ? "border-red-500/40" : "border-white/10"
                }`}
              />
            </div>
            {errors.identifier && (
              <p className="mt-1 text-xs text-red-400">{errors.identifier}</p>
            )}
          </div>

          <div>
            <label className="block text-sm text-white/70 mb-1.5">
              {t("fields.password")}
            </label>
            <div className="relative">
              <Lock className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password)
                    setErrors((prev) => ({ ...prev, password: undefined }));
                }}
                placeholder={t("placeholders.password")}
                className={`w-full rounded-xl bg-white/5 border ps-10 pe-10 py-2.5 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-violet-400/50 focus:ring-2 focus:ring-violet-400/20 ${
                  errors.password ? "border-red-500/40" : "border-white/10"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-xs text-red-400">{errors.password}</p>
            )}
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-white/70 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-white/5 accent-violet-500"
              />
              {t("rememberMe")}
            </label>
            <Link href="/forgot-password" className="text-violet-400 hover:text-violet-300 transition">
              {t("forgotPassword")}
            </Link>
          </div>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.985 }}
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 py-2.5 text-sm font-medium text-white hover:opacity-90 transition disabled:opacity-60"
          >
            {isSubmitting ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <>
                {t("submit")}
                <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              </>
            )}
          </motion.button>
        </form>

        <p className="mt-6 text-center text-sm text-white/50">
          {t("noAccount")}{" "}
          <Link href="/signup" className="text-violet-400 hover:text-violet-300 transition">
            {t("signUp")}
          </Link>
        </p>
      </div>
    </motion.div>
  );
}
