import { Field, Float, InputType, ObjectType } from '@nestjs/graphql';
import {
  PaginationInput,
  PaginationOutput,
} from 'src/common/dtos/pagination.dto';
import { Restaurant } from '../entities/restaurant.entity';

@InputType()
export class RestaurantsByDistanceInput extends PaginationInput {
  @Field((type) => Float)
  lat: number;

  @Field((type) => Float)
  lng: number;
}

@ObjectType()
export class RestaurantsByDistanceOutput extends PaginationOutput {
  @Field((type) => [Restaurant], { nullable: true })
  restaurants?: Restaurant[];
}
