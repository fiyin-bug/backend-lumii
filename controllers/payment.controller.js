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

    // Validate items
    for (const item of items) {
      if (!item.name || typeof item.price !== 'number' || item.price <= 0 || typeof item.quantity !== 'number' || item.quantity <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid item data: name required, price and quantity must be positive numbers.' });
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
    };

    const amountInKobo = items.reduce((total, item) => {
      return total + (item.price * item.quantity * 100);
    }, 0);

    if (amountInKobo < 10000) {
      return res.status(400).json({ success: false, message: 'Minimum order amount is ₦100.' });
    }

    // Send callback URL directly to frontend using CLIENT_URL from environment
    const callbackUrl = `${config.clientUrl}/payment/callback`;

    // Save order to database
    try {
      await db.run(
        `INSERT INTO orders (reference, email, first_name, last_name, phone, shipping_address, cart_items, total_amount, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [reference, email, firstName, lastName, phone, JSON.stringify(shippingAddress), JSON.stringify(items), amountInKobo, 'pending']
      );
      console.log(`Order saved to database with reference: ${reference}`);
    } catch (dbError) {
      console.error('Error saving order to database:', dbError);
      return res.status(500).json({ success: false, message: 'Failed to save order.' });
    }

    const result = await initializeTransaction(email, amountInKobo, reference, callbackUrl, metadata);

    if (result.success) {
      res.json({
        success: true,
        authorizationUrl: result.data.authorization_url,
      });
    } else {
      // Update order status to failed if Paystack initialization fails
      await db.run(`UPDATE orders SET status = 'failed' WHERE reference = ?`, [reference]);
      res.status(result.statusCode || 500).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error in initializeCheckout:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

const handlePaystackCallback = async (req, res) => {
  const { reference } = req.query;

  const frontendCallbackPath = '/payment/callback';
  const frontendCallbackUrl = `${config.clientUrl}${frontendCallbackPath}?reference=${reference}`;

  if (!reference) {
    const frontendFailureUrl = `${config.clientUrl}${frontendCallbackPath}?status=failed&message=no_reference`;
    console.warn(`Received Paystack callback without reference. Redirecting to frontend failure URL: ${frontendFailureUrl}`);
    return res.redirect(302, frontendFailureUrl);
  }

  console.log(`Received Paystack callback for reference ${reference}. Redirecting browser to frontend: ${frontendCallbackUrl}`);
  res.redirect(302, frontendCallbackUrl);
};

const verifyPaymentStatus = async (req, res) => {
  try {
    const { reference } = req.query;

    if (!reference) {
      return res.status(400).json({ success: false, message: 'Transaction reference is required.' });
    }

    console.log(`Frontend requesting verification for reference: ${reference}`);

    // Check if payment already processed
    const existingPayment = await db.get(`SELECT * FROM payments WHERE reference = ?`, [reference]);
    if (existingPayment && existingPayment.status === 'success') {
      console.log(`Transaction ${reference} already processed. Skipping email notifications.`);
      return res.json({ success: true, message: 'Payment already verified.', data: existingPayment });
    }

    const result = await verifyTransaction(reference);

    if (result.success) {
      // Update order status to paid
      await db.run(`UPDATE orders SET status = 'paid', updated_at = CURRENT_TIMESTAMP WHERE reference = ?`, [reference]);

      // Save payment details
      const paymentData = {
        reference: result.data.reference,
        paystack_id: result.data.id,
        amount: result.data.amount,
        currency: result.data.currency,
        status: 'success',
        gateway_response: result.data.gateway_response,
        paid_at: result.data.paid_at
      };

      await db.run(
        `INSERT OR REPLACE INTO payments (reference, paystack_id, amount, currency, status, gateway_response, paid_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [paymentData.reference, paymentData.paystack_id, paymentData.amount, paymentData.currency, paymentData.status, paymentData.gateway_response, paymentData.paid_at]
      );

      console.log(`Verification successful for ref ${reference}. Order Details:`, JSON.stringify(result.data, null, 2));
      await sendBusinessNotification(result.data);
      await sendBuyerInvoice(result.data);
      res.json({ success: true, message: 'Payment verified successfully.', data: result.data });
    } else {
      // Update order status to failed
      await db.run(`UPDATE orders SET status = 'failed', updated_at = CURRENT_TIMESTAMP WHERE reference = ?`, [reference]);

      // TODO: Fix database insert for failed payments
      // Save failed payment details if available
      // if (result.data) {
      //   try {
      //     await db.run(
      //       `INSERT INTO payments (reference, paystack_id, amount, currency, status, gateway_response, paid_at)
      //        VALUES (?, ?, ?, ?, ?, ?, ?)`,
      //       [result.data.reference || reference, result.data.id || null, result.data.amount || 0, result.data.currency || 'NGN', 'failed', result.data.gateway_response || result.message, result.data.paid_at || null]
      //     );
      //   } catch (dbError) {
      //     console.error('Error saving failed payment to database:', dbError);
      //     // Continue without saving - don't fail the API call
      //   }
      // }

      console.warn(`Verification failed for ref ${reference}. Message: ${result.message}`);
      res.status(400).json({ success: false, message: result.message, data: result.data });
    }
  } catch (error) {
    console.error('Error in verifyPaymentStatus:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

const handlePaystackWebhook = async (req, res) => {
  try {
    // Verify webhook signature
    const secret = paystackConfig.paystackSecretKey;
    const signature = req.headers['x-paystack-signature'];
    const hash = crypto.createHmac('sha512', secret).update(JSON.stringify(req.body)).digest('hex');

    if (hash !== signature) {
      console.error('Invalid webhook signature');
      return res.status(400).send('Invalid signature');
    }

    const event = req.body;

    console.log(`Received Paystack webhook: ${event.event}`);

    if (event.event === 'charge.success') {
      const { reference } = event.data;

      // Update order status to paid
      await db.run(`UPDATE orders SET status = 'paid', updated_at = CURRENT_TIMESTAMP WHERE reference = ?`, [reference]);

      // Save payment details
      const paymentData = {
        reference: event.data.reference,
        paystack_id: event.data.id,
        amount: event.data.amount,
        currency: event.data.currency,
        status: 'success',
        gateway_response: event.data.gateway_response,
        paid_at: event.data.paid_at
      };

      await db.run(
        `INSERT OR REPLACE INTO payments (reference, paystack_id, amount, currency, status, gateway_response, paid_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [paymentData.reference, paymentData.paystack_id, paymentData.amount, paymentData.currency, paymentData.status, paymentData.gateway_response, paymentData.paid_at]
      );

      // Get order details for email notifications
      const order = await db.get(`SELECT * FROM orders WHERE reference = ?`, [reference]);
      if (order) {
        const orderData = {
          ...event.data,
          metadata: {
            customer_name: `${order.first_name} ${order.last_name}`,
            customer_email: order.email,
            customer_phone: order.phone,
            shipping_address: JSON.parse(order.shipping_address),
            cart_items: JSON.parse(order.cart_items)
          }
        };

        console.log(`Webhook: Payment successful for ref ${reference}. Sending notifications.`);
        await sendBusinessNotification(orderData);
        await sendBuyerInvoice(orderData);
      }
    }

    res.status(200).send('Webhook received');
  } catch (error) {
    console.error('Error handling Paystack webhook:', error);
    res.status(500).send('Webhook error');
  }
};

export default {
  initializeCheckout,
  handlePaystackCallback,
  verifyPaymentStatus,
  handlePaystackWebhook,
};
