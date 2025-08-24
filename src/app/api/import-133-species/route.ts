import { NextResponse } from 'next/server';
import { NewCSVImportService } from '@/lib/new-csv-import';
import fs from 'fs';
import path from 'path';

export async function POST() {
  try {
    console.log('🚀 Starting automatic import of 133 species...');
    
    // Read the CSV file from the data directory
    const csvPath = path.join(process.cwd(), 'data', '133 extinct species.csv');
    
    if (!fs.existsSync(csvPath)) {
      return NextResponse.json({
        success: false,
        error: 'CSV file not found at: ' + csvPath,
        imported: 0,
        errors: ['CSV file not found'],
        message: 'File not found'
      }, { status: 404 });
    }
    
    console.log('📖 Reading CSV file from:', csvPath);
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    
    // Parse CSV content
    const Papa = require('papaparse');
    const parseResult = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true
    });
    
    if (parseResult.errors.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'CSV parsing failed',
        imported: 0,
        errors: parseResult.errors.map((e: any) => e.message),
        message: 'CSV parsing failed'
      }, { status: 400 });
    }
    
    const csvData = parseResult.data;
    console.log(`📊 Parsed ${csvData.length} species records`);
    
    // Import using the NewCSVImportService
    const result = await NewCSVImportService.importNewSpeciesToDatabase(
      csvData,
      '133 Diverse Species',
      'Comprehensive list of 133 extinct species including both animals and plants with detailed information',
      '133 extinct species.csv',
      {
        onProgress: (progress, message) => {
          console.log(`Import progress: ${progress}% - ${message}`);
        }
      }
    );
    
    console.log('✅ Import completed:', result);
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('❌ Import error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      imported: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      message: 'Import failed'
    }, { status: 500 });
  }
}