import { NextRequest, NextResponse } from 'next/server';
import { MonitoringService } from '@/lib/monitoring';

export async function GET(request: NextRequest) {
  try {
    const health = await MonitoringService.checkSystemHealth();
    const stats = MonitoringService.getSystemStats();
    
    const isHealthy = health.database === 'healthy' && health.replicate === 'healthy';
    
    return NextResponse.json({
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      health,
      stats,
      version: '1.0.0'
    }, {
      status: isHealthy ? 200 : 503
    });
    
  } catch (error) {
    MonitoringService.error('Health check failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    }, {
      status: 500
    });
  }
}