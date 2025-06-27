import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  swap: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SkillSwap',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: [1000, 'Message content cannot exceed 1000 characters']
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'file'],
    default: 'text'
  },
  repliedToMessageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  },
  repliedToSender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date,
    default: null
  },
  attachments: [{
    url: String,
    type: String,
    filename: String,
    size: Number
  }],
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Index for efficient message retrieval
messageSchema.index({ swap: 1, createdAt: 1 });
messageSchema.index({ sender: 1, recipient: 1 });
messageSchema.index({ recipient: 1, isRead: 1 });

// Middleware to populate repliedToSender when repliedToMessageId is set
messageSchema.pre('save', async function(next) {
  if (this.repliedToMessageId && !this.repliedToSender) {
    try {
      const repliedMessage = await this.constructor.findById(this.repliedToMessageId);
      if (repliedMessage) {
        this.repliedToSender = repliedMessage.sender;
      }
    } catch (error) {
      console.error('Error populating repliedToSender:', error);
    }
  }
  next();
});

const Message = mongoose.model('Message', messageSchema);

export default Message;
