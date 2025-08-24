'use client';

import { useEffect, useRef, useState } from 'react';

export interface RealTimeUpdate {
  type: 'connection' | 'heartbeat' | 'media_generated' | 'media_updated' | 'species_updated';
  message?: string;
  timestamp: string;
  data?: {
    speciesId?: string;
    mediaType?: 'image' | 'video';
    version?: number;
    url?: string;
    speciesName?: string;
    seedImageVersion?: number;
  };
}

export function useRealTimeUpdates() {
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<RealTimeUpdate | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    try {
      const eventSource = new EventSource('/api/sse');
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('SSE connection opened');
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttempts.current = 0;
      };

      eventSource.onmessage = (event) => {
        try {
          const update: RealTimeUpdate = JSON.parse(event.data);
          setLastUpdate(update);
          
          if (update.type !== 'heartbeat') {
            console.log('Real-time update received:', update);
          }
        } catch (error) {
          console.error('Error parsing SSE message:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        setIsConnected(false);
        
        if (eventSource.readyState === EventSource.CLOSED) {
          setConnectionError('Connection closed');
          
          // Attempt to reconnect with exponential backoff
          if (reconnectAttempts.current < maxReconnectAttempts) {
            const delay = Math.pow(2, reconnectAttempts.current) * 1000; // 1s, 2s, 4s, 8s, 16s
            reconnectAttempts.current++;
            
            console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts.current})`);
            
            reconnectTimeoutRef.current = setTimeout(() => {
              connect();
            }, delay);
          } else {
            setConnectionError('Max reconnection attempts reached');
          }
        }
      };

    } catch (error) {
      console.error('Error creating SSE connection:', error);
      setConnectionError('Failed to create connection');
    }
  };

  const disconnect = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    setIsConnected(false);
    setLastUpdate(null);
    setConnectionError(null);
    reconnectAttempts.current = 0;
  };

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, []);

  return {
    isConnected,
    lastUpdate,
    connectionError,
    reconnect: connect,
    disconnect
  };
}