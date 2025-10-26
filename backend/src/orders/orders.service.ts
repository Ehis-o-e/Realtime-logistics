import { Injectable, BadRequestException, NotFoundException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from '../entities/order.entity';
import { Driver } from '../entities/driver.entity';
import { User, UserRole } from '../entities/user.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { PaymentsService } from '../payments/payments.service';
import { CacheService } from '../cache/cache.service';
import axios from 'axios';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(Driver)
    private driverRepository: Repository<Driver>,
    @Inject(forwardRef(() => PaymentsService))
    private paymentsService: PaymentsService,
    private cacheService: CacheService,
  ) {}

  async createOrder(customerId: string, createOrderDto: CreateOrderDto) {
    // Calculate distance using Google Maps API
    const distance = await this.calculateDistance(
      createOrderDto.pickupLat,
      createOrderDto.pickupLng,
      createOrderDto.deliveryLat,
      createOrderDto.deliveryLng,
    );

    // Calculate amount: $5 base + $0.50 per km
    const amount = 5 + distance * 0.5;

    const order = this.orderRepository.create({
      customerId,
      ...createOrderDto,
      distance,
      amount,
      status: OrderStatus.CREATED,
    });

    const savedOrder = await this.orderRepository.save(order);

    const paymentIntent = await this.paymentsService.createPaymentIntent(savedOrder.id);

    return {
      order: savedOrder,
      payment: paymentIntent,
    };
  }

  async getOrderById(orderId: string, userId: string, userRole: UserRole) {
    let order = await this.cacheService.getCachedOrder(orderId);
    
    if (order) {
      console.log(`Cache HIT - Order ${orderId}`);
    } else {
      console.log(`Cache MISS - Querying order ${orderId}`);
      order = await this.orderRepository.findOne({
        where: { id: orderId },
        relations: ['customer', 'driver', 'driver.user'],
      });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    await this.cacheService.cacheOrder(orderId, order);
    }
    // Check authorization
    if (
      userRole !== UserRole.ADMIN &&
      order.customerId !== userId &&
      order.driver?.userId !== userId
    ) {
      throw new ForbiddenException('Not authorized to view this order');
    }

    return order;
  }

  async getOrders(userId: string, userRole: UserRole, status?: OrderStatus) {
    const query = this.orderRepository.createQueryBuilder('order');

    if (userRole === UserRole.CUSTOMER) {
      query.where('order.customerId = :customerId', { customerId: userId });
    } else if (userRole === UserRole.DRIVER) {
      query.where('order.driverId IN (SELECT id FROM drivers WHERE userId = :userId)', {
        userId,
      });
    }
    // Admin sees all

    if (status) {
      query.andWhere('order.status = :status', { status });
    }

    query.orderBy('order.createdAt', 'DESC');

    return query.getMany();
  }

  async updateOrderStatus(orderId: string, updateDto: UpdateOrderStatusDto, userId: string) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['driver', 'driver.user'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Only driver assigned to order or admin can update status
    if (order.driver?.userId !== userId) {
      throw new ForbiddenException('Only assigned driver can update status');
    }

    order.status = updateDto.status;
    return this.orderRepository.save(order);
  }

  async assignDriver(orderId: string, driverId: string) {
    const order = await this.orderRepository.findOne({ where: { id: orderId } });
    const driver = await this.driverRepository.findOne({ where: { id: driverId } });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    if (!driver.isAvailable) {
      throw new BadRequestException('Driver is not available');
    }

    order.driverId = driverId;
    order.status = OrderStatus.ASSIGNED;

     const savedOrder = await this.orderRepository.save(order);

    //invalidate cache
    await this.cacheService.del(`order:${orderId}`);
    await this.cacheService.del('drivers:available');
    console.log(`🗑️ Cleared cache for order ${orderId} and available drivers`);

    return savedOrder;
  }
  

  private async calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): Promise<number> {
    // Simple Haversine formula for distance calculation
    // In production, use Google Maps Distance Matrix API
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}