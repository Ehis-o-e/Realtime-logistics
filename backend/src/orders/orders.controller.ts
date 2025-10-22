import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrderStatus } from '../entities/order.entity';

@Controller('orders')
@UseGuards(AuthGuard('jwt'))
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Post()
  async createOrder(@Request() req, @Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.createOrder(req.user.id, createOrderDto);
  }

  @Get()
  async getOrders(
    @Request() req,
    @Query('status') status?: OrderStatus,
  ) {
    return this.ordersService.getOrders(req.user.id, req.user.role, status);
  }

  @Get(':id')
  async getOrderById(@Request() req, @Param('id') id: string) {
    return this.ordersService.getOrderById(id, req.user.id, req.user.role);
  }

  @Patch(':id/status')
  async updateOrderStatus(
    @Request() req,
    @Param('id') id: string,
    @Body() updateDto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateOrderStatus(id, updateDto, req.user.id);
  }

  @Patch(':id/assign-driver')
  @UseGuards(AuthGuard('jwt'))
  async assignDriver(@Param('id') id: string, @Body('driverId') driverId: string) {
    return this.ordersService.assignDriver(id, driverId);
  }
}