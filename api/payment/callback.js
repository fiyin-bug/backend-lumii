const { handlePaystackCallback } = require('../../controllers/payment.controller');

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      return await handlePaystackCallback(req, res);
    } catch (error) {
      console.error('Callback error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
