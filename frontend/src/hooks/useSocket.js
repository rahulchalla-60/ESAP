import { useEffect, useState, useCallback } from 'react';
import socketService from '../services/socketService';

export const useSocket = (autoConnect = true) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  // Connect to socket
  const connect = useCallback(async (token = null) => {
    try {
      setConnectionError(null);
      await socketService.connect(token);
      setIsConnected(true);
    } catch (error) {
      console.error('Failed to connect to socket:', error);
      setConnectionError(error.message);
      setIsConnected(false);
    }
  }, []);

  // Disconnect from socket
  const disconnect = useCallback(() => {
    socketService.disconnect();
    setIsConnected(false);
    setConnectionError(null);
    setReconnectAttempts(0);
  }, []);

  // Update connection status
  const updateConnectionStatus = useCallback(() => {
    const status = socketService.getConnectionStatus();
    setIsConnected(status.isConnected);
    setReconnectAttempts(status.reconnectAttempts);
  }, []);

  useEffect(() => {
    // Auto-connect if enabled
    if (autoConnect && !isConnected) {
      connect();
    }

    // Set up connection status listeners
    const handleConnect = () => {
      setIsConnected(true);
      setConnectionError(null);
      setReconnectAttempts(0);
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    const handleConnectError = (error) => {
      setConnectionError(error.message);
      setIsConnected(false);
      updateConnectionStatus();
    };

    // Add socket event listeners
    socketService.on('connect', handleConnect);
    socketService.on('disconnect', handleDisconnect);
    socketService.on('connect_error', handleConnectError);

    // Cleanup on unmount
    return () => {
      socketService.off('connect', handleConnect);
      socketService.off('disconnect', handleDisconnect);
      socketService.off('connect_error', handleConnectError);
    };
  }, [autoConnect, connect, updateConnectionStatus, isConnected]);

  return {
    isConnected,
    connectionError,
    reconnectAttempts,
    connect,
    disconnect,
    socket: socketService
  };
};

export default useSocket;