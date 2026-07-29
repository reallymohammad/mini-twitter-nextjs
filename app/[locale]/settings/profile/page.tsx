import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import EditProfileForm from "@/components/settings/EditProfileForm";

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function EditProfilePage({ params }: Props) {
  const { locale } = await params;
  const user = await getCurrentUser();

  if (!user) redirect(`/${locale}/signin`);

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-xl mx-auto px-4 py-8">
        <h1 className="text-lg font-bold mb-6">Edit profile</h1>
        <EditProfileForm
          locale={locale}
          initialData={{
            fullName: user.fullName,
            bio: user.bio ?? "",
            location: user.location ?? "",
            website: user.website ?? "",
            birthDate: user.birthDate
              ? new Date(user.birthDate).toISOString().split("T")[0]
              : "",
            avatarUrl: user.avatarUrl ?? "",
            coverImageUrl: user.coverImageUrl ?? "",
          }}
          username={user.username}
        />
      </div>
    </main>
  );
}
