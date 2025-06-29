import express from 'express';
import { 
  getWalletBalance, 
  initiateTopUp, 
  deductTokens, 
  getTransactionHistory,
  verifyPayment,
  getTransactionSummary
} from '../controllers/walletController.js';
import auth from '../middleware/auth.js';
import { body, param, query } from 'express-validator';
import { handleValidationErrors } from '../middleware/validation.js';

const router = express.Router();

// All wallet routes require authentication
router.use(auth);

// GET /api/wallet/balance - Get user's wallet balance
router.get('/balance', getWalletBalance);

// POST /api/wallet/topup - Initiate token top-up payment
router.post('/topup', [
  body('amount')
    .isNumeric()
    .withMessage('Amount must be a number')
    .isFloat({ min: 100 })
    .withMessage('Minimum top-up amount is 100'),
  body('currency')
    .optional()
    .isIn(['NGN', 'USD', 'GHS', 'KES'])
    .withMessage('Invalid currency'),
  body('callback_url')
    .optional()
    .isURL()
    .withMessage('Invalid callback URL'),
  handleValidationErrors
], initiateTopUp);

// POST /api/wallet/deduct - Deduct tokens from wallet (internal use)
router.post('/deduct', [
  body('amount')
    .isNumeric()
    .withMessage('Amount must be a number')
    .isFloat({ min: 1 })
    .withMessage('Minimum deduction amount is 1'),
  body('description')
    .notEmpty()
    .withMessage('Description is required'),
  body('courseId')
    .optional()
    .isMongoId()
    .withMessage('Invalid course ID'),
  body('certificateId')
    .optional()
    .isMongoId()
    .withMessage('Invalid certificate ID'),
  handleValidationErrors
], deductTokens);

// POST /api/wallet/verify-payment - Verify and complete payment
router.post('/verify-payment', [
  body('tx_ref')
    .notEmpty()
    .withMessage('Transaction reference is required'),
  body('transaction_id')
    .optional()
    .isNumeric()
    .withMessage('Invalid transaction ID'),
  handleValidationErrors
], verifyPayment);

// GET /api/wallet/transactions - Get transaction history
router.get('/transactions', [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('type')
    .optional()
    .isIn(['topup', 'deduction', 'earnings', 'refund', 'withdrawal'])
    .withMessage('Invalid transaction type'),
  query('status')
    .optional()
    .isIn(['pending', 'successful', 'failed', 'cancelled'])
    .withMessage('Invalid status'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format'),
  handleValidationErrors
], getTransactionHistory);

// GET /api/wallet/summary - Get transaction summary
router.get('/summary', getTransactionSummary);

// GET /api/wallet/transaction/:txRef - Get specific transaction details
router.get('/transaction/:txRef', [
  param('txRef')
    .notEmpty()
    .withMessage('Transaction reference is required'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { txRef } = req.params;
    const userId = req.user._id;

    const Transaction = (await import('../models/Transaction.js')).default;
    
    const transaction = await Transaction.findOne({ 
      txRef, 
      userId 
    }).populate('courseId', 'title price')
      .populate('certificateId', 'name cost');

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    res.json({
      success: true,
      data: {
        transaction
      }
    });
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// POST /api/wallet/transfer - Transfer tokens between users (future feature)
router.post('/transfer', [
  body('recipientId')
    .isMongoId()
    .withMessage('Invalid recipient ID'),
  body('amount')
    .isNumeric()
    .withMessage('Amount must be a number')
    .isFloat({ min: 1 })
    .withMessage('Minimum transfer amount is 1'),
  body('description')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Description must be less than 200 characters'),
  handleValidationErrors
], async (req, res) => {
  try {
    // This is a placeholder for future P2P transfer functionality
    res.status(501).json({
      success: false,
      message: 'Peer-to-peer transfers not yet implemented'
    });
  } catch (error) {
    console.error('Transfer error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/wallet/stats - Get wallet statistics (admin only)
router.get('/stats', async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const Transaction = (await import('../models/Transaction.js')).default;
    const User = (await import('../models/User.js')).default;

    // Get overall statistics
    const totalUsers = await User.countDocuments();
    const usersWithWallets = await User.countDocuments({ 'wallet.balance': { $gt: 0 } });
    
    const transactionStats = await Transaction.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    const walletStats = await User.aggregate([
      {
        $group: {
          _id: null,
          totalBalance: { $sum: '$wallet.balance' },
          totalEarnings: { $sum: '$wallet.totalEarnings' },
          totalSpent: { $sum: '$wallet.totalSpent' },
          avgBalance: { $avg: '$wallet.balance' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          withWallets: usersWithWallets,
          walletPenetration: ((usersWithWallets / totalUsers) * 100).toFixed(2) + '%'
        },
        transactions: transactionStats,
        wallets: walletStats[0] || {
          totalBalance: 0,
          totalEarnings: 0,
          totalSpent: 0,
          avgBalance: 0
        }
      }
    });
  } catch (error) {
    console.error('Wallet stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;
