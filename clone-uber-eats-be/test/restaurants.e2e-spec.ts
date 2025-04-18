import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { DataSource, Repository } from 'typeorm';
import { RestaurantRepository } from 'src/restaurants/repositories/restaurant.repository';
import { Dish } from 'src/restaurants/entities/dish.entity';
import { UserRole } from 'src/users/entities/user.entity';
import { getRepositoryToken } from '@nestjs/typeorm';

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

const testDish = {
  name: 'name',
  price: 0,
  description: 'description',
};

const TEST_PAGE = 2;
const TEST_LIMIT = 5;

describe('RestaurantModule (e2e)', () => {
  let app: INestApplication;
  let restaurantRepository: RestaurantRepository;
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
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    restaurantRepository = module.get(RestaurantRepository);
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

  describe('myRestaurants', () => {
    it('should return all restaurnats owner own', async () => {
      return privateTest(
        `
        {
          myRestaurants {
            ok
            error
            restaurants {
              name
            }
          }
        }`,
        testRealOwnerJwtToken,
      )
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                myRestaurants: { ok, error, restaurants },
              },
            },
          } = res;

          expect(ok).toBe(true);
          expect(error).toBe(null);
          expect(restaurants).toStrictEqual([
            {
              name: testRestaurant.name,
            },
          ]);
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
          expect(error).toBe('You are not allowed to do this');
        });
    });
  });

  describe('restaurants', () => {
    beforeAll(async () => {
      const createTestRestaurant = async (seq: number) => {
        return await privateTest(
          `mutation {
            createRestaurant(
                input: {
                    name: "${testRestaurant.name} number${seq}"
                    coverImg: "${testRestaurant.coverImg} number${seq}"
                    address: "${testRestaurant.address} number${seq}"
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
          results {
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
                restaurants: { ok, error, results, totalPages, totalResults },
              },
            },
          } = res;
          const expectedNames = [
            'name number4',
            'name number3',
            'name number2',
            'name number1',
            'new name',
          ];

          expect(ok).toBe(true);
          expect(error).toBe(null);
          expect(results).toEqual(expectedNames.map((name) => ({ name })));
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
          results {
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
                restaurants: { ok, error, results, totalPages, totalResults },
              },
            },
          } = res;
          const expectedNames = [
            'name number9',
            'name number8',
            'name number7',
            'name number6',
            'name number5',
          ];

          expect(ok).toBe(true);
          expect(error).toBe(null);
          expect(results).toEqual(expectedNames.map((name) => ({ name })));
          expect(totalPages).toBe(2);
          expect(totalResults).toBe(10);
        });
    });
  });

  describe('searchRestaurant', () => {
    const testQuery = 'number';
    it('should search restaurant by part of name', async () => {
      return publicTest(`
        {
          searchRestaurant(input:{
            page: 1
            limit: ${TEST_LIMIT}
            query: "${testQuery}"
          }) {
            ok
            error
            restaurants {
              name  
            }
            totalPages
            totalResults
            }}
        `)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                searchRestaurant: {
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
            'name number1',
            'name number2',
            'name number3',
            'name number4',
            'name number5',
          ];

          expect(ok).toBe(true);
          expect(error).toBe(null);
          expect(restaurants).toEqual(expectedNames.map((name) => ({ name })));
          expect(totalPages).toBe(2);
          expect(totalResults).toBe(9);
        });
    });
  });

  describe('allCategories', () => {
    it('should return all cateogories', async () => {
      return publicTest(`
        {
          allCategories {
            ok
            error
            categories {
              slug
            }
          }
        }`)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                allCategories: { ok, error, categories },
              },
            },
          } = res;

          expect(ok).toBe(true);
          expect(error).toBe(null);
          expect(categories).toStrictEqual([
            { slug: 'categoryname' },
            { slug: 'new-categoryname' },
          ]);
        });
    });
  });

  describe('category', () => {
    it('should find category and restaurants by slug', async () => {
      return publicTest(`{
        category(input: {
          slug: "categoryname"
          page: 1
          limit: ${TEST_LIMIT}
        }) {
          ok
          error
          category {
            slug
          }
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
                category: {
                  ok,
                  error,
                  category,
                  restaurants,
                  totalPages,
                  totalResults,
                },
              },
            },
          } = res;
          const expectedNames = [
            'name number1',
            'name number2',
            'name number3',
            'name number4',
            'name number5',
          ];

          expect(ok).toBe(true);
          expect(error).toBe(null);
          expect(category).toStrictEqual({ slug: 'categoryname' });
          expect(restaurants).toEqual(expectedNames.map((name) => ({ name })));
          expect(totalPages).toBe(2);
          expect(totalResults).toBe(9);
        });
    });
  });

  describe('createDish', () => {
    let restaurantId: number;
    beforeAll(async () => {
      const [restaurant] = await restaurantRepository.find();
      restaurantId = restaurant.id;
    });

    it('should create dish', async () => {
      return privateTest(
        `mutation {
          createDish(input: {
            name: "${testDish.name}"
            price: ${testDish.price}
            description: "${testDish.description}"
            restaurantId: ${restaurantId}
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
                createDish: { ok, error },
              },
            },
          } = res;
          expect(ok).toBe(true);
          expect(error).toBe(null);
        });
    });
  });

  describe('editDish', () => {
    const newTestDish = {
      name: 'new name',
      price: 1,
      description: 'new description',
    };
    let dishId: number;
    let restaurantId: number;
    beforeAll(async () => {
      const [dish] = await dishRepository.find();
      const [restaurant] = await restaurantRepository.find();
      dishId = dish.id;
      restaurantId = restaurant.id;
    });

    it('should edit dish with real owner', async () => {
      return privateTest(
        `mutation {
          editDish(input: {
            name: "${newTestDish.name}"
            price: ${newTestDish.price}
            description: "${newTestDish.description}"
            dishId: ${dishId}
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
                editDish: { ok, error },
              },
            },
          } = res;
          expect(ok).toBe(true);
          expect(error).toBe(null);
        });
    });

    it('should change dish', async () => {
      return publicTest(
        `{
          restaurant(
            restaurantId: ${restaurantId}
       ) {
            ok
            error
            restaurant {
              menu {
                name
                price
                description
              }
            }
          }
        }`,
      )
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                restaurant: {
                  ok,
                  error,
                  restaurant: {
                    menu: [{ name, price, description }],
                  },
                },
              },
            },
          } = res;

          expect(ok).toBe(true);
          expect(error).toBe(null);
          expect(name).toBe(newTestDish.name);
          expect(price).toBe(newTestDish.price);
          expect(description).toBe(newTestDish.description);
        });
    });

    it('should fail with fake owner', async () => {
      return privateTest(
        `mutation {
          editDish(input: {
            name: "${newTestDish.name}"
            price: ${newTestDish.price}
            description: "${newTestDish.description}"
            dishId: ${dishId}
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
                editDish: { ok, error },
              },
            },
          } = res;
          expect(ok).toBe(false);
          expect(error).toBe('You are not allowed to do this');
        });
    });
  });

  describe('deleteRestaurant', () => {
    let restaurantId: number;
    beforeAll(async () => {
      const [restaurant] = await restaurantRepository.find();
      restaurantId = restaurant.id;
    });

    it('should delete restaurant', async () => {
      return privateTest(
        `mutation {
          deleteRestaurant(
            restaurantId: ${restaurantId}
            ) {
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
                deleteRestaurant: { ok, error },
              },
            },
          } = res;

          expect(ok).toBe(true);
          expect(error).toBe(null);
        });
    });

    it('should not have deleted restaurant in DB', async () => {
      return publicTest(
        `{
          restaurant(
            restaurantId: ${restaurantId}
          ) {
            ok
            error  
          }
        }`,
      )
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                restaurant: { ok, error },
              },
            },
          } = res;

          expect(ok).toBe(false);
          expect(error).toBe('Restaurant not found');
        });
    });
  });
});
