const { clientUrl } = require('../../config');

export default function handler(req, res) {
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

  const { reference } = req.query;

  if (!reference) {
    const failureUrl = `${clientUrl}/payment/callback?status=failed&message=no_reference`;
    console.warn(`Received callback without reference. Redirecting to: ${failureUrl}`);
    return res.redirect(302, failureUrl);
  }

  const successUrl = `${clientUrl}/payment/callback?reference=${reference}`;
  console.log(`Received Paystack callback for reference ${reference}. Redirecting to: ${successUrl}`);
  res.redirect(302, successUrl);
}
