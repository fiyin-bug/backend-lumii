import paymentRoutes from '../../routes/payment.routes.js';

export default async function handler(req, res) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Route to payment handler
  if (req.method === 'POST') {
    try {
      // Import and use the payment route handler
      const paymentHandler = paymentRoutes.stack.find(layer =>
        layer.route && layer.route.path === '/initialize'
      );

      if (paymentHandler) {
        // Execute the payment handler
        paymentHandler.handle(req, res);
      } else {
        res.status(404).json({ error: 'Payment endpoint not found' });
      }
    } catch (error) {
      console.error('Payment error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.status(404).json({ error: 'Endpoint not found' });
  }
}
