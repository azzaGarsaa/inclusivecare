import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post, Put, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ApiData } from '../../../common/swagger/api-envelope.decorator.js';
import type { AuthenticatedUser, RequestOrigin } from '../authenticated-user.js';
import { CurrentUser, Origin } from '../decorators/current-user.decorator.js';
import { SessionDto } from '../dto/auth.dto.js';
import { AccessibilityDto, ChangePasswordDto, DeleteAccountDto, UpdateProfileDto, UserDto } from '../dto/user.dto.js';
import { AccountService } from '../services/account.service.js';
import { AuthService } from '../services/auth.service.js';
import { SessionResponder } from './session-responder.js';

@ApiTags('My account')
@ApiBearerAuth()
@Controller('me')
export class MeController {
  constructor(
    private readonly account: AccountService,
    private readonly auth: AuthService,
    private readonly sessions: SessionResponder,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get my profile' })
  @ApiData(UserDto)
  getProfile(@CurrentUser() user: AuthenticatedUser): Promise<UserDto> {
    return this.account.getProfile(user.id);
  }

  @Patch()
  @ApiOperation({ summary: 'Update my name or language' })
  @ApiData(UserDto)
  updateProfile(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateProfileDto): Promise<UserDto> {
    return this.account.updateProfile(user.id, dto);
  }

  @Put('accessibility')
  @ApiOperation({ summary: 'Save my display and accessibility settings' })
  @ApiData(UserDto)
  updateAccessibility(@CurrentUser() user: AuthenticatedUser, @Body() dto: AccessibilityDto): Promise<UserDto> {
    return this.account.updateAccessibility(user.id, dto);
  }

  @Post('password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Change my password',
    description: 'Signs out every other device and returns a fresh session for this one.',
  })
  @ApiData(SessionDto)
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
    @Origin() origin: RequestOrigin,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SessionDto> {
    await this.account.changePassword(user.id, dto, origin);
    return this.sessions.send(response, await this.auth.startSession(user.id, origin));
  }

  @Post('delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete my account', description: 'Requires the password. Cannot be undone.' })
  async deleteAccount(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: DeleteAccountDto,
    @Origin() origin: RequestOrigin,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.account.deleteAccount(user, dto.password, origin);
    this.sessions.clear(response);
  }
}
