const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  avatar: {
    type: String,
    default: null
  },
  phone: {
    type: String,
    default: null,
    match: [/^\+?[\d\s-()]+$/, 'Please provide a valid phone number']
  },
  college: {
    type: String,
    default: null,
    trim: true
  },
  department: {
    type: String,
    default: null,
    trim: true
  },
  year: {
    type: String,
    default: null
  },
  bio: {
    type: String,
    maxlength: [500, 'Bio cannot exceed 500 characters'],
    default: null
  },
  // Trust and Rating System
  trustScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalRatings: {
    type: Number,
    default: 0
  },
  ratingsSum: {
    type: Number,
    default: 0
  },
  // Activity Statistics
  itemsFound: {
    type: Number,
    default: 0
  },
  itemsLost: {
    type: Number,
    default: 0
  },
  itemsReturned: {
    type: Number,
    default: 0
  },
  // Account Status
  isActive: {
    type: Boolean,
    default: true
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  // Verification
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: {
    type: String,
    default: null
  },
  resetPasswordToken: {
    type: String,
    default: null
  },
  resetPasswordExpire: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for better performance
userSchema.index({ email: 1 });
userSchema.index({ trustScore: -1 });
userSchema.index({ createdAt: -1 });

// Virtual for posts
userSchema.virtual('posts', {
  ref: 'Post',
  localField: '_id',
  foreignField: 'user',
  justOne: false
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Only hash password if it's modified or new
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    this.password = await bcrypt.hash(this.password, rounds);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to calculate and update trust score
userSchema.methods.updateTrustScore = function() {
  if (this.totalRatings > 0) {
    this.trustScore = Math.round((this.ratingsSum / this.totalRatings) * 100) / 100;
  } else {
    this.trustScore = 0;
  }
  return this.trustScore;
};

// Method to add a rating
userSchema.methods.addRating = function(rating) {
  this.totalRatings += 1;
  this.ratingsSum += rating;
  this.updateTrustScore();
  return this.save();
};

// Method to get public profile
userSchema.methods.getPublicProfile = function() {
  const user = this.toObject();
  
  // Remove sensitive information
  delete user.password;
  delete user.emailVerificationToken;
  delete user.resetPasswordToken;
  delete user.resetPasswordExpire;
  
  return user;
};

// Static method to find users by trust score
userSchema.statics.findByTrustScore = function(minScore = 0) {
  return this.find({ 
    trustScore: { $gte: minScore },
    isActive: true 
  }).sort({ trustScore: -1 });
};

module.exports = mongoose.model('User', userSchema);