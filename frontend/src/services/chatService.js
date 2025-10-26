import socketService from './socketService';

class ChatService {
  constructor() {
    this.conversations = new Map();
    this.messageListeners = new Map();
  }

  // API base URL
  getApiUrl() {
    return 'http://localhost:5000/api';
  }

  // Get auth token (placeholder - replace with actual auth implementation)
  getAuthToken() {
    // TODO: Replace with actual token from auth context/localStorage
    return localStorage.getItem('authToken') || null;
  }

  // Get current user ID (placeholder - replace with actual auth implementation)
  getCurrentUserId() {
    // TODO: Replace with actual user ID from auth context
    return localStorage.getItem('userId') || 'current-user';
  }

  // Create or get existing conversation
  async createConversation(providerId, serviceId = null) {
    try {
      const token = this.getAuthToken();
      const response = await fetch(`${this.getApiUrl()}/chat/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          providerId,
          serviceId
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to create conversation: ${response.statusText}`);
      }

      const conversation = await response.json();
      console.log('Conversation created/retrieved:', conversation);
      return conversation;
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  }

  // Get conversation history
  async getConversationHistory(conversationId, page = 1, limit = 50) {
    try {
      const token = this.getAuthToken();
      const response = await fetch(
        `${this.getApiUrl()}/chat/conversations/${conversationId}/messages?page=${page}&limit=${limit}`,
        {
          headers: {
            'Authorization': token ? `Bearer ${token}` : ''
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to get conversation history: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Conversation history loaded:', data);
      return data;
    } catch (error) {
      console.error('Error getting conversation history:', error);
      throw error;
    }
  }

  // Send message through WebSocket
  async sendMessage(conversationId, content, messageType = 'text', attachments = []) {
    try {
      const messageData = {
        conversationId,
        content,
        messageType,
        attachments,
        senderId: this.getCurrentUserId(),
        timestamp: new Date().toISOString()
      };

      // Send through WebSocket
      const sentMessage = await socketService.sendMessage(messageData);
      console.log('Message sent successfully:', sentMessage);
      return sentMessage;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  // Join conversation room
  joinConversation(conversationId) {
    socketService.joinConversation(conversationId);
    
    // Set up message listeners for this conversation if not already set
    if (!this.messageListeners.has(conversationId)) {
      this.setupMessageListeners(conversationId);
    }
  }

  // Leave conversation room
  leaveConversation(conversationId) {
    socketService.leaveConversation(conversationId);
    this.removeMessageListeners(conversationId);
  }

  // Set up message listeners for a conversation
  setupMessageListeners(conversationId) {
    const listeners = {
      // New message received
      onNewMessage: (message) => {
        console.log('New message received:', message);
        this.handleNewMessage(conversationId, message);
      },

      // Message status updated
      onMessageStatusUpdate: (update) => {
        console.log('Message status updated:', update);
        this.handleMessageStatusUpdate(conversationId, update);
      },

      // Typing indicator
      onTyping: (data) => {
        console.log('Typing indicator:', data);
        this.handleTypingIndicator(conversationId, data);
      },

      // User online status
      onUserStatusUpdate: (data) => {
        console.log('User status update:', data);
        this.handleUserStatusUpdate(conversationId, data);
      }
    };

    // Add socket listeners
    socketService.on('new_message', listeners.onNewMessage);
    socketService.on('message_status_update', listeners.onMessageStatusUpdate);
    socketService.on('typing', listeners.onTyping);
    socketService.on('user_status_update', listeners.onUserStatusUpdate);

    // Store listeners for cleanup
    this.messageListeners.set(conversationId, listeners);
  }

  // Remove message listeners for a conversation
  removeMessageListeners(conversationId) {
    const listeners = this.messageListeners.get(conversationId);
    if (listeners) {
      socketService.off('new_message', listeners.onNewMessage);
      socketService.off('message_status_update', listeners.onMessageStatusUpdate);
      socketService.off('typing', listeners.onTyping);
      socketService.off('user_status_update', listeners.onUserStatusUpdate);
      
      this.messageListeners.delete(conversationId);
    }
  }

  // Handle new message
  handleNewMessage(conversationId, message) {
    // Update local conversation data
    if (this.conversations.has(conversationId)) {
      const conversation = this.conversations.get(conversationId);
      conversation.messages = conversation.messages || [];
      conversation.messages.push(message);
      conversation.lastMessage = message;
    }

    // Notify listeners
    this.notifyListeners('newMessage', { conversationId, message });
  }

  // Handle message status update
  handleMessageStatusUpdate(conversationId, update) {
    // Update local message status
    if (this.conversations.has(conversationId)) {
      const conversation = this.conversations.get(conversationId);
      if (conversation.messages) {
        const message = conversation.messages.find(m => m._id === update.messageId);
        if (message) {
          message.status = update.status;
        }
      }
    }

    // Notify listeners
    this.notifyListeners('messageStatusUpdate', { conversationId, update });
  }

  // Handle typing indicator
  handleTypingIndicator(conversationId, data) {
    this.notifyListeners('typing', { conversationId, ...data });
  }

  // Handle user status update
  handleUserStatusUpdate(conversationId, data) {
    this.notifyListeners('userStatusUpdate', { conversationId, ...data });
  }

  // Send typing indicator
  sendTyping(conversationId, isTyping) {
    socketService.sendTyping(conversationId, isTyping);
  }

  // Mark messages as read
  async markMessagesAsRead(conversationId, messageIds) {
    try {
      const token = this.getAuthToken();
      const response = await fetch(`${this.getApiUrl()}/chat/messages/read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          conversationId,
          messageIds
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to mark messages as read: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Messages marked as read:', result);
      return result;
    } catch (error) {
      console.error('Error marking messages as read:', error);
      throw error;
    }
  }

  // Event listener management
  addEventListener(event, callback) {
    if (!this.eventListeners) {
      this.eventListeners = new Map();
    }
    
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    
    this.eventListeners.get(event).push(callback);
  }

  removeEventListener(event, callback) {
    if (this.eventListeners && this.eventListeners.has(event)) {
      const callbacks = this.eventListeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  notifyListeners(event, data) {
    if (this.eventListeners && this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in event listener:', error);
        }
      });
    }
  }

  // Get conversation data
  getConversation(conversationId) {
    return this.conversations.get(conversationId);
  }

  // Set conversation data
  setConversation(conversationId, conversation) {
    this.conversations.set(conversationId, conversation);
  }

  // Clean up
  cleanup() {
    // Remove all message listeners
    for (const conversationId of this.messageListeners.keys()) {
      this.removeMessageListeners(conversationId);
    }
    
    // Clear conversations
    this.conversations.clear();
    
    // Clear event listeners
    if (this.eventListeners) {
      this.eventListeners.clear();
    }
  }
}

// Create singleton instance
const chatService = new ChatService();

export default chatService;