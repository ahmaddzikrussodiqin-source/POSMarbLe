import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { categoriesAPI, productsAPI, ordersAPI, reportsAPI, ingredientsAPI, purchasesAPI, notaAPI } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Chart data states
  const [dailySales, setDailySales] = useState([]);
  const [hourlySales, setHourlySales] = useState([]);
  const [bestSellingProducts, setBestSellingProducts] = useState([]);
  const [dailyPurchases, setDailyPurchases] = useState([]);
  const [topCashiers, setTopCashiers] = useState([]);
  
  // Form states
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showIngredientModal, setShowIngredientModal] = useState(false);
  const [showProductIngredientModal, setShowProductIngredientModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingIngredient, setEditingIngredient] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productIngredients, setProductIngredients] = useState([]);
  
  // Form data
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });
  const [productForm, setProductForm] = useState({
    name: '', description: '', price: '', category_id: '', stock: '', ingredients: [],
  });
  const [ingredientForm, setIngredientForm] = useState({ name: '', unit: 'gram', stock: '' });
  const [productIngredientForm, setProductIngredientForm] = useState([]);
  const [selectedIngredientForPurchase, setSelectedIngredientForPurchase] = useState(null);
  const [purchaseForm, setPurchaseForm] = useState({ quantity: '' });
  
  // Bulk purchase form
  const [bulkPurchaseItems, setBulkPurchaseItems] = useState([]);
  const [purchaseNotes, setPurchaseNotes] = useState('');
  const [purchases, setPurchases] = useState([]);
  const [financialSummary, setFinancialSummary] = useState({ money_in: 0, money_out: 0, profit: 0, profit_margin: 0 });
  const [showPurchaseHistoryModal, setShowPurchaseHistoryModal] = useState(false);
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const [purchaseFilter, setPurchaseFilter] = useState({ startDate: '', endDate: '' });
  const [loadingPurchaseHistory, setLoadingPurchaseHistory] = useState(false);
  const [orderFilter, setOrderFilter] = useState({ startDate: '', endDate: '' });
  const [selectedOrderForReceipt, setSelectedOrderForReceipt] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Month selector state
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showMonthSelector, setShowMonthSelector] = useState(false);

  // Nota settings state
  const [notaSettings, setNotaSettings] = useState({
    shop_name: 'POSMarbLe', address: '', phone: '',
    footer_text: 'Terima kasih telah belanja di toko kami!',
    show_logo: true, show_qr_code: false, tax_rate: 0, currency: 'IDR',
  });
  const [loadingNota, setLoadingNota] = useState(false);
  const [savingNota, setSavingNota] = useState(false);

  const [summary, setSummary] = useState({
    total_sales: 0, total_orders: 0, average_order: 0, sales_by_payment: [],
  });

  // Add mounted state to prevent chart rendering before component is ready
  const [isMounted, setIsMounted] = useState(false);
  const [chartsReady, setChartsReady] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // Add a small delay to ensure DOM is fully rendered
    const timer = setTimeout(() => {
      setChartsReady(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => { loadData(); }, [activeTab, selectedMonth, selectedYear]);

  const loadData = async () => {
    setLoading(true);
    try {
      const startDate = new Date(selectedYear, selectedMonth, 1);
      const endDate = new Date(selectedYear, selectedMonth + 1, 0);
      const monthParams = {
        start_date: formatLocalDate(startDate),
        end_date: formatLocalDate(endDate),
      };

      if (activeTab === 'dashboard') {
        const [ordersRes, summaryRes, financialRes, dailySalesRes, hourlySalesRes, bestSellingRes, dailyPurchasesRes, topCashiersRes] = await Promise.all([
          ordersAPI.getAll(monthParams), reportsAPI.getSalesSummary(monthParams),
          reportsAPI.getFinancialSummary(monthParams), reportsAPI.getDailySales(monthParams),
          reportsAPI.getHourlySales(), reportsAPI.getBestSelling({ limit: 10, ...monthParams }),
          reportsAPI.getDailyPurchases(monthParams), reportsAPI.getTopCashiers({ limit: 5 }),
        ]);
        setOrders(ordersRes.data); setSummary(summaryRes.data); setFinancialSummary(financialRes.data);
        setDailySales(dailySalesRes.data || []); setHourlySales(hourlySalesRes.data || []);
        setBestSellingProducts(bestSellingRes.data || []); setDailyPurchases(dailyPurchasesRes.data || []);
        setTopCashiers(topCashiersRes.data || []);
      } else if (activeTab === 'purchasing') {
        const [ingredientsRes, purchasesRes, financialRes] = await Promise.all([
          ingredientsAPI.getAll(), purchasesAPI.getAll(monthParams), reportsAPI.getFinancialSummary(monthParams),
        ]);
        setIngredients(ingredientsRes.data);
        setPurchases(purchasesRes.data?.purchases || purchasesRes.data || []);
        setFinancialSummary(financialRes.data);
      } else if (activeTab === 'categories') {
        const res = await categoriesAPI.getAll(); setCategories(res.data);
      } else if (activeTab === 'products') {
        const [productsRes, categoriesRes, ingredientsRes] = await Promise.all([
          productsAPI.getAll(), categoriesAPI.getAll(), ingredientsAPI.getAll(),
        ]);
        setProducts(productsRes.data); setCategories(categoriesRes.data); setIngredients(ingredientsRes.data);
      } else if (activeTab === 'orders') {
        const params = {};
        if (orderFilter.startDate) params.start_date = orderFilter.startDate;
        if (orderFilter.endDate) params.end_date = orderFilter.endDate;
        const res = await ordersAPI.getAll(params); setOrders(res.data);
      } else if (activeTab === 'ingredients') {
        const res = await ingredientsAPI.getAll(); setIngredients(res.data);
      } else if (activeTab === 'nota') {
        setLoadingNota(true);
        try { const res = await notaAPI.get(); setNotaSettings(res.data); }
        catch (error) { console.error('Error loading nota settings:', error); }
        finally { setLoadingNota(false); }
      }
    } catch (error) { console.error('Error loading data:', error); }
    finally { setLoading(false); }
  };

  // Helper function to format date in local timezone (not UTC)
  const formatLocalDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
  const formatDate = (date) => { const d = new Date(date); const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']; return `${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`; };
  const formatMonthYear = (month, year) => { const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']; return `${monthNames[month]} ${year}`; };
  const formatDateTime = (date) => { const d = new Date(date); const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']; return `${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}, ${d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`; };
  const formatTime = (date) => new Date(date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const formatShortDate = (dateStr) => { const d = new Date(dateStr); return `${d.getDate()}/${d.getMonth() + 1}`; };
  const getYearOptions = () => { const currentYear = new Date().getFullYear(); const years = []; for (let y = currentYear - 5; y <= currentYear + 1; y++) years.push(y); return years; };
  const handleMonthSelect = (month, year) => { setSelectedMonth(month); setSelectedYear(year); setShowMonthSelector(false); };

  // Category handlers
  const handleSaveCategory = async (e) => {
    e.preventDefault();
    try {
      if (editingCategory) await categoriesAPI.update(editingCategory.id, categoryForm);
      else await categoriesAPI.create(categoryForm);
      setShowCategoryModal(false); setEditingCategory(null); setCategoryForm({ name: '', description: '' }); loadData();
    } catch (error) { alert(error.response?.data?.error || 'Failed to save category'); }
  };
  const handleEditCategory = (category) => { setEditingCategory(category); setCategoryForm({ name: category.name, description: category.description || '' }); setShowCategoryModal(true); };
  const handleDeleteCategory = async (id) => {
    if (confirm('Apakah Anda yakin ingin menghapus kategori ini?')) {
      try { await categoriesAPI.delete(id); loadData(); } catch (error) { alert(error.response?.data?.error || 'Failed to delete category'); }
    }
  };

  // Product handlers
  const handleSaveProduct = async (e) => {
    e.preventDefault();
    try {
      const validIngredients = productForm.ingredients.filter(ing => ing.ingredient_id && ing.quantity_required);
      const data = { ...productForm, price: parseFloat(productForm.price), category_id: productForm.category_id ? parseInt(productForm.category_id) : null, stock: parseInt(productForm.stock) || 0, ingredients: validIngredients };
      if (editingProduct) await productsAPI.update(editingProduct.id, data);
      else await productsAPI.create(data);
      setShowProductModal(false); setEditingProduct(null); setProductForm({ name: '', description: '', price: '', category_id: '', stock: '', ingredients: [] }); loadData();
    } catch (error) { alert(error.response?.data?.error || 'Failed to save product'); }
  };
  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setProductForm({ name: product.name, description: product.description || '', price: product.price.toString(), category_id: product.category_id?.toString() || '', stock: product.stock?.toString() || '0', ingredients: product.ingredients ? product.ingredients.map(ing => ({ ingredient_id: ing.ingredient_id, quantity_required: ing.quantity_required })) : [] });
    setShowProductModal(true);
  };
  const handleDeleteProduct = async (id) => { if (confirm('Apakah Anda yakin ingin menghapus produk ini?')) { try { await productsAPI.delete(id); loadData(); } catch (error) { alert(error.response?.data?.error || 'Failed to delete product'); } } };
  const openNewProductModal = () => { setEditingProduct(null); setProductForm({ name: '', description: '', price: '', category_id: '', stock: '', ingredients: [] }); setShowProductModal(true); };
  const addIngredientToForm = () => { setProductForm({ ...productForm, ingredients: [...productForm.ingredients, { ingredient_id: '', quantity_required: '' }] }); };
  const removeIngredientFromForm = (index) => { const updated = productForm.ingredients.filter((_, i) => i !== index); setProductForm({ ...productForm, ingredients: updated }); };
  const updateIngredientInForm = (index, field, value) => { const updated = [...productForm.ingredients]; updated[index][field] = value; setProductForm({ ...productForm, ingredients: updated }); };

  // Ingredient handlers
  const handleSaveIngredient = async (e) => {
    e.preventDefault();
    try {
      const data = { name: ingredientForm.name, unit: ingredientForm.unit, stock: parseFloat(ingredientForm.stock) || 0 };
      if (editingIngredient) await ingredientsAPI.update(editingIngredient.id, data);
      else await ingredientsAPI.create(data);
      setShowIngredientModal(false); setEditingIngredient(null); setIngredientForm({ name: '', unit: 'gram', stock: '' }); loadData();
    } catch (error) { alert(error.response?.data?.error || 'Failed to save ingredient'); }
  };
  const handleEditIngredient = (ingredient) => { setEditingIngredient(ingredient); setIngredientForm({ name: ingredient.name, unit: ingredient.unit || 'gram', stock: ingredient.stock?.toString() || '0' }); setShowIngredientModal(true); };
  const handleDeleteIngredient = async (id) => { if (confirm('Apakah Anda yakin ingin menghapus bahan ini?')) { try { await ingredientsAPI.delete(id); loadData(); } catch (error) { alert(error.response?.data?.error || 'Failed to delete ingredient'); } } };
  const openNewIngredientModal = () => { setEditingIngredient(null); setIngredientForm({ name: '', unit: 'gram', stock: '' }); setShowIngredientModal(true); };

  // Purchase handlers
  const handleOpenPurchaseModal = (ingredient) => { setSelectedIngredientForPurchase(ingredient); setPurchaseForm({ quantity: '' }); setShowPurchaseModal(true); };
  const handlePurchase = async (e) => {
    e.preventDefault();
    if (!selectedIngredientForPurchase || !purchaseForm.quantity || parseFloat(purchaseForm.quantity) <= 0) { alert('Masukkan jumlah pembelian yang valid'); return; }
    try {
      await ingredientsAPI.purchaseStock(selectedIngredientForPurchase.id, parseFloat(purchaseForm.quantity));
      setShowPurchaseModal(false); setSelectedIngredientForPurchase(null); setPurchaseForm({ quantity: '' }); loadData();
      alert('Pembelian berhasil! Stok telah ditambahkan.');
    } catch (error) { alert(error.response?.data?.error || 'Gagal melakukan pembelian'); }
  };
  const addBulkPurchaseItem = () => { setBulkPurchaseItems([...bulkPurchaseItems, { ingredient_id: '', quantity: '', unit_price: '' }]); };
  const removeBulkPurchaseItem = (index) => { const updated = bulkPurchaseItems.filter((_, i) => i !== index); setBulkPurchaseItems(updated); };
  const updateBulkPurchaseItem = (index, field, value) => { const updated = [...bulkPurchaseItems]; updated[index][field] = value; setBulkPurchaseItems(updated); };
  const handleBulkPurchase = async (e) => {
    e.preventDefault();
    const validItems = bulkPurchaseItems.filter(item => item.ingredient_id && parseFloat(item.quantity) > 0 && parseFloat(item.unit_price) > 0).map(item => ({ ingredient_id: parseInt(item.ingredient_id), quantity: parseFloat(item.quantity), unit_price: parseFloat(item.unit_price) }));
    if (validItems.length === 0) { alert('Masukkan minimal 1 item pembelian yang valid'); return; }
    try {
      const response = await purchasesAPI.createBulk({ items: validItems, notes: purchaseNotes });
      alert(`Pembelian berhasil! ${response.data.purchases.length} item telah ditambahkan.`);
      setBulkPurchaseItems([]); setPurchaseNotes(''); loadData();
    } catch (error) { console.error('Bulk purchase error:', error); alert(error.response?.data?.error || 'Gagal melakukan pembelian'); }
  };
  const handleDeletePurchase = async (id) => { if (confirm('Apakah Anda yakin ingin menghapus pembelian ini?')) { try { await purchasesAPI.delete(id); loadData(); if (showPurchaseHistoryModal) loadPurchaseHistory(); alert('Pembelian berhasil dihapus'); } catch (error) { alert(error.response?.data?.error || 'Gagal menghapus pembelian'); } } };
  const loadPurchaseHistory = async () => {
    setLoadingPurchaseHistory(true);
    try {
      const params = {};
      if (purchaseFilter.startDate) params.start_date = purchaseFilter.startDate;
      if (purchaseFilter.endDate) params.end_date = purchaseFilter.endDate;
      params.timezone_offset = new Date().getTimezoneOffset();
      const res = await purchasesAPI.getAll(params);
      setPurchaseHistory(res.data.purchases || res.data || []);
    } catch (error) { console.error('Error loading purchase history:', error); }
    finally { setLoadingPurchaseHistory(false); }
  };
  const handlePurchaseFilterChange = (field, value) => { setPurchaseFilter({ ...purchaseFilter, [field]: value }); };
  const applyPurchaseFilter = () => { loadPurchaseHistory(); };
  const handleOrderFilterChange = (field, value) => { setOrderFilter({ ...orderFilter, [field]: value }); };
  const applyOrderFilter = () => { loadData(); };
  const handleViewReceipt = (order) => { setSelectedOrderForReceipt(order); setShowReceiptModal(true); };

  // Product Ingredients handlers
  const handleManageProductIngredients = async (product) => {
    setSelectedProduct(product);
    try {
      const res = await ingredientsAPI.getProductIngredients(product.id);
      setProductIngredients(res.data);
      if (res.data.length > 0) setProductIngredientForm(res.data.map(pi => ({ ingredient_id: pi.ingredient_id, quantity_required: pi.quantity_required })));
      else setProductIngredientForm([]);
      const ingredientsRes = await ingredientsAPI.getAll(); setIngredients(ingredientsRes.data);
      setShowProductIngredientModal(true);
    } catch (error) { console.error('Error loading product ingredients:', error); }
  };
  const addProductIngredient = () => { setProductIngredientForm([...productIngredientForm, { ingredient_id: '', quantity_required: '' }]); };
  const removeProductIngredient = (index) => { setProductIngredientForm(productIngredientForm.filter((_, i) => i !== index)); };
  const updateProductIngredient = (index, field, value) => { const updated = [...productIngredientForm]; updated[index][field] = value; setProductIngredientForm(updated); };
  const handleSaveProductIngredients = async () => {
    try {
      const validIngredients = productIngredientForm.filter(pi => pi.ingredient_id && pi.quantity_required);
      await ingredientsAPI.setProductIngredients(selectedProduct.id, validIngredients);
      setShowProductIngredientModal(false); setSelectedProduct(null); setProductIngredientForm([]); loadData();
      alert('Bahan produk berhasil disimpan!');
    } catch (error) { alert(error.response?.data?.error || 'Failed to save product ingredients'); }
  };

  // Nota handlers
  const handleSaveNota = async (e) => {
    e.preventDefault(); setSavingNota(true);
    try { await notaAPI.update(notaSettings); alert('Pengaturan Nota berhasil disimpan!'); }
    catch (error) { alert(error.response?.data?.error || 'Failed to save nota settings'); }
    finally { setSavingNota(false); }
  };
  const handleNotaChange = (field, value) => { setNotaSettings({ ...notaSettings, [field]: value }); };

  // Chart colors
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658'];
  const paymentData = summary.sales_by_payment.map(item => ({ name: item.payment_method === 'cash' ? 'Tunai' : item.payment_method === 'qris' ? 'QRIS' : item.payment_method === 'transfer' ? 'Transfer' : item.payment_method, value: item.total, count: item.count }));

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'purchasing', label: 'Pembelian', icon: '🛒' },
    { id: 'products', label: 'Produk', icon: '☕' },
    { id: 'nota', label: 'Nota', icon: '🧾' },
    { id: 'ingredients', label: 'Stock', icon: '🧊' },
    { id: 'categories', label: 'Kategori', icon: '📁' },
    { id: 'orders', label: 'Pesanan', icon: '🗒️' },
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-amber-700 text-white px-6 py-4 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">POSMarbLe Admin</h1>
          <span className="text-white opacity-50">|</span>
          <span className="text-white opacity-80">Management</span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/pos')} className="bg-green-600 px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center gap-2">
            <span>Kasir (POS)</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
          </button>
          <span className="text-sm">Admin: {user?.name}</span>
          <button onClick={() => { logout(); window.location.href = '/'; }} className="bg-amber-800 px-4 py-2 rounded-lg hover:bg-amber-900 transition">Logout</button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-64 bg-white shadow-lg">
          <nav className="p-4">
            {tabs.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full text-left px-4 py-3 rounded-lg mb-2 flex items-center gap-3 transition ${activeTab === tab.id ? 'bg-amber-100 text-amber-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}>
                <span>{tab.icon}</span>{tab.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-auto min-h-0">
          {loading ? (<div className="text-center py-8">Loading...</div>) : (
            <>
              {/* Dashboard */}
              {activeTab === 'dashboard' && (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">Dashboard Laporan</h2>
                    <div className="bg-white px-4 py-2 rounded-lg shadow cursor-pointer hover:bg-amber-50 transition flex items-center gap-2" onClick={() => setShowMonthSelector(true)}>
                      <span className="text-gray-500">Periode:</span>
                      <span className="font-bold text-amber-600">{formatMonthYear(selectedMonth, selectedYear)}</span>
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </div>
                  
                  {/* Financial Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-xl shadow hover:shadow-lg transition">
                      <div className="flex items-center justify-between">
                        <div><p className="text-gray-500 text-sm">Uang Masuk</p><p className="text-2xl font-bold text-green-600">{formatCurrency(financialSummary.money_in)}</p></div>
                        <div className="bg-green-100 p-3 rounded-full"><span className="text-2xl">💰</span></div>
                      </div>
                      <p className="text-xs text-gray-400 mt-2">Total penjualan</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow hover:shadow-lg transition">
                      <div className="flex items-center justify-between">
                        <div><p className="text-gray-500 text-sm">Uang Keluar</p><p className="text-2xl font-bold text-red-600">{formatCurrency(financialSummary.money_out)}</p></div>
                        <div className="bg-red-100 p-3 rounded-full"><span className="text-2xl">🛒</span></div>
                      </div>
                      <p className="text-xs text-gray-400 mt-2">Total pembelian</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow hover:shadow-lg transition">
                      <div className="flex items-center justify-between">
                        <div><p className="text-gray-500 text-sm">Laba/Rugi</p><p className={`text-2xl font-bold ${financialSummary.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(financialSummary.profit)}</p></div>
                        <div className={`p-3 rounded-full ${financialSummary.profit >= 0 ? 'bg-green-100' : 'bg-red-100'}`}><span className="text-2xl">{financialSummary.profit >= 0 ? '📈' : '📉'}</span></div>
                      </div>
                      <p className="text-xs text-gray-400 mt-2">Margin: {financialSummary.profit_margin}%</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow hover:shadow-lg transition">
                      <div className="flex items-center justify-between">
                        <div><p className="text-gray-500 text-sm">Total Pesanan</p><p className="text-2xl font-bold text-blue-600">{summary.total_orders}</p></div>
                        <div className="bg-blue-100 p-3 rounded-full"><span className="text-2xl">📝</span></div>
                      </div>
                      <p className="text-xs text-gray-400 mt-2">Rata-rata: {formatCurrency(summary.average_order)}</p>
                    </div>
                  </div>

                  {/* Charts Grid - Using grid layout for better organization */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 min-w-0">
                    {/* Daily Sales Trend - Full width on mobile, half on large screens */}
                    <div className="bg-white p-4 rounded-xl shadow overflow-hidden lg:col-span-2 min-w-0">
                      <h3 className="text-lg font-bold text-gray-800 mb-2">Trend Penjualan Bulan {formatMonthYear(selectedMonth, selectedYear)}</h3>
                      <div className="min-h-0" style={{ height: '300px', minHeight: '300px' }}>
                        {!loading && chartsReady && dailySales.length > 0 ? (
                          <ResponsiveContainer width="100%" height={300} minWidth={0}>
                            <AreaChart data={dailySales.map(item => ({ ...item, date: formatShortDate(item.date) }))} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                              <defs><linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#0088FE" stopOpacity={0.8}/><stop offset="95%" stopColor="#0088FE" stopOpacity={0}/></linearGradient></defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#eee" /><XAxis dataKey="date" tick={{ fontSize: 9 }} interval={Math.floor(dailySales.length / 10)} /><YAxis tick={{ fontSize: 10 }} />
                              <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ fontSize: '12px' }} /><Legend wrapperStyle={{ fontSize: '10px', paddingTop: '5px' }} />
                              <Area type="monotone" dataKey="total" stroke="#0088FE" fillOpacity={1} fill="url(#colorSales)" name="Penjualan" />
                            </AreaChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-full flex items-center justify-center text-gray-400">{loading ? 'Memuat...' : 'Tidak ada data'}</div>
                        )}
                      </div>
                    </div>

                    {/* Hourly Sales Today */}
                    <div className="bg-white p-4 rounded-xl shadow overflow-hidden min-w-0">
                      <h3 className="text-lg font-bold text-gray-800 mb-2">Penjualan per Jam (Hari Ini)</h3>
                      <div className="min-h-0" style={{ height: '250px', minHeight: '250px' }}>
                        {!loading && chartsReady && hourlySales.length > 0 ? (
                          <ResponsiveContainer width="100%" height={250} minWidth={0}>
                            <BarChart data={hourlySales} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" stroke="#eee" /><XAxis dataKey="hour" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ fontSize: '12px' }} /><Legend wrapperStyle={{ fontSize: '10px', paddingTop: '5px' }} /><Bar dataKey="total" fill="#00C49F" name="Penjualan" /></BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-full flex items-center justify-center text-gray-400">{loading ? 'Memuat...' : 'Tidak ada data'}</div>
                        )}
                      </div>
                    </div>

                    {/* Best Selling Products */}
                    <div className="bg-white p-4 rounded-xl shadow overflow-hidden min-w-0">
                      <h3 className="text-lg font-bold text-gray-800 mb-2">Produk Terlaris</h3>
                      <div className="min-h-0" style={{ height: '250px', minHeight: '250px' }}>
                        {!loading && chartsReady && bestSellingProducts.length > 0 ? (
                          <ResponsiveContainer width="100%" height={250} minWidth={0}>
                            <BarChart data={bestSellingProducts} layout="vertical" margin={{ top: 5, right: 10, left: 5, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" stroke="#eee" /><XAxis type="number" tick={{ fontSize: 10 }} /><YAxis dataKey="product_name" type="category" width={80} tick={{ fontSize: 10 }} /><Tooltip formatter={(value, name) => [value, name === 'total_quantity' ? 'Jumlah' : 'Total']} contentStyle={{ fontSize: '12px' }} /><Legend wrapperStyle={{ fontSize: '10px', paddingTop: '5px' }} /><Bar dataKey="total_quantity" fill="#FFBB28" name="Terjual" /></BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-full flex items-center justify-center text-gray-400">{loading ? 'Memuat...' : 'Tidak ada data'}</div>
                        )}
                      </div>
                    </div>

                    {/* Payment Methods */}
                    <div className="bg-white p-4 rounded-xl shadow overflow-hidden min-w-0">
                      <h3 className="text-lg font-bold text-gray-800 mb-2">Metode Pembayaran</h3>
                      <div className="min-h-0" style={{ height: '250px', minHeight: '250px' }}>
                        {!loading && chartsReady && paymentData.length > 0 ? (
                          <ResponsiveContainer width="100%" height={250} minWidth={0}>
                            <PieChart>
                              <Pie data={paymentData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} outerRadius={60} fill="#8884d8" dataKey="value">
                                {paymentData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                              </Pie>
                              <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ fontSize: '12px' }} /><Legend wrapperStyle={{ fontSize: '10px', paddingTop: '5px' }} />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-full flex items-center justify-center text-gray-400">{loading ? 'Memuat...' : 'Tidak ada data'}</div>
                        )}
                      </div>
                    </div>

                    {/* Daily Purchases Trend */}
                    <div className="bg-white p-4 rounded-xl shadow overflow-hidden min-w-0">
                      <h3 className="text-lg font-bold text-gray-800 mb-2">Trend Pembelian Bulan {formatMonthYear(selectedMonth, selectedYear)}</h3>
                      <div className="min-h-0" style={{ height: '300px', minHeight: '300px' }}>
                        {!loading && chartsReady && dailyPurchases.length > 0 ? (
                          <ResponsiveContainer width="100%" height={300} minWidth={0}>
                            <AreaChart data={dailyPurchases.map(item => ({ ...item, date: formatShortDate(item.date) }))} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                              <defs><linearGradient id="colorPurchases" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#FF8042" stopOpacity={0.8}/><stop offset="95%" stopColor="#FF8042" stopOpacity={0}/></linearGradient></defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#eee" /><XAxis dataKey="date" tick={{ fontSize: 9 }} interval={Math.floor(dailyPurchases.length / 10)} />
                              <YAxis tick={{ fontSize: 10 }} />
                              <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ fontSize: '12px' }} /><Legend wrapperStyle={{ fontSize: '10px', paddingTop: '5px' }} />
                              <Area type="monotone" dataKey="total" stroke="#FF8042" fillOpacity={1} fill="url(#colorPurchases)" name="Pembelian" />
                            </AreaChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-full flex items-center justify-center text-gray-400">{loading ? 'Memuat...' : 'Tidak ada data'}</div>
                        )}
                      </div>
                    </div>

                    {/* Top Cashiers */}
                    <div className="bg-white p-4 rounded-xl shadow overflow-hidden min-w-0">
                      <h3 className="text-lg font-bold text-gray-800 mb-2">Kasir Terbaik</h3>
                      <div className="min-h-0" style={{ height: '250px', minHeight: '250px' }}>
                        {!loading && chartsReady && topCashiers.length > 0 ? (
                          <ResponsiveContainer width="100%" height={250} minWidth={0}>
                            <BarChart data={topCashiers} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" stroke="#eee" /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip formatter={(value, name) => [name === 'total_sales' ? formatCurrency(value) : value, name === 'total_sales' ? 'Penjualan' : 'Pesanan']} contentStyle={{ fontSize: '12px' }} /><Legend wrapperStyle={{ fontSize: '10px', paddingTop: '5px' }} /><Bar dataKey="total_sales" fill="#8884D8" name="Penjualan" /><Bar dataKey="total_orders" fill="#82CA9D" name="Pesanan" /></BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-full flex items-center justify-center text-gray-400">{loading ? 'Memuat...' : 'Tidak ada data'}</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Recent Orders Table */}
                  <div className="bg-white p-6 rounded-xl shadow">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Pesanan Terbaru</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50"><tr><th className="text-left py-3 px-4">No. Pesanan</th><th className="text-left py-3 px-4">Total</th><th className="text-left py-3 px-4">Metode</th><th className="text-left py-3 px-4">Kasir</th><th className="text-left py-3 px-4">Waktu</th><th className="text-left py-3 px-4">Aksi</th></tr></thead>
                        <tbody>
                          {orders.slice(0, 10).map((order) => (
                            <tr key={order.id} className="border-b hover:bg-gray-50">
                              <td className="py-3 px-4">{order.order_number}</td>
                              <td className="py-3 px-4">{formatCurrency(order.total_amount)}</td>
                              <td className="py-3 px-4 capitalize">{order.payment_method}</td>
                              <td className="py-3 px-4">{order.created_by_name || '-'}</td>
                              <td className="py-3 px-4">{formatDateTime(order.created_at)}</td>
                              <td className="py-3 px-4"><button onClick={() => handleViewReceipt(order)} className="text-amber-600 hover:text-amber-800 text-sm font-medium">Lihat Nota</button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Purchasing Tab */}
              {activeTab === 'purchasing' && (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">Manajemen Pembelian</h2>
                    <div className="bg-white px-4 py-2 rounded-lg shadow cursor-pointer hover:bg-amber-50 transition flex items-center gap-2" onClick={() => setShowMonthSelector(true)}>
                      <span className="text-gray-500">Periode:</span>
                      <span className="font-bold text-amber-600">{formatMonthYear(selectedMonth, selectedYear)}</span>
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </div>

                  {/* Financial Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-xl shadow">
                      <div className="flex items-center justify-between">
                        <div><p className="text-gray-500 text-sm">Uang Keluar</p><p className="text-2xl font-bold text-red-600">{formatCurrency(financialSummary.money_out)}</p></div>
                        <div className="bg-red-100 p-3 rounded-full"><span className="text-2xl">🛒</span></div>
                      </div>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow">
                      <div className="flex items-center justify-between">
                        <div><p className="text-gray-500 text-sm">Total Pembelian</p><p className="text-2xl font-bold text-blue-600">{purchases.length}</p></div>
                        <div className="bg-blue-100 p-3 rounded-full"><span className="text-2xl">📦</span></div>
                      </div>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow">
                      <div className="flex items-center justify-between">
                        <div><p className="text-gray-500 text-sm">Sisa Laba</p><p className={`text-2xl font-bold ${financialSummary.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(financialSummary.profit)}</p></div>
                        <div className={`p-3 rounded-full ${financialSummary.profit >= 0 ? 'bg-green-100' : 'bg-red-100'}`}><span className="text-2xl">{financialSummary.profit >= 0 ? '💰' : '⚠️'}</span></div>
                      </div>
                    </div>
                  </div>

                  {/* Bulk Purchase Form */}
                  <div className="bg-white p-6 rounded-xl shadow mb-8">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Pembelian Bahan Baku</h3>
                    <form onSubmit={handleBulkPurchase}>
                      {bulkPurchaseItems.map((item, index) => (
                        <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 items-end">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Bahan</label>
                            <select value={item.ingredient_id} onChange={(e) => updateBulkPurchaseItem(index, 'ingredient_id', e.target.value)} className="w-full border rounded-lg px-3 py-2" required>
                              <option value="">Pilih Bahan</option>
                              {ingredients.map((ing) => (<option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah</label>
                            <input type="number" step="0.01" value={item.quantity} onChange={(e) => updateBulkPurchaseItem(index, 'quantity', e.target.value)} className="w-full border rounded-lg px-3 py-2" placeholder="Jumlah" required />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Harga Satuan</label>
                            <input type="number" step="0.01" value={item.unit_price} onChange={(e) => updateBulkPurchaseItem(index, 'unit_price', e.target.value)} className="w-full border rounded-lg px-3 py-2" placeholder="Harga per unit" required />
                          </div>
                          <div>
                            <button type="button" onClick={() => removeBulkPurchaseItem(index)} className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition">Hapus</button>
                          </div>
                        </div>
                      ))}
                      <div className="flex gap-4 mb-4">
                        <button type="button" onClick={addBulkPurchaseItem} className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition">+ Tambah Item</button>
                      </div>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
                        <textarea value={purchaseNotes} onChange={(e) => setPurchaseNotes(e.target.value)} className="w-full border rounded-lg px-3 py-2" rows="2" placeholder="Catatan pembelian (opsional)"></textarea>
                      </div>
                      <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition">Simpan Pembelian</button>
                    </form>
                  </div>

                  {/* Ingredients Stock */}
                  <div className="bg-white p-6 rounded-xl shadow mb-8">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Stok Bahan Baku</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr><th className="text-left py-3 px-4">Nama</th><th className="text-left py-3 px-4">Stok</th><th className="text-left py-3 px-4">Unit</th><th className="text-left py-3 px-4">Aksi</th></tr>
                        </thead>
                        <tbody>
                          {ingredients.map((ing) => (
                            <tr key={ing.id} className="border-b hover:bg-gray-50">
                              <td className="py-3 px-4">{ing.name}</td>
                              <td className="py-3 px-4">{ing.stock}</td>
                              <td className="py-3 px-4">{ing.unit}</td>
                              <td className="py-3 px-4"><button onClick={() => handleOpenPurchaseModal(ing)} className="text-green-600 hover:text-green-800 text-sm font-medium">Tambah Stok</button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Purchase History */}
                  <div className="bg-white p-6 rounded-xl shadow">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold text-gray-800">Riwayat Pembelian</h3>
                      <button onClick={() => { setShowPurchaseHistoryModal(true); loadPurchaseHistory(); }} className="text-amber-600 hover:text-amber-800 text-sm font-medium">Lihat Semua</button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr><th className="text-left py-3 px-4">Tanggal</th><th className="text-left py-3 px-4">Bahan</th><th className="text-left py-3 px-4">Jumlah</th><th className="text-left py-3 px-4">Total</th></tr>
                        </thead>
                        <tbody>
                          {purchases.slice(0, 5).map((purchase) => (
                            <tr key={purchase.id} className="border-b hover:bg-gray-50">
                              <td className="py-3 px-4">{formatDate(purchase.created_at)}</td>
                              <td className="py-3 px-4">{purchase.ingredient_name}</td>
                              <td className="py-3 px-4">{purchase.quantity} {purchase.unit}</td>
                              <td className="py-3 px-4">{formatCurrency(purchase.total_price)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Products Tab */}
              {activeTab === 'products' && (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">Manajemen Produk</h2>
                    <button onClick={openNewProductModal} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center gap-2">
                      <span>+ Tambah Produk</span>
                    </button>
                  </div>

                  {/* Products Table */}
                  <div className="bg-white p-6 rounded-xl shadow">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left py-3 px-4">Nama</th>
                            <th className="text-left py-3 px-4">Kategori</th>
                            <th className="text-left py-3 px-4">Harga</th>
                            <th className="text-left py-3 px-4">Stok</th>
                            <th className="text-left py-3 px-4">Status</th>
                            <th className="text-left py-3 px-4">Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {products.map((product) => (
                            <tr key={product.id} className="border-b hover:bg-gray-50">
                              <td className="py-3 px-4 font-medium">{product.name}</td>
                              <td className="py-3 px-4">{product.category_name || '-'}</td>
                              <td className="py-3 px-4">{formatCurrency(product.price)}</td>
                              <td className="py-3 px-4">
                                {product.has_ingredients ? (
                                  <span className="text-blue-600">{product.calculated_stock} (otomatis)</span>
                                ) : (
                                  <span>{product.stock || 0}</span>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                <span className={`px-2 py-1 rounded text-xs ${product.is_available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                  {product.is_available ? 'Aktif' : 'Nonaktif'}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex gap-2">
                                  <button onClick={() => handleEditProduct(product)} className="text-amber-600 hover:text-amber-800 text-sm font-medium">Edit</button>
                                  <button onClick={() => handleManageProductIngredients(product)} className="text-blue-600 hover:text-blue-800 text-sm font-medium">Bahan</button>
                                  <button onClick={() => handleDeleteProduct(product.id)} className="text-red-600 hover:text-red-800 text-sm font-medium">Hapus</button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {products.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <p>Belum ada produk</p>
                          <button onClick={openNewProductModal} className="text-amber-600 hover:text-amber-800 mt-2">Tambah produk pertama Anda</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Categories Tab */}
              {activeTab === 'categories' && (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">Manajemen Kategori</h2>
                    <button onClick={() => { setEditingCategory(null); setCategoryForm({ name: '', description: '' }); setShowCategoryModal(true); }} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center gap-2">
                      <span>+ Tambah Kategori</span>
                    </button>
                  </div>

                  {/* Categories Table */}
                  <div className="bg-white p-6 rounded-xl shadow">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left py-3 px-4">Nama</th>
                            <th className="text-left py-3 px-4">Deskripsi</th>
                            <th className="text-left py-3 px-4">Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {categories.map((category) => (
                            <tr key={category.id} className="border-b hover:bg-gray-50">
                              <td className="py-3 px-4 font-medium">{category.name}</td>
                              <td className="py-3 px-4 text-gray-600">{category.description || '-'}</td>
                              <td className="py-3 px-4">
                                <div className="flex gap-2">
                                  <button onClick={() => handleEditCategory(category)} className="text-amber-600 hover:text-amber-800 text-sm font-medium">Edit</button>
                                  <button onClick={() => handleDeleteCategory(category.id)} className="text-red-600 hover:text-red-800 text-sm font-medium">Hapus</button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {categories.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <p>Belum ada kategori</p>
                          <button onClick={() => { setEditingCategory(null); setCategoryForm({ name: '', description: '' }); setShowCategoryModal(true); }} className="text-amber-600 hover:text-amber-800 mt-2">Tambah kategori pertama Anda</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Orders Tab */}
              {activeTab === 'orders' && (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">Manajemen Pesanan</h2>
                  </div>

                  {/* Order Filters */}
                  <div className="bg-white p-4 rounded-xl shadow mb-6">
                    <div className="flex flex-wrap gap-4 items-end">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Mulai</label>
                        <input type="date" value={orderFilter.startDate} onChange={(e) => handleOrderFilterChange('startDate', e.target.value)} className="border rounded-lg px-3 py-2" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Akhir</label>
                        <input type="date" value={orderFilter.endDate} onChange={(e) => handleOrderFilterChange('endDate', e.target.value)} className="border rounded-lg px-3 py-2" />
                      </div>
                      <button onClick={applyOrderFilter} className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition">Filter</button>
                    </div>
                  </div>

                  {/* Orders Table */}
                  <div className="bg-white p-6 rounded-xl shadow">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left py-3 px-4">No. Pesanan</th>
                            <th className="text-left py-3 px-4">Total</th>
                            <th className="text-left py-3 px-4">Metode</th>
                            <th className="text-left py-3 px-4">Status</th>
                            <th className="text-left py-3 px-4">Kasir</th>
                            <th className="text-left py-3 px-4">Waktu</th>
                            <th className="text-left py-3 px-4">Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orders.map((order) => (
                            <tr key={order.id} className="border-b hover:bg-gray-50">
                              <td className="py-3 px-4 font-medium">{order.order_number}</td>
                              <td className="py-3 px-4">{formatCurrency(order.total_amount)}</td>
                              <td className="py-3 px-4 capitalize">{order.payment_method || 'cash'}</td>
                              <td className="py-3 px-4">
                                <span className={`px-2 py-1 rounded text-xs ${order.status === 'completed' ? 'bg-green-100 text-green-700' : order.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                  {order.status || 'completed'}
                                </span>
                              </td>
                              <td className="py-3 px-4">{order.created_by_name || '-'}</td>
                              <td className="py-3 px-4">{formatDateTime(order.created_at)}</td>
                              <td className="py-3 px-4">
                                <button onClick={() => handleViewReceipt(order)} className="text-amber-600 hover:text-amber-800 text-sm font-medium">Lihat Nota</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {orders.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <p>Belum ada pesanan</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Ingredients Tab */}
              {activeTab === 'ingredients' && (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">Manajemen Stock Bahan</h2>
                    <button onClick={openNewIngredientModal} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center gap-2">
                      <span>+ Tambah Bahan</span>
                    </button>
                  </div>

                  {/* Ingredients Table */}
                  <div className="bg-white p-6 rounded-xl shadow">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left py-3 px-4">Nama</th>
                            <th className="text-left py-3 px-4">Stok</th>
                            <th className="text-left py-3 px-4">Unit</th>
                            <th className="text-left py-3 px-4">Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ingredients.map((ingredient) => (
                            <tr key={ingredient.id} className="border-b hover:bg-gray-50">
                              <td className="py-3 px-4 font-medium">{ingredient.name}</td>
                              <td className="py-3 px-4">
                                <span className={ingredient.stock <= 10 ? 'text-red-600 font-medium' : ''}>
                                  {ingredient.stock}
                                </span>
                              </td>
                              <td className="py-3 px-4">{ingredient.unit}</td>
                              <td className="py-3 px-4">
                                <div className="flex gap-2">
                                  <button onClick={() => handleOpenPurchaseModal(ingredient)} className="text-green-600 hover:text-green-800 text-sm font-medium">Tambah Stok</button>
                                  <button onClick={() => handleEditIngredient(ingredient)} className="text-amber-600 hover:text-amber-800 text-sm font-medium">Edit</button>
                                  <button onClick={() => handleDeleteIngredient(ingredient.id)} className="text-red-600 hover:text-red-800 text-sm font-medium">Hapus</button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {ingredients.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <p>Belum ada bahan</p>
                          <button onClick={openNewIngredientModal} className="text-amber-600 hover:text-amber-800 mt-2">Tambah bahan pertama Anda</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Nota Tab */}
              {activeTab === 'nota' && (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">Pengaturan Nota</h2>
                  </div>

                  {loadingNota ? (
                    <div className="text-center py-8">Loading...</div>
                  ) : (
                    <div className="bg-white p-6 rounded-xl shadow">
                      <form onSubmit={handleSaveNota}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Toko</label>
                            <input type="text" value={notaSettings.shop_name} onChange={(e) => handleNotaChange('shop_name', e.target.value)} className="w-full border rounded-lg px-3 py-2" required />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nomor Telepon</label>
                            <input type="text" value={notaSettings.phone} onChange={(e) => handleNotaChange('phone', e.target.value)} className="w-full border rounded-lg px-3 py-2" />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Alamat</label>
                            <textarea value={notaSettings.address} onChange={(e) => handleNotaChange('address', e.target.value)} className="w-full border rounded-lg px-3 py-2" rows="2"></textarea>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Pajak (%)</label>
                            <input type="number" step="0.01" value={notaSettings.tax_rate} onChange={(e) => handleNotaChange('tax_rate', parseFloat(e.target.value) || 0)} className="w-full border rounded-lg px-3 py-2" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Mata Uang</label>
                            <select value={notaSettings.currency} onChange={(e) => handleNotaChange('currency', e.target.value)} className="w-full border rounded-lg px-3 py-2">
                              <option value="IDR">IDR (Rupiah)</option>
                              <option value="USD">USD (Dollar)</option>
                              <option value="EUR">EUR (Euro)</option>
                            </select>
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Footer Text</label>
                            <textarea value={notaSettings.footer_text} onChange={(e) => handleNotaChange('footer_text', e.target.value)} className="w-full border rounded-lg px-3 py-2" rows="2"></textarea>
                          </div>
                          <div className="flex items-center gap-6">
                            <label className="flex items-center gap-2">
                              <input type="checkbox" checked={notaSettings.show_logo} onChange={(e) => handleNotaChange('show_logo', e.target.checked)} className="rounded" />
                              <span className="text-sm font-medium text-gray-700">Tampilkan Logo</span>
                            </label>
                            <label className="flex items-center gap-2">
                              <input type="checkbox" checked={notaSettings.show_qr_code} onChange={(e) => handleNotaChange('show_qr_code', e.target.checked)} className="rounded" />
                              <span className="text-sm font-medium text-gray-700">Tampilkan QR Code</span>
                            </label>
                          </div>
                        </div>
                        <button type="submit" disabled={savingNota} className="bg-amber-600 text-white px-6 py-2 rounded-lg hover:bg-amber-700 transition disabled:bg-gray-400">
                          {savingNota ? 'Menyimpan...' : 'Simpan Pengaturan'}
                        </button>
                      </form>

                      {/* Preview Nota */}
                      <div className="mt-8 pt-6 border-t">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Preview Nota</h3>
                        <div className="bg-gray-50 p-4 rounded-lg max-w-md mx-auto">
                          <div className="text-center border-b pb-4 mb-4">
                            {notaSettings.show_logo && <div className="text-2xl mb-2">🏪</div>}
                            <h4 className="font-bold text-lg">{notaSettings.shop_name}</h4>
                            <p className="text-sm text-gray-600">{notaSettings.address}</p>
                            <p className="text-sm text-gray-600">{notaSettings.phone}</p>
                          </div>
                          <div className="text-sm">
                            <div className="flex justify-between py-1">
                              <span>1x Produk Contoh</span>
                              <span>Rp 10.000</span>
                            </div>
                          </div>
                          <div className="border-t pt-2 mt-2">
                            <div className="flex justify-between font-bold">
                              <span>Total</span>
                              <span>Rp 10.000</span>
                            </div>
                          </div>
                          {notaSettings.show_qr_code && (
                            <div className="text-center mt-4">
                              <div className="bg-white p-2 inline-block rounded">
                                <div className="w-20 h-20 bg-gray-200 flex items-center justify-center text-xs">QR Code</div>
                              </div>
                            </div>
                          )}
                          <div className="text-center mt-4 text-sm text-gray-600">
                            {notaSettings.footer_text}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Other tabs placeholder */}
              {activeTab !== 'dashboard' && activeTab !== 'purchasing' && activeTab !== 'products' && activeTab !== 'categories' && activeTab !== 'orders' && activeTab !== 'ingredients' && activeTab !== 'nota' && (
                <div className="bg-white p-6 rounded-xl shadow">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">{tabs.find(t => t.id === activeTab)?.label}</h2>
                  <p className="text-gray-600">Fitur ini sedang dalam pengembangan.</p>
                </div>
              )}
            </>
          )}

          {/* Month Selector Modal */}
          {showMonthSelector && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-xl shadow-lg max-w-md w-full">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Pilih Periode</h3>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'].map((month, index) => (
                    <button key={index} onClick={() => handleMonthSelect(index, selectedYear)} className={`p-2 rounded-lg text-sm ${selectedMonth === index ? 'bg-amber-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>{month}</button>
                  ))}
                </div>
                <div className="flex gap-2 mb-4 overflow-x-auto">
                  {getYearOptions().map((year) => (
                    <button key={year} onClick={() => setSelectedYear(year)} className={`p-2 rounded-lg text-sm ${selectedYear === year ? 'bg-amber-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>{year}</button>
                  ))}
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowMonthSelector(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Batal</button>
                </div>
              </div>
            </div>
          )}

          {/* Purchase Modal */}
          {showPurchaseModal && selectedIngredientForPurchase && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-xl shadow-lg max-w-md w-full">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Tambah Stok: {selectedIngredientForPurchase.name}</h3>
                <form onSubmit={handlePurchase}>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah ({selectedIngredientForPurchase.unit})</label>
                    <input type="number" step="0.01" value={purchaseForm.quantity} onChange={(e) => setPurchaseForm({ ...purchaseForm, quantity: e.target.value })} className="w-full border rounded-lg px-3 py-2" placeholder={`Masukkan jumlah dalam ${selectedIngredientForPurchase.unit}`} required />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setShowPurchaseModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Batal</button>
                    <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Simpan</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Receipt Modal */}
          {showReceiptModal && selectedOrderForReceipt && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-xl shadow-lg max-w-md w-full">
                <div className="text-center mb-4">
                  <h3 className="text-lg font-bold">{notaSettings.shop_name}</h3>
                  <p className="text-sm text-gray-600">{notaSettings.address}</p>
                  <p className="text-sm text-gray-600">{notaSettings.phone}</p>
                </div>
                <div className="border-t border-b py-4 mb-4">
                  <p className="text-sm"><strong>No:</strong> {selectedOrderForReceipt.order_number}</p>
                  <p className="text-sm"><strong>Tanggal:</strong> {formatDateTime(selectedOrderForReceipt.created_at)}</p>
                  <p className="text-sm"><strong>Kasir:</strong> {selectedOrderForReceipt.created_by_name || '-'}</p>
                </div>
                <div className="mb-4">
                  {selectedOrderForReceipt.items?.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm py-1">
                      <span>{item.quantity}x {item.product_name}</span>
                      <span>{formatCurrency(item.subtotal)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t pt-4">
                  <div className="flex justify-between font-bold">
                    <span>Total</span>
                    <span>{formatCurrency(selectedOrderForReceipt.total_amount)}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">Metode: {selectedOrderForReceipt.payment_method}</p>
                </div>
                <div className="text-center mt-4 text-sm text-gray-600">
                  {notaSettings.footer_text}
                </div>
                <div className="flex justify-end mt-4">
                  <button onClick={() => setShowReceiptModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Tutup</button>
                </div>
              </div>
            </div>
          )}

          {/* Purchase History Modal */}
          {showPurchaseHistoryModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-xl shadow-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-gray-800">Riwayat Pembelian Lengkap</h3>
                  <button onClick={() => setShowPurchaseHistoryModal(false)} className="text-gray-600 hover:text-gray-800">✕</button>
                </div>
                <div className="flex gap-4 mb-4">
                  <input type="date" value={purchaseFilter.startDate} onChange={(e) => handlePurchaseFilterChange('startDate', e.target.value)} className="border rounded-lg px-3 py-2" />
                  <input type="date" value={purchaseFilter.endDate} onChange={(e) => handlePurchaseFilterChange('endDate', e.target.value)} className="border rounded-lg px-3 py-2" />
                  <button onClick={applyPurchaseFilter} className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700">Filter</button>
                </div>
                {loadingPurchaseHistory ? (
                  <div className="text-center py-8">Loading...</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr><th className="text-left py-3 px-4">Tanggal</th><th className="text-left py-3 px-4">Bahan</th><th className="text-left py-3 px-4">Jumlah</th><th className="text-left py-3 px-4">Harga Satuan</th><th className="text-left py-3 px-4">Total</th><th className="text-left py-3 px-4">Catatan</th><th className="text-left py-3 px-4">Aksi</th></tr>
                      </thead>
                      <tbody>
                        {purchaseHistory.map((purchase) => (
                          <tr key={purchase.id} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4">{formatDateTime(purchase.created_at)}</td>
                            <td className="py-3 px-4">{purchase.ingredient_name}</td>
                            <td className="py-3 px-4">{purchase.quantity} {purchase.unit}</td>
                            <td className="py-3 px-4">{formatCurrency(purchase.unit_price)}</td>
                            <td className="py-3 px-4">{formatCurrency(purchase.total_price)}</td>
                            <td className="py-3 px-4">{purchase.notes || '-'}</td>
                            <td className="py-3 px-4"><button onClick={() => handleDeletePurchase(purchase.id)} className="text-red-600 hover:text-red-800 text-sm">Hapus</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Category Modal */}
          {showCategoryModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-xl shadow-lg max-w-md w-full">
                <h3 className="text-lg font-bold text-gray-800 mb-4">
                  {editingCategory ? 'Edit Kategori' : 'Tambah Kategori'}
                </h3>
                <form onSubmit={handleSaveCategory}>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nama Kategori</label>
                    <input type="text" value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} className="w-full border rounded-lg px-3 py-2" placeholder="Nama kategori" required />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
                    <textarea value={categoryForm.description} onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })} className="w-full border rounded-lg px-3 py-2" rows="2" placeholder="Deskripsi (opsional)"></textarea>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => { setShowCategoryModal(false); setEditingCategory(null); setCategoryForm({ name: '', description: '' }); }} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Batal</button>
                    <button type="submit" className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700">Simpan</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Product Modal */}
          {showProductModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
                <h3 className="text-lg font-bold text-gray-800 mb-4">
                  {editingProduct ? 'Edit Produk' : 'Tambah Produk'}
                </h3>
                <form onSubmit={handleSaveProduct}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nama Produk</label>
                      <input type="text" value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} className="w-full border rounded-lg px-3 py-2" placeholder="Nama produk" required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                      <select value={productForm.category_id} onChange={(e) => setProductForm({ ...productForm, category_id: e.target.value })} className="w-full border rounded-lg px-3 py-2">
                        <option value="">Pilih Kategori</option>
                        {categories.map((cat) => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Harga</label>
                      <input type="number" step="0.01" value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} className="w-full border rounded-lg px-3 py-2" placeholder="Harga" required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Stok (manual)</label>
                      <input type="number" value={productForm.stock} onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })} className="w-full border rounded-lg px-3 py-2" placeholder="Stok" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
                      <textarea value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} className="w-full border rounded-lg px-3 py-2" rows="2" placeholder="Deskripsi (opsional)"></textarea>
                    </div>
                  </div>
                  
                  {/* Product Ingredients Section */}
                  <div className="mb-4 border-t pt-4">
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium text-gray-700">Bahan Baku (Opsional)</label>
                      <button type="button" onClick={addIngredientToForm} className="text-amber-600 hover:text-amber-800 text-sm">+ Tambah Bahan</button>
                    </div>
                    {productForm.ingredients.map((ing, index) => (
                      <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                        <select value={ing.ingredient_id} onChange={(e) => updateIngredientInForm(index, 'ingredient_id', e.target.value)} className="border rounded-lg px-3 py-2">
                          <option value="">Pilih Bahan</option>
                          {ingredients.map((i) => (<option key={i.id} value={i.id}>{i.name} ({i.unit})</option>))}
                        </select>
                        <input type="number" step="0.01" value={ing.quantity_required} onChange={(e) => updateIngredientInForm(index, 'quantity_required', e.target.value)} className="border rounded-lg px-3 py-2" placeholder="Jumlah diperlukan" />
                        <button type="button" onClick={() => removeIngredientFromForm(index)} className="text-red-600 hover:text-red-800 text-sm">Hapus</button>
                      </div>
                    ))}
                    <p className="text-xs text-gray-500 mt-1">Jika diisi, stok produk akan dihitung otomatis dari bahan baku</p>
                  </div>
                  
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => { setShowProductModal(false); setEditingProduct(null); setProductForm({ name: '', description: '', price: '', category_id: '', stock: '', ingredients: [] }); }} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Batal</button>
                    <button type="submit" className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700">Simpan</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Ingredient Modal */}
          {showIngredientModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-xl shadow-lg max-w-md w-full">
                <h3 className="text-lg font-bold text-gray-800 mb-4">
                  {editingIngredient ? 'Edit Bahan' : 'Tambah Bahan'}
                </h3>
                <form onSubmit={handleSaveIngredient}>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nama Bahan</label>
                    <input type="text" value={ingredientForm.name} onChange={(e) => setIngredientForm({ ...ingredientForm, name: e.target.value })} className="w-full border rounded-lg px-3 py-2" placeholder="Nama bahan" required />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                    <select value={ingredientForm.unit} onChange={(e) => setIngredientForm({ ...ingredientForm, unit: e.target.value })} className="w-full border rounded-lg px-3 py-2">
                      <option value="gram">Gram</option>
                      <option value="kg">Kilogram</option>
                      <option value="ml">Mililiter</option>
                      <option value="liter">Liter</option>
                      <option value="pcs">Pcs</option>
                      <option value="pack">Pack</option>
                      <option value="box">Box</option>
                    </select>
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stok Awal</label>
                    <input type="number" step="0.01" value={ingredientForm.stock} onChange={(e) => setIngredientForm({ ...ingredientForm, stock: e.target.value })} className="w-full border rounded-lg px-3 py-2" placeholder="Stok awal" />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => { setShowIngredientModal(false); setEditingIngredient(null); setIngredientForm({ name: '', unit: 'gram', stock: '' }); }} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Batal</button>
                    <button type="submit" className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700">Simpan</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Product Ingredients Modal */}
          {showProductIngredientModal && selectedProduct && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
                <h3 className="text-lg font-bold text-gray-800 mb-4">
                  Kelola Bahan: {selectedProduct.name}
                </h3>
                <div className="mb-4">
                  <button type="button" onClick={addProductIngredient} className="text-amber-600 hover:text-amber-800 text-sm">+ Tambah Bahan</button>
                </div>
                {productIngredientForm.map((pi, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                    <select value={pi.ingredient_id} onChange={(e) => updateProductIngredient(index, 'ingredient_id', e.target.value)} className="border rounded-lg px-3 py-2">
                      <option value="">Pilih Bahan</option>
                      {ingredients.map((ing) => (<option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>))}
                    </select>
                    <input type="number" step="0.01" value={pi.quantity_required} onChange={(e) => updateProductIngredient(index, 'quantity_required', e.target.value)} className="border rounded-lg px-3 py-2" placeholder="Jumlah diperlukan" />
                    <button type="button" onClick={() => removeProductIngredient(index)} className="text-red-600 hover:text-red-800 text-sm">Hapus</button>
                  </div>
                ))}
                <div className="flex justify-end gap-2 mt-4">
                  <button type="button" onClick={() => { setShowProductIngredientModal(false); setSelectedProduct(null); setProductIngredientForm([]); }} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Batal</button>
                  <button type="button" onClick={handleSaveProductIngredients} className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700">Simpan</button>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
