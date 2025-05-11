import { Test } from '@nestjs/testing';
import { UserService } from './users.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User, UserRole } from './entities/user.entity';
import { Verification } from './entities/verification.entity';
import { JwtService } from 'src/jwt/jwt.service';
import { MailService } from 'src/mail/mail.service';
import { Repository } from 'typeorm';
import { Address } from './entities/address.entity';

const mockRepository = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findOneBy: jest.fn(),
  findOneByOrFail: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  delete: jest.fn(),
  countBy: jest.fn(),
});

const addressArgs = {
  lat: 37.123,
  lng: 123.456,
  address: '',
};

const mockJwtService = {
  sign: jest.fn(() => 'signed-token'),
  verify: jest.fn(),
};

const mockMailService = {
  sendVerificationEmail: jest.fn(),
};

type mockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

describe('UserService', () => {
  let service: UserService;
  let mailService: MailService;
  let jwtService: JwtService;
  let userRepository: mockRepository<User>;
  let verificationRepository: mockRepository<Verification>;
  let addressRepository: mockRepository<Address>;
  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository(),
        },
        {
          provide: getRepositoryToken(Verification),
          useValue: mockRepository(),
        },
        {
          provide: getRepositoryToken(Address),
          useValue: mockRepository(),
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: MailService,
          useValue: mockMailService,
        },
      ],
    }).compile();
    service = module.get<UserService>(UserService);
    mailService = module.get<MailService>(MailService);
    jwtService = module.get<JwtService>(JwtService);
    userRepository = module.get(getRepositoryToken(User));
    verificationRepository = module.get(getRepositoryToken(Verification));
    addressRepository = module.get(getRepositoryToken(Address));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createAccount', () => {
    const createAccountArgs = {
      email: '',
      password: '',
      role: UserRole.Client,
    };
    it('should fail if user exists', async () => {
      userRepository.findOneBy.mockResolvedValue({
        id: 1,
        email: '',
      });
      const result = await service.createAccount(createAccountArgs);
      expect(result).toMatchObject({
        ok: false,
        error: 'There is a user with that email already',
      });
    });

    it('should create a new user', async () => {
      userRepository.findOneBy.mockResolvedValue(undefined);
      userRepository.create.mockReturnValue(createAccountArgs);
      userRepository.save.mockResolvedValue(createAccountArgs);
      verificationRepository.create.mockReturnValue(createAccountArgs);
      verificationRepository.save.mockResolvedValue({ code: 'code' });
      const result = await service.createAccount(createAccountArgs);
      expect(userRepository.create).toHaveBeenCalledTimes(1);
      expect(userRepository.create).toHaveBeenCalledWith(createAccountArgs);
      expect(userRepository.save).toHaveBeenCalledTimes(1);
      expect(userRepository.save).toHaveBeenCalledWith(createAccountArgs);
      expect(verificationRepository.create).toHaveBeenCalledTimes(1);
      expect(verificationRepository.create).toHaveBeenCalledWith({
        user: createAccountArgs,
      });
      expect(verificationRepository.save).toHaveBeenCalledTimes(1);
      expect(verificationRepository.save).toHaveBeenCalledWith(
        createAccountArgs,
      );
      expect(mailService.sendVerificationEmail).toHaveBeenCalledTimes(1);
      expect(mailService.sendVerificationEmail).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
      );
      expect(result).toEqual({ ok: true });
    });

    it('should fail on exception', async () => {
      userRepository.findOneBy.mockRejectedValue(new Error());
      const result = await service.createAccount(createAccountArgs);
      expect(result).toEqual({ ok: false, error: "Couldn't create account" });
    });
  });

  describe('login', () => {
    const loginArgs = { email: '', password: '' };
    it('should fail if user does not exist', async () => {
      userRepository.findOne.mockResolvedValue(undefined);

      const result = await service.login(loginArgs);

      expect(userRepository.findOne).toHaveBeenCalledTimes(1);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: expect.any(Object),
        select: expect.any(Array),
      });
      expect(result).toEqual({
        ok: false,
        error: 'User not found',
      });
    });

    it('should fail if the password is wrong', async () => {
      const mockedUser = {
        checkPassword: jest.fn(() => Promise.resolve(false)),
      };
      userRepository.findOne.mockResolvedValue(mockedUser);
      const result = await service.login(loginArgs);
      expect(result).toEqual({ ok: false, error: 'Wrong password' });
    });

    it('should return token if password correct', async () => {
      const mockedUser = {
        id: 1,
        checkPassword: jest.fn(() => Promise.resolve(true)),
      };
      userRepository.findOne.mockResolvedValue(mockedUser);
      const result = await service.login(loginArgs);
      expect(jwtService.sign).toHaveBeenCalledTimes(1);
      expect(jwtService.sign).toHaveBeenCalledWith(expect.any(Number));
      expect(result).toEqual({ ok: true, token: 'signed-token' });
    });

    it('should fail on exception', async () => {
      userRepository.findOne.mockRejectedValue(new Error());
      const result = await service.login(loginArgs);
      expect(result).toEqual({ ok: false, error: "Can't log user in" });
    });
  });

  describe('findById', () => {
    const findByIdArgs = {
      id: 1,
    };
    it('should find an existing user', async () => {
      userRepository.findOneByOrFail.mockResolvedValue(findByIdArgs);
      const result = await service.findById({ userId: 1 });
      expect(result).toEqual({
        ok: true,
        user: findByIdArgs,
      });
    });

    it('should fail if no user is found', async () => {
      userRepository.findOneByOrFail.mockRejectedValue(new Error());
      const result = await service.findById({ userId: 1 });
      expect(result).toEqual({ ok: false, error: 'User not Found' });
    });
  });

  describe('editProfile', () => {
    it('should change email', async () => {
      const oldUser = {
        email: 'old',
        verified: true,
      };
      const editProfileArgs = {
        userId: 1,
        input: { email: 'new' },
      };
      const newVerification = {
        code: 'code',
      };
      const newUser = {
        verified: false,
        email: editProfileArgs.input.email,
      };

      userRepository.findOneBy.mockResolvedValue(oldUser);
      verificationRepository.create.mockReturnValue(newVerification);
      verificationRepository.save.mockResolvedValue(newVerification);

      await service.editProfile(editProfileArgs.userId, editProfileArgs.input);
      expect(userRepository.findOneBy).toHaveBeenCalledTimes(1);
      expect(userRepository.findOneBy).toHaveBeenCalledWith({
        id: editProfileArgs.userId,
      });
      expect(verificationRepository.create).toHaveBeenCalledWith({
        user: newUser,
      });
      expect(verificationRepository.save).toHaveBeenCalledWith(newVerification);
      expect(mailService.sendVerificationEmail).toHaveBeenCalledWith(
        newUser.email,
        newVerification.code,
      );
    });

    it('should change password', async () => {
      const editProfileArgs = {
        userId: 1,
        input: { password: 'new' },
      };

      userRepository.findOneBy.mockResolvedValue({ password: 'old' });
      const result = await service.editProfile(
        editProfileArgs.userId,
        editProfileArgs.input,
      );
      expect(userRepository.save).toHaveBeenCalledTimes(1);
      expect(userRepository.save).toHaveBeenCalledWith(editProfileArgs.input);
      expect(result).toEqual({ ok: true });
    });

    it('should fail on expection', async () => {
      userRepository.findOneBy.mockRejectedValue(new Error());
      const result = await service.editProfile(1, { email: '' });
      expect(result).toEqual({ ok: false, error: 'Could not edit profile' });
    });
  });

  describe('verifyEmail', () => {
    it('should verify email', async () => {
      const mockedVerification = {
        id: 1,
        user: {
          verified: false,
        },
      };
      verificationRepository.findOne.mockResolvedValue(mockedVerification);

      const result = await service.verifyEmail('');

      expect(verificationRepository.findOne).toHaveBeenCalledTimes(1);
      expect(verificationRepository.findOne).toHaveBeenCalledWith({
        where: expect.any(Object),
        relations: expect.any(Array),
      });
      expect(userRepository.save).toHaveBeenCalledTimes(1);
      expect(userRepository.save).toHaveBeenCalledWith({ verified: true });
      expect(verificationRepository.delete).toHaveBeenCalledTimes(1);
      expect(verificationRepository.delete).toHaveBeenCalledWith(
        mockedVerification.id,
      );
      expect(result).toEqual({ ok: true });
    });

    it('should fail on verification not found', async () => {
      verificationRepository.findOne.mockResolvedValue(undefined);

      const result = await service.verifyEmail('');

      expect(result).toEqual({ ok: false, error: 'Verification not found' });
    });

    it('should fail on exception', async () => {
      verificationRepository.findOne.mockRejectedValue(new Error());
      const result = await service.verifyEmail('');
      expect(result).toEqual({ ok: false, error: 'Could not verify email' });
    });
  });

  describe('addAddress', () => {
    const clientArgs = {
      email: '',
      password: '',
      role: UserRole.Client,
    } as User;
    it('should add address', async () => {
      addressRepository.create.mockReturnValue({
        ...addressArgs,
      });
      const result = await service.addAddress(clientArgs, addressArgs);

      expect(addressRepository.create).toHaveBeenCalledTimes(1);
      expect(addressRepository.create).toHaveBeenCalledWith({
        client: clientArgs,
        ...addressArgs,
      });
      expect(addressRepository.save).toHaveBeenCalledTimes(1);
      expect(addressRepository.save).toHaveBeenCalledWith({
        ...addressArgs,
      });
      expect(result).toMatchObject({
        ok: true,
      });
    });

    it('should fail on exception', async () => {
      addressRepository.save.mockRejectedValue(new Error());
      const result = await service.addAddress(clientArgs, addressArgs);
      expect(result).toEqual({
        ok: false,
        error: 'Could not add address',
      });
    });
  });

  describe('Addresses', () => {
    const clientArgs = {
      id: 1,
      email: '',
      password: '',
      role: UserRole.Client,
    } as User;
    const paginationArgs = {
      page: 1,
      limit: 1,
    };
    it('should fail if address not found', async () => {
      addressRepository.find.mockResolvedValue(undefined);
      const result = await service.clientAddresses(clientArgs, paginationArgs);

      expect(addressRepository.find).toHaveBeenCalledTimes(1);
      expect(addressRepository.find).toHaveBeenCalledWith({
        where: {
          client: { id: clientArgs.id },
        },
        take: paginationArgs.limit,
        skip: (paginationArgs.page - 1) * paginationArgs.limit,
      });
      expect(result).toEqual({
        ok: false,
        error: 'Addresses not found',
      });
    });

    it('should find addresses', async () => {
      addressRepository.find.mockResolvedValue([addressArgs]);
      addressRepository.countBy.mockResolvedValue(5);
      const result = await service.clientAddresses(clientArgs, paginationArgs);

      expect(result).toEqual({
        ok: true,
        addresses: [addressArgs],
        totalPages: 5,
        totalResults: 5,
      });
    });

    it('should fail on exception', async () => {
      addressRepository.find.mockRejectedValue(new Error());
      const result = await service.clientAddresses(clientArgs, paginationArgs);
      expect(result).toEqual({
        ok: false,
        error: 'Could not find addresses',
      });
    });
  });

  describe('deleteAddress', () => {
    const clientArgs = {
      email: '',
      password: '',
      role: UserRole.Client,
    } as User;
    it('should delete address', async () => {
      addressRepository.delete.mockResolvedValue(addressArgs);
      const result = await service.deleteAddress(clientArgs, { addressId: 1 });

      expect(addressRepository.delete).toHaveBeenCalledTimes(1);
      expect(addressRepository.delete).toHaveBeenCalledWith({
        id: 1,
        client: { id: clientArgs.id },
      });
      expect(result).toMatchObject({
        ok: true,
      });
    });

    it('should fail on exception', async () => {
      addressRepository.delete.mockRejectedValue(new Error());
      const result = await service.deleteAddress(clientArgs, { addressId: 1 });
      expect(result).toEqual({
        ok: false,
        error: 'Could not delete address',
      });
    });
  });
});
