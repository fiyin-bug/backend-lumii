// services/paystack.service.js
const axios = require('axios');
const { paystackSecretKey } = require('../config/paystack.config');

const PAYSTACK_API_URL = 'https://api.paystack.co';

/**
 * Initialize a Paystack transaction.
 * @param {string} email Customer's email address.
 * @param {number} amountInKobo Amount in the smallest currency unit (Kobo for NGN).
 * @param {string} reference Unique transaction reference generated by our system.
 * @param {string} callbackUrl URL Paystack redirects to after payment attempt.
 * @param {object} [metadata={}] Optional metadata to store with the transaction.
 * @returns {Promise<{success: boolean, data?: object, message?: string}>}
 */
const initializeTransaction = async (email, amountInKobo, reference, callbackUrl, metadata = {}) => {
  if (!paystackSecretKey) {
     console.error("Paystack secret key is not configured.");
     return { success: false, message: "Payment service configuration error." };
  }
  try {
    const response = await axios.post(
      `${PAYSTACK_API_URL}/transaction/initialize`,
      {
        email: email,
        amount: amountInKobo, // Amount must be in kobo/cents
        reference: reference,
        callback_url: callbackUrl,
        metadata: metadata,
      },
      {
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache' // Recommended by Paystack
        },
      }
    );
    // Check if Paystack response indicates success
    if (response.data && response.data.status === true && response.data.data) {
       return { success: true, data: response.data.data }; // data contains authorization_url, access_code, reference
    } else {
        console.error("Paystack Initialization Response Error:", response.data);
        return { success: false, message: response.data?.message || "Failed to initialize Paystack transaction (API response)." };
    }
  } catch (error) {
    console.error("Paystack Initialization HTTP Error:", error.response ? error.response.data : error.message);
    const errorMessage = error.response?.data?.message || "Failed to communicate with payment service.";
    return { success: false, message: errorMessage };
  }
};

/**
 * Verify a Paystack transaction status.
 * @param {string} reference The unique transaction reference.
 * @returns {Promise<{success: boolean, data?: object, message?: string}>}
 */
const verifyTransaction = async (reference) => {
   if (!paystackSecretKey) {
     console.error("Paystack secret key is not configured.");
     return { success: false, message: "Payment service configuration error." };
   }
   try {
        const response = await axios.get(
            `${PAYSTACK_API_URL}/transaction/verify/${reference}`,
            {
                headers: {
                    Authorization: `Bearer ${paystackSecretKey}`,
                    'Cache-Control': 'no-cache' // Recommended by Paystack
                },
            }
        );
        // Check status within the nested 'data' object of the response
        if (response.data && response.data.status === true && response.data.data) {
             // Further check the actual transaction status inside response.data.data
             if (response.data.data.status === 'success') {
                 return { success: true, data: response.data.data }; // Transaction was successful
             } else {
                 // Transaction status is not 'success' (e.g., 'failed', 'abandoned')
                 console.warn(`Paystack verification: Reference ${reference} status is '${response.data.data.status}'`);
                 return { success: false, message: response.data.data.gateway_response || "Transaction not successful", data: response.data.data };
             }
        } else {
            console.error("Paystack Verification Response Error:", response.data);
            return { success: false, message: response.data?.message || "Failed to verify Paystack transaction (API response)." };
        }
   } catch (error) {
        console.error("Paystack Verification HTTP Error:", error.response ? error.response.data : error.message);
        const errorMessage = error.response?.data?.message || "Failed to communicate with payment verification service.";
        return { success: false, message: errorMessage };
   }
};

module.exports = {
  initializeTransaction,
  verifyTransaction,
};