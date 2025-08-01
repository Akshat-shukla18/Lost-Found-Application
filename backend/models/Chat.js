const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Sender is required']
  },
  content: {
    type: String,
    required: [true, 'Message content is required'],
    trim: true,
    maxlength: [1000, 'Message cannot exceed 1000 characters']
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'file', 'system'],
    default: 'text'
  },
  attachment: {
    url: {
      type: String,
      default: null
    },
    publicId: {
      type: String,
      default: null
    },
    filename: {
      type: String,
      default: null
    },
    size: {
      type: Number,
      default: null
    }
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date,
    default: null
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date,
    default: null
  },
  originalContent: {
    type: String,
    default: null
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

const chatSchema = new mongoose.Schema({
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    lastSeen: {
      type: Date,
      default: Date.now
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: [true, 'Post reference is required']
  },
  chatType: {
    type: String,
    enum: ['inquiry', 'negotiation', 'support'],
    default: 'inquiry'
  },
  title: {
    type: String,
    trim: true,
    maxlength: [100, 'Chat title cannot exceed 100 characters']
  },
  messages: [messageSchema],
  lastMessage: {
    content: {
      type: String,
      default: null
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    timestamp: {
      type: Date,
      default: null
    },
    messageType: {
      type: String,
      default: 'text'
    }
  },
  status: {
    type: String,
    enum: ['active', 'closed', 'archived'],
    default: 'active'
  },
  isResolved: {
    type: Boolean,
    default: false
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
  // Priority for support chats
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  // Auto-close inactive chats
  lastActivity: {
    type: Date,
    default: Date.now
  },
  autoCloseAt: {
    type: Date,
    default: function() {
      // Auto-close after 7 days of inactivity
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }
  },
  // Notification settings
  notifications: {
    enabled: {
      type: Boolean,
      default: true
    },
    muteUntil: {
      type: Date,
      default: null
    }
  },
  // Metadata
  metadata: {
    itemReturned: {
      type: Boolean,
      default: false
    },
    meetingArranged: {
      type: Boolean,
      default: false
    },
    meetingLocation: {
      type: String,
      default: null
    },
    meetingTime: {
      type: Date,
      default: null
    },
    contactShared: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
chatSchema.index({ 'participants.user': 1 });
chatSchema.index({ post: 1 });
chatSchema.index({ status: 1 });
chatSchema.index({ lastActivity: -1 });
chatSchema.index({ createdAt: -1 });
chatSchema.index({ 'lastMessage.timestamp': -1 });

// Virtual for unread message count per user
chatSchema.virtual('unreadCount').get(function() {
  // This will be calculated dynamically in the application
  return 0;
});

// Virtual for chat duration
chatSchema.virtual('duration').get(function() {
  if (this.resolvedAt) {
    return Math.floor((this.resolvedAt - this.createdAt) / (1000 * 60 * 60 * 24));
  }
  return Math.floor((new Date() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Method to add a message
chatSchema.methods.addMessage = function(senderId, content, messageType = 'text', attachment = null) {
  const message = {
    sender: senderId,
    content: content,
    messageType: messageType,
    attachment: attachment,
    isRead: false
  };

  this.messages.push(message);
  
  // Update last message
  this.lastMessage = {
    content: content,
    sender: senderId,
    timestamp: new Date(),
    messageType: messageType
  };
  
  // Update last activity
  this.lastActivity = new Date();
  
  // Update auto-close time
  this.autoCloseAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  
  return this.save();
};

// Method to mark messages as read
chatSchema.methods.markMessagesAsRead = function(userId, messageIds = null) {
  if (messageIds) {
    // Mark specific messages as read
    messageIds.forEach(messageId => {
      const message = this.messages.id(messageId);
      if (message && message.sender.toString() !== userId.toString()) {
        message.isRead = true;
        message.readAt = new Date();
      }
    });
  } else {
    // Mark all unread messages as read for this user
    this.messages.forEach(message => {
      if (!message.isRead && message.sender.toString() !== userId.toString()) {
        message.isRead = true;
        message.readAt = new Date();
      }
    });
  }
  
  // Update participant's last seen
  const participant = this.participants.find(p => p.user.toString() === userId.toString());
  if (participant) {
    participant.lastSeen = new Date();
  }
  
  return this.save();
};

// Method to edit a message
chatSchema.methods.editMessage = function(messageId, newContent, userId) {
  const message = this.messages.id(messageId);
  
  if (!message) {
    throw new Error('Message not found');
  }
  
  if (message.sender.toString() !== userId.toString()) {
    throw new Error('Not authorized to edit this message');
  }
  
  if (message.isDeleted) {
    throw new Error('Cannot edit deleted message');
  }
  
  // Store original content if not already edited
  if (!message.isEdited) {
    message.originalContent = message.content;
  }
  
  message.content = newContent;
  message.isEdited = true;
  message.editedAt = new Date();
  
  return this.save();
};

// Method to delete a message
chatSchema.methods.deleteMessage = function(messageId, userId) {
  const message = this.messages.id(messageId);
  
  if (!message) {
    throw new Error('Message not found');
  }
  
  if (message.sender.toString() !== userId.toString()) {
    throw new Error('Not authorized to delete this message');
  }
  
  message.isDeleted = true;
  message.deletedAt = new Date();
  message.content = 'This message has been deleted';
  
  return this.save();
};

// Method to add participant
chatSchema.methods.addParticipant = function(userId) {
  const existingParticipant = this.participants.find(
    p => p.user.toString() === userId.toString()
  );
  
  if (!existingParticipant) {
    this.participants.push({
      user: userId,
      joinedAt: new Date(),
      lastSeen: new Date(),
      isActive: true
    });
    return this.save();
  }
  
  // Reactivate if previously inactive
  existingParticipant.isActive = true;
  return this.save();
};

// Method to remove participant
chatSchema.methods.removeParticipant = function(userId) {
  const participant = this.participants.find(p => p.user.toString() === userId.toString());
  
  if (participant) {
    participant.isActive = false;
  }
  
  return this.save();
};

// Method to close chat
chatSchema.methods.closeChat = function(closedBy = null) {
  this.status = 'closed';
  this.isResolved = true;
  this.resolvedAt = new Date();
  
  if (closedBy) {
    this.resolvedBy = closedBy;
  }
  
  return this.save();
};

// Method to get unread count for a user
chatSchema.methods.getUnreadCount = function(userId) {
  return this.messages.filter(message => 
    !message.isRead && 
    message.sender.toString() !== userId.toString() &&
    !message.isDeleted
  ).length;
};

// Static method to find chats for a user
chatSchema.statics.findUserChats = function(userId, status = 'active') {
  return this.find({
    'participants.user': userId,
    'participants.isActive': true,
    status: status
  })
  .populate('participants.user', 'name email avatar trustScore')
  .populate('post', 'title type category status')
  .populate('lastMessage.sender', 'name avatar')
  .sort({ 'lastMessage.timestamp': -1 });
};

// Static method to find chat by post and users
chatSchema.statics.findByPostAndUsers = function(postId, userIds) {
  return this.findOne({
    post: postId,
    'participants.user': { $all: userIds },
    status: { $ne: 'archived' }
  });
};

// Static method to find expired chats
chatSchema.statics.findExpired = function() {
  return this.find({
    status: 'active',
    autoCloseAt: { $lt: new Date() }
  });
};

// Pre-save middleware to update last activity on message addition
chatSchema.pre('save', function(next) {
  if (this.isModified('messages')) {
    this.lastActivity = new Date();
  }
  next();
});

module.exports = mongoose.model('Chat', chatSchema);