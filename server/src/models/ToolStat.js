import mongoose from 'mongoose';

// One document per tool per day. No personal data, no cookies, no IP addresses.
const toolStatSchema = new mongoose.Schema(
  {
    tool: { type: String, required: true },
    day: { type: String, required: true }, // YYYY-MM-DD (UTC)
    views: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 180 },
  },
  { versionKey: false },
);
toolStatSchema.index({ tool: 1, day: 1 }, { unique: true });

export const ToolStat = mongoose.models.ToolStat || mongoose.model('ToolStat', toolStatSchema);
