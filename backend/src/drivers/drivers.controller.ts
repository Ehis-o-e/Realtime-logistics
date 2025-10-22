import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DriversService } from './drivers.service';

@Controller('drivers')
export class DriversController {
  constructor(private driversService: DriversService) {}

  @Get('available')
  async getAvailableDrivers() {
    return this.driversService.getAvailableDrivers();
  }

  @Get(':id')
  async getDriver(@Param('id') id: string) {
    return this.driversService.getDriver(id);
  }

  @Get(':id/orders')
  @UseGuards(AuthGuard('jwt'))
  async getDriverOrders(@Param('id') id: string) {
    return this.driversService.getDriverOrders(id);
  }

  @Patch('location')
  @UseGuards(AuthGuard('jwt'))
  async updateLocation(
    @Request() req,
    @Body() body: { driverId: string; lat: number; lng: number; orderId?: string },
  ) {
    return this.driversService.updateLocation(body.driverId, body.lat, body.lng, body.orderId);
  }

  @Patch(':id/availability')
  @UseGuards(AuthGuard('jwt'))
  async toggleAvailability(
    @Param('id') id: string,
    @Body('available') available: boolean,
  ) {
    return this.driversService.toggleAvailability(id, available);
  }

  @Get(':id/location-history')
  async getLocationHistory(@Param('id') id: string, @Query('limit') limit?: number) {
    return this.driversService.getLocationHistory(id, limit || 100);
  }
}