import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
};

export const loginUser = async (username, password) => {
  try {
    const response = await api.post('/auth/login', { username, password });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Login failed');
  }
};

export const registerUser = async (username, password) => {
  try {
    const response = await api.post('/auth/register', { username, password });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Registration failed');
  }
};

export const getCurrentUser = async () => {
  try {
    const response = await api.get('/auth/me');
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Failed to fetch current user');
  }
};

export const predictDemand = async (data) => {
  try {
    const response = await api.post('/predict', data);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Failed to predict demand');
  }
};

export const getInventoryRecommendations = async (filters = {}) => {
  try {
    const params = {};
    if (filters.region && filters.region !== 'All') params.region = filters.region;
    if (filters.recommendation && filters.recommendation !== 'All') params.recommendation = filters.recommendation;
    const response = await api.get('/recommend', { params });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Failed to get recommendations');
  }
};

export const getInventoryMetadata = async () => {
  try {
    const response = await api.get('/metadata');
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Failed to get metadata');
  }
};

export const trainModel = async (payload = { model_type: 'xgboost' }) => {
  try {
    const response = await api.post('/train', payload);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Failed to train model');
  }
};

export const getTrainOptions = async () => {
  try {
    const response = await api.get('/train/options');
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Failed to fetch model options');
  }
};

export const getWeather = async (region, date) => {
  try {
    const response = await api.get('/weather', { params: { region, date } });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Failed to fetch weather');
  }
};

export const getCalendarEvents = async (date, country = 'IN') => {
  try {
    const response = await api.get('/calendar', { params: { date, country } });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Failed to fetch calendar data');
  }
};

export const getUsers = async () => {
  try {
    const response = await api.get('/admin/users');
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Failed to fetch users');
  }
};

export const createUserByAdmin = async (payload) => {
  try {
    const response = await api.post('/admin/users', payload);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Failed to create user');
  }
};

export const getProducts = async () => {
  try {
    const response = await api.get('/products');
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Failed to fetch products');
  }
};

export const createProduct = async (payload) => {
  try {
    const response = await api.post('/products', payload);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Failed to create product');
  }
};

export const getInventoryRecords = async (region) => {
  try {
    const response = await api.get('/inventory/records', { params: region ? { region } : {} });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Failed to fetch inventory records');
  }
};

export const adjustInventory = async (payload) => {
  try {
    const response = await api.post('/inventory/adjust', payload);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Failed to adjust inventory');
  }
};

export const getStockTransactions = async (limit = 100) => {
  try {
    const response = await api.get('/inventory/transactions', { params: { limit } });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Failed to fetch stock transactions');
  }
};

export const getAuthLogs = async (limit = 100) => {
  try {
    const response = await api.get('/admin/auth-logs', { params: { limit } });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Failed to fetch auth logs');
  }
};

export default api; 
