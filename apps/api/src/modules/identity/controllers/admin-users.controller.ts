import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Page } from '../../../common/dto/pagination.dto.js';
import { ApiData, ApiPage } from '../../../common/swagger/api-envelope.decorator.js';
import { Role } from '../../../generated/prisma/client.js';
import type { AuthenticatedUser, RequestOrigin } from '../authenticated-user.js';
import { CurrentUser, Origin } from '../decorators/current-user.decorator.js';
import { Roles } from '../decorators/roles.decorator.js';
import { ListUsersQueryDto, UpdateRolesDto, UpdateStatusDto } from '../dto/admin-users.dto.js';
import { UserDto } from '../dto/user.dto.js';
import { UserAdminService } from '../services/user-admin.service.js';

@ApiTags('Admin: users')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly userAdmin: UserAdminService) {}

  @Get()
  @ApiOperation({ summary: 'List users with search, filters and pagination' })
  @ApiPage(UserDto)
  list(@Query() query: ListUsersQueryDto): Promise<Page<UserDto>> {
    return this.userAdmin.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one user' })
  @ApiData(UserDto)
  get(@Param('id', ParseUUIDPipe) id: string): Promise<UserDto> {
    return this.userAdmin.get(id);
  }

  @Put(':id/roles')
  @ApiOperation({ summary: "Replace a user's roles" })
  @ApiData(UserDto)
  setRoles(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRolesDto,
    @Origin() origin: RequestOrigin,
  ): Promise<UserDto> {
    return this.userAdmin.setRoles(actor, id, dto.roles, origin);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Suspend or reactivate a user' })
  @ApiData(UserDto)
  setStatus(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStatusDto,
    @Origin() origin: RequestOrigin,
  ): Promise<UserDto> {
    return this.userAdmin.setStatus(actor, id, dto.status, origin);
  }
}
