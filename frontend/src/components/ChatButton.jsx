import React from 'react';
import './ChatButton.css';

const ChatButton = ({ 
  providerId, 
  providerName, 
  isOnline = false, 
  unreadCount = 0, 
  onClick,
  disabled = false 
}) => {
  const handleClick = () => {
    if (!disabled && onClick) {
      onClick(providerId, providerName);
    }
  };

  return (
    <button 
      className={`chat-button ${disabled ? 'disabled' : ''}`}
      onClick={handleClick}
      disabled={disabled}
      title={`Chat with ${providerName}`}
    >
      <div className="chat-button-content">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="chat-icon">
          <path 
            d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
        </svg>
        <span className="chat-button-text">Chat with Provider</span>
        
        {/* Online Status Indicator */}
        <div className={`online-status ${isOnline ? 'online' : 'offline'}`}>
          <div className="status-dot"></div>
        </div>
        
        {/* Unread Count Badge */}
        {unreadCount > 0 && (
          <div className="unread-badge">
            <span className="unread-count">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          </div>
        )}
      </div>
    </button>
  );
};

export default ChatButton;
</text>
</invoke>