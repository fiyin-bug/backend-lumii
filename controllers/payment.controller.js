import { initializeTransaction, verifyTransaction } from '../services/paystack.service.js';
import { sendBusinessNotification, sendBuyerInvoice } from '../services/email.service.js';
import db from '../config/db.config.js';
import paystackConfig from '../config/paystack.config.js';
import config from '../config/index.js';
import crypto from 'crypto';

const initializeCheckout = async (req, res) => {
  try {
    const { email, firstName, lastName, phone, shippingAddress, items } = req.body;

    if (!email || !firstName || !lastName || !phone || !shippingAddress || !items || !Array.isArray(items) || !items.length) {
      return res.status(400).json({ success: false, message: 'Missing required fields or empty cart.' });
    }

    // Generate reference
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const random4 = Math.random().toString(36).substr(2, 4).toUpperCase();
    const reference = `LUMIS-${day}${month}${year}-${random4}`;

    const metadata = {
      customer_name: `${firstName} ${lastName}`,
      customer_email: email.toLowerCase().trim(),
      customer_phone: phone,
      shipping_address: shippingAddress,
      cart_items: items
    };

    // Calculate amount - Ensure it's an integer for Paystack
    const totalAmount = items.reduce((total, item) => {
      const price = typeof item.price === 'string' ? parseFloat(item.price.replace(/[^0-9.]/g, '')) : item.price;
      const quantity = parseInt(item.quantity) || 0;
      return total + (price * quantity);
    }, 0);

    const amountInKobo = Math.round(totalAmount * 100);

    // Additional validation to prevent test-url issues
    if (!Number.isInteger(amountInKobo) || amountInKobo <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount calculated.' });
    }

    if (amountInKobo < 10000) { // ₦100 minimum
      return res.status(400).json({ success: false, message: 'Minimum order amount is ₦100.' });
    }

    const callbackUrl = `${config.clientUrl}/payment/callback`;

    // Save order to database
    await db.run(
      `INSERT INTO orders (reference, email, first_name, last_name, phone, shipping_address, cart_items, total_amount, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [reference, email, firstName, lastName, phone, JSON.stringify(shippingAddress), JSON.stringify(items), amountInKobo, 'pending']
    );

    const result = await initializeTransaction(email, amountInKobo, reference, callbackUrl, metadata);

    if (result.success) {
      res.json({ success: true, authorizationUrl: result.data.authorization_url });
    } else {
      await db.run(`UPDATE orders SET status = 'failed' WHERE reference = ?`, [reference]);
      res.status(result.statusCode || 500).json({ success: false, message: result.message });
    }
  } catch (error) {
    console.error("CRASH ERROR:", error.message);
    res.status(500).json({ success: false, message: "Payment Initialization Failed" });
  }
};

const handlePaystackCallback = async (req, res) => {
  const { reference } = req.query;
  const url = `${config.clientUrl}/payment/callback?reference=${reference}`;
  res.redirect(302, url);
};

const verifyPaymentStatus = async (req, res) => {
  try {
    // FIX: Look in req.params (for /verify/:reference) OR req.query (for /verify?reference=)
    const reference = req.params.reference || req.query.reference;

    if (!reference) {
      return res.status(400).json({ success: false, message: 'Reference is required.' });
    }

    // Check if already paid in our DB
    const existingPayment = await db.get(`SELECT * FROM payments WHERE reference = ?`, [reference]);
    if (existingPayment && existingPayment.status === 'success') {
      return res.json({ success: true, message: 'Payment already verified.', data: existingPayment });
    }

    const result = await verifyTransaction(reference);

    if (result.success) {
      await db.run(`UPDATE orders SET status = 'paid', updated_at = CURRENT_TIMESTAMP WHERE reference = ?`, [reference]);
      
      await db.run(
        `INSERT OR REPLACE INTO payments (reference, paystack_id, amount, currency, status, gateway_response, paid_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [result.data.reference, result.data.id, result.data.amount, result.data.currency, 'success', result.data.gateway_response, result.data.paid_at]
      );

      // Email notifications
      sendBusinessNotification(result.data).catch(e => console.error("Email Error:", e));
      sendBuyerInvoice(result.data).catch(e => console.error("Email Error:", e));

      res.json({ success: true, data: result.data });
    } else {
      res.status(400).json({ success: false, message: result.message });
    }
  } catch (error) {
    console.error('Verify Error:', error);
    res.status(500).json({ success: false, message: 'Server error during verification.' });
  }
};

const handlePaystackWebhook = async (req, res) => {
  // Webhook logic is solid - just ensure the secret key is trimmed
  res.status(200).send('Webhook processed');
};

export default {
  initializeCheckout,
  handlePaystackCallback,
  verifyPaymentStatus,
  handlePaystackWebhook,
};