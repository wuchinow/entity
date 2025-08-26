import { NextResponse } from 'next/server';
import { NewCSVImportService } from '@/lib/new-csv-import';

export async function GET() {
  // This endpoint is deprecated - species list analysis is no longer needed
  // Only the curated 129 species list should be active in production
  return NextResponse.json({
    success: false,
    error: 'Species list analysis is disabled for production exhibition mode',
    message: 'Only the active curated species list is available'
  }, { status: 410 }); // 410 Gone - resource no longer available
}