'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Connect to custom Socket.io server (port 3000 by default, binds to current origin)
    const socketUrl = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}` : '';
    const socketInstance = io(socketUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true
    });

    socketInstance.on('connect', () => {
      setConnected(true);
      console.log('Socket connected client-side:', socketInstance.id);
    });

    socketInstance.on('disconnect', () => {
      setConnected(false);
      console.log('Socket disconnected client-side');
    });

    setTimeout(() => {
      setSocket(socketInstance);
    }, 0);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
