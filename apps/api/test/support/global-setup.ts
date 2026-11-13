import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

/** Brings the test database up to date with the migrations before any test runs. */
export default function setup(): void {
  const env = parseEnv(readFileSync('.env.test', 'utf8'));
  if (!env.DATABASE_URL?.includes('_test')) {
    throw new Error('Refusing to run: DATABASE_URL in .env.test must point to a *_test database.');
  }
  execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
    env: { ...process.env, DATABASE_URL: env.DATABASE_URL },
    stdio: 'pipe',
  });
}
