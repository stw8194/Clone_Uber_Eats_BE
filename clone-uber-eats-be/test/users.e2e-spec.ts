import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { DataSource, Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { Verification } from 'src/users/entities/verification.entity';
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

const testUser = {
  email: 'noah@song.com',
  password: '1234',
};

describe('UserModule (e2e)', () => {
  jest.setTimeout(10000);
  let postgresContainer: StartedPostgreSqlContainer;
  let app: INestApplication;
  let usersRepository: Repository<User>;
  let verificationRepository: Repository<Verification>;
  let jwtToken: string;

  const baseTest = () => request(app.getHttpServer()).post(GRAPHQL_ENDPOINT);
  const publicTest = (query: string) => baseTest().send({ query });
  const privateTest = (query: string) =>
    baseTest().set('X-JWT', jwtToken).send({ query });

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
    usersRepository = module.get<Repository<User>>(getRepositoryToken(User));
    verificationRepository = module.get<Repository<Verification>>(
      getRepositoryToken(Verification),
    );
    await app.init();
  });

  afterAll(async () => {
    const dataSource = app.get(DataSource);

    await dataSource.dropDatabase();
    await dataSource.destroy();
    await app.close();

    await postgresContainer.stop();
  });

  describe('createAccount', () => {
    it('should create account', () => {
      return publicTest(`mutation {
                    createAccount(
                      input:{
                        email:"${testUser.email}",
                        password:"${testUser.password}",
                        role:Owner
                      }) {
                      ok
                      error
                    }
                  }`)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                createAccount: { ok, error },
              },
            },
          } = res;
          expect(ok).toBe(true);
          expect(error).toBe(null);
        });
    });

    it('should fail if account already exists', () => {
      return publicTest(`mutation {
                    createAccount(
                      input:{
                        email:"${testUser.email}",
                        password:"${testUser.password}",
                        role:Owner
                      }) {
                      ok
                      error
                    }
                  }`)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                createAccount: { ok, error },
              },
            },
          } = res;
          expect(ok).toBe(false);
          expect(error).toBe('There is a user with that email already');
        });
    });
  });

  describe('login', () => {
    it('should login with correct credentials', () => {
      return publicTest(`mutation {
                    login(
                      input:{
                        email:"${testUser.email}",
                        password:"${testUser.password}"
                      }) {
                      ok
                      error
                      token
                    }
                  }`)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                login: { ok, error, token },
              },
            },
          } = res;
          jwtToken = token;
          expect(ok).toBe(true);
          expect(error).toBe(null);
          expect(token).toEqual(expect.any(String));
        });
    });

    it('should not be able to login with wrong credentials', () => {
      return publicTest(`mutation {
                    login(
                      input:{
                        email:"${testUser.email}",
                        password:"wrong"
                      }) {
                      ok
                      error
                      token
                    }
                  }`)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                login: { ok, error, token },
              },
            },
          } = res;
          expect(ok).toBe(false);
          expect(error).toBe('Wrong password');
          expect(token).toBe(null);
        });
    });
  });

  describe('userProfile', () => {
    let userId: number;
    beforeAll(async () => {
      const [user] = await usersRepository.find();
      userId = user.id;
    });

    it("should see a user's profile", () => {
      return privateTest(`{
                    userProfile(userId: ${userId})
                    {
                      ok
                      error
                      user {
                          id
                      }
                    }
                  }`)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                userProfile: {
                  ok,
                  error,
                  user: { id },
                },
              },
            },
          } = res;
          expect(ok).toBe(true);
          expect(error).toBe(null);
          expect(id).toBe(userId);
        });
    });

    it('should not find a profile', () => {
      return privateTest(`{
                    userProfile(userId: ${userId + 666})
                    {
                      ok
                      error
                      user {
                          id
                      }
                    }
                  }`)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                userProfile: { ok, error, user },
              },
            },
          } = res;
          expect(ok).toBe(false);
          expect(error).toBe('User not Found');
          expect(user).toBe(null);
        });
    });
  });

  describe('me', () => {
    it('should find my profile', () => {
      return privateTest(`{
                    me{
                      email
                    }
                  }`)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                me: { email },
              },
            },
          } = res;
          expect(email).toBe(testUser.email);
        });
    });

    it('should not allow logged out user', () => {
      return publicTest(`{
                    me{
                      email
                    }
                  }`)
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

  describe('editProfile', () => {
    const NEW_EMAIL = 'new@song.com';
    it('should change email', () => {
      return privateTest(`mutation {
                    editProfile (input: {
                      email: "${NEW_EMAIL}"
                      }) {
                    ok
                    error
                    }
                  }`)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                editProfile: { ok, error },
              },
            },
          } = res;
          expect(ok).toBe(true);
          expect(error).toBe(null);
        });
    });

    it('should have new email', () => {
      return privateTest(`{
                  me{
                    email
                  }
                }`)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                me: { email },
              },
            },
          } = res;
          expect(email).toBe(NEW_EMAIL);
        });
    });

    it('should throw an error if someone is using the email address', () => {
      return publicTest(`mutation {
                    createAccount(
                      input:{
                        email:"${testUser.email}",
                        password:"${testUser.password}",
                        role:Owner
                      }) {
                      ok
                      error
                    }
                  }`).then(() => {
        privateTest(`mutation {
                    editProfile (input: {
                      email: "${testUser.email}"
                      }) {
                    ok
                    error
                    }
                  }`)
          .expect(200)
          .expect((res) => {
            const {
              body: {
                data: {
                  editProfile: { ok, error },
                },
              },
            } = res;
            expect(ok).toBe(false);
            expect(error).toBe('This email is already in use');
          });
      });
    });

    it('should throw an error if edit without changing the email ', () => {
      return privateTest(`mutation {
                    editProfile (input: {
                      email: "${NEW_EMAIL}"
                      }) {
                    ok
                    error
                    }
                  }`)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                editProfile: { ok, error },
              },
            },
          } = res;
          expect(ok).toBe(false);
          expect(error).toBe('You cannot use your current email address');
        });
    });
  });

  describe('verifyEmail', () => {
    let verificationCode: string;
    beforeAll(async () => {
      const [verification] = await verificationRepository.find();
      verificationCode = verification.code;
    });

    it('should verify email', () => {
      return publicTest(`mutation{
                    verifyEmail(input:{
                      code:"${verificationCode}"
                    }){
                      ok
                      error
                    }
                  }`)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                verifyEmail: { ok, error },
              },
            },
          } = res;
          expect(ok).toBe(true);
          expect(error).toBe(null);
        });
    });

    it('should fail on wrong verification code', async () => {
      return publicTest(`mutation{
                    verifyEmail(input:{
                      code:"wrong code"
                    }){
                      ok
                      error
                    }
                  }`)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                verifyEmail: { ok, error },
              },
            },
          } = res;
          expect(ok).toBe(false);
          expect(error).toBe('Verification not found');
        });
    });
  });
});
