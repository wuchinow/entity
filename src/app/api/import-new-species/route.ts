import { NextRequest, NextResponse } from 'next/server';
import { NewCSVImportService } from '@/lib/new-csv-import';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const listName = formData.get('listName') as string;
    const listDescription = formData.get('listDescription') as string;
    
    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'No file provided'
      }, { status: 400 });
    }
    
    if (!listName) {
      return NextResponse.json({
        success: false,
        error: 'List name is required'
      }, { status: 400 });
    }
    
    // Import the CSV file
    const result = await NewCSVImportService.importFromFile(
      file,
      listName,
      listDescription || `Imported from ${file.name}`,
      {
        onProgress: (progress, message) => {
          console.log(`Import progress: ${progress}% - ${message}`);
        }
      }
    );
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Error importing new species:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to import species',
      imported: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      message: 'Import failed'
    }, { status: 500 });
  }
}