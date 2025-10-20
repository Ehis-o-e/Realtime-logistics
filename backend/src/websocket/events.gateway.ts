import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../entities/order.entity';
import { LocationHistory } from '../entities/location-history.entity';

@WebSocketGateway({
    cors: {
        origin: 'http://localhost:3001',
        credentials: true,
    },
})
@Injectable()
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private connectedUsers = new Map<string, string>();

    constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(LocationHistory)
    private locationHistoryRepository: Repository<LocationHistory>,
    ){}

    handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    // Remove user from connected users
    this.connectedUsers.forEach((socketId, userId) => {
      if (socketId === client.id) {
        this.connectedUsers.delete(userId);
      }
    });
  }

  // User joins a specific order room
  @SubscribeMessage('join-order')
  handleJoinOrder(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: string; userId: string },
  ) {
    const roomName = `order:${data.orderId}`;
    client.join(roomName);
    this.connectedUsers.set(data.userId, client.id);
    console.log(`User ${data.userId} joined room ${roomName}`);
  }

  // Driver sends location update
  @SubscribeMessage('location:update')
  async handleLocationUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { driverId: string; orderId: string; lat: number; lng: number },
  ) {
    const { driverId, orderId, lat, lng } = data;
    
     // Save location history
    const locationHistory = this.locationHistoryRepository.create({
      driverId,
      orderId,
      lat,
      lng,
    });
    await this.locationHistoryRepository.save(locationHistory);

    // Broadcast to order room
    const roomName = `order:${orderId}`;
    this.server.to(roomName).emit('driver:location', {
      driverId,
      lat,
      lng,
      timestamp: new Date(),
    });

    console.log(`Location update for driver ${driverId} in order ${orderId}`);
  }

  // Driver sends status update
  @SubscribeMessage('status:change')
  async handleStatusChange(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: string; status: string },
  ) {
    const { orderId, status } = data;

    // Broadcast to order room
    const roomName = `order:${orderId}`;
    this.server.to(roomName).emit('order:status', {
      orderId,
      status,
      timestamp: new Date(),
    });

    console.log(`Status update for order ${orderId}: ${status}`);
  }
   // Customer requests order updates
  @SubscribeMessage('order:subscribe')
  async handleOrderSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: string },
  ) {
    const order = await this.orderRepository.findOne({
      where: { id: data.orderId },
      relations: ['driver'],
    });

    if (order) {
      const roomName = `order:${data.orderId}`;
      client.join(roomName);

      // Send current order state
      client.emit('order:data', {
        id: order.id,
        status: order.status,
        driverId: order.driverId,
        pickupAddress: order.pickupAddress,
        deliveryAddress: order.deliveryAddress,
        pickupLat: order.pickupLat,
        pickupLng: order.pickupLng,
        deliveryLat: order.deliveryLat,
        deliveryLng: order.deliveryLng,
        currentLat: order.driver?.currentLat,
        currentLng: order.driver?.currentLng,
      });
    }
  }

   // Broadcast to specific order room
  broadcastToOrder(orderId: string, event: string, data: any) {
    const roomName = `order:${orderId}`;
    this.server.to(roomName).emit(event, data);
  }
}