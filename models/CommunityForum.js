// @ts-nocheck
import mongoose from 'mongoose';

const communityForumSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  upvotes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  comments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  }],
  flagged: {
    type: Boolean,
    default: false,
    index: true // Index for faster querying of flagged posts
  },
  attachment: {
    type: String // URL to the attachment
  }
}, {
  timestamps: true
});

// Compound index to sort forums by author and creation date
communityForumSchema.index({ author: 1, createdAt: -1 });

export default mongoose.model('CommunityForum', communityForumSchema);
