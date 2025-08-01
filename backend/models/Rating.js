const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
  rater: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Rater is required']
  },
  rated: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Rated user is required']
  },
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: [true, 'Post reference is required']
  },
  chat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    default: null
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5'],
    validate: {
      validator: function(value) {
        return Number.isInteger(value);
      },
      message: 'Rating must be a whole number'
    }
  },
  review: {
    type: String,
    trim: true,
    maxlength: [500, 'Review cannot exceed 500 characters']
  },
  categories: {
    communication: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    },
    reliability: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    },
    helpfulness: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    },
    timeliness: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    }
  },
  transactionType: {
    type: String,
    enum: ['item_returned', 'item_found', 'helped_search', 'provided_info', 'other'],
    required: [true, 'Transaction type is required']
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  // Flag system for inappropriate reviews
  isFlagged: {
    type: Boolean,
    default: false
  },
  flagCount: {
    type: Number,
    default: 0
  },
  flags: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: {
      type: String,
      enum: ['inappropriate', 'fake', 'spam', 'harassment', 'other']
    },
    description: {
      type: String,
      maxlength: [300, 'Flag description cannot exceed 300 characters']
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  // Response from rated user
  response: {
    content: {
      type: String,
      maxlength: [300, 'Response cannot exceed 300 characters'],
      default: null
    },
    timestamp: {
      type: Date,
      default: null
    }
  },
  // Helpful votes
  helpfulVotes: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  helpfulCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound index to prevent duplicate ratings for same transaction
ratingSchema.index({ rater: 1, rated: 1, post: 1 }, { unique: true });

// Other indexes for performance
ratingSchema.index({ rated: 1, isPublic: 1 });
ratingSchema.index({ rating: -1 });
ratingSchema.index({ createdAt: -1 });
ratingSchema.index({ transactionType: 1 });
ratingSchema.index({ isVerified: 1 });

// Virtual for time since rating
ratingSchema.virtual('age').get(function() {
  return Math.floor((new Date() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Virtual for average category rating
ratingSchema.virtual('averageCategoryRating').get(function() {
  const categories = this.categories;
  const validRatings = [];
  
  if (categories.communication) validRatings.push(categories.communication);
  if (categories.reliability) validRatings.push(categories.reliability);
  if (categories.helpfulness) validRatings.push(categories.helpfulness);
  if (categories.timeliness) validRatings.push(categories.timeliness);
  
  if (validRatings.length === 0) return null;
  
  return validRatings.reduce((sum, rating) => sum + rating, 0) / validRatings.length;
});

// Method to add helpful vote
ratingSchema.methods.addHelpfulVote = function(userId) {
  // Check if user already voted
  const existingVote = this.helpfulVotes.find(
    vote => vote.user.toString() === userId.toString()
  );
  
  if (!existingVote) {
    this.helpfulVotes.push({
      user: userId,
      timestamp: new Date()
    });
    this.helpfulCount += 1;
    return this.save();
  }
  
  return Promise.resolve(this);
};

// Method to remove helpful vote
ratingSchema.methods.removeHelpfulVote = function(userId) {
  const voteIndex = this.helpfulVotes.findIndex(
    vote => vote.user.toString() === userId.toString()
  );
  
  if (voteIndex !== -1) {
    this.helpfulVotes.splice(voteIndex, 1);
    this.helpfulCount = Math.max(0, this.helpfulCount - 1);
    return this.save();
  }
  
  return Promise.resolve(this);
};

// Method to add response
ratingSchema.methods.addResponse = function(content) {
  this.response = {
    content: content,
    timestamp: new Date()
  };
  return this.save();
};

// Method to flag rating
ratingSchema.methods.flagRating = function(userId, reason, description = '') {
  // Check if user already flagged
  const existingFlag = this.flags.find(
    flag => flag.user.toString() === userId.toString()
  );
  
  if (!existingFlag) {
    this.flags.push({
      user: userId,
      reason: reason,
      description: description,
      timestamp: new Date()
    });
    this.flagCount += 1;
    
    // Auto-flag if flagged by multiple users
    if (this.flagCount >= 3) {
      this.isFlagged = true;
    }
    
    return this.save();
  }
  
  return Promise.resolve(this);
};

// Method to verify rating
ratingSchema.methods.verifyRating = function(verifierId) {
  this.isVerified = true;
  this.verifiedBy = verifierId;
  return this.save();
};

// Static method to get user ratings
ratingSchema.statics.getUserRatings = function(userId, options = {}) {
  const {
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = -1,
    publicOnly = true
  } = options;
  
  const query = { 
    rated: userId,
    ...(publicOnly && { isPublic: true })
  };
  
  return this.find(query)
    .populate('rater', 'name avatar college department')
    .populate('post', 'title type category')
    .sort({ [sortBy]: sortOrder })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .exec();
};

// Static method to calculate user trust score
ratingSchema.statics.calculateTrustScore = function(userId) {
  return this.aggregate([
    {
      $match: {
        rated: new mongoose.Types.ObjectId(userId),
        isPublic: true
      }
    },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        totalRatings: { $sum: 1 },
        ratingSum: { $sum: '$rating' },
        ratingDistribution: {
          $push: '$rating'
        }
      }
    },
    {
      $project: {
        _id: 0,
        averageRating: { $round: ['$averageRating', 2] },
        totalRatings: 1,
        ratingSum: 1,
        ratingDistribution: 1
      }
    }
  ]);
};

// Static method to get rating statistics
ratingSchema.statics.getRatingStats = function(userId) {
  return this.aggregate([
    {
      $match: {
        rated: new mongoose.Types.ObjectId(userId),
        isPublic: true
      }
    },
    {
      $group: {
        _id: '$rating',
        count: { $sum: 1 }
      }
    },
    {
      $sort: { _id: -1 }
    }
  ]);
};

// Static method to find top rated users
ratingSchema.statics.getTopRatedUsers = function(limit = 10, minRatings = 5) {
  return this.aggregate([
    {
      $match: {
        isPublic: true
      }
    },
    {
      $group: {
        _id: '$rated',
        averageRating: { $avg: '$rating' },
        totalRatings: { $sum: 1 }
      }
    },
    {
      $match: {
        totalRatings: { $gte: minRatings }
      }
    },
    {
      $sort: {
        averageRating: -1,
        totalRatings: -1
      }
    },
    {
      $limit: limit
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user'
      }
    },
    {
      $unwind: '$user'
    },
    {
      $project: {
        _id: 0,
        user: {
          _id: '$user._id',
          name: '$user.name',
          avatar: '$user.avatar',
          college: '$user.college',
          department: '$user.department',
          trustScore: '$user.trustScore'
        },
        averageRating: { $round: ['$averageRating', 2] },
        totalRatings: 1
      }
    }
  ]);
};

// Pre-save middleware to update user's trust score
ratingSchema.post('save', async function(doc) {
  try {
    const User = mongoose.model('User');
    const user = await User.findById(doc.rated);
    
    if (user) {
      const stats = await this.constructor.calculateTrustScore(doc.rated);
      
      if (stats.length > 0) {
        const { averageRating, totalRatings, ratingSum } = stats[0];
        user.trustScore = averageRating;
        user.totalRatings = totalRatings;
        user.ratingsSum = ratingSum;
        await user.save();
      }
    }
  } catch (error) {
    console.error('Error updating user trust score:', error);
  }
});

// Pre-remove middleware to update user's trust score
ratingSchema.post('remove', async function(doc) {
  try {
    const User = mongoose.model('User');
    const user = await User.findById(doc.rated);
    
    if (user) {
      const stats = await this.constructor.calculateTrustScore(doc.rated);
      
      if (stats.length > 0) {
        const { averageRating, totalRatings, ratingSum } = stats[0];
        user.trustScore = averageRating;
        user.totalRatings = totalRatings;
        user.ratingsSum = ratingSum;
      } else {
        user.trustScore = 0;
        user.totalRatings = 0;
        user.ratingsSum = 0;
      }
      
      await user.save();
    }
  } catch (error) {
    console.error('Error updating user trust score after removal:', error);
  }
});

module.exports = mongoose.model('Rating', ratingSchema);