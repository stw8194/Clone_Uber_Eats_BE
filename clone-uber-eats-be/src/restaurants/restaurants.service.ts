import { Injectable } from '@nestjs/common';
import {
  CreateRestaurantInput,
  CreateRestaurantOutput,
} from './dtos/create-restaurant.dto';
import { User } from 'src/users/entities/user.entity';
import { Category } from './entities/category.entity';
import {
  EditRestaurantInput,
  EditRestaurantOutput,
} from './dtos/edit-restaurant.dto';
import { CategoryRepository } from './repositories/category.repository';
import { DeleteRestaurantOutput } from './dtos/delete-restaurant.dto';
import { RestaurantRepository } from './repositories/restaurant.repository';
import { Restaurant } from './entities/restaurant.entity';
import { AllCategoriesOutput } from './dtos/all-categories.dto';
import { CategoryInput, CategoryOutput } from './dtos/category.dto';
import { RestaurantsInput, RestaurantsOutput } from './dtos/restaurants.dto';
import { RestaurantInput, RestaurantOutput } from './dtos/restaurant.dto';
import {
  SearchRestaurantInput,
  SearchRestaurantOutput,
} from './dtos/search-restaurant.dto';
import { ILike } from 'typeorm';
import { CreateDishInput, CreateDishOutput } from './dtos/create-dish.dto';
import { EditDishInput, EditDishOutput } from './dtos/edit-dish.dto';
import { DeleteDishInput, DeleteDishOutput } from './dtos/delete-dish.dto';
import { DishRepository } from './repositories/dish.repository';
import { Dish } from './entities/dish.entity';

@Injectable()
export class RestaurantService {
  constructor(
    private readonly restaurants: RestaurantRepository,
    private readonly categories: CategoryRepository,
    private readonly dishes: DishRepository,
  ) {}

  async createRestaurant(
    owner: User,
    createRestaurantInput: CreateRestaurantInput,
  ): Promise<CreateRestaurantOutput> {
    try {
      const newRestaurant = this.restaurants.create(createRestaurantInput);
      newRestaurant.owner = owner;
      const category = await this.categories.getOrCreate(
        createRestaurantInput.categoryName,
      );
      newRestaurant.category = category;
      await this.restaurants.save(newRestaurant);
      return { ok: true };
    } catch {
      return {
        ok: false,
        error: 'Could not create restaurant',
      };
    }
  }

  async editRestaurant(
    owner: User,
    editRestaurantInput: EditRestaurantInput,
  ): Promise<EditRestaurantOutput> {
    try {
      const restaurant = await this.restaurants.findAndCheck(
        editRestaurantInput.restaurantId,
        owner,
        'edit',
      );
      if (!(restaurant instanceof Restaurant)) {
        return restaurant;
      }
      let category: Category = null;
      if (editRestaurantInput.categoryName) {
        category = await this.categories.getOrCreate(
          editRestaurantInput.categoryName,
        );
        restaurant.category = category;
      }
      await this.restaurants.save([
        {
          id: editRestaurantInput.restaurantId,
          ...editRestaurantInput,
          ...(category && { category }),
        },
      ]);
      return { ok: true };
    } catch {
      return {
        ok: false,
        error: 'Could not edit restaurant',
      };
    }
  }

  async deleteRestaurant(
    owner: User,
    restaurantId: number,
  ): Promise<DeleteRestaurantOutput> {
    try {
      const restaurant = await this.restaurants.findAndCheck(
        restaurantId,
        owner,
        'edit',
      );
      if (!(restaurant instanceof Restaurant)) {
        return restaurant;
      }
      await this.restaurants.delete({ id: restaurantId });
      return {
        ok: true,
      };
    } catch {
      return {
        ok: false,
        error: 'Could not delete restaurant',
      };
    }
  }

  async allCategories(): Promise<AllCategoriesOutput> {
    try {
      const categories = await this.categories.find();
      return {
        ok: true,
        categories,
      };
    } catch {
      return {
        ok: false,
        error: 'Could not load categories',
      };
    }
  }

  countRestaurants(category: Category): Promise<number> {
    return this.restaurants.countBy({ category: { id: category.id } });
  }

  async findCategoryBySlug({
    slug,
    page,
    limit,
  }: CategoryInput): Promise<CategoryOutput> {
    try {
      const category = await this.categories.findOne({ where: { slug } });
      if (!category) {
        return {
          ok: false,
          error: 'Category not found',
        };
      }
      const restaurants = await this.restaurants.find({
        where: { category: { id: category.id } },
        take: limit,
        skip: (page - 1) * limit,
      });
      if (!restaurants) {
        return {
          ok: false,
          error: 'Restaurants not found',
        };
      }
      const totalResults = await this.countRestaurants(category);
      return {
        ok: true,
        category,
        restaurants,
        totalPages: Math.ceil(totalResults / limit),
        totalResults,
      };
    } catch {
      return {
        ok: false,
        error: 'Could not load category',
      };
    }
  }

  async allRestaurants({
    page,
    limit,
  }: RestaurantsInput): Promise<RestaurantsOutput> {
    try {
      const [restaurants, totalResults] = await this.restaurants.findAndCount({
        take: limit,
        skip: (page - 1) * limit,
      });
      if (!restaurants) {
        return {
          ok: false,
          error: 'Restaurants not found',
        };
      }
      return {
        ok: true,
        restaurants,
        totalPages: Math.ceil(totalResults / limit),
        totalResults,
      };
    } catch {
      return {
        ok: false,
        error: 'Could not load restaurants',
      };
    }
  }

  async findRestaurantById({
    restaurantId,
  }: RestaurantInput): Promise<RestaurantOutput> {
    try {
      const restaurant = await this.restaurants.findOne({
        where: { id: restaurantId },
        relations: ['menu'],
      });
      if (!restaurant) {
        return {
          ok: false,
          error: 'Restaurant not found',
        };
      }
      return {
        ok: true,
        restaurant,
      };
    } catch {
      return {
        ok: false,
        error: 'Could not find restaurant',
      };
    }
  }

  async searchRestaurantByName({
    page,
    limit,
    query,
  }: SearchRestaurantInput): Promise<SearchRestaurantOutput> {
    try {
      const [restaurants, totalResults] = await this.restaurants.findAndCount({
        where: { name: ILike(`%${query}%`) },
        take: limit,
        skip: (page - 1) * limit,
      });
      if (!restaurants) {
        return {
          ok: false,
          error: 'Restaurants not found',
        };
      }
      return {
        ok: true,
        restaurants,
        totalPages: Math.ceil(totalResults / limit),
        totalResults,
      };
    } catch {
      return {
        ok: false,
        error: 'Could not search restaurants',
      };
    }
  }

  async createDish(
    owner: User,
    createDishInput: CreateDishInput,
  ): Promise<CreateDishOutput> {
    try {
      const restaurant = await this.restaurants.findAndCheck(
        createDishInput.restaurantId,
        owner,
        'create a dish to',
      );
      if (!(restaurant instanceof Restaurant)) {
        return restaurant;
      }
      await this.dishes.save(
        this.dishes.create({ ...createDishInput, restaurant }),
      );
      return {
        ok: true,
      };
    } catch {
      return {
        ok: false,
        error: 'Could not create dish',
      };
    }
  }

  async editDish(
    owner: User,
    editDishInput: EditDishInput,
  ): Promise<EditDishOutput> {
    try {
      const dish = await this.dishes.findAndCheck(
        editDishInput.dishId,
        owner,
        'edit',
      );
      if (!(dish instanceof Dish)) {
        return dish;
      }
      await this.dishes.save({
        id: editDishInput.dishId,
        ...editDishInput,
      });
      return {
        ok: true,
      };
    } catch {
      return {
        ok: false,
        error: 'Could not edit dish',
      };
    }
  }

  async deleteDish(
    owner: User,
    { dishId }: DeleteDishInput,
  ): Promise<DeleteDishOutput> {
    try {
      const dish = await this.dishes.findAndCheck(dishId, owner, 'delete');
      if (!(dish instanceof Dish)) {
        return dish;
      }
      await this.dishes.delete({ id: dishId });
      return {
        ok: true,
      };
    } catch {
      return {
        ok: false,
        error: 'Could not delete dish',
      };
    }
  }
}
