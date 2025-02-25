import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { DataSource } from 'typeorm';

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
  let jwtToken: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    const dataSource = app.get(DataSource);

    await dataSource.dropDatabase();
    await dataSource.destroy();
    app.close();
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
          const createAccount = res.body.data;
          expect(createAccount.ok).toBe(true);
          expect(createAccount.error).toBe(null);
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
          const createAccount = res.body.data;
          expect(createAccount.ok).toBe(false);
          expect(createAccount.error).toBe(
            'There is a user with that email already',
          );
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
          const login = res.body.data;
          jwtToken = login.token;
          expect(login.ok).toBe(true);
          expect(login.error).toBe(null);
          expect(login.token).toEqual(expect.any(String));
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
          const login = res.body.data;
          expect(login.ok).toBe(false);
          expect(login.error).toBe('Wrong password');
          expect(login.token).toBe(null);
        });
    });
  });
  it.todo('userProfile');
  it.todo('me');
  it.todo('verifyEmail');
  it.todo('editProfile');
});
