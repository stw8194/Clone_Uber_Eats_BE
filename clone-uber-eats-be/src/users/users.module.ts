import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserResolver } from './users.resolver';
import { UserService } from './users.service';
import { Verification } from './entities/verification.entity';
import { Address } from './entities/address.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Verification, Address])],
  providers: [UserResolver, UserService],
  exports: [UserService],
})
export class UsersModule {}
