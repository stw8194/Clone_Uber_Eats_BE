import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { DataSource, Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';

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
  let app: INestApplication;
  let usersRepository: Repository<User>;
  let jwtToken: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    usersRepository = module.get<Repository<User>>(getRepositoryToken(User));
    await app.init();
  });

  afterAll(async () => {
    const dataSource = app.get(DataSource);

    await dataSource.dropDatabase();
    await dataSource.destroy();
    await app.close();
  });

  describe('createAccount', () => {
    it('should create account', () => {
      return request(app.getHttpServer())
        .post(GRAPHQL_ENDPOINT)
        .send({
          query: `mutation {
                    createAccount(
                      input:{
                        email:"${testUser.email}",
                        password:"${testUser.password}",
                        role:Owner
                      }) {
                      ok
                      error
                    }
                  }`,
        })
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                createAccount: { ok, error },
              },
            },
          } = res;
          const createAccount = res.body.data.createAccount;
          expect(ok).toBe(true);
          expect(error).toBe(null);
        });
    });

    it('should fail if account already exists', () => {
      return request(app.getHttpServer())
        .post(GRAPHQL_ENDPOINT)
        .send({
          query: `mutation {
                    createAccount(
                      input:{
                        email:"${testUser.email}",
                        password:"${testUser.password}",
                        role:Owner
                      }) {
                      ok
                      error
                    }
                  }`,
        })
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
      return request(app.getHttpServer())
        .post(GRAPHQL_ENDPOINT)
        .send({
          query: `mutation {
                    login(
                      input:{
                        email:"${testUser.email}",
                        password:"${testUser.password}"
                      }) {
                      ok
                      error
                      token
                    }
                  }`,
        })
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
      return request(app.getHttpServer())
        .post(GRAPHQL_ENDPOINT)
        .send({
          query: `mutation {
                    login(
                      input:{
                        email:"${testUser.email}",
                        password:"wrong"
                      }) {
                      ok
                      error
                      token
                    }
                  }`,
        })
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
      return request(app.getHttpServer())
        .post(GRAPHQL_ENDPOINT)
        .set('X-JWT', jwtToken)
        .send({
          query: `{
                    userProfile(userId: ${userId})
                    {
                      ok
                      error
                      user {
                          id
                      }
                    }
                  }`,
        })
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
      return request(app.getHttpServer())
        .post(GRAPHQL_ENDPOINT)
        .set('X-JWT', jwtToken)
        .send({
          query: `{
                    userProfile(userId: ${userId + 666})
                    {
                      ok
                      error
                      user {
                          id
                      }
                    }
                  }`,
        })
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
      return request(app.getHttpServer())
        .post(GRAPHQL_ENDPOINT)
        .set('X-JWT', jwtToken)
        .send({
          query: `{
                    me{
                      email
                    }
                  }`,
        })
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
      return request(app.getHttpServer())
        .post(GRAPHQL_ENDPOINT)
        .send({
          query: `{
                    me{
                      email
                    }
                  }`,
        })
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
      return request(app.getHttpServer())
        .post(GRAPHQL_ENDPOINT)
        .set('X-JWT', jwtToken)
        .send({
          query: `mutation {
                    editProfile (input: {
                      email: "${NEW_EMAIL}"
                      }) {
                    ok
                    error
                    }
                  }`,
        })
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
      return request(app.getHttpServer())
        .post(GRAPHQL_ENDPOINT)
        .set('X-JWT', jwtToken)
        .send({
          query: `{
                  me{
                    email
                  }
                }`,
        })
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
      return request(app.getHttpServer())
        .post(GRAPHQL_ENDPOINT)
        .send({
          query: `mutation {
                    createAccount(
                      input:{
                        email:"${testUser.email}",
                        password:"${testUser.password}",
                        role:Owner
                      }) {
                      ok
                      error
                    }
                  }`,
        })
        .then(() => {
          request(app.getHttpServer())
            .post(GRAPHQL_ENDPOINT)
            .set('X-JWT', jwtToken)
            .send({
              query: `mutation {
                    editProfile (input: {
                      email: "${testUser.email}"
                      }) {
                    ok
                    error
                    }
                  }`,
            })
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
      return request(app.getHttpServer())
        .post(GRAPHQL_ENDPOINT)
        .set('X-JWT', jwtToken)
        .send({
          query: `mutation {
                    editProfile (input: {
                      email: "${testUser.email}"
                      }) {
                    ok
                    error
                    }
                  }`,
        })
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

  it.todo('verifyEmail');
});
