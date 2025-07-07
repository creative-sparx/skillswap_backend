import mongoose from 'mongoose';

const skillSwapSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'A title is required for the skill swap.'],
      trim: true
    },
    description: {
      type: String, 
      required: [true, 'A description is required.']
    },
    // The user who initiated the swap
    initiator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    // Both users involved in the swap
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    status: {
      type: String,
      enum: ['pending', 'active', 'completed', 'cancelled'],
      default: 'pending'
    }
  },
  { timestamps: true }
);

// Compound index for querying by initiator and creation date
skillSwapSchema.index({ initiator: 1, createdAt: -1 });

export default mongoose.model('SkillSwap', skillSwapSchema);