import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DriversController } from './drivers.controller';
import { DriversService } from './drivers.service';
import { Driver } from '../entities/driver.entity';
import { Order } from '../entities/order.entity';
import { LocationHistory } from '../entities/location-history.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Driver, Order, LocationHistory])],
  controllers: [DriversController],
  providers: [DriversService],
})
export class DriversModule {}