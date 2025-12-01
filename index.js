// Minimal Vercel entrypoint for API-only project
export default function handler(req, res) {
  res.status(404).json({
    error: "Not found",
    message: "Use /api/* endpoints",
    available: [
      "/api/health",
      "/api/payment/initialize",
      "/api/payment/verify",
      "/api/payment/callback",
      "/api/payment/webhook"
    ]
  });
}
