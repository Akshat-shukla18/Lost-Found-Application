const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

// Verify JWT token middleware
const protect = async (req, res, next) => {
  try {
    let token;

    // Get token from header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Make sure token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to access this route'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from token
      const user = await User.findById(decoded.userId).select('-password');

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'User not found'
        });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          error: 'Account has been deactivated'
        });
      }

      // Update last active
      user.lastActive = new Date();
      await user.save();

      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to access this route'
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Server error during authentication'
    });
  }
};

// Optional authentication middleware (doesn't require login)
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    // Get token from header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Get user from token
        const user = await User.findById(decoded.userId).select('-password');

        if (user && user.isActive) {
          // Update last active
          user.lastActive = new Date();
          await user.save();
          req.user = user;
        }
      } catch (error) {
        // Token invalid, but continue without authentication
        req.user = null;
      }
    }

    next();
  } catch (error) {
    next();
  }
};

// Check if user owns the resource
const authorize = (resourceModel, resourceField = 'user') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params.id;
      const resource = await resourceModel.findById(resourceId);

      if (!resource) {
        return res.status(404).json({
          success: false,
          error: 'Resource not found'
        });
      }

      // Check if user owns the resource
      if (resource[resourceField].toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to access this resource'
        });
      }

      req.resource = resource;
      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: 'Server error during authorization'
      });
    }
  };
};

// Rate limiting middleware
const rateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const requests = new Map();

  return (req, res, next) => {
    const clientId = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old entries
    if (requests.has(clientId)) {
      const clientRequests = requests.get(clientId);
      requests.set(clientId, clientRequests.filter(time => time > windowStart));
    }

    // Get current request count
    const currentRequests = requests.get(clientId) || [];

    if (currentRequests.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests, please try again later',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }

    // Add current request
    currentRequests.push(now);
    requests.set(clientId, currentRequests);

    next();
  };
};

// Admin role check
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  // Check if user has admin role (you might want to add a role field to User model)
  if (req.user.email !== process.env.ADMIN_EMAIL) {
    return res.status(403).json({
      success: false,
      error: 'Admin access required'
    });
  }

  next();
};

// Validate user ownership of post
const validatePostOwnership = async (req, res, next) => {
  try {
    const Post = require('../models/Post');
    const postId = req.params.id || req.params.postId;
    
    const post = await Post.findById(postId);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post not found'
      });
    }

    if (post.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to modify this post'
      });
    }

    req.post = post;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Server error during post validation'
    });
  }
};

// Validate chat participation
const validateChatParticipation = async (req, res, next) => {
  try {
    const Chat = require('../models/Chat');
    const chatId = req.params.id || req.params.chatId;
    
    const chat = await Chat.findById(chatId);
    
    if (!chat) {
      return res.status(404).json({
        success: false,
        error: 'Chat not found'
      });
    }

    // Check if user is a participant
    const isParticipant = chat.participants.some(
      participant => participant.user.toString() === req.user._id.toString() && participant.isActive
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to access this chat'
      });
    }

    req.chat = chat;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Server error during chat validation'
    });
  }
};

// Check if user can rate (participated in the transaction)
const canRate = async (req, res, next) => {
  try {
    const { ratedUserId, postId } = req.body;
    
    // Check if rater is different from rated user
    if (req.user._id.toString() === ratedUserId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot rate yourself'
      });
    }

    // Check if there was interaction (chat or post ownership)
    const Chat = require('../models/Chat');
    const Post = require('../models/Post');
    
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post not found'
      });
    }

    // Check if user had interaction with the rated user about this post
    const chat = await Chat.findOne({
      post: postId,
      'participants.user': { $all: [req.user._id, ratedUserId] },
      'participants.isActive': true
    });

    const hasInteraction = chat || 
                          post.user.toString() === req.user._id.toString() || 
                          post.user.toString() === ratedUserId;

    if (!hasInteraction) {
      return res.status(403).json({
        success: false,
        error: 'Cannot rate user without interaction'
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Server error during rating validation'
    });
  }
};

module.exports = {
  generateToken,
  protect,
  optionalAuth,
  authorize,
  rateLimit,
  requireAdmin,
  validatePostOwnership,
  validateChatParticipation,
  canRate
};