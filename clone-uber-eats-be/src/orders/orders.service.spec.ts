import { Repository } from 'typeorm';
import { OrderService } from './orders.service';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Order, OrderStatus } from './entities/order.entity';
import { Restaurant } from 'src/restaurants/entities/restaurant.entity';
import { Dish } from 'src/restaurants/entities/dish.entity';
import { OrderItem } from './entities/order-item.entity';
import { User, UserRole } from 'src/users/entities/user.entity';
import { PubSub } from 'graphql-subscriptions';
import {
  NEW_COOKED_ORDER,
  NEW_ORDER_UPDATES,
  NEW_PENDING_ORDER,
  PUB_SUB,
} from 'src/common/common.constants';

const mockRepository = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
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

  const otherCustomerArgs = {
    id: 4,
    role: UserRole.Client,
  } as User;

  const driverArgs = {
    id: 2,
    email: '',
    role: UserRole.Delivery,
    verified: true,
  } as User;

  const ownerArgs = {
    id: 3,
    email: '',
    role: UserRole.Owner,
    verified: true,
  } as User;

  const dishArgs = {
    id: 1,
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
      {
        name: 'name3',
      },
    ],
  };

  const ordersArgs = [
    {
      id: 1,
      customer: customerArgs,
      customerId: customerArgs.id,
      driver: driverArgs,
      driverId: driverArgs.id,
      total: 1234,
      status: OrderStatus.Pending,
    },
    {
      id: 2,
      customer: customerArgs,
      customerId: customerArgs.id,
      driver: driverArgs,
      driverId: driverArgs.id,
      total: 1234,
      status: OrderStatus.Pending,
    },
    {
      id: 3,
      customer: customerArgs,
      customerId: customerArgs.id,
      driver: driverArgs,
      driverId: driverArgs.id,
      total: 1234,
      status: OrderStatus.Cooked,
    },
  ];

  const restaurantArgs = {
    id: 1,
    name: '',
    coverImg: '',
    address: '',
    orders: ordersArgs,
    owner: ownerArgs,
    ownerId: 3,
  };

  const orderArgs = {
    id: 1,
    customer: customerArgs,
    customerId: customerArgs.id,
    driver: driverArgs,
    driverId: driverArgs.id,
    total: 1234,
    status: OrderStatus.Pending,
    restaurant: restaurantArgs,
  };

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createOrder', () => {
    const createOrderItemArgs = [
      {
        dishId: 1,
      },
      {
        dishId: 1,
        options: [
          {
            name: 'name1',
          },
          {
            name: 'name2',
            choice: 'choice2',
          },
          {
            name: 'name3',
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
      const order = {
        customerArgs,
        restaurantArgs,
        total: orderItems.reduce((sum) => sum + dishArgs.price, 0),
        items: orderItems,
      };
      orderRepository.create.mockReturnValue(order);
      orderRepository.save.mockResolvedValue(order);
      const result = await service.createOrder(customerArgs, createOrderArgs);

      expect(pubSub.publish).toHaveBeenCalledTimes(1);
      expect(pubSub.publish).toHaveBeenCalledWith(NEW_PENDING_ORDER, {
        pendingOrders: {
          order,
          ownerId: restaurantArgs.ownerId,
        },
      });
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

  describe('getOrders', () => {
    const getOrdersArgs = {
      status: OrderStatus.Pending,
    };
    it('should get orders with same status', async () => {
      restaurantRepository.find.mockResolvedValue([restaurantArgs]);
      const result = await service.getOrders(ownerArgs, {
        status: getOrdersArgs.status,
      });

      expect(restaurantRepository.find).toHaveBeenCalledTimes(1);
      expect(restaurantRepository.find).toHaveBeenCalledWith({
        where: {
          owner: { id: ownerArgs.id },
        },
        relations: ['orders'],
      });
      expect(result).toEqual({
        ok: true,
        orders: ordersArgs.slice(0, 2),
      });
    });

    it('should get orders when user is client', async () => {
      orderRepository.find.mockResolvedValue(ordersArgs);
      const result = await service.getOrders(customerArgs, {
        status: undefined,
      });

      expect(orderRepository.find).toHaveBeenCalledTimes(1);
      expect(orderRepository.find).toHaveBeenCalledWith({
        where: {
          customer: customerArgs,
          status: undefined,
        },
      });
      expect(result).toEqual({
        ok: true,
        orders: ordersArgs,
      });
    });

    it('should get orders when user is delivery', async () => {
      orderRepository.find.mockResolvedValue(ordersArgs);
      const result = await service.getOrders(driverArgs, {
        status: undefined,
      });

      expect(orderRepository.find).toHaveBeenCalledTimes(1);
      expect(orderRepository.find).toHaveBeenCalledWith({
        where: {
          driver: driverArgs,
          status: undefined,
        },
      });
      expect(result).toEqual({
        ok: true,
        orders: ordersArgs,
      });
    });

    it('should get orders when user is owner', async () => {
      restaurantRepository.find.mockResolvedValue([restaurantArgs]);
      const result = await service.getOrders(ownerArgs, {
        status: undefined,
      });

      expect(restaurantRepository.find).toHaveBeenCalledTimes(1);
      expect(restaurantRepository.find).toHaveBeenCalledWith({
        where: {
          owner: { id: ownerArgs.id },
        },
        relations: ['orders'],
      });
      expect(result).toEqual({
        ok: true,
        orders: ordersArgs,
      });
    });

    it('fail on exception', async () => {
      orderRepository.find.mockRejectedValue(new Error());
      const result = await service.getOrders(customerArgs, {
        status: undefined,
      });

      expect(result).toEqual({
        ok: false,
        error: 'Could not get orders',
      });
    });
  });

  describe('canSeeOrder', () => {
    const cases = [
      { allowed: true, user: customerArgs },
      { allowed: false, user: { id: 99, role: UserRole.Client } as User },
      { allowed: true, user: driverArgs },
      { allowed: false, user: { id: 99, role: UserRole.Delivery } as User },
      { allowed: true, user: ownerArgs },
      { allowed: false, user: { id: 99, role: UserRole.Owner } as User },
    ];
    it.each(cases)(
      'should return $allowed for $user.role',
      ({ allowed, user }) => {
        expect(service.canSeeOrder(user, orderArgs as Order)).toBe(allowed);
      },
    );
  });

  describe('getOrder', () => {
    it('should fail if order not found', async () => {
      orderRepository.findOne.mockResolvedValue(undefined);
      const result = await service.getOrder(customerArgs, {
        id: orderArgs.id,
      });

      expect(orderRepository.findOne).toHaveBeenCalledTimes(1);
      expect(orderRepository.findOne).toHaveBeenCalledWith({
        where: { id: orderArgs.id },
        relations: ['restaurant'],
      });
      expect(result).toEqual({
        ok: false,
        error: 'Order not found',
      });
    });

    it('should fail if user have no authority', async () => {
      orderRepository.findOne.mockResolvedValue(orderArgs);
      const result = await service.getOrder(otherCustomerArgs, {
        id: orderArgs.id,
      });
      expect(result).toEqual({
        ok: false,
        error: 'You cannot see that',
      });
    });

    it('should get order', async () => {
      orderRepository.findOne.mockResolvedValue(orderArgs);
      const result = await service.getOrder(customerArgs, {
        id: orderArgs.id,
      });

      expect(result).toEqual({
        ok: true,
        order: orderArgs,
      });
    });

    it('fail on exception', async () => {
      orderRepository.findOne.mockRejectedValue(new Error());
      const result = await service.getOrder(customerArgs, {
        id: orderArgs.id,
      });
      expect(result).toEqual({
        ok: false,
        error: 'Could not get order',
      });
    });
  });

  describe('editOrder', () => {
    const ownerEditOrderArgs = {
      id: orderArgs.id,
      status: OrderStatus.Cooked,
    };
    const deliveryEditOrderArgs = {
      id: orderArgs.id,
      status: OrderStatus.PickedUp,
    };
    it('should fail if order not found', async () => {
      orderRepository.findOneBy.mockResolvedValue(undefined);
      const result = await service.editOrder(ownerArgs, ownerEditOrderArgs);

      expect(result).toEqual({
        ok: false,
        error: 'Order not found',
      });
    });

    it('should fail if user have no authority to see order', async () => {
      orderRepository.findOneBy.mockResolvedValue(orderArgs);
      const result = await service.editOrder(
        otherCustomerArgs,
        ownerEditOrderArgs,
      );

      expect(result).toEqual({
        ok: false,
        error: 'You cannot see that',
      });
    });

    let cases = [
      {
        user: ownerArgs,
        editArgs: deliveryEditOrderArgs,
        syntax: 'Cooking or Cooked',
      },
      {
        user: driverArgs,
        editArgs: ownerEditOrderArgs,
        syntax: 'PickedUp or Delivered',
      },
    ];

    it.each(cases)(
      'should fail if $user.role try to change status except $syntax',
      async ({ user, editArgs, syntax }) => {
        orderRepository.findOneBy.mockResolvedValue(orderArgs);
        const result = await service.editOrder(user, editArgs);

        expect(result).toEqual({
          ok: false,
          error: 'You cannot do that',
        });
      },
    );

    cases = [
      {
        user: ownerArgs,
        editArgs: ownerEditOrderArgs,
        syntax: 'Cooking or Cooked',
      },
      {
        user: driverArgs,
        editArgs: deliveryEditOrderArgs,
        syntax: 'PickedUp or Delivered',
      },
    ];

    it.each(cases)(
      'should edit order if $user.role try to change status $syntax',
      async ({ user, editArgs, syntax }) => {
        orderRepository.findOneBy.mockResolvedValue(orderArgs);
        const result = await service.editOrder(user, editArgs);

        expect(orderRepository.save).toHaveBeenCalledTimes(1);
        expect(orderRepository.save).toHaveBeenCalledWith(editArgs);
        if (user.role === UserRole.Owner) {
          if (editArgs.status === OrderStatus.Cooked) {
            expect(pubSub.publish).toHaveBeenCalledTimes(2);
            expect(pubSub.publish).toHaveBeenCalledWith(NEW_COOKED_ORDER, {
              cookedOrders: { ...orderArgs, status: editArgs.status },
            });
          }
        } else {
          expect(pubSub.publish).toHaveBeenCalledTimes(1);
          expect(pubSub.publish).toHaveBeenCalledWith(NEW_ORDER_UPDATES, {
            orderUpdates: { ...orderArgs, status: editArgs.status },
          });
        }

        expect(result).toEqual({
          ok: true,
        });
      },
    );

    it('fail on exception', async () => {
      orderRepository.findOneBy.mockRejectedValue(new Error());
      const result = await service.editOrder(ownerArgs, ownerEditOrderArgs);

      expect(result).toEqual({
        ok: false,
        error: 'Could not edit order',
      });
    });
  });

  describe('takeOrder', () => {
    const orderWithoutDriverArgs = {
      id: 4,
      customer: customerArgs,
      customerId: customerArgs.id,
      total: 1234,
      status: OrderStatus.Pending,
      restaurant: restaurantArgs,
    };
    it('should fail if order not found', async () => {
      orderRepository.findOneBy.mockResolvedValue(undefined);
      const result = await service.takeOrder(driverArgs, { id: orderArgs.id });

      expect(orderRepository.findOneBy).toHaveBeenCalledTimes(1);
      expect(orderRepository.findOneBy).toHaveBeenCalledWith({
        id: orderArgs.id,
      });
      expect(result).toEqual({
        ok: false,
        error: 'Order not found',
      });
    });

    it('should fail if order alreay has driver', async () => {
      orderRepository.findOneBy.mockResolvedValue(orderArgs);
      const result = await service.takeOrder(driverArgs, { id: orderArgs.id });

      expect(result).toEqual({
        ok: false,
        error: 'This order already has a driver',
      });
    });

    it('should take order', async () => {
      orderRepository.findOneBy.mockResolvedValue(orderWithoutDriverArgs);
      const result = await service.takeOrder(driverArgs, {
        id: orderWithoutDriverArgs.id,
      });

      expect(orderRepository.save).toHaveBeenCalledTimes(1);
      expect(orderRepository.save).toHaveBeenCalledWith({
        id: orderWithoutDriverArgs.id,
        driver: driverArgs,
      });
      expect(pubSub.publish).toHaveBeenCalledTimes(1);
      expect(pubSub.publish).toHaveBeenCalledWith(NEW_ORDER_UPDATES, {
        orderUpdates: { ...orderWithoutDriverArgs, driver: driverArgs },
      });
      expect(result).toEqual({
        ok: true,
      });
    });

    it('fail on exception', async () => {
      orderRepository.findOneBy.mockRejectedValue(new Error());
      const result = await service.takeOrder(driverArgs, {
        id: orderWithoutDriverArgs.id,
      });

      expect(result).toEqual({
        ok: false,
        error: 'Could not take order',
      });
    });
  });
});
