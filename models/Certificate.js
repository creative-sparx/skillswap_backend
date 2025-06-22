import mongoose from 'mongoose';

const certificateSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  issuedAt: {
    type: Date,
    default: Date.now
  },
  certificateNumber: {
    type: String,
    required: true,
    unique: true
  }
}, {
  timestamps: true
});

certificateSchema.index({ user: 1, course: 1 });

export default mongoose.model('Certificate', certificateSchema);
