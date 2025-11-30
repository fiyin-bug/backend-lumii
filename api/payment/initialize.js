const { initializeTransaction } = require('../../services/paystack.service');
const db = require('../../config/db.config');
const { paystackConfig } = require('../../config/paystack.config');
const { clientUrl } = require('../../config');

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', 'https://lumiprettycollection.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { email, firstName, lastName, phone, shippingAddress, items } = req.body;

    // Validation
    if (!email || !firstName || !lastName || !phone || !shippingAddress || !items || !Array.isArray(items) || !items.length) {
      return res.status(400).json({ success: false, message: 'Missing required fields or empty cart.' });
    }

    for (const item of items) {
      if (!item.name || typeof item.price !== 'number' || item.price <= 0 || typeof item.quantity !== 'number' || item.quantity <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid item data: name required, price and quantity must be positive numbers.' });
      }
    }

    const amountInKobo = items.reduce((total, item) => {
      return total + (item.price * item.quantity * 100);
    }, 0);

    if (amountInKobo < 10000) {
      return res.status(400).json({ success: false, message: 'Minimum order amount is ₦100.' });
    }

    // Generate reference
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const random4 = Math.random().toString(36).substr(2, 4);
    const reference = `LUMIS-${day}.${month}.${year}-${random4}`;

    const metadata = {
      customer_name: `${firstName} ${lastName}`,
      customer_email: email,
      customer_phone: phone,
    };

    const callbackUrl = `${clientUrl}/payment/callback`;

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
      await db.run(`UPDATE orders SET status = 'failed' WHERE reference = ?`, [reference]);
      res.status(500).json({ success: false, message: result.message });
    }
  } catch (error) {
    console.error('Error in initializeCheckout:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
}
