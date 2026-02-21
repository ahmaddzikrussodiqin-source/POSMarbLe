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
  const [showReceipt, setShowReceipt] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [showMenuModal, setShowMenuModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [categoriesRes, productsRes] = await Promise.all([
        categoriesAPI.getAll(),
        productsAPI.getAll({ available: true }),
      ]);
      setCategories(categoriesRes.data);
      setProducts(productsRes.data);
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

  const getStockStatus = (product) => {
    const stock = product.has_ingredients ? product.calculated_stock : product.stock;
    if (stock === 0) return { label: 'Habis', color: 'bg-red-500' };
    if (stock <= 3) return { label: `Tersisa ${stock}`, color: 'bg-red-400' };
    return { label: `Stok: ${stock}`, color: 'bg-green-500' };
  };

  const isOutOfStock = (product) => {
    const stock = product.has_ingredients ? product.calculated_stock : product.stock;
    return stock <= 0;
  };

  const handleProductClick = (product) => {
    if (isOutOfStock(product)) return;
    setSelectedProduct(product);
    setQuantity(1);
  };

  const addToCart = () => {
    if (!selectedProduct) return;
    
    const existingItem = cart.find((item) => item.id === selectedProduct.id);
    if (existingItem) {
      setCart(
        cart.map((item) =>
          item.id === selectedProduct.id 
            ? { ...item, quantity: item.quantity + quantity } 
            : item
        )
      );
    } else {
      setCart([...cart, { ...selectedProduct, quantity }]);
    }
    setSelectedProduct(null);
    setQuantity(1);
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
  const cartItemCount = cart.reduce((count, item) => count + item.quantity, 0);

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
    } catch (error) {
      alert(error.response?.data?.error || 'Gagal memproses pesanan');
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100">
        <div className="text-2xl text-amber-700 font-semibold animate-pulse">Memuat...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-md px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-xl">M</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">POSMarbLe</h1>
            <p className="text-xs text-gray-500">Point of Sale</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-700">{user?.name}</p>
            <p className="text-xs text-gray-500">Kasir</p>
          </div>
          <button
            onClick={logout}
            className="bg-gray-100 p-2 rounded-lg hover:bg-gray-200 transition"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Products Section */}
        <div className="flex-1 p-6 overflow-auto">
          {/* Search and Categories */}
          <div className="mb-6">
            <div className="relative mb-4">
              <input
                type="text"
                placeholder="Cari produk favorit Anda..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-5 py-3 bg-white border-0 rounded-2xl shadow-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none text-gray-700"
              />
              <svg className="w-5 h-5 text-gray-400 absolute right-4 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Categories */}
            <div className="flex gap-3 overflow-x-auto pb-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-5 py-2 rounded-full whitespace-nowrap transition-all shadow-sm ${
                  selectedCategory === null
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                    : 'bg-white text-gray-700 hover:bg-amber-50'
                }`}
              >
                Semua Menu
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-5 py-2 rounded-full whitespace-nowrap transition-all shadow-sm ${
                    selectedCategory === category.id
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                      : 'bg-white text-gray-700 hover:bg-amber-50'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>

          {/* Products Grid - Restaurant Menu Style */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
            {filteredProducts.map((product) => {
              const stockStatus = getStockStatus(product);
              const outOfStock = isOutOfStock(product);
              
              return (
                <button
                  key={product.id}
                  onClick={() => handleProductClick(product)}
                  disabled={outOfStock}
                  className={`bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden group ${
                    outOfStock ? 'opacity-60 cursor-not-allowed' : 'hover:-translate-y-1'
                  }`}
                >
                  {/* Product Image */}
                  <div className="relative h-36 bg-gray-100 overflow-hidden">
                    {product.image_url ? (
                      <img 
                        src={product.image_url} 
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-100 to-orange-100">
                        <span className="text-5xl">☕</span>
                      </div>
                    )}
                    {/* Stock Badge */}
                    <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium text-white ${stockStatus.color}`}>
                      {stockStatus.label}
                    </div>
                    {outOfStock && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                        <span className="text-white font-bold text-lg">HABIS</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Product Info */}
                  <div className="p-3">
                    <h3 className="font-bold text-gray-800 mb-1 truncate">{product.name}</h3>
                    <p className="text-amber-600 font-bold text-lg">{formatCurrency(product.price)}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">😔</div>
              <p className="text-gray-500 text-lg">Produk tidak ditemukan</p>
            </div>
          )}

          {/* Menu Button - Below Products */}
          <div className="mt-8 flex justify-center">
            <button
              onClick={() => setShowMenuModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold shadow-lg hover:from-amber-600 hover:to-orange-600 transition-all transform hover:scale-105"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Menu
            </button>
          </div>
        </div>

        {/* Cart Section - Modern POS Style */}
        <div className="w-96 bg-white shadow-2xl flex flex-col">
          <div className="p-5 border-b bg-gradient-to-r from-amber-500 to-orange-500 text-white">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold">Keranjang</h2>
                <p className="text-amber-100 text-sm">{cartItemCount} item</p>
              </div>
              <div className="bg-white bg-opacity-20 px-4 py-2 rounded-xl">
                <span className="text-2xl font-bold">{formatCurrency(cartTotal)}</span>
              </div>
            </div>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-auto p-4">
            {cart.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🛒</div>
                <p className="text-gray-500">Keranjang masih kosong</p>
                <p className="text-gray-400 text-sm">Pilih menu untuk memulai</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map((item) => (
                  <div key={item.id} className="bg-gradient-to-r from-gray-50 to-white p-3 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex gap-3">
                      {/* Thumbnail */}
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl">☕</div>
                        )}
                      </div>
                      
                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-800 truncate">{item.name}</h4>
                        <p className="text-amber-600 font-medium text-sm">{formatCurrency(item.price)}</p>
                        
                        {/* Quantity Controls */}
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="w-7 h-7 bg-gray-200 rounded-full hover:bg-gray-300 flex items-center justify-center"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                            </svg>
                          </button>
                          <span className="w-8 text-center font-bold">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="w-7 h-7 bg-gray-200 rounded-full hover:bg-gray-300 flex items-center justify-center"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      
                      {/* Remove & Subtotal */}
                      <div className="flex flex-col items-end justify-between">
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="text-red-400 hover:text-red-600 p-1"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                        <span className="font-bold text-gray-800">{formatCurrency(item.price * item.quantity)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payment Section */}
          <div className="p-4 border-t bg-gray-50">
            {/* Payment Method */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Metode Pembayaran
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'cash', label: 'Tunai', icon: '💵' },
                  { id: 'qris', label: 'QRIS', icon: '📱' },
                  { id: 'debit', label: 'Debit', icon: '💳' }
                ].map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id)}
                    className={`py-3 rounded-xl text-sm font-medium transition-all ${
                      paymentMethod === method.id
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md'
                        : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="block text-lg mb-1">{method.icon}</span>
                    {method.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleCheckout}
              disabled={cart.length === 0 || processing}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-4 rounded-xl font-bold text-lg hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {processing ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Memproses...
                </>
              ) : (
                <>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Bayar Sekarang
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Product Quantity Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-32 h-32 mx-auto rounded-2xl overflow-hidden bg-gray-100 mb-4">
                {selectedProduct.image_url ? (
                  <img src={selectedProduct.image_url} alt={selectedProduct.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-6xl">☕</div>
                )}
              </div>
              <h3 className="text-2xl font-bold text-gray-800">{selectedProduct.name}</h3>
              <p className="text-amber-600 font-bold text-xl">{formatCurrency(selectedProduct.price)}</p>
              <p className="text-sm text-gray-500">
                Stok: {selectedProduct.has_ingredients ? selectedProduct.calculated_stock : selectedProduct.stock}
              </p>
            </div>

            {/* Quantity Picker */}
            <div className="flex items-center justify-center gap-6 mb-6">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-14 h-14 bg-gray-100 rounded-full hover:bg-gray-200 flex items-center justify-center text-2xl font-bold"
              >
                -
              </button>
              <span className="text-4xl font-bold w-20 text-center">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-14 h-14 bg-amber-500 rounded-full hover:bg-amber-600 flex items-center justify-center text-2xl font-bold text-white"
              >
                +
              </button>
            </div>

            <div className="text-center mb-6">
              <p className="text-gray-500">Total</p>
              <p className="text-3xl font-bold text-amber-700">{formatCurrency(selectedProduct.price * quantity)}</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setSelectedProduct(null)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition"
              >
                Batal
              </button>
              <button
                onClick={addToCart}
                className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold hover:from-amber-600 hover:to-orange-600 transition"
              >
                Tambah ke Keranjang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal - Beautiful Receipt Style */}
      {showReceipt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-0 max-w-md w-full shadow-2xl overflow-hidden">
            {/* Receipt Header */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white text-center">
              <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-3xl">✓</span>
              </div>
              <h2 className="text-2xl font-bold">Pembayaran Berhasil!</h2>
              <p className="text-amber-100">Terima kasih telah berbelanja</p>
            </div>

            {/* Receipt Body */}
            <div className="p-6">
              <div className="border-b-2 border-dashed border-gray-200 pb-4 mb-4">
                <div className="text-center mb-4">
                  <p className="text-gray-500 text-sm">Nomor Pesanan</p>
                  <p className="font-bold text-2xl text-amber-700">{showReceipt.order_number}</p>
                </div>
                
                <div className="space-y-2">
                  {showReceipt.items.map((item, index) => (
                    <div key={index} className="flex justify-between text-gray-700">
                      <div>
                        <span className="font-medium">{item.product_name}</span>
                        <span className="text-gray-400 ml-2">x{item.quantity}</span>
                      </div>
                      <span className="font-medium">{formatCurrency(item.subtotal)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <span className="text-gray-600">Subtotal</span>
                <span className="text-gray-700">{formatCurrency(showReceipt.total_amount)}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <span className="text-gray-600">Pajak (0%)</span>
                <span className="text-gray-700">Rp 0</span>
              </div>
              <div className="flex justify-between items-center py-4">
                <span className="text-lg font-bold text-gray-800">Total</span>
                <span className="text-2xl font-bold text-amber-700">{formatCurrency(showReceipt.total_amount)}</span>
              </div>

              <div className="bg-gray-50 rounded-xl p-3 text-center mt-4">
                <p className="text-sm text-gray-500">Metode Pembayaran</p>
                <p className="font-bold text-gray-800 capitalize">
                  {showReceipt.payment_method === 'cash' ? 'Tunai' : showReceipt.payment_method === 'qris' ? 'QRIS' : 'Kartu Debit'}
                </p>
              </div>

              {/* Footer Message */}
              <div className="text-center mt-6 pt-4 border-t border-gray-100">
                <p className="text-amber-600 font-medium">POSMarbLe</p>
                <p className="text-gray-400 text-sm">Harapan terbaik untuk hari Anda!</p>
              </div>
            </div>

            <div className="p-4 bg-gray-50">
              <button
                onClick={() => setShowReceipt(null)}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold hover:from-amber-600 hover:to-orange-600 transition"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Menu Modal - Information about POS Workflow */}
      {showMenuModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-0 max-w-lg w-full shadow-2xl overflow-hidden">
            {/* Menu Header */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Menu</h2>
                    <p className="text-amber-100 text-sm">Panduan Penggunaan POS</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowMenuModal(false)}
                  className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center hover:bg-opacity-30 transition"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Menu Body - Workflow Steps */}
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Cara Menggunakan POS:</h3>
              
              <div className="space-y-4">
                {/* Step 1 */}
                <div className="flex gap-4 items-start">
                  <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-amber-600 font-bold">1</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-800">Pilih Produk</h4>
                    <p className="text-gray-500 text-sm">Ketika ada pembeli, kasir memilih produk yang akan dibeli oleh pembeli dari daftar menu yang tersedia.</p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex gap-4 items-start">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-orange-600 font-bold">2</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-800">Tambah ke Keranjang</h4>
                    <p className="text-gray-500 text-sm">Produk yang dipilih akan masuk ke keranjang. Kasir dapat mengatur jumlah produk sesuai pesanan.</p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex gap-4 items-start">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-red-600 font-bold">3</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-800">Pembayaran</h4>
                    <p className="text-gray-500 text-sm">Kasir memilih metode pembayaran (Tunai, QRIS, atau Debit) dan menyelesaikan pembayaran.</p>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="flex gap-4 items-start">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-green-600 font-bold">4</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-800">Cetak Nota</h4>
                    <p className="text-gray-500 text-sm">Setelah pembayaran berhasil, sistem akan otomatis mencetak nota sebagai bukti transaksi.</p>
                  </div>
                </div>
              </div>

              {/* Info Box */}
              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex gap-3">
                  <div className="text-2xl">💡</div>
                  <div>
                    <p className="text-blue-800 font-medium text-sm">Tips:</p>
                    <p className="text-blue-600 text-sm">Gunakan fitur pencarian untuk menemukan produk dengan cepat.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Menu Footer */}
            <div className="p-4 bg-gray-50">
              <button
                onClick={() => setShowMenuModal(false)}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold hover:from-amber-600 hover:to-orange-600 transition"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default POS;
