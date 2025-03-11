import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Restaurant } from '../entities/restaurant.entity';
import { User } from 'src/users/entities/user.entity';
import { EditRestaurantOutput } from '../dtos/edit-restaurant.dto';
import { DeleteRestaurantOutput } from '../dtos/delete-restaurant.dto';

@Injectable()
export class RestaurantRepository extends Repository<Restaurant> {
  constructor(private dataSource: DataSource) {
    super(Restaurant, dataSource.createEntityManager());
  }

  async findAndCheck(
    restaurantId: number,
    owner: User,
    usage: string,
  ): Promise<Restaurant | EditRestaurantOutput | DeleteRestaurantOutput> {
    const restaurant = await this.findOneBy({ id: restaurantId });
    if (!restaurant) {
      return {
        ok: false,
        error: 'Restaurant not found',
      };
    }
    if (restaurant.ownerId != owner.id) {
      return {
        ok: false,
        error: `You cannot ${usage} a restaurant that you don't own`,
      };
    }
    return restaurant;
  }
}
