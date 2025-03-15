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
      console.log(result);
      expect(result).toEqual({
        ok: false,
        error: 'Could not edit restaurant',
      });
    });
  });

  it.todo('deleteRestaurant');
  it.todo('allCategories');
  it.todo('countRestaurants');
  it.todo('findCategoryBySlug');
  it.todo('allRestaurants');
  it.todo('findRestaurantById');
  it.todo('searchRestaurantByName');
  it.todo('createDish');
  it.todo('editDish');
});
