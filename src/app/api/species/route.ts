import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { NewCSVImportService } from '@/lib/new-csv-import';

// Use service role key for server-side operations to ensure we can read all data
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    console.log('Fetching species from database...');
    
    // Check if environment variables are available
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase environment variables');
      return NextResponse.json({
        error: 'Server configuration error: Missing database credentials'
      }, { status: 500 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const listId = searchParams.get('listId');
    const includeListInfo = searchParams.get('includeListInfo') === 'true';

    let speciesQuery = supabase
      .from('species')
      .select('*');

    // If no specific list ID is provided, get species from the active list
    if (!listId) {
      const activeList = await NewCSVImportService.getActiveSpeciesList();
      if (activeList) {
        speciesQuery = speciesQuery.eq('species_list_id', activeList.id);
        console.log(`Using active species list: ${activeList.name} (${activeList.id})`);
      } else {
        // CRITICAL: If no active list is found, don't return all species
        // Instead, return empty result to prevent showing mixed data
        console.warn('No active species list found - returning empty result');
        return NextResponse.json({
          species: [],
          count: 0,
          error: 'No active species list configured'
        });
      }
    } else {
      speciesQuery = speciesQuery.eq('species_list_id', listId);
      console.log(`Using specified species list ID: ${listId}`);
    }

    const { data: species, error } = await speciesQuery
      .order('common_name', { ascending: true });

    if (error) {
      console.error('Error fetching species:', error);
      return NextResponse.json({
        error: `Database error: ${error.message}`,
        details: error
      }, { status: 500 });
    }

    console.log(`Successfully fetched ${species?.length || 0} species`);
    
    const response: any = {
      species: species || [],
      count: species?.length || 0
    };

    // Include active list info if requested
    if (includeListInfo) {
      const activeList = await NewCSVImportService.getActiveSpeciesList();
      response.activeList = activeList;
    }
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Error in species API:', error);
    return NextResponse.json({
      error: 'Failed to fetch species',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}