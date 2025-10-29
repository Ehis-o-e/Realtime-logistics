'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function DriverDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }
    setUser(JSON.parse(userData));
    fetchOrders();
    checkAvailability();
  }, []);

  const checkAvailability = async () => {
    try {
      const response = await api.get('/drivers/available');
      const currentUserId = JSON.parse(localStorage.getItem('user')!).id;
      const myDriver = response.data.find((d: any) => d.userId === currentUserId);
      setIsAvailable(myDriver ? myDriver.isAvailable : false);
    } catch (error) {
      console.error('Failed to check availability:', error);
      setIsAvailable(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await api.get('/orders');
      const ordersWithNumbers = response.data.map((order: any) => ({
        ...order,
        amount: parseFloat(order.amount) || 0,
      }));
      setOrders(ordersWithNumbers);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    }
  };

  const handleToggleAvailability = async () => {
    setLoading(true);
    try {
      await api.patch('/drivers/availability', {
        available: !isAvailable,
      });
      setIsAvailable(!isAvailable);
      alert(`You are now ${!isAvailable ? 'available ✅' : 'unavailable ⏸️'}`);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to update availability');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    setLoading(true);
    try {
      await api.patch(`/orders/${orderId}/status`, { status: newStatus });
      alert('Status updated!');
      fetchOrders();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to update status');
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
    };
    return colors[status] || 'bg-gray-500';
  };

  const getNextStatus = (status: string) => {
    const flow: Record<string, string> = {
      assigned: 'picked_up',
      picked_up: 'in_transit',
      in_transit: 'delivered',
    };
    return flow[status];
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      assigned: 'Mark as Picked Up',
      picked_up: 'Mark as In Transit',
      in_transit: 'Mark as Delivered',
    };
    return labels[status] || 'Update';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🚗 Driver Dashboard</h1>
            <p className="text-sm text-gray-500">Welcome, {user?.name}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleToggleAvailability}
              disabled={loading}
              className={`px-6 py-2 rounded-lg font-semibold transition ${
                isAvailable
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-400 text-white hover:bg-gray-500'
              }`}
            >
              {isAvailable ? '✅ Available' : '⏸️ Unavailable'}
            </button>
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
            <p className={`text-xl font-bold ${isAvailable ? 'text-green-600' : 'text-gray-400'}`}>
              {isAvailable ? 'Available' : 'Offline'}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">My Deliveries</h2>
          </div>

          <div className="divide-y">
            {orders.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No orders assigned yet.</div>
            ) : (
              orders.map((order) => (
                <div key={order.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <span className={`${getStatusColor(order.status)} text-white px-3 py-1 rounded-full text-xs font-semibold`}>
                        {order.status.replace('_', ' ').toUpperCase()}
                      </span>
                      <p className="mt-3 text-sm"><strong>From:</strong> {order.pickupAddress}</p>
                      <p className="text-sm"><strong>To:</strong> {order.deliveryAddress}</p>
                      {order.notes && <p className="text-sm text-gray-600 mt-2">Note: {order.notes}</p>}
                      <p className="text-lg font-bold mt-2">${order.amount.toFixed(2)}</p>
                    </div>

                    <div className="flex flex-col gap-2">
                      {getNextStatus(order.status) && (
                        <button
                          onClick={() => handleUpdateStatus(order.id, getNextStatus(order.status))}
                          disabled={loading}
                          className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
                        >
                          {getStatusLabel(order.status)}
                        </button>
                      )}
                      <button
                        onClick={() => router.push(`/track/${order.id}`)}
                        className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg font-semibold hover:bg-gray-300"
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