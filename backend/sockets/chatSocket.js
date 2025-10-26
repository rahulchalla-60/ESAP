import jwt from 'jsonwebtoken';
import config from '../config/environment.js';
import UserSession from '../models/UserSession.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';

// In-memory store for active connections
const activeConnections = new Map();

// Socket.IO authentication middleware
const authenticateSocket = (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    const decoded = jwt.verify(token, config.jwtSecret);
    socket.userId = decoded.id;
    socket.userRole = decoded.role;
    
    next();
  } catch (error) {
    next(new Error('Authentication error: Invalid token'));
  }
};

// Setup Socket.IO event handlers
export const setupSocketHandlers = (io) => {
  // Apply authentication middleware
  io.use(authenticateSocket);

  io.on('connection', async (socket) => {
    console.log(`User ${socket.userId} connected with socket ${socket.id}`);
    
    // Store active connection
    activeConnections.set(socket.userId, {
      socketId: socket.id,
      socket: socket,
      connectedAt: new Date()
    });

    // Update user session in database
    try {
      await UserSession.findOrCreate(socket.userId, socket.id);
    } catch (error) {
      console.error('Error updating user session:', error);
    }

    // Join user to their personal room for notifications
    socket.join(`user_${socket.userId}`);

    // Auto-join user to their active conversations
    try {
      const session = await UserSession.findOne({ userId: socket.userId });
      if (session && session.activeConversations.length > 0) {
        session.activeConversations.forEach(conv => {
          socket.join(`conversation_${conv.conversationId}`);
          console.log(`Auto-joined user ${socket.userId} to conversation ${conv.conversationId}`);
        });
      }
    } catch (error) {
      console.error('Error auto-joining conversations:', error);
    }

    // Broadcast online status to relevant users
    socket.broadcast.emit('user_online', {
      userId: socket.userId,
      isOnline: true,
      timestamp: new Date()
    });

    // Send connection confirmation to user
    socket.emit('connected', {
      userId: socket.userId,
      socketId: socket.id,
      timestamp: new Date()
    });

    // Handle joining conversation rooms
    socket.on('join_conversation', async (data) => {
      try {
        const { conversationId } = data;
        
        // Validate conversation exists and user is participant
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
          socket.emit('error', { message: 'Conversation not found' });
          return;
        }
        
        if (!conversation.isParticipant(socket.userId)) {
          socket.emit('error', { message: 'Access denied to conversation' });
          return;
        }
        
        // Join the conversation room
        socket.join(`conversation_${conversationId}`);
        
        // Update user session with active conversation
        try {
          const session = await UserSession.findOne({ userId: socket.userId });
          if (session) {
            session.joinConversation(conversationId);
            await session.save();
          }
        } catch (error) {
          console.error('Error updating user session with conversation:', error);
        }
        
        // Notify other participants that user joined
        socket.to(`conversation_${conversationId}`).emit('user_joined_conversation', {
          userId: socket.userId,
          conversationId,
          timestamp: new Date()
        });
        
        // Send confirmation to user
        socket.emit('conversation_joined', {
          conversationId,
          timestamp: new Date()
        });
        
        console.log(`User ${socket.userId} joined conversation ${conversationId}`);
      } catch (error) {
        console.error('Error joining conversation:', error);
        socket.emit('error', { message: 'Failed to join conversation' });
      }
    });

    // Handle leaving conversation rooms
    socket.on('leave_conversation', async (data) => {
      try {
        const { conversationId } = data;
        
        // Leave the conversation room
        socket.leave(`conversation_${conversationId}`);
        
        // Update user session to remove active conversation
        try {
          const session = await UserSession.findOne({ userId: socket.userId });
          if (session) {
            session.leaveConversation(conversationId);
            await session.save();
          }
        } catch (error) {
          console.error('Error updating user session:', error);
        }
        
        // Notify other participants that user left
        socket.to(`conversation_${conversationId}`).emit('user_left_conversation', {
          userId: socket.userId,
          conversationId,
          timestamp: new Date()
        });
        
        // Send confirmation to user
        socket.emit('conversation_left', {
          conversationId,
          timestamp: new Date()
        });
        
        console.log(`User ${socket.userId} left conversation ${conversationId}`);
      } catch (error) {
        console.error('Error leaving conversation:', error);
        socket.emit('error', { message: 'Failed to leave conversation' });
      }
    });

    // Handle sending messages
    socket.on('send_message', async (data) => {
      try {
        const { conversationId, content, messageType = 'text', tempId, replyTo } = data;
        
        // Validate input
        if (!conversationId || !content || content.trim().length === 0) {
          socket.emit('message_error', {
            tempId,
            error: 'Invalid message data'
          });
          return;
        }
        
        // Validate conversation exists and user is participant
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
          socket.emit('message_error', {
            tempId,
            error: 'Conversation not found'
          });
          return;
        }
        
        if (!conversation.isParticipant(socket.userId)) {
          socket.emit('message_error', {
            tempId,
            error: 'Access denied to conversation'
          });
          return;
        }
        
        // Create and save message to database
        const message = new Message({
          conversationId,
          senderId: socket.userId,
          content: content.trim(),
          messageType,
          replyTo: replyTo || undefined
        });
        
        await message.save();
        
        // Update conversation's last message
        conversation.updateLastMessage(content.trim(), socket.userId, messageType);
        await conversation.save();
        
        // Populate message with sender details
        await message.populate('senderId', 'name photo');
        if (replyTo) {
          await message.populate('replyTo', 'content senderId timestamp');
        }
        
        // Broadcast message to conversation participants (excluding sender)
        socket.to(`conversation_${conversationId}`).emit('new_message', {
          message: message.toObject(),
          conversationId,
          timestamp: new Date()
        });
        
        // Send confirmation back to sender with real message data
        socket.emit('message_sent', {
          tempId,
          message: message.toObject(),
          timestamp: new Date()
        });
        
        // Update message status to delivered for online participants
        const onlineParticipants = [];
        for (const participant of conversation.participants) {
          if (participant.userId.toString() !== socket.userId.toString()) {
            const isOnline = activeConnections.has(participant.userId.toString());
            if (isOnline) {
              onlineParticipants.push(participant.userId);
            }
          }
        }
        
        if (onlineParticipants.length > 0) {
          message.status = 'delivered';
          await message.save();
          
          // Notify sender that message was delivered
          socket.emit('message_delivered', {
            messageId: message._id,
            deliveredTo: onlineParticipants,
            timestamp: new Date()
          });
        }
        
        console.log(`Message sent in conversation ${conversationId} by user ${socket.userId}`);
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('message_error', {
          tempId: data.tempId,
          error: 'Failed to send message'
        });
      }
    });

    // Store typing timeouts for automatic cleanup
    const typingTimeouts = new Map();
    
    // Handle typing indicators
    socket.on('typing_start', async (data) => {
      try {
        const { conversationId } = data;
        
        // Validate conversation exists and user is participant
        const conversation = await Conversation.findById(conversationId);
        if (!conversation || !conversation.isParticipant(socket.userId)) {
          return; // Silently ignore invalid requests
        }
        
        // Clear existing timeout for this user in this conversation
        const timeoutKey = `${socket.userId}_${conversationId}`;
        if (typingTimeouts.has(timeoutKey)) {
          clearTimeout(typingTimeouts.get(timeoutKey));
        }
        
        // Broadcast typing indicator to other participants
        socket.to(`conversation_${conversationId}`).emit('user_typing', {
          userId: socket.userId,
          conversationId,
          isTyping: true,
          timestamp: new Date()
        });
        
        // Set automatic timeout to stop typing indicator after 3 seconds
        const timeout = setTimeout(() => {
          socket.to(`conversation_${conversationId}`).emit('user_typing', {
            userId: socket.userId,
            conversationId,
            isTyping: false,
            timestamp: new Date()
          });
          typingTimeouts.delete(timeoutKey);
        }, 3000);
        
        typingTimeouts.set(timeoutKey, timeout);
        
        console.log(`User ${socket.userId} started typing in conversation ${conversationId}`);
      } catch (error) {
        console.error('Error handling typing start:', error);
      }
    });

    socket.on('typing_stop', async (data) => {
      try {
        const { conversationId } = data;
        
        // Validate conversation exists and user is participant
        const conversation = await Conversation.findById(conversationId);
        if (!conversation || !conversation.isParticipant(socket.userId)) {
          return; // Silently ignore invalid requests
        }
        
        // Clear timeout for this user in this conversation
        const timeoutKey = `${socket.userId}_${conversationId}`;
        if (typingTimeouts.has(timeoutKey)) {
          clearTimeout(typingTimeouts.get(timeoutKey));
          typingTimeouts.delete(timeoutKey);
        }
        
        // Broadcast stop typing indicator to other participants
        socket.to(`conversation_${conversationId}`).emit('user_typing', {
          userId: socket.userId,
          conversationId,
          isTyping: false,
          timestamp: new Date()
        });
        
        console.log(`User ${socket.userId} stopped typing in conversation ${conversationId}`);
      } catch (error) {
        console.error('Error handling typing stop:', error);
      }
    });

    // Handle message read status
    socket.on('mark_messages_read', async (data) => {
      try {
        const { conversationId, messageIds } = data;
        
        // Validate conversation exists and user is participant
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
          socket.emit('error', { message: 'Conversation not found' });
          return;
        }
        
        if (!conversation.isParticipant(socket.userId)) {
          socket.emit('error', { message: 'Access denied to conversation' });
          return;
        }
        
        // Update message read status in database
        if (messageIds && messageIds.length > 0) {
          await Message.markMultipleAsRead(messageIds, socket.userId);
        } else {
          // Mark all unread messages in conversation as read
          const unreadMessages = await Message.getUnreadMessages(conversationId, socket.userId);
          const unreadMessageIds = unreadMessages.map(msg => msg._id);
          if (unreadMessageIds.length > 0) {
            await Message.markMultipleAsRead(unreadMessageIds, socket.userId);
          }
        }
        
        // Update conversation unread count
        conversation.markAsRead(socket.userId);
        await conversation.save();
        
        // Notify other participants that messages were read
        socket.to(`conversation_${conversationId}`).emit('messages_read', {
          userId: socket.userId,
          messageIds: messageIds || [],
          conversationId,
          readAt: new Date()
        });
        
        // Send confirmation to user
        socket.emit('messages_marked_read', {
          conversationId,
          messageIds: messageIds || [],
          timestamp: new Date()
        });
        
        console.log(`Messages marked as read in conversation ${conversationId} by user ${socket.userId}`);
      } catch (error) {
        console.error('Error marking messages as read:', error);
        socket.emit('error', { message: 'Failed to mark messages as read' });
      }
    });

    // Handle getting online status for specific users
    socket.on('get_user_status', async (data) => {
      try {
        const { userIds } = data;
        const statusList = [];
        
        for (const userId of userIds) {
          const session = await UserSession.findOne({ userId });
          statusList.push({
            userId,
            isOnline: session ? session.isOnline : false,
            lastSeen: session ? session.lastSeen : null,
            lastSeenText: session ? session.getLastSeenText() : 'Never'
          });
        }
        
        socket.emit('user_status_update', {
          statusList,
          timestamp: new Date()
        });
      } catch (error) {
        console.error('Error getting user status:', error);
        socket.emit('error', { message: 'Failed to get user status' });
      }
    });

    // Handle getting conversation participants status
    socket.on('get_conversation_participants_status', async (data) => {
      try {
        const { conversationId } = data;
        
        // Validate conversation exists and user is participant
        const conversation = await Conversation.findById(conversationId)
          .populate('participants.userId', 'name photo');
        
        if (!conversation || !conversation.isParticipant(socket.userId)) {
          socket.emit('error', { message: 'Access denied to conversation' });
          return;
        }
        
        const participantsStatus = [];
        for (const participant of conversation.participants) {
          const session = await UserSession.findOne({ userId: participant.userId._id });
          participantsStatus.push({
            userId: participant.userId._id,
            name: participant.userId.name,
            photo: participant.userId.photo,
            role: participant.role,
            isOnline: session ? session.isOnline : false,
            lastSeen: session ? session.lastSeen : null,
            lastSeenText: session ? session.getLastSeenText() : 'Never',
            isInConversation: session ? session.isInConversation(conversationId) : false
          });
        }
        
        socket.emit('conversation_participants_status', {
          conversationId,
          participants: participantsStatus,
          timestamp: new Date()
        });
      } catch (error) {
        console.error('Error getting conversation participants status:', error);
        socket.emit('error', { message: 'Failed to get participants status' });
      }
    });

    // Handle disconnection
    socket.on('disconnect', async (reason) => {
      console.log(`User ${socket.userId} disconnected: ${reason}`);
      
      // Clear all typing timeouts for this user
      const typingTimeouts = socket.typingTimeouts || new Map();
      for (const [key, timeout] of typingTimeouts.entries()) {
        if (key.startsWith(`${socket.userId}_`)) {
          clearTimeout(timeout);
          typingTimeouts.delete(key);
          
          // Send stop typing to relevant conversations
          const conversationId = key.split('_')[1];
          socket.to(`conversation_${conversationId}`).emit('user_typing', {
            userId: socket.userId,
            conversationId,
            isTyping: false,
            timestamp: new Date()
          });
        }
      }
      
      // Remove from active connections
      activeConnections.delete(socket.userId);
      
      // Update user session to offline in database
      try {
        const session = await UserSession.setOfflineBySocketId(socket.id);
        if (session) {
          // Broadcast offline status
          socket.broadcast.emit('user_offline', {
            userId: socket.userId,
            isOnline: false,
            lastSeen: session.lastSeen,
            timestamp: new Date()
          });
        }
      } catch (error) {
        console.error('Error updating user session on disconnect:', error);
      }
    });

    // Handle connection errors
    socket.on('error', (error) => {
      console.error(`Socket error for user ${socket.userId}:`, error);
    });
  });

  // Handle connection errors
  io.on('connect_error', (error) => {
    console.error('Socket.IO connection error:', error);
  });
};

// Helper functions to get user status
export const getUserOnlineStatus = async (userId) => {
  try {
    const session = await UserSession.findOne({ userId });
    return session || {
      isOnline: false,
      lastSeen: null,
      socketId: null
    };
  } catch (error) {
    console.error('Error getting user online status:', error);
    return {
      isOnline: false,
      lastSeen: null,
      socketId: null
    };
  }
};

export const getActiveConnections = () => {
  return Array.from(activeConnections.keys());
};

export const isUserOnline = (userId) => {
  return activeConnections.has(userId);
};

// Function to send notification to specific user
export const sendNotificationToUser = (io, userId, notification) => {
  io.to(`user_${userId}`).emit('notification', notification);
};

// Function to send message to conversation
export const sendMessageToConversation = (io, conversationId, message) => {
  io.to(`conversation_${conversationId}`).emit('new_message', message);
};