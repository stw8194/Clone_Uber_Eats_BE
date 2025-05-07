import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { CoreOutput } from 'src/common/dtos/output.dto';
import { Dish } from '../entities/dish.entity';

@InputType()
export class MyDishInput {
  @Field((type) => Number)
  restaurantId: number;

  @Field((type) => Number)
  dishId: number;
}

@ObjectType()
export class MyDishOutput extends CoreOutput {
  @Field((type) => Dish, { nullable: true })
  dish?: Dish;
}
