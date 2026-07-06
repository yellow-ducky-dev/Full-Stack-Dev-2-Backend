import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema(
  {
    originalName: { type: String, required: true },
    filename: { type: String, required: true }, // stored filename
    mimeType: { type: String, required: true },
    size: { type: Number, required: true }, // in bytes
    fileBuffer: { type: Buffer }, // MongoDB storage for serverless environments
    url: { type: String, required: true }, // accessible path
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    sharedWith: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    isPubliclyShared: { type: Boolean, default: false },
    version: { type: Number, default: 1 },
    status: {
      type: String,
      enum: ['draft', 'pending-review', 'approved', 'rejected'],
      default: 'draft',
    },
    signatureUrl: { type: String, default: '' }, // base64 or stored path
    signedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    signedAt: { type: Date },
    description: { type: String, default: '' },
    tags: [{ type: String }],
  },
  { timestamps: true }
);

const Document = mongoose.model('Document', documentSchema);
export default Document;
