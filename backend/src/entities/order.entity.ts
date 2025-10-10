import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from './user.entity';
import { Driver } from './driver.entity';

export enum OrderStatus {
  CREATED = 'created',
  ASSIGNED = 'assigned',
  PICKED_UP = 'picked_up',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  customerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'customerId' })
  customer: User;

  @Column({ nullable: true })
  driverId: string;

  @ManyToOne(() => Driver, { nullable: true })
  @JoinColumn({ name: 'driverId' })
  driver: Driver;

  @Column()
  pickupAddress: string;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  pickupLat: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  pickupLng: number;

  @Column()
  deliveryAddress: string;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  deliveryLat: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  deliveryLng: number;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.CREATED,
  })
  status: OrderStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  distance: number; // in kilometers

  @Column({ nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}