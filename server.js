// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const config = require('./config'); // Load consolidated config
const apiRoutes = require('./routes'); // Load main API router
const { errorHandler } = require('./middleware/error.middleware'); // Load error handler

// Initialize Express App
const app = express();

// --- Core Middleware ---

// Enable Cross-Origin Resource Sharing (CORS)
// Restrict to specific origin (your frontend URL) in production
app.use(cors({
  origin: config.clientUrl,
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true, // If you need to handle cookies/sessions later
  optionsSuccessStatus: 200
}));

// Parse JSON request bodies
app.use(express.json({ limit: '10kb' })); // Limit payload size

// Parse URL-encoded request bodies (optional, usually needed for form submissions)
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// --- API Routes ---
// Mount all API routes under the /api prefix
app.use('/api', apiRoutes);

// --- Default Route (Optional) ---
// Handles requests to the root URL
app.get('/', (req, res) => {
  res.status(200).json({
      message: `Lumis Minimal Backend API is running.`,
      environment: config.env,
      timestamp: new Date().toISOString()
  });
});

// --- Catch-all for Undefined Routes (404) ---
// Place this after all valid routes
app.use((req, res, next) => {
    res.status(404).json({ success: false, message: `Not Found - Cannot ${req.method} ${req.originalUrl}` });
});


// --- Global Error Handling Middleware ---
// Must be the LAST middleware defined
app.use(errorHandler);


// --- Start Server ---
try {
    const server = app.listen(config.port, () => {
      console.log(`\n🚀 Minimal server started successfully!`);
      console.log(`      Mode: ${config.env}`);
      console.log(`      Port: ${config.port}`);
      console.log(`      API URL: ${config.apiBaseUrl}`);
      console.log(`      Allowed Client: ${config.clientUrl}\n`);
    });

     // Graceful shutdown handling (optional but good practice)
    process.on('SIGTERM', () => {
        console.log('SIGTERM signal received: closing HTTP server');
        server.close(() => {
            console.log('HTTP server closed');
            process.exit(0);
        });
    });
     process.on('SIGINT', () => {
        console.log('SIGINT signal received: closing HTTP server');
        server.close(() => {
            console.log('HTTP server closed');
            process.exit(0);
        });
    });

} catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1); // Exit with failure code
}