// controllers/payment.controller.js
const { initializeTransaction } = require('../services/paystack.service');
const { verifyTransaction } = require('../services/paystack.service');
const { sendBusinessNotification } = require('../services/email.service');

exports.initializeCheckout = async (req, res) => {
  const { email, firstName, lastName, phone, shippingAddress, items } = req.body;

  // Validate request body
  if (!email || !firstName || !lastName || !phone || !shippingAddress || !items || !items.length) {
    return res.status(400).json({ success: false, message: 'Missing required fields or empty cart.' });
  }

  // Generate unique reference
  const reference = `LUMIS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Prepare metadata
  const metadata = {
    customer_name: `${firstName} ${lastName}`,
    customer_email: email,
    customer_phone: phone,
    shipping_address: shippingAddress,
    cart_items: items,
  };

  // Calculate amount dynamically based on items (example: sum item prices)
  // Replace with your actual pricing logic
  const amountInKobo = items.reduce((total, item) => {
    // Assume item has a price field in NGN; convert to kobo
    return total + (item.price * item.quantity * 100);
  }, 0);

  // Use API_BASE_URL from config for callback
  const { apiBaseUrl } = require('../config');
  const callbackUrl = `${apiBaseUrl}/payment/callback`; // This is the backend URL Paystack redirects to

  const result = await initializeTransaction(email, amountInKobo, reference, callbackUrl, metadata);

  if (result.success) {
    res.json({
      success: true,
      authorizationUrl: result.data.authorization_url,
    });
  } else {
    res.status(500).json({ success: false, message: result.message });
  }
};

// --- NEW Function: Handles the initial redirect from Paystack ---
// This function's sole purpose is to receive the redirect from Paystack
// and immediately send the browser to the frontend callback page.
exports.handlePaystackCallback = async (req, res) => {
    const { reference } = req.query; // Get the reference from Paystack's query parameters

    // *** IMPORTANT: Replace with your actual frontend base URL and callback path ***
    const frontendBaseUrl = 'http://localhost:5173'; // e.g., http://localhost:3000 or https://your-frontend-domain.com
    const frontendCallbackPath = '/payment/callback'; // e.g., /payment/callback

    const frontendCallbackUrl = `${frontendBaseUrl}${frontendCallbackPath}?reference=${reference}`;

    if (!reference) {
        // If no reference, redirect to frontend with an indicator of failure
        const frontendFailureUrl = `${frontendBaseUrl}${frontendCallbackPath}?status=failed&message=no_reference`;
        console.warn(`Received Paystack callback without reference. Redirecting to frontend failure URL: ${frontendFailureUrl}`);
        return res.redirect(302, frontendFailureUrl);
    }

    console.log(`Received Paystack callback for reference ${reference}. Redirecting browser to frontend: ${frontendCallbackUrl}`);

    // Perform the redirect (HTTP 302 Found)
    // The browser will then navigate to the frontend URL
    res.redirect(302, frontendCallbackUrl);

    // Note: The actual payment verification will be triggered by the frontend
    // calling a different backend endpoint (verifyPaymentStatus below).
};

// --- Renamed Function: Contains the actual verification logic ---
// This function is called by the frontend PaymentCallback.jsx component
// AFTER the browser has been redirected to the frontend URL.
exports.verifyPaymentStatus = async (req, res) => { // <-- Renamed function
     const { reference } = req.query; // Get the reference from the frontend's API call query parameters

    if (!reference) {
      // This validation is also in the frontend, but good to keep on the backend
      return res.status(400).json({ success: false, message: 'Transaction reference is required.' });
    }

    console.log(`Frontend requesting verification for reference: ${reference}`);

    const result = await verifyTransaction(reference);

    if (result.success) {
      console.log(`Verification successful for ref ${reference}. Sending notification email.`);
      // Send business notification email - Add logic here to ensure email is sent only the first time verification succeeds
      // This prevents duplicate emails if the frontend re-attempts verification
      // A simple way is to store verification status in your DB.
      await sendBusinessNotification(result.data);
      res.json({ success: true, message: 'Payment verified successfully.', data: result.data });
    } else {
      console.warn(`Verification failed for ref ${reference}. Message: ${result.message}`);
      // Send failure email if needed, based on gateway_response
      res.status(400).json({ success: false, message: result.message, data: result.data }); // Pass data for details
    }
};

// Make sure to export all functions that need to be accessible by the router
module.exports = {
  initializeCheckout: exports.initializeCheckout,
  handlePaystackCallback: exports.handlePaystackCallback, // The new redirector
  verifyPaymentStatus: exports.verifyPaymentStatus,     // The verification logic
};