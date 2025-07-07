import mongoose from 'mongoose';

const lessonSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  videoUrl: {
    type: String,
    required: true
  },
  resources: [{
    type: String // URLs to PDFs, slides, etc.
  }],
  duration: {
    type: Number, // in minutes
    default: 0
  },
  order: {
    type: Number,
    default: 0
  },
  isLive: {
    type: Boolean,
    default: false
  },
  liveSessionInfo: {
    scheduledAt: Date,
    meetingLink: String
  }
}, { _id: false });

const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120
  },
  description: {
    type: String,
    required: true,
    maxlength: 2000
  },
  category: {
    type: String,
    required: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  coverImage: {
    type: String,
    default: null
  },
  level: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced', 'all'],
    default: 'all'
  },
  language: {
    type: String,
    default: 'en'
  },
  tutor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lessons: [lessonSchema],
  enrolledUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  price: {
    type: Number,
    default: 0 // 0 = free
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  publishedAt: Date,
  rating: {
    type: Number,
    default: 0
  },
  ratingCount: {
    type: Number,
    default: 0
  },
  reviews: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: Number,
    comment: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  certificatesEnabled: {
    type: Boolean,
    default: true
  },
  skillTags: [{
    type: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

courseSchema.index({ title: 'text', description: 'text', tags: 1 });
courseSchema.index({ category: 1 });
courseSchema.index({ tutor: 1 });
courseSchema.index({ price: 1 });
courseSchema.index({ isPublished: 1 });

// Compound indexes for better query performance
courseSchema.index({ isPublished: 1, category: 1 });
courseSchema.index({ isPublished: 1, createdAt: -1 });
courseSchema.index({ tutor: 1, isPublished: 1 });
courseSchema.index({ category: 1, level: 1 });
courseSchema.index({ price: 1, rating: -1 });
courseSchema.index({ tags: 1, isPublished: 1 });
courseSchema.index({ rating: -1, ratingCount: -1 }); // For popular courses
courseSchema.index({ createdAt: -1, category: 1 }); // For recent courses by category

export default mongoose.model('Course', courseSchema);
