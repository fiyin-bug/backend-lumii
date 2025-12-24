import { verifyTransaction } from '../../services/paystack.service.js';
import db from '../../config/db.config.js';
import { sendBusinessNotification, sendBuyerInvoice } from '../../services/email.service.js';

export default async function handler(req, res) {
  // Enable CORS
  const allowedOrigins = ['https://lumiprettycollection.com', 'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { reference } = req.query;

    if (!reference) {
      return res.status(400).json({ success: false, message: 'Transaction reference is required.' });
    }

    console.log(`Verifying payment for reference: ${reference}`);

    // Check if payment already processed
    const existingPayment = await db.get(`SELECT * FROM payments WHERE reference = ?`, [reference]);
    if (existingPayment && existingPayment.status === 'success') {
      console.log(`Transaction ${reference} already processed.`);
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

      console.log(`Verification successful for ref ${reference}`);
      await sendBusinessNotification(result.data);
      await sendBuyerInvoice(result.data);
      res.json({ success: true, message: 'Payment verified successfully.', data: result.data });
    } else {
      // Update order status to failed
      await db.run(`UPDATE orders SET status = 'failed', updated_at = CURRENT_TIMESTAMP WHERE reference = ?`, [reference]);

      console.warn(`Verification failed for ref ${reference}. Message: ${result.message}`);
      res.status(400).json({ success: false, message: result.message, data: result.data });
    }
  } catch (error) {
    console.error('Error in verifyPaymentStatus:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
}
