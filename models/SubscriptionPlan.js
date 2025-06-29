import mongoose from 'mongoose';

const subscriptionPlanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Plan name is required'],
    trim: true,
    maxlength: [100, 'Plan name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Plan description is required'],
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  duration: {
    type: String,
    required: [true, 'Plan duration is required'],
    enum: ['monthly', 'yearly']
  },
  price: {
    type: Number,
    required: [true, 'Plan price is required'],
    min: [0, 'Price cannot be negative']
  },
  currency: {
    type: String,
    required: [true, 'Currency is required'],
    default: 'NGN',
    enum: ['NGN', 'USD', 'EUR', 'GBP']
  },
  features: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    included: {
      type: Boolean,
      default: true
    }
  }],
  limits: {
    coursesPerMonth: {
      type: Number,
      default: -1 // -1 means unlimited
    },
    tutoringSessions: {
      type: Number,
      default: -1
    },
    premiumContent: {
      type: Boolean,
      default: true
    },
    aiAssistant: {
      type: Boolean,
      default: true
    },
    prioritySupport: {
      type: Boolean,
      default: false
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  // Flutterwave integration
  flutterwavePlanId: {
    type: String,
    unique: true,
    sparse: true
  },
  // Stripe integration (for international payments)
  stripePriceId: {
    type: String,
    unique: true,
    sparse: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
subscriptionPlanSchema.index({ duration: 1, isActive: 1 });
subscriptionPlanSchema.index({ price: 1 });
subscriptionPlanSchema.index({ sortOrder: 1 });

// Virtual for formatted price
subscriptionPlanSchema.virtual('formattedPrice').get(function() {
  const currencySymbols = {
    NGN: '₦',
    USD: '$',
    EUR: '€',
    GBP: '£'
  };
  const symbol = currencySymbols[this.currency] || this.currency;
  return `${symbol}${this.price.toLocaleString()}`;
});

// Pre-save middleware to update updatedAt
subscriptionPlanSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Static method to get active plans
subscriptionPlanSchema.statics.getActivePlans = function() {
  return this.find({ isActive: true }).sort({ sortOrder: 1, price: 1 });
};

// Static method to get plans by duration
subscriptionPlanSchema.statics.getPlansByDuration = function(duration) {
  return this.find({ 
    duration: duration, 
    isActive: true 
  }).sort({ price: 1 });
};

export default mongoose.model('SubscriptionPlan', subscriptionPlanSchema);
