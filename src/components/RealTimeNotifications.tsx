'use client';

import { useEffect, useState } from 'react';
import { useRealTimeUpdates, RealTimeUpdate } from '@/hooks/useRealTimeUpdates';
import { motion, AnimatePresence } from 'framer-motion';

interface Notification {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
  timestamp: string;
  data?: RealTimeUpdate['data'];
}

export function RealTimeNotifications() {
  const { isConnected, lastUpdate, connectionError } = useRealTimeUpdates();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (lastUpdate) {
      let notification: Notification | null = null;

      if (lastUpdate.type === 'media_generated') {
        notification = {
          id: `${lastUpdate.timestamp}-${lastUpdate.data?.speciesId}`,
          message: `New ${lastUpdate.data?.mediaType} generated for ${lastUpdate.data?.speciesName}`,
          type: 'success',
          timestamp: lastUpdate.timestamp,
          data: lastUpdate.data
        };
      } else if (lastUpdate.type === 'species_updated') {
        const { speciesName, status } = lastUpdate.data || {};
        if (status === 'completed') {
          notification = {
            id: `${lastUpdate.timestamp}-${lastUpdate.data?.speciesId}-fixed`,
            message: `Error status fixed for ${speciesName}`,
            type: 'success',
            timestamp: lastUpdate.timestamp,
            data: lastUpdate.data
          };
        } else if (status === 'pending') {
          notification = {
            id: `${lastUpdate.timestamp}-${lastUpdate.data?.speciesId}-retry`,
            message: `Retrying generation for ${speciesName}`,
            type: 'info',
            timestamp: lastUpdate.timestamp,
            data: lastUpdate.data
          };
        }
      }

      if (notification) {
        setNotifications(prev => [notification, ...prev.slice(0, 4)]); // Keep only 5 notifications

        // Auto-remove notification after 5 seconds
        setTimeout(() => {
          setNotifications(prev => prev.filter(n => n.id !== notification!.id));
        }, 5000);
      }
    }
  }, [lastUpdate]);

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {/* Connection Status */}
      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
        isConnected 
          ? 'bg-green-100 text-green-800 border border-green-200' 
          : 'bg-red-100 text-red-800 border border-red-200'
      }`}>
        {isConnected ? '🟢 Live Updates' : '🔴 Disconnected'}
      </div>

      {/* Connection Error */}
      {connectionError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 max-w-sm">
          <div className="text-red-800 text-sm font-medium">Connection Error</div>
          <div className="text-red-600 text-xs mt-1">{connectionError}</div>
        </div>
      )}

      {/* Notifications */}
      <AnimatePresence>
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: 300, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 300, scale: 0.8 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className={`rounded-lg p-4 max-w-sm shadow-lg border cursor-pointer ${
              notification.type === 'success' 
                ? 'bg-green-50 border-green-200 text-green-800'
                : notification.type === 'info'
                ? 'bg-blue-50 border-blue-200 text-blue-800'
                : notification.type === 'warning'
                ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
            onClick={() => removeNotification(notification.id)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="text-sm font-medium">
                  {notification.type === 'success' && '✅ '}
                  {notification.type === 'info' && 'ℹ️ '}
                  {notification.type === 'warning' && '⚠️ '}
                  {notification.type === 'error' && '❌ '}
                  {notification.message}
                </div>
                {notification.data && (
                  <div className="text-xs mt-1 opacity-75">
                    Version {notification.data.version}
                    {notification.data.seedImageVersion && 
                      ` (from image v${notification.data.seedImageVersion})`
                    }
                  </div>
                )}
                <div className="text-xs mt-1 opacity-60">
                  {new Date(notification.timestamp).toLocaleTimeString()}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeNotification(notification.id);
                }}
                className="ml-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                ×
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}