import { Module } from '@nestjs/common';
import { RestaurantResolver } from './restaurants.resolver';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Restaurant } from './entities/restaurants.entity';
import { RestaurantService } from './restaurants.service';
import { CategoryRepository } from './repositories/category.repository';
import { Category } from './entities/category.entity';
import { RestaurantRepository } from './repositories/restaurant.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Restaurant, Category])],
  providers: [
    RestaurantResolver,
    RestaurantService,
    RestaurantRepository,
    CategoryRepository,
  ],
})
export class RestaurantsModule {}
