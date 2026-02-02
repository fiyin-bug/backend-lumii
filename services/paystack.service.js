// services/paystack.service.js
import axios from "axios";
import paystackConfig from "../config/paystack.config.js";

const PAYSTACK_API_URL = 'https://api.paystack.co';

export const initializeTransaction = async (email, amountInKobo, reference, callbackUrl, metadata = {}) => {
  // 1. Ensure Secret Key is clean
  const secretKey = String(paystackConfig.paystackSecretKey || '').trim();
  
  if (!secretKey || secretKey === 'undefined') {
     return { success: false, message: "Paystack Secret Key is missing." };
  }

  try {
    // 2. Paystack requires AMOUNT to be an INTEGER. 
    // If it has a decimal point, Paystack redirects to that 404 "test-url".
    const cleanAmount = Math.floor(amountInKobo); 

    const response = await axios.post(
      `${PAYSTACK_API_URL}/transaction/initialize`,
      {
        email: email.toLowerCase().trim(),
        amount: cleanAmount, 
        currency: "NGN", // ✅ MANDATORY to prevent the test-url bug
        reference: reference,
        callback_url: callbackUrl,
        metadata: metadata,
      },
      {
        headers: {
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/json'
        },
      }
    );

    if (response.data?.status === true) {
       return { success: true, data: response.data.data }; 
    } 
    
    return { success: false, message: response.data?.message || "Initialization failed" };
  } catch (error) {
    console.error("❌ Paystack API Error:", error.response?.data || error.message);
    return {
      success: false,
      message: error.response?.data?.message || "Communication Error",
    };
  }
};

export const verifyTransaction = async (reference) => {
   const secretKey = String(paystackConfig.paystackSecretKey || '').trim();
   try {
        const response = await axios.get(
            `${PAYSTACK_API_URL}/transaction/verify/${encodeURIComponent(reference)}`,
            { headers: { Authorization: `Bearer ${secretKey}` } }
        );
        if (response.data?.status === true) return { success: true, data: response.data.data };
        return { success: false, message: "Verification failed" };
   } catch (error) {
        return { success: false, message: "Connection error" };
   }
};