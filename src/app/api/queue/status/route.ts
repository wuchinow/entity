import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({
    active: false,
    queueSize: 0,
    message: 'Generation queue has been disabled for security reasons. All API keys have been removed.'
  });
}

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { 
      error: 'Generation queue has been disabled for security reasons. All API keys have been removed.',
      success: false 
    },
    { status: 503 }
  );
}