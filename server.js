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
// CORS CONFIGURATION (FIXED)
// ------------------------
const allowedOrigins = [
  "https://lumiprettycollection.com",
  "https://lumii-jthu.vercel.app",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175"  // <-- ADDED THIS
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow server-to-server and tools with no origin
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("CORS Not Allowed: " + origin));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  credentials: true,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // Preflight

app.use(express.json());

// ------------------------
// ROUTES
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
// ERROR HANDLER
// ------------------------
app.use(errorHandler);

// ------------------------
// SERVER START
// ------------------------
const PORT = process.env.PORT || 8080;
const ENV = process.env.NODE_ENV || "production";

if (ENV === "development") {

  // Local HTTPS for API
  const sslOptions = {
    key: fs.readFileSync("key.pem"),
    cert: fs.readFileSync("cert.pem"),
  };

  https.createServer(sslOptions, app).listen(PORT, () => {
    console.log(`🚀 Dev HTTPS server: https://localhost:${PORT}`);
  });

  // Standard HTTP for Paystack callbacks
  const CALLBACK_PORT = 4000;
  const httpApp = express();
  httpApp.use(cors(corsOptions));
  httpApp.use(express.json());
  httpApp.use("/api/payment", paymentRoutes);
  httpApp.use(errorHandler);

  httpApp.listen(CALLBACK_PORT, () => {
    console.log(`🚀 Dev HTTP callback server: http://localhost:${CALLBACK_PORT}`);
  });

} else {

  // Railway Production Server
  app.listen(PORT, () => {
    console.log(`🚀 Production server running on port ${PORT}`);
  });
}
