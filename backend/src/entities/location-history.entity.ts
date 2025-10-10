import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('location_history')
@Index(['driverId', 'timestamp'])
export class LocationHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  driverId: string;

  @Column({ nullable: true })
  orderId: string;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  lat: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  lng: number;

  @CreateDateColumn()
  timestamp: Date;
}