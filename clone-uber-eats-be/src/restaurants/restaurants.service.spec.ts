import { Test } from '@nestjs/testing';
import { RestaurantService } from './restaurants.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User, UserRole } from 'src/users/entities/user.entity';
import { RestaurantRepository } from './repositories/restaurant.repository';
import { CategoryRepository } from './repositories/category.repository';
import { Dish } from './entities/dish.entity';
import { DataSource, ILike, Repository } from 'typeorm';
import { Restaurant } from './entities/restaurant.entity';

const mockRepository = () => ({
  find: jest.fn(),
  findBy: jest.fn(),
  findOne: jest.fn(),
  findOneBy: jest.fn(),
  findAndCount: jest.fn(),
  findAndCheck: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  delete: jest.fn(),
  getOrCreate: jest.fn(),
  countBy: jest.fn(),
});
const mockDataSource = () => ({
  query: jest.fn(),
});

type mockCustumRepository<T = any> = Partial<Record<keyof T, jest.Mock>>;
type mockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;
type dataSource = ReturnType<typeof mockDataSource>;

describe('RestaurantService', () => {
  let service: RestaurantService;
  let restaurantRepository: mockCustumRepository<RestaurantRepository>;
  let categoryRepository: mockCustumRepository<CategoryRepository>;
  let dishRepository: mockRepository<Dish>;
  let dataSource: dataSource;
  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        RestaurantService,
        {
          provide: getRepositoryToken(RestaurantRepository),
          useValue: mockRepository(),
        },
        {
          provide: getRepositoryToken(CategoryRepository),
          useValue: mockRepository(),
        },
        {
          provide: getRepositoryToken(Dish),
          useValue: mockRepository(),
        },
        {
          provide: DataSource,
          useValue: mockDataSource(),
        },
      ],
    }).compile();
    service = module.get<RestaurantService>(RestaurantService);
    restaurantRepository = module.get(getRepositoryToken(RestaurantRepository));
    categoryRepository = module.get(getRepositoryToken(CategoryRepository));
    dishRepository = module.get(getRepositoryToken(Dish));
    dataSource = module.get(DataSource);
  });

  const ownerArgs = {
    id: 1,
    email: '',
    role: UserRole.Owner,
    verified: true,
  } as User;

  const restaurantArgs = new Restaurant();
  restaurantArgs.id = 1;
  restaurantArgs.name = '';
  restaurantArgs.coverImg = '';
  restaurantArgs.address = '';
  restaurantArgs.ownerId = 1;

  const restaurantsArgs = [
    {
      id: 1,
      name: 'restaurant1',
    },
    {
      id: 2,
      name: 'restaurant2',
    },
  ];

  const dishArgs = {
    id: 1,
    name: '',
    price: 1,
    restaurant: restaurantArgs,
  };

  const totalResults = restaurantsArgs.length;

  const categoryArgs = {
    id: 1,
    slug: 'categorySlug',
    name: 'categoryName',
  };

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createRestaurant', () => {
    const createRestaurantArgs = {
      name: '',
      coverImg: '',
      address: '',
      categoryName: '',
      lat: 37.123,
      lng: 123.1234,
    };

    it('should create a new restaurant', async () => {
      restaurantRepository.create.mockReturnValue({
        ...createRestaurantArgs,
        owner: ownerArgs,
        category: categoryArgs,
      });
      categoryRepository.getOrCreate.mockResolvedValue(categoryArgs);
      const result = await service.createRestaurant(
        ownerArgs,
        createRestaurantArgs,
      );
      expect(restaurantRepository.create).toHaveBeenCalledTimes(1);
      expect(restaurantRepository.create).toHaveBeenCalledWith(
        createRestaurantArgs,
      );
      expect(categoryRepository.getOrCreate).toHaveBeenCalledTimes(1);
      expect(categoryRepository.getOrCreate).toHaveBeenCalledWith(
        createRestaurantArgs.categoryName,
      );
      expect(restaurantRepository.save).toHaveBeenCalledTimes(1);
      expect(restaurantRepository.save).toHaveBeenCalledWith({
        ...createRestaurantArgs,
        owner: ownerArgs,
        category: categoryArgs,
      });
      expect(result).toEqual({ ok: true });
    });

    it('should fail on exception', async () => {
      restaurantRepository.save.mockRejectedValue(new Error());
      const result = await service.createRestaurant(
        ownerArgs,
        createRestaurantArgs,
      );
      expect(result).toEqual({
        ok: false,
        error: 'Could not create restaurant',
      });
    });
  });

  describe('myRestaurants', () => {
    it('should show all restaurants owner own', async () => {
      restaurantRepository.findBy.mockResolvedValue(restaurantArgs);
      const result = await service.myRestaurants(ownerArgs);

      expect(restaurantRepository.findBy).toHaveBeenCalledTimes(1);
      expect(restaurantRepository.findBy).toHaveBeenCalledWith({
        owner: { id: ownerArgs.id },
      });
      expect(result).toEqual({ ok: true, restaurants: restaurantArgs });
    });

    it('fail on exception', async () => {
      restaurantRepository.findBy.mockRejectedValue(new Error());
      const result = await service.myRestaurants(ownerArgs);
      expect(result).toEqual({
        ok: false,
        error: 'Could not load restaurants',
      });
    });
  });

  describe('editRestaurant', () => {
    const editRestaurantArgs = {
      restaurantId: 1,
      name: 'new',
      categoryName: 'new',
    };

    it('should edit restaurant', async () => {
      restaurantRepository.findAndCheck.mockResolvedValue(restaurantArgs);
      categoryRepository.getOrCreate.mockResolvedValue(categoryArgs);
      const result = await service.editRestaurant(
        ownerArgs,
        editRestaurantArgs,
      );

      expect(restaurantRepository.findAndCheck).toHaveBeenCalledTimes(1);
      expect(restaurantRepository.findAndCheck).toHaveBeenCalledWith(
        editRestaurantArgs.restaurantId,
        ownerArgs,
      );
      expect(categoryRepository.getOrCreate).toHaveBeenCalledTimes(1);
      expect(categoryRepository.getOrCreate).toHaveBeenCalledWith(
        editRestaurantArgs.categoryName,
      );
      expect(restaurantRepository.save).toHaveBeenCalledTimes(1);
      expect(restaurantRepository.save).toHaveBeenCalledWith({
        id: editRestaurantArgs.restaurantId,
        ...editRestaurantArgs,
        ...(categoryArgs && { category: categoryArgs }),
      });
      expect(result).toEqual({ ok: true });
    });

    it('should fail if restaurant is not instance of Restaurant', async () => {
      restaurantRepository.findAndCheck.mockResolvedValue({
        ok: false,
        error: 'error',
      });
      const result = await service.editRestaurant(
        ownerArgs,
        editRestaurantArgs,
      );
      expect(result).toEqual({
        ok: false,
        error: 'error',
      });
    });

    it('fail on exception', async () => {
      restaurantRepository.findAndCheck.mockRejectedValue(new Error());
      const result = await service.editRestaurant(
        ownerArgs,
        editRestaurantArgs,
      );
      expect(result).toEqual({
        ok: false,
        error: 'Could not edit restaurant',
      });
    });
  });

  describe('deleteRestaurant', () => {
    it('should delete restaurant', async () => {
      restaurantRepository.findAndCheck.mockResolvedValue(restaurantArgs);
      const result = await service.deleteRestaurant(ownerArgs, {
        restaurantId: restaurantArgs.id,
      });

      expect(restaurantRepository.findAndCheck).toHaveBeenCalledTimes(1);
      expect(restaurantRepository.findAndCheck).toHaveBeenCalledWith(
        restaurantArgs.id,
        ownerArgs,
      );
      expect(restaurantRepository.delete).toHaveBeenCalledTimes(1);
      expect(restaurantRepository.delete).toHaveBeenCalledWith({
        id: restaurantArgs.id,
      });
      expect(result).toEqual({ ok: true });
    });

    it('should fail if restaurant is not instance of Restaurant', async () => {
      restaurantRepository.findAndCheck.mockResolvedValue({
        ok: false,
        error: 'error',
      });
      const result = await service.deleteRestaurant(ownerArgs, {
        restaurantId: restaurantArgs.id,
      });
      expect(result).toEqual({
        ok: false,
        error: 'error',
      });
    });

    it('fail on exception', async () => {
      restaurantRepository.findAndCheck.mockRejectedValue(new Error());
      const result = await service.deleteRestaurant(ownerArgs, {
        restaurantId: restaurantArgs.id,
      });
      expect(result).toEqual({
        ok: false,
        error: 'Could not delete restaurant',
      });
    });
  });

  describe('allCategories', () => {
    it('should show all categories', async () => {
      categoryRepository.find.mockResolvedValue(categoryArgs);
      const result = await service.allCategories();

      expect(categoryRepository.find).toHaveBeenCalledTimes(1);
      expect(categoryRepository.find).toHaveBeenCalledWith();
      expect(result).toEqual({ ok: true, categories: categoryArgs });
    });

    it('fail on exception', async () => {
      categoryRepository.find.mockRejectedValue(new Error());
      const result = await service.allCategories();
      expect(result).toEqual({
        ok: false,
        error: 'Could not load categories',
      });
    });
  });

  describe('findCategoryBySlug', () => {
    const findCategoryArgs = {
      slug: 'slug',
      page: 1,
      limit: 1,
    };
    it('should fail if category not found', async () => {
      categoryRepository.findOne.mockResolvedValue(undefined);

      const result = await service.findCategoryBySlug(findCategoryArgs);

      expect(categoryRepository.findOne).toHaveBeenCalledTimes(1);
      expect(categoryRepository.findOne).toHaveBeenCalledWith({
        where: { slug: findCategoryArgs.slug },
      });

      expect(result).toEqual({
        ok: false,
        error: 'Category not found',
      });
    });

    it('should fail if restaurants not found', async () => {
      categoryRepository.findOne.mockResolvedValue(categoryArgs);
      restaurantRepository.find.mockResolvedValue(undefined);

      const result = await service.findCategoryBySlug(findCategoryArgs);

      expect(restaurantRepository.find).toHaveBeenCalledTimes(1);
      expect(restaurantRepository.find).toHaveBeenCalledWith({
        where: { category: { id: categoryArgs.id } },
        take: findCategoryArgs.limit,
        skip: (findCategoryArgs.page - 1) * findCategoryArgs.limit,
        order: {
          isPromoted: 'DESC',
        },
      });

      expect(result).toEqual({
        ok: false,
        error: 'Restaurants not found',
      });
    });

    it('should find category by slug', async () => {
      categoryRepository.findOne.mockResolvedValue(categoryArgs);
      restaurantRepository.find.mockResolvedValue(restaurantsArgs);
      restaurantRepository.countBy.mockResolvedValue(2);

      const result = await service.findCategoryBySlug(findCategoryArgs);

      expect(restaurantRepository.countBy).toHaveBeenCalledTimes(1);
      expect(restaurantRepository.countBy).toHaveBeenCalledWith({
        category: { id: categoryArgs.id },
      });

      expect(result).toEqual({
        ok: true,
        category: categoryArgs,
        restaurants: restaurantsArgs,
        totalPages: Math.ceil(totalResults / findCategoryArgs.limit),
        totalResults,
      });
    });

    it('fail on exception', async () => {
      categoryRepository.findOne.mockRejectedValue(new Error());
      const result = await service.findCategoryBySlug(findCategoryArgs);
      expect(result).toEqual({
        ok: false,
        error: 'Could not load category',
      });
    });
  });

  describe('allRestaurants', () => {
    const findRestaurantsArgs = {
      page: 1,
      limit: 1,
    };
    it('should fail if restaurants not found', async () => {
      restaurantRepository.findAndCount.mockResolvedValue([
        undefined,
        undefined,
      ]);
      const result = await service.allRestaurants(findRestaurantsArgs);

      expect(restaurantRepository.findAndCount).toHaveBeenCalledTimes(1);
      expect(restaurantRepository.findAndCount).toHaveBeenCalledWith({
        take: findRestaurantsArgs.limit,
        skip: (findRestaurantsArgs.page - 1) * findRestaurantsArgs.limit,
        order: {
          isPromoted: 'DESC',
        },
      });
      expect(result).toEqual({
        ok: false,
        error: 'Restaurants not found',
      });
    });

    it('should show all restaurants', async () => {
      restaurantRepository.findAndCount.mockResolvedValue([
        restaurantsArgs,
        totalResults,
      ]);
      const result = await service.allRestaurants(findRestaurantsArgs);

      expect(result).toEqual({
        ok: true,
        results: restaurantsArgs,
        totalPages: Math.ceil(totalResults / findRestaurantsArgs.limit),
        totalResults,
      });
    });

    it('fail on exception', async () => {
      restaurantRepository.findAndCount.mockRejectedValue(new Error());
      const result = await service.allRestaurants(findRestaurantsArgs);
      expect(result).toEqual({
        ok: false,
        error: 'Could not load restaurants',
      });
    });
  });

  describe('findRestaurantById', () => {
    const findRestaurantArgs = {
      restaurantId: 1,
    };
    it('should fail if restaurant not found', async () => {
      restaurantRepository.findOne.mockResolvedValue(undefined);
      const result = await service.findRestaurantById(findRestaurantArgs);

      expect(restaurantRepository.findOne).toHaveBeenCalledTimes(1);
      expect(restaurantRepository.findOne).toHaveBeenCalledWith({
        where: { id: findRestaurantArgs.restaurantId },
        relations: ['menu'],
      });
      expect(result).toEqual({
        ok: false,
        error: 'Restaurant not found',
      });
    });

    it('should find restaurant by id', async () => {
      restaurantRepository.findOne.mockResolvedValue(restaurantArgs);
      const result = await service.findRestaurantById(findRestaurantArgs);

      expect(result).toEqual({
        ok: true,
        restaurant: restaurantArgs,
      });
    });

    it('fail on exception', async () => {
      restaurantRepository.findOne.mockRejectedValue(new Error());
      const result = await service.findRestaurantById(findRestaurantArgs);
      expect(result).toEqual({
        ok: false,
        error: 'Could not find restaurant',
      });
    });
  });

  describe('searchRestaurantByName', () => {
    const searchRestaurantArgs = {
      page: 1,
      limit: 1,
      query: 'query',
    };
    it('should fail if restaurants not found', async () => {
      restaurantRepository.findAndCount.mockResolvedValue([
        undefined,
        undefined,
      ]);
      const result = await service.searchRestaurantByName(searchRestaurantArgs);

      expect(restaurantRepository.findAndCount).toHaveBeenCalledTimes(1);
      expect(restaurantRepository.findAndCount).toHaveBeenCalledWith({
        where: { name: ILike(`%${searchRestaurantArgs.query}%`) },
        take: searchRestaurantArgs.limit,
        skip: (searchRestaurantArgs.page - 1) * searchRestaurantArgs.limit,
      });
      expect(result).toEqual({
        ok: false,
        error: 'Restaurants not found',
      });
    });

    it('should search restaurant by name', async () => {
      restaurantRepository.findAndCount.mockResolvedValue([
        restaurantsArgs,
        totalResults,
      ]);
      const result = await service.searchRestaurantByName(searchRestaurantArgs);

      expect(result).toEqual({
        ok: true,
        restaurants: restaurantsArgs,
        totalPages: Math.ceil(totalResults / searchRestaurantArgs.limit),
        totalResults,
      });
    });

    it('fail on exception', async () => {
      restaurantRepository.findAndCount.mockRejectedValue(new Error());
      const result = await service.searchRestaurantByName(searchRestaurantArgs);
      expect(result).toEqual({
        ok: false,
        error: 'Could not search restaurants',
      });
    });
  });

  describe('findNearbyRestaurants', () => {
    const findNearbyRestaurantsArgs = {
      page: 1,
      limit: 1,
      lat: 1,
      lng: 1,
    };
    it('should fail if restaurants not found', async () => {
      dataSource.query.mockResolvedValue(undefined);
      const result = await service.findNearbyRestaurants(
        findNearbyRestaurantsArgs,
      );
      const offset =
        (findNearbyRestaurantsArgs.page - 1) * findNearbyRestaurantsArgs.limit;

      expect(dataSource.query).toHaveBeenCalledTimes(1);
      expect(dataSource.query).toHaveBeenCalledWith(
        `
        SELECT *, 
          ST_Distance(location, ST_MakePoint($1, $2)::geography) AS distance
        FROM restaurant
        WHERE ST_DWithin(location, ST_MakePoint($1, $2)::geography, $3)
        ORDER BY distance
        LIMIT $4 OFFSET $5
      `,
        [
          findNearbyRestaurantsArgs.lng,
          findNearbyRestaurantsArgs.lat,
          3000,
          findNearbyRestaurantsArgs.limit,
          offset,
        ],
      );
      expect(result).toEqual({
        ok: false,
        error: 'Restaurants not found',
      });
    });

    it('should find nearby restaurants', async () => {
      dataSource.query
        .mockResolvedValueOnce(restaurantsArgs)
        .mockResolvedValueOnce([{ total: totalResults }]);
      const result = await service.findNearbyRestaurants(
        findNearbyRestaurantsArgs,
      );

      expect(result).toEqual({
        ok: true,
        restaurants: restaurantsArgs,
        totalPages: Math.ceil(totalResults / findNearbyRestaurantsArgs.limit),
        totalResults,
      });
    });

    it('fail on exception', async () => {
      dataSource.query.mockRejectedValue(new Error());
      const result = await service.findNearbyRestaurants(
        findNearbyRestaurantsArgs,
      );
      expect(result).toEqual({
        ok: false,
        error: 'Could not find restaurants',
      });
    });
  });

  describe('createDish', () => {
    const createDishArgs = {
      name: 'name',
      price: 0,
      description: 'description',
      restaurantId: 1,
    };

    it('should create dish', async () => {
      restaurantRepository.findAndCheck.mockResolvedValue(restaurantArgs);
      dishRepository.create.mockReturnValue({
        ...createDishArgs,
        restaurant: restaurantArgs,
      });
      const result = await service.createDish(ownerArgs, createDishArgs);

      expect(restaurantRepository.findAndCheck).toHaveBeenCalledTimes(1);
      expect(restaurantRepository.findAndCheck).toHaveBeenCalledWith(
        createDishArgs.restaurantId,
        ownerArgs,
      );
      expect(dishRepository.create).toHaveBeenCalledTimes(1);
      expect(dishRepository.create).toHaveBeenCalledWith({
        ...createDishArgs,
        restaurant: restaurantArgs,
      });
      expect(dishRepository.save).toHaveBeenCalledTimes(1);
      expect(dishRepository.save).toHaveBeenCalledWith({
        ...createDishArgs,
        restaurant: restaurantArgs,
      });
      expect(result).toEqual({
        ok: true,
      });
    });

    it('should fail if restaurant is not instance of Restaurant', async () => {
      restaurantRepository.findAndCheck.mockResolvedValue({
        ok: false,
        error: 'error',
      });
      const result = await service.createDish(ownerArgs, createDishArgs);
      expect(result).toEqual({
        ok: false,
        error: 'error',
      });
    });

    it('should fail on exception', async () => {
      restaurantRepository.findAndCheck.mockRejectedValue(new Error());
      const result = await service.createDish(ownerArgs, createDishArgs);
      expect(result).toEqual({
        ok: false,
        error: 'Could not create dish',
      });
    });
  });

  describe('findDishById', () => {
    const findDishArgs = {
      restaurantId: 1,
      dishId: 1,
    };
    it('should fail if dish not found', async () => {
      dishRepository.findOne.mockResolvedValue(undefined);

      const result = await service.findDishById(ownerArgs, findDishArgs);

      expect(dishRepository.findOne).toHaveBeenCalledTimes(1);
      expect(dishRepository.findOne).toHaveBeenCalledWith({
        where: {
          restaurant: { id: findDishArgs.restaurantId },
          id: findDishArgs.dishId,
        },
        relations: ['restaurant'],
      });
      expect(result).toEqual({
        ok: false,
        error: 'Dish not found',
      });
    });

    it("should fail if owner don't own dish", async () => {
      const fakeOwnerArgs = {
        id: 2,
        email: '',
        role: UserRole.Owner,
        verified: true,
      } as User;
      dishRepository.findOne.mockResolvedValue(dishArgs);

      const result = await service.findDishById(fakeOwnerArgs, findDishArgs);

      expect(result).toEqual({
        ok: false,
        error: 'This dish is not belongs to your restaurant',
      });
    });

    it('should find dish by id', async () => {
      dishRepository.findOne.mockResolvedValue(dishArgs);

      const result = await service.findDishById(ownerArgs, findDishArgs);

      expect(result).toEqual({
        ok: true,
        dish: dishArgs,
      });
    });

    it('should fail on exception', async () => {
      dishRepository.findOne.mockRejectedValue(new Error());
      const result = await service.findDishById(ownerArgs, findDishArgs);

      expect(result).toEqual({
        ok: false,
        error: 'Could not find dish',
      });
    });
  });

  describe('editDish', () => {
    const editDishArgs = {
      dishId: 1,
      name: 'new',
    };
    const dishArgs = {
      name: 'name',
      price: 0,
      description: 'description',
      restaurantId: 1,
      restaurant: restaurantArgs,
    };

    it('should fail if dish not found', async () => {
      dishRepository.findOne.mockResolvedValue(undefined);
      const result = await service.editDish(ownerArgs, editDishArgs);

      expect(dishRepository.findOne).toHaveBeenCalledTimes(1);
      expect(dishRepository.findOne).toHaveBeenCalledWith({
        where: { id: editDishArgs.dishId },
        relations: ['restaurant'],
      });
      expect(result).toEqual({
        ok: false,
        error: 'Dish not found',
      });
    });

    it('should fail if anyone other than the owner tries to edit', async () => {
      const notOwnerArgs = {
        id: 2,
        email: '',
        role: UserRole.Owner,
        verified: true,
      } as User;
      dishRepository.findOne.mockResolvedValue(dishArgs);
      const result = await service.editDish(notOwnerArgs, editDishArgs);

      expect(result).toEqual({
        ok: false,
        error: 'You are not allowed to do this',
      });
    });

    it('should edit dish', async () => {
      dishRepository.findOne.mockResolvedValue(dishArgs);
      const result = await service.editDish(ownerArgs, editDishArgs);

      expect(dishRepository.save).toHaveBeenCalledTimes(1);
      expect(dishRepository.save).toHaveBeenCalledWith({
        id: editDishArgs.dishId,
        ...editDishArgs,
      });
      expect(result).toEqual({
        ok: true,
      });
    });

    it('fail on exception', async () => {
      dishRepository.findOne.mockRejectedValue(new Error());
      const result = await service.editDish(ownerArgs, editDishArgs);
      expect(result).toEqual({
        ok: false,
        error: 'Could not edit dish',
      });
    });
  });
});
