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

  useEffect(() => { loadData(); }, [activeTab, selectedMonth, selectedYear]);

  const loadData = async () => {
    setLoading(true);
    try {
      const startDate = new Date(selectedYear, selectedMonth, 1);
      const endDate = new Date(selectedYear, selectedMonth + 1, 0);
      const monthParams = {
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
      };

      if (activeTab === 'dashboard') {
        const [ordersRes, summaryRes, financialRes, dailySalesRes, hourlySalesRes, bestSellingRes, dailyPurchasesRes, topCashiersRes] = await Promise.all([
          ordersAPI.getAll(monthParams), reportsAPI.getSalesSummary(monthParams),
          reportsAPI.getFinancialSummary(monthParams), reportsAPI.getDailySales(30),
          reportsAPI.getHourlySales(), reportsAPI.getBestSelling({ limit: 10, ...monthParams }),
          reportsAPI.getDailyPurchases(30), reportsAPI.getTopCashiers({ limit: 5 }),
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
        <main className="flex-1 p-6 overflow-auto">
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

                  {/* Charts Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* Daily Sales Trend */}
                    <div className="bg-white p-6 rounded-xl shadow">
                      <h3 className="text-lg font-bold text-gray-800 mb-4">Trend Penjualan 30 Hari Terakhir</h3>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={dailySales.map(item => ({ ...item, date: formatShortDate(item.date) }))}>
                            <defs><linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#0088FE" stopOpacity={0.8}/><stop offset="95%" stopColor="#0088FE" stopOpacity={0}/></linearGradient></defs>
                            <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis />
                            <Tooltip formatter={(value) => formatCurrency(value)} /><Legend />
                            <Area type="monotone" dataKey="total" stroke="#0088FE" fillOpacity={1} fill="url(#colorSales)" name="Penjualan" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Hourly Sales Today */}
                    <div className="bg-white p-6 rounded-xl shadow">
                      <h3 className="text-lg font-bold text-gray-800 mb-4">Penjualan per Jam (Hari Ini)</h3>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={hourlySales}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="hour" /><YAxis /><Tooltip formatter={(value) => formatCurrency(value)} /><Legend /><Bar dataKey="total" fill="#00C49F" name="Penjualan" /></BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Best Selling Products */}
                    <div className="bg-white p-6 rounded-xl shadow">
                      <h3 className="text-lg font-bold text-gray-800 mb-4">Produk Terlaris</h3>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={bestSellingProducts} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis dataKey="product_name" type="category" width={100} /><Tooltip formatter={(value, name) => [value, name === 'total_quantity' ? 'Jumlah' : 'Total']} /><Legend /><Bar dataKey="total_quantity" fill="#FFBB28" name="Terjual" /></BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Payment Methods */}
                    <div className="bg-white p-6 rounded-xl shadow">
                      <h3 className="text-lg font-bold text-gray-800 mb-4">Metode Pembayaran</h3>
                      <div className="h-64 flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={paymentData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} outerRadius={80} fill="#8884d8" dataKey="value">
                              {paymentData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                            </Pie>
                            <Tooltip formatter={(value) => formatCurrency(value)} /><Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  {/* Daily Purchases Trend */}
                  <div className="bg-white p-6 rounded-xl shadow mb-8">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Trend Pembelian 30 Hari Terakhir</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={dailyPurchases.map(item => ({ ...item, date: formatShortDate(item.date) }))}>
                          <defs><linearGradient id="colorPurchases" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#FF8042" stopOpacity={0.8}/><stop offset="95%" stopColor="#FF8042" stopOpacity={0}/></linearGradient></defs>
                          <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis />
                          <Tooltip formatter={(value) => formatCurrency(value)} /><Legend />
                          <Area type="monotone" dataKey="total" stroke="#FF8042" fillOpacity={1} fill="url(#colorPurchases)" name="Pembelian" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Top Cashiers */}
                  <div className="bg-white p-6 rounded-xl shadow mb-8">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Kasir Terbaik</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topCashiers}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip formatter={(value, name) => [name === 'total_sales' ? formatCurrency(value) : value, name === 'total_sales' ? 'Penjualan' : 'Pesanan']} /><Legend /><Bar dataKey="total_sales" fill="#8884D8" name="Penjualan" /><Bar dataKey="total_orders" fill="#82CA9D" name="Pesanan" /></BarChart>
                      </ResponsiveContainer>
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
