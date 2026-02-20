import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { categoriesAPI, productsAPI, ordersAPI } from '../../services/api';

const POS = () => {
  const { user, logout } = useAuth();
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [todayOrders, setTodayOrders] = useState([]);
  const [showReceipt, setShowReceipt] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [categoriesRes, productsRes, ordersRes] = await Promise.all([
        categoriesAPI.getAll(),
        productsAPI.getAll({ available: true }),
        ordersAPI.getToday(),
      ]);
      setCategories(categoriesRes.data);
      setProducts(productsRes.data);
      setTodayOrders(ordersRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter((product) => {
    const matchesCategory = selectedCategory ? product.category_id === selectedCategory : true;
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const addToCart = (product) => {
    const existingItem = cart.find((item) => item.id === product.id);
    if (existingItem) {
      setCart(
        cart.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      );
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter((item) => item.id !== productId));
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
    } else {
      setCart(
        cart.map((item) =>
          item.id === productId ? { ...item, quantity } : item
        )
      );
    }
  };

  const cartTotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    
    setProcessing(true);
    try {
      const orderData = {
        items: cart.map((item) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
        payment_method: paymentMethod,
      };

      const response = await ordersAPI.create(orderData);
      setShowReceipt(response.data);
      setCart([]);
      // Refresh today's orders
      const ordersRes = await ordersAPI.getToday();
      setTodayOrders(ordersRes.data);
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to process order');
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-2xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-amber-700 text-white px-6 py-4 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">POSMarbLe</h1>
          <span className="text-amber-200">|</span>
          <span className="text-amber-200">Point of Sale</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm">Kasir: {user?.name}</span>
          <button
            onClick={logout}
            className="bg-amber-800 px-4 py-2 rounded-lg hover:bg-amber-900 transition"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Products Section */}
        <div className="flex-1 p-6 overflow-auto">
          {/* Categories */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-4 py-2 rounded-full whitespace-nowrap transition ${
                selectedCategory === null
                  ? 'bg-amber-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-amber-50'
              }`}
            >
              Semua
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-full whitespace-nowrap transition ${
                  selectedCategory === category.id
                    ? 'bg-amber-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-amber-50'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Cari produk..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
            />
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                disabled={!product.is_available || (product.has_ingredients ? product.calculated_stock <= 0 : product.stock <= 0)}
                className={`bg-white p-4 rounded-xl shadow hover:shadow-lg transition flex flex-col items-center text-center ${
                  !product.is_available || (product.has_ingredients ? product.calculated_stock <= 0 : product.stock <= 0)
                    ? 'opacity-50 cursor-not-allowed'
                    : ''
                }`}
              >
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-2">
                  <span className="text-2xl">☕</span>
                </div>
                <h3 className="font-semibold text-gray-800 mb-1">{product.name}</h3>
                <p className="text-amber-600 font-bold">{formatCurrency(product.price)}</p>
                {product.has_ingredients ? (
                  <span className={`text-xs mt-1 ${product.calculated_stock <= 3 ? 'text-red-500' : 'text-green-600'}`}>
                    Stok: {product.calculated_stock}
                  </span>
                ) : (
                  product.stock > 0 && product.stock <= 5 && (
                    <span className="text-xs text-red-500 mt-1">Stok: {product.stock}</span>
                  )
                )}
                {product.has_ingredients && product.calculated_stock === 0 && (
                  <span className="text-xs text-red-600 mt-1 font-semibold">Habis</span>
                )}
              </button>
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              Tidak ada produk ditemukan
            </div>
          )}
        </div>

        {/* Cart Section */}
        <div className="w-96 bg-white shadow-xl flex flex-col">
          <div className="p-4 border-b">
            <h2 className="text-xl font-bold text-gray-800">Keranjang</h2>
            <p className="text-sm text-gray-500">{cart.length} item</p>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-auto p-4">
            {cart.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                Keranjang kosong
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map((item) => (
                  <div key={item.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-800">{item.name}</h4>
                      <p className="text-amber-600 text-sm">{formatCurrency(item.price)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-8 h-8 bg-gray-200 rounded-full hover:bg-gray-300"
                      >
                        -
                      </button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-8 h-8 bg-gray-200 rounded-full hover:bg-gray-300"
                      >
                        +
                      </button>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-red-500 hover:text-red-700 ml-2"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payment Section */}
          <div className="p-4 border-t bg-gray-50">
            <div className="flex justify-between mb-4">
              <span className="text-lg font-semibold">Total:</span>
              <span className="text-2xl font-bold text-amber-700">{formatCurrency(cartTotal)}</span>
            </div>

            {/* Payment Method */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Metode Pembayaran
              </label>
              <div className="flex gap-2">
                {['cash', 'qris', 'debit'].map((method) => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                      paymentMethod === method
                        ? 'bg-amber-600 text-white'
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {method === 'cash' ? 'Tunai' : method === 'qris' ? 'QRIS' : 'Debit'}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleCheckout}
              disabled={cart.length === 0 || processing}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? 'Memproses...' : 'Bayar'}
            </button>
          </div>
        </div>
      </div>

      {/* Receipt Modal */}
      {showReceipt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-amber-700">POSMarbLe</h2>
              <p className="text-gray-500">Terima kasih!</p>
            </div>
            
            <div className="border-t border-b py-4 mb-4">
              <p className="text-sm text-gray-500">Nomor Pesanan</p>
              <p className="font-bold text-lg">{showReceipt.order_number}</p>
              
              <div className="mt-4 space-y-2">
                {showReceipt.items.map((item, index) => (
                  <div key={index} className="flex justify-between">
                    <span className="text-gray-600">
                      {item.product_name} x{item.quantity}
                    </span>
                    <span>{formatCurrency(item.subtotal)}</span>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 pt-4 border-t flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="text-amber-700">{formatCurrency(showReceipt.total_amount)}</span>
              </div>
              
              <p className="mt-2 text-sm text-gray-500 capitalize">
                Metode: {showReceipt.payment_method}
              </p>
            </div>
            
            <button
              onClick={() => setShowReceipt(null)}
              className="w-full bg-amber-600 text-white py-3 rounded-lg font-bold hover:bg-amber-700"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default POS;

