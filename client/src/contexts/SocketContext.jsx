import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io(import.meta.env.VITE_SERVER_URL || '', {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('🔌 Socket connected');
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
      setConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  // Listen to specific events
  const onNewOrder = useCallback((callback) => {
    if (!socket) return;
    socket.on('newOrder', callback);
    return () => socket.off('newOrder', callback);
  }, [socket]);

  const onNewOffer = useCallback((callback) => {
    if (!socket) return;
    socket.on('newOffer', callback);
    return () => socket.off('newOffer', callback);
  }, [socket]);

  const onOfferAccepted = useCallback((callback) => {
    if (!socket) return;
    socket.on('offerAccepted', callback);
    return () => socket.off('offerAccepted', callback);
  }, [socket]);

  const onOrderUpdated = useCallback((callback) => {
    if (!socket) return;
    socket.on('orderUpdated', callback);
    return () => socket.off('orderUpdated', callback);
  }, [socket]);

  const onOrderDeleted = useCallback((callback) => {
    if (!socket) return;
    socket.on('orderDeleted', callback);
    return () => socket.off('orderDeleted', callback);
  }, [socket]);

  const onOrderExpired = useCallback((callback) => {
    if (!socket) return;
    socket.on('orderExpired', callback);
    return () => socket.off('orderExpired', callback);
  }, [socket]);

  const onOrderDelivered = useCallback((callback) => {
    if (!socket) return;
    socket.on('orderDelivered', callback);
    return () => socket.off('orderDelivered', callback);
  }, [socket]);

  const onOrderFailed = useCallback((callback) => {
    if (!socket) return;
    socket.on('orderFailed', callback);
    return () => socket.off('orderFailed', callback);
  }, [socket]);

  const onDeliveryCancelled = useCallback((callback) => {
    if (!socket) return;
    socket.on('deliveryCancelled', callback);
    return () => socket.off('deliveryCancelled', callback);
  }, [socket]);

  const value = {
    socket,
    connected,
    onNewOrder,
    onNewOffer,
    onOfferAccepted,
    onOrderUpdated,
    onOrderDeleted,
    onOrderExpired,
    onOrderDelivered,
    onOrderFailed,
    onDeliveryCancelled
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};