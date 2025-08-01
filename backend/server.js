require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const connectDB = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');

// Import models for Socket.io
const Chat = require('./models/Chat');
const User = require('./models/User');

const app = express();
const server = http.createServer(app);

// Socket.io setup
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Connect to MongoDB
connectDB();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS configuration
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Lost & Found Platform API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);

// Socket.io authentication middleware
const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user || !user.isActive) {
      return next(new Error('Authentication error: User not found or inactive'));
    }

    socket.user = user;
    next();
  } catch (error) {
    next(new Error('Authentication error: Invalid token'));
  }
};

// Apply socket authentication
io.use(authenticateSocket);

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`User ${socket.user.name} connected (${socket.user._id})`);

  // Join user to their personal room for notifications
  socket.join(`user_${socket.user._id}`);

  // Handle joining a chat room
  socket.on('join_chat', async (chatId) => {
    try {
      const chat = await Chat.findById(chatId);
      
      if (!chat) {
        socket.emit('error', { message: 'Chat not found' });
        return;
      }

      // Check if user is a participant
      const isParticipant = chat.participants.some(
        p => p.user.toString() === socket.user._id.toString() && p.isActive
      );

      if (!isParticipant) {
        socket.emit('error', { message: 'Not authorized to join this chat' });
        return;
      }

      socket.join(`chat_${chatId}`);
      
      // Mark messages as read when user joins
      await chat.markMessagesAsRead(socket.user._id);
      
      // Notify other participants that user is online
      socket.to(`chat_${chatId}`).emit('user_online', {
        userId: socket.user._id,
        userName: socket.user.name
      });

      console.log(`User ${socket.user.name} joined chat ${chatId}`);
    } catch (error) {
      console.error('Join chat error:', error);
      socket.emit('error', { message: 'Failed to join chat' });
    }
  });

  // Handle leaving a chat room
  socket.on('leave_chat', (chatId) => {
    socket.leave(`chat_${chatId}`);
    
    // Notify other participants that user went offline
    socket.to(`chat_${chatId}`).emit('user_offline', {
      userId: socket.user._id,
      userName: socket.user.name
    });

    console.log(`User ${socket.user.name} left chat ${chatId}`);
  });

  // Handle sending messages
  socket.on('send_message', async (data) => {
    try {
      const { chatId, content, messageType = 'text', attachment = null } = data;

      const chat = await Chat.findById(chatId);
      
      if (!chat) {
        socket.emit('error', { message: 'Chat not found' });
        return;
      }

      // Check if user is a participant
      const isParticipant = chat.participants.some(
        p => p.user.toString() === socket.user._id.toString() && p.isActive
      );

      if (!isParticipant) {
        socket.emit('error', { message: 'Not authorized to send messages in this chat' });
        return;
      }

      // Add message to chat
      await chat.addMessage(socket.user._id, content, messageType, attachment);

      // Get the newly added message
      const newMessage = chat.messages[chat.messages.length - 1];

      // Populate sender information
      await newMessage.populate('sender', 'name avatar');

      // Emit message to all participants in the chat
      io.to(`chat_${chatId}`).emit('new_message', {
        chatId,
        message: newMessage
      });

      console.log(`Message sent in chat ${chatId} by ${socket.user.name}`);
    } catch (error) {
      console.error('Send message error:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Handle message editing
  socket.on('edit_message', async (data) => {
    try {
      const { chatId, messageId, newContent } = data;

      const chat = await Chat.findById(chatId);
      
      if (!chat) {
        socket.emit('error', { message: 'Chat not found' });
        return;
      }

      await chat.editMessage(messageId, newContent, socket.user._id);

      // Emit updated message to all participants
      io.to(`chat_${chatId}`).emit('message_edited', {
        chatId,
        messageId,
        newContent,
        editedAt: new Date()
      });

      console.log(`Message ${messageId} edited in chat ${chatId}`);
    } catch (error) {
      console.error('Edit message error:', error);
      socket.emit('error', { message: error.message });
    }
  });

  // Handle message deletion
  socket.on('delete_message', async (data) => {
    try {
      const { chatId, messageId } = data;

      const chat = await Chat.findById(chatId);
      
      if (!chat) {
        socket.emit('error', { message: 'Chat not found' });
        return;
      }

      await chat.deleteMessage(messageId, socket.user._id);

      // Emit deletion to all participants
      io.to(`chat_${chatId}`).emit('message_deleted', {
        chatId,
        messageId,
        deletedAt: new Date()
      });

      console.log(`Message ${messageId} deleted in chat ${chatId}`);
    } catch (error) {
      console.error('Delete message error:', error);
      socket.emit('error', { message: error.message });
    }
  });

  // Handle typing indicators
  socket.on('typing', (data) => {
    const { chatId, isTyping } = data;
    
    socket.to(`chat_${chatId}`).emit('user_typing', {
      userId: socket.user._id,
      userName: socket.user.name,
      isTyping
    });
  });

  // Handle marking messages as read
  socket.on('mark_read', async (data) => {
    try {
      const { chatId, messageIds } = data;

      const chat = await Chat.findById(chatId);
      
      if (!chat) {
        socket.emit('error', { message: 'Chat not found' });
        return;
      }

      await chat.markMessagesAsRead(socket.user._id, messageIds);

      // Notify other participants that messages were read
      socket.to(`chat_${chatId}`).emit('messages_read', {
        userId: socket.user._id,
        messageIds: messageIds || 'all'
      });
    } catch (error) {
      console.error('Mark read error:', error);
      socket.emit('error', { message: 'Failed to mark messages as read' });
    }
  });

  // Handle creating new chat for a post
  socket.on('create_chat', async (data) => {
    try {
      const { postId, participantId, initialMessage } = data;

      // Check if chat already exists
      const existingChat = await Chat.findByPostAndUsers(postId, [socket.user._id, participantId]);

      if (existingChat) {
        socket.emit('chat_created', { chat: existingChat });
        return;
      }

      // Create new chat
      const chat = new Chat({
        participants: [
          { user: socket.user._id },
          { user: participantId }
        ],
        post: postId,
        title: `Discussion about post`
      });

      await chat.save();

      // Add initial message if provided
      if (initialMessage) {
        await chat.addMessage(socket.user._id, initialMessage);
      }

      // Populate chat data
      await chat.populate('participants.user', 'name avatar trustScore');
      await chat.populate('post', 'title type category');

      // Join both users to the chat room
      socket.join(`chat_${chat._id}`);
      
      // Notify the other participant
      io.to(`user_${participantId}`).emit('new_chat', { chat });

      socket.emit('chat_created', { chat });

      console.log(`New chat created: ${chat._id}`);
    } catch (error) {
      console.error('Create chat error:', error);
      socket.emit('error', { message: 'Failed to create chat' });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`User ${socket.user.name} disconnected`);
    
    // Update user's last active time
    User.findByIdAndUpdate(socket.user._id, { lastActive: new Date() })
      .exec()
      .catch(err => console.error('Error updating last active:', err));
  });

  // Handle errors
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Something went wrong' 
      : err.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  server.close(() => {
    console.log('Process terminated');
  });
});

// Cleanup expired posts and chats periodically
const cleanupExpiredContent = async () => {
  try {
    // Mark expired posts
    const expiredPosts = await Post.findExpired();
    for (const post of expiredPosts) {
      post.status = 'expired';
      await post.save();
    }

    // Close expired chats
    const expiredChats = await Chat.findExpired();
    for (const chat of expiredChats) {
      await chat.closeChat();
    }

    if (expiredPosts.length > 0 || expiredChats.length > 0) {
      console.log(`Cleaned up ${expiredPosts.length} expired posts and ${expiredChats.length} expired chats`);
    }
  } catch (error) {
    console.error('Cleanup error:', error);
  }
};

// Run cleanup every hour
setInterval(cleanupExpiredContent, 60 * 60 * 1000);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Lost & Found Platform API server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 MongoDB: ${process.env.MONGODB_URI || 'mongodb://localhost:27017/lost-found-platform'}`);
  console.log(`🌐 Client URL: ${process.env.CLIENT_URL || 'http://localhost:3000'}`);
});

module.exports = { app, server, io };