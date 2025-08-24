'use client';

import { useEffect, useRef, useState } from 'react';

export interface ErrorRecoveryStats {
  lastRun: string | null;
  totalFixed: number;
  totalRetried: number;
  isRunning: boolean;
  errors: string[];
}

export function useAutoErrorRecovery(options: {
  enabled?: boolean;
  interval?: number; // in milliseconds
  onRecovery?: (stats: ErrorRecoveryStats) => void;
} = {}) {
  const {
    enabled = true,
    interval = 60000, // 1 minute default
    onRecovery
  } = options;

  const [stats, setStats] = useState<ErrorRecoveryStats>({
    lastRun: null,
    totalFixed: 0,
    totalRetried: 0,
    isRunning: false,
    errors: []
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isRunningRef = useRef(false);

  const runRecovery = async () => {
    if (isRunningRef.current || !enabled) {
      return;
    }

    isRunningRef.current = true;
    setStats(prev => ({ ...prev, isRunning: true }));

    try {
      console.log('🔧 Running automatic error recovery...');
      
      const response = await fetch('/api/admin/auto-error-recovery', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 'comprehensive' })
      });

      const result = await response.json();

      if (result.success) {
        const newStats: ErrorRecoveryStats = {
          lastRun: new Date().toISOString(),
          totalFixed: result.fixed,
          totalRetried: result.retried,
          isRunning: false,
          errors: result.errors || []
        };

        setStats(newStats);
        onRecovery?.(newStats);

        if (result.fixed > 0 || result.retried > 0) {
          console.log(`✅ Auto-recovery completed: ${result.fixed} fixed, ${result.retried} retried`);
        } else {
          console.log(`✅ Auto-recovery completed: No errors found to fix`);
        }
      } else {
        console.error('Auto-recovery failed:', result.message);
        setStats(prev => ({
          ...prev,
          isRunning: false,
          errors: result.errors || [result.message]
        }));
      }

    } catch (error) {
      console.error('Error in auto-recovery:', error);
      setStats(prev => ({
        ...prev,
        isRunning: false,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }));
    } finally {
      isRunningRef.current = false;
      setStats(prev => ({ ...prev, isRunning: false }));
    }
  };

  const startAutoRecovery = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Run immediately on start
    runRecovery();

    // Then run at intervals
    intervalRef.current = setInterval(runRecovery, interval);
  };

  const stopAutoRecovery = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    isRunningRef.current = false;
    setStats(prev => ({ ...prev, isRunning: false }));
  };

  const manualRecovery = async () => {
    await runRecovery();
  };

  useEffect(() => {
    if (enabled) {
      startAutoRecovery();
    } else {
      stopAutoRecovery();
    }

    return () => {
      stopAutoRecovery();
    };
  }, [enabled, interval]);

  return {
    stats,
    manualRecovery,
    startAutoRecovery,
    stopAutoRecovery,
    isEnabled: enabled
  };
}