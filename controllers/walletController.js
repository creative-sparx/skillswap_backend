// @ts-nocheck
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import { io } from '../server.js';
import crypto from 'crypto';

/**
 * @desc    Get user's wallet balance
 * @route   GET /api/wallet/balance
 * @access  Private
 */
export const getWalletBalance = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('wallet');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        balance: user.wallet.balance,
        totalEarnings: user.wallet.totalEarnings,
        totalSpent: user.wallet.totalSpent
      }
    });
  } catch (error) {
    console.error('Error fetching wallet balance:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * @desc    Initialize token top-up payment with Flutterwave
 * @route   POST /api/wallet/topup
 * @access  Private
 */
export const initializeTopUp = async (req, res) => {
  try {
    const { amount, currency = 'NGN' } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Validate amount
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid amount. Amount must be greater than 0'
      });
    }

    // Generate unique transaction reference
    const txRef = `topup_${user._id}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    // Create transaction record
    const transaction = new Transaction({
      userId: user._id,
      type: 'topup',
      amount,
      currency,
      txRef,
      status: 'pending',
      description: `Wallet top-up of ${amount} ${currency}`
    });

    await transaction.save();

    // Flutterwave payment initialization payload
    const flutterwavePayload = {
      tx_ref: txRef,
      amount: amount,
      currency: currency,
      payment_options: 'card,mobilemoney,ussd',
      customer: {
        email: user.email,
        phone_number: user.phone || '',
        name: user.fullName
      },
      customizations: {
        title: 'SkillSwap Wallet Top-up',
        description: `Add ${amount} ${currency} to your wallet`,
        logo: process.env.APP_LOGO_URL || ''
      },
      redirect_url: `${process.env.FRONTEND_URL}/wallet/success`,
      meta: {
        userId: user._id.toString(),
        type: 'wallet_topup'
      }
    };

    // Make request to Flutterwave
    const flutterwaveResponse = await fetch('https://api.flutterwave.com/v3/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(flutterwavePayload)
    });

    const flutterwaveData = await flutterwaveResponse.json();

    if (flutterwaveData.status === 'success') {
      res.status(200).json({
        success: true,
        data: {
          paymentLink: flutterwaveData.data.link,
          txRef: txRef,
          amount: amount,
          currency: currency
        }
      });
    } else {
      // Delete the transaction if payment initialization failed
      await Transaction.findByIdAndDelete(transaction._id);
      
      res.status(400).json({
        success: false,
        message: 'Failed to initialize payment',
        error: flutterwaveData.message
      });
    }

  } catch (error) {
    console.error('Error initializing top-up:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * @desc    Deduct tokens from user wallet
 * @route   POST /api/wallet/deduct
 * @access  Private
 */
export const deductTokens = async (req, res) => {
  try {
    const { amount, description, courseId } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Validate amount
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid amount. Amount must be greater than 0'
      });
    }

    // Check if user has sufficient balance
    if (user.wallet.balance < amount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient wallet balance',
        currentBalance: user.wallet.balance,
        requiredAmount: amount
      });
    }

    // Create transaction record
    const txRef = `deduct_${user._id}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    
    const transaction = new Transaction({
      userId: user._id,
      type: 'deduction',
      amount,
      currency: 'NGN',
      txRef,
      status: 'successful',
      description: description || `Wallet deduction of ${amount} tokens`,
      courseId: courseId || null
    });

    await transaction.save();

    // Update user wallet
    user.wallet.balance -= amount;
    user.wallet.totalSpent += amount;
    await user.save();

    // Send real-time notification
    io.to(user._id.toString()).emit('wallet_deduction', {
      amount,
      newBalance: user.wallet.balance,
      description: transaction.description
    });

    res.status(200).json({
      success: true,
      message: 'Tokens deducted successfully',
      data: {
        transactionId: transaction._id,
        amountDeducted: amount,
        newBalance: user.wallet.balance,
        description: transaction.description
      }
    });

  } catch (error) {
    console.error('Error deducting tokens:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * @desc    Add tokens to user wallet (internal use - for successful payments)
 * @route   Internal function
 * @access  Internal
 */
export const addTokensToWallet = async (userId, amount, txRef, description) => {
  try {
    const user = await User.findById(userId);
    
    if (!user) {
      throw new Error('User not found');
    }

    // Update user wallet
    user.wallet.balance += amount;
    user.wallet.totalEarnings += amount;
    await user.save();

    // Update transaction status
    await Transaction.findOneAndUpdate(
      { txRef },
      { status: 'successful' }
    );

    // Send real-time notification
    io.to(userId.toString()).emit('wallet_topup', {
      amount,
      newBalance: user.wallet.balance,
      description
    });

    return {
      success: true,
      newBalance: user.wallet.balance
    };

  } catch (error) {
    console.error('Error adding tokens to wallet:', error);
    throw error;
  }
};

/**
 * @desc    Get wallet transaction history
 * @route   GET /api/wallet/transactions
 * @access  Private
 */
export const getTransactionHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    const userId = req.user.id;

    const query = { userId };
    if (type) {
      query.type = type;
    }

    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('courseId', 'title');

    const total = await Transaction.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        transactions,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalTransactions: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Error fetching transaction history:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * @desc    Verify payment and update wallet
 * @route   POST /api/wallet/verify-payment
 * @access  Private
 */
export const verifyPayment = async (req, res) => {
  try {
    const { tx_ref, transaction_id } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Find the transaction in our database
    const transaction = await Transaction.findOne({ txRef: tx_ref, userId: user._id });
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    if (transaction.status === 'successful') {
      return res.status(200).json({
        success: true,
        message: 'Payment already verified',
        data: { transaction }
      });
    }

    // Verify with Flutterwave
    const flutterwaveResponse = await fetch(`https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const verificationData = await flutterwaveResponse.json();

    if (verificationData.status === 'success' && verificationData.data.status === 'successful') {
      // Update transaction status
      transaction.status = 'successful';
      transaction.flutterwaveRef = verificationData.data.id;
      await transaction.save();

      // Add tokens to user wallet
      user.wallet.balance += transaction.amount;
      user.wallet.totalEarnings += transaction.amount;
      await user.save();

      // Emit real-time update
      io.to(user._id.toString()).emit('walletUpdate', {
        balance: user.wallet.balance,
        transaction: transaction
      });

      res.status(200).json({
        success: true,
        message: 'Payment verified successfully',
        data: {
          transaction,
          newBalance: user.wallet.balance
        }
      });
    } else {
      transaction.status = 'failed';
      await transaction.save();

      res.status(400).json({
        success: false,
        message: 'Payment verification failed',
        error: verificationData.message
      });
    }

  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * @desc    Get transaction summary
 * @route   GET /api/wallet/summary
 * @access  Private
 */
export const getTransactionSummary = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const summary = await Transaction.aggregate([
      { $match: { userId: userId } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          avgAmount: { $avg: '$amount' }
        }
      }
    ]);

    const statusSummary = await Transaction.aggregate([
      { $match: { userId: userId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    const recentTransactions = await Transaction.find({ userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('type amount status description createdAt');

    res.status(200).json({
      success: true,
      data: {
        byType: summary,
        byStatus: statusSummary,
        recent: recentTransactions
      }
    });

  } catch (error) {
    console.error('Error fetching transaction summary:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};
