import { defineConfig } from 'prisma/config';

// The Prisma CLI does not read .env by itself. In CI and production the
// variables come from the environment, so a missing file is fine.
try {
  process.loadEnvFile();
} catch {
  // no .env file
}

export default defineConfig({
  schema: 'prisma/schema',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
