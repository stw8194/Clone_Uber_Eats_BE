import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { IsNumber, IsString, Length } from 'class-validator';
import { CoreEntity } from 'src/common/entites/core.entity';
import { Column, Entity, ManyToMany, ManyToOne, RelationId } from 'typeorm';
import { Restaurant } from './restaurant.entity';
import { Order } from 'src/orders/entities/order.entity';

@InputType('DishChoiceInputType')
@ObjectType()
class DishChoice {
  @Field((type) => String)
  name?: string;

  @Field((type) => Number, { nullable: true })
  extra?: number;
}

@InputType('DishOptionInputType')
@ObjectType()
class DishOption {
  @Field((type) => String)
  name: string;

  @Field((type) => [DishChoice], { nullable: true })
  choices?: DishChoice[];

  @Field((type) => Number, { nullable: true })
  extra?: number;
}

@InputType('DishInputType')
@ObjectType()
@Entity()
export class Dish extends CoreEntity {
  @Column({ unique: true })
  @Field((type) => String)
  @IsString()
  name: string;

  @Column()
  @Field((type) => Number)
  @IsNumber()
  price: number;

  @Column({ nullable: true })
  @Field((type) => String, { nullable: true })
  @IsString()
  photo?: string;

  @Column()
  @Field((type) => String)
  @IsString()
  @Length(5, 100)
  description: string;

  @Field((type) => Restaurant)
  @ManyToOne((type) => Restaurant, (restaurant) => restaurant.menu, {
    onDelete: 'CASCADE',
  })
  restaurant: Restaurant;

  @RelationId((dish: Dish) => dish.restaurant)
  restaurantId: number;

  @Field((type) => [Order])
  @ManyToMany((type) => Order)
  orders: Order[];

  @Column({ type: 'json', nullable: true })
  @Field((type) => [DishOption], { nullable: true })
  options?: DishOption[];
}
