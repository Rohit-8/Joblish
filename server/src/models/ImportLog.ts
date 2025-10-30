import mongoose, { Schema } from 'mongoose';

const FailureSchema = new Schema({
  externalId: String,
  reason: String,
  at: { type: Date, default: Date.now }
}, { _id: false });

const ImportLogSchema = new Schema({
  runId: { type: String, required: true, unique: true },
  sourceUrls: [{ type: String }],
  startedAt: { type: Date, default: Date.now },
  finishedAt: { type: Date },
  totalFetched: { type: Number, default: 0 },
  totalImported: { type: Number, default: 0 },
  newJobs: { type: Number, default: 0 },
  updatedJobs: { type: Number, default: 0 },
  failedJobs: { type: Number, default: 0 },
  failures: [FailureSchema]
}, { timestamps: true });

export const ImportLog = mongoose.model('ImportLog', ImportLogSchema);
