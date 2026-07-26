import { setRequestLocale } from "next-intl/server";
import { locales } from "@/lib/i18n/config";
import LandingHeader from "@/components/landing/LandingHeader";
import HeroSection from "@/components/landing/HeroSection";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-neutral-950">
      <LandingHeader />
      <HeroSection />
      <footer className="px-6 md:px-10 py-6 text-center text-xs text-neutral-400 border-t border-neutral-100 dark:border-neutral-900">
        © {new Date().getFullYear()} Pulse — a mini social experience.
      </footer>
    </div>
  );
}
