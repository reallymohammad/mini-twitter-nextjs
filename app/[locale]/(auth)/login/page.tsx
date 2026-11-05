import { Suspense } from "react";
import SignInForm from "@/components/auth/SignInForm";

export default function LoginPage() {
  return (
    <main className="min-h-[100dvh] w-full flex items-center justify-center px-4 py-8 sm:py-12 bg-gradient-to-b from-black via-indigo-950/20 to-black select-none">
      <Suspense fallback={null}>
        <SignInForm />
      </Suspense>
    </main>
  );
}
