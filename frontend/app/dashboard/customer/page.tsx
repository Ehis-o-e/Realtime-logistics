'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import api from '@/lib/api';
import PaymentForm from '@/components/PaymentForm';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY!);

export default function CustomerDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [showCreateOrder, setShowCreateOrder] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [clientSecret, setClientSecret] = useState('');
  const [currentOrder, setCurrentOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [simulatingOrder, setSimulatingOrder] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    pickupAddress: '',
    pickupLat: 6.5244,
    pickupLng: 3.3792,
    deliveryAddress: '',
    deliveryLat: 6.5500,
    deliveryLng: 3.4000,
    notes: '',
  });

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }
    setUser(JSON.parse(userData));
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await api.get('/orders');
      // Only show paid orders (those with successful payment)
      const paidOrders = response.data.filter((order: any) => 
        order.status !== 'created' || order.amount > 0
      );
      setOrders(paidOrders);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.post('/orders', formData);
      const { order, payment } = response.data;
      
      setCurrentOrder(order);
      setClientSecret(payment.clientSecret);
      setShowCreateOrder(false);
      setShowPayment(true);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to create order');
      setLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    setShowPayment(false);
    setClientSecret('');
    setLoading(false);
    alert('Payment successful! Your order has been created.');
    fetchOrders(); // Refresh orders list
  };

  const handlePaymentCancel = async () => {
    // Delete unpaid order
    if (currentOrder) {
      try {
        // You might want to add a delete endpoint, or just leave it unpaid
        console.log('Payment cancelled for order:', currentOrder.id);
      } catch (error) {
        console.error('Error handling cancellation:', error);
      }
    }
    setShowPayment(false);
    setClientSecret('');
    setCurrentOrder(null);
    setLoading(false);
  };

  const handleSimulateDelivery = async (orderId: string) => {
    setSimulatingOrder(orderId);
    try {
      await api.post(`/debug/simulate-driver/${orderId}`);
      alert('Driver simulation started! Watch the tracking page.');
      router.push(`/track/${orderId}`);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to start simulation');
    } finally {
      setSimulatingOrder(null);
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">📦 Customer Dashboard</h1>
            <p className="text-sm text-gray-500">Welcome, {user?.name}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowCreateOrder(true)}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              + New Order
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
        {/* Orders List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">My Orders</h2>
          </div>
          
          <div className="divide-y">
            {orders.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No orders yet. Create your first order!
              </div>
            ) : (
              orders.map((order) => (
                <div key={order.id} className="p-6 hover:bg-gray-50 transition">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`${getStatusColor(order.status)} text-white px-3 py-1 rounded-full text-xs font-semibold`}>
                          {order.status.replace('_', ' ').toUpperCase()}
                        </span>
                        <span className="text-sm text-gray-500">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        <strong>From:</strong> {order.pickupAddress}
                      </p>
                      <p className="text-sm text-gray-600">
                        <strong>To:</strong> {order.deliveryAddress}
                      </p>
                      <p className="text-lg font-semibold text-gray-900 mt-2">
                        ${Number(order.amount).toFixed(2)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => router.push(`/track/${order.id}`)}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
                      >
                        Track Order
                      </button>
                      {order.status === 'assigned' && (
                        <button
                          onClick={() => handleSimulateDelivery(order.id)}
                          disabled={simulatingOrder === order.id}
                          className="bg-purple-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-purple-700 transition disabled:opacity-50"
                        >
                          {simulatingOrder === order.id ? 'Starting...' : '🚗 Simulate'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Create Order Modal */}
      {showCreateOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">Create New Order</h2>
            
            <form onSubmit={handleCreateOrder} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pickup Address
                </label>
                <input
                  type="text"
                  value={formData.pickupAddress}
                  onChange={(e) => setFormData({ ...formData, pickupAddress: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Delivery Address
                </label>
                <input
                  type="text"
                  value={formData.deliveryAddress}
                  onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateOrder(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Continue to Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPayment && clientSecret && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">Complete Payment</h2>
            <p className="text-gray-600 mb-6">
              Amount: <span className="text-2xl font-bold text-blue-600">${Number(currentOrder?.amount).toFixed(2)}</span>
            </p>
            
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <PaymentForm
                onSuccess={handlePaymentSuccess}
                onCancel={handlePaymentCancel}
              />
            </Elements>
          </div>
        </div>
      )}
    </div>
  );
}