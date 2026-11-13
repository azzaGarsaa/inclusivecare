import { Module } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { appConfig } from '../../config/app.config.js';
import { AdminUsersController } from './controllers/admin-users.controller.js';
import { AuthController } from './controllers/auth.controller.js';
import { MeController } from './controllers/me.controller.js';
import { SessionResponder } from './controllers/session-responder.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { RolesGuard } from './guards/roles.guard.js';
import { AuthMailer } from './mail/auth-mailer.js';
import { OneTimeTokensRepository } from './repositories/one-time-tokens.repository.js';
import { RefreshTokensRepository } from './repositories/refresh-tokens.repository.js';
import { UsersRepository } from './repositories/users.repository.js';
import { AccountService } from './services/account.service.js';
import { AuthService } from './services/auth.service.js';
import { OneTimeTokenService } from './services/one-time-token.service.js';
import { PasswordService } from './services/password.service.js';
import { TokenService } from './services/token.service.js';
import { UserAdminService } from './services/user-admin.service.js';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [appConfig.KEY],
      useFactory: (config: ConfigType<typeof appConfig>) => ({
        secret: config.jwt.accessSecret,
        signOptions: { algorithm: 'HS256', expiresIn: config.jwt.accessTtlSeconds },
        verifyOptions: { algorithms: ['HS256'] },
      }),
    }),
  ],
  controllers: [AuthController, MeController, AdminUsersController],
  providers: [
    UsersRepository,
    RefreshTokensRepository,
    OneTimeTokensRepository,
    PasswordService,
    TokenService,
    OneTimeTokenService,
    AuthMailer,
    AuthService,
    AccountService,
    UserAdminService,
    SessionResponder,
    // Order matters: authentication runs before the role check.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class IdentityModule {}
