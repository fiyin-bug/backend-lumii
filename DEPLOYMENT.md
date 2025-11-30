# Vercel Deployment Guide

## Backend Structure
- `api/health.js` - Health check endpoint
- `api/payment/initialize.js` - Payment initialization
- `api/payment/callback.js` - Paystack callback handler
- `api/payment/verify.js` - Payment verification
- `api/payment/webhook.js` - Paystack webhook handler

## Environment Variables (Vercel Dashboard)
Set these in your Vercel project settings:

```
NODE_ENV=production
PAYSTACK_SECRET_KEY=sk_live_...
PAYSTACK_PUBLIC_KEY=pk_live_...
API_BASE_URL=https://your-vercel-app.vercel.app/api
CLIENT_URL=https://lumiprettycollection.com
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM="Lumis Pretty Collection 💎" <your-email@gmail.com>
BUSINESS_NOTIFICATION_EMAIL=your-email@gmail.com
```

## Deployment Steps

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm i -g vercel
   ```

2. **Deploy to Vercel**:
   ```bash
   vercel --prod
   ```

3. **Set Environment Variables** in Vercel Dashboard

4. **Update Frontend** to use the new Vercel API URL

## API Endpoints

After deployment, your API will be available at:
- `https://your-app.vercel.app/api/health`
- `https://your-app.vercel.app/api/payment/initialize`
- `https://your-app.vercel.app/api/payment/callback`
- `https://your-app.vercel.app/api/payment/verify`
- `https://your-app.vercel.app/api/payment/webhook`

## Important Notes

### Database
- Uses SQLite in `/tmp` directory for Vercel
- **Data does not persist** between function calls
- For production with persistent data, consider:
  - PlanetScale (MySQL)
  - Supabase (PostgreSQL)
  - MongoDB Atlas

### Email Service
- Configured for Gmail SMTP
- Make sure to use App Passwords for Gmail

### Paystack
- Uses live keys for production
- Ensure your Paystack account is fully verified

## Testing

Test your endpoints:
```bash
curl https://your-app.vercel.app/api/health
```

Should return:
```json
{
  "status": "OK",
  "timestamp": "...",
  "environment": "production",
  "platform": "vercel"
}
```
