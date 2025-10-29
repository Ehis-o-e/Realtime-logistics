'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }
    setUser(JSON.parse(userData));
    fetchOrders();
    fetchDrivers();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await api.get('/orders');
      setOrders(response.data);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    }
  };

  const fetchDrivers = async () => {
    try {
      const response = await api.get('/drivers/available');
      setDrivers(response.data);
    } catch (error) {
      console.error('Failed to fetch drivers:', error);
    }
  };

  const handleAssignDriver = async (driverId: string) => {
    if (!selectedOrder) return;
    setLoading(true);

    try {
      await api.patch(`/orders/${selectedOrder.id}/assign-driver`, { driverId });
      alert('Driver assigned successfully!');
      setShowAssignModal(false);
      setSelectedOrder(null);
      fetchOrders();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to assign driver');
    } finally {
      setLoading(false);
    }
  };

  const handleSimulate = async (orderId: string) => {
    try {
      await api.post(`/debug/simulate-driver/${orderId}`);
      alert('Driver simulation started! Open tracking page to watch.');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to start simulation');
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

  const totalRevenue = orders.reduce((sum, order) => sum + parseFloat(order.amount), 0);
  const activeOrders = orders.filter((o) => ['created', 'assigned', 'picked_up', 'in_transit'].includes(o.status));
  const completedOrders = orders.filter((o) => o.status === 'delivered');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">⚡ Admin Dashboard</h1>
            <p className="text-sm text-gray-500">Welcome, {user?.name}</p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg font-semibold hover:bg-gray-300 transition"
          >
            Logout
          </button>
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
            <p className="text-sm text-gray-500">Active Orders</p>
            <p className="text-3xl font-bold text-blue-600">{activeOrders.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-500">Completed</p>
            <p className="text-3xl font-bold text-green-600">{completedOrders.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-500">Total Revenue</p>
            <p className="text-3xl font-bold text-purple-600">${totalRevenue.toFixed(2)}</p>
          </div>
        </div>

        {/* Drivers Status */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">Drivers ({drivers.length})</h2>
          </div>
          <div className="p-6">
            <div className="grid md:grid-cols-3 gap-4">
              {drivers.map((driver) => (
                <div key={driver.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold">{driver.user.name}</p>
                    <span className={`${driver.isAvailable ? 'bg-green-500' : 'bg-gray-400'} text-white px-2 py-1 rounded text-xs`}>
                      {driver.isAvailable ? 'Available' : 'Busy'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{driver.user.email}</p>
                  <p className="text-sm text-gray-600">{driver.user.phone}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">All Orders</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pickup</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Delivery</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm">{order.id.slice(0, 8)}...</td>
                    <td className="px-6 py-4">
                      <span className={`${getStatusColor(order.status)} text-white px-2 py-1 rounded text-xs`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">{order.customer?.name || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm">{order.pickupAddress}</td>
                    <td className="px-6 py-4 text-sm">{order.deliveryAddress}</td>
                    <td className="px-6 py-4 text-sm font-semibold">${Number(order.amount).toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {order.status === 'created' && (
                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowAssignModal(true);
                            }}
                            className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700"
                          >
                            Assign Driver
                          </button>
                        )}
                        {order.status === 'assigned' && (
                          <button
                            onClick={() => handleSimulate(order.id)}
                            className="bg-purple-600 text-white px-3 py-1 rounded text-xs hover:bg-purple-700"
                          >
                            Simulate
                          </button>
                        )}
                        <button
                          onClick={() => router.push(`/track/${order.id}`)}
                          className="bg-gray-600 text-white px-3 py-1 rounded text-xs hover:bg-gray-700"
                        >
                          Track
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Assign Driver Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold mb-4">Assign Driver</h2>
            <p className="text-gray-600 mb-4">
              Order: {selectedOrder?.id.slice(0, 8)}...
            </p>

            <div className="space-y-3 mb-6">
              {drivers.filter((d) => d.isAvailable).map((driver) => (
                <button
                  key={driver.id}
                  onClick={() => handleAssignDriver(driver.id)}
                  disabled={loading}
                  className="w-full text-left p-4 border rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
                >
                  <p className="font-semibold">{driver.user.name}</p>
                  <p className="text-sm text-gray-600">{driver.user.email}</p>
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                setShowAssignModal(false);
                setSelectedOrder(null);
              }}
              className="w-full px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}