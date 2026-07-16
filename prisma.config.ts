// Next.js conventionally keeps local secrets in `.env.local`, not `.env`,
// so we point dotenv there instead of relying on its `.env` default.
//
// Migrate needs a direct (non-pooled) connection — Supabase's transaction
// pooler doesn't support the advisory locks/prepared statements Migrate
// uses — so this config intentionally points at DIRECT_URL. The running
// application uses the pooled DATABASE_URL instead, via the driver adapter
// constructed in lib/db.ts.
import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

loadEnv({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DIRECT_URL"],
  },
});
