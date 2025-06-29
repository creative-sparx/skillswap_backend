# 🚀 SKILLSWAP BACKEND - PRODUCTION DEPLOYMENT GUIDE

## 📋 PRE-DEPLOYMENT CHECKLIST

### ✅ Environment Setup
- [x] NODE_ENV=production configured
- [x] MongoDB Atlas production database ready
- [x] Flutterwave production keys obtained
- [x] Email service provider configured
- [x] Logging service setup (Winston + external)

### ✅ Security Configuration
- [x] JWT secrets generated and secured
- [x] API rate limiting implemented
- [x] CORS origins restricted to production domains
- [x] Input validation and sanitization verified
- [x] Error logging without sensitive data exposure

---

## 🔧 STEP 1: RENDER DEPLOYMENT

### 1.1 Connect Repository
```bash
# Ensure your code is committed and pushed to GitHub
git add .
git commit -m "Production-ready subscription system with full testing"
git push origin main
```

### 1.2 Deploy to Render
1. **Go to [Render Dashboard](https://dashboard.render.com)**
2. **Click "New +" → "Web Service"**
3. **Connect your GitHub repository**
4. **Configure deployment:**
   - **Name:** `skillswap-backend`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** `Starter` (for production traffic)

### 1.3 Environment Variables Configuration
```bash
# Required Production Environment Variables:
NODE_ENV=production
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/skillswap?retryWrites=true&w=majority

# Security
JWT_SECRET=[generate-strong-random-secret]

# Payment Gateway (PRODUCTION KEYS)
FLUTTERWAVE_PUBLIC_KEY=[your-production-public-key]
FLUTTERWAVE_SECRET_KEY=[your-production-secret-key]
FLUTTERWAVE_ENCRYPTION_KEY=[your-production-encryption-key]

# AI Service
GEMINI_API_KEY=[your-gemini-api-key]

# File Upload
CLOUDINARY_CLOUD_NAME=[your-cloudinary-name]
CLOUDINARY_API_KEY=[your-cloudinary-key]
CLOUDINARY_API_SECRET=[your-cloudinary-secret]

# Firebase
FIREBASE_PROJECT_ID=[your-firebase-project]
FIREBASE_CLIENT_EMAIL=[your-firebase-email]
FIREBASE_PRIVATE_KEY=[your-firebase-private-key]

# Notifications
EMAIL_SERVICE_API_KEY=[your-email-service-key]
SMS_SERVICE_API_KEY=[your-sms-service-key]
```

---

## 💳 STEP 2: FLUTTERWAVE PRODUCTION SETUP

### 2.1 Production Keys Configuration
1. **Login to [Flutterwave Dashboard](https://dashboard.flutterwave.com)**
2. **Switch to Live Environment**
3. **Get Production Keys:**
   - Public Key: `FLWPUBK-xxx-X`
   - Secret Key: `FLWSECK-xxx-X`
   - Encryption Key: `xxx`

### 2.2 Webhook Configuration
```bash
# Webhook URL: https://your-app.onrender.com/api/webhooks/flutterwave
# Webhook Events:
# - charge.completed
# - transfer.completed
# - payment.failed
```

### 2.3 Test Production Payment
```javascript
// Test script for production payment validation
const testPayment = {
  amount: 100, // ₦1 test payment
  currency: 'NGN',
  email: 'test@yourapp.com',
  tx_ref: 'TEST_' + Date.now()
};
```

---

## 📧 STEP 3: NOTIFICATION SERVICES SETUP

### 3.1 Email Service (Recommended: SendGrid)
```bash
# Install SendGrid
npm install @sendgrid/mail

# Environment Variables
SENDGRID_API_KEY=[your-sendgrid-api-key]
FROM_EMAIL=noreply@skillswap.com
```

### 3.2 SMS Service (Recommended: Twilio)
```bash
# Install Twilio
npm install twilio

# Environment Variables
TWILIO_ACCOUNT_SID=[your-twilio-sid]
TWILIO_AUTH_TOKEN=[your-twilio-token]
TWILIO_PHONE_NUMBER=[your-twilio-number]
```

---

## 📊 STEP 4: MONITORING & LOGGING

### 4.1 Application Monitoring (Sentry)
```bash
# Install Sentry
npm install @sentry/node @sentry/tracing

# Environment Variables
SENTRY_DSN=[your-sentry-dsn]
```

### 4.2 Analytics Integration
```bash
# Environment Variables
MIXPANEL_TOKEN=[your-mixpanel-token]
GOOGLE_ANALYTICS_ID=[your-ga-id]
```

---

## 🔍 STEP 5: HEALTH CHECKS & VALIDATION

### 5.1 Health Check Endpoint
```javascript
// Add to your Express app
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
    environment: process.env.NODE_ENV
  });
});
```

### 5.2 Production Validation Tests
```bash
# Test API endpoints
curl https://your-app.onrender.com/health
curl https://your-app.onrender.com/api/subscriptions/plans

# Test payment processing
curl -X POST https://your-app.onrender.com/api/subscriptions/initiate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [jwt-token]" \
  -d '{"planId": "test-plan-id"}'
```

---

## 📋 POST-DEPLOYMENT CHECKLIST

### ✅ Immediate Verification
- [ ] Backend service responding on Render URL
- [ ] Database connection successful
- [ ] Payment gateway responding to test transactions
- [ ] Email notifications sending successfully
- [ ] Auto-renewal cron jobs running
- [ ] Error logging working correctly

### ✅ Performance Monitoring
- [ ] Response times under 500ms
- [ ] Memory usage stable
- [ ] No memory leaks detected
- [ ] Database query performance optimized

### ✅ Security Verification
- [ ] HTTPS enforced
- [ ] API rate limiting active
- [ ] No sensitive data in logs
- [ ] Authentication working correctly

---

## 🚨 ROLLBACK PLAN

### If Issues Occur:
1. **Immediate:** Revert to previous stable deployment
2. **Notify:** Alert development team and stakeholders
3. **Investigate:** Check logs and error tracking
4. **Fix:** Address issues in development environment
5. **Re-deploy:** Only after thorough testing

### Emergency Contacts:
- **DevOps:** [your-contact]
- **Backend Lead:** [your-contact]
- **Payment Issues:** Flutterwave Support

---

## 🎯 SUCCESS METRICS

### Key Performance Indicators:
- **Uptime:** > 99.9%
- **Response Time:** < 500ms average
- **Payment Success Rate:** > 95%
- **Auto-renewal Success:** > 90%
- **Error Rate:** < 1%

**Deployment Status:** ⏳ Ready for Production
