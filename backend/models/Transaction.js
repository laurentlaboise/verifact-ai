const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['purchase', 'subscription', 'deduction', 'refund', 'bonus'],
    required: true
  },
  amount: {
    type: Number,
    required: true // Positive for credits added, negative for credits spent
  },
  credits: {
    type: Number,
    required: true // Credits involved in transaction
  },
  balanceBefore: {
    type: Number,
    required: true
  },
  balanceAfter: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  metadata: {
    // For purchases/subscriptions
    stripePaymentIntentId: String,
    stripeSubscriptionId: String,
    plan: String,

    // For deductions
    verificationId: String,
    claimsVerified: Number,
    articleName: String,

    // General
    discountCode: String,
    originalPrice: Number,
    discountedPrice: Number
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'completed'
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Index for efficient queries
transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ type: 1, status: 1 });

// Static method to record credit purchase
transactionSchema.statics.recordPurchase = async function(userId, credits, amount, metadata = {}) {
  const User = mongoose.model('User');
  const user = await User.findById(userId);

  const transaction = new this({
    userId,
    type: metadata.stripeSubscriptionId ? 'subscription' : 'purchase',
    amount,
    credits,
    balanceBefore: user.credits,
    balanceAfter: user.credits + credits,
    description: metadata.stripeSubscriptionId
      ? `Subscription: ${metadata.plan} Plan`
      : `Purchased ${credits} credits`,
    metadata,
    status: 'completed'
  });

  return transaction.save();
};

// Static method to record credit deduction
transactionSchema.statics.recordDeduction = async function(userId, credits, metadata = {}) {
  const User = mongoose.model('User');
  const user = await User.findById(userId);

  const transaction = new this({
    userId,
    type: 'deduction',
    amount: 0, // No money involved in deduction
    credits: -credits,
    balanceBefore: user.credits,
    balanceAfter: user.credits - credits,
    description: `Verified ${metadata.claimsVerified || 1} claim(s) in "${metadata.articleName || 'article'}"`,
    metadata,
    status: 'completed'
  });

  return transaction.save();
};

module.exports = mongoose.model('Transaction', transactionSchema);
