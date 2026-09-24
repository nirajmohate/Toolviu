import mongoose from 'mongoose';
import { config } from '../config.js';

const snippetSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    tool: { type: String, required: true, index: true },
    data: { type: String, required: true, maxlength: config.snippetMaxChars },
    views: { type: Number, default: 0 },
    // TTL index: MongoDB removes expired documents automatically.
    createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * config.snippetTtlDays },
  },
  { versionKey: false },
);

export const Snippet = mongoose.models.Snippet || mongoose.model('Snippet', snippetSchema);
