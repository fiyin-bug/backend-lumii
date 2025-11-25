// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const https = require('https');

const paymentRoutes = require('./routes/payment.routes');
const { errorHandler } = require('./middleware/error.middleware');

const app = express();

// ------------------------
// FIXED CORS CONFIGURATION
// ------------------------
const corsOptions = {
  origin: [
    "https://lumiprettycollection.com",
    "https://lumii-jthu.vercel.app",
    "http://localhost:5173",
    "http://localhost:5174"
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  credentials: true,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));  // IMPORTANT for preflight OPTIONS

app.use(express.json());

// ------------------------
// Routes
// ------------------------
app.use("/api/payment", paymentRoutes);

app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// ------------------------
// Error Handling Middleware
// ------------------------
app.use(errorHandler);

// ------------------------
// Server Start
// ------------------------
const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV === "development") {

  // Development HTTPS server
  const sslOptions = {
    key: fs.readFileSync("key.pem"),
    cert: fs.readFileSync("cert.pem"),
  };

  const httpPort = 4000;

  // HTTPS for development API
  https.createServer(sslOptions, app).listen(PORT, () => {
    console.log(`🚀 Dev HTTPS server: https://localhost:${PORT}`);
  });

  // HTTP server for Paystack callbacks
  const httpApp = express();
  httpApp.use(cors(corsOptions));
  httpApp.use(express.json());
  httpApp.use("/api/payment", paymentRoutes);
  httpApp.use(errorHandler);

  httpApp.listen(httpPort, () => {
    console.log(`🚀 Dev HTTP callback server: http://localhost:${httpPort}`);
  });

} else {

  // Production (Railway)
  const port = process.env.PORT || 8080;
  app.listen(port, () => {
    console.log(`🚀 Production server running on port ${port}`);
  });
}
