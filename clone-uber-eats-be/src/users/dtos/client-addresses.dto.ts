import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { Address } from '../entities/address.entity';
import { CoreOutput } from 'src/common/dtos/output.dto';

@InputType()
export class ClientAddressesInput {}

@ObjectType()
export class ClientAddressesOutput extends CoreOutput {
  @Field((type) => [Address], { nullable: true })
  addresses?: Address[];
}
