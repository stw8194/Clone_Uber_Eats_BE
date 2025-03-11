import { Module } from '@nestjs/common';
import {
  CategoryResolver,
  DishResolver,
  RestaurantResolver,
} from './restaurants.resolver';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Restaurant } from './entities/restaurant.entity';
import { RestaurantService } from './restaurants.service';
import { CategoryRepository } from './repositories/category.repository';
import { Category } from './entities/category.entity';
import { RestaurantRepository } from './repositories/restaurant.repository';
import { Dish } from './entities/dish.entity';
import { DishRepository } from './repositories/dish.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Restaurant, Category, Dish])],
  providers: [
    RestaurantResolver,
    CategoryResolver,
    DishResolver,
    RestaurantService,
    RestaurantRepository,
    CategoryRepository,
    DishRepository,
  ],
})
export class RestaurantsModule {}
