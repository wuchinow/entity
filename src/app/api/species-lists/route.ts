import { NextRequest, NextResponse } from 'next/server';
import { NewCSVImportService } from '@/lib/new-csv-import';

export async function GET() {
  try {
    const speciesLists = await NewCSVImportService.getSpeciesLists();
    
    return NextResponse.json({
      success: true,
      lists: speciesLists
    });
    
  } catch (error) {
    console.error('Error fetching species lists:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch species lists'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, listId } = await request.json();
    
    if (action === 'set_active') {
      if (!listId) {
        return NextResponse.json({
          success: false,
          error: 'List ID is required'
        }, { status: 400 });
      }
      
      await NewCSVImportService.setActiveSpeciesList(listId);
      
      return NextResponse.json({
        success: true,
        message: 'Active species list updated'
      });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Invalid action'
    }, { status: 400 });
    
  } catch (error) {
    console.error('Error updating species list:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update species list'
    }, { status: 500 });
  }
}