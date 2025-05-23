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
import {
  DeleteRestaurantInput,
  DeleteRestaurantOutput,
} from './dtos/delete-restaurant.dto';
import { RestaurantRepository } from './repositories/restaurant.repository';
import { Restaurant } from './entities/restaurant.entity';
import { AllCategoriesOutput } from './dtos/all-categories.dto';
import { CategoryInput, CategoryOutput } from './dtos/category.dto';
import { RestaurantInput, RestaurantOutput } from './dtos/restaurant.dto';
import {
  SearchRestaurantInput,
  SearchRestaurantOutput,
} from './dtos/search-restaurant.dto';
import { DataSource, ILike, Repository } from 'typeorm';
import { CreateDishInput, CreateDishOutput } from './dtos/create-dish.dto';
import { Dish } from './entities/dish.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { EditDishInput, EditDishOutput } from './dtos/edit-dish.dto';
import { MyRestaurantsOutput } from './dtos/my-restaurants.dto';
import {
  MyRestaurantInput,
  MyRestaurantOutput,
} from './dtos/my-restaurant.dto';
import { MyDishInput, MyDishOutput } from './dtos/my-dish.dto';
import {
  RestaurantsNearbyInput,
  RestaurantsNearbyOutput,
} from './dtos/restaurants-nearby.dto';

@Injectable()
export class RestaurantService {
  constructor(
    private readonly restaurants: RestaurantRepository,
    private readonly categories: CategoryRepository,
    @InjectRepository(Dish)
    private readonly dishes: Repository<Dish>,
    private readonly dataSource: DataSource,
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
      return {
        ok: true,
        restaurantId: newRestaurant.id,
      };
    } catch {
      return {
        ok: false,
        error: 'Could not create restaurant',
      };
    }
  }

  async myRestaurants(owner: User): Promise<MyRestaurantsOutput> {
    try {
      const restaurants = await this.restaurants.findBy({
        owner: { id: owner.id },
      });
      return {
        ok: true,
        restaurants,
      };
    } catch {
      return {
        ok: false,
        error: 'Could not load restaurants',
      };
    }
  }

  async myRestaurant(
    owner: User,
    { restaurantId }: MyRestaurantInput,
  ): Promise<MyRestaurantOutput> {
    try {
      const restaurant = await this.restaurants.findOne({
        where: {
          id: restaurantId,
          owner: { id: owner.id },
        },
        relations: ['menu', 'orders'],
      });
      return {
        ok: true,
        restaurant,
      };
    } catch {
      return {
        ok: false,
        error: 'Could not load restaurant',
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
      await this.restaurants.save({
        id: editRestaurantInput.restaurantId,
        ...editRestaurantInput,
        ...(category && { category }),
      });
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
    { restaurantId }: DeleteRestaurantInput,
  ): Promise<DeleteRestaurantOutput> {
    try {
      const restaurant = await this.restaurants.findAndCheck(
        restaurantId,
        owner,
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
        order: {
          isPromoted: 'DESC',
        },
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

  async findNearbyRestaurants({
    page,
    limit,
    lat,
    lng,
  }: RestaurantsNearbyInput): Promise<RestaurantsNearbyOutput> {
    try {
      const radius = 3000;
      const offset = (page - 1) * limit;

      const data = await this.dataSource.query(
        `
        SELECT *, 
          ST_Distance(location, ST_MakePoint($1, $2)::geography) AS distance
        FROM restaurant
        WHERE ST_DWithin(location, ST_MakePoint($1, $2)::geography, $3)
        ORDER BY distance
        LIMIT $4 OFFSET $5
      `,
        [lng, lat, radius, limit, offset],
      );

      if (!data) {
        return {
          ok: false,
          error: 'Restaurants not found',
        };
      }
      const [{ total: totalResults }] = await this.dataSource.query(
        `
        SELECT COUNT(*) as total
        FROM restaurant
        WHERE ST_DWithin(location, ST_MakePoint($1, $2)::geography, $3)
        `,
        [lng, lat, radius],
      );
      return {
        ok: true,
        restaurants: data,
        totalPages: Math.ceil(totalResults / limit),
        totalResults,
      };
    } catch {
      return {
        ok: false,
        error: 'Could not find restaurants',
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
      );
      if (!(restaurant instanceof Restaurant)) {
        return restaurant;
      }
      const dish = this.dishes.create({ ...createDishInput, restaurant });
      await this.dishes.save(dish);
      return {
        ok: true,
        dishId: dish.id,
      };
    } catch {
      return {
        ok: false,
        error: 'Could not create dish',
      };
    }
  }

  async findDishById(
    owner: User,
    myDishInput: MyDishInput,
  ): Promise<MyDishOutput> {
    try {
      const dish = await this.dishes.findOne({
        where: {
          restaurant: { id: myDishInput.restaurantId },
          id: myDishInput.dishId,
        },
        relations: ['restaurant'],
      });
      if (!dish) {
        return {
          ok: false,
          error: 'Dish not found',
        };
      }
      if (dish.restaurant.ownerId === owner.id) {
        return {
          ok: true,
          dish,
        };
      }
      return {
        ok: false,
        error: 'This dish is not belongs to your restaurant',
      };
    } catch {
      return {
        ok: false,
        error: 'Could not find dish',
      };
    }
  }

  async editDish(
    owner: User,
    editDishInput: EditDishInput,
  ): Promise<EditDishOutput> {
    try {
      const dish = await this.dishes.findOne({
        where: { id: editDishInput.dishId },
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
          error: 'You are not allowed to do this',
        };
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
}
