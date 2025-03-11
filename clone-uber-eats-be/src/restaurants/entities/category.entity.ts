import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { IsString } from 'class-validator';
import { CoreEntity } from 'src/common/entites/core.entity';
import { Column, Entity, OneToMany } from 'typeorm';
import { Restaurant } from './restaurant.entity';

@InputType('CategoryInputType')
@ObjectType()
@Entity()
export class Category extends CoreEntity {
  @Column({ unique: true })
  @Field((type) => String)
  @IsString()
  name: string;

  @Column({ nullable: true })
  @Field((type) => String, { nullable: true })
  @IsString()
  coverImg?: string;

  @Column({ unique: true })
  @Field((type) => String)
  @IsString()
  slug: string;

  @Field((type) => [Restaurant], { nullable: true })
  @OneToMany((type) => Restaurant, (restaurant) => restaurant.category)
  restaurants?: Restaurant[];
}
