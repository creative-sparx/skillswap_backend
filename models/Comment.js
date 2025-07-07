import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
  body: {
    type: String,
    required: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CommunityForum',
    required: true
  },
  attachment: {
    type: String // URL to attachment
  }
}, {
  timestamps: true
});

// Compound indexes for performance
commentSchema.index({ author: 1, createdAt: -1 });
commentSchema.index({ post: 1, createdAt: -1 });

export default mongoose.model('Comment', commentSchema);