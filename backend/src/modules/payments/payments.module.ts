import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { StkCallbackController } from './stk-callback.controller';
import { FortunePaymentsService } from './fortune-payments.service';
import { Application } from '../applications/entities/application.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Application])],
  providers: [PaymentsService, FortunePaymentsService],
  controllers: [PaymentsController, StkCallbackController],
  exports: [PaymentsService],
})
export class PaymentsModule {}
