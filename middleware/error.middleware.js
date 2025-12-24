// middleware/error.middleware.js
// Basic Error Handler
const errorHandler = (err, req, res, next) => {
    console.error("Unhandled Error:", err.stack || err);
  
    // Ensure response headers haven't already been sent
    if (res.headersSent) {
      return next(err); // Delegate to default Express error handler
    }
  
    const statusCode = typeof err.status === 'number' ? err.status : 500;
  
    res.status(statusCode).json({
      success: false,
      message: err.message || 'Internal Server Error',
      // Provide stack trace only in development environment for security
      stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
    });
  };
  
  export { errorHandler };
