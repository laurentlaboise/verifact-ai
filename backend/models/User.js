const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  name: {
    type: String,
    required: true
  },
  credits: {
    type: Number,
    default: 10, // Free tier: 10 credits to start
    min: 0
  },
  subscription: {
    type: {
      type: String,
      enum: ['free', 'standard', 'pro', 'team'],
      default: 'free'
    },
    stripeCustomerId: String,
    stripeSubscriptionId: String,
    status: {
      type: String,
      enum: ['active', 'canceled', 'past_due', 'trialing'],
      default: 'active'
    },
    currentPeriodEnd: Date,
    monthlyCredits: {
      type: Number,
      default: 0
    },
    creditsResetDate: Date
  },
  verificationsCount: {
    type: Number,
    default: 0
  },
  claimsVerifiedCount: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Reset monthly credits for subscription users
userSchema.methods.resetMonthlyCredits = function() {
  const now = new Date();
  const resetDate = this.subscription.creditsResetDate;

  if (resetDate && now >= resetDate) {
    this.credits = this.subscription.monthlyCredits;

    // Set next reset date (1 month from now)
    const nextResetDate = new Date(resetDate);
    nextResetDate.setMonth(nextResetDate.getMonth() + 1);
    this.subscription.creditsResetDate = nextResetDate;

    return true; // Credits were reset
  }
  return false; // No reset needed
};

// Deduct credits and return success/failure
userSchema.methods.deductCredits = function(amount) {
  if (this.credits >= amount) {
    this.credits -= amount;
    return true;
  }
  return false;
};

module.exports = mongoose.model('User', userSchema);
