import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Driver } from '../entities/driver.entity';
import { Order, OrderStatus } from '../entities/order.entity';
import { LocationHistory } from '../entities/location-history.entity';

@Injectable()
export class DriversService {
  constructor(
    @InjectRepository(Driver)
    private driverRepository: Repository<Driver>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(LocationHistory)
    private locationHistoryRepository: Repository<LocationHistory>,
  ) {}

  async getAvailableDrivers() {
    return this.driverRepository.find({
      where: { isAvailable: true },
      relations: ['user'],
    });
  }

  async getDriver(driverId: string) {
    const driver = await this.driverRepository.findOne({
      where: { id: driverId },
      relations: ['user'],
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    return driver;
  }

  async updateLocation(driverId: string, lat: number, lng: number, orderId?: string) {
    const driver = await this.driverRepository.findOne({ where: { id: driverId } });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    // Update driver's current location
    driver.currentLat = lat;
    driver.currentLng = lng;
    await this.driverRepository.save(driver);

    // Save to location history
    const locationHistory = this.locationHistoryRepository.create({
      driverId,
      orderId,
      lat,
      lng,
    });

    await this.locationHistoryRepository.save(locationHistory);

    return driver;
  }

  async getDriverOrders(driverId: string) {
    // Verify driver exists
    const driver = await this.driverRepository.findOne({ where: { id: driverId } });
    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    return this.orderRepository.find({
      where: { driverId },
      relations: ['customer', 'driver'],
      order: { createdAt: 'DESC' },
    });
  }

  async toggleAvailability(userId: string, available: boolean) {
    const driver = await this.driverRepository.findOne({ where: { userId } });

    if (!driver) {
      throw new NotFoundException('Driver profile not found');
    }

    driver.isAvailable = available;
    return this.driverRepository.save(driver);
  }

  async getLocationHistory(driverId: string, limit: number = 100) {
    return this.locationHistoryRepository.find({
      where: { driverId },
      order: { timestamp: 'DESC' },
      take: limit,
    });
  }
}