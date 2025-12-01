// frontend-debug-example.js
// Add this to your frontend to debug API calls

import axios from 'axios';

// ✅ UPDATED: Use Vercel production URL
const api = axios.create({
  baseURL: 'https://backend-lumii-plm7dk0yz-davids-projects-b37cdfcb.vercel.app/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for debugging
api.interceptors.request.use(
  (config) => {
    // ✅ YOUR DEBUG LINE
    console.log("POST to:", api.defaults.baseURL + config.url);
    console.log("Full URL:", config.baseURL + config.url);
    console.log("Request data:", config.data);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for debugging
api.interceptors.response.use(
  (response) => {
    console.log("Response:", response.data);
    return response;
  },
  (error) => {
    console.error("API Error:", error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default api;

// Example usage in your CartPage.jsx
export const paymentAPI = {
  initialize: (orderData) => {
    console.log("Initializing payment with data:", orderData);
    return api.post('/payment/initialize', orderData);
  },
  
  verify: (reference) => {
    console.log("Verifying payment:", reference);
    return api.get(`/payment/verify?reference=${reference}`);
  },
};
