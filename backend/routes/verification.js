const express = require('express');
const { auth } = require('../middleware/auth');
const Verification = require('../models/Verification');
const User = require('../models/User');

const router = express.Router();

// POST /api/verification/start - Start a new verification job
router.post('/start', auth, async (req, res) => {
  try {
    const { articleName, articleText, estimatedClaims } = req.body;

    // Validation
    if (!articleText || !articleText.trim()) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Article text is required'
      });
    }

    // Create verification record
    const verification = new Verification({
      userId: req.user._id,
      articleName: articleName || 'Untitled Article',
      articleText,
      articleLength: articleText.length,
      claimsCount: estimatedClaims || 0,
      creditsUsed: 0, // Will be updated when deducting credits
      status: 'pending'
    });

    await verification.save();

    res.status(201).json({
      message: 'Verification started',
      verificationId: verification._id,
      status: verification.status
    });
  } catch (error) {
    console.error('❌ Start verification error:', error);
    res.status(500).json({
      error: 'Failed to start verification',
      message: 'An error occurred while starting verification'
    });
  }
});

// PUT /api/verification/:id - Update verification with results
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      claims,
      status,
      overallConfidence,
      recommendation,
      processingTime
    } = req.body;

    const verification = await Verification.findOne({
      _id: id,
      userId: req.user._id
    });

    if (!verification) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Verification not found'
      });
    }

    // Update verification
    if (claims) verification.claims = claims;
    if (status) verification.status = status;
    if (overallConfidence !== undefined) verification.overallConfidence = overallConfidence;
    if (recommendation) verification.recommendation = recommendation;
    if (processingTime) verification.processingTime = processingTime;

    if (status === 'completed') {
      verification.completedAt = new Date();

      // Update claims count
      verification.claimsCount = claims?.length || verification.claimsCount;

      // Increment user's verification count
      req.user.verificationsCount += 1;
      await req.user.save();
    }

    await verification.save();

    res.json({
      message: 'Verification updated',
      verification: {
        id: verification._id,
        status: verification.status,
        claimsCount: verification.claimsCount,
        creditsUsed: verification.creditsUsed,
        overallConfidence: verification.overallConfidence
      }
    });
  } catch (error) {
    console.error('❌ Update verification error:', error);
    res.status(500).json({
      error: 'Failed to update verification',
      message: 'An error occurred while updating verification'
    });
  }
});

// GET /api/verification/:id - Get verification details
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const verification = await Verification.findOne({
      _id: id,
      userId: req.user._id
    });

    if (!verification) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Verification not found'
      });
    }

    res.json({ verification });
  } catch (error) {
    console.error('❌ Get verification error:', error);
    res.status(500).json({
      error: 'Failed to fetch verification',
      message: 'An error occurred while fetching verification details'
    });
  }
});

// GET /api/verification - Get user's verification history
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    const query = { userId: req.user._id };
    if (status) {
      query.status = status;
    }

    const verifications = await Verification.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .select('-articleText -claims.evidence'); // Exclude large fields

    const total = await Verification.countDocuments(query);

    res.json({
      verifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('❌ Get verifications error:', error);
    res.status(500).json({
      error: 'Failed to fetch verifications',
      message: 'An error occurred while fetching verification history'
    });
  }
});

// DELETE /api/verification/:id - Delete a verification
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const verification = await Verification.findOneAndDelete({
      _id: id,
      userId: req.user._id
    });

    if (!verification) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Verification not found'
      });
    }

    res.json({
      message: 'Verification deleted successfully'
    });
  } catch (error) {
    console.error('❌ Delete verification error:', error);
    res.status(500).json({
      error: 'Failed to delete verification',
      message: 'An error occurred while deleting verification'
    });
  }
});

module.exports = router;
