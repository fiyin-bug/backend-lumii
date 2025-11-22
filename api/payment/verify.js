const { verifyPaymentStatus } = require('../../controllers/payment.controller');

export default async function handler(req, res) {
  if (req.method === 'GET') {
    // Set up CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    try {
      return await verifyPaymentStatus(req, res);
    } catch (error) {
      console.error('Verify payment error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  } else if (req.method === 'OPTIONS') {
    // Handle preflight requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
