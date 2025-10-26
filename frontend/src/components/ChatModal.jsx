import React, { useState, useEffect, useRef } from 'react';
import './ChatModal.css';
import { useChat } from '../hooks/useChat';
import ConnectionStatus from './ConnectionStatus';
import { useSocket } from '../hooks/useSocket';

const ChatModal = ({ 
  isOpen, 
  onClose, 
  providerId, 
  providerName,
  providerAvatar = null,
  serviceId = null
}) => {
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Use real chat functionality
  const {
    conversation,
    messages,
    isLoading,
    error,
    isTyping: userIsTyping,
    typingUsers,
    isConnected,
    sendMessage,
    sendTyping,
    markAsRead,
    isProviderOnline
  } = useChat(providerId, serviceId);

  // Get socket connection status
  const { connectionError, reconnectAttempts } = useSocket(false);

  // Handle modal open/close effects
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Focus on input when modal opens
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen, onClose]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !isConnected) return;

    const messageContent = newMessage.trim();
    setNewMessage('');

    try {
      await sendMessage(messageContent);
    } catch (error) {
      console.error('Failed to send message:', error);
      // Restore message in input on error
      setNewMessage(messageContent);
    }
  };

  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    
    // Handle typing indicator
    if (e.target.value.trim()) {
      sendTyping(true);
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Stop typing after 3 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        sendTyping(false);
      }, 3000);
    } else {
      sendTyping(false);
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getOnlineStatusText = () => {
    if (isProviderOnline) return 'Online';
    return 'Offline';
  };

  if (!isOpen) return null;

  return (
    <div className="chat-modal-overlay" onClick={handleOverlayClick}>
      <div className="chat-modal-container">
        {/* Header */}
        <div className="chat-modal-header">
          <div className="chat-header-info">
            <div className="provider-avatar-small">
              {providerAvatar ? (
                <img src={providerAvatar} alt={providerName} />
              ) : (
                <div className="avatar-placeholder-small">
                  {providerName?.charAt(0)?.toUpperCase() || 'P'}
                </div>
              )}
              <div className={`online-indicator ${isProviderOnline ? 'online' : 'offline'}`}></div>
            </div>
            <div className="provider-details">
              <h3 className="provider-name-header">{providerName}</h3>
              <span className="online-status-text">{getOnlineStatusText()}</span>
            </div>
          </div>
          <ConnectionStatus 
            isConnected={isConnected}
            reconnectAttempts={reconnectAttempts}
            connectionError={connectionError}
          />
          <button className="chat-close-button" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Messages Area */}
        <div className="chat-messages-container">
          {isLoading ? (
            <div className="chat-loading">
              <div className="loading-spinner"></div>
              <span>Loading conversation...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="chat-empty-state">
              <div className="empty-chat-icon">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                  <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </div>
              <h4>Start a conversation</h4>
              <p>Send a message to {providerName} to get started</p>
            </div>
          ) : (
            <div className="messages-list">
              {messages.map((message) => (
                <div 
                  key={message.id} 
                  className={`message ${message.senderId === 'current-user' ? 'sent' : 'received'}`}
                >
                  <div className="message-content">
                    <p>{message.content}</p>
                    <div className="message-meta">
                      <span className="message-time">{formatTime(message.timestamp)}</span>
                      {message.senderId === 'current-user' && (
                        <div className={`message-status ${message.status}`}>
                          {message.status === 'sent' && (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                              <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                          {message.status === 'delivered' && (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                              <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M16 10L21 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                          {message.status === 'read' && (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="read-status">
                              <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M16 10L21 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {typingUsers.length > 0 && (
                <div className="typing-indicator">
                  <div className="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  <span className="typing-text">{providerName} is typing...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="chat-input-container">
          <form onSubmit={handleSendMessage} className="chat-input-form">
            <div className="input-wrapper">
              <input
                ref={inputRef}
                type="text"
                value={newMessage}
                onChange={handleInputChange}
                placeholder={`Message ${providerName}...`}
                className="chat-input"
                maxLength={1000}
              />
              <button 
                type="submit" 
                className="send-button"
                disabled={!newMessage.trim()}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatModal;