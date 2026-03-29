import { initializeTransaction, verifyTransaction } from '../services/paystack.service.js';
import { sendBusinessNotification, sendBuyerInvoice } from '../services/email.service.js';
import db from '../config/db.config.js';
import config from '../config/index.js';
import crypto from 'crypto';
const initializeCheckout = async (req, res) => {
  try {
    const { email, firstName, lastName, phone, shippingAddress, items } = req.body;

    if (
      !email ||
      !firstName ||
      !lastName ||
      !phone ||
      !shippingAddress ||
      !items ||
      !Array.isArray(items) ||
      !items.length
    ) {
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
      cart_items: items,
    };

    // Calculate amount - Ensure it's an integer for Paystack
    const totalAmount = items.reduce((total, item) => {
      const price =
        typeof item.price === 'string'
          ? parseFloat(item.price.replace(/[^0-9.]/g, ''))
          : Number(item.price);

      const quantity = parseInt(item.quantity, 10) || 0;
      return total + ((Number.isFinite(price) ? price : 0) * quantity);
    }, 0);

    const amountInKobo = Math.round(totalAmount * 100);

    if (!Number.isInteger(amountInKobo) || amountInKobo <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount calculated.' });
    }

    if (amountInKobo < 10000) {
      return res.status(400).json({ success: false, message: 'Minimum order amount is ₦100.' });
    }

    const fallbackClientUrl = req.headers.origin || 'https://lumiprettycollection.com';
    const clientBaseUrl = (config.clientUrl || fallbackClientUrl).replace(/\/$/, '');
    const callbackUrl = `${clientBaseUrl}/payment/callback`;

    const result = await initializeTransaction(email, amountInKobo, reference, callbackUrl, metadata);

    if (result.success) {
      // Do not allow DB write failures to block checkout initialization
      try {
        await db.run(
          `INSERT INTO orders (reference, email, first_name, last_name, phone, shipping_address, cart_items, total_amount, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            reference,
            email,
            firstName,
            lastName,
            phone,
            JSON.stringify(shippingAddress),
            JSON.stringify(items),
            amountInKobo,
            'pending',
          ]
        );
      } catch (dbError) {
        console.error('Order save warning (non-blocking):', dbError.message);
      }

      return res.json({ success: true, authorizationUrl: result.data.authorization_url });
    }

    try {
      await db.run(`UPDATE orders SET status = 'failed' WHERE reference = ?`, [reference]);
    } catch (dbError) {
      console.error('Order fail-status update warning:', dbError.message);
    }

    return res.status(result.statusCode || 500).json({ success: false, message: result.message });
  } catch (error) {
    console.error('CRASH ERROR:', error);
    return res.status(500).json({ success: false, message: error.message || 'Payment Initialization Failed' });
  }
};

const handlePaystackCallback = async (req, res) => {
  const { reference } = req.query;
  const fallbackClientUrl = req.headers.origin || 'https://lumiprettycollection.com';
  const clientBaseUrl = (config.clientUrl || fallbackClientUrl).replace(/\/$/, '');
  const url = `${clientBaseUrl}/payment/callback?reference=${encodeURIComponent(reference || '')}`;
  return res.redirect(302, url);
};

const verifyPaymentStatus = async (req, res) => {
  try {
    const reference = req.params.reference || req.query.reference;

    if (!reference) {
      return res.status(400).json({ success: false, message: 'Reference is required.' });
    }

    // Helpful: log email config presence (especially in production)
    console.log('Email config check:', {
      from: config?.emailConfig?.from,
      businessNotificationEmail: config?.emailConfig?.businessNotificationEmail,
      clientUrl: config?.clientUrl,
    });

    // If already paid in DB, optionally attempt to send business email again
    const existingPayment = await db.get(`SELECT * FROM payments WHERE reference = ?`, [reference]);
    if (existingPayment && existingPayment.status === 'success') {
      // OPTIONAL recovery: verify again to get full orderDetails for email
      const reverify = await verifyTransaction(reference);
      if (reverify.success) {
        const emailResults = await Promise.allSettled([
          sendBusinessNotification(reverify.data),
          // sendBuyerInvoice(reverify.data), // uncomment if you also want to resend buyer invoice
        ]);
        console.log('Email results (already verified path):', emailResults);
      }

      return res.json({ success: true, message: 'Payment already verified.', data: existingPayment });
    }

    const result = await verifyTransaction(reference);

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.message });
    }

    await db.run(`UPDATE orders SET status = 'paid', updated_at = CURRENT_TIMESTAMP WHERE reference = ?`, [reference]);

    await db.run(
      `INSERT OR REPLACE INTO payments (reference, paystack_id, amount, currency, status, gateway_response, paid_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        result.data.reference,
        result.data.id,
        result.data.amount,
        result.data.currency,
        'success',
        result.data.gateway_response,
        result.data.paid_at,
      ]
    );

    // ✅ Await emails to avoid serverless shutdown / dropped sends
    const emailResults = await Promise.allSettled([
      sendBusinessNotification(result.data),
      sendBuyerInvoice(result.data),
    ]);
    console.log('Email results:', emailResults);

    return res.json({ success: true, data: result.data });
  } catch (error) {
    console.error('Verify Error:', error);
    return res.status(500).json({ success: false, message: 'Server error during verification.' });
  }
};

const handlePaystackWebhook = async (req, res) => {
  try {
    const payload = req.body;
    const header = req.headers['x-paystack-signature'];
    const secret = process.env.PAYSTACK_SECRET_KEY;

    if (!header || !secret) {
      console.warn('Webhook: Missing signature or secret key');
      return res.status(400).json({ error: 'Missing signature or secret key' });
    }

    const generatedSignature = crypto
      .createHmac('sha512', secret)
      .update(JSON.stringify(payload))
      .digest('hex');

    if (generatedSignature !== header) {
      console.warn('Webhook: Invalid signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    if (payload.event === 'charge.success') {
      const reference = payload.data.reference;
      console.log('Webhook: Processing successful payment for reference:', reference);

      const existingPayment = await db.get(`SELECT * FROM payments WHERE reference = ?`, [reference]);
      if (existingPayment && existingPayment.status === 'success') {
        console.log('Webhook: Payment already processed for reference:', reference);
        return res.status(200).send('Webhook processed');
      }

      const result = await verifyTransaction(reference);
      if (result.success) {
        await db.run(`UPDATE orders SET status = 'paid', updated_at = CURRENT_TIMESTAMP WHERE reference = ?`, [reference]);
        await db.run(`INSERT OR REPLACE INTO payments (reference, paystack_id, amount, currency, status, gateway_response, paid_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`, [
          result.data.reference,
          result.data.id,
          result.data.amount,
          result.data.currency,
          'success',
          result.data.gateway_response,
          result.data.paid_at,
        ]);

        const emailResults = await Promise.allSettled([
          sendBusinessNotification(result.data),
          sendBuyerInvoice(result.data),
        ]);
        console.log('Webhook: Email results:', emailResults);
      }
    }

    return res.status(200).send('Webhook processed');
  } catch (error) {
    console.error('Webhook Error:', error);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
};

export default {
  initializeCheckout,
  handlePaystackCallback,
  verifyPaymentStatus,
  handlePaystackWebhook,
};