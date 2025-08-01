const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Post = require('../models/Post');
const { protect, optionalAuth, validatePostOwnership, rateLimit } = require('../middleware/auth');
const router = express.Router();

// Rate limiting for post creation
const postCreateLimit = rateLimit(10, 60 * 60 * 1000); // 10 posts per hour

// @desc    Get all posts (public access)
// @route   GET /api/posts
// @access  Public
router.get('/', [
  optionalAuth,
  query('type')
    .optional()
    .isIn(['lost', 'found'])
    .withMessage('Type must be either lost or found'),
  query('category')
    .optional()
    .isIn(['Electronics', 'Documents', 'Accessories', 'Books', 'Clothing', 'Bags', 'Keys', 'Jewelry', 'Sports Equipment', 'Other'])
    .withMessage('Invalid category'),
  query('building')
    .optional()
    .trim()
    .withMessage('Building must be a string'),
  query('search')
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage('Search term must be at least 2 characters'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'dateTime', 'priority', 'views'])
    .withMessage('Invalid sort field'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const {
      type,
      category,
      building,
      search,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    let query = { status: 'active' };

    if (type) query.type = type;
    if (category) query.category = category;
    if (building) query['location.building'] = new RegExp(building, 'i');

    let posts;

    if (search) {
      // Use text search if search term provided
      posts = await Post.searchPosts(search, query);
    } else {
      // Regular query
      const sortDirection = sortOrder === 'desc' ? -1 : 1;
      posts = await Post.find(query)
        .populate('user', 'name avatar college department trustScore')
        .sort({ [sortBy]: sortDirection })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .exec();
    }

    // Get total count for pagination
    const total = await Post.countDocuments(query);

    res.json({
      success: true,
      count: posts.length,
      total,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      },
      posts
    });
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching posts'
    });
  }
});

// @desc    Get single post
// @route   GET /api/posts/:id
// @access  Public
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('user', 'name avatar college department trustScore phone')
      .populate('resolvedBy', 'name avatar trustScore')
      .populate('interestedUsers.user', 'name avatar trustScore');

    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post not found'
      });
    }

    // Increment view count if user is different from post owner
    if (!req.user || req.user._id.toString() !== post.user._id.toString()) {
      await post.incrementViews();
    }

    // Hide sensitive information for non-authenticated users
    let sanitizedPost = post.toObject();
    
    if (!req.user) {
      // Remove contact information for guests
      if (sanitizedPost.user && sanitizedPost.user.phone) {
        delete sanitizedPost.user.phone;
      }
      // Hide interested users details
      sanitizedPost.interestedUsers = sanitizedPost.interestedUsers.map(interest => ({
        ...interest,
        message: interest.message ? '[Hidden - Login to view]' : null
      }));
    }

    res.json({
      success: true,
      post: sanitizedPost
    });
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching post'
    });
  }
});

// @desc    Create new post
// @route   POST /api/posts
// @access  Private
router.post('/', [
  protect,
  postCreateLimit,
  body('type')
    .isIn(['lost', 'found'])
    .withMessage('Type must be either lost or found'),
  body('title')
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage('Title must be between 5 and 100 characters'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Description must be between 10 and 1000 characters'),
  body('category')
    .isIn(['Electronics', 'Documents', 'Accessories', 'Books', 'Clothing', 'Bags', 'Keys', 'Jewelry', 'Sports Equipment', 'Other'])
    .withMessage('Please select a valid category'),
  body('location.building')
    .trim()
    .notEmpty()
    .withMessage('Building/Location is required'),
  body('dateTime')
    .isISO8601()
    .withMessage('Please provide a valid date and time'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Invalid priority level'),
  body('color')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Color cannot exceed 50 characters'),
  body('brand')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Brand cannot exceed 50 characters')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    // Check if date is not in the future
    const providedDate = new Date(req.body.dateTime);
    if (providedDate > new Date()) {
      return res.status(400).json({
        success: false,
        error: 'Date and time cannot be in the future'
      });
    }

    // Create post
    const postData = {
      ...req.body,
      user: req.user._id
    };

    const post = await Post.create(postData);

    // Update user statistics
    if (req.body.type === 'lost') {
      req.user.itemsLost += 1;
    } else {
      req.user.itemsFound += 1;
    }
    await req.user.save();

    // Populate and return the created post
    const populatedPost = await Post.findById(post._id)
      .populate('user', 'name avatar college department trustScore');

    res.status(201).json({
      success: true,
      post: populatedPost
    });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while creating post'
    });
  }
});

// @desc    Update post
// @route   PUT /api/posts/:id
// @access  Private (Owner only)
router.put('/:id', [
  protect,
  validatePostOwnership,
  body('title')
    .optional()
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage('Title must be between 5 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Description must be between 10 and 1000 characters'),
  body('category')
    .optional()
    .isIn(['Electronics', 'Documents', 'Accessories', 'Books', 'Clothing', 'Bags', 'Keys', 'Jewelry', 'Sports Equipment', 'Other'])
    .withMessage('Please select a valid category'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Invalid priority level')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    // Check if post is still active
    if (req.post.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'Cannot update resolved or expired posts'
      });
    }

    // Fields that can be updated
    const allowedUpdates = [
      'title', 'description', 'category', 'subCategory', 'location',
      'color', 'brand', 'model', 'size', 'condition', 'priority',
      'reward', 'contactInfo'
    ];

    const updates = {};
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const post = await Post.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).populate('user', 'name avatar college department trustScore');

    res.json({
      success: true,
      post
    });
  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while updating post'
    });
  }
});

// @desc    Mark post as resolved
// @route   PUT /api/posts/:id/resolve
// @access  Private (Owner only)
router.put('/:id/resolve', [
  protect,
  validatePostOwnership,
  body('resolvedBy')
    .optional()
    .isMongoId()
    .withMessage('Invalid user ID')
], async (req, res) => {
  try {
    const { resolvedBy } = req.body;

    // Mark as resolved
    await req.post.markResolved(resolvedBy);

    // Update user statistics
    req.user.itemsReturned += 1;
    await req.user.save();

    // If resolved by another user, update their statistics
    if (resolvedBy && resolvedBy !== req.user._id.toString()) {
      const resolver = await User.findById(resolvedBy);
      if (resolver) {
        resolver.itemsReturned += 1;
        await resolver.save();
      }
    }

    const updatedPost = await Post.findById(req.params.id)
      .populate('user', 'name avatar college department trustScore')
      .populate('resolvedBy', 'name avatar trustScore');

    res.json({
      success: true,
      message: 'Post marked as resolved',
      post: updatedPost
    });
  } catch (error) {
    console.error('Resolve post error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while resolving post'
    });
  }
});

// @desc    Express interest in a post
// @route   POST /api/posts/:id/interest
// @access  Private
router.post('/:id/interest', [
  protect,
  body('message')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Message cannot exceed 500 characters')
], async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post not found'
      });
    }

    if (post.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'Cannot express interest in inactive posts'
      });
    }

    // Can't express interest in own post
    if (post.user.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        error: 'Cannot express interest in your own post'
      });
    }

    const { message = '' } = req.body;

    await post.addInterestedUser(req.user._id, message);

    res.json({
      success: true,
      message: 'Interest expressed successfully'
    });
  } catch (error) {
    console.error('Express interest error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while expressing interest'
    });
  }
});

// @desc    Delete post
// @route   DELETE /api/posts/:id
// @access  Private (Owner only)
router.delete('/:id', protect, validatePostOwnership, async (req, res) => {
  try {
    // Check if post has active chats
    const Chat = require('../models/Chat');
    const activeChats = await Chat.countDocuments({
      post: req.params.id,
      status: 'active'
    });

    if (activeChats > 0) {
      // Don't delete, just mark as removed
      req.post.status = 'removed';
      await req.post.save();
    } else {
      // Safe to delete
      await Post.findByIdAndDelete(req.params.id);
    }

    res.json({
      success: true,
      message: 'Post deleted successfully'
    });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while deleting post'
    });
  }
});

// @desc    Flag post as inappropriate
// @route   POST /api/posts/:id/flag
// @access  Private
router.post('/:id/flag', [
  protect,
  body('reason')
    .isIn(['spam', 'inappropriate', 'fake', 'duplicate', 'other'])
    .withMessage('Invalid flag reason'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters')
], async (req, res) => {
  try {
    const { reason, description = '' } = req.body;

    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post not found'
      });
    }

    // Can't flag own post
    if (post.user.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        error: 'Cannot flag your own post'
      });
    }

    await post.flagPost(req.user._id, reason, description);

    res.json({
      success: true,
      message: 'Post flagged successfully'
    });
  } catch (error) {
    console.error('Flag post error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while flagging post'
    });
  }
});

// @desc    Get user's posts
// @route   GET /api/posts/user/:userId
// @access  Public
router.get('/user/:userId', [
  optionalAuth,
  query('type')
    .optional()
    .isIn(['lost', 'found'])
    .withMessage('Type must be either lost or found'),
  query('status')
    .optional()
    .isIn(['active', 'resolved', 'expired'])
    .withMessage('Invalid status'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50')
], async (req, res) => {
  try {
    const { type, status = 'active', page = 1, limit = 20 } = req.query;
    const userId = req.params.userId;

    // Build query
    let query = { user: userId };
    if (type) query.type = type;
    if (status) query.status = status;

    // If not the owner, only show active posts
    if (!req.user || req.user._id.toString() !== userId) {
      query.status = 'active';
    }

    const posts = await Post.find(query)
      .populate('user', 'name avatar college department trustScore')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Post.countDocuments(query);

    res.json({
      success: true,
      count: posts.length,
      total,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      },
      posts
    });
  } catch (error) {
    console.error('Get user posts error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching user posts'
    });
  }
});

// @desc    Get post statistics
// @route   GET /api/posts/stats
// @access  Public
router.get('/stats/overview', async (req, res) => {
  try {
    const [
      totalPosts,
      activePosts,
      resolvedPosts,
      lostPosts,
      foundPosts,
      todayPosts,
      thisWeekPosts,
      categoryStats
    ] = await Promise.all([
      Post.countDocuments(),
      Post.countDocuments({ status: 'active' }),
      Post.countDocuments({ status: 'resolved' }),
      Post.countDocuments({ type: 'lost', status: 'active' }),
      Post.countDocuments({ type: 'found', status: 'active' }),
      Post.countDocuments({
        createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
      }),
      Post.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      }),
      Post.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ])
    ]);

    res.json({
      success: true,
      stats: {
        total: totalPosts,
        active: activePosts,
        resolved: resolvedPosts,
        lost: lostPosts,
        found: foundPosts,
        today: todayPosts,
        thisWeek: thisWeekPosts,
        categories: categoryStats
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching statistics'
    });
  }
});

module.exports = router;