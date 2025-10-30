import mongoose, { Schema } from 'mongoose';

const JobSchema = new Schema({
  externalId: { type: String, required: true },
  sourceUrl: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String },
  company: { type: String },
  location: { type: String },
  categories: [{ type: String }],
  employmentType: { type: String },
  publishDate: { type: Date },
  link: { type: String },
  imageUrl: { type: String },
  raw: { type: Schema.Types.Mixed },
}, { timestamps: true });

JobSchema.index({ externalId: 1, sourceUrl: 1 }, { unique: true });

export const Job = mongoose.model('Job', JobSchema);
