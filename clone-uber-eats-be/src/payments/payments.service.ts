import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { CreatePaymentInput } from './dtos/create-payment.dto';
import { CreateAccountOutput } from 'src/users/dtos/create-account.dto';
import { RestaurantRepository } from 'src/restaurants/repositories/restaurant.repository';
import { Restaurant } from 'src/restaurants/entities/restaurant.entity';
import { GetPaymentsOutput } from './dtos/get-payments.dto';

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(Payment)
    private readonly payments: Repository<Payment>,
    private readonly restaurants: RestaurantRepository,
  ) {}

  async createPayment(
    owner: User,
    { transactionId, restaurantId }: CreatePaymentInput,
  ): Promise<CreateAccountOutput> {
    try {
      const restaurant = await this.restaurants.findAndCheck(
        restaurantId,
        owner,
      );
      if (!(restaurant instanceof Restaurant)) {
        return restaurant;
      }
      await this.payments.save(
        this.payments.create({ transactionId, user: owner, restaurant }),
      );
      return { ok: true };
    } catch {
      return {
        ok: false,
        error: 'Could not create payment',
      };
    }
  }

  async getPayments(owner: User): Promise<GetPaymentsOutput> {
    try {
      const payments = await this.payments.findBy({
        user: { id: owner.id },
      });
      if (!payments) {
        return {
          ok: false,
          error: 'Payments not found',
        };
      }
      return {
        ok: true,
        payments,
      };
    } catch {
      return {
        ok: false,
        error: 'Could not get payments',
      };
    }
  }
}
