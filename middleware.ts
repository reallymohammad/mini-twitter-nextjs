import createMiddleware from "next-intl/middleware";
import { defaultLocale, locales } from "@/lib/i18n/config";

export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: "always",
});

export const config = {
  matcher: ["/", "/(fa|en)/:path*"],
};
