# VeriFact AI Credit & Pricing System

## 🚀 Overview

The VeriFact AI Credit System enables monetization of the fact-checking service through a flexible credit-based pricing model with subscription tiers and pay-per-use options.

## 📋 Features

### ✅ Implemented Features

- **User Authentication** (JWT-based)
  - Signup with 10 free credits
  - Login/Logout
  - Secure password hashing

- **Credit Management**
  - Real-time credit balance tracking
  - Per-claim credit deduction (dynamic pricing)
  - Transaction history
  - Credit statistics

- **Subscription Plans**
  - Standard: $5/month (100 credits/month)
  - Pro: $185/month (750 credits/month)
  - Team: $285/month (1250 credits/month)
  - Monthly & annual billing (15% discount on annual)

- **Payment Processing** (Stripe Integration)
  - Secure checkout sessions
  - Subscription management
  - One-time credit purchases
  - Webhook handling for automated credit provisioning

- **Frontend Components**
  - Pricing modal with 3 tiers
  - Credit balance badge
  - Authentication modal
  - Insufficient credits warning
  - Buy credits flow

- **Backend API**
  - RESTful API endpoints
  - MongoDB database
  - Express.js server
  - Stripe webhook integration

## 🏗️ Architecture

```
┌─────────────────┐
│   Frontend      │
│   (React/Vite)  │
│                 │
│  - Auth Modal   │
│  - Pricing UI   │
│  - Credit Badge │
└────────┬────────┘
         │ HTTP/REST
         ↓
┌─────────────────┐
│  Backend API    │
│  (Express.js)   │
│                 │
│  /api/auth      │
│  /api/credits   │
│  /api/stripe    │
│  /api/verify    │
└────┬───────┬────┘
     │       │
     ↓       ↓
┌─────────┐  ┌──────────┐
│ MongoDB │  │  Stripe  │
│         │  │  Payment │
│ - Users │  │  Gateway │
│ - Trans │  └──────────┘
│ - Verify│
└─────────┘
```

## 🛠️ Installation & Setup

### Prerequisites

- Node.js 18+
- MongoDB (local or MongoDB Atlas)
- Stripe account
- Gemini API key

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your credentials
nano .env
```

**Configure `.env` file:**
```env
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:5173

MONGODB_URI=mongodb://localhost:27017/verifact-ai
JWT_SECRET=your-secure-random-string-here

STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_STANDARD_MONTHLY_PRICE_ID=price_...
STRIPE_PRO_MONTHLY_PRICE_ID=price_...
STRIPE_TEAM_MONTHLY_PRICE_ID=price_...
```

**Start backend server:**
```bash
npm run dev
```

Backend will run on `http://localhost:3001`

### 2. Stripe Setup

#### A. Create Products & Prices

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Navigate to **Products** → **Add Product**
3. Create 3 products:

**Standard Plan**
- Name: "Standard Plan"
- Price: $5.00/month (recurring)
- Copy the Price ID → Add to `.env` as `STRIPE_STANDARD_MONTHLY_PRICE_ID`

**Pro Plan**
- Name: "Pro Plan"
- Price: $185.00/month (recurring)
- Copy Price ID → `STRIPE_PRO_MONTHLY_PRICE_ID`

**Team Plan**
- Name: "Team Plan"
- Price: $285.00/month (recurring)
- Copy Price ID → `STRIPE_TEAM_MONTHLY_PRICE_ID`

#### B. Configure Webhook

1. Go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Endpoint URL: `http://localhost:3001/api/stripe/webhook`
   - For production: `https://yourdomain.com/api/stripe/webhook`
4. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
5. Copy **Signing secret** → Add to `.env` as `STRIPE_WEBHOOK_SECRET`

### 3. MongoDB Setup

#### Option A: Local MongoDB
```bash
# Install MongoDB (macOS)
brew install mongodb-community

# Start MongoDB
brew services start mongodb-community

# Connection string
MONGODB_URI=mongodb://localhost:27017/verifact-ai
```

#### Option B: MongoDB Atlas (Cloud)
1. Create account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create cluster
3. Get connection string
4. Add to `.env`:
```env
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/verifact-ai
```

### 4. Frontend Setup

```bash
# In root directory
npm install

# Copy environment template
cp .env.example .env.local

# Edit .env.local
nano .env.local
```

**Configure `.env.local`:**
```env
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_API_URL=http://localhost:3001
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

**Start frontend:**
```bash
npm run dev
```

Frontend will run on `http://localhost:5173`

## 📡 API Endpoints

### Authentication

- `POST /api/auth/signup` - Create account (get 10 free credits)
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get user profile
- `PUT /api/auth/profile` - Update profile
- `POST /api/auth/logout` - Logout

### Credits

- `GET /api/credits/balance` - Get credit balance
- `POST /api/credits/check` - Check if enough credits
- `POST /api/credits/deduct` - Deduct credits
- `GET /api/credits/transactions` - Transaction history
- `GET /api/credits/stats` - Credit statistics

### Payments (Stripe)

- `GET /api/stripe/pricing` - Get pricing info
- `POST /api/stripe/create-checkout-session` - Create payment session
- `POST /api/stripe/webhook` - Stripe webhook handler
- `POST /api/stripe/cancel-subscription` - Cancel subscription

### Verification

- `POST /api/verification/start` - Start verification
- `PUT /api/verification/:id` - Update verification
- `GET /api/verification/:id` - Get verification details
- `GET /api/verification` - Get verification history

## 💳 Credit Pricing Model

### How Credits Work

1. **Per-Claim Pricing**: Each verified claim costs 1 credit
2. **Dynamic Pricing**: Articles with more claims cost more credits
3. **Pre-Check**: System checks credit balance before verification
4. **Post-Deduction**: Credits deducted after successful verification

### Example Costs

| Article Length | Estimated Claims | Credits Needed |
|----------------|------------------|----------------|
| Short (500w)   | 2-5 claims       | 2-5 credits    |
| Medium (1500w) | 8-15 claims      | 8-15 credits   |
| Long (3000w+)  | 20-40 claims     | 20-40 credits  |

### Subscription Value

| Plan     | Monthly Price | Credits | Cost per Credit |
|----------|---------------|---------|-----------------|
| Standard | $5            | 100     | $0.05           |
| Pro      | $185          | 750     | $0.25           |
| Team     | $285          | 1250    | $0.23           |

## 🔐 Security Features

- **Password Hashing**: bcryptjs with salt rounds
- **JWT Authentication**: Secure token-based auth
- **Stripe Webhook Validation**: Signature verification
- **CORS**: Configured for frontend-backend security
- **Helmet.js**: Security headers
- **Rate Limiting**: Planned (express-rate-limit)

## 🧪 Testing

### Manual Testing Flow

1. **Signup**: Create account → Verify 10 free credits
2. **Login**: Sign in → Check dashboard shows credits
3. **Verification**: Upload article → Check credit deduction
4. **Insufficient Credits**: Try verifying without credits → See modal
5. **Purchase**: Click "Buy Credits" → Complete Stripe checkout
6. **Verify Purchase**: Check credits added to balance

### Test Credit Cards (Stripe)

```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
3D Secure: 4000 0025 0000 3155
```

## 📊 Database Schema

### Users Collection
```javascript
{
  email: String,
  password: String (hashed),
  name: String,
  credits: Number,
  subscription: {
    type: String, // 'free', 'standard', 'pro', 'team'
    stripeCustomerId: String,
    stripeSubscriptionId: String,
    status: String,
    monthlyCredits: Number,
    creditsResetDate: Date
  },
  verificationsCount: Number,
  claimsVerifiedCount: Number,
  createdAt: Date
}
```

### Transactions Collection
```javascript
{
  userId: ObjectId,
  type: String, // 'purchase', 'subscription', 'deduction', 'refund'
  amount: Number, // Money spent (USD)
  credits: Number, // Credits added/removed
  balanceBefore: Number,
  balanceAfter: Number,
  description: String,
  metadata: Object,
  status: String,
  createdAt: Date
}
```

### Verifications Collection
```javascript
{
  userId: ObjectId,
  articleName: String,
  articleText: String,
  claims: Array,
  claimsCount: Number,
  creditsUsed: Number,
  overallConfidence: Number,
  status: String,
  createdAt: Date
}
```

## 🚀 Deployment

### Backend Deployment (Heroku/Railway/Render)

```bash
# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set MONGODB_URI=mongodb+srv://...
heroku config:set JWT_SECRET=...
heroku config:set STRIPE_SECRET_KEY=sk_live_...

# Deploy
git push heroku main
```

### Frontend Deployment (Vercel/Netlify)

```bash
# Build
npm run build

# Deploy (Vercel)
vercel deploy
```

**Update environment variables in hosting platform:**
- `VITE_API_URL=https://your-backend-url.com`
- `VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...`

## 📝 TODO / Future Enhancements

- [ ] Email notifications for low credits
- [ ] Promo codes / discount system
- [ ] Team member management
- [ ] Usage analytics dashboard
- [ ] Credit gifting / referral program
- [ ] Annual billing discount codes
- [ ] Webhook retry logic
- [ ] Admin dashboard
- [ ] Rate limiting per user tier
- [ ] Credit expiration policies

## 🐛 Troubleshooting

### "MongoDB connection failed"
- Check MongoDB is running: `brew services list`
- Verify connection string in `.env`
- Check firewall/network access for MongoDB Atlas

### "Stripe webhook not working"
- Use Stripe CLI for local testing: `stripe listen --forward-to localhost:3001/api/stripe/webhook`
- Verify webhook secret matches
- Check endpoint URL is publicly accessible

### "Credits not deducting"
- Check user authentication (valid JWT token)
- Verify MongoDB transaction completed
- Check browser console for API errors

## 📞 Support

For issues or questions:
- GitHub Issues: [Repository Link]
- Email: support@verifact.ai
- Documentation: [Docs Link]

---

**Built with:** React, Node.js, Express, MongoDB, Stripe, Google Gemini AI
