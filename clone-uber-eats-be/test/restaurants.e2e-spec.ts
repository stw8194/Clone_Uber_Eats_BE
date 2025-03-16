import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { DataSource, Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RestaurantRepository } from 'src/restaurants/repositories/restaurant.repository';
import { CategoryRepository } from 'src/restaurants/repositories/category.repository';
import { Dish } from 'src/restaurants/entities/dish.entity';

jest.mock('got', () => {
  return {
    post: jest.fn(),
  };
});

const GRAPHQL_ENDPOINT = '/graphql';

describe('RestaurantModule (e2e)', () => {
  let app: INestApplication;
  let restaurantRepository: RestaurantRepository;
  let categoryRepository: CategoryRepository;
  let dishRepository: Repository<Dish>;
  let jwtToken: string;

  const baseTest = () => request(app.getHttpServer()).post(GRAPHQL_ENDPOINT);
  const publicTest = (query: string) => baseTest().send({ query });
  const privateTest = (query: string) =>
    baseTest().set('X-JWT', jwtToken).send({ query });

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    restaurantRepository = module.get(RestaurantRepository);
    categoryRepository = module.get(getRepositoryToken(CategoryRepository));
    dishRepository = module.get(getRepositoryToken(Dish));

    await app.init();
  });

  afterAll(async () => {
    const dataSource = app.get(DataSource);

    await dataSource.dropDatabase();
    await dataSource.destroy();
    await app.close();
  });

  describe('createRestaurant', () => {
    it.todo('create new restaurant');
  });

  describe('editRestaurant', () => {
    it.todo('should edit restaurant with real owner');
    it.todo('should fail with fake owner');
    it.todo('should fail if user is not in owner role');
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
