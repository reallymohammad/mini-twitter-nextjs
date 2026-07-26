import SignInForm from "@/components/auth/SignInForm";


export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-b from-black via-indigo-950/20 to-black">
      <SignInForm />
    </main>
  );
}
