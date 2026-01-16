const express = require('express');
const { auth } = require('../middleware/auth');
const Transaction = require('../models/Transaction');
const User = require('../models/User');

const router = express.Router();

// GET /api/credits/balance - Get user's current credit balance
router.get('/balance', auth, async (req, res) => {
  try {
    res.json({
      credits: req.user.credits,
      subscription: req.user.subscription,
      verificationsCount: req.user.verificationsCount,
      claimsVerifiedCount: req.user.claimsVerifiedCount
    });
  } catch (error) {
    console.error('❌ Get balance error:', error);
    res.status(500).json({
      error: 'Failed to fetch balance',
      message: 'An error occurred while fetching your credit balance'
    });
  }
});

// POST /api/credits/check - Check if user has enough credits for an operation
router.post('/check', auth, async (req, res) => {
  try {
    const { creditsRequired } = req.body;

    if (!creditsRequired || creditsRequired < 0) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'creditsRequired must be a positive number'
      });
    }

    const hasEnough = req.user.credits >= creditsRequired;

    res.json({
      hasEnoughCredits: hasEnough,
      currentBalance: req.user.credits,
      creditsRequired,
      shortfall: hasEnough ? 0 : creditsRequired - req.user.credits
    });
  } catch (error) {
    console.error('❌ Check credits error:', error);
    res.status(500).json({
      error: 'Failed to check credits',
      message: 'An error occurred while checking your credits'
    });
  }
});

// POST /api/credits/deduct - Deduct credits after verification
router.post('/deduct', auth, async (req, res) => {
  try {
    const { credits, verificationId, claimsVerified, articleName } = req.body;

    // Validation
    if (!credits || credits < 0) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'credits must be a positive number'
      });
    }

    // Check if user has enough credits
    if (req.user.credits < credits) {
      return res.status(402).json({
        error: 'Insufficient credits',
        message: `You need ${credits} credits but only have ${req.user.credits}`,
        currentBalance: req.user.credits,
        creditsRequired: credits,
        shortfall: credits - req.user.credits
      });
    }

    // Deduct credits
    const success = req.user.deductCredits(credits);

    if (!success) {
      return res.status(402).json({
        error: 'Insufficient credits',
        message: 'Not enough credits for this operation'
      });
    }

    // Increment claims verified count
    req.user.claimsVerifiedCount += claimsVerified || 0;

    await req.user.save();

    // Record transaction
    await Transaction.recordDeduction(req.user._id, credits, {
      verificationId,
      claimsVerified,
      articleName
    });

    res.json({
      message: 'Credits deducted successfully',
      creditsDeducted: credits,
      newBalance: req.user.credits,
      claimsVerified,
      totalClaimsVerified: req.user.claimsVerifiedCount
    });
  } catch (error) {
    console.error('❌ Deduct credits error:', error);
    res.status(500).json({
      error: 'Failed to deduct credits',
      message: 'An error occurred while deducting credits'
    });
  }
});

// GET /api/credits/transactions - Get user's transaction history
router.get('/transactions', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;

    const query = { userId: req.user._id };
    if (type) {
      query.type = type;
    }

    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Transaction.countDocuments(query);

    res.json({
      transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('❌ Get transactions error:', error);
    res.status(500).json({
      error: 'Failed to fetch transactions',
      message: 'An error occurred while fetching transaction history'
    });
  }
});

// GET /api/credits/stats - Get user's credit statistics
router.get('/stats', auth, async (req, res) => {
  try {
    // Get transaction statistics
    const totalPurchased = await Transaction.aggregate([
      {
        $match: {
          userId: req.user._id,
          type: { $in: ['purchase', 'subscription', 'bonus'] },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          totalCredits: { $sum: '$credits' },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    const totalSpent = await Transaction.aggregate([
      {
        $match: {
          userId: req.user._id,
          type: 'deduction',
          status: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          totalCredits: { $sum: { $abs: '$credits' } }
        }
      }
    ]);

    res.json({
      currentBalance: req.user.credits,
      subscription: req.user.subscription,
      verificationsCount: req.user.verificationsCount,
      claimsVerifiedCount: req.user.claimsVerifiedCount,
      totalCreditsPurchased: totalPurchased[0]?.totalCredits || 0,
      totalMoneySpent: totalPurchased[0]?.totalAmount || 0,
      totalCreditsSpent: totalSpent[0]?.totalCredits || 0,
      averageCreditsPerVerification: req.user.verificationsCount > 0
        ? (totalSpent[0]?.totalCredits || 0) / req.user.verificationsCount
        : 0
    });
  } catch (error) {
    console.error('❌ Get stats error:', error);
    res.status(500).json({
      error: 'Failed to fetch statistics',
      message: 'An error occurred while fetching credit statistics'
    });
  }
});

module.exports = router;
