import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AdminUser } from './entities/admin-user.entity';

@Injectable()
export class AdminAuthService {
  constructor(
    @InjectRepository(AdminUser) private readonly repo: Repository<AdminUser>,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string) {
    const admin = await this.repo.findOne({ where: { email, active: true } });
    if (!admin) throw new UnauthorizedException('Invalid email or password');

    const passwordMatches = await bcrypt.compare(password, admin.passwordHash);
    if (!passwordMatches) throw new UnauthorizedException('Invalid email or password');

    const token = this.jwt.sign({ sub: admin.id, email: admin.email, role: admin.role });

    return {
      accessToken: token,
      admin: { id: admin.id, email: admin.email, fullName: admin.fullName, role: admin.role },
    };
  }
}
