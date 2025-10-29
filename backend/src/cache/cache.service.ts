import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class CacheService implements OnModuleInit {
  private client: RedisClientType;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    const host = this.configService.get<string>('REDIS_HOST');
    const port = this.configService.get<number>('REDIS_PORT');

    console.log('🔍 Redis config:', { redisUrl, host, port });

    try {
      this.client = redisUrl
        ? createClient({ url: redisUrl }) 
        : createClient({
            socket: {
              host: host || 'localhost', 
              port: port || 6379,
            },
          });

      this.client.on('error', (err) => console.error('❌ Redis Client Error:', err));

      await this.client.connect();
      console.log('✅ Redis connected');
    } catch (error) {
      console.error('🚨 Redis connection failed:', error);
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    try {
      if (ttlSeconds) {
        await this.client.setEx(key, ttlSeconds, value);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  async getJSON<T>(key: string): Promise<T | null> {
    try {
      const data = await this.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Cache getJSON error:', error);
      return null;
    }
  }

  async setJSON(key: string, value: any, ttlSeconds?: number): Promise<void> {
    try {
      await this.set(key, JSON.stringify(value), ttlSeconds);
    } catch (error) {
      console.error('Cache setJSON error:', error);
    }
  }

  // Cache driver location for quick access
  async cacheDriverLocation(driverId: string, lat: number, lng: number): Promise<void> {
    await this.setJSON(`driver:location:${driverId}`, { lat, lng }, 300);
  }

  async getDriverLocation(driverId: string): Promise<{ lat: number; lng: number } | null> {
    return await this.getJSON<{ lat: number; lng: number }>(`driver:location:${driverId}`);
  }

  // Cache order details for tracking page
  async cacheOrder(orderId: string, orderData: any): Promise<void> {
    await this.setJSON(`order:${orderId}`, orderData, 600); 
  }

  async getCachedOrder(orderId: string): Promise<any> {
    return await this.getJSON(`order:${orderId}`);
  }

  // Cache available drivers
  async cacheAvailableDrivers(drivers: any[]): Promise<void> {
    await this.setJSON('drivers:available', drivers, 60); 
  }

  async getCachedAvailableDrivers(): Promise<any[] | null> {
    return await this.getJSON<any[]>('drivers:available');
  }
}
