# 🚀 VeriFact AI - Production Deployment Guide

This guide will help you deploy VeriFact AI to a live URL with full credit/pricing system functionality.

**Deployment Stack:**
- Frontend: Vercel (https://vercel.com) - Free
- Backend: Railway (https://railway.app) - Free tier
- Database: MongoDB Atlas (https://mongodb.com/cloud/atlas) - Free 512MB
- Payments: Stripe (https://stripe.com) - Test mode (free)

**Estimated Time:** 15-20 minutes

---

## 📋 Prerequisites

You'll need accounts for:
1. ✅ GitHub account (you already have this)
2. Vercel account (sign up with GitHub)
3. Railway account (sign up with GitHub)
4. MongoDB Atlas account
5. Stripe account

---

## STEP 1: Set Up MongoDB Atlas (Database)

### 1.1 Create MongoDB Account
1. Go to https://www.mongodb.com/cloud/atlas/register
2. Click **"Sign up"** (use Google/GitHub for quick signup)
3. Choose **"Shared"** (Free tier - $0/month)

### 1.2 Create Cluster
1. After signup, you'll see **"Create a deployment"**
2. Select **"M0 FREE"** tier
3. Choose a cloud provider (AWS recommended)
4. Choose region closest to you
5. Cluster name: `verifact-ai`
6. Click **"Create"**
7. Wait 1-3 minutes for cluster to provision

### 1.3 Create Database User
1. Click **"Database Access"** (left sidebar)
2. Click **"Add New Database User"**
3. Choose **"Password"** authentication
4. Username: `verifact-admin`
5. Click **"Autogenerate Secure Password"** → **COPY THIS PASSWORD**
6. Database User Privileges: **"Read and write to any database"**
7. Click **"Add User"**

### 1.4 Configure Network Access
1. Click **"Network Access"** (left sidebar)
2. Click **"Add IP Address"**
3. Click **"Allow Access from Anywhere"** (0.0.0.0/0)
   - Note: For production, restrict to specific IPs
4. Click **"Confirm"**

### 1.5 Get Connection String
1. Click **"Database"** (left sidebar)
2. Click **"Connect"** on your cluster
3. Choose **"Connect your application"**
4. Driver: **Node.js**, Version: **5.5 or later**
5. Copy the connection string - looks like:
   ```
   mongodb+srv://verifact-admin:<password>@verifact-ai.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
6. Replace `<password>` with the password you copied in step 1.3
7. Add database name before the `?`:
   ```
   mongodb+srv://verifact-admin:YOUR_PASSWORD@verifact-ai.xxxxx.mongodb.net/verifact-ai?retryWrites=true&w=majority
   ```

**Save this connection string - you'll need it for Railway!**

---

## STEP 2: Set Up Stripe (Payments)

### 2.1 Create Stripe Account
1. Go to https://dashboard.stripe.com/register
2. Sign up (use email or Google)
3. Complete business information (can use personal info for testing)

### 2.2 Get API Keys
1. Go to https://dashboard.stripe.com/test/apikeys
2. You'll see two keys:
   - **Publishable key**: `pk_test_...` → Copy this
   - **Secret key**: Click **"Reveal test key"** → `sk_test_...` → Copy this

**Save both keys!**

### 2.3 Create Products & Prices

#### Create Standard Plan
1. Go to https://dashboard.stripe.com/test/products
2. Click **"Add product"**
3. Name: `Standard Plan`
4. Description: `100 verification credits per month`
5. Pricing model: **"Standard pricing"**
6. Price: `$5.00`
7. Billing period: **"Monthly"**
8. Click **"Save product"**
9. **COPY THE PRICE ID** - looks like `price_xxxxxxxxxxxxx`

#### Create Pro Plan
1. Click **"Add product"**
2. Name: `Pro Plan`
3. Description: `750 verification credits per month`
4. Price: `$185.00`
5. Billing period: **"Monthly"**
6. Click **"Save product"**
7. **COPY THE PRICE ID**

#### Create Team Plan
1. Click **"Add product"**
2. Name: `Team Plan`
3. Description: `1250 verification credits per month`
4. Price: `$285.00`
5. Billing period: **"Monthly"**
6. Click **"Save product"**
7. **COPY THE PRICE ID**

**Save all three Price IDs!**

### 2.4 Create Annual Pricing (Optional)
Repeat above for annual pricing with 15% discount:
- Standard Annual: $51/year (save $9)
- Pro Annual: $1,887/year (save $333)
- Team Annual: $2,907/year (save $513)

**For now, you can skip annual pricing and just use monthly.**

---

## STEP 3: Deploy Backend to Railway

### 3.1 Create Railway Account
1. Go to https://railway.app
2. Click **"Login"** → **"Login with GitHub"**
3. Authorize Railway

### 3.2 Create New Project
1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. If prompted, install Railway GitHub app
4. Select your repository: `laurentlaboise/verifact-ai`
5. Railway will detect the repository

### 3.3 Configure Deployment
1. Click **"Add variables"** or **"Variables"** tab
2. Click **"RAW Editor"**
3. Paste the following (replace with your actual values):

```env
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://verifact-ai.vercel.app

MONGODB_URI=mongodb+srv://verifact-admin:YOUR_PASSWORD@verifact-ai.xxxxx.mongodb.net/verifact-ai?retryWrites=true&w=majority

JWT_SECRET=YOUR_SUPER_SECRET_RANDOM_STRING_HERE_CHANGE_THIS

STRIPE_SECRET_KEY=sk_test_YOUR_STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET=whsec_LEAVE_BLANK_FOR_NOW

STRIPE_STANDARD_MONTHLY_PRICE_ID=price_YOUR_STANDARD_PRICE_ID
STRIPE_PRO_MONTHLY_PRICE_ID=price_YOUR_PRO_PRICE_ID
STRIPE_TEAM_MONTHLY_PRICE_ID=price_YOUR_TEAM_PRICE_ID

STRIPE_STANDARD_ANNUAL_PRICE_ID=price_OPTIONAL
STRIPE_PRO_ANNUAL_PRICE_ID=price_OPTIONAL
STRIPE_TEAM_ANNUAL_PRICE_ID=price_OPTIONAL
```

**Important Replacements:**
- `YOUR_PASSWORD` - MongoDB password from Step 1.3
- `JWT_SECRET` - Generate a random string (32+ characters) or use: `openssl rand -base64 32`
- `sk_test_YOUR_STRIPE_SECRET_KEY` - Stripe secret key from Step 2.2
- `price_YOUR_*_PRICE_ID` - Stripe price IDs from Step 2.3

### 3.4 Set Root Directory
1. Click **"Settings"** tab
2. Find **"Root Directory"**
3. Set to: `backend`
4. Click **"Update"**

### 3.5 Set Start Command
1. In **"Settings"** → **"Deploy"**
2. Find **"Custom Start Command"**
3. Set to: `node server.js`
4. Click **"Update"**

### 3.6 Deploy
1. Click **"Deployments"** tab
2. Click **"Deploy"**
3. Wait 2-3 minutes for deployment
4. Once deployed, click **"Settings"** → **"Networking"**
5. Click **"Generate Domain"**
6. **COPY YOUR BACKEND URL** - looks like:
   ```
   https://verifact-ai-production-xxxx.up.railway.app
   ```

**Test it:** Open `https://your-backend-url.railway.app/health` in browser
- Should see: `{"status":"healthy",...}`

---

## STEP 4: Configure Stripe Webhook

### 4.1 Create Webhook Endpoint
1. Go to https://dashboard.stripe.com/test/webhooks
2. Click **"Add endpoint"**
3. Endpoint URL: `https://your-backend-url.railway.app/api/stripe/webhook`
   - Replace with your actual Railway URL from Step 3.6
4. Description: `VeriFact AI Credit System`
5. Click **"Select events"**
6. Check these events:
   - ✅ `checkout.session.completed`
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.paid`
   - ✅ `invoice.payment_failed`
7. Click **"Add events"**
8. Click **"Add endpoint"**

### 4.2 Get Webhook Secret
1. Click on the webhook you just created
2. Under **"Signing secret"**, click **"Reveal"**
3. Copy the secret - looks like `whsec_xxxxxxxxxxxxx`

### 4.3 Update Railway Environment
1. Go back to Railway dashboard
2. Click **"Variables"**
3. Find `STRIPE_WEBHOOK_SECRET`
4. Replace `whsec_LEAVE_BLANK_FOR_NOW` with your actual webhook secret
5. Click **"Update variables"**
6. Railway will automatically redeploy

---

## STEP 5: Deploy Frontend to Vercel

### 5.1 Create Vercel Account
1. Go to https://vercel.com/signup
2. Click **"Continue with GitHub"**
3. Authorize Vercel

### 5.2 Import Project
1. Click **"Add New..."** → **"Project"**
2. Find your repository: `laurentlaboise/verifact-ai`
3. Click **"Import"**

### 5.3 Configure Project
1. **Framework Preset**: Vite (should auto-detect)
2. **Root Directory**: `.` (leave as root)
3. **Build Command**: `npm run build`
4. **Output Directory**: `dist`

### 5.4 Add Environment Variables
Click **"Environment Variables"** and add:

| Name | Value |
|------|-------|
| `VITE_GEMINI_API_KEY` | Your Gemini API key |
| `VITE_API_URL` | `https://your-backend-url.railway.app` |
| `VITE_STRIPE_PUBLISHABLE_KEY` | `pk_test_...` from Stripe |

**Where to get Gemini API key:**
1. Go to https://aistudio.google.com/app/apikey
2. Click **"Create API key"**
3. Copy the key

### 5.5 Deploy
1. Click **"Deploy"**
2. Wait 2-3 minutes
3. Once deployed, Vercel will show your live URL:
   ```
   https://verifact-ai.vercel.app
   ```
   (or similar)

**Your app is now live! 🎉**

---

## STEP 6: Update CORS Configuration

### 6.1 Update Backend CORS
Go back to Railway:
1. Click **"Variables"**
2. Update `FRONTEND_URL` to your actual Vercel URL:
   ```
   FRONTEND_URL=https://verifact-ai.vercel.app
   ```
3. Click **"Update"**
4. Backend will redeploy (takes 1-2 minutes)

---

## STEP 7: Test Your Live Application

### 7.1 Test Signup Flow
1. Open your Vercel URL: `https://verifact-ai.vercel.app`
2. Click **"Login"** (top right)
3. Click **"Don't have an account? Sign up"**
4. Create account:
   - Name: Test User
   - Email: test@example.com
   - Password: testpassword123
5. You should see: **"10 credits"** badge (top right)

### 7.2 Test Verification
1. Click **"Paste Text"** tab
2. Paste a short article (50-100 words)
3. Click **"START VERIFICATION"**
4. Wait for claims to extract and verify
5. Check that credits decreased (e.g., 10 → 7 if 3 claims)

### 7.3 Test Credit Purchase
1. Use up remaining credits by verifying more articles
2. When credits reach 0, you'll see **"Insufficient Credits"** modal
3. Click **"Buy Credits"** button
4. Pricing modal should appear with 3 tiers
5. Click **"Upgrade to Standard"**
6. Stripe checkout page should open
7. Use test card: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., 12/28)
   - CVC: Any 3 digits (e.g., 123)
   - ZIP: Any 5 digits (e.g., 12345)
8. Complete payment
9. You should be redirected back
10. Credit balance should show **100 credits**

---

## 🎉 SUCCESS! Your App is Live

**Frontend URL:** `https://verifact-ai.vercel.app` (or your custom domain)
**Backend URL:** `https://your-backend-url.railway.app`

### What's Working:
✅ User authentication (signup/login)
✅ 10 free credits on signup
✅ Fact verification with credit deduction
✅ Pricing modal with 3 subscription tiers
✅ Stripe payment processing
✅ Credit balance tracking
✅ Transaction history (backend)

---

## 🔧 Troubleshooting

### Frontend shows "Network Error"
- Check that `VITE_API_URL` in Vercel matches your Railway URL
- Check Railway logs: Railway Dashboard → Logs

### "MongoDB connection failed"
- Verify MongoDB Atlas connection string in Railway variables
- Check MongoDB Atlas Network Access allows `0.0.0.0/0`
- Check MongoDB Atlas Database User exists

### Stripe payments not working
- Verify Stripe webhook secret is correct in Railway
- Check webhook endpoint URL matches Railway backend URL
- Go to Stripe Dashboard → Webhooks → View logs

### Credits not deducting
- Check browser console for errors (F12)
- Verify JWT token is being sent (Network tab)
- Check Railway backend logs

---

## 🚀 Next Steps

### Custom Domain (Optional)
1. **Vercel**: Settings → Domains → Add your domain
2. **Railway**: Settings → Networking → Custom domain

### Switch to Production Stripe
1. In Stripe Dashboard, toggle to **"Live mode"**
2. Create products again in live mode
3. Get live API keys (`pk_live_...`, `sk_live_...`)
4. Update Railway variables with live keys
5. Update Vercel variable with live publishable key
6. Update webhook endpoint in live mode

### Enable Email Notifications
- Add SendGrid or similar email service
- Configure SMTP in Railway variables

---

## 📞 Support

If you encounter issues:
1. Check Railway logs for backend errors
2. Check browser console for frontend errors
3. Verify all environment variables are set correctly

**Deployment Complete!** 🎉

Your VeriFact AI app with full credit/pricing system is now live and accessible worldwide.
