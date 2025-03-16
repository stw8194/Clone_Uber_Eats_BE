import { Test, TestingModule } from '@nestjs/testing';
import { RestaurantRepository } from './restaurant.repository';
import { DataSource } from 'typeorm';
import { CategoryRepository } from './category.repository';

describe('CatogoryRepository', () => {
  let repository: CategoryRepository;

  beforeEach(async () => {
    const mockDataSource = {
      createEntityManager: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryRepository,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    repository = module.get<CategoryRepository>(CategoryRepository);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('getOrCreate', () => {
    const findOneSpy = (value) => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(value);
    };
    const saveSpy = (value) => {
      jest.spyOn(repository, 'save').mockResolvedValue(value);
    };
    const createSpy = (value) => {
      jest.spyOn(repository, 'create').mockReturnValue(value);
    };
    const categoryArgs = {
      name: 'name',
      slug: 'slug',
    };

    it('should return category', async () => {
      findOneSpy(categoryArgs);
      await repository.getOrCreate('test');

      expect(repository.findOne).toHaveBeenCalledTimes(1);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { slug: expect.any(String) },
      });
    });

    it('should save category if category not found', async () => {
      findOneSpy(undefined);
      createSpy({ slug: categoryArgs.slug, name: categoryArgs.name });
      saveSpy({ slug: categoryArgs.slug, name: categoryArgs.name });
      await repository.getOrCreate('test');

      expect(repository.create).toHaveBeenCalledTimes(1);
      expect(repository.create).toHaveBeenCalledWith({
        slug: 'test',
        name: 'test',
      });
      expect(repository.save).toHaveBeenCalledTimes(1);
      expect(repository.save).toHaveBeenCalledWith({
        slug: categoryArgs.slug,
        name: categoryArgs.name,
      });
    });
  });
});
