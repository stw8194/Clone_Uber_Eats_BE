import { InputType, ObjectType, PickType } from '@nestjs/graphql';
import { CoreOutput } from 'src/common/dtos/output.dto';
import { Address } from '../entities/address.entity';

@InputType()
export class CreateClientAddressInput extends PickType(Address, [
  'address',
  'lat',
  'lng',
]) {}

@ObjectType()
export class CreateClientAddressOutput extends CoreOutput {}
