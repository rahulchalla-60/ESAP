import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import UserSession from "../models/UserSession.js";
import Service from "../models/Service.js";
import User from "../models/User.js";
import { asyncHandler } from "../middleware/errorMiddleware.js";
import mongoose from "mongoose";

// @desc    Create or get conversation between user and provider for a service
// @route   POST /api/chat/conversations
// @access  Private
export const createOrGetConversation = asyncHandler(async (req, res) => {
  const { serviceId, providerId } = req.body;
  const userId = req.user._id;

  // Validate required fields
  if (!serviceId || !providerId) {
    return res.status(400).json({
      success: false,
      message: "Service ID and Provider ID are required"
    });
  }

  // Validate that the service exists and belongs to the provider
  const service = await Service.findById(serviceId).populate('provider');
  if (!service) {
    return res.status(404).json({
      success: false,
      message: "Service not found"
    });
  }

  if (service.provider._id.toString() !== providerId.toString()) {
    return res.status(400).json({
      success: false,
      message: "Service does not belong to the specified provider"
    });
  }

  // Check if user is trying to chat with themselves
  if (userId.toString() === providerId.toString()) {
    return res.status(400).json({
      success: false,
      message: "Cannot create conversation with yourself"
    });
  }

  // Check if conversation already exists
  let conversation = await Conversation.findByUserAndService(userId, serviceId);

  if (!conversation) {
    // Create new conversation
    conversation = new Conversation({
      serviceId,
      participants: [
        {
          userId: userId,
          role: req.user.role === 'provider' ? 'provider' : 'user'
        },
        {
          userId: providerId,
          role: 'provider'
        }
      ]
    });

    await conversation.save();
    
    // Populate the conversation with user details
    conversation = await Conversation.findById(conversation._id)
      .populate("participants.userId", "name contact role photo")
      .populate("serviceId", "serviceName provider")
      .populate("lastMessage.senderId", "name");
  }

  res.status(200).json({
    success: true,
    data: {
      conversation
    }
  });
});

// @desc    Get user's conversations with pagination
// @route   GET /api/chat/conversations
// @access  Private
export const getUserConversations = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;

  const conversations = await Conversation.getUserConversations(userId, page, limit);

  // Add unread counts for each conversation
  const conversationsWithUnread = conversations.map(conv => {
    const unreadCount = conv.getUnreadCount(userId);
    return {
      ...conv.toObject(),
      unreadCount
    };
  });

  res.status(200).json({
    success: true,
    data: {
      conversations: conversationsWithUnread,
      pagination: {
        page,
        limit,
        hasMore: conversations.length === limit
      }
    }
  });
});

// @desc    Get conversation by ID with messages
// @route   GET /api/chat/conversations/:conversationId
// @access  Private
export const getConversation = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user._id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;

  // Validate conversation ID
  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid conversation ID"
    });
  }

  // Get conversation and check if user is participant
  const conversation = await Conversation.findById(conversationId)
    .populate("participants.userId", "name contact role photo")
    .populate("serviceId", "serviceName provider")
    .populate("lastMessage.senderId", "name");

  if (!conversation) {
    return res.status(404).json({
      success: false,
      message: "Conversation not found"
    });
  }

  // Check if user is participant
  if (!conversation.isParticipant(userId)) {
    return res.status(403).json({
      success: false,
      message: "Access denied. You are not a participant in this conversation"
    });
  }

  // Get messages for the conversation
  const messages = await Message.getConversationMessages(conversationId, page, limit);

  // Mark messages as read for the current user
  const unreadMessageIds = messages
    .filter(msg => !msg.isReadBy(userId) && msg.senderId._id.toString() !== userId.toString())
    .map(msg => msg._id);

  if (unreadMessageIds.length > 0) {
    await Message.markMultipleAsRead(unreadMessageIds, userId);
    // Update conversation unread count
    conversation.markAsRead(userId);
    await conversation.save();
  }

  res.status(200).json({
    success: true,
    data: {
      conversation,
      messages: messages.reverse(), // Reverse to show oldest first
      pagination: {
        page,
        limit,
        hasMore: messages.length === limit
      }
    }
  });
});

// @desc    Get conversation chat history with pagination
// @route   GET /api/chat/conversations/:conversationId/messages
// @access  Private
export const getConversationMessages = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user._id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;

  // Validate conversation ID
  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid conversation ID"
    });
  }

  // Check if user is participant in the conversation
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    return res.status(404).json({
      success: false,
      message: "Conversation not found"
    });
  }

  if (!conversation.isParticipant(userId)) {
    return res.status(403).json({
      success: false,
      message: "Access denied. You are not a participant in this conversation"
    });
  }

  // Get messages
  const messages = await Message.getConversationMessages(conversationId, page, limit);

  res.status(200).json({
    success: true,
    data: {
      messages: messages.reverse(), // Reverse to show oldest first
      pagination: {
        page,
        limit,
        hasMore: messages.length === limit
      }
    }
  });
});

// @desc    Send a new message in conversation
// @route   POST /api/chat/conversations/:conversationId/messages
// @access  Private
export const sendMessage = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const { content, messageType = 'text', replyTo } = req.body;
  const userId = req.user._id;

  // Validate conversation ID
  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid conversation ID"
    });
  }

  // Validate message content
  if (!content || content.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: "Message content is required"
    });
  }

  // Check if user is participant in the conversation
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    return res.status(404).json({
      success: false,
      message: "Conversation not found"
    });
  }

  if (!conversation.isParticipant(userId)) {
    return res.status(403).json({
      success: false,
      message: "Access denied. You are not a participant in this conversation"
    });
  }

  // Create new message
  const message = new Message({
    conversationId,
    senderId: userId,
    content: content.trim(),
    messageType,
    replyTo: replyTo || undefined
  });

  await message.save();

  // Update conversation's last message
  conversation.updateLastMessage(content.trim(), userId, messageType);
  await conversation.save();

  // Populate message with sender details
  await message.populate("senderId", "name photo");
  if (replyTo) {
    await message.populate("replyTo", "content senderId timestamp");
  }

  res.status(201).json({
    success: true,
    data: {
      message
    }
  });
});

// @desc    Mark messages as read
// @route   PUT /api/chat/conversations/:conversationId/read
// @access  Private
export const markMessagesAsRead = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const { messageIds } = req.body;
  const userId = req.user._id;

  // Validate conversation ID
  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid conversation ID"
    });
  }

  // Check if user is participant in the conversation
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    return res.status(404).json({
      success: false,
      message: "Conversation not found"
    });
  }

  if (!conversation.isParticipant(userId)) {
    return res.status(403).json({
      success: false,
      message: "Access denied. You are not a participant in this conversation"
    });
  }

  // Mark messages as read
  if (messageIds && messageIds.length > 0) {
    await Message.markMultipleAsRead(messageIds, userId);
  } else {
    // Mark all unread messages in conversation as read
    const unreadMessages = await Message.getUnreadMessages(conversationId, userId);
    const unreadMessageIds = unreadMessages.map(msg => msg._id);
    if (unreadMessageIds.length > 0) {
      await Message.markMultipleAsRead(unreadMessageIds, userId);
    }
  }

  // Update conversation unread count
  conversation.markAsRead(userId);
  await conversation.save();

  res.status(200).json({
    success: true,
    message: "Messages marked as read"
  });
});

// @desc    Get conversation statistics
// @route   GET /api/chat/conversations/:conversationId/stats
// @access  Private
export const getConversationStats = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user._id;

  // Validate conversation ID
  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid conversation ID"
    });
  }

  // Check if user is participant in the conversation
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    return res.status(404).json({
      success: false,
      message: "Conversation not found"
    });
  }

  if (!conversation.isParticipant(userId)) {
    return res.status(403).json({
      success: false,
      message: "Access denied. You are not a participant in this conversation"
    });
  }

  // Get conversation statistics
  const stats = await Message.getConversationStats(conversationId);

  res.status(200).json({
    success: true,
    data: {
      stats: stats[0] || {
        totalMessages: 0,
        textMessages: 0,
        imageMessages: 0,
        fileMessages: 0,
        totalAttachments: 0,
        firstMessage: null,
        lastMessage: null
      }
    }
  });
});

// @desc    Delete conversation (soft delete)
// @route   DELETE /api/chat/conversations/:conversationId
// @access  Private
export const deleteConversation = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user._id;

  // Validate conversation ID
  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid conversation ID"
    });
  }

  // Check if user is participant in the conversation
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    return res.status(404).json({
      success: false,
      message: "Conversation not found"
    });
  }

  if (!conversation.isParticipant(userId)) {
    return res.status(403).json({
      success: false,
      message: "Access denied. You are not a participant in this conversation"
    });
  }

  // Soft delete conversation
  conversation.isActive = false;
  await conversation.save();

  res.status(200).json({
    success: true,
    message: "Conversation deleted successfully"
  });
});