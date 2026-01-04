// frontend-api-example.js
// Example of how to configure your frontend API

import axios from 'axios';

// ✅ CORRECT: Use HTTPS Vercel URL
const api = axios.create({
  baseURL: 'https://backend-lumii-plm7dk0yz-davids-projects-b37cdfcb.vercel.app/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ❌ WRONG: Don't use these
// baseURL: 'http://localhost:5000/api'  // Wrong - HTTP instead of HTTPS
// baseURL: 'http://backend-lumii.vercel.app/api'  // Wrong - HTTP instead of HTTPS

export default api;

// Example usage:
export const paymentAPI = {
  initialize: (orderData) => api.post('/payment/initialize', orderData),
  verify: (reference) => api.get(`/payment/verify?reference=${reference}`),
};
