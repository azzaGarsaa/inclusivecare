import { parseEnv } from './app.config.js';

const valid = {
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
  JWT_ACCESS_SECRET: 'x'.repeat(48),
  WEB_URL: 'http://localhost:4200/',
  SMTP_HOST: 'localhost',
  MAIL_FROM: 'InclusiveCare <no-reply@example.test>',
};

describe('parseEnv', () => {
  it('applies defaults and strips the trailing slash from WEB_URL', () => {
    const config = parseEnv(valid);
    expect(config).toMatchObject({
      nodeEnv: 'development',
      port: 3333,
      webUrl: 'http://localhost:4200',
      jwt: { accessTtlSeconds: 900 },
      refreshTokenTtlDays: 30,
    });
  });

  it('reports every problem at once', () => {
    const attempt = () => parseEnv({ JWT_ACCESS_SECRET: 'too-short', PORT: 'abc', NODE_ENV: 'staging' });
    expect(attempt).toThrow(/DATABASE_URL is required/);
    expect(attempt).toThrow(/JWT_ACCESS_SECRET must be at least 32 characters/);
    expect(attempt).toThrow(/PORT must be an integer/);
    expect(attempt).toThrow(/NODE_ENV must be one of/);
  });
});
