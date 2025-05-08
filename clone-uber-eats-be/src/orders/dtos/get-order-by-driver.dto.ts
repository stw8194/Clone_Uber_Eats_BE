import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { Order } from '../entities/order.entity';
import { CoreOutput } from 'src/common/dtos/output.dto';

@InputType()
export class GetOrderByDriverIdInput {
  @Field((type) => Number)
  driverId?: number;
}
@ObjectType()
export class GetOrderByDriverIdOutput extends CoreOutput {
  @Field((type) => Order, { nullable: true })
  order?: Order;
}
