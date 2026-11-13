import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { appConfig } from './config/app.config.js';
import { DatabaseModule } from './database/database.module.js';
import { AuditModule } from './modules/audit/audit.module.js';
import { HealthController } from './modules/health/health.controller.js';
import { IdentityModule } from './modules/identity/index.js';
import { MailModule } from './modules/mail/mail.module.js';

const nodeEnv = process.env.NODE_ENV ?? 'development';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: nodeEnv === 'test' ? '.env.test' : '.env',
      load: [appConfig],
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: nodeEnv === 'test' ? 'silent' : 'info',
        transport: nodeEnv === 'development' ? { target: 'pino-pretty', options: { singleLine: true } } : undefined,
        redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
      },
    }),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 120 }],
      // Integration tests hit the auth endpoints far faster than any person would.
      skipIf: () => nodeEnv === 'test',
    }),
    DatabaseModule,
    MailModule,
    AuditModule,
    IdentityModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
