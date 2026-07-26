"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Mail, User, Lock, ArrowRight, ArrowLeft } from "lucide-react";
import Link from "next/link";

type Step = 1 | 2;

export default function SignupForm() {
  const t = useTranslations("auth.signup");

  const [step, setStep] = useState<Step>(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = t("errors.nameRequired");
    if (!form.username.trim()) newErrors.username = t("errors.usernameRequired");
    if (!/^\S+@\S+\.\S+$/.test(form.email)) newErrors.email = t("errors.emailInvalid");
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors: Record<string, string> = {};
    if (form.password.length < 8) newErrors.password = t("errors.passwordShort");
    if (form.password !== form.confirmPassword)
      newErrors.confirmPassword = t("errors.passwordMismatch");
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep1()) setStep(2);
  };

  const handleBack = () => {
    setStep(1);
    setErrors({});
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep2()) return;
    // TODO: submit to API
    console.log("submit", form);
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 shadow-2xl">
        {/* Gradient glow */}
        <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-indigo-500/20 via-violet-500/20 to-fuchsia-500/20 blur-xl -z-10" />

        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
            {t("title")}
          </h1>
          <p className="mt-2 text-sm text-white/50">{t("subtitle")}</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          <div
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              step >= 1 ? "bg-gradient-to-r from-indigo-500 to-violet-500" : "bg-white/10"
            }`}
          />
          <div
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              step >= 2 ? "bg-gradient-to-r from-violet-500 to-fuchsia-500" : "bg-white/10"
            }`}
          />
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                {/* Name */}
                <div>
                  <label className="block text-sm text-white/70 mb-1.5">
                    {t("fields.name")}
                  </label>
                  <div className="relative">
                    <User className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => handleChange("name", e.target.value)}
                      className="w-full rounded-xl bg-white/5 border border-white/10 ps-10 pe-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-violet-400/50 focus:ring-2 focus:ring-violet-400/20 transition"
                      placeholder={t("placeholders.name")}
                    />
                  </div>
                  {errors.name && (
                    <p className="mt-1 text-xs text-red-400">{errors.name}</p>
                  )}
                </div>

                {/* Username */}
                <div>
                  <label className="block text-sm text-white/70 mb-1.5">
                    {t("fields.username")}
                  </label>
                  <div className="relative">
                    <span className="absolute start-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">
                      @
                    </span>
                    <input
                      type="text"
                      value={form.username}
                      onChange={(e) => handleChange("username", e.target.value)}
                      className="w-full rounded-xl bg-white/5 border border-white/10 ps-8 pe-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-violet-400/50 focus:ring-2 focus:ring-violet-400/20 transition"
                      placeholder={t("placeholders.username")}
                    />
                  </div>
                  {errors.username && (
                    <p className="mt-1 text-xs text-red-400">{errors.username}</p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm text-white/70 mb-1.5">
                    {t("fields.email")}
                  </label>
                  <div className="relative">
                    <Mail className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      className="w-full rounded-xl bg-white/5 border border-white/10 ps-10 pe-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-violet-400/50 focus:ring-2 focus:ring-violet-400/20 transition"
                      placeholder={t("placeholders.email")}
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-1 text-xs text-red-400">{errors.email}</p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleNext}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 py-2.5 text-sm font-medium text-white hover:opacity-90 transition"
                >
                  {t("next")}
                  <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                {/* Password */}
                <div>
                  <label className="block text-sm text-white/70 mb-1.5">
                    {t("fields.password")}
                  </label>
                  <div className="relative">
                    <Lock className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={(e) => handleChange("password", e.target.value)}
                      className="w-full rounded-xl bg-white/5 border border-white/10 ps-10 pe-10 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-violet-400/50 focus:ring-2 focus:ring-violet-400/20 transition"
                      placeholder={t("placeholders.password")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      className="absolute end-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-xs text-red-400">{errors.password}</p>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm text-white/70 mb-1.5">
                    {t("fields.confirmPassword")}
                  </label>
                  <div className="relative">
                    <Lock className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                    <input
                      type={showConfirm ? "text" : "password"}
                      value={form.confirmPassword}
                      onChange={(e) => handleChange("confirmPassword", e.target.value)}
                      className="w-full rounded-xl bg-white/5 border border-white/10 ps-10 pe-10 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-violet-400/50 focus:ring-2 focus:ring-violet-400/20 transition"
                      placeholder={t("placeholders.confirmPassword")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((p) => !p)}
                      className="absolute end-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition"
                    >
                      {showConfirm ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-1 text-xs text-red-400">{errors.confirmPassword}</p>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-white/70 hover:bg-white/5 transition"
                  >
                    <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
                    {t("back")}
                  </button>
                  <button
                    type="submit"
                    className="flex-1 rounded-xl bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 py-2.5 text-sm font-medium text-white hover:opacity-90 transition"
                  >
                    {t("submit")}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>

        <p className="mt-6 text-center text-sm text-white/50">
          {t("haveAccount")}{" "}
          <Link href="/signin" className="text-violet-400 hover:text-violet-300 transition">
            {t("signIn")}
          </Link>
        </p>
      </div>
    </div>
  );
}
