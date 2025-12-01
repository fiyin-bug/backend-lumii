exports.handler = function(req, res) {
  res.status(200).json({
    message: "Lumii Backend API - Vercel Serverless",
    version: "1.0.0",
    endpoints: {
      health: "/api/health",
      initialize: "/api/payment/initialize",
      verify: "/api/payment/verify",
      callback: "/api/payment/callback",
      webhook: "/api/payment/webhook"
    },
    environment: process.env.NODE_ENV || "development"
  });
}
