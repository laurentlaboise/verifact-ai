const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { auth } = require('../middleware/auth');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

const router = express.Router();

// Pricing configuration
const PRICING = {
  standard: {
    name: 'Standard Plan',
    credits: 100,
    monthlyPrice: 500, // $5.00 in cents
    annualPrice: 5100, // $51.00 in cents (15% discount)
    priceIdMonthly: process.env.STRIPE_STANDARD_MONTHLY_PRICE_ID,
    priceIdAnnual: process.env.STRIPE_STANDARD_ANNUAL_PRICE_ID
  },
  pro: {
    name: 'Pro Plan',
    credits: 750,
    monthlyPrice: 18500, // $185.00 in cents
    annualPrice: 188700, // $1887.00 in cents (15% discount)
    priceIdMonthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
    priceIdAnnual: process.env.STRIPE_PRO_ANNUAL_PRICE_ID
  },
  team: {
    name: 'Team Plan',
    credits: 1250,
    monthlyPrice: 28500, // $285.00 in cents
    annualPrice: 290700, // $2907.00 in cents (15% discount)
    priceIdMonthly: process.env.STRIPE_TEAM_MONTHLY_PRICE_ID,
    priceIdAnnual: process.env.STRIPE_TEAM_ANNUAL_PRICE_ID
  },
  // One-time credit packs
  pack_50: { name: '50 Credits', credits: 50, price: 500 }, // $5.00
  pack_100: { name: '100 Credits', credits: 100, price: 900 }, // $9.00
  pack_500: { name: '500 Credits', credits: 500, price: 4000 } // $40.00
};

// GET /api/stripe/pricing - Get pricing information
router.get('/pricing', (req, res) => {
  res.json({
    subscriptions: {
      standard: {
        name: PRICING.standard.name,
        credits: PRICING.standard.credits,
        monthlyPrice: PRICING.standard.monthlyPrice / 100,
        annualPrice: PRICING.standard.annualPrice / 100
      },
      pro: {
        name: PRICING.pro.name,
        credits: PRICING.pro.credits,
        monthlyPrice: PRICING.pro.monthlyPrice / 100,
        annualPrice: PRICING.pro.annualPrice / 100
      },
      team: {
        name: PRICING.team.name,
        credits: PRICING.team.credits,
        monthlyPrice: PRICING.team.monthlyPrice / 100,
        annualPrice: PRICING.team.annualPrice / 100
      }
    },
    creditPacks: {
      pack_50: {
        name: PRICING.pack_50.name,
        credits: PRICING.pack_50.credits,
        price: PRICING.pack_50.price / 100
      },
      pack_100: {
        name: PRICING.pack_100.name,
        credits: PRICING.pack_100.credits,
        price: PRICING.pack_100.price / 100
      },
      pack_500: {
        name: PRICING.pack_500.name,
        credits: PRICING.pack_500.credits,
        price: PRICING.pack_500.price / 100
      }
    }
  });
});

// POST /api/stripe/create-checkout-session - Create Stripe checkout session
router.post('/create-checkout-session', auth, async (req, res) => {
  try {
    const { plan, billing, type = 'subscription' } = req.body;

    // Validate plan
    if (!PRICING[plan]) {
      return res.status(400).json({
        error: 'Invalid plan',
        message: 'The selected plan does not exist'
      });
    }

    const planConfig = PRICING[plan];

    // Get or create Stripe customer
    let customerId = req.user.subscription.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: req.user.email,
        name: req.user.name,
        metadata: {
          userId: req.user._id.toString()
        }
      });
      customerId = customer.id;

      // Save customer ID
      req.user.subscription.stripeCustomerId = customerId;
      await req.user.save();
    }

    // Create checkout session
    const sessionConfig = {
      customer: customerId,
      mode: type === 'subscription' ? 'subscription' : 'payment',
      success_url: `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/payment/canceled`,
      metadata: {
        userId: req.user._id.toString(),
        plan,
        credits: planConfig.credits.toString()
      }
    };

    if (type === 'subscription') {
      // Subscription checkout
      const priceId = billing === 'annual'
        ? planConfig.priceIdAnnual
        : planConfig.priceIdMonthly;

      sessionConfig.line_items = [{
        price: priceId,
        quantity: 1
      }];
    } else {
      // One-time payment for credit pack
      sessionConfig.line_items = [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: planConfig.name,
            description: `${planConfig.credits} verification credits`
          },
          unit_amount: planConfig.price
        },
        quantity: 1
      }];
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    res.json({
      sessionId: session.id,
      url: session.url
    });
  } catch (error) {
    console.error('❌ Create checkout session error:', error);
    res.status(500).json({
      error: 'Failed to create checkout session',
      message: error.message
    });
  }
});

// POST /api/stripe/webhook - Handle Stripe webhooks
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;

      case 'invoice.paid':
        await handleInvoicePaid(event.data.object);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('❌ Webhook handler error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

// Webhook handlers
async function handleCheckoutCompleted(session) {
  const userId = session.metadata.userId;
  const plan = session.metadata.plan;
  const credits = parseInt(session.metadata.credits);

  const user = await User.findById(userId);
  if (!user) {
    console.error('User not found:', userId);
    return;
  }

  if (session.mode === 'subscription') {
    // Subscription purchase
    user.subscription.type = plan;
    user.subscription.stripeSubscriptionId = session.subscription;
    user.subscription.status = 'active';
    user.subscription.monthlyCredits = credits;

    // Set credit reset date to 1 month from now
    const resetDate = new Date();
    resetDate.setMonth(resetDate.getMonth() + 1);
    user.subscription.creditsResetDate = resetDate;

    // Add subscription credits
    user.credits += credits;
  } else {
    // One-time credit purchase
    user.credits += credits;
  }

  await user.save();

  // Record transaction
  await Transaction.recordPurchase(userId, credits, session.amount_total / 100, {
    stripePaymentIntentId: session.payment_intent,
    stripeSubscriptionId: session.subscription,
    plan
  });

  console.log(`✅ Credits added for user ${user.email}: +${credits} credits`);
}

async function handleSubscriptionUpdated(subscription) {
  const user = await User.findOne({
    'subscription.stripeCustomerId': subscription.customer
  });

  if (!user) {
    console.error('User not found for subscription:', subscription.id);
    return;
  }

  user.subscription.status = subscription.status;
  user.subscription.currentPeriodEnd = new Date(subscription.current_period_end * 1000);

  await user.save();

  console.log(`✅ Subscription updated for user ${user.email}`);
}

async function handleSubscriptionDeleted(subscription) {
  const user = await User.findOne({
    'subscription.stripeSubscriptionId': subscription.id
  });

  if (!user) {
    console.error('User not found for subscription:', subscription.id);
    return;
  }

  user.subscription.type = 'free';
  user.subscription.status = 'canceled';
  user.subscription.monthlyCredits = 0;
  user.subscription.stripeSubscriptionId = null;

  await user.save();

  console.log(`✅ Subscription canceled for user ${user.email}`);
}

async function handleInvoicePaid(invoice) {
  // Monthly subscription renewal - add credits
  const user = await User.findOne({
    'subscription.stripeCustomerId': invoice.customer
  });

  if (!user) {
    console.error('User not found for invoice:', invoice.id);
    return;
  }

  // Add monthly credits
  if (user.subscription.type !== 'free' && user.subscription.monthlyCredits > 0) {
    user.credits += user.subscription.monthlyCredits;

    // Update reset date
    const resetDate = new Date();
    resetDate.setMonth(resetDate.getMonth() + 1);
    user.subscription.creditsResetDate = resetDate;

    await user.save();

    // Record transaction
    await Transaction.recordPurchase(
      user._id,
      user.subscription.monthlyCredits,
      invoice.amount_paid / 100,
      {
        stripeSubscriptionId: invoice.subscription,
        plan: user.subscription.type
      }
    );

    console.log(`✅ Monthly credits renewed for ${user.email}: +${user.subscription.monthlyCredits}`);
  }
}

async function handlePaymentFailed(invoice) {
  const user = await User.findOne({
    'subscription.stripeCustomerId': invoice.customer
  });

  if (!user) return;

  user.subscription.status = 'past_due';
  await user.save();

  console.log(`⚠️ Payment failed for user ${user.email}`);
}

// POST /api/stripe/cancel-subscription - Cancel user's subscription
router.post('/cancel-subscription', auth, async (req, res) => {
  try {
    const subscriptionId = req.user.subscription.stripeSubscriptionId;

    if (!subscriptionId) {
      return res.status(400).json({
        error: 'No active subscription',
        message: 'You do not have an active subscription'
      });
    }

    // Cancel at period end (don't immediately cancel)
    await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true
    });

    res.json({
      message: 'Subscription will be canceled at the end of the billing period',
      subscription: {
        status: 'canceling',
        currentPeriodEnd: req.user.subscription.currentPeriodEnd
      }
    });
  } catch (error) {
    console.error('❌ Cancel subscription error:', error);
    res.status(500).json({
      error: 'Failed to cancel subscription',
      message: error.message
    });
  }
});

module.exports = router;
