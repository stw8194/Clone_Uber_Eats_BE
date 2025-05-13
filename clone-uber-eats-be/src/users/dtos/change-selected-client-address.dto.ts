import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { CoreOutput } from 'src/common/dtos/output.dto';

@InputType()
export class ChangeSelectedClientAddressInput {
  @Field((type) => Number)
  addressId: number;
}

@ObjectType()
export class ChangeSelectedClientAddressOutput extends CoreOutput {}
