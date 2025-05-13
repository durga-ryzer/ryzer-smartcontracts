import axios from 'axios';

// Use relative URL when running on the same server
const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Auth API
export const authAPI = {
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },
  register: async (email: string, password: string, name: string) => {
    const response = await api.post('/auth/register', { email, password, name });
    return response.data;
  },
  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },
};

// Wallet API
export const walletAPI = {
  createWallet: async (data: {
    user: string;
    userId: string;
    threshold: number;
    custodians: string[];
    brokers: string[];
  }) => {
    const response = await api.post('/wallet/create', data);
    return response.data;
  },
  getWallet: async (address: string) => {
    const response = await api.get(`/wallet/${address}`);
    return response.data;
  },
  getBalances: async (address: string) => {
    const response = await api.get(`/wallet/${address}/balances`);
    return response.data;
  },
  addToken: async (address: string, tokenData: {
    tokenAddress: string;
    chainId: number;
    symbol: string;
    name?: string;
    decimals: number;
  }) => {
    const response = await api.post(`/wallet/${address}/tokens`, tokenData);
    return response.data;
  },
  removeToken: async (address: string, tokenId: string) => {
    const response = await api.delete(`/wallet/${address}/tokens/${tokenId}`);
    return response.data;
  },
};

// Transaction API
export const transactionAPI = {
  sendTransaction: async (walletAddress: string, data: {
    to: string;
    value: string;
    data?: string;
    gasLimit?: string;
  }) => {
    const response = await api.post(`/relayer/send`, {
      walletAddress,
      ...data
    });
    return response.data;
  },
  getTransactions: async (walletAddress: string) => {
    const response = await api.get(`/indexer/transactions?address=${walletAddress}`);
    return response.data;
  },
};

// Notification API
export const notificationAPI = {
  getNotifications: async () => {
    const response = await api.get('/notification');
    return response.data;
  },
  markAsRead: async (notificationId: string) => {
    const response = await api.put(`/notification/${notificationId}/read`);
    return response.data;
  },
};

export default api;
