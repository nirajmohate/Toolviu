import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['bug', 'idea', 'other'], default: 'other' },
    message: { type: String, required: true, maxlength: 4000 },
    email: { type: String, maxlength: 200 },
    page: { type: String, maxlength: 300 },
    userAgent: { type: String, maxlength: 300 },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false },
);

export const Feedback = mongoose.models.Feedback || mongoose.model('Feedback', feedbackSchema);
