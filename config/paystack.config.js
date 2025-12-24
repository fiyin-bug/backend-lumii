// config/paystack.config
import 'dotenv/config';

export default {
  paystackSecretKey: process.env.PAYSTACK_SECRET_KEY,
  paystackPublicKey: process.env.PAYSTACK_PUBLIC_KEY,
};
