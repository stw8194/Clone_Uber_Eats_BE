import { Test } from '@nestjs/testing';
import { PaymentService } from './payments.service';
import { Payment } from './entities/payment.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RestaurantRepository } from 'src/restaurants/repositories/restaurant.repository';
import { LessThan, Repository } from 'typeorm';
import { User, UserRole } from 'src/users/entities/user.entity';
import { Restaurant } from 'src/restaurants/entities/restaurant.entity';

const mockRepository = () => ({
  findBy: jest.fn(),
  findAndCheck: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
});

type mockCustumRepository<T = any> = Partial<Record<keyof T, jest.Mock>>;
type mockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

describe('PaymentService', () => {
  let service: PaymentService;
  let paymentRepository: mockRepository<Payment>;
  let restaurantRepository: mockCustumRepository<RestaurantRepository>;
  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        PaymentService,
        {
          provide: getRepositoryToken(Payment),
          useValue: mockRepository(),
        },
        {
          provide: getRepositoryToken(RestaurantRepository),
          useValue: mockRepository(),
        },
      ],
    }).compile();
    service = module.get<PaymentService>(PaymentService);
    paymentRepository = module.get(getRepositoryToken(Payment));
    restaurantRepository = module.get(getRepositoryToken(RestaurantRepository));

    jest.useFakeTimers().setSystemTime(new Date('2024-01-01T12:00:00Z'));
  });

  const ownerArgs = {
    id: 1,
    email: '',
    role: UserRole.Owner,
    verified: true,
  } as User;

  const restaurantArgs = new Restaurant();
  restaurantArgs.id = 1;
  restaurantArgs.name = '';
  restaurantArgs.coverImg = '';
  restaurantArgs.address = '';
  restaurantArgs.ownerId = 1;

  const paymentsArgs = [
    {
      id: 1,
      transactionId: 'test1',
      userId: 1,
      restaurantId: 1,
    },
    {
      id: 2,
      transactionId: 'test2',
      userId: 1,
      restaurantId: 1,
    },
    {
      id: 3,
      transactionId: 'test3',
      userId: 1,
      restaurantId: 1,
    },
  ];

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createPayment', () => {
    const createPaymentArgs = {
      transactionId: 'test',
      restaurantId: 1,
    };
    it('should fail if restaurant is not instance of Restaurant', async () => {
      restaurantRepository.findAndCheck.mockResolvedValue({
        ok: false,
        error: 'error',
      });
      const result = await service.createPayment(ownerArgs, createPaymentArgs);

      expect(restaurantRepository.findAndCheck).toHaveBeenCalledTimes(1);
      expect(restaurantRepository.findAndCheck).toHaveBeenCalledWith(
        restaurantArgs.id,
        ownerArgs,
      );
      expect(result).toEqual({
        ok: false,
        error: 'error',
      });
    });

    it('should create payment', async () => {
      restaurantRepository.findAndCheck.mockResolvedValue(restaurantArgs);
      paymentRepository.create.mockReturnValue({
        transactionId: createPaymentArgs.transactionId,
        user: ownerArgs,
        restaurant: restaurantArgs,
      });
      restaurantArgs.promtedUntil = new Date('2024-01-08T12:00:00Z');
      restaurantArgs.isPromoted = true;
      const result = await service.createPayment(ownerArgs, createPaymentArgs);

      expect(restaurantRepository.save).toHaveBeenCalledTimes(1);
      expect(restaurantRepository.save).toHaveBeenCalledWith(restaurantArgs);
      expect(paymentRepository.create).toHaveBeenCalledTimes(1);
      expect(paymentRepository.create).toHaveBeenCalledWith({
        transactionId: createPaymentArgs.transactionId,
        user: ownerArgs,
        restaurant: restaurantArgs,
      });
      expect(paymentRepository.save).toHaveBeenCalledTimes(1);
      expect(paymentRepository.save).toHaveBeenCalledWith({
        transactionId: createPaymentArgs.transactionId,
        user: ownerArgs,
        restaurant: restaurantArgs,
      });
      expect(result).toEqual({
        ok: true,
      });
    });

    it('fail on exception', async () => {
      restaurantRepository.findAndCheck.mockRejectedValue(new Error());
      const result = await service.createPayment(ownerArgs, createPaymentArgs);

      expect(result).toEqual({
        ok: false,
        error: 'Could not create payment',
      });
    });
  });

  describe('getPayments', () => {
    it('should fail if payments not found', async () => {
      paymentRepository.findBy.mockResolvedValue(undefined);
      const result = await service.getPayments(ownerArgs);

      expect(paymentRepository.findBy).toHaveBeenCalledTimes(1);
      expect(paymentRepository.findBy).toHaveBeenCalledWith({
        user: { id: ownerArgs.id },
      });
      expect(result).toEqual({
        ok: false,
        error: 'Payments not found',
      });
    });

    it('should get payments', async () => {
      paymentRepository.findBy.mockResolvedValue(paymentsArgs);
      const result = await service.getPayments(ownerArgs);

      expect(result).toEqual({
        ok: true,
        payments: paymentsArgs,
      });
    });

    it('fail on exception', async () => {
      paymentRepository.findBy.mockRejectedValue(new Error());
      const result = await service.getPayments(ownerArgs);

      expect(result).toEqual({
        ok: false,
        error: 'Could not get payments',
      });
    });
  });

  describe('checkPromtedRestaurants', () => {
    const expiredRestaurantsArgs = [
      {
        id: 2,
        name: 'exRestaurant1',
        coverImg: '',
        address: '',
        ownerId: '',
        isPromoted: true,
        promtedUntil: new Date('2023-01-01T12:00:00Z'),
      },
      {
        id: 3,
        name: 'exRestaurant2',
        coverImg: '',
        address: '',
        ownerId: '',
        isPromoted: true,
        promtedUntil: new Date('2023-01-01T12:00:00Z'),
      },
    ];

    it('should not stop promoting if the specified date is later than the present', async () => {
      restaurantRepository.findBy.mockResolvedValue(undefined);
      await service.checkPromtedRestaurants();

      expect(restaurantRepository.save).toHaveBeenCalledTimes(0);
    });

    it('should stop promoting if the specified date is earlier than the present', async () => {
      restaurantRepository.findBy.mockResolvedValue(expiredRestaurantsArgs);
      await service.checkPromtedRestaurants();

      expect(restaurantRepository.findBy).toHaveBeenCalledTimes(1);
      expect(restaurantRepository.findBy).toHaveBeenCalledWith({
        isPromoted: true,
        promtedUntil: LessThan(new Date()),
      });
      expect(restaurantRepository.save).toHaveBeenCalledTimes(2);
      expect(restaurantRepository.save).toHaveBeenNthCalledWith(
        1,
        expiredRestaurantsArgs[0],
      );
      expect(restaurantRepository.save).toHaveBeenNthCalledWith(
        2,
        expiredRestaurantsArgs[1],
      );
    });
  });
});
