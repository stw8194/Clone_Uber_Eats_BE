import { Field, ObjectType } from '@nestjs/graphql';
import { CoreOutput } from 'src/common/dtos/output.dto';
import { Restaurant } from 'src/restaurants/entities/restaurant.entity';

@ObjectType()
export class MyRestaurantsOutput extends CoreOutput {
  @Field((type) => [Restaurant], { nullable: true })
  restaurants?: Restaurant[];
}
