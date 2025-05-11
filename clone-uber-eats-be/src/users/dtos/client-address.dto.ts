import { Field, InputType, ObjectType, PickType } from '@nestjs/graphql';
import { CoreOutput } from 'src/common/dtos/output.dto';
import { Address } from '../entities/address.entity';

@InputType()
export class AddClientAddressInput extends PickType(Address, [
  'address',
  'lat',
  'lng',
]) {}

@ObjectType()
export class AddClientAddressOutput extends CoreOutput {
  @Field((type) => Number, { nullable: true })
  addressId?: number;
}
