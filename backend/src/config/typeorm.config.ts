import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { Application } from '../modules/applications/entities/application.entity';
import { ApplicationDocument } from '../modules/documents/entities/application-document.entity';
import { AdminUser } from '../modules/admin/entities/admin-user.entity';
import { OtpCode } from '../modules/otp/entities/otp-code.entity';

config();

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'khalijosh1212',
  database: process.env.DB_NAME || 'fortune_sacco_onboarding',
  ssl: process.env.DB_SSL === 'true',
  entities: [Application, ApplicationDocument, AdminUser, OtpCode],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
});
