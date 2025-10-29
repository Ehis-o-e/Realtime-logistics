'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSocket } from '@/lib/useSocket';
import dynamic from 'next/dynamic';
import api from '@/lib/api';

const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);

interface OrderData {
  id: string;
  status: string;
  pickupAddress: string;
  deliveryAddress: string;
  pickupLat: number;
  pickupLng: number;
  deliveryLat: number;
  deliveryLng: number;
  currentLat?: number;
  currentLng?: number;
}

export default function TrackOrderPage() {
  const params = useParams();
  const orderId = params.orderId as string;
  const { socket, isConnected } = useSocket();
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [orderStatus, setOrderStatus] = useState('');
  const [simulatingDriver, setSimulatingDriver] = useState(false);

  useEffect(() => {
    if (!socket || !isConnected) return;

    // Subscribe to order updates
    socket.emit('order:subscribe', { orderId });

    // Listen for order data
    socket.on('order:data', (data: OrderData) => {
      console.log('📦 Order data received:', data);
      setOrderData(data);
      setOrderStatus(data.status);
      if (data.currentLat && data.currentLng) {
        setDriverLocation({ lat: data.currentLat, lng: data.currentLng });
      }
    });

    // Listen for driver location updates
    socket.on('driver:location', (data: { lat: number; lng: number }) => {
      console.log('📍 Driver location update:', data);
      setDriverLocation({ lat: data.lat, lng: data.lng });
    });

    // Listen for status changes
    socket.on('order:status', (data: { status: string }) => {
      console.log('🔄 Status update:', data);
      setOrderStatus(data.status);
    });

    return () => {
      socket.off('order:data');
      socket.off('driver:location');
      socket.off('order:status');
    };
  }, [socket, isConnected, orderId]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      created: 'bg-gray-500',
      assigned: 'bg-blue-500',
      picked_up: 'bg-yellow-500',
      in_transit: 'bg-orange-500',
      delivered: 'bg-green-500',
      cancelled: 'bg-red-500',
    };
    return colors[status] || 'bg-gray-500';
  };

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      created: 'Order Created',
      assigned: 'Driver Assigned',
      picked_up: 'Picked Up',
      in_transit: 'In Transit',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
    };
    return texts[status] || status;
  };

  const handleSimulateDelivery = async () => {
    setSimulatingDriver(true);
    try {
      await api.post(`/debug/simulate-driver/${orderId}`);
      alert('Driver simulation started! Watch the map.');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to start simulation');
    } finally {
      setSimulatingDriver(false);
    }
  };

  if (!orderData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading order...</p>
          <p className="text-sm text-gray-500 mt-2">
            {isConnected ? '✅ Connected' : '⏳ Connecting...'}
          </p>
        </div>
      </div>
    );
  }

  const center: [number, number] = [
    orderData.pickupLat,
    orderData.pickupLng,
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">📦 Track Order</h1>
              <p className="text-sm text-gray-500">Order ID: {orderId.slice(0, 8)}...</p>
            </div>
            <div className="flex items-center gap-2">
              <div
                className={`${getStatusColor(orderStatus)} text-white px-4 py-2 rounded-full text-sm font-semibold`}
              >
                {getStatusText(orderStatus)}
              </div>
              {orderStatus === 'assigned' && (
                <button
                  onClick={handleSimulateDelivery}
                  disabled={simulatingDriver}
                  className="bg-purple-600 text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-purple-700 transition disabled:opacity-50"
                >
                  {simulatingDriver ? 'Starting...' : '🚗 Simulate Driver'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-6">
          {/* Order Details */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="font-semibold text-lg mb-4">Order Details</h2>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Pickup Location</p>
                <p className="font-medium">{orderData.pickupAddress}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Delivery Location</p>
                <p className="font-medium">{orderData.deliveryAddress}</p>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center gap-2 text-sm">
                  <div className={`h-3 w-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span>{isConnected ? 'Live tracking active' : 'Connecting...'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Map */}
          <div className="md:col-span-2 bg-white rounded-lg shadow overflow-hidden" style={{ height: '500px' }}>
            <MapContainer
              center={center}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              {/* Pickup Marker */}
              <Marker position={[orderData.pickupLat, orderData.pickupLng]}>
                <Popup>📍 Pickup: {orderData.pickupAddress}</Popup>
              </Marker>

              {/* Delivery Marker */}
              <Marker position={[orderData.deliveryLat, orderData.deliveryLng]}>
                <Popup>🎯 Delivery: {orderData.deliveryAddress}</Popup>
              </Marker>

              {/* Driver Location */}
              {driverLocation && (
                <Marker position={[driverLocation.lat, driverLocation.lng]}>
                  <Popup>🚗 Driver Current Location</Popup>
                </Marker>
              )}
            </MapContainer>
          </div>
        </div>
      </div>
    </div>
  );
}