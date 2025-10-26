import config from '../config/environment.js';

/**
 * Async error wrapper to catch Promise rejections in route handlers
 * This wrapper eliminates the need for try-catch blocks in every async route handler
 * @param {Function} fn - Async route handler function
 * @returns {Function} Wrapped function with automatic error handling
 * @example
 * export const getUsers = asyncHandler(async (req, res) => {
 *   const users = await User.find();
 *   res.json(users);
 * });
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Global error handling middleware
 * Standardizes error responses and prevents sensitive information leakage
 */
export const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error for debugging (in development) or monitoring (in production)
  if (config.nodeEnv === 'development') {
    console.error('Error:', err);
  } else {
    // In production, you might want to use a proper logging service
    console.error('Error occurred:', err.message);
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = { message, statusCode: 404 };
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
    error = { message, statusCode: 400 };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = { message, statusCode: 400 };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = { message, statusCode: 401 };
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = { message, statusCode: 401 };
  }

  // Default error response
  const statusCode = error.statusCode || err.statusCode || 500;
  const message = error.message || 'Server Error';

  res.status(statusCode).json({
    success: false,
    message,
    // Only include error details in development
    ...(config.nodeEnv === 'development' && { error: err.stack })
  });
};

/**
 * 404 Not Found middleware
 * Handles requests to non-existent routes
 */
export const notFound = (req, res, next) => {
  const error = new Error(`Not found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};