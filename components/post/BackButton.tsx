"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

interface BackButtonProps {
  fallbackHref: string;
}

export default function BackButton({ fallbackHref }: BackButtonProps) {
  const router = useRouter();

  function handleBack() {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      aria-label="Back"
      className="rounded-full p-2 transition-colors hover:bg-accent"
    >
      <ArrowLeft className="size-5 rtl:rotate-180" />
    </button>
  );
}
