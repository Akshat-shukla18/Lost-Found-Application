const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { generateToken, protect, rateLimit } = require('../middleware/auth');
const router = express.Router();

// Apply rate limiting to auth routes
const authRateLimit = rateLimit(20, 15 * 60 * 1000); // 20 requests per 15 minutes

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', [
  authRateLimit,
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('college')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('College name cannot exceed 100 characters'),
  body('department')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Department name cannot exceed 100 characters'),
  body('year')
    .optional()
    .isIn(['1st Year', '2nd Year', '3rd Year', '4th Year', 'Graduate', 'Faculty', 'Staff'])
    .withMessage('Please select a valid year'),
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number')
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

    const { name, email, password, college, department, year, phone, bio } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User with this email already exists'
      });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      college,
      department,
      year,
      phone,
      bio
    });

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: user.getPublicProfile()
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during registration'
    });
  }
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
router.post('/login', [
  authRateLimit,
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
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

    const { email, password } = req.body;

    // Check if user exists and get password
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Account has been deactivated'
      });
    }

    // Check password
    const isPasswordMatch = await user.comparePassword(password);
    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Update last active
    user.lastActive = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: user.getPublicProfile()
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during login'
    });
  }
});

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('posts');
    
    res.json({
      success: true,
      user: user.getPublicProfile()
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
router.put('/profile', [
  protect,
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('college')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('College name cannot exceed 100 characters'),
  body('department')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Department name cannot exceed 100 characters'),
  body('year')
    .optional()
    .isIn(['1st Year', '2nd Year', '3rd Year', '4th Year', 'Graduate', 'Faculty', 'Staff'])
    .withMessage('Please select a valid year'),
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio cannot exceed 500 characters')
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

    const updates = req.body;
    
    // Remove fields that shouldn't be updated
    delete updates.email;
    delete updates.password;
    delete updates.trustScore;
    delete updates.totalRatings;
    delete updates.ratingsSum;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      user: user.getPublicProfile()
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during profile update'
    });
  }
});

// @desc    Change password
// @route   PUT /api/auth/password
// @access  Private
router.put('/password', [
  protect,
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number')
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

    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await User.findById(req.user._id).select('+password');

    // Check current password
    const isPasswordMatch = await user.comparePassword(currentPassword);
    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during password change'
    });
  }
});

// @desc    Deactivate account
// @route   PUT /api/auth/deactivate
// @access  Private
router.put('/deactivate', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.isActive = false;
    await user.save();

    res.json({
      success: true,
      message: 'Account deactivated successfully'
    });
  } catch (error) {
    console.error('Account deactivation error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during account deactivation'
    });
  }
});

// @desc    Get user statistics
// @route   GET /api/auth/stats
// @access  Private
router.get('/stats', protect, async (req, res) => {
  try {
    const Post = require('../models/Post');
    const Chat = require('../models/Chat');
    const Rating = require('../models/Rating');

    // Get user's post statistics
    const [
      totalPosts,
      activePosts,
      resolvedPosts,
      lostPosts,
      foundPosts
    ] = await Promise.all([
      Post.countDocuments({ user: req.user._id }),
      Post.countDocuments({ user: req.user._id, status: 'active' }),
      Post.countDocuments({ user: req.user._id, status: 'resolved' }),
      Post.countDocuments({ user: req.user._id, type: 'lost' }),
      Post.countDocuments({ user: req.user._id, type: 'found' })
    ]);

    // Get chat statistics
    const totalChats = await Chat.countDocuments({
      'participants.user': req.user._id,
      'participants.isActive': true
    });

    // Get rating statistics
    const ratingStats = await Rating.calculateTrustScore(req.user._id);

    res.json({
      success: true,
      stats: {
        posts: {
          total: totalPosts,
          active: activePosts,
          resolved: resolvedPosts,
          lost: lostPosts,
          found: foundPosts
        },
        chats: {
          total: totalChats
        },
        ratings: ratingStats.length > 0 ? ratingStats[0] : {
          averageRating: 0,
          totalRatings: 0
        }
      }
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching statistics'
    });
  }
});

// @desc    Get public user profile
// @route   GET /api/auth/user/:id
// @access  Public
router.get('/user/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user || !user.isActive) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Get user's ratings
    const Rating = require('../models/Rating');
    const ratings = await Rating.getUserRatings(user._id, { limit: 5 });

    res.json({
      success: true,
      user: user.getPublicProfile(),
      recentRatings: ratings
    });
  } catch (error) {
    console.error('Get public profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

module.exports = router;