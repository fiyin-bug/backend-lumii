const { initializeTransaction, verifyTransaction } = require('../services/paystack.service');
const { sendBusinessNotification, sendBuyerInvoice } = require('../services/email.service');

// In-memory cache to track processed transactions
const processedTransactions = new Set();

exports.initializeCheckout = async (req, res) => {
  try {
    const { email, firstName, lastName, phone, shippingAddress, items } = req.body;

    if (!email || !firstName || !lastName || !phone || !shippingAddress || !items || !Array.isArray(items) || !items.length) {
      return res.status(400).json({ success: false, message: 'Missing required fields or empty cart.' });
    }

    // Validate items
    for (const item of items) {
      if (!item.name || typeof item.price !== 'number' || typeof item.quantity !== 'number') {
        return res.status(400).json({ success: false, message: 'Invalid item data.' });
      }
    }

    // Generate reference in format LUMIS-DD.MM.YYYY-RANDOM4
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0'); // e.g., 25
    const month = String(now.getMonth() + 1).padStart(2, '0'); // e.g., 06 (0-based)
    const year = now.getFullYear(); // e.g., 2025
    const random4 = Math.random().toString(36).substr(2, 4); // 4-character random string
    const reference = `LUMIS-${day}.${month}.${year}-${random4}`; // e.g., LUMIS-25.06.2025-abcd

    const metadata = {
      customer_name: `${firstName} ${lastName}`,
      customer_email: email,
      customer_phone: phone,
      shipping_address: shippingAddress,
      cart_items: items,
    };

    const amountInKobo = items.reduce((total, item) => {
      return total + (item.price * item.quantity * 100);
    }, 0);

    const { apiBaseUrl } = require('../config');
    if (!apiBaseUrl) {
      console.error('API_BASE_URL not configured');
      return res.status(500).json({ success: false, message: 'Server configuration error.' });
    }
    const callbackUrl = `${apiBaseUrl}/payment/callback`;

    const result = await initializeTransaction(email, amountInKobo, reference, callbackUrl, metadata);

    if (result.success) {
      res.json({
        success: true,
        authorizationUrl: result.data.authorization_url,
      });
    } else {
      res.status(500).json({ success: false, message: result.message });
    }
  } catch (error) {
    console.error('Error in initializeCheckout:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

exports.handlePaystackCallback = async (req, res) => {
  const { reference } = req.query;

  const frontendBaseUrl = 'http://localhost:5173';
  const frontendCallbackPath = '/payment/callback';
  const frontendCallbackUrl = `${frontendBaseUrl}${frontendCallbackPath}?reference=${reference}`;

  if (!reference) {
    const frontendFailureUrl = `${frontendBaseUrl}${frontendCallbackPath}?status=failed&message=no_reference`;
    console.warn(`Received Paystack callback without reference. Redirecting to frontend failure URL: ${frontendFailureUrl}`);
    return res.redirect(302, frontendFailureUrl);
  }

  console.log(`Received Paystack callback for reference ${reference}. Redirecting browser to frontend: ${frontendCallbackUrl}`);
  res.redirect(302, frontendCallbackUrl);
};

exports.verifyPaymentStatus = async (req, res) => {
  try {
    const { reference } = req.query;

    if (!reference) {
      return res.status(400).json({ success: false, message: 'Transaction reference is required.' });
    }

    console.log(`Frontend requesting verification for reference: ${reference}`);
    const result = await verifyTransaction(reference);

    if (result.success) {
      if (processedTransactions.has(reference)) {
        console.log(`Transaction ${reference} already processed. Skipping email notifications.`);
        return res.json({ success: true, message: 'Payment already verified.', data: result.data });
      }

      console.log(`Verification successful for ref ${reference}. Order Details:`, JSON.stringify(result.data, null, 2));
      await sendBusinessNotification(result.data);
      await sendBuyerInvoice(result.data);
      processedTransactions.add(reference);
      res.json({ success: true, message: 'Payment verified successfully.', data: result.data });
    } else {
      console.warn(`Verification failed for ref ${reference}. Message: ${result.message}`);
      res.status(400).json({ success: false, message: result.message, data: result.data });
    }
  } catch (error) {
    console.error('Error in verifyPaymentStatus:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

module.exports = {
  initializeCheckout: exports.initializeCheckout,
  handlePaystackCallback: exports.handlePaystackCallback,
  verifyPaymentStatus: exports.verifyPaymentStatus,
};
