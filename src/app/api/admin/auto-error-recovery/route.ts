import { NextRequest, NextResponse } from 'next/server';
import { ErrorRecoveryService } from '@/lib/error-recovery';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { type = 'comprehensive' } = body;

    let result;
    
    switch (type) {
      case 'fix-errors':
        result = await ErrorRecoveryService.autoFixErrorStatuses();
        break;
      case 'reset-stuck':
        result = await ErrorRecoveryService.resetStuckGenerations();
        break;
      case 'comprehensive':
      default:
        result = await ErrorRecoveryService.runComprehensiveRecovery();
        break;
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error in auto-error-recovery:', error);
    return NextResponse.json(
      { 
        success: false,
        fixed: 0,
        retried: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        message: 'Auto-recovery failed'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Run a quick check without making changes
    const result = await ErrorRecoveryService.autoFixErrorStatuses();
    
    return NextResponse.json({
      ...result,
      message: 'Error recovery status check completed'
    });

  } catch (error) {
    console.error('Error in auto-error-recovery status check:', error);
    return NextResponse.json(
      { 
        success: false,
        fixed: 0,
        retried: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        message: 'Status check failed'
      },
      { status: 500 }
    );
  }
}