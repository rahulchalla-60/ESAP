import jwt from "jsonwebtoken";
import User from "../models/User.js";
import config from "../config/environment.js";

/**
 * Middleware to protect routes and verify JWT tokens
 * Attaches the authenticated user to req.user
 */
export const protect = async (req, res, next) => {
  let token;

  // Check for token in Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // Extract token from header
      token = req.headers.authorization.split(" ")[1];
      
      // Verify token
      const decoded = jwt.verify(token, config.jwtSecret);
      
      // Get user from token and attach to request
      req.user = await User.findById(decoded.id).select("-password");
      
      if (!req.user) {
        return res.status(401).json({ 
          success: false,
          message: "User not found, token invalid" 
        });
      }

      next();
    } catch (error) {
      let message = "Not authorized, token failed";
      
      if (error.name === 'TokenExpiredError') {
        message = "Token expired, please login again";
      } else if (error.name === 'JsonWebTokenError') {
        message = "Invalid token format";
      }
      
      return res.status(401).json({ 
        success: false,
        message 
      });
    }
  } else {
    return res.status(401).json({ 
      success: false,
      message: "Not authorized, no token provided" 
    });
  }
};

/**
 * Middleware to restrict access to specific roles
 * @param {...string} roles - Allowed roles
 */
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}`
      });
    }
    next();
  };
};

/**
 * Middleware to ensure only providers can access certain routes
 */
export const providerOnly = (req, res, next) => {
  if (req.user.role !== 'provider') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Only service providers can perform this action.'
    });
  }
  next();
};

