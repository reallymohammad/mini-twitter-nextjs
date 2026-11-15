import FollowListPage from "@/components/user/FollowListPage";

type Props = {
  params: Promise<{ locale: string; username: string }>;
  searchParams: Promise<{ q?: string | string[]; page?: string | string[] }>;
};

export default async function FollowingPage({ params, searchParams }: Props) {
  return <FollowListPage kind="following" params={params} searchParams={searchParams} />;
}
