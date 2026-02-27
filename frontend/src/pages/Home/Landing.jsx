import { Link } from 'react-router-dom';

const Landing = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md shadow-sm fixed w-full z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex-shrink-0">
              <h1 className="text-2xl font-bold text-amber-700">POSMarbLe</h1>
            </div>
            <div className="flex space-x-4">
              <Link
                to="/login"
                className="text-gray-700 hover:text-amber-700 px-3 py-2 rounded-md font-medium transition"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="bg-amber-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-amber-700 transition"
              >
                Register
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Sistem POS untuk Cafe Anda
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Kelola cafe Anda dengan mudah menggunakan POSMarbLe. Dilengkapi dengan fitur 
              manajemen produk, transaksi, dan laporan lengkap.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/register"
                className="bg-amber-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-amber-700 transition shadow-lg"
              >
                Mulai Sekarang
              </Link>
              <Link
                to="/login"
                className="bg-white text-amber-700 border-2 border-amber-600 px-8 py-4 rounded-xl text-lg font-semibold hover:bg-amber-50 transition shadow-lg"
              >
                Login
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Fitur Utama
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-6 bg-amber-50 rounded-2xl">
              <div className="w-12 h-12 bg-amber-600 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">POS / Kasir</h3>
              <p className="text-gray-600">
                Interface kasir yang intuitif untuk transaksi penjualan cepat dan mudah.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 bg-amber-50 rounded-2xl">
              <div className="w-12 h-12 bg-amber-600 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Laporan Lengkap</h3>
              <p className="text-gray-600">
                Laporan penjualan harian, mingguan, dan bulanan dengan grafik yang mudah dipahami.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 bg-amber-50 rounded-2xl">
              <div className="w-12 h-12 bg-amber-600 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Multi-Platform</h3>
              <p className="text-gray-600">
                Dapat diakses dari desktop, tablet, dan smartphone secara responsif.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-amber-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Keunggulan Kami
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-amber-600 mb-2">✓</div>
              <p className="font-medium text-gray-700">Mudah Digunakan</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-amber-600 mb-2">✓</div>
              <p className="font-medium text-gray-700">Aman & Terpercaya</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-amber-600 mb-2">✓</div>
              <p className="font-medium text-gray-700">Multi-Payment</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-amber-600 mb-2">✓</div>
              <p className="font-medium text-gray-700">Real-time Sync</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-amber-600">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-6">
            Siap Memulai?
          </h2>
          <p className="text-amber-100 text-lg mb-8">
            Daftar sekarang dan kelola cafe Anda dengan lebih mudah.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="bg-white text-amber-700 px-8 py-4 rounded-xl text-lg font-semibold hover:bg-amber-50 transition shadow-lg"
            >
              Daftar Gratis
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h3 className="text-xl font-bold text-amber-500 mb-2">POSMarbLe</h3>
            <p className="text-gray-400">Cafe Management System</p>
            <p className="text-gray-500 text-sm mt-4">
              © 2024 POSMarbLe. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;

