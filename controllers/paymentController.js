// Payment Controller for Stripe integration
import stripe from '../config/stripe.js';
import User from '../models/User.js';
import Course from '../models/Course.js';

// Create a Stripe Checkout Session for course purchase
export const createCheckoutSession = async (req, res) => {
  try {
    const { courseId } = req.body;
    const course = await Course.findById(courseId);
    if (!course || course.price <= 0) {
      return res.status(400).json({ error: 'Invalid course or price' });
    }
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: course.title,
              description: course.description,
            },
            unit_amount: Math.round(course.price * 100),
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.CLIENT_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/payment-cancelled`,
      metadata: {
        courseId: course._id.toString(),
        tutorId: course.tutor.toString(),
        buyerId: req.user._id.toString(),
      },
    });
    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create a Stripe Subscription (for premium features)
export const createSubscription = async (req, res) => {
  try {
    const { priceId } = req.body; // Stripe price ID for subscription
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    // Create customer if not exists
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.fullName,
      });
      user.stripeCustomerId = customer.id;
      await user.save();
      customerId = customer.id;
    }
    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
    });
    res.json(subscription);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create a Stripe payout for tutors (requires Stripe Connect)
export const createPayout = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user || !user.stripeAccountId) {
      return res.status(400).json({ error: 'No Stripe account linked' });
    }
    const { amount } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid payout amount' });
    }
    const payout = await stripe.payouts.create({
      amount: Math.round(amount * 100),
      currency: 'usd',
      destination: user.stripeAccountId,
    });
    res.json(payout);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Stripe webhook handler
export const stripeWebhook = async (req, res) => {
  let event = req.body;
  const sig = req.headers['stripe-signature'];
  try {
    if (process.env.STRIPE_WEBHOOK_SECRET) {
      event = stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
    }
    // Handle event types
    switch (event.type) {
      case 'checkout.session.completed':
        // TODO: Mark course as purchased, notify tutor, etc.
        break;
      case 'invoice.payment_succeeded':
        // TODO: Handle subscription payment
        break;
      // Add more event types as needed
      default:
        break;
    }
    res.json({ received: true });
  } catch (err) {
    res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }
};
