'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import axios from 'axios';
import PaymentForm from '@/components/PaymentForm';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY!);

export default function PublicOrderPage() {
  const router = useRouter();
  const [step, setStep] = useState<'form' | 'payment' | 'tracking'>('form');
  const [loading, setLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState('');
  const [orderId, setOrderId] = useState('');
  const [estimatedCost, setEstimatedCost] = useState(0);

  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    pickupAddress: '',
    pickupLat: 6.5244,
    pickupLng: 3.3792,
    deliveryAddress: '',
    deliveryLat: 6.5500,
    deliveryLng: 3.4000,
    notes: '',
  });

  const calculateEstimate = () => {
    // Simple distance calculation (Haversine)
    const R = 6371; // Earth radius in km
    const dLat = ((formData.deliveryLat - formData.pickupLat) * Math.PI) / 180;
    const dLng = ((formData.deliveryLng - formData.pickupLng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((formData.pickupLat * Math.PI) / 180) *
        Math.cos((formData.deliveryLat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return 5 + distance * 0.5; // $5 base + $0.50/km
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // First, create or get guest customer account
      const authResponse = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/register`,
        {
          email: formData.customerEmail,
          password: Math.random().toString(36), // Random password for guest
          name: formData.customerName,
          phone: formData.customerPhone,
          role: 'customer',
        }
      ).catch(async (error) => {
        // If user exists, login instead
        if (error.response?.status === 409) {
          return axios.post(
            `${process.env.NEXT_PUBLIC_API_URL}/auth/login`,
            {
              email: formData.customerEmail,
              password: 'guest123', // Default guest password
            }
          );
        }
        throw error;
      });

      const token = authResponse.data.token;

      // Create order
      const orderResponse = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/orders`,
        {
          pickupAddress: formData.pickupAddress,
          pickupLat: formData.pickupLat,
          pickupLng: formData.pickupLng,
          deliveryAddress: formData.deliveryAddress,
          deliveryLat: formData.deliveryLat,
          deliveryLng: formData.deliveryLng,
          notes: formData.notes,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const { order, payment } = orderResponse.data;
      setOrderId(order.id);
      setEstimatedCost(order.amount);
      setClientSecret(payment.clientSecret);
      setStep('payment');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    setStep('tracking');
    router.push(`/track/${orderId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 py-8 px-4 overflow-y-auto">
      <div className="max-w-2xl mx-auto pb-20">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold text-white mb-2">📦 QuickTrack</h1>
          <p className="text-white text-lg">Real-Time Delivery Tracking</p>
        </div>

        {/* Order Form */}
        {step === 'form' && (
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <h2 className="text-2xl font-bold mb-6">Create Delivery Order</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Customer Info */}
              <div className="border-b pb-4 mb-4">
                <h3 className="font-semibold text-lg mb-3">Your Information</h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={formData.customerName}
                      onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={formData.customerEmail}
                      onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={formData.customerPhone}
                    onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Delivery Details */}
              <div>
                <h3 className="font-semibold text-lg mb-3">Delivery Details</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    📍 Pickup Address *
                  </label>
                  <input
                    type="text"
                    value={formData.pickupAddress}
                    onChange={(e) => setFormData({ ...formData, pickupAddress: e.target.value })}
                    placeholder="e.g., 123 Main Street, Lagos"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    🎯 Delivery Address *
                  </label>
                  <input
                    type="text"
                    value={formData.deliveryAddress}
                    onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })}
                    placeholder="e.g., 456 Oak Avenue, Victoria Island"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    📝 Special Instructions (Optional)
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Any special delivery instructions..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>
              </div>

              {/* Estimated Cost */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Estimated Cost:</span>
                  <span className="text-2xl font-bold text-blue-600">
                    ${calculateEstimate().toFixed(2)}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Base fee: $5.00 + $0.50 per km
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
              >
                {loading ? 'Creating Order...' : 'Continue to Payment'}
              </button>
            </form>
          </div>
        )}

        {/* Payment Step */}
        {step === 'payment' && clientSecret && (
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <h2 className="text-2xl font-bold mb-4">Complete Payment</h2>
            <p className="text-gray-600 mb-6">
              Amount: <span className="text-2xl font-bold text-blue-600">${estimatedCost.toFixed(2)}</span>
            </p>

            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <PaymentForm
                onSuccess={handlePaymentSuccess}
                onCancel={() => setStep('form')}
              />
            </Elements>
          </div>
        )}
      </div>
    </div>
  );
}