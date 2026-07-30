import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { IsEmail, IsOptional, IsString } from 'class-validator';
import { AdminAuthService } from './admin-auth.service';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { ApplicationsService } from '../applications/applications.service';
import { ApplicationStatus } from '../applications/entities/application.entity';
import { AdminApprovalService } from './admin-approval.service';

class LoginDto {
  @IsEmail() email: string;
  @IsString() password: string;
}

class RejectDto {
  @IsString() reason: string;
}

@Controller('admin')
export class AdminController {
  constructor(
    private readonly auth: AdminAuthService,
    private readonly applications: ApplicationsService,
    private readonly approval: AdminApprovalService,
  ) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  @UseGuards(JwtAuthGuard)
  @Get('applications')
  list(@Query('status') status?: ApplicationStatus) {
    return this.applications.listForAdmin(status);
  }

  @UseGuards(JwtAuthGuard)
  @Get('applications/:id')
  detail(@Param('id') id: string) {
    return this.applications.findOneOrFail(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('applications/:id/approve')
  approve(@Param('id') id: string, @Req() req: any) {
    return this.approval.approveAndPushToCbs(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('applications/:id/reject')
  reject(@Param('id') id: string, @Body() dto: RejectDto, @Req() req: any) {
    return this.applications.reject(id, req.user.id, dto.reason);
  }
}
