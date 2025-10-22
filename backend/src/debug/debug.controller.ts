import { Controller, Post, Param } from '@nestjs/common';
import { DebugService } from './debug.service';

@Controller('debug')
export class DebugController {
  constructor(private debugService: DebugService) {}

  @Post('simulate-driver/:orderId')
  async simulateDriver(@Param('orderId') orderId: string) {
    return this.debugService.simulateDriverMovement(orderId);
  }

  @Post('reset-order/:orderId')
  async resetOrder(@Param('orderId') orderId: string) {
    return this.debugService.resetOrder(orderId);
  }
}