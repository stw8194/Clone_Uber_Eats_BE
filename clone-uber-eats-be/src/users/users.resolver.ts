import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { User } from './entities/user.entity';
import { UserService } from './users.service';
import {
  CreateAccountInput,
  CreateAccountOutput,
} from './dtos/create-account.dto';
import { LoginInput, LoginOutput } from './dtos/login.dto';
import { AuthUser } from 'src/auth/auth-user.decorator';
import { UserProfileInput, UserProfileOutput } from './dtos/user-profile.dto';
import { EditProfileInput, EditProfileOutput } from './dtos/edit-profile.dto';
import { VerifyEmailInput, VerifyEmailOutput } from './dtos/verify-email.dto';
import { Role } from 'src/auth/role.decorator';
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

@Resolver((of) => User)
export class UserResolver {
  constructor(private readonly userService: UserService) {}

  @Mutation((returns) => CreateAccountOutput)
  createAccount(
    @Args('input') createAccountInput: CreateAccountInput,
  ): Promise<CreateAccountOutput> {
    return this.userService.createAccount(createAccountInput);
  }

  @Mutation((returns) => LoginOutput)
  login(@Args('input') loginInput: LoginInput): Promise<LoginOutput> {
    return this.userService.login(loginInput);
  }

  @Query((returns) => User)
  @Role(['Any'])
  me(@AuthUser() user: User): User {
    return user;
  }

  @Query((returns) => UserProfileOutput)
  @Role(['Any'])
  userProfile(
    @Args() userProfileInput: UserProfileInput,
  ): Promise<UserProfileOutput> {
    return this.userService.findById(userProfileInput);
  }

  @Mutation((returns) => EditProfileOutput)
  @Role(['Any'])
  editProfile(
    @AuthUser() user: User,
    @Args('input') editProfileInput: EditProfileInput,
  ): Promise<EditProfileOutput> {
    return this.userService.editProfile(user.id, editProfileInput);
  }

  @Mutation((returns) => VerifyEmailOutput)
  verifyEmail(
    @Args('input') { code }: VerifyEmailInput,
  ): Promise<VerifyEmailOutput> {
    return this.userService.verifyEmail(code);
  }

  @Mutation((returns) => CreateClientAddressOutput)
  @Role(['Client'])
  createClientAddress(
    @AuthUser() client: User,
    @Args('input') createclientAddressInput: CreateClientAddressInput,
  ): Promise<CreateClientAddressOutput> {
    return this.userService.addAddress(client, createclientAddressInput);
  }

  @Query((returns) => ClientAddressesOutput)
  @Role(['Client'])
  clientAddresses(
    @AuthUser() client: User,
    @Args('input') clientAddressesInput: ClientAddressesInput,
  ): Promise<ClientAddressesOutput> {
    return this.userService.clientAddresses(client, clientAddressesInput);
  }

  @Mutation((returns) => DeleteClientAddressOutput)
  @Role(['Client'])
  deleteClientAddress(
    @AuthUser() client: User,
    @Args('input') deleteClientAddressInput: DeleteClientAddressInput,
  ): Promise<DeleteClientAddressOutput> {
    return this.userService.deleteAddress(client, deleteClientAddressInput);
  }
}
