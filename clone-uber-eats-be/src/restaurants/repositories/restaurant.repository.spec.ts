import { Test, TestingModule } from '@nestjs/testing';
import { RestaurantRepository } from './restaurant.repository';
import { User, UserRole } from 'src/users/entities/user.entity';
import { DataSource } from 'typeorm';

describe('RestaurantRepository', () => {
  let repository: RestaurantRepository;

  beforeEach(async () => {
    const mockDataSource = {
      createEntityManager: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RestaurantRepository,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    repository = module.get<RestaurantRepository>(RestaurantRepository);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('findAndCheck', () => {
    const ownerArgs = {
      id: 1,
      email: '',
      role: UserRole.Owner,
      verified: true,
    } as User;

    const restaurantArgs = {
      id: 1,
      name: 'restaurant',
      ownerId: 1,
    };

    const findOneBySpy = (value) => {
      jest.spyOn(repository, 'findOneBy').mockResolvedValue(value);
    };
    it('should fail if restaurant not found', async () => {
      findOneBySpy(undefined);
      const result = await repository.findAndCheck(ownerArgs.id, ownerArgs);
      expect(repository.findOneBy).toHaveBeenCalledTimes(1);
      expect(repository.findOneBy).toHaveBeenCalledWith({ id: ownerArgs.id });
      expect(result).toEqual({
        ok: false,
        error: 'Restaurant not found',
      });
    });

    it('should fail if anyone other than the owner tries to edit', async () => {
      const otherRestaurantArgs = {
        id: 2,
        name: 'other restaurant',
        ownerId: 2,
      };
      findOneBySpy(otherRestaurantArgs);
      const result = await repository.findAndCheck(
        otherRestaurantArgs.ownerId,
        ownerArgs,
      );
      expect(result).toEqual({
        ok: false,
        error: 'You are not allowed to do this',
      });
    });

    it('should return restaurant', async () => {
      findOneBySpy(restaurantArgs);
      const result = await repository.findAndCheck(ownerArgs.id, ownerArgs);
      expect(result).toEqual(restaurantArgs);
    });
  });
});
