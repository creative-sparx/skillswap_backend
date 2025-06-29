import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['topup', 'deduction', 'earnings', 'refund', 'withdrawal'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'NGN',
    enum: ['NGN', 'USD', 'GHS', 'KES']
  },
  txRef: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'successful', 'failed', 'cancelled'],
    default: 'pending'
  },
  description: {
    type: String,
    required: true
  },
  // Reference to course if transaction is course-related
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    default: null
  },
  // Reference to certificate if transaction is certificate-related
  certificateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Certificate',
    default: null
  },
  // Flutterwave transaction details
  flutterwaveId: {
    type: String,
    default: null
  },
  flutterwaveRef: {
    type: String,
    default: null
  },
  // Payment method used (for top-ups)
  paymentMethod: {
    type: String,
    enum: ['card', 'bank_transfer', 'mobile_money', 'ussd', 'wallet'],
    default: null
  },
  // Additional metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // Timestamps for transaction events
  initiatedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date,
    default: null
  },
  failedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for better query performance
transactionSchema.index({ userId: 1, type: 1 });
transactionSchema.index({ txRef: 1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ createdAt: -1 });
transactionSchema.index({ flutterwaveId: 1 });

// Virtual for calculating processing time
transactionSchema.virtual('processingTime').get(function() {
  if (this.completedAt) {
    return this.completedAt - this.initiatedAt;
  }
  return null;
});

// Pre-save middleware to update completion timestamps
transactionSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    if (this.status === 'successful' && !this.completedAt) {
      this.completedAt = new Date();
    } else if (this.status === 'failed' && !this.failedAt) {
      this.failedAt = new Date();
    }
  }
  next();
});

// Static method to find transactions by user
transactionSchema.statics.findByUser = function(userId, options = {}) {
  const query = this.find({ userId });
  
  if (options.type) {
    query.where('type').equals(options.type);
  }
  
  if (options.status) {
    query.where('status').equals(options.status);
  }
  
  if (options.startDate || options.endDate) {
    const dateQuery = {};
    if (options.startDate) {dateQuery.$gte = options.startDate;}
    if (options.endDate) {dateQuery.$lte = options.endDate;}
    query.where('createdAt').and(dateQuery);
  }
  
  return query.sort({ createdAt: -1 });
};

// Static method to get transaction summary for a user
transactionSchema.statics.getTransactionSummary = async function(userId) {
  const summary = await this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$type',
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 },
        successfulAmount: {
          $sum: {
            $cond: [
              { $eq: ['$status', 'successful'] },
              '$amount',
              0
            ]
          }
        },
        successfulCount: {
          $sum: {
            $cond: [
              { $eq: ['$status', 'successful'] },
              1,
              0
            ]
          }
        }
      }
    }
  ]);
  
  return summary.reduce((acc, item) => {
    acc[item._id] = {
      totalAmount: item.totalAmount,
      count: item.count,
      successfulAmount: item.successfulAmount,
      successfulCount: item.successfulCount
    };
    return acc;
  }, {});
};

// Instance method to mark transaction as completed
transactionSchema.methods.markCompleted = function(flutterwaveData = {}) {
  this.status = 'successful';
  this.completedAt = new Date();
  
  if (flutterwaveData.id) {
    this.flutterwaveId = flutterwaveData.id;
  }
  
  if (flutterwaveData.tx_ref) {
    this.flutterwaveRef = flutterwaveData.tx_ref;
  }
  
  if (flutterwaveData.payment_type) {
    this.paymentMethod = flutterwaveData.payment_type;
  }
  
  return this.save();
};

// Instance method to mark transaction as failed
transactionSchema.methods.markFailed = function(reason = '') {
  this.status = 'failed';
  this.failedAt = new Date();
  
  if (reason) {
    this.metadata.failureReason = reason;
  }
  
  return this.save();
};

const Transaction = mongoose.model('Transaction', transactionSchema);

export default Transaction;
