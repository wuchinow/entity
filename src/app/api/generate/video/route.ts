import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { 
      error: 'Video generation has been disabled for security reasons. All API keys have been removed.',
      success: false 
    },
    { status: 503 }
  );
}

export async function GET(request: NextRequest) {
  return NextResponse.json(
    { 
      error: 'Video generation has been disabled for security reasons. All API keys have been removed.',
      success: false 
    },
    { status: 503 }
  );
}