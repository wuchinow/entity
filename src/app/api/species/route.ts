import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { NewCSVImportService } from '@/lib/new-csv-import';

// Use service role key for server-side operations to ensure we can read all data
// Optimized for concurrent users with connection pooling
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    db: {
      schema: 'public',
    },
    auth: {
      persistSession: false, // Disable session persistence for API routes
    },
    global: {
      headers: {
        'Cache-Control': 'public, max-age=60', // Cache responses for 1 minute
      },
    },
  }
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
    
    // Enhance species data with latest media URLs for thumbnails
    let enhancedSpecies = species || [];
    
    if (enhancedSpecies.length > 0) {
      // Get latest media for all species to update thumbnails
      const speciesIds = enhancedSpecies.map(s => s.id);
      
      const { data: latestMedia } = await supabase
        .from('species_media')
        .select('species_id, media_type, supabase_url, replicate_url, version_number, is_primary')
        .in('species_id', speciesIds)
        .not('supabase_url', 'is', null)
        .order('species_id')
        .order('media_type')
        .order('version_number', { ascending: false });

      // Create a map of latest media for each species
      const mediaMap = new Map();
      
      if (latestMedia) {
        for (const media of latestMedia) {
          const key = `${media.species_id}-${media.media_type}`;
          if (!mediaMap.has(key)) {
            // Store the latest (highest version) media for each type
            mediaMap.set(key, media.supabase_url || media.replicate_url);
          }
        }
      }

      // Update species with latest media URLs
      enhancedSpecies = enhancedSpecies.map(species => ({
        ...species,
        // Update with latest media URLs for thumbnails, fallback to legacy URLs
        supabase_image_url: mediaMap.get(`${species.id}-image`) || species.supabase_image_url,
        supabase_video_url: mediaMap.get(`${species.id}-video`) || species.supabase_video_url,
        // Also update legacy URLs for backward compatibility
        image_url: mediaMap.get(`${species.id}-image`) || species.image_url,
        video_url: mediaMap.get(`${species.id}-video`) || species.video_url,
      }));
    }
    
    const response: any = {
      species: enhancedSpecies,
      count: enhancedSpecies.length
    };

    // Include active list info if requested
    if (includeListInfo) {
      const activeList = await NewCSVImportService.getActiveSpeciesList();
      response.activeList = activeList;
    }
    
    const jsonResponse = NextResponse.json(response);
    
    // Add caching headers for better performance with concurrent users
    jsonResponse.headers.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    jsonResponse.headers.set('CDN-Cache-Control', 'public, max-age=300');
    jsonResponse.headers.set('Vary', 'Accept-Encoding');
    
    return jsonResponse;
    
  } catch (error) {
    console.error('Error in species API:', error);
    return NextResponse.json({
      error: 'Failed to fetch species',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}