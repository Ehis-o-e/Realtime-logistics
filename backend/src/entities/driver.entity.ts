import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { User } from './user.entity';

@Entity('drivers')
export class Driver {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: true })
  vehicleType: string;

  @Column({ nullable: true })
  vehiclePlate: string;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  currentLat: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  currentLng: number;

  @Column({ default: true })
  isAvailable: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}