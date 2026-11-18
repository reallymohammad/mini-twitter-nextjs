import { getTranslations } from "next-intl/server";
import AccountList from "@/components/settings/AccountList";

export default async function BlockedPage() {
  const t = await getTranslations("Settings.Blocked");

  return (
    <AccountList
      title={t("title")}
      emptyText={t("empty")}
      removeText={t("unblock")}
      listEndpoint="/api/user/blocked"
      removeEndpoint="/api/block"
    />
  );
}
