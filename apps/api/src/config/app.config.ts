import { registerAs } from '@nestjs/config';

export interface AppConfig {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  databaseUrl: string;
  webUrl: string;
  jwt: { accessSecret: string; accessTtlSeconds: number };
  refreshTokenTtlDays: number;
  smtp: { host: string; port: number; user?: string; password?: string };
  mailFrom: string;
}

const NODE_ENVS = ['development', 'test', 'production'] as const;

/**
 * Reads and checks every environment variable the API needs. All problems are
 * reported together so a misconfigured deployment fails once, at startup.
 */
export function parseEnv(env: NodeJS.ProcessEnv): AppConfig {
  const problems: string[] = [];

  const required = (name: string): string => {
    const value = env[name]?.trim();
    if (!value) problems.push(`${name} is required`);
    return value ?? '';
  };

  const integer = (name: string, fallback: number, min = 1): number => {
    const raw = env[name]?.trim();
    if (!raw) return fallback;
    const value = Number(raw);
    if (!Number.isInteger(value) || value < min) {
      problems.push(`${name} must be an integer >= ${min}`);
      return fallback;
    }
    return value;
  };

  const nodeEnv = (env.NODE_ENV ?? 'development') as AppConfig['nodeEnv'];
  if (!NODE_ENVS.includes(nodeEnv)) {
    problems.push(`NODE_ENV must be one of ${NODE_ENVS.join(', ')}`);
  }

  const accessSecret = required('JWT_ACCESS_SECRET');
  if (accessSecret && accessSecret.length < 32) {
    problems.push('JWT_ACCESS_SECRET must be at least 32 characters long');
  }

  const config: AppConfig = {
    nodeEnv,
    port: integer('PORT', 3333),
    databaseUrl: required('DATABASE_URL'),
    webUrl: required('WEB_URL').replace(/\/+$/, ''),
    jwt: {
      accessSecret,
      accessTtlSeconds: integer('JWT_ACCESS_TTL_SECONDS', 900, 60),
    },
    refreshTokenTtlDays: integer('REFRESH_TOKEN_TTL_DAYS', 30),
    smtp: {
      host: required('SMTP_HOST'),
      port: integer('SMTP_PORT', 587),
      user: env.SMTP_USER?.trim() || undefined,
      password: env.SMTP_PASSWORD || undefined,
    },
    mailFrom: required('MAIL_FROM'),
  };

  if (problems.length > 0) {
    throw new Error(`Invalid environment configuration:\n- ${problems.join('\n- ')}`);
  }
  return config;
}

export const appConfig = registerAs('app', () => parseEnv(process.env));
