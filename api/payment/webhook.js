const { handlePaystackWebhook } = require('../../controllers/payment.controller');

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      return await handlePaystackWebhook(req, res);
    } catch (error) {
      console.error('Webhook error:', error);
      return res.status(500).send('Webhook error');
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
