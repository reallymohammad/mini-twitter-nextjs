import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // برای اجرای اپلیکیشن و کوئری‌ها (Pooler)
    url: process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL,
    
    // برای انجام Migration و تغییرات Schema (اتصال مستقیم)
    // اگر این نباشد، دستور migrate dev خطا می‌دهد
  },
});
