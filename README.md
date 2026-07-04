# backend-lumii

Production-ready backend for the Lumi Pretty Collection storefront and admin experience.

## Features
- Admin authentication with JWT
- Product CRUD endpoints for admin dashboard
- Image upload support with validation
- Health endpoint for monitoring
- CORS and rate limiting for safer API access

## Local development
```bash
npm install
PORT=5000 NODE_ENV=development JWT_SECRET=your-secret node server.js
```

## Production environment variables
Set these in your hosting platform:
```bash
NODE_ENV=production
JWT_SECRET=replace-with-a-long-random-secret
JWT_ACCESS_EXPIRES=15m
PAYSTACK_SECRET_KEY=your-live-paystack-secret
PAYSTACK_PUBLIC_KEY=your-live-paystack-public
CLIENT_URL=https://your-frontend-domain
API_BASE_URL=https://your-backend-domain/api
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM="Lumis Pretty Collection 💎" <your-email@gmail.com>
BUSINESS_NOTIFICATION_EMAIL=your-email@gmail.com
DEV_ADMIN_EMAIL=your-admin-email
DEV_ADMIN_PASSWORD=your-strong-admin-password
```

## Deployment
- Vercel: use the existing Vercel config and set the environment variables in the dashboard.
- Railway: use the existing Railway config and ensure the app starts with npm start.

## Verification
```bash
curl https://your-backend-domain/api/health
```
