import { Module } from '@nestjs/common';
import { PaymentResolver } from './payments.resolver';
import { PaymentService } from './payments.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { RestaurantRepository } from 'src/restaurants/repositories/restaurant.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Payment])],
  providers: [PaymentResolver, PaymentService, RestaurantRepository],
})
export class PaymentsModule {}
