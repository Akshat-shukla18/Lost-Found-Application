const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  type: {
    type: String,
    required: [true, 'Post type is required'],
    enum: {
      values: ['lost', 'found'],
      message: 'Type must be either lost or found'
    }
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: {
      values: [
        'Electronics',
        'Documents',
        'Accessories',
        'Books',
        'Clothing',
        'Bags',
        'Keys',
        'Jewelry',
        'Sports Equipment',
        'Other'
      ],
      message: 'Please select a valid category'
    }
  },
  subCategory: {
    type: String,
    trim: true,
    maxlength: [50, 'Sub-category cannot exceed 50 characters']
  },
  // Location Information
  location: {
    building: {
      type: String,
      required: [true, 'Building/Location is required'],
      trim: true
    },
    floor: {
      type: String,
      trim: true
    },
    room: {
      type: String,
      trim: true
    },
    area: {
      type: String,
      trim: true
    },
    coordinates: {
      latitude: {
        type: Number,
        min: -90,
        max: 90
      },
      longitude: {
        type: Number,
        min: -180,
        max: 180
      }
    }
  },
  // Time Information
  dateTime: {
    type: Date,
    required: [true, 'Date and time is required'],
    validate: {
      validator: function(value) {
        return value <= new Date();
      },
      message: 'Date cannot be in the future'
    }
  },
  timeRange: {
    start: {
      type: String,
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please provide valid time format (HH:MM)']
    },
    end: {
      type: String,
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please provide valid time format (HH:MM)']
    }
  },
  // Item Details
  color: {
    type: String,
    trim: true
  },
  brand: {
    type: String,
    trim: true
  },
  model: {
    type: String,
    trim: true
  },
  size: {
    type: String,
    trim: true
  },
  condition: {
    type: String,
    enum: ['Excellent', 'Good', 'Fair', 'Poor'],
    default: 'Good'
  },
  // Images
  images: [{
    url: {
      type: String,
      required: true
    },
    publicId: {
      type: String,
      required: true
    },
    description: {
      type: String,
      maxlength: [200, 'Image description cannot exceed 200 characters']
    }
  }],
  // Contact Information
  contactInfo: {
    email: {
      type: Boolean,
      default: true
    },
    phone: {
      type: Boolean,
      default: false
    },
    preferredMethod: {
      type: String,
      enum: ['email', 'phone', 'chat'],
      default: 'chat'
    }
  },
  // Post Status
  status: {
    type: String,
    enum: {
      values: ['active', 'resolved', 'expired', 'removed'],
      message: 'Status must be active, resolved, expired, or removed'
    },
    default: 'active'
  },
  resolvedAt: {
    type: Date,
    default: null
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  // Engagement
  views: {
    type: Number,
    default: 0
  },
  interestedUsers: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    message: {
      type: String,
      maxlength: [500, 'Message cannot exceed 500 characters']
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  // Verification
  isVerified: {
    type: Boolean,
    default: false
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  // Flags and Reports
  isFlagged: {
    type: Boolean,
    default: false
  },
  flagCount: {
    type: Number,
    default: 0
  },
  reports: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: {
      type: String,
      enum: ['spam', 'inappropriate', 'fake', 'duplicate', 'other']
    },
    description: {
      type: String,
      maxlength: [500, 'Report description cannot exceed 500 characters']
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  // Priority and urgency
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  // Rewards
  reward: {
    offered: {
      type: Boolean,
      default: false
    },
    amount: {
      type: Number,
      min: 0
    },
    description: {
      type: String,
      maxlength: [200, 'Reward description cannot exceed 200 characters']
    }
  },
  // Auto-expiration
  expiresAt: {
    type: Date,
    default: function() {
      // Auto-expire after 30 days
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
postSchema.index({ type: 1, status: 1 });
postSchema.index({ user: 1 });
postSchema.index({ category: 1 });
postSchema.index({ 'location.building': 1 });
postSchema.index({ dateTime: -1 });
postSchema.index({ createdAt: -1 });
postSchema.index({ priority: -1 });
postSchema.index({ expiresAt: 1 });

// Text index for search functionality
postSchema.index({
  title: 'text',
  description: 'text',
  category: 'text',
  'location.building': 'text',
  color: 'text',
  brand: 'text'
});

// Virtual for age of post
postSchema.virtual('age').get(function() {
  return Math.floor((new Date() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Virtual for time since resolved
postSchema.virtual('timeSinceResolved').get(function() {
  if (!this.resolvedAt) return null;
  return Math.floor((new Date() - this.resolvedAt) / (1000 * 60 * 60 * 24));
});

// Method to increment views
postSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

// Method to add interested user
postSchema.methods.addInterestedUser = function(userId, message = '') {
  // Check if user already expressed interest
  const existingInterest = this.interestedUsers.find(
    interest => interest.user.toString() === userId.toString()
  );
  
  if (!existingInterest) {
    this.interestedUsers.push({
      user: userId,
      message: message,
      timestamp: new Date()
    });
    return this.save();
  }
  
  return Promise.resolve(this);
};

// Method to mark as resolved
postSchema.methods.markResolved = function(resolvedBy = null) {
  this.status = 'resolved';
  this.resolvedAt = new Date();
  if (resolvedBy) {
    this.resolvedBy = resolvedBy;
  }
  return this.save();
};

// Method to flag post
postSchema.methods.flagPost = function(userId, reason, description = '') {
  // Check if user already reported
  const existingReport = this.reports.find(
    report => report.user.toString() === userId.toString()
  );
  
  if (!existingReport) {
    this.reports.push({
      user: userId,
      reason: reason,
      description: description,
      timestamp: new Date()
    });
    this.flagCount += 1;
    
    // Auto-flag if reported by multiple users
    if (this.flagCount >= 3) {
      this.isFlagged = true;
    }
    
    return this.save();
  }
  
  return Promise.resolve(this);
};

// Static method to find expired posts
postSchema.statics.findExpired = function() {
  return this.find({
    status: 'active',
    expiresAt: { $lt: new Date() }
  });
};

// Static method to find posts by location
postSchema.statics.findByLocation = function(building, radius = null) {
  const query = { 'location.building': building, status: 'active' };
  return this.find(query).sort({ createdAt: -1 });
};

// Static method to search posts
postSchema.statics.searchPosts = function(searchTerm, filters = {}) {
  let query = {
    $text: { $search: searchTerm },
    status: 'active',
    ...filters
  };
  
  return this.find(query, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' }, createdAt: -1 });
};

// Pre-save middleware to auto-expire old posts
postSchema.pre('save', function(next) {
  if (this.status === 'active' && this.expiresAt < new Date()) {
    this.status = 'expired';
  }
  next();
});

module.exports = mongoose.model('Post', postSchema);