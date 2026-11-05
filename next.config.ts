// next.config.ts
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  // پورت را از اینجا بردارید؛ فقط IP یا دامنه‌ها
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "192.168.1.103",
    "172.20.10.4",
  ],

  // رفع بلاک شدن Server Actions و هدر سشن هنگام لاگین از گوشی
  experimental: {
    serverActions: {
      allowedOrigins: [
        "localhost:3000",
        "127.0.0.1:3000",
        "192.168.1.103:3000",
        "172.20.10.4:3000",
      ],
    },
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },
};

export default withNextIntl(nextConfig);
