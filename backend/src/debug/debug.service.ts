import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from '../entities/order.entity';
import { Driver } from '../entities/driver.entity';
import { EventsGateway } from '../websocket/events.gateway';

@Injectable()
export class DebugService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(Driver)
    private driverRepository: Repository<Driver>,
    private eventsGateway: EventsGateway,
  ) {}

  async simulateDriverMovement(orderId: string) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['driver'],
    });

    if (!order || !order.driver) {
      throw new Error('Order or driver not found');
    }

    const driver = order.driver;
    const startLat = Number(order.pickupLat);
    const startLng = Number(order.pickupLng);
    const endLat = Number(order.deliveryLat);
    const endLng = Number(order.deliveryLng);

    const steps = 20; // 20 waypoints
    const waypoints: { lat: number; lng: number }[] = [];

    for (let i = 0; i <= steps; i++) {
    const progress = i / steps;
    const lat:number = startLat + (endLat - startLat) * progress;
    const lng = startLng + (endLng - startLng) * progress;
    waypoints.push({ lat, lng });
    }

    let stepIndex = 0;
    const movementInterval = setInterval(async () => {
        if (stepIndex >= waypoints.length) {
            clearInterval(movementInterval);
            order.status = OrderStatus.DELIVERED;
            await this.orderRepository.save(order);
            this.eventsGateway.broadcastToOrder(orderId, 'order:status', {
                orderId,
                status: OrderStatus.DELIVERED,
                timestamp: new Date(),
            });
            return;
        }
    
        const waypoint = waypoints[stepIndex];
        driver.currentLat = waypoint.lat;
        driver.currentLng = waypoint.lng;
        await this.driverRepository.save(driver);

        this.eventsGateway.broadcastToOrder(orderId, 'driver:location', {
        driverId: driver.id,
        lat: waypoint.lat,
        lng: waypoint.lng,
        timestamp: new Date(),
    });

    console.log(`Step ${stepIndex}/${steps}: Driver at ${waypoint.lat}, ${waypoint.lng}`);
    stepIndex++;},  3000);

return { message: 'Simulation started', totalSteps: waypoints.length };
  }

  async resetOrder(orderId: string) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['driver'],
    });

    if (order) {
      order.status = OrderStatus.ASSIGNED;
      if (order.driver) {
        order.driver.currentLat = order.pickupLat;
        order.driver.currentLng = order.pickupLng;
        await this.driverRepository.save(order.driver);
      }
      await this.orderRepository.save(order);
    }

    return { message: 'Order reset' };
  }
}