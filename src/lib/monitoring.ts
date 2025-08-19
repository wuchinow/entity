interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  context?: Record<string, any>;
  userId?: string;
  sessionId?: string;
}

interface SystemHealth {
  database: 'healthy' | 'degraded' | 'down';
  replicate: 'healthy' | 'degraded' | 'down';
  generation_queue: number;
  active_species: string | null;
  last_generation: string | null;
  uptime: number;
  memory_usage?: number;
}

export class MonitoringService {
  private static logs: LogEntry[] = [];
  private static maxLogs = 1000;
  private static sessionId = this.generateSessionId();

  // Generate unique session ID
  private static generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Log methods
  static info(message: string, context?: Record<string, any>): void {
    this.addLog('info', message, context);
  }

  static warn(message: string, context?: Record<string, any>): void {
    this.addLog('warn', message, context);
    this.sendAlert('warning', message, context);
  }

  static error(message: string, context?: Record<string, any>): void {
    this.addLog('error', message, context);
    this.sendAlert('error', message, context);
  }

  static debug(message: string, context?: Record<string, any>): void {
    if (process.env.NODE_ENV === 'development') {
      this.addLog('debug', message, context);
    }
  }

  // Add log entry
  private static addLog(level: LogEntry['level'], message: string, context?: Record<string, any>): void {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      sessionId: this.sessionId
    };

    this.logs.push(logEntry);

    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console output for development
    if (process.env.NODE_ENV === 'development') {
      const contextStr = context ? ` | ${JSON.stringify(context)}` : '';
      console[level](`[${level.toUpperCase()}] ${message}${contextStr}`);
    }

    // Send to external logging service if configured
    this.sendToExternalLogger(logEntry);
  }

  // Send logs to external service (e.g., Vercel Analytics, Sentry)
  private static async sendToExternalLogger(logEntry: LogEntry): Promise<void> {
    try {
      // Example: Send to webhook endpoint
      const webhookUrl = process.env.MONITORING_WEBHOOK_URL;
      if (webhookUrl && logEntry.level !== 'debug') {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            service: 'entity-v1',
            environment: process.env.NODE_ENV,
            ...logEntry
          })
        }).catch(err => {
          console.error('Failed to send log to webhook:', err);
        });
      }
    } catch (error) {
      console.error('Error sending to external logger:', error);
    }
  }

  // Send alerts for warnings and errors
  private static async sendAlert(type: 'warning' | 'error', message: string, context?: Record<string, any>): Promise<void> {
    try {
      const alertWebhook = process.env.ALERT_WEBHOOK_URL;
      if (alertWebhook) {
        await fetch(alertWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type,
            service: 'Entity v1.0',
            message,
            context,
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV
          })
        }).catch(err => {
          console.error('Failed to send alert:', err);
        });
      }
    } catch (error) {
      console.error('Error sending alert:', error);
    }
  }

  // Get recent logs
  static getLogs(limit = 100, level?: LogEntry['level']): LogEntry[] {
    let filteredLogs = this.logs;
    
    if (level) {
      filteredLogs = this.logs.filter(log => log.level === level);
    }
    
    return filteredLogs.slice(-limit).reverse();
  }

  // Clear logs
  static clearLogs(): void {
    this.logs = [];
  }

  // System health check
  static async checkSystemHealth(): Promise<SystemHealth> {
    const startTime = Date.now();
    
    const health: SystemHealth = {
      database: 'down',
      replicate: 'down',
      generation_queue: 0,
      active_species: null,
      last_generation: null,
      uptime: process.uptime ? process.uptime() : 0
    };

    try {
      // Check database connection
      const { SupabaseService } = await import('./supabase');
      const systemState = await SupabaseService.getSystemState();
      health.database = 'healthy';
      health.active_species = systemState?.current_species_id || null;
      
      // Check generation queue
      const queueItems = await SupabaseService.getQueuedItems();
      health.generation_queue = queueItems.length;
      
      // Get last generation time
      const species = await SupabaseService.getAllSpecies();
      const lastGenerated = species
        .filter(s => s.image_generated_at || s.video_generated_at)
        .sort((a, b) => {
          const aTime = Math.max(
            new Date(a.image_generated_at || 0).getTime(),
            new Date(a.video_generated_at || 0).getTime()
          );
          const bTime = Math.max(
            new Date(b.image_generated_at || 0).getTime(),
            new Date(b.video_generated_at || 0).getTime()
          );
          return bTime - aTime;
        })[0];
      
      if (lastGenerated) {
        health.last_generation = Math.max(
          new Date(lastGenerated.image_generated_at || 0).getTime(),
          new Date(lastGenerated.video_generated_at || 0).getTime()
        ).toString();
      }
      
    } catch (error) {
      this.error('Database health check failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      health.database = 'down';
    }

    try {
      // Check Replicate API
      const { ReplicateService } = await import('./replicate');
      const isValid = await ReplicateService.validateConnection();
      health.replicate = isValid ? 'healthy' : 'down';
    } catch (error) {
      this.error('Replicate health check failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      health.replicate = 'down';
    }

    // Add memory usage if available
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memUsage = process.memoryUsage();
      health.memory_usage = Math.round(memUsage.heapUsed / 1024 / 1024); // MB
    }

    const checkDuration = Date.now() - startTime;
    this.info('System health check completed', { 
      duration: checkDuration,
      health 
    });

    return health;
  }

  // Performance monitoring
  static async measurePerformance<T>(
    operation: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await fn();
      const duration = Date.now() - startTime;
      
      this.info(`Performance: ${operation}`, { 
        duration,
        success: true 
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.error(`Performance: ${operation} failed`, { 
        duration,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      throw error;
    }
  }

  // Track user interactions (for gallery analytics)
  static trackInteraction(action: string, context?: Record<string, any>): void {
    this.info(`User interaction: ${action}`, {
      ...context,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
      timestamp: Date.now()
    });
  }

  // Exhibition-specific monitoring
  static trackSpeciesDisplay(speciesId: string, speciesName: string): void {
    this.info('Species displayed', {
      speciesId,
      speciesName,
      displayTime: new Date().toISOString()
    });
  }

  static trackGenerationStart(speciesId: string, type: 'image' | 'video'): void {
    this.info('Generation started', {
      speciesId,
      type,
      startTime: new Date().toISOString()
    });
  }

  static trackGenerationComplete(speciesId: string, type: 'image' | 'video', duration: number): void {
    this.info('Generation completed', {
      speciesId,
      type,
      duration,
      completedAt: new Date().toISOString()
    });
  }

  static trackGenerationError(speciesId: string, type: 'image' | 'video', error: string): void {
    this.error('Generation failed', {
      speciesId,
      type,
      error,
      failedAt: new Date().toISOString()
    });
  }

  // Get system statistics
  static getSystemStats(): {
    totalLogs: number;
    errorCount: number;
    warningCount: number;
    sessionId: string;
    uptime: number;
  } {
    return {
      totalLogs: this.logs.length,
      errorCount: this.logs.filter(log => log.level === 'error').length,
      warningCount: this.logs.filter(log => log.level === 'warn').length,
      sessionId: this.sessionId,
      uptime: process.uptime ? process.uptime() : 0
    };
  }
}

// Export convenience functions
export const log = {
  info: MonitoringService.info.bind(MonitoringService),
  warn: MonitoringService.warn.bind(MonitoringService),
  error: MonitoringService.error.bind(MonitoringService),
  debug: MonitoringService.debug.bind(MonitoringService)
};

export const monitor = {
  health: MonitoringService.checkSystemHealth.bind(MonitoringService),
  performance: MonitoringService.measurePerformance.bind(MonitoringService),
  track: MonitoringService.trackInteraction.bind(MonitoringService)
};