import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { DataSource, Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RestaurantRepository } from 'src/restaurants/repositories/restaurant.repository';
import { CategoryRepository } from 'src/restaurants/repositories/category.repository';
import { Dish } from 'src/restaurants/entities/dish.entity';
import { UserRole } from 'src/users/entities/user.entity';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';

jest.mock('got', () => {
  return {
    post: jest.fn(),
  };
});

const GRAPHQL_ENDPOINT = '/graphql';

const testClient = {
  email: 'user@test.com',
  password: '1234',
  role: UserRole.Client,
};

const testRealOwner = {
  email: 'real@owner.com',
  password: '1234',
  role: UserRole.Owner,
};

const testFakeOwner = {
  email: 'fake@owner.com',
  password: '1234',
  role: UserRole.Owner,
};

describe('RestaurantModule (e2e)', () => {
  jest.setTimeout(10000);
  let postgresContainer: StartedPostgreSqlContainer;
  let app: INestApplication;
  let restaurantRepository: RestaurantRepository;
  let categoryRepository: CategoryRepository;
  let dishRepository: Repository<Dish>;
  let testClientJwtToken: string;
  let testRealOwnerJwtToken: string;
  let testFakeOwnerJwtToken: string;

  const baseTest = () => request(app.getHttpServer()).post(GRAPHQL_ENDPOINT);
  const publicTest = (query: string) => baseTest().send({ query });
  const privateTest = (query: string, jwtToken: string) =>
    baseTest().set('X-JWT', jwtToken).send({ query });

  const createTestUser = async (testUser) => {
    return await publicTest(`mutation {
          createAccount(
            input:{
              email:"${testUser.email}",
              password:"${testUser.password}",
              role:${testUser.role}
            }) {
            ok
            error
          }
        }`);
  };

  const getJwtToken = async (testUser) => {
    const response = await publicTest(`mutation {
        login(
          input:{
            email:"${testUser.email}",
            password:"${testUser.password}"
          }) {
          token
        }
      }`);
    const {
      body: {
        data: {
          login: { token },
        },
      },
    } = response;
    return token;
  };

  beforeAll(async () => {
    postgresContainer = await new PostgreSqlContainer()
      .withUsername(process.env.DB_USERNAME)
      .withPassword(process.env.DB_PASSWORD)
      .withDatabase(process.env.DB_DATABASE)
      .withExposedPorts(5432)
      .start();

    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    restaurantRepository = module.get(RestaurantRepository);
    categoryRepository = module.get(getRepositoryToken(CategoryRepository));
    dishRepository = module.get(getRepositoryToken(Dish));

    await app.init();

    await createTestUser(testClient);
    await createTestUser(testRealOwner);
    await createTestUser(testFakeOwner);

    testClientJwtToken = await getJwtToken(testClient);
    testRealOwnerJwtToken = await getJwtToken(testRealOwner);
    testFakeOwnerJwtToken = await getJwtToken(testFakeOwner);
  });

  afterAll(async () => {
    const dataSource = app.get(DataSource);

    await dataSource.dropDatabase();
    await dataSource.destroy();
    await app.close();

    await postgresContainer.stop();
  });

  describe('createRestaurant', () => {
    const testRestaurant = {
      name: 'name',
      coverImg: 'coverImg',
      address: 'address',
      categoryName: 'categoryName',
    };
    it('should create new restaurant', () => {
      return privateTest(
        `mutation {
            createRestaurant(
                input: {
                    name: "${testRestaurant.name}"
                    coverImg: "${testRestaurant.coverImg}"
                    address: "${testRestaurant.address}"
                    categoryName: "${testRestaurant.categoryName}"
                }) {
                ok
                error
            }
        }`,
        testRealOwnerJwtToken,
      )
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                createRestaurant: { ok, error },
              },
            },
          } = res;
          expect(ok).toBe(true);
          expect(error).toBe(null);
        });
    });

    it('should fail if user is not in owner role', () => {
      return privateTest(
        `mutation {
            createRestaurant(
                input: {
                    name: "${testRestaurant.name}"
                    coverImg: "${testRestaurant.coverImg}"
                    address: "${testRestaurant.address}"
                    categoryName: "${testRestaurant.categoryName}"
                }) {
                ok
                error
            }
        }`,
        testClientJwtToken,
      )
        .expect(200)
        .expect((res) => {
          const {
            body: {
              errors: [{ message }],
            },
          } = res;
          expect(message).toBe('Forbidden resource');
        });
    });
  });

  describe('editRestaurant', () => {
    it.todo('should edit restaurant with real owner');
    it.todo('should fail with fake owner');
  });

  describe('allCategories', () => {
    it.todo('should return all cateogories');
  });

  describe('findCategoryBySlug', () => {
    it.todo('should find category and restaurant by slug');
  });

  describe('allRestaurants', () => {
    it.todo('should return all restaurants');
  });

  describe('findRestaurantById', () => {
    it.todo('should find restaurant by id');
  });

  describe('searchRestaurantByName', () => {
    it.todo('should search restaurant by name');
  });

  describe('createDish', () => {
    it.todo('should create dish');
  });

  describe('editDish', () => {
    it.todo('should edit dish with real owner');
    it.todo('should fail with fake owner');
  });

  describe('deleteRestaurant', () => {
    it.todo('should delete restaurant');
  });
});
