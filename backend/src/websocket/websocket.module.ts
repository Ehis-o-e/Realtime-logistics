import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventsGateway } from './events.gateway';
import { Order } from '../entities/order.entity';
import { LocationHistory } from '../entities/location-history.entity';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, LocationHistory]),
    CacheModule,
  ],
  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class WebSocketModule {}