import SubscriptionPlan from '../models/SubscriptionPlan.js';

/**
 * Get all active subscription plans
 * GET /api/subscription-plans
 */
export const getAllPlans = async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find({ isActive: true }).sort({ price: 1 });
    res.json({ plans });
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

/**
 * Create a new subscription plan (Admin)
 * POST /api/subscription-plans
 */
export const createPlan = async (req, res) => {
  try {
    const { name, price, currency, billingInterval, features } = req.body;
    const plan = new SubscriptionPlan({ name, price, currency, billingInterval, features });
    await plan.save();
    res.status(201).json({ message: 'Subscription plan created', plan });
  } catch (error) {
    console.error('Error creating plan:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

/**
 * Update an existing plan (Admin)
 * PUT /api/subscription-plans/:id
 */
export const updatePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const plan = await SubscriptionPlan.findByIdAndUpdate(id, updates, { new: true });
    if (!plan) return res.status(404).json({ message: 'Plan not found' });
    res.json({ message: 'Subscription plan updated', plan });
  } catch (error) {
    console.error('Error updating plan:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

/**
 * Deactivate a plan (Admin)
 * DELETE /api/subscription-plans/:id
 */
export const deletePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const plan = await SubscriptionPlan.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!plan) return res.status(404).json({ message: 'Plan not found' });
    res.json({ message: 'Subscription plan deactivated' });
  } catch (error) {
    console.error('Error deleting plan:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};