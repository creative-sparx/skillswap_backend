import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { validationResult } from 'express-validator';

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d'
  });
};

/**
 * @desc    Register new user
 * @route   POST /api/auth/register
 * @access  Public
 */
export const register = async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      message: 'Validation failed', 
      errors: errors.array() 
    });
  }

  const { email, password, firstName, lastName, username } = req.body;

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: existingUser.email === email ? 'Email already registered' : 'Username already taken'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
      firstName,
      lastName,
      email,
      username,
      password: hashedPassword
    });

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    // Log error for debugging (replace with proper logging in production)
    if (process.env.NODE_ENV !== 'production') {
      console.error('Registration error:', error);
    }
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      message: 'Validation failed', 
      errors: errors.array() 
    });
  }

  const { email, password } = req.body;

  try {
    // Find user and include password for comparison
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if account is active
    if (user.accountStatus !== 'active') {
      return res.status(401).json({
        success: false,
        message: 'Account is suspended or deactivated'
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate token
    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        username: user.username,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        isProfileComplete: user.isProfileComplete
      }
    });
  } catch (error) {
    // Log error for debugging (replace with proper logging in production)
    if (process.env.NODE_ENV !== 'production') {
      console.error('Login error:', error);
    }
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

// Google Sign-In handler
import { OAuth2Client } from 'google-auth-library';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const loginWithGoogle = async (req, res) => {
const { idToken } = req.body;
if (!idToken) {
return res.status(400).json({ success: false, message: 'Missing idToken' });
}
try {
const ticket = await googleClient.verifyIdToken({
idToken,
audience: process.env.GOOGLE_CLIENT_ID,
});
const payload = ticket.getPayload();
const email = payload.email;
let user = await User.findOne({ email });
if (!user) {
user = await User.create({
firstName: payload.given_name || '',
lastName: payload.family_name || '',
email: payload.email,
username: payload.email.split('@')[0],
password: Math.random().toString(36).slice(-8),
isEmailVerified: true,
accountStatus: 'active',
});
}
const token = generateToken(user._id);
res.json({
success: true,
message: 'Login with Google successful',
token,
user: {
id: user._id,
firstName: user.firstName,
lastName: user.lastName,
email: user.email,
username: user.username,
role: user.role,
},
});
} catch (error) {
console.error('Google login error:', error);
res.status(401).json({ success: false, message: 'Invalid Google token' });
}
};

/**
* @desc    Logout user (client-side token removal)
* @route   POST /api/auth/logout
* @access  Public
*/
export const logout = async (req, res) => {
  res.json({
    success: true,
    message: 'Logout successful. Please remove token from client.'
  });
};

/**
 * @desc    Get user profile
 * @route   GET /api/auth/profile
 * @access  Private
 */
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        username: user.username,
        role: user.role,
        avatar: user.avatar,
        bio: user.bio,
        location: user.location,
        isEmailVerified: user.isEmailVerified,
        isProfileComplete: user.isProfileComplete,
        points: user.points,
        level: user.level,
        badges: user.badges
      }
    });
  } catch (error) {
    // Log error for debugging (replace with proper logging in production)
    if (process.env.NODE_ENV !== 'production') {
      console.error('Get profile error:', error);
    }
    res.status(500).json({
      success: false,
      message: 'Server error fetching profile'
    });
  }
};
