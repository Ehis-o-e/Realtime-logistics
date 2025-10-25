import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
      <div className="text-center text-white px-4">
        <h1 className="text-6xl font-bold mb-4">📦 QuickTrack</h1>
        <p className="text-2xl mb-8">Real-Time Logistics Tracking Platform</p>
        <p className="text-lg mb-12 max-w-2xl mx-auto">
          Track your deliveries in real-time. Professional logistics tracking 
          for businesses of all sizes.
        </p>
        <div className="flex gap-4 justify-center">
          <Link 
            href="/login"
            className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
          >
            Get Started
          </Link>
          <Link 
            href="/track/demo"
            className="bg-transparent border-2 border-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition"
          >
            Track Order
          </Link>
        </div>
        
        <div className="mt-16 grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="bg-white/10 backdrop-blur-md p-6 rounded-lg">
            <div className="text-4xl mb-4">🗺️</div>
            <h3 className="font-semibold mb-2">Real-Time Tracking</h3>
            <p className="text-sm">Watch your delivery move in real-time on the map</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md p-6 rounded-lg">
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="font-semibold mb-2">Instant Notifications</h3>
            <p className="text-sm">Get SMS and email updates at every stage</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md p-6 rounded-lg">
            <div className="text-4xl mb-4">🚀</div>
            <h3 className="font-semibold mb-2">Optimized Routes</h3>
            <p className="text-sm">Smart routing for faster deliveries</p>
          </div>
        </div>
      </div>
    </div>
  );
}