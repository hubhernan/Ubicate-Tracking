import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

export const useSocket = (url: string) => {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    socketRef.current = io(url);

    socketRef.current.on('connect', () => {
      console.log('Connected to socket server');
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [url]);

  const emit = (event: string, data: any) => {
    socketRef.current?.emit(event, data);
  };

  const on = (event: string, callback: (data: any) => void) => {
    socketRef.current?.on(event, callback);
  };

  return { emit, on, socket: socketRef.current };
};
