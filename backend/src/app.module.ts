import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { ApplicationsModule } from './modules/applications/applications.module';
import { OtpModule } from './modules/otp/otp.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { IprsModule } from './modules/iprs/iprs.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { AdminModule } from './modules/admin/admin.module';
import { CbsModule } from './modules/cbs/cbs.module';
import { CatalogModule } from './modules/catalog/catalog.module';

import { Application } from './modules/applications/entities/application.entity';
import { ApplicationDocument } from './modules/documents/entities/application-document.entity';
import { AdminUser } from './modules/admin/entities/admin-user.entity';
import { OtpCode } from './modules/otp/entities/otp-code.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>('THROTTLE_TTL_SECONDS', 60) * 1000,
          limit: config.get<number>('THROTTLE_LIMIT', 30),
        },
      ],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        username: config.get<string>('DB_USERNAME'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_NAME'),
        ssl: config.get<string>('DB_SSL') === 'true',
        entities: [Application, ApplicationDocument, AdminUser, OtpCode],
        // Convenient for first run / demos. Switch to migrations for production.
        synchronize: config.get<string>('NODE_ENV') !== 'production',
      }),
    }),
    CatalogModule,
    ApplicationsModule,
    OtpModule,
    DocumentsModule,
    IprsModule,
    PaymentsModule,
    CbsModule,
    AdminModule,
  ],
})
export class AppModule {}
