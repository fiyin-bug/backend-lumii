import axios from 'axios';

export default async function handler(req, res) {
  // 1. Let vercel.json handle CORS. If you MUST put them here for safety:
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  
  try {
    // 2. Check for the Key immediately
    if (!process.env.PAYSTACK_SECRET_KEY) {
      return res.status(500).json({ 
        success: false, 
        message: "Backend Error: PAYSTACK_SECRET_KEY is not configured in Vercel." 
      });
    }

    const { email, items, firstName, lastName } = req.body;

    // 3. Simple price calculation
    const amountInKobo = items.reduce((sum, item) => {
      return sum + (item.price * item.quantity * 100);
    }, 0);

    const result = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email,
        amount: Math.round(amountInKobo),
        reference: "LUMIS-" + Date.now(),
        callback_url: `${process.env.CLIENT_URL || 'https://lumiprettycollection.com'}/payment/callback`,
        metadata: { custom_fields: [{ display_name: "Customer Name", variable_name: "customer_name", value: `${firstName} ${lastName}` }] }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return res.status(200).json({
      success: true,
      authorizationUrl: result.data.data.authorization_url
    });

  } catch (error) {
    console.error('PAYMENT_ERROR:', error.response?.data || error.message);
    
    // 4. Return a proper JSON error so CORS doesn't trigger
    return res.status(error.response?.status || 500).json({
      success: false,
      message: error.response?.data?.message || "Internal Server Error",
      error: error.message
    });
  }
}