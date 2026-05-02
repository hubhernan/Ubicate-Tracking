import axios from 'axios';

const API_URL = 'http://localhost:4000/api';

// Add token to requests
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const login = async (credentials: any) => {
  const response = await axios.post(`${API_URL}/auth/login`, credentials);
  if (response.data.token) {
    localStorage.setItem('token', response.data.token);
  }
  return response.data;
};

export const register = async (userData: any) => {
  const response = await axios.post(`${API_URL}/auth/register`, userData);
  return response.data;
};

export const getGeofences = async () => {
  const response = await axios.get(`${API_URL}/geofences`);
  return response.data;
};

export const createGeofence = async (geofence: any) => {
  const response = await axios.post(`${API_URL}/geofences`, geofence);
  return response.data;
};

export const getHistory = async (assetId: string, start: string, end: string) => {
  const response = await axios.get(`${API_URL}/history/${assetId}`, {
    params: { start, end }
  });
  return response.data;
};

export const calculateRoute = async (params: any) => {
  const response = await axios.post(`${API_URL}/routing/calculate`, params);
  return response.data;
};

export const updateAssetMode = async (assetId: string, mode: string, speedLimit: number) => {
  const response = await axios.patch(`${API_URL}/assets/${assetId}/mode`, { mode, speedLimit });
  return response.data;
};

export const getAssets = async () => {
  const response = await axios.get(`${API_URL}/assets`);
  return response.data;
};

export const createAsset = async (asset: any) => {
  const response = await axios.post(`${API_URL}/assets`, asset);
  return response.data;
};
