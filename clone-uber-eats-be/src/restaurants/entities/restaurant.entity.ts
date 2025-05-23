import {
  Field,
  Float,
  HideField,
  InputType,
  ObjectType,
} from '@nestjs/graphql';
import { IsNumber, IsString } from 'class-validator';
import { CoreEntity } from 'src/common/entites/core.entity';
import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  RelationId,
} from 'typeorm';
import { Category } from './category.entity';
import { User } from 'src/users/entities/user.entity';
import { Dish } from './dish.entity';
import { Order } from 'src/orders/entities/order.entity';

@InputType('RestaurantInputType')
@ObjectType()
@Entity()
export class Restaurant extends CoreEntity {
  @Column()
  @Field((type) => String)
  @IsString()
  name: string;

  @Column()
  @Field((type) => String)
  @IsString()
  coverImg: string;

  @Column()
  @Field((type) => String)
  @IsString()
  address: string;

  @Column({ type: 'double precision' })
  @Field((type) => Float)
  @IsNumber()
  lat: number;

  @Column({ type: 'double precision' })
  @Field((type) => Float)
  @IsNumber()
  lng: number;

  @HideField()
  @Column({
    type: 'geography',
    spatialFeatureType: 'Point',
    srid: 4326,
  })
  location: {
    type: 'Point';
    coordinates: [number, number];
  };

  @Field((type) => Category, { nullable: true })
  @ManyToOne((type) => Category, (category) => category.restaurants, {
    nullable: true,
    onDelete: 'SET NULL',
    eager: true,
  })
  category?: Category;

  @Field((type) => User)
  @ManyToOne((type) => User, (user) => user.restaurants, {
    onDelete: 'CASCADE',
  })
  owner: User;

  @RelationId((restaurant: Restaurant) => restaurant.owner)
  ownerId: number;

  @Field((type) => [Dish])
  @OneToMany((type) => Dish, (dish) => dish.restaurant)
  menu: Dish[];

  @Field((type) => [Order])
  @OneToMany((type) => Order, (order) => order.restaurant)
  orders: Order[];

  @Column({ default: false })
  @Field((type) => Boolean, { defaultValue: false })
  isPromoted: boolean;

  @Column({ nullable: true })
  @Field((type) => Date, { nullable: true })
  promotedUntil: Date;

  @BeforeInsert()
  @BeforeUpdate()
  setLocation() {
    this.location = {
      type: 'Point',
      coordinates: [this.lng, this.lat],
    };
  }
}
