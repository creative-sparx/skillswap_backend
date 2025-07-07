import mongoose from 'mongoose';

const featuredSchema = new mongoose.Schema({
  itemType: {
    type: String,
    enum: ['tutor', 'course'],
    required: true
  },
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'itemType'
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  bannerImage: {
    type: String, // Cloudinary URL
    required: true
  },
  priority: {
    type: Number,
    default: 0, // Higher numbers appear first
    min: 0,
    max: 100
  },
  isActive: {
    type: Boolean,
    default: true
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date,
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  analytics: {
    views: {
      type: Number,
      default: 0
    },
    clicks: {
      type: Number,
      default: 0
    },
    conversions: {
      type: Number,
      default: 0
    }
  },
  tags: [{
    type: String,
    trim: true
  }],
  targetAudience: {
    type: String,
    enum: ['all', 'beginners', 'intermediate', 'advanced'],
    default: 'all'
  }
}, {
  timestamps: true
});

// Virtual for getting referenced item details
featuredSchema.virtual('item', {
  refPath: 'itemType',
  localField: 'itemId',
  foreignField: '_id',
  justOne: true
});

// Index for efficient querying
featuredSchema.index({ isActive: 1, priority: -1, startDate: 1 });
featuredSchema.index({ itemType: 1, itemId: 1 });
featuredSchema.index({ endDate: 1 });

// Pre-save middleware to set itemType based on itemId
featuredSchema.pre('save', async function(next) {
  if (this.isModified('itemId')) {
    try {
      // Try to find in User collection first (tutors)
      const User = mongoose.model('User');
      const tutor = await User.findById(this.itemId);
      
      if (tutor) {
        this.itemType = 'tutor';
        return next();
      }
      
      // If not found in User, try Course collection
      const Course = mongoose.model('Course');
      const course = await Course.findById(this.itemId);
      
      if (course) {
        this.itemType = 'course';
        return next();
      }
      
      // If neither found, throw error
      throw new Error('Referenced item not found in User or Course collections');
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Static method to get active featured items
featuredSchema.statics.getActiveFeatured = function(itemType = null, limit = 10) {
  const query = {
    isActive: true,
    startDate: { $lte: new Date() },
    endDate: { $gte: new Date() }
  };
  
  if (itemType) {
    query.itemType = itemType;
  }
  
  return this.find(query)
    .sort({ priority: -1, createdAt: -1 })
    .limit(limit)
    .populate('item')
    .populate('createdBy', 'name email');
};

// Method to increment view count
featuredSchema.methods.incrementViews = function() {
  this.analytics.views += 1;
  return this.save();
};

// Method to increment click count
featuredSchema.methods.incrementClicks = function() {
  this.analytics.clicks += 1;
  return this.save();
};

// Method to increment conversion count
featuredSchema.methods.incrementConversions = function() {
  this.analytics.conversions += 1;
  return this.save();
};

// Method to check if featured item is currently active
featuredSchema.methods.isCurrentlyActive = function() {
  const now = new Date();
  return this.isActive && 
         this.startDate <= now && 
         this.endDate >= now;
};

export default mongoose.model('Featured', featuredSchema);
