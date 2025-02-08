import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { User } from './entities/user.entity';
import { UserService } from './users.service';
import {
  CreateAccountInput,
  CreateAccountOutput,
} from './dtos/create-account.dto';
import { LoginInput, LoginOutput } from './dtos/login.dto';
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import { AuthUser } from 'src/auth/auth-user.decorator';
import { UserProfileInput, UserProfileOutput } from './dtos/user-profile.dot';
import { EditProfileInput, EditProfileOutput } from './dtos/edit-profile.dto';

@Resolver((of) => User)
export class UsersResolver {
  constructor(private readonly userService: UserService) {}

  @Mutation((returns) => CreateAccountOutput)
  async createAccount(
    @Args('input') createAccountInput: CreateAccountInput,
  ): Promise<CreateAccountOutput> {
    try {
      return this.userService.createAccount(createAccountInput);
    } catch (error) {
      return {
        ok: false,
        error,
      };
    }
  }

  @Mutation((returns) => LoginOutput)
  async login(@Args('input') loginInput: LoginInput): Promise<LoginOutput> {
    try {
      return this.userService.login(loginInput);
    } catch (error) {
      return {
        ok: false,
        error,
      };
    }
  }

  @Query((returns) => User)
  @UseGuards(AuthGuard)
  me(@AuthUser() loggedInUser: User) {
    return loggedInUser;
  }

  @Query((returns) => UserProfileOutput)
  @UseGuards(AuthGuard)
  async userProfile(
    @Args() userProfileInput: UserProfileInput,
  ): Promise<UserProfileOutput> {
    try {
      const user = await this.userService.findById(userProfileInput.userId);
      if (!user) {
        throw Error();
      }
      return {
        ok: true,
        user,
      };
    } catch (error) {
      return {
        error: 'User Not Found',
        ok: false,
      };
    }
  }

  @Mutation((returns) => EditProfileOutput)
  @UseGuards(AuthGuard)
  async editProfile(
    @AuthUser() loggedInUser: User,
    @Args('input') editProfileInput: EditProfileInput,
  ): Promise<EditProfileOutput> {
    try {
      await this.userService.editProfile(loggedInUser.id, editProfileInput);
      return {
        ok: true,
      };
    } catch (error) {
      return {
        ok: false,
        error,
      };
    }
  }
}
