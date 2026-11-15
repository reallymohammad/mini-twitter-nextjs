import FollowListPage from "@/components/user/FollowListPage";

type Props = {
  params: Promise<{ locale: string; username: string }>;
  searchParams: Promise<{ q?: string | string[]; page?: string | string[] }>;
};

export default async function FollowersPage({ params, searchParams }: Props) {
  return <FollowListPage kind="followers" params={params} searchParams={searchParams} />;
}
