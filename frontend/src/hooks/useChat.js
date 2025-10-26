import { useState, useEffect, useCallback, useRef } from 'react';
import chatService from '../services/chatService';
import { useSocket } from './useSocket';

export const useChat = (providerId, serviceId = null) => {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  
  const { isConnected, socket } = useSocket();
  const typingTimeoutRef = useRef(null);
  const conversationRef = useRef(null);

  // Initialize conversation
  const initializeConversation = useCallback(async () => {
    if (!providerId || !isConnected) return;

    setIsLoading(true);
    setError(null);

    try {
      // Create or get existing conversation
      const conv = await chatService.createConversation(providerId, serviceId);
      setConversation(conv);
      conversationRef.current = conv;

      // Join conversation room
      chatService.joinConversation(conv._id);

      // Load conversation history
      const historyData = await chatService.getConversationHistory(conv._id);
      setMessages(historyData.messages || []);

      console.log('Chat initialized successfully');
    } catch (err) {
      console.error('Failed to initialize chat:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [providerId, serviceId, isConnected]);

  // Send message
  const sendMessage = useCallback(async (content, messageType = 'text', attachments = []) => {
    if (!conversation || !content.trim()) return null;

    try {
      const message = await chatService.sendMessage(
        conversation._id,
        content.trim(),
        messageType,
        attachments
      );

      // Add message to local state immediately for better UX
      setMessages(prev => [...prev, {
        ...message,
        status: 'sending',
        timestamp: new Date()
      }]);

      return message;
    } catch (err) {
      console.error('Failed to send message:', err);
      setError(err.message);
      throw err;
    }
  }, [conversation]);

  // Send typing indicator
  const sendTyping = useCallback((isTypingNow) => {
    if (!conversation) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (isTypingNow) {
      chatService.sendTyping(conversation._id, true);
      setIsTyping(true);

      // Auto-stop typing after 3 seconds
      typingTimeoutRef.current = setTimeout(() => {
        chatService.sendTyping(conversation._id, false);
        setIsTyping(false);
      }, 3000);
    } else {
      chatService.sendTyping(conversation._id, false);
      setIsTyping(false);
    }
  }, [conversation]);

  // Mark messages as read
  const markAsRead = useCallback(async (messageIds) => {
    if (!conversation || !messageIds.length) return;

    try {
      await chatService.markMessagesAsRead(conversation._id, messageIds);
      
      // Update local message status
      setMessages(prev => prev.map(msg => 
        messageIds.includes(msg._id) 
          ? { ...msg, status: 'read' }
          : msg
      ));
    } catch (err) {
      console.error('Failed to mark messages as read:', err);
    }
  }, [conversation]);

  // Event handlers
  useEffect(() => {
    if (!conversation) return;

    const handleNewMessage = ({ conversationId, message }) => {
      if (conversationId === conversation._id) {
        setMessages(prev => {
          // Avoid duplicates
          const exists = prev.some(m => m._id === message._id);
          if (exists) return prev;
          
          return [...prev, message];
        });
      }
    };

    const handleMessageStatusUpdate = ({ conversationId, update }) => {
      if (conversationId === conversation._id) {
        setMessages(prev => prev.map(msg => 
          msg._id === update.messageId 
            ? { ...msg, status: update.status }
            : msg
        ));
      }
    };

    const handleTyping = ({ conversationId, userId, userName, isTyping: userIsTyping }) => {
      if (conversationId === conversation._id) {
        setTypingUsers(prev => {
          const filtered = prev.filter(user => user.userId !== userId);
          if (userIsTyping) {
            return [...filtered, { userId, userName }];
          }
          return filtered;
        });
      }
    };

    const handleUserStatusUpdate = ({ conversationId, userId, isOnline }) => {
      if (conversationId === conversation._id) {
        setOnlineUsers(prev => {
          const newSet = new Set(prev);
          if (isOnline) {
            newSet.add(userId);
          } else {
            newSet.delete(userId);
          }
          return newSet;
        });
      }
    };

    // Add event listeners
    chatService.addEventListener('newMessage', handleNewMessage);
    chatService.addEventListener('messageStatusUpdate', handleMessageStatusUpdate);
    chatService.addEventListener('typing', handleTyping);
    chatService.addEventListener('userStatusUpdate', handleUserStatusUpdate);

    // Cleanup
    return () => {
      chatService.removeEventListener('newMessage', handleNewMessage);
      chatService.removeEventListener('messageStatusUpdate', handleMessageStatusUpdate);
      chatService.removeEventListener('typing', handleTyping);
      chatService.removeEventListener('userStatusUpdate', handleUserStatusUpdate);
    };
  }, [conversation]);

  // Initialize conversation when socket connects
  useEffect(() => {
    if (isConnected && providerId) {
      initializeConversation();
    }
  }, [isConnected, providerId, initializeConversation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (conversation) {
        chatService.leaveConversation(conversation._id);
      }
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [conversation]);

  return {
    // State
    conversation,
    messages,
    isLoading,
    error,
    isTyping,
    typingUsers,
    onlineUsers,
    isConnected,
    
    // Actions
    sendMessage,
    sendTyping,
    markAsRead,
    initializeConversation,
    
    // Utils
    isProviderOnline: onlineUsers.has(providerId),
    hasUnreadMessages: messages.some(msg => 
      msg.senderId !== chatService.getCurrentUserId() && msg.status !== 'read'
    )
  };
};

export default useChat;