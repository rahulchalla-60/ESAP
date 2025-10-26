import React from 'react';
import './ConnectionStatus.css';

const ConnectionStatus = ({ isConnected, reconnectAttempts, connectionError }) => {
  if (isConnected) {
    return (
      <div className="connection-status connected">
        <div className="status-indicator online"></div>
        <span className="status-text">Connected</span>
      </div>
    );
  }

  if (reconnectAttempts > 0) {
    return (
      <div className="connection-status reconnecting">
        <div className="status-indicator reconnecting">
          <div className="spinner"></div>
        </div>
        <span className="status-text">
          Reconnecting... (attempt {reconnectAttempts})
        </span>
      </div>
    );
  }

  if (connectionError) {
    return (
      <div className="connection-status error">
        <div className="status-indicator error"></div>
        <span className="status-text">Connection failed</span>
      </div>
    );
  }

  return (
    <div className="connection-status disconnected">
      <div className="status-indicator offline"></div>
      <span className="status-text">Disconnected</span>
    </div>
  );
};

export default ConnectionStatus;