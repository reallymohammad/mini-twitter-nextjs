import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // برای اجرای اپلیکیشن و کوئری‌ها (Pooler - معمولاً پورت 6543)
    url: process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL,
    
    // برای انجام Migration و تغییرات Schema (اتصال مستقیم - پورت 5432)
   // directUrl: process.env.DIRECT_URL || process.env.POSTGRES_URL_NON_POOLING,
  },
});
