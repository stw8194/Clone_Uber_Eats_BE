import { Test } from '@nestjs/testing';
import { RestaurantService } from './restaurants.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User, UserRole } from 'src/users/entities/user.entity';
import { RestaurantRepository } from './repositories/restaurant.repository';
import { CategoryRepository } from './repositories/category.repository';
import { Dish } from './entities/dish.entity';
import { Repository } from 'typeorm';
import { Restaurant } from './entities/restaurant.entity';

const mockRepository = () => ({
  find: jest.fn(),
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

type mockCustumRepository<T = any> = Partial<Record<keyof T, jest.Mock>>;
type mockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

describe('RestaurantService', () => {
  let service: RestaurantService;
  let restaurantRepository: mockCustumRepository<RestaurantRepository>;
  let categoryRepository: mockCustumRepository<CategoryRepository>;
  let dishRepository: mockRepository<Dish>;
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
      ],
    }).compile();
    service = module.get<RestaurantService>(RestaurantService);
    restaurantRepository = module.get(getRepositoryToken(RestaurantRepository));
    categoryRepository = module.get(getRepositoryToken(CategoryRepository));
    dishRepository = module.get(getRepositoryToken(Dish));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createRestaurant', () => {
    const createRestaurantArgs = {
      name: '',
      coverImg: '',
      address: '',
      categoryName: '',
    };
    const ownerArgs = {
      id: 1,
      email: '',
      role: UserRole.Owner,
      verified: true,
    } as User;
    const categoryArgs = {
      slug: 'categorySlug',
      name: 'categoryName',
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

  describe('editRestaurant', () => {
    const editRestaurantArgs = {
      restaurantId: 1,
      name: 'new',
      categoryName: 'new',
    };
    const restaurantArgs = new Restaurant();
    restaurantArgs.id = 1;
    restaurantArgs.name = '';
    restaurantArgs.coverImg = '';
    restaurantArgs.address = '';
    const ownerArgs = {
      id: 1,
      email: '',
      role: UserRole.Owner,
      verified: true,
    } as User;
    const categoryArgs = {
      slug: 'categorySlug',
      name: 'categoryName',
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
        'edit',
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
    const restaurantArgs = new Restaurant();
    restaurantArgs.id = 1;
    const ownerArgs = {
      id: 1,
      email: '',
      role: UserRole.Owner,
      verified: true,
    } as User;
    it('should delete restaurant', async () => {
      restaurantRepository.findAndCheck.mockResolvedValue(restaurantArgs);
      const result = await service.deleteRestaurant(
        ownerArgs,
        restaurantArgs.id,
      );

      expect(restaurantRepository.findAndCheck).toHaveBeenCalledTimes(1);
      expect(restaurantRepository.findAndCheck).toHaveBeenCalledWith(
        restaurantArgs.id,
        ownerArgs,
        'delete',
      );
      expect(restaurantRepository.delete).toHaveBeenCalledTimes(1);
      expect(restaurantRepository.delete).toHaveBeenCalledWith({
        id: restaurantArgs.id,
      });
      expect(result).toEqual({ ok: true });
    });

    it('fail on exception', async () => {
      restaurantRepository.findAndCheck.mockRejectedValue(new Error());
      const result = await service.deleteRestaurant(
        ownerArgs,
        restaurantArgs.id,
      );
      expect(result).toEqual({
        ok: false,
        error: 'Could not delete restaurant',
      });
    });
  });

  describe('allCategories', () => {
    it('should show all categories', async () => {
      const categoryArgs = {
        name: '',
      };
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
    const categoryArgs = {
      id: 1,
      slug: 'categorySlug',
      name: 'categoryName',
    };
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
    it('should fail if category not found', async () => {
      categoryRepository.findOne.mockResolvedValue(null);

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
      restaurantRepository.find.mockResolvedValue(null);

      const result = await service.findCategoryBySlug(findCategoryArgs);

      expect(restaurantRepository.find).toHaveBeenCalledTimes(1);
      expect(restaurantRepository.find).toHaveBeenCalledWith({
        where: { category: { id: categoryArgs.id } },
        take: findCategoryArgs.limit,
        skip: (findCategoryArgs.page - 1) * findCategoryArgs.limit,
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
        totalPages: Math.ceil(2 / findCategoryArgs.limit),
        totalResults: 2,
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

  it.todo('allRestaurants');
  it.todo('findRestaurantById');
  it.todo('searchRestaurantByName');
  it.todo('createDish');
  it.todo('editDish');
});
