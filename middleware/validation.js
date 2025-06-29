import { body, validationResult } from 'express-validator';

export const validateSignup = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required.')
    .isLength({ min: 3 })
    .withMessage('Username must be at least 3 characters long.'),
  body('email')
    .isEmail()
    .withMessage('Please enter a valid email address.')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long.')
];

export const validateLogin = [
  body('email').isEmail().withMessage('Please enter a valid email address.'),
  body('password').notEmpty().withMessage('Password is required.')
];

// Course validation
export const validateCreateCourse = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Course title is required.')
    .isLength({ min: 3, max: 100 })
    .withMessage('Course title must be between 3 and 100 characters.'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Course description is required.')
    .isLength({ min: 10, max: 1000 })
    .withMessage('Course description must be between 10 and 1000 characters.'),
  body('category')
    .trim()
    .notEmpty()
    .withMessage('Course category is required.'),
  body('difficulty')
    .isIn(['beginner', 'intermediate', 'advanced'])
    .withMessage('Difficulty must be beginner, intermediate, or advanced.'),
  body('price')
    .optional()
    .isNumeric()
    .withMessage('Price must be a number.')
    .custom((value) => {
      if (value < 0) {
        throw new Error('Price cannot be negative.');
      }
      return true;
    }),
  body('isPaid')
    .optional()
    .isBoolean()
    .withMessage('isPaid must be a boolean value.'),
  body('maxStudents')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Maximum students must be a positive integer.')
];

export const validateUpdateCourse = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Course title must be between 3 and 100 characters.'),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Course description must be between 10 and 1000 characters.'),
  body('category')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Course category cannot be empty.'),
  body('difficulty')
    .optional()
    .isIn(['beginner', 'intermediate', 'advanced'])
    .withMessage('Difficulty must be beginner, intermediate, or advanced.'),
  body('price')
    .optional()
    .isNumeric()
    .withMessage('Price must be a number.')
    .custom((value) => {
      if (value < 0) {
        throw new Error('Price cannot be negative.');
      }
      return true;
    }),
  body('isPaid')
    .optional()
    .isBoolean()
    .withMessage('isPaid must be a boolean value.'),
  body('maxStudents')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Maximum students must be a positive integer.')
];

// Wallet validation
export const validateTopUp = [
  body('amount')
    .isNumeric()
    .withMessage('Amount must be a number.')
    .custom((value) => {
      if (value <= 0) {
        throw new Error('Amount must be greater than 0.');
      }
      if (value > 1000000) {
        throw new Error('Amount cannot exceed 1,000,000.');
      }
      return true;
    }),
  body('payment_method')
    .optional()
    .isIn(['flutterwave', 'stripe'])
    .withMessage('Payment method must be flutterwave or stripe.')
];

export const validateDeductTokens = [
  body('amount')
    .isNumeric()
    .withMessage('Amount must be a number.')
    .custom((value) => {
      if (value <= 0) {
        throw new Error('Amount must be greater than 0.');
      }
      return true;
    }),
  body('reason')
    .trim()
    .notEmpty()
    .withMessage('Reason for deduction is required.')
];

export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map(err => ({ msg: err.msg, param: err.path }))
    });
  }
  next();
};
