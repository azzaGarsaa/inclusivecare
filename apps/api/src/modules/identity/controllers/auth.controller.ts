import { Body, Controller, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AppException } from '../../../common/errors/app.exception.js';
import { ErrorCode } from '../../../common/errors/error-codes.js';
import { ApiData } from '../../../common/swagger/api-envelope.decorator.js';
import type { RequestOrigin } from '../authenticated-user.js';
import { Origin } from '../decorators/current-user.decorator.js';
import { Public } from '../decorators/public.decorator.js';
import { EmailDto, LoginDto, RegisterDto, ResetPasswordDto, SessionDto, TokenDto } from '../dto/auth.dto.js';
import { AuthService } from '../services/auth.service.js';
import { readRefreshCookie } from './refresh-cookie.js';
import { SessionResponder } from './session-responder.js';

/**
 * Endpoints that accept a password, or that send email, get a tight limit to
 * slow down guessing and mail flooding. Refresh and logout keep the global one.
 */
const Strict = () => Throttle({ default: { limit: 10, ttl: 60_000 } });

@ApiTags('Authentication')
@Public()
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly sessions: SessionResponder,
  ) {}

  @Post('register')
  @Strict()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Create an account',
    description: 'Always answers 204. A confirmation link is emailed; nothing reveals whether the address was known.',
  })
  async register(@Body() dto: RegisterDto, @Origin() origin: RequestOrigin): Promise<void> {
    await this.auth.register(dto, origin);
  }

  @Post('verify-email')
  @Strict()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Confirm an email address with the emailed token' })
  async verifyEmail(@Body() dto: TokenDto): Promise<void> {
    await this.auth.verifyEmail(dto.token);
  }

  @Post('resend-verification')
  @Strict()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Send the confirmation link again' })
  async resendVerification(@Body() dto: EmailDto): Promise<void> {
    await this.auth.resendVerification(dto.email);
  }

  @Post('login')
  @Strict()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in', description: 'Returns an access token and sets the refresh cookie.' })
  @ApiData(SessionDto)
  async login(
    @Body() dto: LoginDto,
    @Origin() origin: RequestOrigin,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SessionDto> {
    return this.sessions.send(response, await this.auth.login(dto, origin));
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange the refresh cookie for a new access token' })
  @ApiData(SessionDto)
  async refresh(
    @Req() request: Request,
    @Origin() origin: RequestOrigin,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SessionDto> {
    const refreshToken = readRefreshCookie(request);
    if (!refreshToken) {
      throw AppException.unauthenticated('You are not signed in.', ErrorCode.TokenInvalid);
    }
    try {
      return this.sessions.send(response, await this.auth.refresh(refreshToken, origin));
    } catch (error) {
      this.sessions.clear(response);
      throw error;
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Sign out of the current session' })
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response): Promise<void> {
    await this.auth.logout(readRefreshCookie(request));
    this.sessions.clear(response);
  }

  @Post('forgot-password')
  @Strict()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Email a password reset link', description: 'Always answers 204.' })
  async forgotPassword(@Body() dto: EmailDto): Promise<void> {
    await this.auth.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @Strict()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Set a new password with the emailed token' })
  async resetPassword(@Body() dto: ResetPasswordDto, @Origin() origin: RequestOrigin): Promise<void> {
    await this.auth.resetPassword(dto.token, dto.password, origin);
  }
}
