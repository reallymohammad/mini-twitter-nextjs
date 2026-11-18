import { getTranslations } from "next-intl/server";
import AccountList from "@/components/settings/AccountList";

export default async function MutedPage() {
  const t = await getTranslations("Settings.Muted");

  return (
    <AccountList
      title={t("title")}
      emptyText={t("empty")}
      removeText={t("unmute")}
      listEndpoint="/api/user/muted"
      removeEndpoint="/api/mute"
    />
  );
}
