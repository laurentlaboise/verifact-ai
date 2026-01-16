const mongoose = require('mongoose');

const verificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  articleName: {
    type: String,
    required: true
  },
  articleText: {
    type: String,
    required: true
  },
  articleLength: {
    type: Number,
    required: true
  },
  claims: [{
    id: String,
    text: String,
    agent: String,
    status: {
      type: String,
      enum: ['Confirmed', 'Disputed', 'Unverified', 'Verifying']
    },
    confidence: Number,
    riskLevel: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical']
    },
    evidence: [{
      url: String,
      snippet: String
    }],
    reasoning: String
  }],
  claimsCount: {
    type: Number,
    required: true
  },
  creditsUsed: {
    type: Number,
    required: true
  },
  overallConfidence: {
    type: Number,
    min: 0,
    max: 1
  },
  recommendation: String,
  processingTime: {
    type: Number // milliseconds
  },
  status: {
    type: String,
    enum: ['pending', 'extracting', 'verifying', 'completed', 'failed'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  completedAt: Date
});

// Index for efficient queries
verificationSchema.index({ userId: 1, createdAt: -1 });
verificationSchema.index({ status: 1 });

// Calculate overall confidence
verificationSchema.methods.calculateOverallConfidence = function() {
  if (this.claims.length === 0) return 0;
  const total = this.claims.reduce((acc, claim) => acc + (claim.confidence || 0), 0);
  return total / this.claims.length;
};

module.exports = mongoose.model('Verification', verificationSchema);
