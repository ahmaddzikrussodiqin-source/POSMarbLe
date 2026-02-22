import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { categoriesAPI, productsAPI, ordersAPI, reportsAPI, ingredientsAPI, purchasesAPI, notaAPI } from '../../services/api';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  
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
    name: '',
    description: '',
    price: '',
    category_id: '',
    stock: '',
    ingredients: [], // Array of { ingredient_id, quantity_required }
  });
  const [ingredientForm, setIngredientForm] = useState({
    name: '',
    unit: 'gram',
    stock: '',
  });
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
  });
  const [loadingNota, setLoadingNota] = useState(false);
  const [savingNota, setSavingNota] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'dashboard') {
        const [ordersRes, summaryRes, financialRes] = await Promise.all([
          ordersAPI.getToday(),
          reportsAPI.getSalesSummary({}),
          reportsAPI.getFinancialSummary({}),
        ]);
        setOrders(ordersRes.data);
        setSummary(summaryRes.data);
        setFinancialSummary(financialRes.data);
      } else if (activeTab === 'purchasing') {
        const [ingredientsRes, purchasesRes, financialRes] = await Promise.all([
          ingredientsAPI.getAll(),
          purchasesAPI.getToday(),
          reportsAPI.getFinancialSummary({}),
        ]);
        setIngredients(ingredientsRes.data);
        setPurchases(purchasesRes.data);
        setFinancialSummary(financialRes.data);
      } else if (activeTab === 'categories') {
        const res = await categoriesAPI.getAll();
        setCategories(res.data);
      } else if (activeTab === 'products') {
        const [productsRes, categoriesRes, ingredientsRes] = await Promise.all([
          productsAPI.getAll(),
          categoriesAPI.getAll(),
          ingredientsAPI.getAll(),
        ]);
        setProducts(productsRes.data);
        setCategories(categoriesRes.data);
        setIngredients(ingredientsRes.data);
      } else if (activeTab === 'orders') {
        const res = await ordersAPI.getAll({});
        setOrders(res.data);
      } else if (activeTab === 'ingredients') {
        const res = await ingredientsAPI.getAll();
        setIngredients(res.data);
      } else if (activeTab === 'nota') {
        setLoadingNota(true);
        try {
          const res = await notaAPI.get();
          setNotaSettings(res.data);
        } catch (error) {
          console.error('Error loading nota settings:', error);
        } finally {
          setLoadingNota(false);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const [summary, setSummary] = useState({
    total_sales: 0,
    total_orders: 0,
    average_order: 0,
    sales_by_payment: [],
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
    }).format(amount);
  };

  // Format date to "20 February 2026" format
  const formatDate = (date) => {
    const d = new Date(date);
    const day = d.getDate();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];
    const month = monthNames[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  };

  // Format datetime to "20 February 2026, 10:30" format
  const formatDateTime = (date) => {
    const d = new Date(date);
    const day = d.getDate();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];
    const month = monthNames[d.getMonth()];
    const year = d.getFullYear();
    const time = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    return `${day} ${month} ${year}, ${time}`;
  };

  // Format time only to "10:30" format
  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  // Category handlers
  const handleSaveCategory = async (e) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await categoriesAPI.update(editingCategory.id, categoryForm);
      } else {
        await categoriesAPI.create(categoryForm);
      }
      setShowCategoryModal(false);
      setEditingCategory(null);
      setCategoryForm({ name: '', description: '' });
      loadData();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to save category');
    }
  };

  const handleEditCategory = (category) => {
    setEditingCategory(category);
    setCategoryForm({ name: category.name, description: category.description || '' });
    setShowCategoryModal(true);
  };

  const handleDeleteCategory = async (id) => {
    if (confirm('Apakah Anda yakin ingin menghapus kategori ini?')) {
      try {
        await categoriesAPI.delete(id);
        loadData();
      } catch (error) {
        alert(error.response?.data?.error || 'Failed to delete category');
      }
    }
  };

  // Product handlers
  const handleSaveProduct = async (e) => {
    e.preventDefault();
    try {
      // Filter out empty ingredients
      const validIngredients = productForm.ingredients.filter(
        ing => ing.ingredient_id && ing.quantity_required
      );

      const data = {
        ...productForm,
        price: parseFloat(productForm.price),
        category_id: productForm.category_id ? parseInt(productForm.category_id) : null,
        stock: parseInt(productForm.stock) || 0,
        ingredients: validIngredients,
      };
      
      if (editingProduct) {
        await productsAPI.update(editingProduct.id, data);
      } else {
        await productsAPI.create(data);
      }
      setShowProductModal(false);
      setEditingProduct(null);
      setProductForm({ name: '', description: '', price: '', category_id: '', stock: '', ingredients: [] });
      loadData();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to save product');
    }
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      category_id: product.category_id?.toString() || '',
      stock: product.stock?.toString() || '0',
      ingredients: product.ingredients ? product.ingredients.map(ing => ({
        ingredient_id: ing.ingredient_id,
        quantity_required: ing.quantity_required
      })) : [],
    });
    setShowProductModal(true);
  };

  const handleDeleteProduct = async (id) => {
    if (confirm('Apakah Anda yakin ingin menghapus produk ini?')) {
      try {
        await productsAPI.delete(id);
        loadData();
      } catch (error) {
        alert(error.response?.data?.error || 'Failed to delete product');
      }
    }
  };

  const openNewProductModal = () => {
    setEditingProduct(null);
    setProductForm({ name: '', description: '', price: '', category_id: '', stock: '', ingredients: [] });
    setShowProductModal(true);
  };

  // Helper functions for managing ingredients in product form
  const addIngredientToForm = () => {
    setProductForm({
      ...productForm,
      ingredients: [...productForm.ingredients, { ingredient_id: '', quantity_required: '' }]
    });
  };

  const removeIngredientFromForm = (index) => {
    const updated = productForm.ingredients.filter((_, i) => i !== index);
    setProductForm({ ...productForm, ingredients: updated });
  };

  const updateIngredientInForm = (index, field, value) => {
    const updated = [...productForm.ingredients];
    updated[index][field] = value;
    setProductForm({ ...productForm, ingredients: updated });
  };

  // Ingredient handlers
  const handleSaveIngredient = async (e) => {
    e.preventDefault();
    try {
      const data = {
        name: ingredientForm.name,
        unit: ingredientForm.unit,
        stock: parseFloat(ingredientForm.stock) || 0,
      };
      
      if (editingIngredient) {
        await ingredientsAPI.update(editingIngredient.id, data);
      } else {
        await ingredientsAPI.create(data);
      }
      setShowIngredientModal(false);
      setEditingIngredient(null);
      setIngredientForm({ name: '', unit: 'gram', stock: '' });
      loadData();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to save ingredient');
    }
  };

  const handleEditIngredient = (ingredient) => {
    setEditingIngredient(ingredient);
    setIngredientForm({
      name: ingredient.name,
      unit: ingredient.unit || 'gram',
      stock: ingredient.stock?.toString() || '0',
    });
    setShowIngredientModal(true);
  };

  const handleDeleteIngredient = async (id) => {
    if (confirm('Apakah Anda yakin ingin menghapus bahan ini?')) {
      try {
        await ingredientsAPI.delete(id);
        loadData();
      } catch (error) {
        alert(error.response?.data?.error || 'Failed to delete ingredient');
      }
    }
  };

  const openNewIngredientModal = () => {
    setEditingIngredient(null);
    setIngredientForm({ name: '', unit: 'gram', stock: '' });
    setShowIngredientModal(true);
  };

  // Purchase handlers
  const handleOpenPurchaseModal = (ingredient) => {
    setSelectedIngredientForPurchase(ingredient);
    setPurchaseForm({ quantity: '' });
    setShowPurchaseModal(true);
  };

  const handlePurchase = async (e) => {
    e.preventDefault();
    if (!selectedIngredientForPurchase || !purchaseForm.quantity || parseFloat(purchaseForm.quantity) <= 0) {
      alert('Masukkan jumlah pembelian yang valid');
      return;
    }
    try {
      await ingredientsAPI.purchaseStock(
        selectedIngredientForPurchase.id,
        parseFloat(purchaseForm.quantity)
      );
      setShowPurchaseModal(false);
      setSelectedIngredientForPurchase(null);
      setPurchaseForm({ quantity: '' });
      loadData();
      alert('Pembelian berhasil! Stok telah ditambahkan.');
    } catch (error) {
      alert(error.response?.data?.error || 'Gagal melakukan pembelian');
    }
  };

  // Bulk purchase handlers
  const addBulkPurchaseItem = () => {
    setBulkPurchaseItems([
      ...bulkPurchaseItems,
      { ingredient_id: '', quantity: '', unit_price: '' }
    ]);
  };

  const removeBulkPurchaseItem = (index) => {
    const updated = bulkPurchaseItems.filter((_, i) => i !== index);
    setBulkPurchaseItems(updated);
  };

  const updateBulkPurchaseItem = (index, field, value) => {
    const updated = [...bulkPurchaseItems];
    updated[index][field] = value;
    setBulkPurchaseItems(updated);
  };

  const handleBulkPurchase = async (e) => {
    e.preventDefault();
    
    // Validate all items
    const validItems = bulkPurchaseItems.filter(item => 
      item.ingredient_id && item.quantity > 0 && item.unit_price > 0
    );
    
    if (validItems.length === 0) {
      alert('Masukkan minimal 1 item pembelian yang valid');
      return;
    }
    
    try {
      const response = await purchasesAPI.createBulk({
        items: validItems,
        notes: purchaseNotes
      });
      
      alert(`Pembelian berhasil! ${response.data.purchases.length} item telah ditambahkan.`);
      setBulkPurchaseItems([]);
      setPurchaseNotes('');
      loadData();
    } catch (error) {
      alert(error.response?.data?.error || 'Gagal melakukan pembelian');
    }
  };

  const handleDeletePurchase = async (id) => {
    if (confirm('Apakah Anda yakin ingin menghapus pembelian ini?')) {
      try {
        await purchasesAPI.delete(id);
        loadData();
        // Refresh purchase history if modal is open
        if (showPurchaseHistoryModal) {
          loadPurchaseHistory();
        }
        alert('Pembelian berhasil dihapus');
      } catch (error) {
        alert(error.response?.data?.error || 'Gagal menghapus pembelian');
      }
    }
  };

  // Load purchase history with filters
  const loadPurchaseHistory = async () => {
    setLoadingPurchaseHistory(true);
    try {
      const params = {};
      if (purchaseFilter.startDate) {
        params.start_date = purchaseFilter.startDate;
      }
      if (purchaseFilter.endDate) {
        params.end_date = purchaseFilter.endDate;
      }
      const res = await purchasesAPI.getAll(params);
      setPurchaseHistory(res.data.purchases || res.data || []);
    } catch (error) {
      console.error('Error loading purchase history:', error);
    } finally {
      setLoadingPurchaseHistory(false);
    }
  };

  const handlePurchaseFilterChange = (field, value) => {
    setPurchaseFilter({ ...purchaseFilter, [field]: value });
  };

  const applyPurchaseFilter = () => {
    loadPurchaseHistory();
  };

  // Product Ingredients handlers
  const handleManageProductIngredients = async (product) => {
    setSelectedProduct(product);
    try {
      const res = await ingredientsAPI.getProductIngredients(product.id);
      setProductIngredients(res.data);
      
      // Initialize form with existing ingredients
      if (res.data.length > 0) {
        setProductIngredientForm(
          res.data.map(pi => ({
            ingredient_id: pi.ingredient_id,
            quantity_required: pi.quantity_required,
          }))
        );
      } else {
        setProductIngredientForm([]);
      }
      
      // Also load all ingredients for selection
      const ingredientsRes = await ingredientsAPI.getAll();
      setIngredients(ingredientsRes.data);
      
      setShowProductIngredientModal(true);
    } catch (error) {
      console.error('Error loading product ingredients:', error);
    }
  };

  const addProductIngredient = () => {
    setProductIngredientForm([
      ...productIngredientForm,
      { ingredient_id: '', quantity_required: '' }
    ]);
  };

  const removeProductIngredient = (index) => {
    setProductIngredientForm(productIngredientForm.filter((_, i) => i !== index));
  };

  const updateProductIngredient = (index, field, value) => {
    const updated = [...productIngredientForm];
    updated[index][field] = value;
    setProductIngredientForm(updated);
  };

  const handleSaveProductIngredients = async () => {
    try {
      // Filter out empty entries
      const validIngredients = productIngredientForm.filter(
        pi => pi.ingredient_id && pi.quantity_required
      );
      
      await ingredientsAPI.setProductIngredients(
        selectedProduct.id,
        validIngredients
      );
      
      setShowProductIngredientModal(false);
      setSelectedProduct(null);
      setProductIngredientForm([]);
      loadData();
      alert('Bahan produk berhasil disimpan!');
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to save product ingredients');
    }
  };

  // Nota handlers
  const handleSaveNota = async (e) => {
    e.preventDefault();
    setSavingNota(true);
    try {
      await notaAPI.update(notaSettings);
      alert('Pengaturan Nota berhasil disimpan!');
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to save nota settings');
    } finally {
      setSavingNota(false);
    }
  };

  const handleNotaChange = (field, value) => {
    setNotaSettings({ ...notaSettings, [field]: value });
  };

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
          <button
            onClick={() => navigate('/pos')}
            className="bg-green-600 px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center gap-2"
          >
            <span>Kasir (POS)</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </button>
          <span className="text-sm">Admin: {user?.name}</span>
          <button
            onClick={logout}
            className="bg-amber-800 px-4 py-2 rounded-lg hover:bg-amber-900 transition"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-64 bg-white shadow-lg">
          <nav className="p-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full text-left px-4 py-3 rounded-lg mb-2 flex items-center gap-3 transition ${
                  activeTab === tab.id
                    ? 'bg-amber-100 text-amber-700 font-semibold'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-auto">
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <>
              {/* Dashboard */}
              {activeTab === 'dashboard' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h2>
                  
                  {/* Financial Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-xl shadow">
                      <p className="text-gray-500 text-sm">Uang Masuk (Penjualan)</p>
                      <p className="text-3xl font-bold text-green-600">{formatCurrency(financialSummary.money_in)}</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow">
                      <p className="text-gray-500 text-sm">Uang Keluar (Pembelian)</p>
                      <p className="text-3xl font-bold text-red-600">{formatCurrency(financialSummary.money_out)}</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow">
                      <p className="text-gray-500 text-sm">Laba/Rugi</p>
                      <p className={`text-3xl font-bold ${financialSummary.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(financialSummary.profit)}
                      </p>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow">
                      <p className="text-gray-500 text-sm">Tanggal</p>
                      <p className="text-3xl font-bold text-gray-600">{formatDate(new Date())}</p>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-xl shadow">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Pesanan Hari Ini</h3>
                    {orders.length === 0 ? (
                      <p className="text-gray-500">Belum ada pesanan hari ini</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-3 px-4">No. Pesanan</th>
                              <th className="text-left py-3 px-4">Total</th>
                              <th className="text-left py-3 px-4">Metode</th>
                              <th className="text-left py-3 px-4">Waktu</th>
                              <th className="text-left py-3 px-4">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {orders.map((order) => (
                              <tr key={order.id} className="border-b hover:bg-gray-50">
                                <td className="py-3 px-4">{order.order_number}</td>
                                <td className="py-3 px-4">{formatCurrency(order.total_amount)}</td>
                                <td className="py-3 px-4 capitalize">{order.payment_method}</td>
                                <td className="py-3 px-4">
                                  {formatTime(order.created_at)}
                                </td>
                                <td className="py-3 px-4">
                                  <span className={`px-2 py-1 rounded-full text-xs ${
                                    order.status === 'completed' ? 'bg-green-100 text-green-700' :
                                    order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                    'bg-yellow-100 text-yellow-700'
                                  }`}>
                                    {order.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Purchasing */}
              {activeTab === 'purchasing' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-6">Pembelian Bahan Baku</h2>
                  
                  {/* Financial Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="bg-white p-4 rounded-xl shadow">
                      <p className="text-gray-500 text-sm">Uang Keluar (Pembelian)</p>
                      <p className="text-2xl font-bold text-red-600">{formatCurrency(financialSummary.money_out)}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow">
                      <p className="text-gray-500 text-sm">Tanggal</p>
                      <p className="text-2xl font-bold text-gray-600">{formatDate(new Date())}</p>
                    </div>
                  </div>

                  {/* Bulk Purchase Form */}
                  <div className="bg-white p-6 rounded-xl shadow mb-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Pembelian Baru (Multiple)</h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Tambahkan beberapa bahan sekaligus dengan mengisi form di bawah
                    </p>
                    
                    <form onSubmit={handleBulkPurchase}>
                      <div className="space-y-3 mb-4">
                        {bulkPurchaseItems.map((item, index) => (
                          <div key={index} className="flex gap-2 items-center bg-gray-50 p-3 rounded-lg">
                            <select
                              value={item.ingredient_id}
                              onChange={(e) => updateBulkPurchaseItem(index, 'ingredient_id', e.target.value)}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            >
                              <option value="">Pilih Bahan</option>
                              {ingredients.map((ing) => (
                                <option key={ing.id} value={ing.id}>
                                  {ing.name} ({ing.stock} {ing.unit})
                                </option>
                              ))}
                            </select>
                            <input
                              type="number"
                              placeholder="Jml"
                              value={item.quantity}
                              onChange={(e) => updateBulkPurchaseItem(index, 'quantity', e.target.value)}
                              className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              step="0.1"
                              min="0"
                            />
                            <input
                              type="number"
                              placeholder="Harga Total"
                              value={item.unit_price}
                              onChange={(e) => updateBulkPurchaseItem(index, 'unit_price', e.target.value)}
                              className="w-28 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              min="0"
                            />
                            <button
                              type="button"
                              onClick={() => removeBulkPurchaseItem(index)}
                              className="text-red-500 hover:text-red-700 px-2"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                      
                      <button
                        type="button"
                        onClick={addBulkPurchaseItem}
                        className="w-full mb-4 px-4 py-2 border-2 border-dashed border-gray-300 text-gray-600 rounded-lg hover:border-amber-500 hover:text-amber-600"
                      >
                        + Tambah Item Pembelian
                      </button>
                      
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Catatan (Opsional)
                        </label>
                        <input
                          type="text"
                          value={purchaseNotes}
                          onChange={(e) => setPurchaseNotes(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                          placeholder="Contoh: Pembelian mingguan"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700"
                      >
                        Simpan Pembelian
                      </button>
                    </form>
                  </div>

                  {/* Today's Purchases */}
                  <div className="bg-white p-6 rounded-xl shadow mb-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold text-gray-800">Pembelian Hari Ini</h3>
                      <button
                        onClick={() => {
                          setPurchaseFilter({ startDate: '', endDate: '' });
                          loadPurchaseHistory();
                          setShowPurchaseHistoryModal(true);
                        }}
                        className="text-amber-600 hover:text-amber-700 text-sm font-medium"
                      >
                        Lihat Semua Riwayat →
                      </button>
                    </div>
                    
                    {purchases.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">Belum ada pembelian hari ini</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="text-left py-2 px-3 text-sm">No. Pembelian</th>
                              <th className="text-left py-2 px-3 text-sm">Bahan</th>
                              <th className="text-left py-2 px-3 text-sm">Jumlah</th>
                              <th className="text-left py-2 px-3 text-sm">Harga Total</th>
                              <th className="text-left py-2 px-3 text-sm">Total</th>
                              <th className="text-left py-2 px-3 text-sm">Waktu</th>
                              <th className="text-left py-2 px-3 text-sm">Aksi</th>
                            </tr>
                          </thead>
                          <tbody>
                            {purchases.slice(0, 5).map((purchase) => (
                              <tr key={purchase.id} className="border-t">
                                <td className="py-2 px-3 text-sm">{purchase.purchase_number}</td>
                                <td className="py-2 px-3 text-sm">{purchase.ingredient_name}</td>
                                <td className="py-2 px-3 text-sm">{purchase.quantity} {purchase.unit}</td>
                                <td className="py-2 px-3 text-sm">{formatCurrency(purchase.unit_price)}</td>
                                <td className="py-2 px-3 text-sm font-semibold">{formatCurrency(purchase.total_price)}</td>
                                <td className="py-2 px-3 text-sm">
                                  {formatTime(purchase.created_at)}
                                </td>
                                <td className="py-2 px-3">
                                  <button
                                    onClick={() => handleDeletePurchase(purchase.id)}
                                    className="text-red-500 hover:text-red-700 text-xs"
                                  >
                                    Hapus
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Ingredients Stock */}
                  <div className="bg-white rounded-xl shadow overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left py-3 px-4">Nama Bahan</th>
                          <th className="text-left py-3 px-4">Satuan</th>
                          <th className="text-left py-3 px-4">Stok Saat Ini</th>
                          <th className="text-left py-3 px-4">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ingredients.map((ingredient) => (
                          <tr key={ingredient.id} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4 font-medium">{ingredient.name}</td>
                            <td className="py-3 px-4">{ingredient.unit}</td>
                            <td className="py-3 px-4">
                              <span className={ingredient.stock <= 10 ? 'text-red-600 font-semibold' : ''}>
                                {ingredient.stock} {ingredient.unit}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <button
                                onClick={() => handleOpenPurchaseModal(ingredient)}
                                className="bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 text-sm"
                              >
                                + Beli
                              </button>
                            </td>
                          </tr>
                        ))}
                        {ingredients.length === 0 && (
                          <tr>
                            <td colSpan="4" className="py-8 text-center text-gray-500">
                              Tidak ada bahan tersedia
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Categories */}
              {activeTab === 'categories' && (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">Kategori</h2>
                    <button
                      onClick={() => {
                        setEditingCategory(null);
                        setCategoryForm({ name: '', description: '' });
                        setShowCategoryModal(true);
                      }}
                      className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700"
                    >
                      + Tambah Kategori
                    </button>
                  </div>

                  <div className="bg-white rounded-xl shadow overflow-hidden">
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
                              <button
                                onClick={() => handleEditCategory(category)}
                                className="text-blue-600 hover:text-blue-800 mr-3"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteCategory(category.id)}
                                className="text-red-600 hover:text-red-800"
                              >
                                Hapus
                              </button>
                            </td>
                          </tr>
                        ))}
                        {categories.length === 0 && (
                          <tr>
                            <td colSpan="3" className="py-8 text-center text-gray-500">
                              Tidak ada kategori
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Products */}
              {activeTab === 'products' && (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">Produk</h2>
                    <button
                      onClick={openNewProductModal}
                      className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700"
                    >
                      + Tambah Produk
                    </button>
                  </div>

                  <div className="bg-white rounded-xl shadow overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left py-3 px-4">Nama</th>
                          <th className="text-left py-3 px-4">Kategori</th>
                          <th className="text-left py-3 px-4">Harga</th>
                          <th className="text-left py-3 px-4">Stok</th>
                          <th className="text-left py-3 px-4">Bahan</th>
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
                                <span className="text-green-600 font-semibold">
                                  {product.calculated_stock}
                                </span>
                              ) : (
                                <span>{product.stock}</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              {product.has_ingredients ? (
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                                  Ada Bahan
                                </span>
                              ) : (
                                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded">
                                  Tanpa Bahan
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                product.is_available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                              }`}>
                                {product.is_available ? 'Tersedia' : 'Tidak Tersedia'}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <button
                                onClick={() => handleEditProduct(product)}
                                className="text-blue-600 hover:text-blue-800 mr-2 text-sm"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleManageProductIngredients(product)}
                                className="text-green-600 hover:text-green-800 mr-2 text-sm"
                              >
                                Bahan
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(product.id)}
                                className="text-red-600 hover:text-red-800 text-sm"
                              >
                                Hapus
                              </button>
                            </td>
                          </tr>
                        ))}
                        {products.length === 0 && (
                          <tr>
                            <td colSpan="7" className="py-8 text-center text-gray-500">
                              Tidak ada produk
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Ingredients */}
              {activeTab === 'ingredients' && (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">Bahan Baku</h2>
                    <button
                      onClick={openNewIngredientModal}
                      className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700"
                    >
                      + Tambah Bahan
                    </button>
                  </div>

                  <div className="bg-white rounded-xl shadow overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left py-3 px-4">Nama</th>
                          <th className="text-left py-3 px-4">Satuan</th>
                          <th className="text-left py-3 px-4">Stok</th>
                          <th className="text-left py-3 px-4">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ingredients.map((ingredient) => (
                          <tr key={ingredient.id} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4 font-medium">{ingredient.name}</td>
                            <td className="py-3 px-4">{ingredient.unit}</td>
                            <td className="py-3 px-4">
                              <span className={ingredient.stock <= 10 ? 'text-red-600 font-semibold' : ''}>
                                {ingredient.stock} {ingredient.unit}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <button
                                onClick={() => handleEditIngredient(ingredient)}
                                className="text-blue-600 hover:text-blue-800 mr-3"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteIngredient(ingredient.id)}
                                className="text-red-600 hover:text-red-800"
                              >
                                Hapus
                              </button>
                            </td>
                          </tr>
                        ))}
                        {ingredients.length === 0 && (
                          <tr>
                            <td colSpan="4" className="py-8 text-center text-gray-500">
                              Tidak ada bahan
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Orders */}
              {activeTab === 'orders' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-6">Semua Pesanan</h2>
                  
                  <div className="bg-white rounded-xl shadow overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left py-3 px-4">No. Pesanan</th>
                          <th className="text-left py-3 px-4">Total</th>
                          <th className="text-left py-3 px-4">Metode</th>
                          <th className="text-left py-3 px-4">Kasir</th>
                          <th className="text-left py-3 px-4">Waktu</th>
                          <th className="text-left py-3 px-4">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map((order) => (
                          <tr key={order.id} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4">{order.order_number}</td>
                            <td className="py-3 px-4">{formatCurrency(order.total_amount)}</td>
                            <td className="py-3 px-4 capitalize">{order.payment_method}</td>
                            <td className="py-3 px-4">{order.created_by_name || '-'}</td>
                            <td className="py-3 px-4">
                              {formatDateTime(order.created_at)}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                order.status === 'completed' ? 'bg-green-100 text-green-700' :
                                order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>
                                {order.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {orders.length === 0 && (
                          <tr>
                            <td colSpan="6" className="py-8 text-center text-gray-500">
                              Tidak ada pesanan
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Nota */}
              {activeTab === 'nota' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-6">Pengaturan Nota</h2>
                  
                  {loadingNota ? (
                    <div className="text-center py-8">Memuat...</div>
                  ) : (
                    <div className="bg-white rounded-xl shadow overflow-hidden">
                      <form onSubmit={handleSaveNota}>
                        <div className="p-6 space-y-6">
                          {/* Shop Info Section */}
                          <div>
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Informasi Toko</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Nama Toko
                                </label>
                                <input
                                  type="text"
                                  value={notaSettings.shop_name}
                                  onChange={(e) => handleNotaChange('shop_name', e.target.value)}
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                                  placeholder="Nama toko Anda"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  No. Telepon
                                </label>
                                <input
                                  type="text"
                                  value={notaSettings.phone}
                                  onChange={(e) => handleNotaChange('phone', e.target.value)}
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                                  placeholder="Nomor telepon"
                                />
                              </div>
                              <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Alamat
                                </label>
                                <textarea
                                  value={notaSettings.address}
                                  onChange={(e) => handleNotaChange('address', e.target.value)}
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                                  rows="2"
                                  placeholder="Alamat toko Anda"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Display Options Section */}
                          <div>
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Opsi Tampilan</h3>
                            <div className="space-y-3">
                              <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={notaSettings.show_logo}
                                  onChange={(e) => handleNotaChange('show_logo', e.target.checked)}
                                  className="w-5 h-5 text-amber-600 rounded focus:ring-amber-500"
                                />
                                <span className="text-gray-700">Tampilkan logo toko</span>
                              </label>
                              <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={notaSettings.show_qr_code}
                                  onChange={(e) => handleNotaChange('show_qr_code', e.target.checked)}
                                  className="w-5 h-5 text-amber-600 rounded focus:ring-amber-500"
                                />
                                <span className="text-gray-700">Tampilkan QR Code pembayaran</span>
                              </label>
                            </div>
                          </div>

                          {/* Tax & Currency Section */}
                          <div>
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Pajak & Mata Uang</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Mata Uang
                                </label>
                                <select
                                  value={notaSettings.currency}
                                  onChange={(e) => handleNotaChange('currency', e.target.value)}
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                                >
                                  <option value="IDR">IDR (Rupiah)</option>
                                  <option value="USD">USD (Dollar)</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Tarif Pajak (%)
                                </label>
                                <input
                                  type="number"
                                  value={notaSettings.tax_rate}
                                  onChange={(e) => handleNotaChange('tax_rate', parseFloat(e.target.value) || 0)}
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                                  min="0"
                                  max="100"
                                  step="0.1"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Footer Text Section */}
                          <div>
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Teks Footer Nota</h3>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Pesan Terima Kasih
                              </label>
                              <textarea
                                value={notaSettings.footer_text}
                                onChange={(e) => handleNotaChange('footer_text', e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                                rows="3"
                                placeholder="Pesan yang muncul di bawah nota"
                              />
                            </div>
                          </div>

                          {/* Preview Section */}
                          <div>
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Pratinjau Nota</h3>
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                              <div className="text-center border-b pb-3 mb-3">
                                {notaSettings.show_logo && (
                                  <div className="text-3xl mb-2">🏪</div>
                                )}
                                <h4 className="font-bold text-lg">{notaSettings.shop_name || 'Nama Toko'}</h4>
                                {notaSettings.address && (
                                  <p className="text-sm text-gray-600">{notaSettings.address}</p>
                                )}
                                {notaSettings.phone && (
                                  <p className="text-sm text-gray-600">Telp: {notaSettings.phone}</p>
                                )}
                              </div>
                              <div className="text-sm space-y-1 border-b pb-3 mb-3">
                                <div className="flex justify-between">
                                  <span>Produk 1</span>
                                  <span>Rp 10.000</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Produk 2</span>
                                  <span>Rp 15.000</span>
                                </div>
                              </div>
                              <div className="text-sm space-y-1 border-b pb-3 mb-3">
                                <div className="flex justify-between font-semibold">
                                  <span>Total</span>
                                  <span>Rp 25.000</span>
                                </div>
                                {notaSettings.tax_rate > 0 && (
                                  <div className="flex justify-between text-gray-600">
                                    <span>Pajak ({notaSettings.tax_rate}%)</span>
                                    <span>Rp 2.500</span>
                                  </div>
                                )}
                              </div>
                              {notaSettings.show_qr_code && (
                                <div className="text-center py-2 border-b pb-3 mb-3">
                                  <div className="text-2xl">📱</div>
                                  <p className="text-xs text-gray-500">Scan untuk pembayaran</p>
                                </div>
                              )}
                              <div className="text-center text-sm text-gray-600 italic">
                                {notaSettings.footer_text || 'Terima kasih atas kunjungan Anda!'}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setNotaSettings({
                                shop_name: 'POSMarbLe',
                                address: '',
                                phone: '',
                                footer_text: 'Terima kasih telah belanja di toko kami!',
                                show_logo: true,
                                show_qr_code: false,
                                tax_rate: 0,
                                currency: 'IDR',
                              });
                            }}
                            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                          >
                            Reset ke Default
                          </button>
                          <button
                            type="submit"
                            disabled={savingNota}
                            className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
                          >
                            {savingNota ? 'Menyimpan...' : 'Simpan Perubahan'}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              {editingCategory ? 'Edit Kategori' : 'Tambah Kategori'}
            </h3>
            <form onSubmit={handleSaveCategory}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nama Kategori
                </label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Deskripsi
                </label>
                <textarea
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                  rows="3"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCategoryModal(false);
                    setEditingCategory(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              {editingProduct ? 'Edit Produk' : 'Tambah Produk'}
            </h3>
            <form onSubmit={handleSaveProduct}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nama Produk
                </label>
                <input
                  type="text"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Deskripsi
                </label>
                <textarea
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                  rows="2"
                />
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Harga
                  </label>
                  <input
                    type="number"
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stok (tanpa bahan)
                  </label>
                  <input
                    type="number"
                    value={productForm.stock}
                    onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                    placeholder="Untuk produk tanpa bahan"
                  />
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kategori
                </label>
                <select
                  value={productForm.category_id}
                  onChange={(e) => setProductForm({ ...productForm, category_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">Pilih Kategori</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Ingredients Section */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bahan yang Dibutuhkan <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Tambahkan bahan dan jumlah yang diperlukan untuk produk ini
                </p>
                
                {ingredients.length === 0 ? (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
                    Tidak ada bahan tersedia. Silakan tambah bahan terlebih dahulu di menu Bahan.
                  </div>
                ) : (
                  <>
                    <div className="space-y-2 mb-3">
                      {productForm.ingredients.map((ing, index) => (
                        <div key={index} className="flex gap-2 items-center">
                          <select
                            value={ing.ingredient_id}
                            onChange={(e) => updateIngredientInForm(index, 'ingredient_id', e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm"
                          >
                            <option value="">Pilih Bahan</option>
                            {ingredients.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name} ({item.stock} {item.unit})
                              </option>
                            ))}
                          </select>
                          <input
                            type="number"
                            placeholder="Jml"
                            value={ing.quantity_required}
                            onChange={(e) => updateIngredientInForm(index, 'quantity_required', e.target.value)}
                            className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm"
                            step="0.1"
                            min="0"
                          />
                          <button
                            type="button"
                            onClick={() => removeIngredientFromForm(index)}
                            className="text-red-500 hover:text-red-700 px-2"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                    
                    <button
                      type="button"
                      onClick={addIngredientToForm}
                      className="w-full px-4 py-2 border-2 border-dashed border-gray-300 text-gray-600 rounded-lg hover:border-amber-500 hover:text-amber-600 text-sm"
                    >
                      + Tambah Bahan
                    </button>
                  </>
                )}
              </div>
              
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowProductModal(false);
                    setEditingProduct(null);
                    setProductForm({ name: '', description: '', price: '', category_id: '', stock: '', ingredients: [] });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ingredient Modal */}
      {showIngredientModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              {editingIngredient ? 'Edit Bahan' : 'Tambah Bahan'}
            </h3>
            <form onSubmit={handleSaveIngredient}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nama Bahan
                </label>
                <input
                  type="text"
                  value={ingredientForm.name}
                  onChange={(e) => setIngredientForm({ ...ingredientForm, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                  placeholder="Contoh: Kopi, Gula, Susu"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Satuan
                </label>
                <select
                  value={ingredientForm.unit}
                  onChange={(e) => setIngredientForm({ ...ingredientForm, unit: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                >
                  <option value="gram">gram</option>
                  <option value="ml">ml</option>
                  <option value="pcs">pcs</option>
                  <option value="sachet">sachet</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stok
                </label>
                <input
                  type="number"
                  value={ingredientForm.stock}
                  onChange={(e) => setIngredientForm({ ...ingredientForm, stock: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowIngredientModal(false);
                    setEditingIngredient(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Product Ingredients Modal */}
      {showProductIngredientModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              Kelola Bahan: {selectedProduct.name}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Tentukan bahan dan jumlah yang dibutuhkan untuk membuat produk ini
            </p>
            
            <div className="space-y-3 mb-4">
              {productIngredientForm.map((pi, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <select
                    value={pi.ingredient_id}
                    onChange={(e) => updateProductIngredient(index, 'ingredient_id', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">Pilih Bahan</option>
                    {ingredients.map((ing) => (
                      <option key={ing.id} value={ing.id}>
                        {ing.name} ({ing.stock} {ing.unit})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    placeholder="Jml"
                    value={pi.quantity_required}
                    onChange={(e) => updateProductIngredient(index, 'quantity_required', e.target.value)}
                    className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                    step="0.1"
                  />
                  <button
                    type="button"
                    onClick={() => removeProductIngredient(index)}
                    className="text-red-500 hover:text-red-700 px-2"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addProductIngredient}
              className="w-full mb-4 px-4 py-2 border-2 border-dashed border-gray-300 text-gray-600 rounded-lg hover:border-amber-500 hover:text-amber-600"
            >
              + Tambah Bahan
            </button>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowProductIngredientModal(false);
                  setSelectedProduct(null);
                  setProductIngredientForm([]);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveProductIngredients}
                className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Purchase Modal */}
      {showPurchaseModal && selectedIngredientForPurchase && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              Pembelian {selectedIngredientForPurchase.name}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Stok saat ini: <span className="font-semibold">{selectedIngredientForPurchase.stock} {selectedIngredientForPurchase.unit}</span>
            </p>
            
            <form onSubmit={handlePurchase}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Jumlah Pembelian ({selectedIngredientForPurchase.unit})
                </label>
                <input
                  type="number"
                  value={purchaseForm.quantity}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, quantity: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder={`Masukkan jumlah dalam ${selectedIngredientForPurchase.unit}`}
                  step="0.1"
                  min="0.1"
                  required
                  autoFocus
                />
              </div>
              
              <p className="text-sm text-gray-500 mb-4">
                Stok akan ditambahkan ke jumlah yang ada.
              </p>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowPurchaseModal(false);
                    setSelectedIngredientForPurchase(null);
                    setPurchaseForm({ quantity: '' });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Simpan Pembelian
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Purchase History Modal */}
      {showPurchaseHistoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              Riwayat Pembelian
            </h3>
            
            {/* Date Filter */}
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Filter Tanggal</p>
              <div className="flex flex-wrap gap-3 items-end">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Tanggal Mulai</label>
                  <input
                    type="date"
                    value={purchaseFilter.startDate}
                    onChange={(e) => handlePurchaseFilterChange('startDate', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Tanggal Akhir</label>
                  <input
                    type="date"
                    value={purchaseFilter.endDate}
                    onChange={(e) => handlePurchaseFilterChange('endDate', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <button
                  onClick={applyPurchaseFilter}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700"
                >
                  Terapkan Filter
                </button>
                <button
                  onClick={() => {
                    setPurchaseFilter({ startDate: '', endDate: '' });
                    loadPurchaseHistory();
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-100"
                >
                  Reset
                </button>
              </div>
            </div>
            
            {loadingPurchaseHistory ? (
              <p className="text-gray-500 text-center py-8">Memuat data...</p>
            ) : purchaseHistory.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Tidak ada riwayat pembelian</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-2 px-3 text-sm">No. Pembelian</th>
                      <th className="text-left py-2 px-3 text-sm">Bahan</th>
                      <th className="text-left py-2 px-3 text-sm">Jumlah</th>
                        <th className="text-left py-2 px-3 text-sm">Harga Total</th>

                      <th className="text-left py-2 px-3 text-sm">Total</th>
                      <th className="text-left py-2 px-3 text-sm">Waktu</th>
                      <th className="text-left py-2 px-3 text-sm">Kasir</th>
                      <th className="text-left py-2 px-3 text-sm">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchaseHistory.map((purchase) => (
                      <tr key={purchase.id} className="border-t">
                        <td className="py-2 px-3 text-sm">{purchase.purchase_number}</td>
                        <td className="py-2 px-3 text-sm">{purchase.ingredient_name}</td>
                        <td className="py-2 px-3 text-sm">{purchase.quantity} {purchase.unit}</td>
                        <td className="py-2 px-3 text-sm">{formatCurrency(purchase.unit_price)}</td>
                        <td className="py-2 px-3 text-sm font-semibold">{formatCurrency(purchase.total_price)}</td>
                        <td className="py-2 px-3 text-sm">
                          {formatDateTime(purchase.created_at)}
                        </td>
                        <td className="py-2 px-3 text-sm">{purchase.created_by_name || '-'}</td>
                        <td className="py-2 px-3">
                          <button
                            onClick={() => handleDeletePurchase(purchase.id)}
                            className="text-red-500 hover:text-red-700 text-xs"
                          >
                            Hapus
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => {
                  setShowPurchaseHistoryModal(false);
                  setPurchaseFilter({ startDate: '', endDate: '' });
                  setPurchaseHistory([]);
                }}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
