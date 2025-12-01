import axios from 'axios';

export default async function handler(req, res) {
  // CORS
  const allowedOrigins = [
    "https://lumiprettycollection.com",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175"
  ];

  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    const { email, firstName, lastName, phone, shippingAddress, items } = req.body;

    // Validation
    if (!email || !firstName || !lastName || !phone || !shippingAddress || !items?.length) {
      return res.status(400).json({ success: false, message: 'Missing required fields or empty cart.' });
    }

    for (const item of items) {
      if (!item.name || typeof item.price !== 'number' || item.price <= 0 || typeof item.quantity !== 'number' || item.quantity <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid item data: name required, price and quantity must be positive numbers.' });
      }
    }

    const amountInKobo = items.reduce((sum, item) => sum + item.price * item.quantity * 100, 0);

    if (amountInKobo < 10000) {
      return res.status(400).json({ success: false, message: 'Minimum order amount is ₦100.' });
    }

    // Generate reference
    const reference = "LUMIS-" + Date.now();

    const metadata = {
      customer_name: `${firstName} ${lastName}`,
      customer_email: email,
      customer_phone: phone,
    };

    const callbackUrl = `${process.env.CLIENT_URL || 'https://lumiprettycollection.com'}/payment/callback`;

    // Initialize Paystack transaction
    const result = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email,
        amount: amountInKobo,
        reference,
        callback_url: callbackUrl,
        metadata
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (result.data.status) {
      return res.json({
        success: true,
        authorizationUrl: result.data.data.authorization_url
      });
    } else {
      return res.status(500).json({ success: false, message: result.data.message });
    }
  } catch (error) {
    console.error('Paystack init error:', error.response?.data || error.message);
    return res.status(500).json({ success: false, message: 'Payment initialization failed.' });
  }
}
