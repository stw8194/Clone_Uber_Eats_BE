import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import {
  CreateAccountInput,
  CreateAccountOutput,
} from './dtos/create-account.dto';
import { LoginInput } from './dtos/login.dto';
import { JwtService } from 'src/jwt/jwt.service';
import { EditProfileInput, EditProfileOutput } from './dtos/edit-profile.dto';
import { Verification } from './entities/verification.entity';
import { VerifyEmailOutput } from './dtos/verify-email.dto';
import { UserProfileInput, UserProfileOutput } from './dtos/user-profile.dto';
import { MailService } from 'src/mail/mail.service';
import { Address } from './entities/address.entity';
import {
  CreateClientAddressInput,
  CreateClientAddressOutput,
} from './dtos/create-client-address.dto';
import {
  ClientAddressesInput,
  ClientAddressesOutput,
} from './dtos/client-addresses.dto';
import {
  DeleteClientAddressInput,
  DeleteClientAddressOutput,
} from './dtos/delete-client-address.dto';
import {
  ChangeSelectedClientAddressInput,
  ChangeSelectedClientAddressOutput,
} from './dtos/change-selected-client-address.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(Verification)
    private readonly verifications: Repository<Verification>,
    @InjectRepository(Address)
    private readonly addresses: Repository<Address>,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  async createAccount({
    email,
    password,
    role,
  }: CreateAccountInput): Promise<CreateAccountOutput> {
    try {
      const exists = await this.users.findOneBy({ email });
      if (exists) {
        return { ok: false, error: 'There is a user with that email already' };
      }
      const user = await this.users.save(
        this.users.create({ email, password, role }),
      );
      const verification = await this.verifications.save(
        this.verifications.create({
          user,
        }),
      );
      this.mailService.sendVerificationEmail(user.email, verification.code);
      return {
        ok: true,
      };
    } catch {
      return {
        ok: false,
        error: "Couldn't create account",
      };
    }
  }

  async login({
    email,
    password,
  }: LoginInput): Promise<{ ok: boolean; error?: string; token?: string }> {
    try {
      const user = await this.users.findOne({
        where: { email },
        select: ['id', 'password'],
      });
      if (!user) {
        return {
          ok: false,
          error: 'User not found',
        };
      }
      const passwordCorrect = await user.checkPassword(password);
      if (!passwordCorrect) {
        return { ok: false, error: 'Wrong password' };
      }
      const token = this.jwtService.sign(user.id);
      return {
        ok: true,
        token,
      };
    } catch {
      return {
        ok: false,
        error: "Can't log user in",
      };
    }
  }

  async findById({ userId }: UserProfileInput): Promise<UserProfileOutput> {
    try {
      const user = await this.users.findOneByOrFail({ id: userId });
      return {
        ok: true,
        user,
      };
    } catch {
      return { ok: false, error: 'User not Found' };
    }
  }

  async editProfile(
    userId: number,
    { email, password }: EditProfileInput,
  ): Promise<EditProfileOutput> {
    try {
      const user = await this.users.findOneBy({ id: userId });
      if (email && user.email !== email) {
        user.email = email;
        user.verified = false;
        await this.verifications.delete({ user: { id: user.id } });
        const verification = await this.verifications.save(
          this.verifications.create({ user }),
        );
        this.mailService.sendVerificationEmail(user.email, verification.code);
      }
      if (password) {
        user.password = password;
      }
      await this.users.save(user);
      return {
        ok: true,
      };
    } catch {
      return {
        ok: false,
        error: 'Could not edit profile',
      };
    }
  }

  async verifyEmail(code: string): Promise<VerifyEmailOutput> {
    try {
      const verification = await this.verifications.findOne({
        where: { code },
        relations: ['user'],
      });
      if (verification) {
        verification.user.verified = true;
        await this.users.save(verification.user);
        await this.verifications.delete(verification.id);
        return { ok: true };
      }
      return {
        ok: false,
        error: 'Verification not found',
      };
    } catch {
      return {
        ok: false,
        error: 'Could not verify email',
      };
    }
  }

  async changeSelectedClientAddress(
    client: User,
    { addressId }: ChangeSelectedClientAddressInput,
  ): Promise<ChangeSelectedClientAddressOutput> {
    try {
      client.selectedAddressId = addressId;
      await this.users.save(client);
      return {
        ok: true,
      };
    } catch {
      return {
        ok: false,
        error: 'Could not change seleted address',
      };
    }
  }

  async addAddress(
    client: User,
    createClientAddressInput: CreateClientAddressInput,
  ): Promise<CreateClientAddressOutput> {
    try {
      const address = this.addresses.create({
        client,
        ...createClientAddressInput,
      });
      await this.addresses.save(address);
      await this.changeSelectedClientAddress(client, { addressId: address.id });
      return {
        ok: true,
        addressId: address.id,
      };
    } catch {
      return {
        ok: false,
        error: 'Could not add address',
      };
    }
  }

  async clientAddresses(
    client: User,
    { page, limit }: ClientAddressesInput,
  ): Promise<ClientAddressesOutput> {
    try {
      const addresses = await this.addresses.find({
        where: {
          client: { id: client.id },
        },
        take: limit,
        skip: (page - 1) * limit,
      });
      if (!addresses) {
        return {
          ok: false,
          error: 'Addresses not found',
        };
      }
      const totalResults = await this.addresses.countBy({
        client: { id: client.id },
      });
      return {
        ok: true,
        addresses,
        totalPages: Math.ceil(totalResults / limit),
        totalResults,
      };
    } catch {
      return {
        ok: false,
        error: 'Could not find addresses',
      };
    }
  }

  async deleteAddress(
    client: User,
    { addressId }: DeleteClientAddressInput,
  ): Promise<DeleteClientAddressOutput> {
    try {
      await this.addresses.delete({ id: addressId, client: { id: client.id } });
      return {
        ok: true,
      };
    } catch {
      return {
        ok: false,
        error: 'Could not delete address',
      };
    }
  }
}
