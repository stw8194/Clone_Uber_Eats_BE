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
import { number } from 'joi';

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

const testRestaurant = {
  name: 'name',
  coverImg: 'coverImg',
  address: 'address',
  categoryName: 'categoryName',
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

  describe('restaurant', () => {
    let restaurantId: number;
    beforeAll(async () => {
      const [restaurant] = await restaurantRepository.find();
      restaurantId = restaurant.id;
    });

    it('should find restaurant by id', async () => {
      return publicTest(`
        {
          restaurant(
            restaurantId: ${restaurantId}
       ) {
            ok
            error
            restaurant {
              name
              coverImg
              address
              category {
                name
                slug
              }
            }
          }
        }`)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                restaurant: { ok, error, restaurant },
              },
            },
          } = res;
          expect(ok).toBe(true);
          expect(error).toBe(null);
          expect(restaurant).toStrictEqual({
            name: testRestaurant.name,
            coverImg: testRestaurant.coverImg,
            address: testRestaurant.address,
            category: {
              name: 'categoryname',
              slug: 'categoryname',
            },
          });
        });
    });
  });

  describe('editRestaurant', () => {
    const newTestRestaurant = {
      name: 'new name',
      coverImg: 'new coverImg',
      address: 'new address',
      categoryName: 'new categoryName',
    };

    let restaurantId: number;
    beforeAll(async () => {
      const [restaurant] = await restaurantRepository.find();
      restaurantId = restaurant.id;
    });

    it('should edit restaurant with real owner', async () => {
      return privateTest(
        `mutation {
          editRestaurant(input:{
            restaurantId: ${restaurantId}
            name: "${newTestRestaurant.name}"
            coverImg: "${newTestRestaurant.coverImg}"
            address: "${newTestRestaurant.address}"
            categoryName: "${newTestRestaurant.categoryName}"
          }){
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
                editRestaurant: { ok, error },
              },
            },
          } = res;
          expect(ok).toBe(true);
          expect(error).toBe(null);
        });
    });

    it('should change restaurant', async () => {
      return publicTest(`
        {
          restaurant(
            restaurantId: ${restaurantId}
       ) {
            ok
            error
            restaurant {
              name
              coverImg
              address
              category {
                name
                slug
              }
            }
          }
        }`)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                restaurant: { ok, error, restaurant },
              },
            },
          } = res;
          expect(ok).toBe(true);
          expect(error).toBe(null);
          expect(restaurant).toStrictEqual({
            name: newTestRestaurant.name,
            coverImg: newTestRestaurant.coverImg,
            address: newTestRestaurant.address,
            category: {
              name: 'new categoryname',
              slug: 'new-categoryname',
            },
          });
        });
    });

    it('should fail with fake owner', async () => {
      return privateTest(
        `mutation {
          editRestaurant(input:{
            restaurantId: ${restaurantId}
          }){
            ok
            error
            }
        }`,
        testFakeOwnerJwtToken,
      )
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                editRestaurant: { ok, error },
              },
            },
          } = res;
          expect(ok).toBe(false);
          expect(error).toBe("You cannot edit a restaurant that you don't own");
        });
    });
  });

  describe('restaurants', () => {
    const TEST_PAGE = 2;
    const TEST_LIMIT = 5;

    beforeAll(async () => {
      const createTestRestaurant = async (seq: number) => {
        return await privateTest(
          `mutation {
            createRestaurant(
                input: {
                    name: "${testRestaurant.name} ${seq}"
                    coverImg: "${testRestaurant.coverImg} ${seq}"
                    address: "${testRestaurant.address} ${seq}"
                    categoryName: "${testRestaurant.categoryName}"
                }) {
                ok
                error
            }
        }`,
          testRealOwnerJwtToken,
        );
      };
      for (let seq = 1; seq < 10; seq++) {
        await createTestRestaurant(seq);
      }
    });

    it(`should return ${TEST_LIMIT} restaurants`, async () => {
      return publicTest(`{
        restaurants(input: {
          page: 1
          limit: ${TEST_LIMIT}
        }) {
          ok
          error
          restaurants {
            name  
          }
          totalPages
          totalResults
          }
        }`)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                restaurants: {
                  ok,
                  error,
                  restaurants,
                  totalPages,
                  totalResults,
                },
              },
            },
          } = res;
          const expectedNames = [
            'name 4',
            'name 3',
            'name 2',
            'name 1',
            'new name',
          ];

          expect(ok).toBe(true);
          expect(error).toBe(null);
          expect(restaurants).toEqual(expectedNames.map((name) => ({ name })));
          expect(totalPages).toBe(2);
          expect(totalResults).toBe(10);
        });
    });

    it(`should return ${TEST_LIMIT} restaurants after ${
      TEST_PAGE * (TEST_LIMIT - 1)
    }`, async () => {
      return publicTest(`{
        restaurants(input: {
          page: ${TEST_PAGE}
          limit: ${TEST_LIMIT}
        }) {
          ok
          error
          restaurants {
            name  
          }
          totalPages
          totalResults
          }
        }`)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                restaurants: {
                  ok,
                  error,
                  restaurants,
                  totalPages,
                  totalResults,
                },
              },
            },
          } = res;
          const expectedNames = [
            'name 9',
            'name 8',
            'name 7',
            'name 6',
            'name 5',
          ];

          expect(ok).toBe(true);
          expect(error).toBe(null);
          expect(restaurants).toEqual(expectedNames.map((name) => ({ name })));
          expect(totalPages).toBe(2);
          expect(totalResults).toBe(10);
        });
    });
  });

  describe('searchRestaurant', () => {
    it.todo('should search restaurant by name');
  });

  describe('allCategories', () => {
    it.todo('should return all cateogories');
  });

  describe('findCategoryBySlug', () => {
    it.todo('should find category and restaurant by slug');
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
