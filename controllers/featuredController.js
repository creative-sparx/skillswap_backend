import Featured from '../models/Featured.js';
import User from '../models/User.js';
import Course from '../models/Course.js';
import { validationResult } from 'express-validator';

// Get all featured items (public)
const getFeaturedItems = async (req, res) => {
  try {
    const { type, limit = 10, targetAudience } = req.query;
    
    const query = {
      isActive: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() }
    };
    
    if (type && ['tutor', 'course'].includes(type)) {
      query.itemType = type;
    }
    
    if (targetAudience && ['all', 'beginners', 'intermediate', 'advanced'].includes(targetAudience)) {
      query.targetAudience = targetAudience;
    }
    
    const featured = await Featured.find(query)
      .sort({ priority: -1, createdAt: -1 })
      .limit(parseInt(limit))
      .populate({
        path: 'item',
        populate: type === 'course' ? { path: 'instructor', select: 'name profileImage' } : {}
      })
      .populate('createdBy', 'name email');
    
    // Increment view counts
    await Promise.all(featured.map(item => item.incrementViews()));
    
    res.json({
      success: true,
      data: featured,
      total: featured.length
    });
  } catch (error) {
    console.error('Get featured items error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch featured items',
      error: error.message
    });
  }
};

// Get featured item by ID (public)
const getFeaturedItem = async (req, res) => {
  try {
    const { id } = req.params;
    
    const featured = await Featured.findById(id)
      .populate({
        path: 'item',
        populate: { path: 'instructor', select: 'name profileImage email' }
      })
      .populate('createdBy', 'name email');
    
    if (!featured) {
      return res.status(404).json({
        success: false,
        message: 'Featured item not found'
      });
    }
    
    if (!featured.isCurrentlyActive()) {
      return res.status(404).json({
        success: false,
        message: 'Featured item is not currently active'
      });
    }
    
    // Increment view count
    await featured.incrementViews();
    
    res.json({
      success: true,
      data: featured
    });
  } catch (error) {
    console.error('Get featured item error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch featured item',
      error: error.message
    });
  }
};

// Track featured item click (public)
const trackFeaturedClick = async (req, res) => {
  try {
    const { id } = req.params;
    
    const featured = await Featured.findById(id);
    
    if (!featured) {
      return res.status(404).json({
        success: false,
        message: 'Featured item not found'
      });
    }
    
    await featured.incrementClicks();
    
    res.json({
      success: true,
      message: 'Click tracked successfully'
    });
  } catch (error) {
    console.error('Track click error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track click',
      error: error.message
    });
  }
};

// Admin: Get all featured items (including inactive)
const getAllFeaturedItems = async (req, res) => {
  try {
    const { page = 1, limit = 20, type, status } = req.query;
    
    const query = {};
    
    if (type && ['tutor', 'course'].includes(type)) {
      query.itemType = type;
    }
    
    if (status === 'active') {
      query.isActive = true;
      query.startDate = { $lte: new Date() };
      query.endDate = { $gte: new Date() };
    } else if (status === 'inactive') {
      query.$or = [
        { isActive: false },
        { endDate: { $lt: new Date() } }
      ];
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [featured, total] = await Promise.all([
      Featured.find(query)
        .sort({ priority: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate({
          path: 'item',
          populate: { path: 'instructor', select: 'name profileImage' }
        })
        .populate('createdBy', 'name email'),
      Featured.countDocuments(query)
    ]);
    
    res.json({
      success: true,
      data: featured,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get all featured items error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch featured items',
      error: error.message
    });
  }
};

// Admin: Create featured item
const createFeaturedItem = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    
    const {
      itemId,
      title,
      description,
      bannerImage,
      priority = 0,
      startDate,
      endDate,
      tags = [],
      targetAudience = 'all'
    } = req.body;
    
    // Verify the item exists
    const [tutor, course] = await Promise.all([
      User.findById(itemId),
      Course.findById(itemId)
    ]);
    
    if (!tutor && !course) {
      return res.status(404).json({
        success: false,
        message: 'Referenced item not found'
      });
    }
    
    const itemType = tutor ? 'tutor' : 'course';
    
    const featured = new Featured({
      itemType,
      itemId,
      title,
      description,
      bannerImage,
      priority,
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: new Date(endDate),
      createdBy: req.user.id,
      tags,
      targetAudience
    });
    
    await featured.save();
    
    await featured.populate([
      {
        path: 'item',
        populate: { path: 'instructor', select: 'name profileImage' }
      },
      { path: 'createdBy', select: 'name email' }
    ]);
    
    res.status(201).json({
      success: true,
      message: 'Featured item created successfully',
      data: featured
    });
  } catch (error) {
    console.error('Create featured item error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create featured item',
      error: error.message
    });
  }
};

// Admin: Update featured item
const updateFeaturedItem = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    
    const { id } = req.params;
    const updates = req.body;
    
    // Remove fields that shouldn't be updated directly
    delete updates.analytics;
    delete updates.createdBy;
    delete updates.itemType; // This is set automatically
    
    const featured = await Featured.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    ).populate([
      {
        path: 'item',
        populate: { path: 'instructor', select: 'name profileImage' }
      },
      { path: 'createdBy', select: 'name email' }
    ]);
    
    if (!featured) {
      return res.status(404).json({
        success: false,
        message: 'Featured item not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Featured item updated successfully',
      data: featured
    });
  } catch (error) {
    console.error('Update featured item error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update featured item',
      error: error.message
    });
  }
};

// Admin: Delete featured item
const deleteFeaturedItem = async (req, res) => {
  try {
    const { id } = req.params;
    
    const featured = await Featured.findByIdAndDelete(id);
    
    if (!featured) {
      return res.status(404).json({
        success: false,
        message: 'Featured item not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Featured item deleted successfully'
    });
  } catch (error) {
    console.error('Delete featured item error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete featured item',
      error: error.message
    });
  }
};

// Admin: Toggle featured item status
const toggleFeaturedStatus = async (req, res) => {
  try {
    const { id } = req.params;
    
    const featured = await Featured.findById(id);
    
    if (!featured) {
      return res.status(404).json({
        success: false,
        message: 'Featured item not found'
      });
    }
    
    featured.isActive = !featured.isActive;
    await featured.save();
    
    await featured.populate([
      {
        path: 'item',
        populate: { path: 'instructor', select: 'name profileImage' }
      },
      { path: 'createdBy', select: 'name email' }
    ]);
    
    res.json({
      success: true,
      message: `Featured item ${featured.isActive ? 'activated' : 'deactivated'} successfully`,
      data: featured
    });
  } catch (error) {
    console.error('Toggle featured status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle featured status',
      error: error.message
    });
  }
};

// Admin: Get featured analytics
const getFeaturedAnalytics = async (req, res) => {
  try {
    const { id } = req.params;
    const { period = '7d' } = req.query;
    
    const featured = await Featured.findById(id)
      .populate('item', 'title name')
      .populate('createdBy', 'name email');
    
    if (!featured) {
      return res.status(404).json({
        success: false,
        message: 'Featured item not found'
      });
    }
    
    // Calculate CTR (Click-Through Rate)
    const ctr = featured.analytics.views > 0 
      ? ((featured.analytics.clicks / featured.analytics.views) * 100).toFixed(2)
      : 0;
    
    // Calculate conversion rate
    const conversionRate = featured.analytics.clicks > 0
      ? ((featured.analytics.conversions / featured.analytics.clicks) * 100).toFixed(2)
      : 0;
    
    const analytics = {
      ...featured.analytics.toObject(),
      ctr: `${ctr}%`,
      conversionRate: `${conversionRate}%`,
      isActive: featured.isCurrentlyActive(),
      daysRemaining: Math.max(0, Math.ceil((featured.endDate - new Date()) / (1000 * 60 * 60 * 24)))
    };
    
    res.json({
      success: true,
      data: {
        featured: {
          id: featured._id,
          title: featured.title,
          itemType: featured.itemType,
          item: featured.item,
          createdBy: featured.createdBy,
          startDate: featured.startDate,
          endDate: featured.endDate,
          priority: featured.priority
        },
        analytics
      }
    });
  } catch (error) {
    console.error('Get featured analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics',
      error: error.message
    });
  }
};

export {
  getFeaturedItems,
  getFeaturedItem,
  trackFeaturedClick,
  getAllFeaturedItems,
  createFeaturedItem,
  updateFeaturedItem,
  deleteFeaturedItem,
  toggleFeaturedStatus,
  getFeaturedAnalytics
};
