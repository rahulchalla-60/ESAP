import { body, validationResult } from 'express-validator';

/**
 * Middleware to handle validation errors
 * Returns formatted validation errors to the client
 */
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.path,
      message: error.msg,
      value: error.value
    }));
    
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errorMessages
    });
  }
  next();
};

/**
 * Validation rules for user registration
 */
export const validateUserRegistration = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s\-\.\']+$/)
    .withMessage('Name can only contain letters, spaces, hyphens, dots, and apostrophes'),
  
  body('contact')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Contact must be between 3 and 100 characters')
    .custom((value) => {
      // Check if it's a valid email or phone number (more flexible)
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const phoneRegex = /^[\+]?[\d\s\-\(\)]{3,20}$/;
      
      if (!emailRegex.test(value) && !phoneRegex.test(value.replace(/[\s\-\(\)]/g, ''))) {
        throw new Error('Contact must be a valid email address or phone number');
      }
      return true;
    }),
  
  body('password')
    .isLength({ min: 6, max: 128 })
    .withMessage('Password must be between 6 and 128 characters'),
  
  body('role')
    .optional()
    .isIn(['provider', 'getter'])
    .withMessage('Role must be either "provider" or "getter"'),
  
  body('photo')
    .optional()
    .custom((value) => {
      // If photo is provided, validate its structure
      if (value && typeof value === 'object') {
        if (value.contentType && !['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'].includes(value.contentType)) {
          throw new Error('Photo must be a valid image type (JPEG, PNG, GIF, or WebP)');
        }
        if (value.data && typeof value.data !== 'string') {
          throw new Error('Photo data must be a base64 string');
        }
      }
      return true;
    }),
  
  handleValidationErrors
];

/**
 * Validation rules for user login
 */
export const validateUserLogin = [
  body('contact')
    .trim()
    .notEmpty()
    .withMessage('Contact is required'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  handleValidationErrors
];

/**
 * Validation rules for service creation
 */
export const validateServiceCreation = [
  body('serviceName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Service name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\-_&]+$/)
    .withMessage('Service name can only contain letters, numbers, spaces, hyphens, underscores, and ampersands'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),
  
  body('price')
    .isNumeric()
    .withMessage('Price must be a number')
    .isFloat({ min: 0, max: 999999.99 })
    .withMessage('Price must be between 0 and 999,999.99'),
  
  body('media')
    .optional()
    .isArray()
    .withMessage('Media must be an array'),
  
  body('media.*.contentType')
    .optional()
    .isIn(['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'])
    .withMessage('Each media file must be a valid image type (JPEG, PNG, GIF, or WebP)'),
  
  handleValidationErrors
];

/**
 * Validation rules for service updates
 */
export const validateServiceUpdate = [
  body('serviceName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Service name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\-_&]+$/)
    .withMessage('Service name can only contain letters, numbers, spaces, hyphens, underscores, and ampersands'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),
  
  body('price')
    .optional()
    .isNumeric()
    .withMessage('Price must be a number')
    .isFloat({ min: 0, max: 999999.99 })
    .withMessage('Price must be between 0 and 999,999.99'),
  
  body('media')
    .optional()
    .isArray()
    .withMessage('Media must be an array'),
  
  body('media.*.contentType')
    .optional()
    .isIn(['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'])
    .withMessage('Each media file must be a valid image type (JPEG, PNG, GIF, or WebP)'),
  
  handleValidationErrors
];