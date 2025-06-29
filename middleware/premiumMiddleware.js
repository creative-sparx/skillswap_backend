const User = require('../models/User');
const { AppError } = require('../utils/errorHandler');

/**
 * Middleware to check if user has active premium subscription
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const requirePremium = async (req, res, next) => {
  try {
    // Get user from protect middleware
    const user = await User.findById(req.user.id).populate('subscriptionPlan');
    
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Check if user has premium subscription
    if (!user.isPro) {
      return next(new AppError('Premium subscription required to access this feature', 403));
    }

    // Check if subscription is still active
    if (user.subscriptionEndDate && new Date() > user.subscriptionEndDate) {
      // Update user's pro status if subscription expired
      await User.findByIdAndUpdate(user._id, {
        isPro: false,
        subscriptionStatus: 'expired'
      });
      
      return next(new AppError('Your premium subscription has expired. Please renew to access this feature', 403));
    }

    // Check subscription status
    if (user.subscriptionStatus === 'cancelled' || user.subscriptionStatus === 'expired') {
      return next(new AppError('Your premium subscription is not active. Please subscribe to access this feature', 403));
    }

    req.user = user; // Update req.user with populated data
    next();
  } catch (error) {
    return next(new AppError('Error checking premium status', 500));
  }
};

/**
 * Middleware to check if user has specific subscription plan
 * @param {string} planType - Required plan type (e.g., 'premium', 'pro')
 */
const requirePlan = (planType) => {
  return async (req, res, next) => {
    try {
      const user = await User.findById(req.user.id).populate('subscriptionPlan');
      
      if (!user) {
        return next(new AppError('User not found', 404));
      }

      if (!user.subscriptionPlan || user.subscriptionPlan.planType !== planType) {
        return next(new AppError(`${planType} subscription required to access this feature`, 403));
      }

      // Check if subscription is active
      if (user.subscriptionStatus !== 'active') {
        return next(new AppError('Your subscription is not active', 403));
      }

      req.user = user;
      next();
    } catch (error) {
      return next(new AppError('Error checking subscription plan', 500));
    }
  };
};

/**
 * Middleware to check usage limits for premium features
 * @param {string} feature - Feature name to check limits for
 * @param {number} limit - Usage limit for the feature
 */
const checkUsageLimit = (feature, limit) => {
  return async (req, res, next) => {
    try {
      const user = await User.findById(req.user.id);
      
      if (!user) {
        return next(new AppError('User not found', 404));
      }

      // If user is premium, skip usage limits
      if (user.isPro) {
        return next();
      }

      // Initialize usage tracking if not exists
      if (!user.usageStats) {
        user.usageStats = {};
      }

      const currentUsage = user.usageStats[feature] || 0;
      
      if (currentUsage >= limit) {
        return next(new AppError(`Free plan limit reached for ${feature}. Upgrade to premium for unlimited access`, 403));
      }

      // Increment usage count
      user.usageStats[feature] = currentUsage + 1;
      await user.save();

      req.user = user;
      next();
    } catch (error) {
      return next(new AppError('Error checking usage limits', 500));
    }
  };
};

/**
 * Middleware to add premium status to response
 */
const addPremiumStatus = async (req, res, next) => {
  try {
    if (req.user) {
      const user = await User.findById(req.user.id).populate('subscriptionPlan');
      req.user.premiumInfo = {
        isPro: user.isPro,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionPlan: user.subscriptionPlan,
        subscriptionEndDate: user.subscriptionEndDate,
        usageStats: user.usageStats || {}
      };
    }
    next();
  } catch (error) {
    next();
  }
};

module.exports = {
  requirePremium,
  requirePlan,
  checkUsageLimit,
  addPremiumStatus
};
