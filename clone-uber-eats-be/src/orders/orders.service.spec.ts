import { Repository } from 'typeorm';
import { OrderService } from './orders.service';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { Restaurant } from 'src/restaurants/entities/restaurant.entity';
import { Dish } from 'src/restaurants/entities/dish.entity';
import { OrderItem } from './entities/order-item.entity';
import { User, UserRole } from 'src/users/entities/user.entity';
import { PubSub } from 'graphql-subscriptions';
import { PUB_SUB } from 'src/common/common.constants';

const mockRepository = () => ({
  find: jest.fn(),
  findOneBy: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
});

jest.mock('graphql-subscriptions', () => {
  return {
    PubSub: jest.fn().mockImplementation(() => ({
      publish: jest.fn(),
    })),
  };
});

type mockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

describe('RestaurantService', () => {
  let service: OrderService;
  let orderRepository: mockRepository<Order>;
  let restaurantRepository: mockRepository<Restaurant>;
  let dishRepository: mockRepository<Dish>;
  let orderItemRepository: mockRepository<OrderItem>;
  let pubSub: PubSub;
  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        OrderService,
        {
          provide: getRepositoryToken(Order),
          useValue: mockRepository(),
        },
        {
          provide: getRepositoryToken(Restaurant),
          useValue: mockRepository(),
        },
        {
          provide: getRepositoryToken(Dish),
          useValue: mockRepository(),
        },
        {
          provide: getRepositoryToken(OrderItem),
          useValue: mockRepository(),
        },
        {
          provide: getRepositoryToken(Order),
          useValue: mockRepository(),
        },
        {
          provide: PUB_SUB,
          useValue: new PubSub(),
        },
      ],
    }).compile();
    service = module.get<OrderService>(OrderService);
    orderRepository = module.get(getRepositoryToken(Order));
    restaurantRepository = module.get(getRepositoryToken(Restaurant));
    dishRepository = module.get(getRepositoryToken(Dish));
    orderItemRepository = module.get(getRepositoryToken(OrderItem));
    pubSub = module.get<PubSub>(PUB_SUB);
  });

  const customerArgs = {
    id: 1,
    email: '',
    role: UserRole.Client,
    verified: true,
  } as User;

  const restaurantArgs = {
    id: 1,
    name: '',
    coverImg: '',
    address: '',
  };

  const dishArgs = {
    name: '',
    price: 1000,
    description: '',
    restaurantId: 1,
    options: [
      {
        name: 'name1',
        extra: 4,
      },
      {
        name: 'name2',
        choices: [
          {
            name: 'choice1',
            extra: 30,
          },
          {
            name: 'choice2',
            extra: 200,
          },
        ],
      },
    ],
  };

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createOrder', () => {
    const createOrderItemArgs = [
      {
        dishId: 1,
        options: [
          {
            name: 'name1',
          },
        ],
      },
      {
        dishId: 2,
        options: [
          {
            name: 'name2',
            choice: 'choice1',
          },
          {
            name: 'name2',
            choice: 'choice2',
          },
        ],
      },
    ];

    const createOrderArgs = {
      restaurantId: restaurantArgs.id,
      items: createOrderItemArgs,
    };

    it('should fail if restaurant not found', async () => {
      restaurantRepository.findOneBy.mockResolvedValue(undefined);
      const result = await service.createOrder(customerArgs, createOrderArgs);

      expect(restaurantRepository.findOneBy).toHaveBeenCalledTimes(1);
      expect(restaurantRepository.findOneBy).toHaveBeenCalledWith({
        id: createOrderArgs.restaurantId,
      });
      expect(result).toEqual({
        ok: false,
        error: 'Restaurant not found',
      });
    });

    it('should fail if dish not found', async () => {
      restaurantRepository.findOneBy.mockResolvedValue(restaurantArgs);
      dishRepository.findOneBy.mockResolvedValue(undefined);
      const result = await service.createOrder(customerArgs, createOrderArgs);

      expect(dishRepository.findOneBy).toHaveBeenCalledTimes(1);

      expect(dishRepository.findOneBy).toHaveBeenCalledWith({
        id: createOrderItemArgs[0].dishId,
      });

      expect(result).toEqual({
        ok: false,
        error: 'Dish not found',
      });
    });

    it('should fail if someone order dish from another restaurant', async () => {
      const otherRestaurantDishArgs = {
        name: '',
        price: 1000,
        description: '',
        restaurantId: 2,
      };
      restaurantRepository.findOneBy.mockResolvedValue(restaurantArgs);
      dishRepository.findOneBy.mockResolvedValue(otherRestaurantDishArgs);
      const result = await service.createOrder(customerArgs, createOrderArgs);

      expect(result).toEqual({
        ok: false,
        error: 'Dish is not belong this restaurant',
      });
    });

    it('should create order', async () => {
      const orderItems = createOrderArgs.items.map((item) => ({
        dishArgs,
        options: item.options,
      }));
      restaurantRepository.findOneBy.mockResolvedValue(restaurantArgs);
      dishRepository.findOneBy.mockResolvedValue(dishArgs);
      createOrderArgs.items.forEach((item) => {
        orderItemRepository.create.mockReturnValueOnce({
          dishArgs,
          options: item.options,
        });
      });
      createOrderArgs.items.forEach((item) => {
        orderItemRepository.save.mockResolvedValueOnce({
          dishArgs,
          options: item.options,
        });
      });
      orderRepository.create.mockReturnValue({
        customerArgs,
        restaurantArgs,
        total: orderItems.reduce((sum) => sum + dishArgs.price, 0),
        items: orderItems,
      });
      const result = await service.createOrder(customerArgs, createOrderArgs);

      expect(result).toEqual({
        ok: true,
      });
    });

    it('should fail on exception', async () => {
      restaurantRepository.findOneBy.mockRejectedValue(new Error());
      const result = await service.createOrder(customerArgs, createOrderArgs);

      expect(result).toEqual({
        ok: false,
        error: 'Could not create order',
      });
    });
  });
  it.todo('getOrders');
  it.todo('getOrder');
  it.todo('editOrder');
  it.todo('takeOrder');
});
