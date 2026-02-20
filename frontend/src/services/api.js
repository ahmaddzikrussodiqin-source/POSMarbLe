import axios from 'axios';

// Configure base URL - change this to your Railway URL when deployed
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  getCurrentUser: () => api.get('/auth/me'),
  changePassword: (data) => api.post('/auth/change-password', data),
};

// Categories API
export const categoriesAPI = {
  getAll: () => api.get('/categories'),
  getById: (id) => api.get(`/categories/${id}`),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`),
};

// Products API
export const productsAPI = {
  getAll: (params) => api.get('/products', { params }),
  getById: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  updateStock: (id, stock) => api.patch(`/products/${id}/stock`, { stock }),
};

// Orders API
export const ordersAPI = {
  create: (data) => api.post('/orders', data),
  getAll: (params) => api.get('/orders', { params }),
  getToday: () => api.get('/orders/today'),
  getById: (id) => api.get(`/orders/${id}`),
  cancel: (id) => api.delete(`/orders/${id}`),
};

// Reports API
export const reportsAPI = {
  getSalesSummary: (params) => api.get('/reports/sales-summary', { params }),
  getDailySales: (days) => api.get('/reports/daily-sales', { params: { days } }),
  getBestSelling: (params) => api.get('/reports/best-selling', { params }),
  getHourlySales: () => api.get('/reports/hourly-sales'),
  getTopCashiers: (params) => api.get('/reports/top-cashiers', { params }),
  getPurchaseSummary: (params) => api.get('/reports/purchase-summary', { params }),
  getFinancialSummary: (params) => api.get('/reports/financial-summary', { params }),
  getDailyPurchases: (days) => api.get('/reports/daily-purchases', { params: { days } }),
};

// Purchases API
export const purchasesAPI = {
  createBulk: (data) => api.post('/purchases', data),
  getAll: (params) => api.get('/purchases', { params }),
  getToday: () => api.get('/purchases/today'),
  getById: (id) => api.get(`/purchases/${id}`),
  delete: (id) => api.delete(`/purchases/${id}`),
};

// Users API
export const usersAPI = {
  getAll: () => api.get('/users'),
  getById: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  resetPassword: (id, password) => api.post(`/users/${id}/reset-password`, { new_password: password }),
};

// Ingredients API
export const ingredientsAPI = {
  getAll: () => api.get('/ingredients'),
  getById: (id) => api.get(`/ingredients/${id}`),
  create: (data) => api.post('/ingredients', data),
  update: (id, data) => api.put(`/ingredients/${id}`, data),
  delete: (id) => api.delete(`/ingredients/${id}`),
  updateStock: (id, stock) => api.patch(`/ingredients/${id}/stock`, { stock }),
  purchaseStock: (id, quantity) => api.post(`/ingredients/${id}/purchase`, { quantity }),
  getProductIngredients: (productId) => api.get(`/ingredients/product/${productId}`),
  setProductIngredients: (productId, ingredients) => api.post(`/ingredients/product/${productId}`, { ingredients }),
};

export default api;

