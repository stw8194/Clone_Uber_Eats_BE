import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { IsNumber, IsOptional, IsString, Length } from 'class-validator';
import { CoreEntity } from 'src/common/entites/core.entity';
import { Column, Entity, ManyToMany, ManyToOne, RelationId } from 'typeorm';
import { Restaurant } from './restaurant.entity';
import { Order } from 'src/orders/entities/order.entity';

@InputType('DishChoiceInputType', { isAbstract: true })
@ObjectType()
export class DishChoice {
  @Field((type) => String)
  name: string;
  @Field((type) => Number, { nullable: true })
  extra?: number;
}

@InputType('DishOptionInputType')
@ObjectType()
export class DishOption {
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
  @Column()
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
  @IsOptional()
  photo?: string;

  @Column({ nullable: true })
  @Field((type) => String, { nullable: true })
  @IsString()
  @IsOptional()
  @Length(0, 100)
  description?: string;

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
