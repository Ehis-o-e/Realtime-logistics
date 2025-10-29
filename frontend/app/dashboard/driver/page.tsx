'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function DriverDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [driver, setDriver] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }
    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    fetchDriverData();
    fetchOrders();
  }, []);

  const fetchDriverData = async () => {
    try {
      const response = await api.get('/drivers/available');
      const drivers = response.data;
      // Find current driver
      const userData = JSON.parse(localStorage.getItem('user')!);
      const currentDriver = drivers.find((d: any) => d.userId === userData.id);
      setDriver(currentDriver);
    } catch (error) {
      console.error('Failed to fetch driver data:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await api.get('/orders');
      setOrders(response.data);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    setLoading(true);
    try {
      await api.patch(`/orders/${orderId}/status`, { status: newStatus });
      alert('Status updated successfully!');
      fetchOrders();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAvailability = async () => {
    if (!driver) return;
    setLoading(true);
    try {
      await api.patch(`/drivers/${driver.id}/availability`, {
        available: !driver.isAvailable,
      });
      alert('Availability updated!');
      fetchDriverData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to update availability');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push('/login');
  };

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

  const getNextStatus = (currentStatus: string) => {
    const statusFlow: Record<string, string> = {
      assigned: 'picked_up',
      picked_up: 'in_transit',
      in_transit: 'delivered',
    };
    return statusFlow[currentStatus];
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      assigned: 'Mark as Picked Up',
      picked_up: 'Mark as In Transit',
      in_transit: 'Mark as Delivered',
    };
    return labels[status] || 'Update Status';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🚗 Driver Dashboard</h1>
            <p className="text-sm text-gray-500">Welcome, {user?.name}</p>
          </div>
          <div className="flex gap-3">
            {driver && (
              <button
                onClick={handleToggleAvailability}
                disabled={loading}
                className={`px-6 py-2 rounded-lg font-semibold transition ${
                  driver.isAvailable
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-400 text-white hover:bg-gray-500'
                }`}
              >
                {driver.isAvailable ? '✅ Available' : '⏸️ Unavailable'}
              </button>
            )}
            <button
              onClick={handleLogout}
              className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg font-semibold hover:bg-gray-300 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-500">Total Orders</p>
            <p className="text-3xl font-bold text-gray-900">{orders.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-500">Active</p>
            <p className="text-3xl font-bold text-blue-600">
              {orders.filter((o) => ['assigned', 'picked_up', 'in_transit'].includes(o.status)).length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-500">Completed</p>
            <p className="text-3xl font-bold text-green-600">
              {orders.filter((o) => o.status === 'delivered').length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-500">Status</p>
            <p className={`text-xl font-bold ${driver?.isAvailable ? 'text-green-600' : 'text-gray-400'}`}>
              {driver?.isAvailable ? 'Available' : 'Offline'}
            </p>
          </div>
        </div>

        {/* Orders List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">My Deliveries</h2>
          </div>

          <div className="divide-y">
            {orders.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No orders assigned yet.</div>
            ) : (
              orders.map((order) => (
                <div key={order.id} className="p-6 hover:bg-gray-50 transition">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <span className={`${getStatusColor(order.status)} text-white px-3 py-1 rounded-full text-xs font-semibold`}>
                          {order.status.replace('_', ' ').toUpperCase()}
                        </span>
                        <span className="text-sm text-gray-500">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div>
                          <p className="text-xs text-gray-500">📍 Pickup</p>
                          <p className="text-sm font-medium">{order.pickupAddress}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">🎯 Delivery</p>
                          <p className="text-sm font-medium">{order.deliveryAddress}</p>
                        </div>
                        {order.notes && (
                          <div>
                            <p className="text-xs text-gray-500">📝 Notes</p>
                            <p className="text-sm">{order.notes}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-lg font-semibold text-gray-900 mt-2">
                            ${Number(order.amount).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 ml-4">
                      {order.status !== 'delivered' && order.status !== 'cancelled' && getNextStatus(order.status) && (
                        <button
                          onClick={() => handleUpdateStatus(order.id, getNextStatus(order.status))}
                          disabled={loading}
                          className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 whitespace-nowrap"
                        >
                          {getStatusLabel(order.status)}
                        </button>
                      )}
                      <button
                        onClick={() => router.push(`/track/${order.id}`)}
                        className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg font-semibold hover:bg-gray-300 transition whitespace-nowrap"
                      >
                        View Map
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}