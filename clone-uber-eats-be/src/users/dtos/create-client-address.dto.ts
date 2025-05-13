import { Field, InputType, ObjectType, PickType } from '@nestjs/graphql';
import { CoreOutput } from 'src/common/dtos/output.dto';
import { Address } from '../entities/address.entity';

@InputType()
export class CreateClientAddressInput extends PickType(Address, [
  'address',
  'lat',
  'lng',
]) {}

@ObjectType()
export class CreateClientAddressOutput extends CoreOutput {
  @Field((type) => Number, { nullable: true })
  addressId?: number;

  @Field((type) => String, { nullable: true })
  address?: string;

  @Field((type) => Number, { nullable: true })
  lat?: number;

  @Field((type) => Number, { nullable: true })
  lng?: number;
}
