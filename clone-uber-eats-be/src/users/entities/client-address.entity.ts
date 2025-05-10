import {
  Field,
  Float,
  HideField,
  InputType,
  ObjectType,
} from '@nestjs/graphql';
import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  ManyToOne,
  RelationId,
} from 'typeorm';
import { CoreEntity } from 'src/common/entites/core.entity';
import { User } from './user.entity';
import { IsNumber } from 'class-validator';

@InputType('AddressInputType')
@ObjectType()
@Entity()
export class Address extends CoreEntity {
  @Field((type) => User)
  @ManyToOne((type) => User, (user) => user.addresses, {
    onDelete: 'CASCADE',
  })
  client: User;

  @RelationId((address: Address) => address.client)
  clientId: number;

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
  location: string;

  @BeforeInsert()
  @BeforeUpdate()
  setLocation() {
    this.location = `SRID=4326;POINT(${this.lng} ${this.lat})`;
  }
}
