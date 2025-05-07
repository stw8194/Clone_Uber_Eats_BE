import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { DataSource } from 'typeorm';
import { UserRole } from 'src/users/entities/user.entity';
import { RestaurantRepository } from 'src/restaurants/repositories/restaurant.repository';

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
  lat: 37.123456,
  lng: 123.456789,
};

describe('PaymentModule (e2e)', () => {
  let app: INestApplication;
  let restaurantRepository: RestaurantRepository;
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

  const createRestaurant = async (testRestaurant, jwtToken: string) => {
    return await privateTest(
      `mutation {
            createRestaurant(
                input: {
                    name: "${testRestaurant.name}"
                    coverImg: "${testRestaurant.coverImg}"
                    address: "${testRestaurant.address}"
                    categoryName: "${testRestaurant.categoryName}"
                    lat:${testRestaurant.lat}
                    lng:${testRestaurant.lng}
                }) {
                ok
                error
            }
        }`,
      jwtToken,
    );
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    restaurantRepository = module.get(RestaurantRepository);
    await app.init();

    await createTestUser(testClient);
    await createTestUser(testRealOwner);
    await createTestUser(testFakeOwner);

    testClientJwtToken = await getJwtToken(testClient);
    testRealOwnerJwtToken = await getJwtToken(testRealOwner);
    testFakeOwnerJwtToken = await getJwtToken(testFakeOwner);

    await createRestaurant(testRestaurant, testRealOwnerJwtToken);
  });

  afterAll(async () => {
    const dataSource = app.get(DataSource);

    await dataSource.dropDatabase();
    await dataSource.destroy();
    await app.close();
  });

  describe('createPayment', () => {
    let restaurantId: number;
    beforeAll(async () => {
      const [restaurant] = await restaurantRepository.find();
      restaurantId = restaurant.id;
    });

    it('should create payment', async () => {
      return privateTest(
        `mutation {
            createPayment(input: {
                transactionId: "test"
                restaurantId: ${restaurantId}
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
                createPayment: { ok, error },
              },
            },
          } = res;

          expect(ok).toBe(true);
          expect(error).toBe(null);
        });
    });

    it('should fail if user is not owner', async () => {
      return privateTest(
        `mutation {
                createPayment(input: {
                    transactionId: "test"
                    restaurantId: ${restaurantId}
                }){
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

    it('should not create payment with restaurantId which is not exist', async () => {
      return privateTest(
        `mutation {
                createPayment(input: {
                    transactionId: "test"
                    restaurantId: 666
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
                createPayment: { ok, error },
              },
            },
          } = res;

          expect(ok).toBe(false);
          expect(error).toBe('Restaurant not found');
        });
    });

    it('should not create payment with restaurantId which is not user own', async () => {
      return privateTest(
        `mutation {
                createPayment(input: {
                    transactionId: "test"
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
                createPayment: { ok, error },
              },
            },
          } = res;

          expect(ok).toBe(false);
          expect(error).toBe('You are not allowed to do this');
        });
    });
  });

  describe('getPayments', () => {
    it('should show payments that owner paid', async () => {
      return privateTest(
        `{
            getPayments{
                ok
                error
                payments {
                    transactionId
                }
            }   
        }`,
        testRealOwnerJwtToken,
      ).expect((res) => {
        const {
          body: {
            data: {
              getPayments: {
                ok,
                error,
                payments: [{ transactionId }],
              },
            },
          },
        } = res;
        expect(ok).toBe(true);
        expect(error).toBe(null);
        expect(transactionId).toBe('test');
      });
    });
  });
});
