import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AdminController } from './admin.controller';
import { AdminAuthService } from './admin-auth.service';
import { AdminApprovalService } from './admin-approval.service';
import { JwtStrategy } from './auth/jwt.strategy';
import { AdminUser } from './entities/admin-user.entity';
import { Application } from '../applications/entities/application.entity';
import { ApplicationsModule } from '../applications/applications.module';
import { CbsModule } from '../cbs/cbs.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AdminUser, Application]),
    PassportModule,
    ApplicationsModule,
    CbsModule,
    PaymentsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: config.get<string>('JWT_EXPIRES_IN', '8h') },
      }),
    }),
  ],
  controllers: [AdminController],
  providers: [AdminAuthService, AdminApprovalService, JwtStrategy],
})
export class AdminModule {}
