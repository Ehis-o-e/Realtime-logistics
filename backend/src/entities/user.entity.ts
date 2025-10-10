import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, OneToMany } from 'typeorm';
import { Exclude } from 'class-transformer';

export enum UserRole {
  CUSTOMER = 'customer',
  DRIVER = 'driver',
  ADMIN = 'admin',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  @Exclude()
  password: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.CUSTOMER,
  })
  role: UserRole;

  @Column()
  name: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ default: true })
  emailNotifications: boolean;

  @Column({ default: true })
  smsNotifications: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}