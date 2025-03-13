import { Module } from '@nestjs/common';
import { OrderService } from './orders.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { OrderResolver } from './orders.resolver';
import { OrderItem } from './entities/order-item.entity';
import { Restaurant } from 'src/restaurants/entities/restaurant.entity';
import { Dish } from 'src/restaurants/entities/dish.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, Restaurant, OrderItem, Dish]),
  ],
  providers: [OrderService, OrderResolver],
})
export class OrdersModule {}
