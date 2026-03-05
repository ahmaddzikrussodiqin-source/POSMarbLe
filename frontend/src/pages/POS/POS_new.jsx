import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { categoriesAPI, productsAPI, ordersAPI, notaAPI } from '../../services/api';
import printerService, { PRINTER_COMMANDS } from '../../services/printerService';
import NativePrint from '../../services/NativePrint';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';

const POS = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
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
  const [todaySales, setTodaySales] = useState([]);
  const [showTodaySalesModal, setShowTodaySalesModal] = useState(false);
  const [loadingTodaySales, setLoadingTodaySales] = useState(false);
  
  // Printer state
  const [selectedPrinter, setSelectedPrinter] = useState(null);
  const [showPrinterModal, setShowPrinterModal] = useState(false);
  const [connectingPrinter, setConnectingPrinter] = useState(false);
  const [bluetoothSupported, setBluetoothSupported] = useState(true);
  const [printerConnected, setPrinterConnected] = useState(false);
  
  // Check if running on Android platform (Capacitor Android app)
  const isAndroid = (() => {
    try {
      if (typeof navigator !== 'undefined' && navigator.userAgent) {
        const ua = navigator.userAgent.toLowerCase();
        if (ua.includes('android') || ua.includes('linux; u; android')) {
          return true;
        }
      }
      const platform = Capacitor.getPlatform();
      if (platform === 'android') {
        return true;
      }
      if (Capacitor.isNativePlatform()) {
        return true;
      }
      if (typeof window !== 'undefined' && window.Capacitor) {
        const cap = window.Capacitor;
        if (cap.getPlatform && cap.getPlatform() === 'android') {
          return true;
        }
        if (cap.isNativePlatform && cap.isNativePlatform()) {
          return true;
        }
      }
    } catch (e) {
      console.log('Platform check error:', e);
    }
    return false;
  })();

  console.log('Platform detection - isAndroid:', isAndroid, 'Capacitor platform:', Capacitor.getPlatform());

  // Handle hardware back button on Android
  const handleBackButton = useCallback(() => {
    if (showTodaySalesModal) {
      setShowTodaySalesModal(false);
      return;
    }
    if (showReceipt) {
      setShowReceipt(null);
      return;
    }
    if (showMenuModal) {
      setShowMenuModal(false);
      return;
    }
    if (selectedProduct) {
      setSelectedProduct(null);
      return;
    }
  }, [showTodaySalesModal, showReceipt, showMenuModal, selectedProduct]);

  useEffect(() => {
    if (isAndroid && CapacitorApp) {
      const removeListener = CapacitorApp.addListener('backButton', handleBackButton);
      return () => {
        removeListener.then(fn => fn());
      };
    }
  }, [isAndroid, handleBackButton]);

  // Handle browser back button (fallback for hybrid apps)
  useEffect(() => {
    const handlePopState = () => {
      if (showTodaySalesModal) {
        setShowTodaySalesModal(false);
      } else if (showReceipt) {
        setShowReceipt(null);
      } else if (showMenuModal) {
        setShowMenuModal(false);
      } else if (selectedProduct) {
        setSelectedProduct(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [showTodaySalesModal, showReceipt, showMenuModal, selectedProduct]);

  // Nota settings state
  const [notaSettings, setNotaSettings] = useState({
    shop_name: 'POSMarbLe',
    address: '',
    phone: '',
    footer_text: 'Terima kasih telah belanja di toko kami!',
    show_logo: true,
    show_qr_code: false,
    tax_rate: 0,
    currency: 'IDR',
    logo: null,
  });

  useEffect(() => {
    loadData();
    loadNotaSettings();
  }, []);

  // Check Bluetooth support and load saved printer
  useEffect(() => {
    const btSupported = printerService.isBluetoothSupported();
    setBluetoothSupported(btSupported);
    console.log('Bluetooth supported:', btSupported);
    
    const savedPrinter = localStorage.getItem('selectedPrinter');
    if (savedPrinter) {
      try {
        const printer = JSON.parse(savedPrinter);
        setSelectedPrinter(printer);
      } catch (e) {
        console.error('Error loading saved printer:', e);
      }
    }
  }, []);

  const loadNotaSettings = async () => {
    try {
      const res = await notaAPI.get();
      setNotaSettings(res.data);
    } catch (error) {
      console.error('Error loading nota settings:', error);
    }
  };

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

  const formatCurrency = (amount, currency = 'IDR') => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const calculateTax = (amount, taxRate) => {
    return Math.round(amount * (taxRate / 100));
  };

  // Printer handlers
  const handleConnectPrinter = async () => {
    setConnectingPrinter(true);
    try {
      const result = await printerService.connectToPrinter();
      setSelectedPrinter(result);
      setPrinterConnected(true);
      localStorage.setItem('selectedPrinter', JSON.stringify(result));
      alert('Printer terhubung: ' + result.name);
    } catch (error) {
      console.error('Error connecting to printer:', error);
      alert('Gagal menghubungkan printer: ' + (error.message || 'Tidak diketahui'));
    } finally {
      setConnectingPrinter(false);
    }
  };

  const handleDisconnectPrinter = async () => {
    try {
      await printerService.disconnect();
      setPrinterConnected(false);
      setSelectedPrinter(null);
      localStorage.removeItem('selectedPrinter');
    } catch (error) {
      console.error('Error disconnecting printer:', error);
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

  // Handle print receipt - using NativePrint for better Android compatibility
  const handlePrint = async () => {
    // First, try Bluetooth printing if connected
    if (printerConnected && selectedPrinter) {
      try {
        const receiptData = {
          notaSettings,
          showReceipt,
          paymentMethod: showReceipt.payment_method,
          calculateTax
        };
        await printerService.printReceipt(receiptData);
        
        alert('Nota berhasil dicetak!');
        setShowReceipt(null);
        return;
      } catch (error) {
        console.error('Bluetooth print failed:', error);
        alert('Gagal cetak ke printer Bluetooth');
      }
    }
    
    // Use NativePrint for better Android WebView compatibility
    try {
      const printData = {
        notaSettings,
        showReceipt,
        calculateTax
      };
      
      const htmlContent = NativePrint.generatePrintHTML(printData);
      await NativePrint.print(htmlContent, 'Nota - ' + showReceipt.order_number);
      
    } catch (error) {
      console.error('Print error:', error);
      alert('Gagal membuka dialog print: ' + error.message);
    }
  };

  const loadTodaySales = async () => {
    setLoadingTodaySales(true);
    try {
      const res = await ordersAPI.getToday();
      setTodaySales(res.data);
    } catch (error) {
      console.error('Error loading today sales:', error);
      alert('Gagal memuat penjualan hari ini');
    } finally {
      setLoadingTodaySales(false);
    }
  };

  const handlePrintTodaySales = async () => {
    await loadTodaySales();
    setShowTodaySalesModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100">
        <div className="text-2xl text-amber-700 font-semibold animate-pulse">Memuat...</div>
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
          
          <button
            onClick={() => setShowPrinterModal(true)}
            className={`ml-3 flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all ${
              printerConnected 
                ? 'bg-green-50 border-green-500 text-green-700' 
                : 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100'
            }`}
            title={selectedPrinter ? `Printer: ${selectedPrinter.name}` : 'Pilih Printer'}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span className="text-sm font-medium">
              {selectedPrinter ? selectedPrinter.name.substring(0, 12) + (selectedPrinter.name.length > 12 ? '...' : '') : 'Printer'}
            </span>
            {printerConnected && (
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            )}
          </button>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={handlePrintTodaySales}
            className="bg-green-100 text-green-700 px-4 py-2 rounded-lg hover:bg-green-200 transition flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Cetak Hari Ini
          </button>
          {isAdmin && !isAndroid && (
            <button
              onClick={() => navigate('/admin')}
              className="bg-amber-100 text-amber-700 px-4 py-2 rounded-lg hover:bg-amber-200 transition flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Admin
            </button>
          )}
          <div className="text-right">
            <p className="text-sm font-medium text-gray-700">{user?.name}</p>
            <p className="text-xs text-gray-500">Kasir</p>
          </div>
          <button
            onClick={() => { logout(); window.location.href = '/'; }}
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
          <div className="mb-6">
            <div className="relative mb-4">
              <input
                type="text"
                placeholder="Cari produk favorit Anda..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-5 py-3 bg-white border-0 rounded-2xl shadow-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none text-gray-700"
              />
              <svg className="w-5 h-5 text-gray-500 absolute right-4 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

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
                    <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium text-white ${stockStatus.color}`}>
                      {stockStatus.label}
                    </div>
                    {outOfStock && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                        <span className="text-white font-bold text-lg">HABIS</span>
                      </div>
                    )}
                  </div>
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

        {/* Cart Section */}
        <div className="w-96 bg-white shadow-2xl flex flex-col">
          <div className="p-5 border-b bg-gradient-to-r from-amber-500 to-orange-500 text-white">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold">Keranjang</h2>
                <p className="text-white text-sm opacity-90">{cartItemCount} item</p>
              </div>
              <div className="bg-white px-4 py-2 rounded-xl border-2 border-gray-200">
                <span className="text-2xl font-bold" style={{color: '#000000'}}>{formatCurrency(cartTotal)}</span>
              </div>
          </div>

          <div className="flex-1 overflow-auto p-4">
            {cart.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🛒</div>
                <p className="text-gray-500">Keranjang masih kosong</p>
                <p className="text-gray-500 text-sm">Pilih menu untuk memulai</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map((item) => (
                  <div key={item.id} className="bg-gradient-to-r from-gray-50 to-white p-3 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex gap-3">
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl">☕</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-800 truncate">{item.name}</h4>
                        <p className="text-amber-600 font-medium text-sm">{formatCurrency(item.price)}</p>
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
                ))}
              </div>
            )}
          </div>

          <div className="p-4 border-t bg-gray-50">
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

      {/* Product Quantity Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl p-4 sm:p-6 max-w-sm w-full max-h-[85vh] sm:max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sm:hidden flex justify-center mb-2">
              <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
            
            <div className="text-center mb-4 sm:mb-6">
              <div className="w-24 h-24 sm:w-32 sm:h-32 mx-auto rounded-2xl overflow-hidden bg-gray-100 mb-3 sm:mb-4">
                {selectedProduct.image_url ? (
                  <img src={selectedProduct.image_url} alt={selectedProduct.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl sm:text-6xl">☕</div>
                )}
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-800">{selectedProduct.name}</h3>
              <p className="text-amber-600 font-bold text-lg sm:text-xl">{formatCurrency(selectedProduct.price)}</p>
              <p className="text-sm text-gray-500">
                Stok: {selectedProduct.has_ingredients ? selectedProduct.calculated_stock : selectedProduct.stock}
              </p>
            </div>

            <div className="flex items-center justify-center gap-4 sm:gap-6 mb-4 sm:mb-6">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-12 h-12 sm:w-14 sm:h-14 bg-gray-100 rounded-full hover:bg-gray-200 flex items-center justify-center text-xl sm:text-2xl font-bold"
              >
                -
              </button>
              <span className="text-3xl sm:text-4xl font-bold w-16 sm:w-20 text-center">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-12 h-12 sm:w-14 sm:h-14 bg-amber-500 rounded-full hover:bg-amber-600 flex items-center justify-center text-xl sm:text-2xl font-bold text-white"
              >
                +
              </button>
            </div>

            <div className="text-center mb-4 sm:mb-6">
              <p className="text-gray-500 text-sm sm:text-base">Total</p>
              <p className="text-2xl sm:text-3xl font-bold text-amber-700">{formatCurrency(selectedProduct.price * quantity)}</p>
            </div>

            <div className="flex gap-3 mt-auto">
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
      )}

      {/* Receipt Modal */}
      {showReceipt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-white rounded-3xl p-0 max-w-md w-full shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-4 sm:p-6 text-white text-center flex-shrink-0">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3">
                <span style={{color: '#16a34a', fontSize: '1.5rem', fontWeight: 'bold'}}>✓</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold">Pembayaran Berhasil!</h2>
              <p className="text-emerald-100 text-sm">Terima kasih telah berbelanja</p>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
              <div className="border-b-2 border-dashed border-gray-200 pb-4 mb-4">
                {notaSettings.show_logo && (
                  <div className="text-center mb-3">
                    {notaSettings.logo ? (
                      <img src={notaSettings.logo} alt="Logo" className="h-12 sm:h-16 w-auto object-contain mx-auto" />
                    ) : (
                      <span className="text-3xl sm:text-4xl">🏪</span>
                    )}
                  </div>
                )}
                <div className="text-center mb-2">
                  <h3 className="font-bold text-lg text-gray-800">{notaSettings.shop_name || 'Toko'}</h3>
                </div>
                {notaSettings.address && (
                  <div className="text-center">
                    <p className="text-sm text-gray-600">{notaSettings.address}</p>
                  </div>
                )}
                {notaSettings.phone && (
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Telp: {notaSettings.phone}</p>
                  </div>
                )}
                <div className="text-center mt-4 pt-3 border-t border-dashed border-gray-200">
                  <p className="text-gray-500 text-xs">Nomor Pesanan</p>
                  <p className="font-bold text-lg sm:text-xl text-amber-700">{showReceipt.order_number}</p>
                </div>

              <div className="space-y-2 mb-4 max-h-40 overflow-y-auto">
                {showReceipt.items.map((item, index) => (
                  <div key={index} className="flex justify-between text-gray-700 text-sm">
                    <div>
                      <span className="font-medium">{item.product_name}</span>
                      <span className="text-gray-500 ml-2">x{item.quantity}</span>
                    </div>
                    <span className="font-medium">{formatCurrency(item.subtotal, notaSettings.currency)}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">Subtotal</span>
                <span className="text-gray-700">{formatCurrency(showReceipt.total_amount, notaSettings.currency)}</span>
              </div>
              
              {notaSettings.tax_rate > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">Pajak ({notaSettings.tax_rate}%)</span>
                  <span className="text-gray-700">
                    {formatCurrency(calculateTax(showReceipt.total_amount, notaSettings.tax_rate), notaSettings.currency)}
                  </span>
                </div>
              )}
              
              <div className="flex justify-between items-center py-3">
                <span className="text-lg font-bold text-gray-800">Total</span>
                <div className="text-right">
                  {notaSettings.tax_rate > 0 && (
                    <span className="text-xs text-gray-500 block">
                      Termasuk pajak {notaSettings.tax_rate}%
                    </span>
                  )}
                  <span className="text-xl sm:text-2xl font-bold text-amber-700">
                    {formatCurrency(
                      notaSettings.tax_rate > 0 
                        ? showReceipt.total_amount + calculateTax(showReceipt.total_amount, notaSettings.tax_rate)
                        : showReceipt.total_amount, 
                      notaSettings.currency
                    )}
                  </span>
                </div>

              <div className="bg-gray-50 rounded-xl p-3 text-center mt-4">
                <p className="text-sm text-gray-500">Metode Pembayaran</p>
                <p className="font-bold text-gray-800 capitalize">
                  {showReceipt.payment_method === 'cash' ? 'Tunai' : showReceipt.payment_method === 'qris' ? 'QRIS' : 'Kartu Debit'}
                </p>
              </div>

              <div className="text-center mt-6 pt-3 border-t border-gray-100">
                <p className="text-amber-600 font-medium">{notaSettings.shop_name || 'Toko'}</p>
                <p className="text-gray-500 text-sm">{notaSettings.footer_text || 'Terima kasih atas kunjungan Anda!'}</p>
              </div>

            <div className="p-3 sm:p-4 bg-gray-50 flex gap-2 sm:gap-3 flex-shrink-0">
              <button
                onClick={handlePrint}
                className="flex-1 py-2.5 sm:py-3 bg-white border-2 border-amber-500 text-amber-600 rounded-xl font-bold hover:bg-amber-50 transition flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print
              </button>
              <button
                onClick={() => setShowReceipt(null)}
                className="flex-1 py-2.5 sm:py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold hover:from-amber-600 hover:to-orange-600 transition text-sm sm:text-base"
              >
                Selesai
              </button>
            </div>
        </div>
      )}

      {/* Menu Modal */}
      {showMenuModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-0 max-w-lg w-full shadow-2xl overflow-hidden">
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
                    <p className="text-white text-sm opacity-90">Panduan Penggunaan POS</p>
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

            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Cara Menggunakan POS:</h3>
              <div className="space-y-4">
                <div className="flex gap-4 items-start">
                  <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-amber-600 font-bold">1</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-800">Pilih Produk</h4>
                    <p className="text-gray-500 text-sm">Pilih produk yang akan dibeli.</p>
                  </div>
                <div className="flex gap-4 items-start">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-orange-600 font-bold">2</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-800">Tambah ke Keranjang</h4>
                    <p className="text-gray-500 text-sm">Atur jumlah produk.</p>
                  </div>
                <div className="flex gap-4 items-start">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-red-600 font-bold">3</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-800">Pembayaran</h4>
                    <p className="text-gray-500 text-sm">Pilih metode pembayaran.</p>
                  </div>
                <div className="flex gap-4 items-start">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-green-600 font-bold">4</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-800">Cetak Nota</h4>
                    <p className="text-gray-500 text-sm">Cetak nota sebagai bukti.</p>
                  </div>
              </div>

            <div className="p-4 bg-gray-50">
              <button
                onClick={() => setShowMenuModal(false)}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold hover:from-amber-600 hover:to-orange-600 transition"
              >
                Mengerti
              </button>
            </div>
        </div>
      )}

      {/* Today's Sales Modal */}
      {showTodaySalesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-0 max-w-2xl w-full shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-white flex-shrink-0">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">Penjualan Hari Ini</h2>
                  <p className="text-white text-sm opacity-90">
                    {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
                <button
                  onClick={() => setShowTodaySalesModal(false)}
                  className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center hover:bg-opacity-30 transition"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

            <div className="p-6 flex-1 overflow-auto">
              {loadingTodaySales ? (
                <div className="text-center py-8">
                  <div className="animate-spin w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-gray-500">Memuat data...</p>
                </div>
              ) : todaySales.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">📊</div>
                  <p className="text-gray-500 text-lg">Belum ada transaksi hari ini</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-blue-50 rounded-xl p-4 text-center">
                      <p className="text-blue-600 text-sm font-medium">Transaksi</p>
                      <p className="text-2xl font-bold text-blue-700">{todaySales.length}</p>
                    </div>
                    <div className="bg-green-50 rounded-xl p-4 text-center">
                      <p className="text-green-600 text-sm font-medium">Item Terjual</p>
                      <p className="text-2xl font-bold text-green-700">
                        {todaySales.reduce((sum, order) => sum + order.items.reduce((s, item) => s + item.quantity, 0), 0)}
                      </p>
                    </div>
                    <div className="bg-amber-50 rounded-xl p-4 text-center">
                      <p className="text-amber-600 text-sm font-medium">Total</p>
                      <p className="text-2xl font-bold text-amber-700">
                        {formatCurrency(todaySales.reduce((sum, order) => sum + order.total_amount, 0), notaSettings.currency)}
                      </p>
                    </div>
                </>
              )}
            </div>

            <div className="p-4 bg-gray-50 flex-shrink-0">
              <button
                onClick={() => setShowTodaySalesModal(false)}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold hover:from-amber-600 hover:to-orange-600 transition"
              >
                Tutup
              </button>
            </div>
        </div>
      )}

      {/* Printer Selection Modal */}
      {showPrinterModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-0 max-w-sm w-full shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 text-white">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold">Pilih Printer</h2>
                  <p className="text-white text-sm opacity-90">Koneksi Bluetooth</p>
                </div>
                <button
                  onClick={() => setShowPrinterModal(false)}
                  className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center hover:bg-opacity-30 transition"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

            <div className="p-6">
              {!bluetoothSupported ? (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                  <div className="flex gap-3">
                    <div className="text-2xl">⚠️</div>
                    <div>
                      <p className="text-red-800 font-medium text-sm">Bluetooth Tidak Didukung</p>
                      <p className="text-red-600 text-xs">Gunakan browser print untuk mencetak</p>
                    </div>
                </div>
              ) : (
                <>
                  {printerConnected && selectedPrinter ? (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                            <span className="text-green-600">✓</span>
                          </div>
                          <div>
                            <p className="text-green-800 font-medium text-sm">Printer Terhubung</p>
                            <p className="text-green-600 text-xs">{selectedPrinter.name}</p>
                          </div>
                        <button
                          onClick={handleDisconnectPrinter}
                          className="text-red-500 hover:text-red-700 text-sm font-medium"
                        >
                          Putus
                        </button>
                      </div>
                  ) : null}

                  <button
                    onClick={handleConnectPrinter}
                    disabled={connectingPrinter}
                    className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-bold hover:from-blue-600 hover:to-indigo-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {connectingPrinter ? (
                      <>
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Menghubungkan...
                      </>
                    ) : (
                      <>
