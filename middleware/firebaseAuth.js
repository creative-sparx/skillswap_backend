import { verifyIdToken } from '../config/firebase.js';

/**
 * Middleware to verify Firebase ID tokens
 * Protects routes by requiring valid Firebase authentication
 */
export const verifyFirebaseToken = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No valid token provided.',
      });
    }

    // Extract token from "Bearer TOKEN"
    const idToken = authHeader.split(' ')[1];

    if (!idToken) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Invalid token format.',
      });
    }

    // Verify the token with Firebase
    const result = await verifyIdToken(idToken);
    
    if (!result.success) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Invalid or expired token.',
        error: result.error,
      });
    }

    // Add user info to request object
    req.user = result.user;
    req.firebaseUid = result.user.uid;
    
    next();
  } catch (error) {
    console.error('Firebase auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during authentication.',
    });
  }
};

/**
 * Optional middleware - verifies token if present but doesn't require it
 * Useful for routes that have different behavior for authenticated vs unauthenticated users
 */
export const optionalFirebaseAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const idToken = authHeader.split(' ')[1];
      
      if (idToken) {
        const result = await verifyIdToken(idToken);
        
        if (result.success) {
          req.user = result.user;
          req.firebaseUid = result.user.uid;
        }
      }
    }
    
    next();
  } catch (error) {
    console.error('Optional Firebase auth middleware error:', error);
    // Don't fail the request, just proceed without user info
    next();
  }
};

/**
 * Middleware to check if user has admin privileges
 * Should be used after verifyFirebaseToken
 */
export const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    // Check if user has admin custom claim
    const isAdmin = req.user.admin === true || req.user.role === 'admin';
    
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.',
      });
    }

    next();
  } catch (error) {
    console.error('Admin auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during admin verification.',
    });
  }
};

/**
 * Middleware to check if user has moderator or admin privileges
 * Should be used after verifyFirebaseToken
 */
export const requireModerator = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    // Check if user has moderator or admin custom claim
    const hasModeratorAccess = 
      req.user.admin === true || 
      req.user.role === 'admin' || 
      req.user.moderator === true ||
      req.user.role === 'moderator';
    
    if (!hasModeratorAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Moderator privileges required.',
      });
    }

    next();
  } catch (error) {
    console.error('Moderator auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during moderator verification.',
    });
  }
};

/**
 * Middleware to check if the authenticated user owns the resource
 * Expects userId parameter in the route or req.params.userId
 */
export const requireOwnership = (userIdParam = 'userId') => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required.',
        });
      }

      const resourceUserId = req.params[userIdParam] || req.body[userIdParam];
      const currentUserId = req.firebaseUid;

      // Admin can access any resource
      const isAdmin = req.user.admin === true || req.user.role === 'admin';
      
      if (!isAdmin && resourceUserId !== currentUserId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only access your own resources.',
        });
      }

      next();
    } catch (error) {
      console.error('Ownership auth middleware error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error during ownership verification.',
      });
    }
  };
};

export default {
  verifyFirebaseToken,
  optionalFirebaseAuth,
  requireAdmin,
  requireModerator,
  requireOwnership,
};
