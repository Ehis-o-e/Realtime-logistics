import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DebugController } from './debug.controller';
import { DebugService } from './debug.service';
import { Order } from '../entities/order.entity';
import { Driver } from '../entities/driver.entity';
import { WebSocketModule } from '../websocket/websocket.module';

@Module({
  imports: [TypeOrmModule.forFeature([Order, Driver]), WebSocketModule],
  controllers: [DebugController],
  providers: [DebugService],
})
export class DebugModule {}