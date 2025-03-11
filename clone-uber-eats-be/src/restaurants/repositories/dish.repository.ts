import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { Dish } from '../entities/dish.entity';
import { EditDishOutput } from '../dtos/edit-dish.dto';
import { DeleteDishOutput } from '../dtos/delete-dish.dto';

@Injectable()
export class DishRepository extends Repository<Dish> {
  constructor(private dataSource: DataSource) {
    super(Dish, dataSource.createEntityManager());
  }

  async findAndCheck(
    dishId: number,
    owner: User,
    usage: string,
  ): Promise<Dish | EditDishOutput | DeleteDishOutput> {
    const dish = await this.findOne({
      where: { id: dishId },
      relations: ['restaurant'],
    });
    if (!dish) {
      return {
        ok: false,
        error: 'Dish not found',
      };
    }
    if (dish.restaurant.ownerId !== owner.id) {
      return {
        ok: false,
        error: `You cannot ${usage} a dish to a restaurant that you don't own`,
      };
    }
    return dish;
  }
}
