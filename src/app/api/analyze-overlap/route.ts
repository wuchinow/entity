import { NextResponse } from 'next/server';
import { NewCSVImportService } from '@/lib/new-csv-import';

export async function GET() {
  try {
    const analysis = await NewCSVImportService.analyzeSpeciesOverlap(
      '550131d1-ee86-4994-be6e-bc9056682bbc', // Original 238 species
      'e35a68ef-6987-4647-b001-b6bc54ef01a2'  // 133 diverse species
    );
    
    return NextResponse.json({
      success: true,
      analysis: {
        original238Unique: analysis.list1Only,
        diverse133Unique: analysis.list2Only,
        sharedSpecies: analysis.overlap,
        totalAcrossBothLists: analysis.list1Only + analysis.list2Only + analysis.overlap,
        overlapSpecies: analysis.overlapSpecies
      }
    });
    
  } catch (error) {
    console.error('Error analyzing overlap:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to analyze overlap'
    }, { status: 500 });
  }
}