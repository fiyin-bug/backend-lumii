const { verifyTransaction } = require('../../services/paystack.service');
const db = require('../../config/db.config');
const { sendBusinessNotification, sendBuyerInvoice } = require('../../services/email.service');
const { paystackConfig } = require('../../config/paystack.config');
const crypto = require('crypto');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

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
}
