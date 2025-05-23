import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { CoreOutput } from 'src/common/dtos/output.dto';
import { OrderItemChoice } from '../entities/order-item.entity';

@InputType()
class CreateOrderItemInput {
  @Field((type) => Number)
  dishId: number;

  @Field((type) => [OrderItemChoice], { nullable: true })
  options?: OrderItemChoice[];
}

@InputType()
export class CreateOrderInput {
  @Field((type) => Number)
  restaurantId: number;

  @Field((type) => [CreateOrderItemInput])
  items: CreateOrderItemInput[];
}

@ObjectType()
export class CreateOrderOutput extends CoreOutput {
  @Field((type) => Number, { nullable: true })
  orderId?: number;
}
