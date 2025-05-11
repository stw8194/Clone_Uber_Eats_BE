import { Field, InputType, ObjectType } from '@nestjs/graphql';
import {
  PaginationInput,
  PaginationOutput,
} from 'src/common/dtos/pagination.dto';
import { Address } from '../entities/address.entity';

@InputType()
export class ClientAddressesInput extends PaginationInput {}

@ObjectType()
export class ClientAddressesOutput extends PaginationOutput {
  @Field((type) => [Address], { nullable: true })
  addresses?: Address[];
}
